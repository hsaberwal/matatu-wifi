const database = require('../database');
const { v4: uuidv4 } = require('uuid');

class Session {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.macAddress = data.mac_address;
        this.ipAddress = data.ip_address;
        this.deviceType = data.device_type;
        this.userAgent = data.user_agent;
        this.sessionStart = data.session_start;
        this.sessionEnd = data.session_end;
        this.dataUsedMb = data.data_used_mb || 0;
        this.status = data.status || 'pending';
    }

    static async findById(id) {
        const [rows] = await database.execute(
            'SELECT * FROM user_sessions WHERE id = ?',
            [id]
        );
        
        return rows[0] ? new Session(rows[0]) : null;
    }

    static async findByMac(macAddress, status = null) {
        let query = 'SELECT * FROM user_sessions WHERE mac_address = ?';
        const params = [macAddress];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY session_start DESC';
        
        const [rows] = await database.execute(query, params);
        return rows.map(row => new Session(row));
    }

    static async findActive(macAddress) {
        const [rows] = await database.execute(
            `SELECT * FROM user_sessions 
            WHERE mac_address = ? 
            AND status = 'active' 
            AND session_start > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
            ORDER BY session_start DESC 
            LIMIT 1`,
            [macAddress]
        );
        
        return rows[0] ? new Session(rows[0]) : null;
    }

    async save() {
        if (await Session.findById(this.id)) {
            return this.update();
        } else {
            return this.create();
        }
    }

    async create() {
        const result = await database.execute(
            `INSERT INTO user_sessions 
            (id, mac_address, ip_address, device_type, user_agent, session_start, status) 
            VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
            [this.id, this.macAddress, this.ipAddress, this.deviceType, this.userAgent, this.status]
        );
        
        this.sessionStart = new Date();
        return result;
    }

    async update() {
        return await database.execute(
            `UPDATE user_sessions 
            SET status = ?, session_end = ?, data_used_mb = ?
            WHERE id = ?`,
            [this.status, this.sessionEnd, this.dataUsedMb, this.id]
        );
    }

    async activate() {
        this.status = 'active';
        this.sessionStart = new Date();
        
        return await database.execute(
            `UPDATE user_sessions 
            SET status = 'active', session_start = NOW()
            WHERE id = ?`,
            [this.id]
        );
    }

    async expire() {
        this.status = 'expired';
        this.sessionEnd = new Date();
        
        return await database.execute(
            `UPDATE user_sessions 
            SET status = 'expired', session_end = NOW()
            WHERE id = ?`,
            [this.id]
        );
    }

    async terminate() {
        this.status = 'terminated';
        this.sessionEnd = new Date();
        
        return await database.execute(
            `UPDATE user_sessions 
            SET status = 'terminated', session_end = NOW()
            WHERE id = ?`,
            [this.id]
        );
    }

    async updateDataUsage(megabytes) {
        this.dataUsedMb += megabytes;
        
        return await database.execute(
            `UPDATE user_sessions 
            SET data_used_mb = data_used_mb + ?
            WHERE id = ?`,
            [megabytes, this.id]
        );
    }

    isActive() {
        if (this.status !== 'active') return false;
        
        const now = new Date();
        const sessionStart = new Date(this.sessionStart);
        const elapsed = (now - sessionStart) / 1000 / 60; // minutes
        
        return elapsed < 15; // 15-minute sessions
    }

    getRemainingTime() {
        if (!this.isActive()) return 0;
        
        const now = new Date();
        const sessionStart = new Date(this.sessionStart);
        const elapsed = (now - sessionStart) / 1000; // seconds
        const remaining = (15 * 60) - elapsed; // 15 minutes in seconds
        
        return Math.max(0, Math.round(remaining));
    }

    static async getActiveSessions() {
        const [rows] = await database.execute(
            `SELECT * FROM user_sessions 
            WHERE status = 'active' 
            AND session_start > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
            ORDER BY session_start DESC`
        );
        
        return rows.map(row => new Session(row));
    }

    static async expireOldSessions() {
        return await database.execute(
            `UPDATE user_sessions 
            SET status = 'expired', session_end = NOW()
            WHERE status = 'active' 
            AND session_start <= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
        );
    }

    toJSON() {
        return {
            id: this.id,
            macAddress: this.macAddress,
            ipAddress: this.ipAddress,
            deviceType: this.deviceType,
            userAgent: this.userAgent,
            sessionStart: this.sessionStart,
            sessionEnd: this.sessionEnd,
            dataUsedMb: this.dataUsedMb,
            status: this.status,
            isActive: this.isActive(),
            remainingTime: this.getRemainingTime()
        };
    }
}

module.exports = Session;