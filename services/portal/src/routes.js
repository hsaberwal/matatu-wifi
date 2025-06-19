const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController');
const adController = require('./controllers/adController');
const statsController = require('./controllers/statsController');
const { authenticate, rateLimiter } = require('./middleware');

// Apply rate limiting to all routes
router.use(rateLimiter);

// Authentication routes
router.post('/auth/request', authController.requestAuth.bind(authController));
router.post('/auth/complete', authController.completeAuth.bind(authController));
router.get('/auth/status/:sessionId', authController.checkStatus.bind(authController));
router.post('/auth/disconnect', authenticate, authController.disconnect.bind(authController));

// Ad routes
router.get('/ads/next', adController.getNextAd.bind(adController));
router.post('/ads/impression', adController.trackImpression.bind(adController));
router.get('/ads/list', authenticate, adController.listAds.bind(adController));

// Statistics routes (protected)
router.get('/stats/overview', authenticate, statsController.getOverview.bind(statsController));
router.get('/stats/sessions', authenticate, statsController.getSessions.bind(statsController));
router.get('/stats/ads', authenticate, statsController.getAdStats.bind(statsController));
router.get('/stats/devices', authenticate, statsController.getDeviceStats.bind(statsController));

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'portal-api' });
});

module.exports = router;