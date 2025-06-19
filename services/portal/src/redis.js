const { createClient } = require('redis');
const config = require('./config');
const logger = require('./utils/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = createClient({
                socket: {
                    host: config.redis.host,
                    port: config.redis.port
                },
                password: config.redis.password || undefined
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis Client Connected');
                this.isConnected = true;
            });

            await this.client.connect();
            return this.client;
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    async get(key) {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error(`Redis GET error for key ${key}:`, error);
            throw error;
        }
    }

    async set(key, value, options = {}) {
        try {
            if (options.EX) {
                return await this.client.set(key, value, { EX: options.EX });
            }
            return await this.client.set(key, value);
        } catch (error) {
            logger.error(`Redis SET error for key ${key}:`, error);
            throw error;
        }
    }

    async setex(key, seconds, value) {
        try {
            return await this.client.setEx(key, seconds, value);
        } catch (error) {
            logger.error(`Redis SETEX error for key ${key}:`, error);
            throw error;
        }
    }

    async del(key) {
        try {
            return await this.client.del(key);
        } catch (error) {
            logger.error(`Redis DEL error for key ${key}:`, error);
            throw error;
        }
    }

    async exists(key) {
        try {
            return await this.client.exists(key);
        } catch (error) {
            logger.error(`Redis EXISTS error for key ${key}:`, error);
            throw error;
        }
    }

    async expire(key, seconds) {
        try {
            return await this.client.expire(key, seconds);
        } catch (error) {
            logger.error(`Redis EXPIRE error for key ${key}:`, error);
            throw error;
        }
    }

    async ttl(key) {
        try {
            return await this.client.ttl(key);
        } catch (error) {
            logger.error(`Redis TTL error for key ${key}:`, error);
            throw error;
        }
    }

    async hset(key, field, value) {
        try {
            return await this.client.hSet(key, field, value);
        } catch (error) {
            logger.error(`Redis HSET error for key ${key}:`, error);
            throw error;
        }
    }

    async hget(key, field) {
        try {
            return await this.client.hGet(key, field);
        } catch (error) {
            logger.error(`Redis HGET error for key ${key}:`, error);
            throw error;
        }
    }

    async hgetall(key) {
        try {
            return await this.client.hGetAll(key);
        } catch (error) {
            logger.error(`Redis HGETALL error for key ${key}:`, error);
            throw error;
        }
    }

    async quit() {
        try {
            await this.client.quit();
            this.isConnected = false;
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
            throw error;
        }
    }
}

// Create singleton instance
const redisClient = new RedisClient();

// Auto-connect on module load
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error('Failed to initialize Redis connection:', error);
    }
})();

module.exports = redisClient;