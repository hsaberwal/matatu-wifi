// Matatu WiFi Portal - Main JavaScript

// Global variables
let sessionId = null;
let countdownInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Matatu WiFi Portal loaded');
    
    // Check if we're on a specific page
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index') {
        initializePortalPage();
    } else if (path === '/success') {
        initializeSuccessPage();
    } else if (path === '/ad') {
        // Ad page has its own script
    }
    
    // Check for URL parameters
    checkUrlParameters();
});

// Initialize portal landing page
function initializePortalPage() {
    // Check for expired or disconnected status
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
        showNotification('Your session has expired. Please watch another ad to continue.', 'warning');
    } else if (urlParams.get('disconnected') === 'true') {
        showNotification('You have been disconnected.', 'info');
    }
    
    // Auto-detect captive portal environment
    detectCaptivePortal();
}

// Initialize success page
function initializeSuccessPage() {
    // Success page countdown is handled inline
    // Add any additional success page logic here
}

// Check URL parameters from MikroTik
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Common MikroTik parameters
    const mac = urlParams.get('mac');
    const ip = urlParams.get('ip');
    const username = urlParams.get('username');
    const linkLogin = urlParams.get('link-login');
    const linkOrig = urlParams.get('link-orig');
    const error = urlParams.get('error');
    
    if (error) {
        console.error('MikroTik error:', error);
        showNotification('Connection error: ' + error, 'error');
    }
    
    // Store MikroTik parameters if available
    if (linkLogin) {
        sessionStorage.setItem('mikrotik_link_login', linkLogin);
    }
    if (linkOrig) {
        sessionStorage.setItem('mikrotik_link_orig', linkOrig);
    }
}

// Detect captive portal environment
function detectCaptivePortal() {
    // Check if we're in a captive portal by trying to fetch a known endpoint
    fetch('/generate_204', { mode: 'no-cors' })
        .then(() => {
            console.log('Captive portal detected');
        })
        .catch(error => {
            console.log('Captive portal detection failed:', error);
        });
}

// Show notification message
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set message and type
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Format time for display
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Handle connection errors
function handleConnectionError(error) {
    console.error('Connection error:', error);
    showNotification('Connection failed. Please try again.', 'error');
}

// Validate MAC address format
function isValidMAC(mac) {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
}

// Get device information
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
}

// Make API request with error handling
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Session management functions
async function checkSessionStatus(sessionId) {
    try {
        const data = await apiRequest(`/api/auth/status/${sessionId}`);
        return data;
    } catch (error) {
        console.error('Failed to check session status:', error);
        return null;
    }
}

async function disconnectSession(sessionId) {
    try {
        const data = await apiRequest('/api/auth/disconnect', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
        return data;
    } catch (error) {
        console.error('Failed to disconnect session:', error);
        return null;
    }
}

// Start connection flow
async function startConnection() {
    const button = document.querySelector('.btn-connect');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    if (!button || !loading) {
        console.error('Required elements not found');
        return;
    }
    
    // Reset error
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
    
    // Show loading
    button.style.display = 'none';
    loading.classList.add('active');
    
    try {
        // Get device info from page
        const deviceInfo = {
            mac: document.querySelector('meta[name="mac-address"]')?.content || '',
            ip: document.querySelector('meta[name="ip-address"]')?.content || '',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        // Request authentication
        const response = await fetch('/api/auth/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceInfo)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store session ID
            sessionStorage.setItem('sessionId', data.sessionId);
            
            // Redirect to ad page
            window.location.href = `/ad?session=${data.sessionId}`;
        } else {
            throw new Error(data.message || 'Connection failed');
        }
    } catch (error) {
        console.error('Connection error:', error);
        
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to connect. Please try again.';
            errorDiv.style.display = 'block';
        }
        
        button.style.display = 'block';
        loading.classList.remove('active');
    }
}

// Add notification styles dynamically
const notificationStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 9999;
    max-width: 350px;
}

.notification.show {
    transform: translateX(0);
}

.notification.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.notification.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.notification.warning {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.notification.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}
</style>
`;

// Add styles to head
document.head.insertAdjacentHTML('beforeend', notificationStyles);

// Export functions for use in other scripts
window.MatutuWiFi = {
    showNotification,
    formatTime,
    handleConnectionError,
    isValidMAC,
    getDeviceInfo,
    apiRequest,
    checkSessionStatus,
    disconnectSession,
    startConnection
};