// EduTrack Backend - Authentication Routes
// src/routes/auth.js - User authentication and authorization endpoints

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Rate limiting for auth endpoints
const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// Validation middleware
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    body('fullName')
        .isLength({ min: 2, max: 255 })
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full name must be 2-255 characters and contain only letters and spaces'),
    body('role')
        .optional()
        .isIn(['teacher', 'admin', 'government', 'ngo'])
        .withMessage('Role must be one of: teacher, admin, government, ngo'),
    body('phone')
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),
    body('lga')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('LGA must be 2-100 characters')
];

const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('Username or email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Utility functions
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name
    };

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Routes

// POST /api/auth/register - Register new user
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password, fullName, role = 'teacher', phone, lga, schoolId } = req.body;

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Validate school if provided
        if (schoolId) {
            const school = await db.query('SELECT id FROM schools WHERE id = $1', [schoolId]);
            if (school.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid school ID provided'
                });
            }
        }

        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        const userResult = await db.query(
            `INSERT INTO users (username, email, password_hash, full_name, role, phone, lga, school_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, username, email, full_name, role, created_at`,
            [username, email, passwordHash, fullName, role, phone, lga, schoolId || null]
        );

        const user = userResult.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store session
        await db.query(
            `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip_address)
             VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
            [user.id, crypto.createHash('sha256').update(refreshToken).digest('hex'), req.get('User-Agent'), req.ip]
        );

        // Send welcome email (optional)
        try {
            await sendEmail({
                to: email,
                subject: 'Welcome to EduTrack Platform',
                template: 'welcome',
                data: { fullName, username }
            });
        } catch (emailError) {
            console.log('Failed to send welcome email:', emailError.message);
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    createdAt: user.created_at
                },
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// POST /api/auth/login - User login
router.post('/login', strictAuthLimiter, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password, rememberMe = false } = req.body;

        // Find user by username or email
        const userResult = await db.query(
            `SELECT u.*, s.name as school_name 
             FROM users u 
             LEFT JOIN schools s ON u.school_id = s.id 
             WHERE u.username = $1 OR u.email = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = userResult.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store session
        const sessionExpiry = rememberMe ? '30 days' : '7 days';
        await db.query(
            `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip_address)
             VALUES ($1, $2, NOW() + INTERVAL '${sessionExpiry}', $3, $4)`,
            [user.id, crypto.createHash('sha256').update(refreshToken).digest('hex'), req.get('User-Agent'), req.ip]
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    phone: user.phone,
                    lga: user.lga,
                    schoolId: user.school_id,
                    schoolName: user.school_name,
                    lastLogin: new Date()
                },
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');

        // Check if session exists and is active
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const sessionResult = await db.query(
            'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = $1 AND s.is_active = true AND s.expires_at > NOW()',
            [tokenHash]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        const user = sessionResult.rows[0];

        // Generate new access token
        const { accessToken } = generateTokens(user);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
});

// POST /api/auth/logout - User logout
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Invalidate all sessions for this user (optional: could be just current session)
            await db.query(
                'UPDATE sessions SET is_active = false WHERE user_id = $1',
                [req.user.id]
            );
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userResult = await db.query(
            `SELECT u.id, u.username, u.email, u.full_name, u.role, u.phone, u.lga, 
                    u.school_id, u.is_active, u.email_verified, u.last_login, u.created_at,
                    s.name as school_name, s.school_type, s.address as school_address
             FROM users u 
             LEFT JOIN schools s ON u.school_id = s.id 
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get user statistics
        const statsResult = await db.query(
            `SELECT 
                COUNT(r.id) as reports_submitted,
                COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as reports_resolved,
                COUNT(c.id) as comments_made
             FROM users u
             LEFT JOIN reports r ON r.reporter_id = u.id
             LEFT JOIN comments c ON c.user_id = u.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    phone: user.phone,
                    lga: user.lga,
                    schoolId: user.school_id,
                    schoolName: user.school_name,
                    schoolType: user.school_type,
                    schoolAddress: user.school_address,
                    isActive: user.is_active,
                    emailVerified: user.email_verified,
                    lastLogin: user.last_login,
                    createdAt: user.created_at
                },
                stats: {
                    reportsSubmitted: parseInt(stats.reports_submitted),
                    reportsResolved: parseInt(stats.reports_resolved),
                    commentsMade: parseInt(stats.comments_made)
                }
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authMiddleware, [
    body('fullName')
        .optional()
        .isLength({ min: 2, max: 255 })
        .withMessage('Full name must be 2-255 characters'),
    body('phone')
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please provide a valid phone number'),
    body('lga')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('LGA must be 2-100 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { fullName, phone, lga } = req.body;
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (fullName !== undefined) {
            updateFields.push(`full_name = ${paramCount++}`);
            updateValues.push(fullName);
        }
        if (phone !== undefined) {
            updateFields.push(`phone = ${paramCount++}`);
            updateValues.push(phone);
        }
        if (lga !== undefined) {
            updateFields.push(`lga = ${paramCount++}`);
            updateValues.push(lga);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateValues.push(req.user.id);

        const updateQuery = `
            UPDATE users 
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = ${paramCount}
            RETURNING id, username, email, full_name, role, phone, lga, updated_at
        `;

        const result = await db.query(updateQuery, updateValues);
        const updatedUser = result.rows[0];

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    fullName: updatedUser.full_name,
                    role: updatedUser.role,
                    phone: updatedUser.phone,
                    lga: updatedUser.lga,
                    updatedAt: updatedUser.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// POST /api/auth/change-password - Change user password
router.post('/change-password', authMiddleware, [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must be at least 8 characters with uppercase, lowercase, number, and special character')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Get user's current password hash
        const userResult = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        const user = userResult.rows[0];

        // Verify current password
        const isValidPassword = await comparePassword(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password and update
        const newPasswordHash = await hashPassword(newPassword);
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        // Invalidate all sessions except current one
        const authHeader = req.headers.authorization;
        const currentToken = authHeader && authHeader.split(' ')[1];
        
        if (currentToken) {
            const currentTokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
            await db.query(
                'UPDATE sessions SET is_active = false WHERE user_id = $1 AND token_hash != $2',
                [req.user.id, currentTokenHash]
            );
        }

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

module.exports = router;