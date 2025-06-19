const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');

// Models
const User = require('./models/User');
const Session = require('./models/Session');
const AdImpression = require('./models/AdImpression');

// Initialize Express app
const app = express();

// View engine setup
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Portal routes (non-API)
app.get('/', async (req, res) => {
    try {
        // Extract MAC address from query params (MikroTik sends this)
        const macAddress = req.query.mac || 
                          req.headers['client-mac'] || 
                          req.query['client-mac'] || 
                          '';
        
        const ipAddress = req.query.ip || 
                         req.headers['client-ip'] || 
                         req.query['client-ip'] || 
                         req.ip;
        
        const userAgent = req.headers['user-agent'] || '';

        // Check for active session
        if (macAddress) {
            const activeSession = await Session.findActive(macAddress);
            if (activeSession && activeSession.isActive()) {
                return res.redirect('/success');
            }
        }

        res.render('index', {
            macAddress: macAddress,
            ipAddress: ipAddress,
            userAgent: userAgent
        });
    } catch (error) {
        logger.error('Error rendering index:', error);
        res.status(500).render('error', { 
            message: 'An error occurred. Please try again.' 
        });
    }
});

app.get('/ad', async (req, res) => {
    try {
        const sessionId = req.query.session;
        
        if (!sessionId) {
            return res.redirect('/');
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.redirect('/');
        }

        res.render('ad', {
            sessionId: sessionId
        });
    } catch (error) {
        logger.error('Error rendering ad page:', error);
        res.redirect('/');
    }
});

app.get('/success', async (req, res) => {
    try {
        const sessionId = req.query.session || req.session?.sessionId;
        let session = null;
        
        if (sessionId) {
            session = await Session.findById(sessionId);
        }

        res.render('success', {
            session: session,
            remainingTime: session ? session.getRemainingTime() : 0
        });
    } catch (error) {
        logger.error('Error rendering success page:', error);
        res.render('success', {
            session: null,
            remainingTime: 0
        });
    }
});

app.get('/error', (req, res) => {
    const message = req.query.message || 'An error occurred';
    res.render('error', { message });
});

// Terms and Privacy pages
app.get('/terms', (req, res) => {
    res.render('terms');
});

app.get('/privacy', (req, res) => {
    res.render('privacy');
});

// Captive portal detection endpoints
app.get('/generate_204', (req, res) => {
    res.status(204).end();
});

app.get('/hotspot-detect.html', (req, res) => {
    res.redirect('/');
});

app.get('/success.txt', (req, res) => {
    res.send('success');
});

// Apple captive portal detection
app.get('/library/test/success.html', (req, res) => {
    res.send('<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>');
});

// Microsoft connectivity test
app.get('/connecttest.txt', (req, res) => {
    res.send('Microsoft Connect Test');
});

app.get('/redirect', (req, res) => {
    res.redirect('/');
});

// Background tasks
function startBackgroundTasks() {
    // Expire old sessions every minute
    setInterval(async () => {
        try {
            const result = await Session.expireOldSessions();
            if (result.affectedRows > 0) {
                logger.info(`Expired ${result.affectedRows} sessions`);
            }
        } catch (error) {
            logger.error('Error expiring sessions:', error);
        }
    }, 60 * 1000); // Every minute

    // Clean up old impressions daily
    setInterval(async () => {
        try {
            const result = await AdImpression.cleanupOld(90); // Keep 90 days
            logger.info(`Cleaned up ${result.affectedRows} old ad impressions`);
        } catch (error) {
            logger.error('Error cleaning up impressions:', error);
        }
    }, 24 * 60 * 60 * 1000); // Daily
}

// Start background tasks
startBackgroundTasks();

module.exports = app;