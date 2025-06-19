const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const config = require('./src/config');
const logger = require('./src/utils/logger');
const database = require('./src/database');
const routes = require('./src/routes');
const app = require('./src/app');
const { errorHandler, notFoundHandler } = require('./src/middleware');

// Initialize Express server
const server = express();

// Security middleware
server.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            mediaSrc: ["'self'", "blob:", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
server.use(cors({
    origin: config.cors.origins,
    credentials: true
}));

// Body parsing
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

// Logging
server.use(morgan('combined', { stream: logger.stream }));

// Session management
server.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.env === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 30 // 30 minutes
    }
}));

// Mount the portal app
server.use('/', app);

// API routes
server.use('/api', routes);

// Error handlers
server.use(notFoundHandler);
server.use(errorHandler);

// Database initialization
database.initialize()
    .then(() => {
        logger.info('Database initialized successfully');
        
        // Start server
        const PORT = config.server.port || 3000;
        server.listen(PORT, () => {
            logger.info(`Portal server running on port ${PORT}`);
        });
    })
    .catch(error => {
        logger.error('Failed to initialize database:', error);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await database.close();
    process.exit(0);
});

module.exports = server;