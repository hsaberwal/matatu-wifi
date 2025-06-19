const UAParser = require('ua-parser-js');

class DeviceDetector {
    constructor() {
        this.parser = new UAParser();
    }

    /**
     * Parse user agent string to extract device information
     * @param {string} userAgent - User agent string
     * @returns {object} - Device information
     */
    parse(userAgent) {
        this.parser.setUA(userAgent);
        const result = this.parser.getResult();

        return {
            device: this.getDeviceType(result),
            os: result.os.name || 'Unknown',
            osVersion: result.os.version || '',
            browser: result.browser.name || 'Unknown',
            browserVersion: result.browser.version || '',
            manufacturer: result.device.vendor || '',
            model: result.device.model || '',
            type: result.device.type || 'desktop',
            raw: {
                ua: userAgent,
                browser: result.browser,
                engine: result.engine,
                os: result.os,
                device: result.device,
                cpu: result.cpu
            }
        };
    }

    /**
     * Determine device type from parsed result
     * @param {object} result - Parsed UA result
     * @returns {string} - Device type
     */
    getDeviceType(result) {
        if (result.device.type) {
            switch (result.device.type) {
                case 'mobile':
                    return 'Mobile Phone';
                case 'tablet':
                    return 'Tablet';
                case 'smarttv':
                    return 'Smart TV';
                case 'wearable':
                    return 'Wearable';
                case 'console':
                    return 'Game Console';
                default:
                    return result.device.type;
            }
        }

        // Fallback detection based on OS
        const os = result.os.name?.toLowerCase() || '';
        if (os.includes('android') || os.includes('ios')) {
            return 'Mobile Device';
        }
        
        return 'Desktop/Laptop';
    }

    /**
     * Check if device is mobile
     * @param {string} userAgent - User agent string
     * @returns {boolean} - True if mobile device
     */
    isMobile(userAgent) {
        this.parser.setUA(userAgent);
        const result = this.parser.getResult();
        return result.device.type === 'mobile' || result.device.type === 'tablet';
    }

    /**
     * Get device category for analytics
     * @param {string} userAgent - User agent string
     * @returns {string} - Device category
     */
    getCategory(userAgent) {
        const info = this.parse(userAgent);
        
        if (info.type === 'mobile' || info.type === 'tablet') {
            return 'mobile';
        } else if (info.type === 'smarttv') {
            return 'tv';
        } else if (info.type === 'wearable') {
            return 'wearable';
        } else {
            return 'desktop';
        }
    }

    /**
     * Get simplified OS name for grouping
     * @param {string} osName - Full OS name
     * @returns {string} - Simplified OS name
     */
    getSimplifiedOS(osName) {
        if (!osName) return 'Other';
        
        const lower = osName.toLowerCase();
        
        if (lower.includes('windows')) return 'Windows';
        if (lower.includes('mac') || lower.includes('ios')) return 'Apple';
        if (lower.includes('android')) return 'Android';
        if (lower.includes('linux')) return 'Linux';
        
        return 'Other';
    }

    /**
     * Format device info for display
     * @param {object} deviceInfo - Device information object
     * @returns {string} - Formatted device string
     */
    formatDevice(deviceInfo) {
        let parts = [];
        
        if (deviceInfo.manufacturer) {
            parts.push(deviceInfo.manufacturer);
        }
        
        if (deviceInfo.model) {
            parts.push(deviceInfo.model);
        } else {
            parts.push(deviceInfo.device);
        }
        
        if (deviceInfo.os) {
            parts.push(`(${deviceInfo.os}${deviceInfo.osVersion ? ' ' + deviceInfo.osVersion : ''})`);
        }
        
        return parts.join(' ');
    }
}

module.exports = new DeviceDetector();