// EduTrack Backend - Authentication Middleware
// src/middleware/auth.js - JWT token verification and user authorization

const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Main authentication middleware
const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                code: 'NO_TOKEN'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Get fresh user data from database
        const userResult = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.role, u.school_id, u.is_active,
                    s.name as school_name
             FROM users u 
             LEFT JOIN schools s ON u.school_id = s.id 
             WHERE u.id = $1`,
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Check if user account is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Add user info to request object
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            schoolId: user.school_id,
            schoolName: user.school_name
        };

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            console.error('Authentication error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication failed',
                code: 'AUTH_ERROR'
            });
        }
    }
};

// Role-based authorization middleware factory
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: userRole
            });
        }

        next();
    };
};

// Admin-only middleware
const requireAdmin = requireRole(['admin']);

// Government official or admin middleware
const requireGovernment = requireRole(['admin', 'government']);

// Teacher, admin, or government middleware
const requireTeacherOrAbove = requireRole(['teacher', 'admin', 'government']);

// School-specific authorization middleware
const requireSchoolAccess = async (req, res, next) => {
    try {
        const schoolId = req.params.schoolId || req.body.schoolId;
        
        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'School ID required',
                code: 'SCHOOL_ID_REQUIRED'
            });
        }

        // Admin and government can access all schools
        if (['admin', 'government'].includes(req.user.role)) {
            return next();
        }

        // Teachers can only access their own school
        if (req.user.role === 'teacher') {
            if (req.user.schoolId !== schoolId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this school',
                    code: 'SCHOOL_ACCESS_DENIED'
                });
            }
        }

        next();

    } catch (error) {
        console.error('School access authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization failed',
            code: 'AUTHORIZATION_ERROR'
        });
    }
};

// Report ownership or admin access middleware
const requireReportAccess = async (req, res, next) => {
    try {
        const reportId = req.params.id || req.params.reportId;
        
        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: 'Report ID required',
                code: 'REPORT_ID_REQUIRED'
            });
        }

        // Get report details
        const reportResult = await db.query(
            'SELECT reporter_id, school_id, is_anonymous FROM reports WHERE id = $1',
            [reportId]
        );

        if (reportResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found',
                code: 'REPORT_NOT_FOUND'
            });
        }

        const report = reportResult.rows[0];

        // Admin and government can access all reports
        if (['admin', 'government'].includes(req.user.role)) {
            return next();
        }

        // For non-anonymous reports, check if user is the reporter
        if (!report.is_anonymous && report.reporter_id === req.user.id) {
            return next();
        }

        // Teachers can access reports from their school
        if (req.user.role === 'teacher' && req.user.schoolId === report.school_id) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied to this report',
            code: 'REPORT_ACCESS_DENIED'
        });

    } catch (error) {
        console.error('Report access authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization failed',
            code: 'AUTHORIZATION_ERROR'
        });
    }
};

// Optional authentication middleware (for public/private mixed endpoints)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        const userResult = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.role, u.school_id, u.is_active
             FROM users u WHERE u.id = $1 AND u.is_active = true`,
            [decoded.id]
        );

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                schoolId: user.school_id
            };
        } else {
            req.user = null;
        }

        next();

    } catch (error) {
        // If token is invalid, continue without user
        req.user = null;
        next();
    }
};

// API key authentication middleware (for external integrations)
const requireApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key required',
                code: 'API_KEY_REQUIRED'
            });
        }

        // Validate API key (implement your API key validation logic)
        const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];
        
        if (!validApiKeys.includes(apiKey)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid API key',
                code: 'INVALID_API_KEY'
            });
        }

        // Set API context
        req.apiAccess = true;
        req.user = {
            id: 'api',
            role: 'api',
            isApiAccess: true
        };

        next();

    } catch (error) {
        console.error('API key authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'API authentication failed',
            code: 'API_AUTH_ERROR'
        });
    }
};

// Rate limiting based on user role
const roleBasedRateLimit = (limits = {}) => {
    const defaultLimits = {
        admin: { windowMs: 15 * 60 * 1000, max: 1000 },
        government: { windowMs: 15 * 60 * 1000, max: 500 },
        teacher: { windowMs: 15 * 60 * 1000, max: 100 },
        ngo: { windowMs: 15 * 60 * 1000, max: 200 },
        default: { windowMs: 15 * 60 * 1000, max: 50 }
    };

    const finalLimits = { ...defaultLimits, ...limits };

    return (req, res, next) => {
        const userRole = req.user?.role || 'default';
        const limit = finalLimits[userRole] || finalLimits.default;

        // This would integrate with express-rate-limit
        // For now, we'll just add the limits to the request for reference
        req.rateLimits = limit;
        next();
    };
};

// Middleware to check if user can modify reports
const canModifyReport = async (req, res, next) => {
    try {
        const reportId = req.params.id || req.params.reportId;
        
        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: 'Report ID required'
            });
        }

        const reportResult = await db.query(
            'SELECT reporter_id, status, created_at FROM reports WHERE id = $1',
            [reportId]
        );

        if (reportResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const report = reportResult.rows[0];

        // Admin can always modify
        if (req.user.role === 'admin') {
            return next();
        }

        // Government can modify status and resolution
        if (req.user.role === 'government') {
            return next();
        }

        // Original reporter can modify only if report is still in 'reported' status
        // and within 24 hours of creation
        if (report.reporter_id === req.user.id) {
            if (report.status !== 'reported') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot modify report that has been processed'
                });
            }

            const createdAt = new Date(report.created_at);
            const now = new Date();
            const hoursDiff = (now - createdAt) / (1000 * 60 * 60);

            if (hoursDiff > 24) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot modify report after 24 hours'
                });
            }

            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Permission denied'
        });

    } catch (error) {
        console.error('Report modification check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

// Middleware to track user activity
const trackActivity = async (req, res, next) => {
    // Skip tracking for health checks and static files
    if (req.path === '/health' || req.path.startsWith('/static')) {
        return next();
    }

    try {
        if (req.user && req.user.id !== 'api') {
            // Update user's last activity (could be stored in Redis for performance)
            await db.query(
                'UPDATE users SET last_login = NOW() WHERE id = $1',
                [req.user.id]
            );

            // Log activity (implement activity logging if needed)
            const activityData = {
                userId: req.user.id,
                action: `${req.method} ${req.path}`,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date()
            };

            // You could store this in a separate activities table
            // await db.query('INSERT INTO activities (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)', 
            //     [activityData.userId, activityData.action, activityData.ip, activityData.userAgent]);
        }

        next();

    } catch (error) {
        // Don't fail the request if activity tracking fails
        console.error('Activity tracking error:', error);
        next();
    }
};

// Middleware to validate UUID parameters
const validateUUID = (paramName = 'id') => {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (uuid && !uuidRegex.test(uuid)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format`,
                code: 'INVALID_UUID'
            });
        }

        next();
    };
};

// Export all middleware functions
module.exports = {
    authMiddleware,
    requireRole,
    requireAdmin,
    requireGovernment,
    requireTeacherOrAbove,
    requireSchoolAccess,
    requireReportAccess,
    optionalAuth,
    requireApiKey,
    roleBasedRateLimit,
    canModifyReport,
    trackActivity,
    validateUUID
};