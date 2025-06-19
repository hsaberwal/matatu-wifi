const database = require('../database');

class User {
    constructor(data) {
        this.macAddress = data.mac_address;
        this.deviceType = data.device_type;
        this.osType = data.os_type;
        this.browser = data.browser;
        this.firstSeen = data.first_seen;
        this.lastSeen = data.last_seen;
        this.totalSessions = data.total_sessions || 0;
        this.totalAdsWatched = data.total_ads_watched || 0;
    }

    static async findByMac(macAddress) {
        const [rows] = await database.execute(
            'SELECT * FROM device_profiles WHERE mac_address = ?',
            [macAddress]
        );
        
        return rows[0] ? new User(rows[0]) : null;
    }

    static async create(userData) {
        const result = await database.execute(
            `INSERT INTO device_profiles 
            (mac_address, device_type, os_type, browser) 
            VALUES (?, ?, ?, ?)`,
            [userData.macAddress, userData.deviceType, userData.osType, userData.browser]
        );
        
        return new User({
            ...userData,
            first_seen: new Date(),
            last_seen: new Date()
        });
    }

    async update() {
        return await database.execute(
            `UPDATE device_profiles 
            SET device_type = ?, os_type = ?, browser = ?, last_seen = NOW()
            WHERE mac_address = ?`,
            [this.deviceType, this.osType, this.browser, this.macAddress]
        );
    }

    async incrementSessions() {
        this.totalSessions++;
        return await database.execute(
            'UPDATE device_profiles SET total_sessions = total_sessions + 1 WHERE mac_address = ?',
            [this.macAddress]
        );
    }

    async incrementAdsWatched() {
        this.totalAdsWatched++;
        return await database.execute(
            'UPDATE device_profiles SET total_ads_watched = total_ads_watched + 1 WHERE mac_address = ?',
            [this.macAddress]
        );
    }

    static async getTopUsers(limit = 10) {
        const [rows] = await database.execute(
            `SELECT * FROM device_profiles 
            ORDER BY total_sessions DESC 
            LIMIT ?`,
            [limit]
        );
        
        return rows.map(row => new User(row));
    }

    toJSON() {
        return {
            macAddress: this.macAddress,
            deviceType: this.deviceType,
            osType: this.osType,
            browser: this.browser,
            firstSeen: this.firstSeen,
            lastSeen: this.lastSeen,
            totalSessions: this.totalSessions,
            totalAdsWatched: this.totalAdsWatched
        };
    }
}

module.exports = User;