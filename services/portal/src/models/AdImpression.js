const database = require('../database');

class AdImpression {
    constructor(data) {
        this.id = data.id;
        this.adId = data.ad_id;
        this.sessionId = data.session_id;
        this.macAddress = data.mac_address;
        this.impressionTime = data.impression_time;
        this.watchedDurationSeconds = data.watched_duration_seconds || 0;
        this.completed = data.completed || false;
        this.skipTimeSeconds = data.skip_time_seconds;
    }

    static async create(impressionData) {
        const result = await database.execute(
            `INSERT INTO ad_impressions 
            (ad_id, session_id, mac_address, impression_time) 
            VALUES (?, ?, ?, NOW())`,
            [impressionData.adId, impressionData.sessionId, impressionData.macAddress]
        );
        
        return new AdImpression({
            id: result.insertId,
            ...impressionData,
            impression_time: new Date()
        });
    }

    async update() {
        return await database.execute(
            `UPDATE ad_impressions 
            SET watched_duration_seconds = ?, completed = ?, skip_time_seconds = ?
            WHERE id = ?`,
            [this.watchedDurationSeconds, this.completed, this.skipTimeSeconds, this.id]
        );
    }

    async markComplete(watchedDuration) {
        this.watchedDurationSeconds = watchedDuration;
        this.completed = true;
        
        return await database.execute(
            `UPDATE ad_impressions 
            SET watched_duration_seconds = ?, completed = TRUE
            WHERE id = ?`,
            [watchedDuration, this.id]
        );
    }

    static async findById(id) {
        const [rows] = await database.execute(
            'SELECT * FROM ad_impressions WHERE id = ?',
            [id]
        );
        
        return rows[0] ? new AdImpression(rows[0]) : null;
    }

    static async findBySession(sessionId) {
        const [rows] = await database.execute(
            'SELECT * FROM ad_impressions WHERE session_id = ? ORDER BY impression_time DESC',
            [sessionId]
        );
        
        return rows.map(row => new AdImpression(row));
    }

    static async findByMac(macAddress, limit = 50) {
        const [rows] = await database.execute(
            'SELECT * FROM ad_impressions WHERE mac_address = ? ORDER BY impression_time DESC LIMIT ?',
            [macAddress, limit]
        );
        
        return rows.map(row => new AdImpression(row));
    }

    static async getRecentByAd(adId, hours = 24) {
        const [rows] = await database.execute(
            `SELECT * FROM ad_impressions 
            WHERE ad_id = ? 
            AND impression_time > DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY impression_time DESC`,
            [adId, hours]
        );
        
        return rows.map(row => new AdImpression(row));
    }

    static async getStats(adId, startDate = null, endDate = null) {
        let query = `
            SELECT 
                COUNT(*) as total_impressions,
                SUM(completed) as completed_views,
                AVG(watched_duration_seconds) as avg_watch_duration,
                COUNT(DISTINCT mac_address) as unique_viewers,
                SUM(CASE WHEN watched_duration_seconds >= 24 THEN 1 ELSE 0 END) as qualified_views
            FROM ad_impressions 
            WHERE ad_id = ?
        `;
        
        const params = [adId];
        
        if (startDate && endDate) {
            query += ' AND DATE(impression_time) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        
        const [stats] = await database.execute(query, params);
        
        return stats[0];
    }

    static async getCompletionRate(adId) {
        const [result] = await database.execute(
            `SELECT 
                COUNT(*) as total,
                SUM(completed) as completed,
                (SUM(completed) / COUNT(*) * 100) as completion_rate
            FROM ad_impressions 
            WHERE ad_id = ?`,
            [adId]
        );
        
        return result[0];
    }

    static async cleanupOld(days = 90) {
        return await database.execute(
            'DELETE FROM ad_impressions WHERE impression_time < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [days]
        );
    }

    getWatchPercentage(totalDuration) {
        if (!totalDuration || totalDuration === 0) return 0;
        return Math.min(100, Math.round((this.watchedDurationSeconds / totalDuration) * 100));
    }

    toJSON() {
        return {
            id: this.id,
            adId: this.adId,
            sessionId: this.sessionId,
            macAddress: this.macAddress,
            impressionTime: this.impressionTime,
            watchedDurationSeconds: this.watchedDurationSeconds,
            completed: this.completed,
            skipTimeSeconds: this.skipTimeSeconds
        };
    }
}

module.exports = AdImpression;