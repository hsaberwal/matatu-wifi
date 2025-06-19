// MAC address validation and normalization utilities

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const MAC_REGEX_NO_DELIMITER = /^[0-9A-Fa-f]{12}$/;

/**
 * Validate MAC address format
 * @param {string} mac - MAC address to validate
 * @returns {boolean} - true if valid
 */
function validateMAC(mac) {
    if (!mac || typeof mac !== 'string') {
        return false;
    }
    
    // Check standard formats (with : or -)
    if (MAC_REGEX.test(mac)) {
        return true;
    }
    
    // Check format without delimiter
    if (MAC_REGEX_NO_DELIMITER.test(mac)) {
        return true;
    }
    
    return false;
}

/**
 * Normalize MAC address to standard format (lowercase with colons)
 * @param {string} mac - MAC address to normalize
 * @returns {string|null} - normalized MAC or null if invalid
 */
function normalizeMAC(mac) {
    if (!validateMAC(mac)) {
        return null;
    }
    
    // Remove all delimiters
    let normalized = mac.replace(/[:-]/g, '').toLowerCase();
    
    // Add colons every 2 characters
    normalized = normalized.match(/.{1,2}/g).join(':');
    
    return normalized;
}

/**
 * Compare two MAC addresses
 * @param {string} mac1 - First MAC address
 * @param {string} mac2 - Second MAC address
 * @returns {boolean} - true if they match
 */
function compareMAC(mac1, mac2) {
    const normalized1 = normalizeMAC(mac1);
    const normalized2 = normalizeMAC(mac2);
    
    if (!normalized1 || !normalized2) {
        return false;
    }
    
    return normalized1 === normalized2;
}

/**
 * Generate a random MAC address (for testing)
 * @returns {string} - Random MAC address
 */
function generateRandomMAC() {
    const hex = '0123456789abcdef';
    let mac = '';
    
    for (let i = 0; i < 6; i++) {
        if (i > 0) mac += ':';
        mac += hex.charAt(Math.floor(Math.random() * 16));
        mac += hex.charAt(Math.floor(Math.random() * 16));
    }
    
    return mac;
}

/**
 * Extract vendor OUI from MAC address
 * @param {string} mac - MAC address
 * @returns {string|null} - OUI (first 3 octets) or null
 */
function getOUI(mac) {
    const normalized = normalizeMAC(mac);
    if (!normalized) {
        return null;
    }
    
    return normalized.substring(0, 8).toUpperCase();
}

module.exports = {
    validateMAC,
    normalizeMAC,
    compareMAC,
    generateRandomMAC,
    getOUI
};