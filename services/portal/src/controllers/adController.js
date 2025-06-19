const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const database = require('../database');

class AdController {
    constructor() {
        this.adServiceUrl = config.ads.serviceUrl;
        this.minWatchPercentage = config.ads.minWatchPercentage;
    }

    // Get next ad to display
    async getNextAd(req, res) {
        try {
            const { session } = req.query;
            
            if (!session) {
                return res.status(400).json({
                    success: false,
                    message: 'Session ID required'
                });
            }

            // Get session details
            const [sessionData] = await database.execute(
                'SELECT * FROM user_sessions WHERE id = ?',
                [session]
            );

            if (!sessionData || sessionData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            const userSession = sessionData[0];

            // Get device profile for targeting
            const [deviceProfile] = await database.execute(
                'SELECT * FROM device_profiles WHERE mac_address = ?',
                [userSession.mac_address]
            );

            // Call ad service to get next ad
            let ad;
            try {
                const response = await axios.get(`${this.adServiceUrl}/api/ads/select`, {
                    params: {
                        sessionId: session,
                        macAddress: userSession.mac_address,
                        deviceType: userSession.device_type,
                        previousAds: await this.getPreviousAdIds(userSession.mac_address)
                    }
                });

                ad = response.data.ad;
            } catch (error) {
                logger.error('Error calling ad service:', error);
                // Fallback to database selection
                ad = await this.selectAdFromDatabase(userSession.mac_address);
            }

            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'No ads available'
                });
            }

            // Create impression record
            await database.execute(
                `INSERT INTO ad_impressions 
                (ad_id, session_id, mac_address, impression_time) 
                VALUES (?, ?, ?, NOW())`,
                [ad.id, session, userSession.mac_address]
            );

            res.json({
                success: true,
                ad: {
                    id: ad.id,
                    name: ad.name,
                    videoUrl: ad.video_url,
                    duration: ad.duration_seconds,
                    advertiser: ad.advertiser_name
                },
                minWatchPercentage: this.minWatchPercentage
            });

        } catch (error) {
            logger.error('Error in getNextAd:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ad'
            });
        }
    }

    // Track ad impression
    async trackImpression(req, res) {
        try {
            const { sessionId, adId, startTime } = req.body;

            if (!sessionId || !adId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Update impression record
            await database.execute(
                `UPDATE ad_impressions 
                SET impression_time = FROM_UNIXTIME(?)
                WHERE session_id = ? AND ad_id = ?`,
                [startTime / 1000, sessionId, adId]
            );

            res.json({
                success: true,
                message: 'Impression tracked'
            });

        } catch (error) {
            logger.error('Error in trackImpression:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track impression'
            });
        }
    }

    // List all ads (admin)
    async listAds(req, res) {
        try {
            const { status = 'active', page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            const [ads] = await database.execute(
                `SELECT 
                    a.*,
                    adv.name as advertiser_name,
                    COUNT(DISTINCT ai.id) as total_impressions,
                    SUM(ai.completed) as completed_views
                FROM ads a
                LEFT JOIN advertisers adv ON a.advertiser_id = adv.id
                LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
                WHERE a.status = ?
                GROUP BY a.id
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?`,
                [status, parseInt(limit), offset]
            );

            const [total] = await database.execute(
                'SELECT COUNT(*) as count FROM ads WHERE status = ?',
                [status]
            );

            res.json({
                success: true,
                ads: ads,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total[0].count,
                    pages: Math.ceil(total[0].count / limit)
                }
            });

        } catch (error) {
            logger.error('Error in listAds:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to list ads'
            });
        }
    }

    // Helper methods
    async getPreviousAdIds(macAddress, hours = 24) {
        const [results] = await database.execute(
            `SELECT DISTINCT ad_id 
            FROM ad_impressions 
            WHERE mac_address = ? 
            AND impression_time > DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY impression_time DESC
            LIMIT 10`,
            [macAddress, hours]
        );

        return results.map(row => row.ad_id);
    }

    async selectAdFromDatabase(macAddress) {
        // Get ads that haven't been shown recently
        const previousAds = await this.getPreviousAdIds(macAddress);
        
        let query = `
            SELECT a.*, adv.name as advertiser_name
            FROM ads a
            LEFT JOIN advertisers adv ON a.advertiser_id = adv.id
            WHERE a.status = 'active'
            AND (a.start_date IS NULL OR a.start_date <= CURDATE())
            AND (a.end_date IS NULL OR a.end_date >= CURDATE())
        `;
        
        const params = [];
        
        if (previousAds.length > 0) {
            query += ` AND a.id NOT IN (${previousAds.map(() => '?').join(',')})`;
            params.push(...previousAds);
        }
        
        query += ` ORDER BY a.weight DESC, RAND() LIMIT 1`;
        
        const [ads] = await database.execute(query, params);
        
        return ads[0] || null;
    }
}

module.exports = new AdController();