const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const database = require('../database');
const radiusClient = require('../radius');
const deviceDetector = require('../utils/deviceDetector');
const { validateMAC } = require('../utils/macValidator');

class AuthController {
    // Request authentication - create session
    async requestAuth(req, res) {
        try {
            const { mac, ip, userAgent } = req.body;
            
            // Validate MAC address
            if (!mac || !validateMAC(mac)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid MAC address'
                });
            }
            
            // Check for existing active session
            const existingSession = await this.checkActiveSession(mac);
            if (existingSession) {
                return res.json({
                    success: true,
                    sessionId: existingSession.id,
                    message: 'Active session exists'
                });
            }
            
            // Detect device info
            const deviceInfo = deviceDetector.parse(userAgent);
            
            // Create new session
            const sessionId = uuidv4();
            const sessionData = {
                id: sessionId,
                mac_address: mac,
                ip_address: ip,
                device_type: deviceInfo.device,
                user_agent: userAgent,
                status: 'pending',
                created_at: new Date()
            };
            
            // Store session in database
            await database.execute(
                `INSERT INTO user_sessions 
                (id, mac_address, ip_address, device_type, user_agent, status) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [sessionId, mac, ip, deviceInfo.device, userAgent, 'pending']
            );
            
            // Store in Redis for quick access
            await this.storeSessionInRedis(sessionId, sessionData);
            
            // Update device profile
            await this.updateDeviceProfile(mac, deviceInfo);
            
            logger.info(`New session created: ${sessionId} for MAC: ${mac}`);
            
            res.json({
                success: true,
                sessionId: sessionId,
                message: 'Session created successfully'
            });
            
        } catch (error) {
            logger.error('Error in requestAuth:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create session'
            });
        }
    }
    
    // Complete authentication after ad
    async completeAuth(req, res) {
        try {
            const { sessionId, adId, watchedDuration, completed } = req.body;
            
            if (!sessionId || !completed) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request'
                });
            }
            
            // Get session from Redis
            const session = await this.getSessionFromRedis(sessionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }
            
            // Verify ad was watched sufficiently
            if (watchedDuration < (config.wifi.adDurationSeconds * 0.8)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please watch the complete ad'
                });
            }
            
            // Update ad impression
            await database.execute(
                `UPDATE ad_impressions 
                SET watched_duration_seconds = ?, completed = ?, updated_at = NOW()
                WHERE session_id = ? AND ad_id = ?`,
                [watchedDuration, completed, sessionId, adId]
            );
            
            // Create RADIUS user
            const username = session.mac_address.replace(/:/g, '');
            const password = this.generatePassword();
            
            // Add user to RADIUS
            await this.addRadiusUser(username, password);
            
            // Update session status
            await database.execute(
                `UPDATE user_sessions 
                SET status = 'active', session_start = NOW() 
                WHERE id = ?`,
                [sessionId]
            );
            
            // Update Redis session
            session.status = 'active';
            session.username = username;
            session.password = password;
            session.authenticated_at = new Date();
            await this.storeSessionInRedis(sessionId, session);
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    sessionId, 
                    mac: session.mac_address,
                    username 
                },
                config.jwt.secret,
                { expiresIn: config.jwt.expiresIn }
            );
            
            // Send CoA to MikroTik to allow user
            await this.sendCoARequest(session.mac_address, session.ip_address);
            
            logger.info(`Authentication completed for session: ${sessionId}`);
            
            res.json({
                success: true,
                token: token,
                username: username,
                password: password,
                message: 'Authentication successful'
            });
            
        } catch (error) {
            logger.error('Error in completeAuth:', error);
            res.status(500).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    }
    
    // Check session status
    async checkStatus(req, res) {
        try {
            const { sessionId } = req.params;
            
            const session = await this.getSessionFromRedis(sessionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }
            
            // Check if session is still active
            if (session.status === 'active') {
                const elapsedTime = Date.now() - new Date(session.authenticated_at).getTime();
                const remainingTime = (config.wifi.sessionDurationMinutes * 60 * 1000) - elapsedTime;
                
                if (remainingTime <= 0) {
                    // Session expired
                    await this.expireSession(sessionId);
                    return res.json({
                        success: true,
                        status: 'expired',
                        message: 'Session has expired'
                    });
                }
                
                return res.json({
                    success: true,
                    status: 'active',
                    remainingTime: Math.ceil(remainingTime / 1000),
                    message: 'Session is active'
                });
            }
            
            res.json({
                success: true,
                status: session.status,
                message: `Session status: ${session.status}`
            });
            
        } catch (error) {
            logger.error('Error in checkStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check status'
            });
        }
    }
    
    // Disconnect user
    async disconnect(req, res) {
        try {
            const { sessionId } = req.body;
            
            const session = await this.getSessionFromRedis(sessionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }
            
            // Send disconnect request to RADIUS
            await this.sendDisconnectRequest(session.mac_address);
            
            // Update session status
            await this.expireSession(sessionId);
            
            logger.info(`User disconnected: ${sessionId}`);
            
            res.json({
                success: true,
                message: 'Disconnected successfully'
            });
            
        } catch (error) {
            logger.error('Error in disconnect:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to disconnect'
            });
        }
    }
    
    // Helper methods
    async checkActiveSession(macAddress) {
        const [rows] = await database.execute(
            `SELECT * FROM user_sessions 
            WHERE mac_address = ? AND status = 'active' 
            AND session_start > DATE_SUB(NOW(), INTERVAL ? MINUTE)
            ORDER BY session_start DESC LIMIT 1`,
            [macAddress, config.wifi.sessionDurationMinutes]
        );
        
        return rows[0] || null;
    }
    
    async storeSessionInRedis(sessionId, data) {
        const redis = require('../redis');
        const key = `session:${sessionId}`;
        const macKey = `mac:${data.mac_address}`;
        
        await redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
        await redis.setex(macKey, 3600, sessionId); // Map MAC to session
    }
    
    async getSessionFromRedis(sessionId) {
        const redis = require('../redis');
        const key = `session:${sessionId}`;
        const data = await redis.get(key);
        
        return data ? JSON.parse(data) : null;
    }
    
    async updateDeviceProfile(macAddress, deviceInfo) {
        await database.execute(
            `INSERT INTO device_profiles 
            (mac_address, device_type, os_type, browser, total_sessions) 
            VALUES (?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
            device_type = VALUES(device_type),
            os_type = VALUES(os_type),
            browser = VALUES(browser),
            last_seen = NOW(),
            total_sessions = total_sessions + 1`,
            [macAddress, deviceInfo.device, deviceInfo.os, deviceInfo.browser]
        );
    }
    
    async addRadiusUser(username, password) {
        // Add user to radcheck table
        await database.execute(
            `INSERT INTO radcheck (username, attribute, op, value) VALUES
            (?, 'Cleartext-Password', ':=', ?),
            (?, 'Simultaneous-Use', ':=', '1')
            ON DUPLICATE KEY UPDATE value = VALUES(value)`,
            [username, password, username]
        );
        
        // Add user to radreply table for session timeout
        await database.execute(
            `INSERT INTO radreply (username, attribute, op, value) VALUES
            (?, 'Session-Timeout', ':=', ?),
            (?, 'Idle-Timeout', ':=', '300')
            ON DUPLICATE KEY UPDATE value = VALUES(value)`,
            [username, config.wifi.sessionDurationMinutes * 60, username]
        );
    }
    
    generatePassword() {
        return Math.random().toString(36).substring(2, 15);
    }
    
    async sendCoARequest(macAddress, ipAddress) {
        // Send Change of Authorization to MikroTik
        // This would integrate with MikroTik API
        try {
            await radiusClient.sendCoA({
                'User-Name': macAddress.replace(/:/g, ''),
                'Framed-IP-Address': ipAddress,
                'Session-Timeout': config.wifi.sessionDurationMinutes * 60
            });
        } catch (error) {
            logger.error('CoA request failed:', error);
        }
    }
    
    async sendDisconnectRequest(macAddress) {
        try {
            await radiusClient.sendDisconnect({
                'User-Name': macAddress.replace(/:/g, '')
            });
        } catch (error) {
            logger.error('Disconnect request failed:', error);
        }
    }
    
    async expireSession(sessionId) {
        await database.execute(
            `UPDATE user_sessions 
            SET status = 'expired', session_end = NOW() 
            WHERE id = ?`,
            [sessionId]
        );
        
        const redis = require('../redis');
        await redis.del(`session:${sessionId}`);
    }
}

module.exports = new AuthController();