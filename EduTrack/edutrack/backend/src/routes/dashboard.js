// EduTrack Backend - Dashboard Routes
// src/routes/dashboard.js - Dashboard analytics and statistics endpoints

const express = require('express');
const { query, validationResult } = require('express-validator');

const db = require('../config/database');
const { authMiddleware, requireGovernment, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - Get main dashboard statistics
router.get('/stats', optionalAuth, [
    query('lga').optional().isLength({ min: 2, max: 100 }),
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y', 'all'])
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

        const { lga, timeRange = '30d' } = req.query;

        // Build time filter
        let timeFilter = '';
        switch (timeRange) {
            case '7d':
                timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
                break;
            case '30d':
                timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
                break;
            case '90d':
                timeFilter = "AND created_at >= NOW() - INTERVAL '90 days'";
                break;
            case '1y':
                timeFilter = "AND created_at >= NOW() - INTERVAL '1 year'";
                break;
            default:
                timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        }

        // Build LGA filter
        let lgaFilter = '';
        const queryParams = [];
        if (lga) {
            lgaFilter = 'AND s.lga = $1';
            queryParams.push(lga);
        }

        // Main statistics query
        const mainStatsQuery = `
            WITH report_stats AS (
                SELECT 
                    COUNT(*) as total_reports,
                    COUNT(CASE WHEN r.status = 'reported' THEN 1 END) as reported_count,
                    COUNT(CASE WHEN r.status = 'acknowledged' THEN 1 END) as acknowledged_count,
                    COUNT(CASE WHEN r.status = 'in-progress' THEN 1 END) as in_progress_count,
                    COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count,
                    COUNT(CASE WHEN r.status = 'rejected' THEN 1 END) as rejected_count,
                    COUNT(CASE WHEN r.priority = 'urgent' THEN 1 END) as urgent_count,
                    COUNT(CASE WHEN r.priority = 'high' THEN 1 END) as high_count,
                    COUNT(CASE WHEN r.priority = 'medium' THEN 1 END) as medium_count,
                    COUNT(CASE WHEN r.priority = 'low' THEN 1 END) as low_count,
                    COALESCE(SUM(r.students_affected), 0) as total_students_affected,
                    COALESCE(SUM(r.estimated_cost), 0) as total_estimated_cost,
                    COALESCE(SUM(r.resolution_cost), 0) as total_resolution_cost,
                    COUNT(DISTINCT r.school_id) as affected_schools,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))/86400), 0) as avg_resolution_days
                FROM reports r
                JOIN schools s ON r.school_id = s.id
                WHERE 1=1 ${timeFilter} ${lgaFilter}
            ),
            school_stats AS (
                SELECT 
                    COUNT(*) as total_schools,
                    COUNT(DISTINCT s.lga) as total_lgas,
                    COALESCE(SUM(s.total_students), 0) as total_students_in_system,
                    COALESCE(SUM(s.total_teachers), 0) as total_teachers,
                    COALESCE(SUM(s.total_classrooms), 0) as total_classrooms,
                    COUNT(CASE WHEN s.school_type = 'primary' THEN 1 END) as primary_schools,
                    COUNT(CASE WHEN s.school_type = 'secondary' THEN 1 END) as secondary_schools,
                    COUNT(CASE WHEN s.school_type = 'technical' THEN 1 END) as technical_schools
                FROM schools s
                WHERE s.is_active = true ${lga ? 'AND s.lga = $1' : ''}
            ),
            user_stats AS (
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
                    COUNT(CASE WHEN role = 'government' THEN 1 END) as government_count,
                    COUNT(CASE WHEN role = 'ngo' THEN 1 END) as ngo_count,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
                FROM users
            )
            SELECT 
                r.*,
                s.*,
                u.*
            FROM report_stats r, school_stats s, user_stats u
        `;

        const statsResult = await db.query(mainStatsQuery, queryParams);
        const stats = statsResult.rows[0];

        // Recent activity query
        const recentActivityQuery = `
            SELECT 
                r.id,
                r.title,
                r.status,
                r.priority,
                r.created_at,
                r.updated_at,
                s.name as school_name,
                s.lga,
                CASE 
                    WHEN r.is_anonymous THEN 'Anonymous'
                    ELSE u.full_name
                END as reporter_name
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            LEFT JOIN users u ON r.reporter_id = u.id
            WHERE 1=1 ${lgaFilter}
            ORDER BY r.updated_at DESC
            LIMIT 10
        `;

        const recentActivityResult = await db.query(recentActivityQuery, queryParams);
        const recentActivity = recentActivityResult.rows;

        // Issue type breakdown
        const issueBreakdownQuery = `
            SELECT 
                r.issue_type,
                COUNT(*) as count,
                COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count,
                COALESCE(AVG(r.urgency_score), 0) as avg_urgency
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE 1=1 ${timeFilter} ${lgaFilter}
            GROUP BY r.issue_type
            ORDER BY count DESC
        `;

        const issueBreakdownResult = await db.query(issueBreakdownQuery, queryParams);
        const issueBreakdown = issueBreakdownResult.rows;

        // Calculate key metrics
        const totalReports = parseInt(stats.total_reports);
        const resolvedReports = parseInt(stats.resolved_count);
        const resolutionRate = totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(1) : '0.0';
        const urgentReports = parseInt(stats.urgent_count);
        const urgencyRate = totalReports > 0 ? ((urgentReports / totalReports) * 100).toFixed(1) : '0.0';

        res.json({
            success: true,
            data: {
                overview: {
                    totalReports: totalReports,
                    reportsByStatus: {
                        reported: parseInt(stats.reported_count),
                        acknowledged: parseInt(stats.acknowledged_count),
                        inProgress: parseInt(stats.in_progress_count),
                        resolved: parseInt(stats.resolved_count),
                        rejected: parseInt(stats.rejected_count)
                    },
                    reportsByPriority: {
                        urgent: parseInt(stats.urgent_count),
                        high: parseInt(stats.high_count),
                        medium: parseInt(stats.medium_count),
                        low: parseInt(stats.low_count)
                    },
                    resolutionRate: parseFloat(resolutionRate),
                    urgencyRate: parseFloat(urgencyRate),
                    avgResolutionDays: parseFloat(stats.avg_resolution_days).toFixed(1),
                    totalStudentsAffected: parseInt(stats.total_students_affected),
                    totalEstimatedCost: parseFloat(stats.total_estimated_cost),
                    totalResolutionCost: parseFloat(stats.total_resolution_cost),
                    affectedSchools: parseInt(stats.affected_schools)
                },
                schools: {
                    totalSchools: parseInt(stats.total_schools),
                    totalLGAs: parseInt(stats.total_lgas),
                    totalStudentsInSystem: parseInt(stats.total_students_in_system),
                    totalTeachers: parseInt(stats.total_teachers),
                    totalClassrooms: parseInt(stats.total_classrooms),
                    schoolsByType: {
                        primary: parseInt(stats.primary_schools),
                        secondary: parseInt(stats.secondary_schools),
                        technical: parseInt(stats.technical_schools)
                    }
                },
                users: {
                    totalUsers: parseInt(stats.total_users),
                    activeUsers: parseInt(stats.active_users),
                    usersByRole: {
                        teachers: parseInt(stats.teacher_count),
                        admins: parseInt(stats.admin_count),
                        government: parseInt(stats.government_count),
                        ngos: parseInt(stats.ngo_count)
                    }
                },
                recentActivity,
                issueBreakdown: issueBreakdown.map(item => ({
                    issueType: item.issue_type,
                    count: parseInt(item.count),
                    resolvedCount: parseInt(item.resolved_count),
                    resolutionRate: item.count > 0 ? ((item.resolved_count / item.count) * 100).toFixed(1) : '0.0',
                    avgUrgency: parseFloat(item.avg_urgency).toFixed(1)
                })),
                filters: {
                    lga,
                    timeRange
                },
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

// GET /api/dashboard/charts - Get data for dashboard charts
router.get('/charts', optionalAuth, [
    query('type').isIn(['timeline', 'status', 'priority', 'issueType', 'lga', 'monthly']),
    query('lga').optional().isLength({ min: 2, max: 100 }),
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid parameters',
                errors: errors.array()
            });
        }

        const { type, lga, timeRange = '30d' } = req.query;

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
        }

        let lgaFilter = '';
        const queryParams = [];
        if (lga) {
            lgaFilter = 'AND s.lga = $1';
            queryParams.push(lga);
        }

        let chartData = [];

        switch (type) {
            case 'timeline':
                const timelineQuery = `
                    SELECT 
                        DATE_TRUNC('day', r.created_at) as date,
                        COUNT(*) as total,
                        COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved,
                        COUNT(CASE WHEN r.priority = 'urgent' THEN 1 END) as urgent
                    FROM reports r
                    JOIN schools s ON r.school_id = s.id
                    WHERE 1=1 ${timeFilter} ${lgaFilter}
                    GROUP BY DATE_TRUNC('day', r.created_at)
                    ORDER BY date DESC
                    LIMIT 30
                `;
                const timelineResult = await db.query(timelineQuery, queryParams);
                chartData = timelineResult.rows.map(row => ({
                    date: row.date,
                    total: parseInt(row.total),
                    resolved: parseInt(row.resolved),
                    urgent: parseInt(row.urgent)
                }));
                break;

            case 'status':
                const statusQuery = `
                    SELECT 
                        r.status,
                        COUNT(*) as count
                    FROM reports r
                    JOIN schools s ON r.school_id = s.id
                    WHERE 1=1 ${timeFilter} ${lgaFilter}
                    GROUP BY r.status
                    ORDER BY count DESC
                `;
                const statusResult = await db.query(statusQuery, queryParams);
                chartData = statusResult.rows.map(row => ({
                    status: row.status,
                    count: parseInt(row.count)
                }));
                break;

            case 'priority':
                const priorityQuery = `
                    SELECT 
                        r.priority,
                        COUNT(*) as count,
                        COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count
                    FROM reports r
                    JOIN schools s ON r.school_id = s.id
                    WHERE 1=1 ${timeFilter} ${lgaFilter}
                    GROUP BY r.priority
                    ORDER BY 
                        CASE r.priority 
                            WHEN 'urgent' THEN 1 
                            WHEN 'high' THEN 2 
                            WHEN 'medium' THEN 3 
                            WHEN 'low' THEN 4 
                        END
                `;
                const priorityResult = await db.query(priorityQuery, queryParams);
                chartData = priorityResult.rows.map(row => ({
                    priority: row.priority,
                    count: parseInt(row.count),
                    resolvedCount: parseInt(row.resolved_count)
                }));
                break;

            case 'issueType':
                const issueTypeQuery = `
                    SELECT 
                        r.issue_type,
                        COUNT(*) as count,
                        COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count,
                        COALESCE(SUM(r.students_affected), 0) as students_affected
                    FROM reports r
                    JOIN schools s ON r.school_id = s.id
                    WHERE 1=1 ${timeFilter} ${lgaFilter}
                    GROUP BY r.issue_type
                    ORDER BY count DESC
                `;
                const issueTypeResult = await db.query(issueTypeQuery, queryParams);
                chartData = issueTypeResult.rows.map(row => ({
                    issueType: row.issue_type,
                    count: parseInt(row.count),
                    resolvedCount: parseInt(row.resolved_count),
                    studentsAffected: parseInt(row.students_affected)
                }));
                break;

            case 'lga':
                const lgaQuery = `
                    SELECT 
                        s.lga,
                        COUNT(r.id) as total_reports,
                        COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_reports,
                        COUNT(CASE WHEN r.priority IN ('urgent', 'high') THEN 1 END) as critical_reports,
                        COUNT(DISTINCT r.school_id) as affected_schools,
                        COALESCE(SUM(r.students_affected), 0) as total_students_affected
                    FROM reports r
                    JOIN schools s ON r.school_id = s.id
                    WHERE 1=1 ${timeFilter}
                    GROUP BY s.lga
                    ORDER BY total_reports DESC
                `;
                const lgaResult = await db.query(lgaQuery);
                chartData = lgaResult.rows.map(row => ({
                    lga: row.lga,
                    totalReports: parseInt(row.total_reports),
                    resolvedReports: parseInt(row.resolved_reports),
                    criticalReports: parseInt(row.critical_reports),
                    affectedSchools: parseInt(row.affected_schools),
                    totalStudentsAffected: parseInt(row.total_students_affected),
                    resolutionRate: row.total_reports > 0 ? 
                        ((row.resolved_reports / row.total_reports) * 100).toFixed(1) : '0.0'
                }));
                break;

            case 'monthly':
                const monthlyQuery = `
                    SELECT 
                        DATE_TRUNC('month', r.created_at) as month,
                        COUNT(*) as total_reports,
                        COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_reports,
                        COALESCE(SUM(r.students_affected), 0) as students_affected,
                        COALESCE(SUM(r.resolution_cost), 0) as total_cost
                    FROM reports r
                    JOIN schools s ON r.school_id = s.id
                    WHERE r.created_at >= NOW() - INTERVAL '12 months' ${lgaFilter}
                    GROUP BY DATE_TRUNC('month', r.created_at)
                    ORDER BY month DESC
                `;
                const monthlyResult = await db.query(monthlyQuery, queryParams);
                chartData = monthlyResult.rows.map(row => ({
                    month: row.month,
                    totalReports: parseInt(row.total_reports),
                    resolvedReports: parseInt(row.resolved_reports),
                    studentsAffected: parseInt(row.students_affected),
                    totalCost: parseFloat(row.total_cost)
                }));
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid chart type'
                });
        }

        res.json({
            success: true,
            data: {
                chartType: type,
                data: chartData,
                filters: { lga, timeRange },
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart data'
        });
    }
});

// GET /api/dashboard/recent - Get recent activity feed
router.get('/recent', optionalAuth, [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['reports', 'resolutions', 'comments', 'all'])
], async (req, res) => {
    try {
        const { limit = 20, type = 'all' } = req.query;

        let activities = [];

        if (type === 'reports' || type === 'all') {
            // Recent reports
            const reportsQuery = `
                SELECT 
                    'report' as activity_type,
                    r.id as item_id,
                    r.title,
                    r.priority,
                    r.status,
                    r.created_at as activity_time,
                    s.name as school_name,
                    s.lga,
                    CASE 
                        WHEN r.is_anonymous THEN 'Anonymous User'
                        ELSE u.full_name
                    END as actor_name
                FROM reports r
                JOIN schools s ON r.school_id = s.id
                LEFT JOIN users u ON r.reporter_id = u.id
                ORDER BY r.created_at DESC
                LIMIT $1
            `;

            const reportsResult = await db.query(reportsQuery, [limit]);
            activities = activities.concat(reportsResult.rows);
        }

        if (type === 'resolutions' || type === 'all') {
            // Recent resolutions
            const resolutionsQuery = `
                SELECT 
                    'resolution' as activity_type,
                    r.id as item_id,
                    r.title,
                    r.priority,
                    'resolved' as status,
                    r.resolved_at as activity_time,
                    s.name as school_name,
                    s.lga,
                    resolver.full_name as actor_name
                FROM reports r
                JOIN schools s ON r.school_id = s.id
                LEFT JOIN users resolver ON r.resolved_by = resolver.id
                WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL
                ORDER BY r.resolved_at DESC
                LIMIT $1
            `;

            const resolutionsResult = await db.query(resolutionsQuery, [limit]);
            activities = activities.concat(resolutionsResult.rows);
        }

        if (type === 'comments' || type === 'all') {
            // Recent comments
            const commentsQuery = `
                SELECT 
                    'comment' as activity_type,
                    c.id as item_id,
                    r.title,
                    r.priority,
                    r.status,
                    c.created_at as activity_time,
                    s.name as school_name,
                    s.lga,
                    u.full_name as actor_name,
                    c.comment_type,
                    LEFT(c.comment_text, 100) as comment_preview
                FROM comments c
                JOIN reports r ON c.report_id = r.id
                JOIN schools s ON r.school_id = s.id
                JOIN users u ON c.user_id = u.id
                WHERE c.is_internal = false OR $2 = true
                ORDER BY c.created_at DESC
                LIMIT $1
            `;

            // Check if user has government access to see internal comments
            const hasGovernmentAccess = req.user && ['admin', 'government'].includes(req.user.role);
            const commentsResult = await db.query(commentsQuery, [limit, hasGovernmentAccess]);
            activities = activities.concat(commentsResult.rows);
        }

        // Sort all activities by time
        activities.sort((a, b) => new Date(b.activity_time) - new Date(a.activity_time));
        activities = activities.slice(0, limit);

        res.json({
            success: true,
            data: {
                activities: activities.map(activity => ({
                    ...activity,
                    activityTime: activity.activity_time,
                    relativeTime: getRelativeTime(activity.activity_time)
                })),
                totalCount: activities.length,
                type,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity'
        });
    }
});

// GET /api/dashboard/trends - Get trending data and insights
router.get('/trends', authMiddleware, requireGovernment, [
    query('period').optional().isIn(['daily', 'weekly', 'monthly']),
    query('metric').optional().isIn(['reports', 'resolutions', 'students_affected', 'cost'])
], async (req, res) => {
    try {
        const { period = 'weekly', metric = 'reports' } = req.query;

        let dateFormat, intervalBack;
        switch (period) {
            case 'daily':
                dateFormat = 'day';
                intervalBack = '30 days';
                break;
            case 'weekly':
                dateFormat = 'week';
                intervalBack = '12 weeks';
                break;
            case 'monthly':
                dateFormat = 'month';
                intervalBack = '12 months';
                break;
        }

        let metricField;
        switch (metric) {
            case 'reports':
                metricField = 'COUNT(*)';
                break;
            case 'resolutions':
                metricField = "COUNT(CASE WHEN status = 'resolved' THEN 1 END)";
                break;
            case 'students_affected':
                metricField = 'COALESCE(SUM(students_affected), 0)';
                break;
            case 'cost':
                metricField = 'COALESCE(SUM(resolution_cost), 0)';
                break;
        }

        const trendsQuery = `
            SELECT 
                DATE_TRUNC('${dateFormat}', created_at) as period,
                ${metricField} as value
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE created_at >= NOW() - INTERVAL '${intervalBack}'
            GROUP BY DATE_TRUNC('${dateFormat}', created_at)
            ORDER BY period DESC
        `;

        const trendsResult = await db.query(trendsQuery);
        const trends = trendsResult.rows.map(row => ({
            period: row.period,
            value: parseFloat(row.value) || 0
        }));

        // Calculate trend analysis
        let trendDirection = 'stable';
        let trendPercentage = 0;

        if (trends.length >= 2) {
            const current = trends[0].value;
            const previous = trends[1].value;
            
            if (previous > 0) {
                trendPercentage = ((current - previous) / previous * 100);
                trendDirection = trendPercentage > 5 ? 'increasing' : 
                               trendPercentage < -5 ? 'decreasing' : 'stable';
            }
        }

        // Get comparative insights
        const insightsQuery = `
            SELECT 
                s.lga,
                COUNT(r.id) as report_count,
                COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count,
                COALESCE(AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))/86400), 0) as avg_resolution_days
            FROM reports r
            JOIN schools s ON r.school_id = s.id
            WHERE r.created_at >= NOW() - INTERVAL '${intervalBack}'
            GROUP BY s.lga
            HAVING COUNT(r.id) > 0
            ORDER BY report_count DESC
        `;

        const insightsResult = await db.query(insightsQuery);
        const insights = insightsResult.rows.map(row => ({
            lga: row.lga,
            reportCount: parseInt(row.report_count),
            resolvedCount: parseInt(row.resolved_count),
            resolutionRate: row.report_count > 0 ? 
                ((row.resolved_count / row.report_count) * 100).toFixed(1) : '0.0',
            avgResolutionDays: parseFloat(row.avg_resolution_days).toFixed(1)
        }));

        res.json({
            success: true,
            data: {
                trends,
                analysis: {
                    direction: trendDirection,
                    percentage: trendPercentage.toFixed(1),
                    interpretation: getTrendInterpretation(trendDirection, trendPercentage, metric)
                },
                insights,
                metadata: {
                    period,
                    metric,
                    dataPoints: trends.length,
                    timeRange: intervalBack
                },
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trend data'
        });
    }
});

// GET /api/dashboard/performance - Get performance metrics
router.get('/performance', authMiddleware, requireGovernment, async (req, res) => {
    try {
        const performanceQuery = `
            WITH performance_metrics AS (
                SELECT 
                    COUNT(*) as total_reports,
                    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/86400), 0) as avg_resolution_days,
                    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at))/86400), 0) as median_resolution_days,
                    COUNT(CASE WHEN priority = 'urgent' AND status = 'resolved' AND resolved_at <= created_at + INTERVAL '7 days' THEN 1 END) as urgent_resolved_on_time,
                    COUNT(CASE WHEN priority = 'urgent' AND status = 'resolved' THEN 1 END) as urgent_resolved_total,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as reports_last_30_days,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' AND status = 'resolved' THEN 1 END) as resolved_last_30_days
                FROM reports
                WHERE created_at >= NOW() - INTERVAL '1 year'
            ),
            lga_performance AS (
                SELECT 
                    s.lga,
                    COUNT(r.id) as lga_reports,
                    COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as lga_resolved,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))/86400), 0) as lga_avg_days
                FROM reports r
                JOIN schools s ON r.school_id = s.id
                WHERE r.created_at >= NOW() - INTERVAL '1 year'
                GROUP BY s.lga
            )
            SELECT 
                pm.*,
                json_agg(
                    json_build_object(
                        'lga', lp.lga,
                        'reports', lp.lga_reports,
                        'resolved', lp.lga_resolved,
                        'resolution_rate', CASE WHEN lp.lga_reports > 0 THEN (lp.lga_resolved::float / lp.lga_reports * 100) ELSE 0 END,
                        'avg_days', lp.lga_avg_days
                    ) ORDER BY lp.lga_reports DESC
                ) as lga_performance
            FROM performance_metrics pm, lga_performance lp
            GROUP BY pm.total_reports, pm.resolved_reports, pm.avg_resolution_days, 
                     pm.median_resolution_days, pm.urgent_resolved_on_time, pm.urgent_resolved_total,
                     pm.reports_last_30_days, pm.resolved_last_30_days
        `;

        const performanceResult = await db.query(performanceQuery);
        const performance = performanceResult.rows[0];

        // Calculate KPIs
        const overallResolutionRate = performance.total_reports > 0 ? 
            (performance.resolved_reports / performance.total_reports * 100) : 0;

        const urgentResponseRate = performance.urgent_resolved_total > 0 ?
            (performance.urgent_resolved_on_time / performance.urgent_resolved_total * 100) : 0;

        const monthlyResolutionRate = performance.reports_last_30_days > 0 ?
            (performance.resolved_last_30_days / performance.reports_last_30_days * 100) : 0;

        res.json({
            success: true,
            data: {
                kpis: {
                    overallResolutionRate: overallResolutionRate.toFixed(1),
                    avgResolutionDays: parseFloat(performance.avg_resolution_days).toFixed(1),
                    medianResolutionDays: parseFloat(performance.median_resolution_days).toFixed(1),
                    urgentResponseRate: urgentResponseRate.toFixed(1),
                    monthlyResolutionRate: monthlyResolutionRate.toFixed(1),
                    totalReportsProcessed: parseInt(performance.total_reports),
                    reportsLastMonth: parseInt(performance.reports_last_30_days)
                },
                lgaPerformance: performance.lga_performance,
                benchmarks: {
                    targetResolutionRate: 85,
                    targetAvgDays: 30,
                    targetUrgentResponse: 95,
                    targetMonthlyRate: 90
                },
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Performance metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance metrics'
        });
    }
});

// Utility functions
function getRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffInMinutes = Math.floor((now - then) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
}

function getTrendInterpretation(direction, percentage, metric) {
    const absPercentage = Math.abs(percentage);
    
    switch (direction) {
        case 'increasing':
            if (metric === 'reports') {
                return `Reports have increased by ${absPercentage}%, indicating either more issues or improved reporting`;
            } else if (metric === 'resolutions') {
                return `Resolutions have increased by ${absPercentage}%, showing improved response capacity`;
            }
            break;
        case 'decreasing':
            if (metric === 'reports') {
                return `Reports have decreased by ${absPercentage}%, possibly indicating infrastructure improvements`;
            } else if (metric === 'resolutions') {
                return `Resolutions have decreased by ${absPercentage}%, may require attention to response capacity`;
            }
            break;
        case 'stable':
            return `${metric.charAt(0).toUpperCase() + metric.slice(1)} levels remain stable with minimal change`;
    }
    
    return `Trend analysis shows ${direction} pattern in ${metric}`;
}

module.exports = router;