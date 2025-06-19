const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');

// JWT Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('JWT verification failed:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Rate limiting
const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Error handler
const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error:', err);

    // Don't leak error details in production
    const message = config.env === 'production' 
        ? 'Internal server error' 
        : err.message;

    res.status(err.status || 500).json({
        success: false,
        message: message,
        ...(config.env !== 'production' && { stack: err.stack })
    });
};

// Not found handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found'
    });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    
    next();
};

// CORS headers for captive portal
const captivePortalHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

// Validate request body
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details
            });
        }
        next();
    };
};

// Session validation
const validateSession = async (req, res, next) => {
    const sessionId = req.params.sessionId || req.body.sessionId || req.query.session;
    
    if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: 'Session ID required'
        });
    }
    
    req.sessionId = sessionId;
    next();
};

module.exports = {
    authenticate,
    rateLimiter,
    errorHandler,
    notFoundHandler,
    requestLogger,
    captivePortalHeaders,
    validateBody,
    validateSession
};