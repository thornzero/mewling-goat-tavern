"use strict";
/**
 * Mobile Detection and Responsive Utilities
 * Device detection, viewport management, and mobile-specific features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefersDarkMode = exports.prefersReducedMotion = exports.hapticFeedback = exports.getBreakpoint = exports.isLandscape = exports.isTouchDevice = exports.isDesktop = exports.isTablet = exports.isMobile = exports.getDeviceInfo = exports.MobileUtils = void 0;
class MobileUtils {
    /**
     * Get comprehensive device information
     */
    static getDeviceInfo() {
        if (this.deviceInfo) {
            return this.deviceInfo;
        }
        const userAgent = navigator.userAgent.toLowerCase();
        const viewport = this.getViewportInfo();
        this.deviceInfo = {
            type: this.getDeviceType(),
            os: this.getOperatingSystem(userAgent),
            browser: this.getBrowser(userAgent),
            isTouch: this.isTouchDevice(),
            isLandscape: viewport.width > viewport.height,
            isRetina: this.isRetinaDisplay(),
            viewport,
            capabilities: this.getCapabilities(),
            prefersReducedMotion: this.prefersReducedMotion()
        };
        return this.deviceInfo;
    }
    /**
     * Get device type based on screen size
     */
    static getDeviceType() {
        const width = window.innerWidth;
        if (width < 768)
            return 'mobile';
        if (width < 1024)
            return 'tablet';
        return 'desktop';
    }
    /**
     * Detect operating system
     */
    static getOperatingSystem(userAgent) {
        if (/iphone|ipad|ipod/.test(userAgent))
            return 'ios';
        if (/android/.test(userAgent))
            return 'android';
        if (/windows/.test(userAgent))
            return 'windows';
        if (/macintosh|mac os x/.test(userAgent))
            return 'macos';
        if (/linux/.test(userAgent))
            return 'linux';
        return 'unknown';
    }
    /**
     * Detect browser
     */
    static getBrowser(userAgent) {
        if (/chrome/.test(userAgent) && !/edge/.test(userAgent))
            return 'chrome';
        if (/firefox/.test(userAgent))
            return 'firefox';
        if (/safari/.test(userAgent) && !/chrome/.test(userAgent))
            return 'safari';
        if (/edge/.test(userAgent))
            return 'edge';
        return 'unknown';
    }
    /**
     * Check if device supports touch
     */
    static isTouchDevice() {
        return 'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0;
    }
    /**
     * Check if device is in landscape orientation
     */
    static isLandscape() {
        return window.innerWidth > window.innerHeight;
    }
    /**
     * Check if device has retina display
     */
    static isRetinaDisplay() {
        return window.devicePixelRatio > 1;
    }
    /**
     * Get viewport information
     */
    static getViewportInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            ratio: window.innerWidth / window.innerHeight
        };
    }
    /**
     * Get device capabilities
     */
    static getCapabilities() {
        return {
            haptic: 'vibrate' in navigator,
            geolocation: 'geolocation' in navigator,
            camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            notifications: 'Notification' in window
        };
    }
    /**
     * Add viewport change listener
     */
    static onViewportChange(callback) {
        this.listeners.add(callback);
        // Return cleanup function
        return () => {
            this.listeners.delete(callback);
        };
    }
    /**
     * Handle viewport changes
     */
    static handleViewportChange() {
        // Invalidate cached device info
        this.deviceInfo = null;
        // Notify listeners
        this.listeners.forEach(callback => callback());
    }
    /**
     * Initialize viewport monitoring
     */
    static init() {
        // Listen for resize events
        window.addEventListener('resize', this.handleViewportChange.bind(this));
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            // Delay to ensure viewport is updated
            setTimeout(this.handleViewportChange.bind(this), 100);
        });
        // Listen for device pixel ratio changes (e.g., zoom)
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(min-resolution: 2dppx)');
            mediaQuery.addEventListener('change', this.handleViewportChange.bind(this));
        }
    }
    /**
     * Get responsive breakpoint
     */
    static getBreakpoint() {
        const width = window.innerWidth;
        if (width < 480)
            return 'xs';
        if (width < 640)
            return 'sm';
        if (width < 768)
            return 'md';
        if (width < 1024)
            return 'lg';
        if (width < 1280)
            return 'xl';
        return '2xl';
    }
    /**
     * Check if current breakpoint matches
     */
    static isBreakpoint(breakpoint) {
        return this.getBreakpoint() === breakpoint;
    }
    /**
     * Check if device is mobile
     */
    static isMobile() {
        return this.getDeviceType() === 'mobile';
    }
    /**
     * Check if device is tablet
     */
    static isTablet() {
        return this.getDeviceType() === 'tablet';
    }
    /**
     * Check if device is desktop
     */
    static isDesktop() {
        return this.getDeviceType() === 'desktop';
    }
    /**
     * Get safe area insets for devices with notches
     */
    static getSafeAreaInsets() {
        const computedStyle = getComputedStyle(document.documentElement);
        return {
            top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
            right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
            bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
            left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0')
        };
    }
    /**
     * Apply safe area CSS variables
     */
    static applySafeAreaInsets() {
        const root = document.documentElement;
        const insets = this.getSafeAreaInsets();
        root.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
        root.style.setProperty('--safe-area-inset-right', `${insets.right}px`);
        root.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
        root.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
    }
    /**
     * Add haptic feedback if supported
     */
    static hapticFeedback(type = 'light') {
        if (!this.getDeviceInfo().capabilities.haptic)
            return;
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30]
        };
        navigator.vibrate(patterns[type]);
    }
    /**
     * Request notification permission
     */
    static async requestNotificationPermission() {
        if (!this.getDeviceInfo().capabilities.notifications)
            return false;
        if (Notification.permission === 'granted')
            return true;
        if (Notification.permission === 'denied')
            return false;
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    /**
     * Show notification
     */
    static showNotification(title, options) {
        if (!this.getDeviceInfo().capabilities.notifications)
            return;
        if (Notification.permission !== 'granted')
            return;
        new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options
        });
    }
    /**
     * Get optimal image size for current device
     */
    static getOptimalImageSize(baseSize) {
        const deviceInfo = this.getDeviceInfo();
        const pixelRatio = deviceInfo.isRetina ? 2 : 1;
        const scaleFactor = deviceInfo.type === 'mobile' ? 1 : 1.5;
        return Math.round(baseSize * pixelRatio * scaleFactor);
    }
    /**
     * Check if device prefers reduced motion
     */
    static prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    /**
     * Check if device prefers dark mode
     */
    static prefersDarkMode() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    /**
     * Get optimal font size for current device
     */
    static getOptimalFontSize(baseSize) {
        const deviceInfo = this.getDeviceInfo();
        const scaleFactor = deviceInfo.type === 'mobile' ? 1 : 1.2;
        return Math.round(baseSize * scaleFactor);
    }
    /**
     * Check if element is in viewport
     */
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth);
    }
    /**
     * Scroll element into view with mobile-optimized behavior
     */
    static scrollIntoView(element, options) {
        const deviceInfo = this.getDeviceInfo();
        const defaultOptions = {
            behavior: deviceInfo.prefersReducedMotion ? 'auto' : 'smooth',
            block: 'center',
            inline: 'nearest'
        };
        element.scrollIntoView({ ...defaultOptions, ...options });
    }
    /**
     * Add mobile-specific CSS classes to document
     */
    static addMobileClasses() {
        const deviceInfo = this.getDeviceInfo();
        const root = document.documentElement;
        // Device type classes
        root.classList.add(`device-${deviceInfo.type}`);
        // OS classes
        root.classList.add(`os-${deviceInfo.os}`);
        // Browser classes
        root.classList.add(`browser-${deviceInfo.browser}`);
        // Feature classes
        if (deviceInfo.isTouch)
            root.classList.add('touch-device');
        if (deviceInfo.isLandscape)
            root.classList.add('landscape');
        if (deviceInfo.isRetina)
            root.classList.add('retina');
        // Capability classes
        if (deviceInfo.capabilities.haptic)
            root.classList.add('haptic-support');
        if (deviceInfo.capabilities.notifications)
            root.classList.add('notification-support');
        // Preference classes
        if (this.prefersReducedMotion())
            root.classList.add('reduced-motion');
        if (this.prefersDarkMode())
            root.classList.add('dark-mode');
    }
    /**
     * Cleanup and destroy
     */
    static destroy() {
        window.removeEventListener('resize', this.handleViewportChange.bind(this));
        window.removeEventListener('orientationchange', this.handleViewportChange.bind(this));
        this.listeners.clear();
        this.deviceInfo = null;
    }
}
exports.MobileUtils = MobileUtils;
MobileUtils.deviceInfo = null;
MobileUtils.listeners = new Set();
// Initialize on module load
if (typeof window !== 'undefined') {
    MobileUtils.init();
    MobileUtils.addMobileClasses();
}
// Export convenience functions
exports.getDeviceInfo = MobileUtils.getDeviceInfo.bind(MobileUtils);
exports.isMobile = MobileUtils.isMobile.bind(MobileUtils);
exports.isTablet = MobileUtils.isTablet.bind(MobileUtils);
exports.isDesktop = MobileUtils.isDesktop.bind(MobileUtils);
exports.isTouchDevice = MobileUtils.isTouchDevice.bind(MobileUtils);
exports.isLandscape = MobileUtils.isLandscape.bind(MobileUtils);
exports.getBreakpoint = MobileUtils.getBreakpoint.bind(MobileUtils);
exports.hapticFeedback = MobileUtils.hapticFeedback.bind(MobileUtils);
exports.prefersReducedMotion = MobileUtils.prefersReducedMotion.bind(MobileUtils);
exports.prefersDarkMode = MobileUtils.prefersDarkMode.bind(MobileUtils);
