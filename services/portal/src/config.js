module.exports = {
    env: process.env.NODE_ENV || 'development',
    
    server: {
        port: process.env.PORTAL_PORT || 3000,
        host: process.env.PORTAL_HOST || '0.0.0.0'
    },
    
    database: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'matatu_user',
        password: process.env.MYSQL_PASSWORD || 'password',
        database: process.env.MYSQL_DATABASE || 'matatu_wifi',
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0
    },
    
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null
    },
    
    radius: {
        server: process.env.RADIUS_HOST || 'freeradius',
        authPort: process.env.RADIUS_AUTH_PORT || 1812,
        acctPort: process.env.RADIUS_ACCT_PORT || 1813,
        secret: process.env.RADIUS_SECRET || 'testing123',
        nasIdentifier: process.env.RADIUS_NAS_IDENTIFIER || 'matatu-wifi-nas',
        timeout: 5000,
        retries: 3
    },
    
    session: {
        secret: process.env.SESSION_SECRET || 'your-session-secret',
        duration: parseInt(process.env.WIFI_SESSION_DURATION_MINUTES || '15') * 60 * 1000
    },
    
    wifi: {
        sessionDurationMinutes: parseInt(process.env.WIFI_SESSION_DURATION_MINUTES || '15'),
        bandwidthLimitMbps: parseInt(process.env.WIFI_BANDWIDTH_LIMIT_MBPS || '2'),
        adDurationSeconds: parseInt(process.env.AD_DURATION_SECONDS || '30')
    },
    
    ads: {
        serviceUrl: process.env.AD_SERVICE_URL || 'http://ad-service:5000',
        minWatchPercentage: 80, // User must watch 80% of ad
        rotationStrategy: 'weighted', // 'weighted', 'random', 'sequential'
        cacheTime: 300 // 5 minutes
    },
    
    cors: {
        origins: process.env.CORS_ORIGINS ? 
            process.env.CORS_ORIGINS.split(',') : 
            ['http://localhost:3000']
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/portal.log'
    },
    
    jwt: {
        secret: process.env.JWT_SECRET || 'your-jwt-secret',
        expiresIn: '1h'
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};