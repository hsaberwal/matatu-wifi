const mysql = require('mysql2/promise');
const config = require('./config');
const logger = require('./utils/logger');

class Database {
    constructor() {
        this.pool = null;
    }

    async initialize() {
        try {
            this.pool = mysql.createPool({
                host: config.database.host,
                port: config.database.port,
                user: config.database.user,
                password: config.database.password,
                database: config.database.database,
                waitForConnections: config.database.waitForConnections,
                connectionLimit: config.database.connectionLimit,
                queueLimit: config.database.queueLimit,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });

            // Test the connection
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            logger.info('Database connection pool initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize database:', error);
            throw error;
        }
    }

    async execute(query, params = []) {
        try {
            const [results] = await this.pool.execute(query, params);
            return results;
        } catch (error) {
            logger.error('Database query error:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [results] = await this.pool.query(sql, params);
            return results;
        } catch (error) {
            logger.error('Database query error:', error);
            throw error;
        }
    }

    async getConnection() {
        return await this.pool.getConnection();
    }

    async transaction(callback) {
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            logger.info('Database connection pool closed');
        }
    }
}

module.exports = new Database();