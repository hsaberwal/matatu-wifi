// Matatu WiFi Portal - Ad Player JavaScript

class AdPlayer {
    constructor(options) {
        this.videoElement = options.videoElement;
        this.progressBar = options.progressBar;
        this.countdown = options.countdown;
        this.skipButton = options.skipButton;
        this.onComplete = options.onComplete || function() {};
        
        this.adData = null;
        this.sessionId = null;
        this.startTime = null;
        this.minWatchPercentage = 80;
        this.isCompleted = false;
        this.watchedDuration = 0;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        if (!this.videoElement) return;
        
        // Video events
        this.videoElement.addEventListener('play', () => this.onPlay());
        this.videoElement.addEventListener('pause', () => this.onPause());
        this.videoElement.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.videoElement.addEventListener('ended', () => this.onEnded());
        this.videoElement.addEventListener('error', (e) => this.onError(e));
        
        // Skip button
        if (this.skipButton) {
            this.skipButton.addEventListener('click', () => this.completeAd());
        }
        
        // Prevent seeking
        let lastTime = 0;
        this.videoElement.addEventListener('timeupdate', () => {
            if (this.videoElement.currentTime < lastTime) {
                this.videoElement.currentTime = lastTime;
            }
            lastTime = this.videoElement.currentTime;
        });
    }
    
    async loadAd(sessionId) {
        this.sessionId = sessionId;
        
        try {
            const response = await fetch(`/api/ads/next?session=${sessionId}`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load ad');
            }
            
            this.adData = data.ad;
            this.minWatchPercentage = data.minWatchPercentage || 80;
            
            // Set video source
            this.videoElement.src = this.adData.videoUrl;
            this.videoElement.load();
            
            return true;
        } catch (error) {
            console.error('Error loading ad:', error);
            this.showError(error.message);
            return false;
        }
    }
    
    play() {
        return this.videoElement.play();
    }
    
    onPlay() {
        if (!this.startTime) {
            this.startTime = Date.now();
            this.trackImpression();
        }
        console.log('Ad playback started');
    }
    
    onPause() {
        console.log('Ad playback paused');
    }
    
    onTimeUpdate() {
        if (!this.videoElement.duration) return;
        
        const currentTime = this.videoElement.currentTime;
        const duration = this.videoElement.duration;
        const progress = (currentTime / duration) * 100;
        
        // Update progress bar
        if (this.progressBar) {
            this.progressBar.style.width = progress + '%';
        }
        
        // Update countdown
        if (this.countdown) {
            const remaining = Math.ceil(duration - currentTime);
            this.countdown.textContent = remaining;
        }
        
        // Track watched duration
        this.watchedDuration = currentTime;
        
        // Check if skip is allowed
        const watchedPercentage = (currentTime / duration) * 100;
        if (watchedPercentage >= this.minWatchPercentage && this.skipButton) {
            this.enableSkip();
        }
    }
    
    onEnded() {
        console.log('Ad playback ended');
        if (!this.isCompleted) {
            this.completeAd();
        }
    }
    
    onError(error) {
        console.error('Video playback error:', error);
        this.showError('Failed to play video. Please try again.');
    }
    
    enableSkip() {
        if (this.skipButton && !this.skipButton.classList.contains('enabled')) {
            this.skipButton.classList.add('enabled');
            const skipInfo = document.querySelector('.skip-info');
            if (skipInfo) {
                skipInfo.textContent = 'Ad complete!';
            }
        }
    }
    
    async trackImpression() {
        if (!this.adData || !this.sessionId) return;
        
        try {
            await fetch('/api/ads/impression', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    adId: this.adData.id,
                    startTime: this.startTime
                })
            });
        } catch (error) {
            console.error('Error tracking impression:', error);
        }
    }
    
    async completeAd() {
        if (this.isCompleted) return;
        
        const duration = this.videoElement.duration;
        const watchedPercentage = (this.watchedDuration / duration) * 100;
        
        if (watchedPercentage < this.minWatchPercentage) {
            alert(`Please watch at least ${this.minWatchPercentage}% of the ad to continue.`);
            return;
        }
        
        this.isCompleted = true;
        this.videoElement.pause();
        
        // Show completion message
        this.showMessage('Thank you for watching! Connecting to WiFi...');
        
        try {
            // Complete authentication
            const response = await fetch('/api/auth/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    adId: this.adData.id,
                    watchedDuration: this.watchedDuration,
                    completed: true
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Call completion callback
                this.onComplete(data);
                
                // Redirect to success page
                setTimeout(() => {
                    window.location.href = '/success';
                }, 2000);
            } else {
                throw new Error(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Error completing ad:', error);
            this.showError(error.message);
        }
    }
    
    showMessage(text) {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = text;
            messageEl.style.display = 'block';
        }
    }
    
    showError(text) {
        const errorContainer = document.getElementById('errorContainer');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorContainer && errorMessage) {
            errorMessage.textContent = text;
            errorContainer.style.display = 'block';
            document.getElementById('adContainer').style.display = 'none';
        }
    }
    
    // Utility methods
    getStats() {
        return {
            adId: this.adData?.id,
            sessionId: this.sessionId,
            watchedDuration: this.watchedDuration,
            watchedPercentage: this.videoElement.duration ? 
                (this.watchedDuration / this.videoElement.duration * 100).toFixed(2) : 0,
            completed: this.isCompleted
        };
    }
    
    destroy() {
        // Clean up event listeners
        this.videoElement.removeEventListener('play', this.onPlay);
        this.videoElement.removeEventListener('pause', this.onPause);
        this.videoElement.removeEventListener('timeupdate', this.onTimeUpdate);
        this.videoElement.removeEventListener('ended', this.onEnded);
        this.videoElement.removeEventListener('error', this.onError);
        
        // Reset state
        this.adData = null;
        this.sessionId = null;
        this.startTime = null;
        this.isCompleted = false;
        this.watchedDuration = 0;
    }
}

// Auto-initialize if on ad page
if (window.location.pathname === '/ad') {
    document.addEventListener('DOMContentLoaded', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        
        if (!sessionId) {
            window.location.href = '/';
            return;
        }
        
        // Initialize player
        const player = new AdPlayer({
            videoElement: document.getElementById('adVideo'),
            progressBar: document.getElementById('progressBar'),
            countdown: document.getElementById('countdown'),
            skipButton: document.getElementById('skipBtn'),
            onComplete: function(data) {
                console.log('Ad completed successfully', data);
            }
        });
        
        // Load and play ad
        player.loadAd(sessionId).then(success => {
            if (success) {
                // Auto-play with user gesture fallback
                player.play().catch(err => {
                    console.log('Autoplay prevented, showing play button');
                    player.videoElement.controls = true;
                });
            }
        });
        
        // Make player available globally for debugging
        window.adPlayer = player;
    });
}

// Export for use in other scripts
window.AdPlayer = AdPlayer;