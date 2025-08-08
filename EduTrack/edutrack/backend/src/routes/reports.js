// EduTrack Backend - Reports Routes
// src/routes/reports.js - Infrastructure reports management endpoints

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const db = require('../config/database');
const { 
    authMiddleware, 
    requireReportAccess, 
    canModifyReport,
    optionalAuth,
    validateUUID,
    requireGovernment,
    requireAdmin 
} = require('../middleware/auth');
const { uploadImage } = require('../utils/cloudinary');
const { sendNotification } = require('../utils/notifications');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and JPG are allowed.'), false);
        }
// POST /api/reports/:id/comments - Add comment to report
router.post('/:id/comments', validateUUID(), authMiddleware, [
    body('commentText')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Comment must be between 1 and 1000 characters'),
    body('commentType')
        .optional()
        .isIn(['comment', 'update', 'question', 'resolution'])
        .withMessage('Invalid comment type'),
    body('isInternal')
        .optional()
        .isBoolean()
        .withMessage('Internal flag must be boolean')
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

        const { id } = req.params;
        const { commentText, commentType = 'comment', isInternal = false } = req.body;

        // Check if report exists
        const reportResult = await db.query('SELECT id, title FROM reports WHERE id = $1', [id]);
        if (reportResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Only admin and government can make internal comments
        const canMakeInternal = ['admin', 'government'].includes(req.user.role);
        const finalIsInternal = isInternal && canMakeInternal;

        const insertQuery = `
            INSERT INTO comments (report_id, user_id, comment_text, comment_type, is_internal)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await db.query(insertQuery, [
            id,
            req.user.id,
            commentText,
            commentType,
            finalIsInternal
        ]);

        const comment = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: {
                comment: {
                    id: comment.id,
                    commentText: comment.comment_text,
                    commentType: comment.comment_type,
                    isInternal: comment.is_internal,
                    createdAt: comment.created_at,
                    author: {
                        name: req.user.fullName,
                        role: req.user.role
                    }
                }
            }
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment'
        });
    }
});

// GET /api/reports/analytics - Get reports analytics data
router.get('/analytics/dashboard', authMiddleware, requireGovernment, async (req, res) => {
    try {
        const { timeRange = '30d', lga } = req.query;

        let timeFilter = '';
        switch (timeRange) {
            case '7d':
                timeFilter = "AND r.created_at >= NOW() - INTERVAL '7 days'";
                break;
            case '30d':
                timeFilter = "AND r.created_at >= NOW() - INTERVAL '30 days'";
                break;
            case '90d':
                timeFilter = "AND r.created_at >= NOW() - INTERVAL '90 days'";
                break;
            case '1y':
                timeFilter = "AND r.created_at >= NOW() - INTERVAL '1 year'";
                break;
            default:
                timeFilter = "AND r.created_at >= NOW() - INTERVAL '30 days'";
        }

        let lgaFilter = '';
        const queryParams = [];
        if (lga) {
            lgaFilter = 'AND s.lga = $1';
            queryParams.push(lga);
        }

        // Overall statistics
        const statsQuery = `
            SELECT 
                COUNT(r.id) as total_reports,
                COUNT(CASE WHEN r.status = 'reported' THEN 1 END) as pending_reports,
                COUNT(CASE WHEN r.status = 'in-progress' THEN 1 END) as in_progress_reports,
                COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_reports,
                COUNT(CASE WHEN r.priority = 'urgent' THEN 1 END) as urgent_reports,
                COUNT(CASE WHEN r.priority = 'high' THEN 1 END) as high_priority_reports,
                COALESCE(SUM(r.students_affected), 0) as total_students_affected,
                COALESCE(AVG(r.students_affected), 0) as avg_students_per_report,
                COUNT(DISTINCT r.school_id) as schools_with_reports,
                COUNT(DISTINCT s.lga) as lgas_with_reports
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE 1=1 ${timeFilter} ${lgaFilter}
        `;

        const statsResult = await db.query(statsQuery, queryParams);
        const stats = statsResult.rows[0];

        // Reports by status over time
        const trendsQuery = `
            SELECT 
                DATE_TRUNC('day', r.created_at) as date,
                r.status,
                COUNT(*) as count
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE 1=1 ${timeFilter} ${lgaFilter}
            GROUP BY DATE_TRUNC('day', r.created_at), r.status
            ORDER BY date DESC
            LIMIT 30
        `;

        const trendsResult = await db.query(trendsQuery, queryParams);
        const trends = trendsResult.rows;

        // Reports by issue type
        const issueTypesQuery = `
            SELECT 
                r.issue_type,
                COUNT(*) as count,
                COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count,
                COALESCE(AVG(r.urgency_score), 0) as avg_urgency_score
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE 1=1 ${timeFilter} ${lgaFilter}
            GROUP BY r.issue_type
            ORDER BY count DESC
        `;

        const issueTypesResult = await db.query(issueTypesQuery, queryParams);
        const issueTypes = issueTypesResult.rows;

        // Reports by LGA
        const lgaQuery = `
            SELECT 
                s.lga,
                COUNT(r.id) as total_reports,
                COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_reports,
                COUNT(CASE WHEN r.priority IN ('urgent', 'high') THEN 1 END) as high_priority_reports,
                COALESCE(SUM(r.students_affected), 0) as students_affected
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE 1=1 ${timeFilter} ${lgaFilter}
            GROUP BY s.lga
            ORDER BY total_reports DESC
        `;

        const lgaResult = await db.query(lgaQuery, queryParams);
        const lgaData = lgaResult.rows;

        // Response time analytics
        const responseTimeQuery = `
            SELECT 
                AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/86400) as avg_resolution_days,
                MIN(EXTRACT(EPOCH FROM (resolved_at - created_at))/86400) as min_resolution_days,
                MAX(EXTRACT(EPOCH FROM (resolved_at - created_at))/86400) as max_resolution_days
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL ${timeFilter} ${lgaFilter}
        `;

        const responseTimeResult = await db.query(responseTimeQuery, queryParams);
        const responseTime = responseTimeResult.rows[0];

        res.json({
            success: true,
            data: {
                overview: {
                    totalReports: parseInt(stats.total_reports),
                    pendingReports: parseInt(stats.pending_reports),
                    inProgressReports: parseInt(stats.in_progress_reports),
                    resolvedReports: parseInt(stats.resolved_reports),
                    urgentReports: parseInt(stats.urgent_reports),
                    highPriorityReports: parseInt(stats.high_priority_reports),
                    totalStudentsAffected: parseInt(stats.total_students_affected),
                    avgStudentsPerReport: parseFloat(stats.avg_students_per_report).toFixed(1),
                    schoolsWithReports: parseInt(stats.schools_with_reports),
                    lgasWithReports: parseInt(stats.lgas_with_reports),
                    resolutionRate: stats.total_reports > 0 ? 
                        (stats.resolved_reports / stats.total_reports * 100).toFixed(1) : '0.0'
                },
                trends,
                issueTypes,
                lgaData,
                responseTime: {
                    avgResolutionDays: parseFloat(responseTime.avg_resolution_days || 0).toFixed(1),
                    minResolutionDays: parseFloat(responseTime.min_resolution_days || 0).toFixed(1),
                    maxResolutionDays: parseFloat(responseTime.max_resolution_days || 0).toFixed(1)
                },
                timeRange,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics data'
        });
    }
});

// GET /api/reports/export - Export reports data (government/admin only)
router.get('/export', authMiddleware, requireGovernment, async (req, res) => {
    try {
        const { format = 'csv', status, lga, dateFrom, dateTo } = req.query;

        let whereClause = '1 = 1';
        const queryParams = [];
        let paramCount = 1;

        if (status) {
            whereClause += ` AND r.status = ${paramCount}`;
            queryParams.push(status);
            paramCount++;
        }

        if (lga) {
            whereClause += ` AND s.lga = ${paramCount}`;
            queryParams.push(lga);
            paramCount++;
        }

        if (dateFrom) {
            whereClause += ` AND r.created_at >= ${paramCount}`;
            queryParams.push(dateFrom);
            paramCount++;
        }

        if (dateTo) {
            whereClause += ` AND r.created_at <= ${paramCount}`;
            queryParams.push(dateTo);
            paramCount++;
        }

        const exportQuery = `
            SELECT 
                r.id,
                r.title,
                r.description,
                r.issue_type,
                r.priority,
                r.status,
                r.students_affected,
                r.estimated_cost,
                r.resolution_cost,
                r.funding_source,
                r.created_at,
                r.resolved_at,
                s.name as school_name,
                s.school_type,
                s.address as school_address,
                s.lga as school_lga,
                CASE 
                    WHEN r.is_anonymous THEN 'Anonymous'
                    ELSE u.full_name
                END as reporter_name
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            LEFT JOIN users u ON r.reporter_id = u.id
            WHERE ${whereClause}
            ORDER BY r.created_at DESC
        `;

        const result = await db.query(exportQuery, queryParams);
        const reports = result.rows;

        if (format === 'json') {
            res.json({
                success: true,
                data: {
                    reports,
                    exportedAt: new Date().toISOString(),
                    totalRecords: reports.length
                }
            });
        } else {
            // CSV export
            const csv = require('csv-stringify');
            const stringify = csv.stringify;

            const csvData = reports.map(report => ({
                'Report ID': report.id,
                'Title': report.title,
                'Description': report.description.substring(0, 100) + '...',
                'Issue Type': report.issue_type,
                'Priority': report.priority,
                'Status': report.status,
                'Students Affected': report.students_affected,
                'Estimated Cost': report.estimated_cost,
                'Resolution Cost': report.resolution_cost || '',
                'Funding Source': report.funding_source || '',
                'School Name': report.school_name,
                'School Type': report.school_type,
                'School Address': report.school_address,
                'LGA': report.school_lga,
                'Reporter': report.reporter_name,
                'Created At': report.created_at,
                'Resolved At': report.resolved_at || ''
            }));

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=edutrack_reports_${Date.now()}.csv`);

            stringify(csvData, {
                header: true
            }).pipe(res);
        }

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export reports data'
        });
    }
});

// GET /api/reports/urgent - Get urgent reports requiring immediate attention
router.get('/urgent/list', authMiddleware, requireGovernment, async (req, res) => {
    try {
        const urgentQuery = `
            SELECT 
                r.id,
                r.title,
                r.description,
                r.issue_type,
                r.priority,
                r.students_affected,
                r.urgency_score,
                r.created_at,
                s.name as school_name,
                s.lga as school_lga,
                s.latitude,
                s.longitude,
                EXTRACT(EPOCH FROM (NOW() - r.created_at))/3600 as hours_since_created
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE r.status IN ('reported', 'acknowledged') 
                AND (r.priority = 'urgent' OR r.urgency_score >= 80)
            ORDER BY r.urgency_score DESC, r.created_at ASC
            LIMIT 50
        `;

        const result = await db.query(urgentQuery);
        const urgentReports = result.rows.map(report => ({
            ...report,
            hoursSinceCreated: parseFloat(report.hours_since_created).toFixed(1)
        }));

        res.json({
            success: true,
            data: {
                urgentReports,
                totalCount: urgentReports.length,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Urgent reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch urgent reports'
        });
    }
});

module.exports = router;

// Validation middleware
const createReportValidation = [
    body('schoolId')
        .isUUID()
        .withMessage('Valid school ID is required'),
    body('title')
        .isLength({ min: 5, max: 255 })
        .withMessage('Title must be between 5 and 255 characters'),
    body('description')
        .isLength({ min: 20, max: 2000 })
        .withMessage('Description must be between 20 and 2000 characters'),
    body('issueType')
        .isIn(['infrastructure', 'furniture', 'maintenance', 'safety', 'resources', 'sanitation'])
        .withMessage('Invalid issue type'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('studentsAffected')
        .optional()
        .isInt({ min: 0, max: 10000 })
        .withMessage('Students affected must be a number between 0 and 10000'),
    body('estimatedCost')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Estimated cost must be a positive number'),
    body('locationDetail')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Location detail must not exceed 500 characters'),
    body('isAnonymous')
        .optional()
        .isBoolean()
        .withMessage('Anonymous flag must be boolean')
];

const updateReportValidation = [
    body('status')
        .optional()
        .isIn(['reported', 'acknowledged', 'in-progress', 'resolved', 'rejected'])
        .withMessage('Invalid status'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('resolutionNotes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Resolution notes must not exceed 1000 characters'),
    body('resolutionCost')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Resolution cost must be a positive number'),
    body('fundingSource')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Funding source must not exceed 255 characters')
];

// Utility functions
const calculateUrgencyScore = (report) => {
    let score = 0;
    
    // Base score from priority
    const priorityScores = { low: 10, medium: 30, high: 60, urgent: 90 };
    score += priorityScores[report.priority] || 30;
    
    // Add points for students affected
    if (report.studentsAffected) {
        if (report.studentsAffected > 500) score += 20;
        else if (report.studentsAffected > 200) score += 15;
        else if (report.studentsAffected > 100) score += 10;
        else score += 5;
    }
    
    // Add points for issue type severity
    const severityScores = { 
        safety: 20, 
        infrastructure: 15, 
        sanitation: 15, 
        furniture: 10, 
        maintenance: 8, 
        resources: 5 
    };
    score += severityScores[report.issueType] || 5;
    
    return Math.min(score, 100); // Cap at 100
};

// Routes

// GET /api/reports - Get all reports with filtering and pagination
router.get('/', optionalAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['reported', 'acknowledged', 'in-progress', 'resolved', 'rejected']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('issueType').optional().isIn(['infrastructure', 'furniture', 'maintenance', 'safety', 'resources', 'sanitation']),
    query('lga').optional().isLength({ min: 2, max: 100 }),
    query('schoolId').optional().isUUID(),
    query('sortBy').optional().isIn(['created_at', 'priority', 'status', 'students_affected', 'urgency_score']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
                errors: errors.array()
            });
        }

        const {
            page = 1,
            limit = 20,
            status,
            priority,
            issueType,
            lga,
            schoolId,
            sortBy = 'created_at',
            sortOrder = 'desc',
            search
        } = req.query;

        const offset = (page - 1) * limit;

        // Build WHERE clause
        let whereClause = '1 = 1';
        const queryParams = [];
        let paramCount = 1;

        // Apply visibility filters based on user role
        if (!req.user || req.user.role === 'teacher') {
            whereClause += ` AND (r.visibility = 'public' OR r.visibility = 'government')`;
        }

        if (req.user && req.user.role === 'teacher' && req.user.schoolId) {
            whereClause += ` AND (r.school_id = $${paramCount} OR r.visibility = 'public')`;
            queryParams.push(req.user.schoolId);
            paramCount++;
        }

        if (status) {
            whereClause += ` AND r.status = $${paramCount}`;
            queryParams.push(status);
            paramCount++;
        }

        if (priority) {
            whereClause += ` AND r.priority = $${paramCount}`;
            queryParams.push(priority);
            paramCount++;
        }

        if (issueType) {
            whereClause += ` AND r.issue_type = $${paramCount}`;
            queryParams.push(issueType);
            paramCount++;
        }

        if (lga) {
            whereClause += ` AND s.lga ILIKE $${paramCount}`;
            queryParams.push(`%${lga}%`);
            paramCount++;
        }

        if (schoolId) {
            whereClause += ` AND r.school_id = $${paramCount}`;
            queryParams.push(schoolId);
            paramCount++;
        }

        if (search) {
            whereClause += ` AND (r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount} OR s.name ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
            paramCount++;
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(r.id) as total
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            LEFT JOIN users u ON r.reporter_id = u.id
            WHERE ${whereClause}
        `;

        const countResult = await db.query(countQuery, queryParams);
        const totalReports = parseInt(countResult.rows[0].total);

        // Get reports data
        const reportsQuery = `
            SELECT 
                r.id,
                r.title,
                r.description,
                r.issue_type,
                r.priority,
                r.status,
                r.students_affected,
                r.estimated_cost,
                r.urgency_score,
                r.location_detail,
                r.photos,
                r.is_anonymous,
                r.visibility,
                r.created_at,
                r.updated_at,
                r.resolved_at,
                r.resolution_notes,
                r.resolution_cost,
                r.funding_source,
                s.id as school_id,
                s.name as school_name,
                s.school_type,
                s.address as school_address,
                s.lga as school_lga,
                s.latitude as school_latitude,
                s.longitude as school_longitude,
                CASE 
                    WHEN r.is_anonymous THEN NULL
                    ELSE u.full_name
                END as reporter_name,
                CASE 
                    WHEN r.is_anonymous THEN NULL
                    ELSE u.role
                END as reporter_role
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            LEFT JOIN users u ON r.reporter_id = u.id
            WHERE ${whereClause}
            ORDER BY r.${sortBy} ${sortOrder}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        queryParams.push(limit, offset);

        const reportsResult = await db.query(reportsQuery, queryParams);
        const reports = reportsResult.rows;

        // Calculate pagination info
        const totalPages = Math.ceil(totalReports / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            success: true,
            data: {
                reports,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalReports,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports'
        });
    }
});

// GET /api/reports/:id - Get specific report details
router.get('/:id', validateUUID(), optionalAuth, requireReportAccess, async (req, res) => {
    try {
        const { id } = req.params;

        const reportQuery = `
            SELECT 
                r.*,
                s.name as school_name,
                s.school_type,
                s.address as school_address,
                s.lga as school_lga,
                s.latitude as school_latitude,
                s.longitude as school_longitude,
                s.contact_phone as school_phone,
                s.head_teacher_name,
                CASE 
                    WHEN r.is_anonymous THEN NULL
                    ELSE u.id
                END as reporter_id,
                CASE 
                    WHEN r.is_anonymous THEN NULL
                    ELSE u.full_name
                END as reporter_name,
                CASE 
                    WHEN r.is_anonymous THEN NULL
                    ELSE u.email
                END as reporter_email,
                CASE 
                    WHEN r.is_anonymous THEN NULL
                    ELSE u.role
                END as reporter_role,
                resolver.full_name as resolved_by_name
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            LEFT JOIN users u ON r.reporter_id = u.id
            LEFT JOIN users resolver ON r.resolved_by = resolver.id
            WHERE r.id = $1
        `;

        const reportResult = await db.query(reportQuery, [id]);

        if (reportResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const report = reportResult.rows[0];

        // Get comments for this report
        const commentsQuery = `
            SELECT 
                c.id,
                c.comment_text,
                c.comment_type,
                c.is_internal,
                c.attachments,
                c.created_at,
                u.full_name as author_name,
                u.role as author_role
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.report_id = $1
            ORDER BY c.created_at ASC
        `;

        const commentsResult = await db.query(commentsQuery, [id]);
        const comments = commentsResult.rows.filter(comment => {
            // Filter internal comments for non-government users
            if (comment.is_internal && req.user && !['admin', 'government'].includes(req.user.role)) {
                return false;
            }
            return true;
        });

        // Get related resources
        const resourcesQuery = `
            SELECT 
                id,
                resource_type,
                provider_name,
                provider_type,
                amount,
                currency,
                description,
                status,
                allocated_at,
                completed_at
            FROM resources
            WHERE report_id = $1
            ORDER BY created_at DESC
        `;

        const resourcesResult = await db.query(resourcesQuery, [id]);
        const resources = resourcesResult.rows;

        res.json({
            success: true,
            data: {
                report,
                comments,
                resources
            }
        });

    } catch (error) {
        console.error('Get report details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report details'
        });
    }
});

// POST /api/reports - Create new infrastructure report
router.post('/', authMiddleware, upload.array('photos', 5), createReportValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            schoolId,
            title,
            description,
            issueType,
            priority = 'medium',
            studentsAffected = 0,
            estimatedCost = 0,
            locationDetail,
            isAnonymous = false,
            visibility = 'public'
        } = req.body;

        // Verify school exists
        const schoolResult = await db.query('SELECT id, name, lga FROM schools WHERE id = $1', [schoolId]);
        if (schoolResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'School not found'
            });
        }

        const school = schoolResult.rows[0];

        // Upload photos if provided
        let photoUrls = [];
        if (req.files && req.files.length > 0) {
            try {
                for (const file of req.files) {
                    const uploadResult = await uploadImage(file.buffer, {
                        folder: 'edutrack/reports',
                        public_id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    });
                    photoUrls.push(uploadResult.secure_url);
                }
            } catch (uploadError) {
                console.error('Photo upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload photos'
                });
            }
        }

        // Calculate urgency score
        const reportData = {
            priority,
            studentsAffected: parseInt(studentsAffected),
            issueType
        };
        const urgencyScore = calculateUrgencyScore(reportData);

        // Create report
        const insertQuery = `
            INSERT INTO reports (
                school_id, reporter_id, title, description, issue_type, priority,
                students_affected, estimated_cost, urgency_score, location_detail,
                photos, is_anonymous, visibility
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const result = await db.query(insertQuery, [
            schoolId,
            isAnonymous ? null : req.user.id,
            title,
            description,
            issueType,
            priority,
            studentsAffected,
            estimatedCost,
            urgencyScore,
            locationDetail,
            photoUrls,
            isAnonymous,
            visibility
        ]);

        const newReport = result.rows[0];

        // Send notifications to relevant users
        try {
            await sendNotification({
                type: 'new_report',
                reportId: newReport.id,
                schoolId: schoolId,
                title: `New ${priority} priority report: ${title}`,
                message: `A new infrastructure report has been submitted for ${school.name}`,
                recipients: ['government', 'admin'] // Notify government officials and admins
            });
        } catch (notificationError) {
            console.error('Notification error:', notificationError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: {
                report: {
                    id: newReport.id,
                    title: newReport.title,
                    description: newReport.description,
                    issueType: newReport.issue_type,
                    priority: newReport.priority,
                    status: newReport.status,
                    urgencyScore: newReport.urgency_score,
                    studentsAffected: newReport.students_affected,
                    photos: newReport.photos,
                    createdAt: newReport.created_at,
                    school: {
                        id: school.id,
                        name: school.name,
                        lga: school.lga
                    }
                }
            }
        });

    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create report'
        });
    }
});

// PUT /api/reports/:id - Update report (status, priority, resolution)
router.put('/:id', validateUUID(), authMiddleware, canModifyReport, updateReportValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const {
            status,
            priority,
            resolutionNotes,
            resolutionCost,
            fundingSource
        } = req.body;

        // Get current report
        const currentReport = await db.query('SELECT * FROM reports WHERE id = $1', [id]);
        if (currentReport.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        const report = currentReport.rows[0];

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (status !== undefined) {
            updateFields.push(`status = $${paramCount++}`);
            updateValues.push(status);

            // If resolving, set resolved timestamp and resolver
            if (status === 'resolved') {
                updateFields.push(`resolved_at = NOW()`);
                updateFields.push(`resolved_by = $${paramCount++}`);
                updateValues.push(req.user.id);
            }
        }

        if (priority !== undefined) {
            updateFields.push(`priority = $${paramCount++}`);
            updateValues.push(priority);

            // Recalculate urgency score
            const updatedReport = { ...report, priority };
            const newUrgencyScore = calculateUrgencyScore(updatedReport);
            updateFields.push(`urgency_score = $${paramCount++}`);
            updateValues.push(newUrgencyScore);
        }

        if (resolutionNotes !== undefined) {
            updateFields.push(`resolution_notes = $${paramCount++}`);
            updateValues.push(resolutionNotes);
        }

        if (resolutionCost !== undefined) {
            updateFields.push(`resolution_cost = $${paramCount++}`);
            updateValues.push(resolutionCost);
        }

        if (fundingSource !== undefined) {
            updateFields.push(`funding_source = $${paramCount++}`);
            updateValues.push(fundingSource);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        const updateQuery = `
            UPDATE reports 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await db.query(updateQuery, updateValues);
        const updatedReport = result.rows[0];

        // Send notification for status changes
        if (status && status !== report.status) {
            try {
                await sendNotification({
                    type: 'status_update',
                    reportId: id,
                    title: `Report status updated to ${status}`,
                    message: `The status of report "${report.title}" has been updated`,
                    recipients: report.reporter_id ? [report.reporter_id] : []
                });
            } catch (notificationError) {
                console.error('Notification error:', notificationError);
            }
        }

        res.json({
            success: true,
            message: 'Report updated successfully',
            data: {
                report: updatedReport
            }
        });

    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update report'
        });
    }
});

// DELETE /api/reports/:id - Delete report (admin only)
router.delete('/:id', validateUUID(), authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if report exists
        const reportResult = await db.query('SELECT title FROM reports WHERE id = $1', [id]);
        if (reportResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Delete report (this will cascade to comments and resources)
        await db.query('DELETE FROM reports WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });

    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete report'
        });
    }
});