const database = require('../database');
const logger = require('../utils/logger');

class StatsController {
    // Get overview statistics
    async getOverview(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Default to last 7 days if no dates provided
            const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = endDate || new Date().toISOString().split('T')[0];

            // Get session statistics
            const [sessionStats] = await database.execute(
                `SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(DISTINCT mac_address) as unique_users,
                    AVG(TIMESTAMPDIFF(MINUTE, session_start, IFNULL(session_end, NOW()))) as avg_session_duration,
                    SUM(data_used_mb) as total_data_mb
                FROM user_sessions
                WHERE DATE(session_start) BETWEEN ? AND ?`,
                [start, end]
            );

            // Get ad statistics
            const [adStats] = await database.execute(
                `SELECT 
                    COUNT(*) as total_impressions,
                    SUM(completed) as completed_views,
                    AVG(watched_duration_seconds) as avg_watch_duration,
                    COUNT(DISTINCT ad_id) as unique_ads_shown
                FROM ad_impressions
                WHERE DATE(impression_time) BETWEEN ? AND ?`,
                [start, end]
            );

            // Get current active sessions
            const [activeSessions] = await database.execute(
                `SELECT COUNT(*) as active_sessions
                FROM user_sessions
                WHERE status = 'active'
                AND session_start > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
                [15] // 15-minute session duration
            );

            // Get top ads by impressions
            const [topAds] = await database.execute(
                `SELECT 
                    a.id,
                    a.name,
                    COUNT(ai.id) as impression_count,
                    SUM(ai.completed) as completed_count,
                    AVG(ai.watched_duration_seconds) as avg_watch_time
                FROM ads a
                JOIN ad_impressions ai ON a.id = ai.ad_id
                WHERE DATE(ai.impression_time) BETWEEN ? AND ?
                GROUP BY a.id
                ORDER BY impression_count DESC
                LIMIT 5`,
                [start, end]
            );

            res.json({
                success: true,
                period: { start, end },
                overview: {
                    sessions: {
                        total: sessionStats[0].total_sessions || 0,
                        uniqueUsers: sessionStats[0].unique_users || 0,
                        avgDuration: Math.round(sessionStats[0].avg_session_duration || 0),
                        totalDataMB: Math.round(sessionStats[0].total_data_mb || 0),
                        currentlyActive: activeSessions[0].active_sessions || 0
                    },
                    ads: {
                        totalImpressions: adStats[0].total_impressions || 0,
                        completedViews: adStats[0].completed_views || 0,
                        completionRate: adStats[0].total_impressions > 0 
                            ? ((adStats[0].completed_views / adStats[0].total_impressions) * 100).toFixed(2) 
                            : 0,
                        avgWatchDuration: Math.round(adStats[0].avg_watch_duration || 0),
                        uniqueAdsShown: adStats[0].unique_ads_shown || 0
                    },
                    topAds: topAds
                }
            });

        } catch (error) {
            logger.error('Error in getOverview:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get overview statistics'
            });
        }
    }

    // Get session details
    async getSessions(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                status, 
                startDate, 
                endDate,
                macAddress 
            } = req.query;
            
            const offset = (page - 1) * limit;
            let query = `
                SELECT 
                    s.*,
                    dp.device_type,
                    dp.os_type,
                    COUNT(DISTINCT ai.id) as ads_watched
                FROM user_sessions s
                LEFT JOIN device_profiles dp ON s.mac_address = dp.mac_address
                LEFT JOIN ad_impressions ai ON s.id = ai.session_id
                WHERE 1=1
            `;
            
            const params = [];

            if (status) {
                query += ' AND s.status = ?';
                params.push(status);
            }

            if (startDate && endDate) {
                query += ' AND DATE(s.session_start) BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            if (macAddress) {
                query += ' AND s.mac_address = ?';
                params.push(macAddress);
            }

            query += ` 
                GROUP BY s.id
                ORDER BY s.session_start DESC
                LIMIT ? OFFSET ?
            `;
            
            params.push(parseInt(limit), offset);

            const [sessions] = await database.execute(query, params);

            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) as total FROM user_sessions WHERE 1=1';
            const countParams = [];

            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }

            if (startDate && endDate) {
                countQuery += ' AND DATE(session_start) BETWEEN ? AND ?';
                countParams.push(startDate, endDate);
            }

            if (macAddress) {
                countQuery += ' AND mac_address = ?';
                countParams.push(macAddress);
            }

            const [total] = await database.execute(countQuery, countParams);

            res.json({
                success: true,
                sessions: sessions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].total,
                    pages: Math.ceil(total[0].total / limit)
                }
            });

        } catch (error) {
            logger.error('Error in getSessions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get sessions'
            });
        }
    }

    // Get ad performance statistics
    async getAdStats(req, res) {
        try {
            const { adId, startDate, endDate } = req.query;

            let query = `
                SELECT 
                    a.id,
                    a.name,
                    adv.name as advertiser_name,
                    COUNT(ai.id) as total_impressions,
                    SUM(ai.completed) as completed_views,
                    AVG(ai.watched_duration_seconds) as avg_watch_duration,
                    MIN(ai.watched_duration_seconds) as min_watch_duration,
                    MAX(ai.watched_duration_seconds) as max_watch_duration,
                    COUNT(DISTINCT ai.mac_address) as unique_viewers,
                    DATE(MIN(ai.impression_time)) as first_impression,
                    DATE(MAX(ai.impression_time)) as last_impression
                FROM ads a
                LEFT JOIN advertisers adv ON a.advertiser_id = adv.id
                LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
                WHERE 1=1
            `;

            const params = [];

            if (adId) {
                query += ' AND a.id = ?';
                params.push(adId);
            }

            if (startDate && endDate) {
                query += ' AND DATE(ai.impression_time) BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            query += ' GROUP BY a.id ORDER BY total_impressions DESC';

            const [adStats] = await database.execute(query, params);

            // Get hourly distribution
            const [hourlyStats] = await database.execute(
                `SELECT 
                    HOUR(impression_time) as hour,
                    COUNT(*) as impressions
                FROM ad_impressions
                WHERE DATE(impression_time) BETWEEN ? AND ?
                ${adId ? 'AND ad_id = ?' : ''}
                GROUP BY HOUR(impression_time)
                ORDER BY hour`,
                adId ? [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0], adId] 
                     : [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]]
            );

            res.json({
                success: true,
                adStats: adStats,
                hourlyDistribution: hourlyStats
            });

        } catch (error) {
            logger.error('Error in getAdStats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ad statistics'
            });
        }
    }

    // Get device statistics
    async getDeviceStats(req, res) {
        try {
            const { startDate, endDate } = req.query;

            // Device type distribution
            const [deviceTypes] = await database.execute(
                `SELECT 
                    device_type,
                    COUNT(*) as count,
                    COUNT(DISTINCT mac_address) as unique_devices
                FROM user_sessions
                WHERE DATE(session_start) BETWEEN ? AND ?
                GROUP BY device_type
                ORDER BY count DESC`,
                [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]]
            );

            // OS distribution
            const [osTypes] = await database.execute(
                `SELECT 
                    dp.os_type,
                    COUNT(DISTINCT dp.mac_address) as count
                FROM device_profiles dp
                JOIN user_sessions s ON dp.mac_address = s.mac_address
                WHERE DATE(s.session_start) BETWEEN ? AND ?
                GROUP BY dp.os_type
                ORDER BY count DESC`,
                [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]]
            );

            // Top devices by usage
            const [topDevices] = await database.execute(
                `SELECT 
                    dp.mac_address,
                    dp.device_type,
                    dp.os_type,
                    COUNT(s.id) as session_count,
                    SUM(s.data_used_mb) as total_data_mb,
                    COUNT(DISTINCT DATE(s.session_start)) as active_days,
                    MAX(s.session_start) as last_seen
                FROM device_profiles dp
                JOIN user_sessions s ON dp.mac_address = s.mac_address
                WHERE DATE(s.session_start) BETWEEN ? AND ?
                GROUP BY dp.mac_address
                ORDER BY session_count DESC
                LIMIT 20`,
                [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]]
            );

            res.json({
                success: true,
                deviceStats: {
                    deviceTypes: deviceTypes,
                    osTypes: osTypes,
                    topDevices: topDevices
                }
            });

        } catch (error) {
            logger.error('Error in getDeviceStats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get device statistics'
            });
        }
    }
}

module.exports = new StatsController();