"use strict";
/**
 * Touch Interaction Handler
 * Enhanced touch support for mobile devices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hapticFeedback = exports.isLandscape = exports.getDeviceType = exports.isTouchDevice = exports.createLongPressHandler = exports.createTapHandler = exports.createSwipeHandler = exports.TouchUtils = exports.TouchHandler = void 0;
class TouchHandler {
    constructor(element, options = {}) {
        this.callbacks = new Map();
        // Touch state
        this.startTime = 0;
        this.startPosition = { x: 0, y: 0 };
        this.lastPosition = { x: 0, y: 0 };
        this.touchCount = 0;
        this.longPressTimer = null;
        this.isLongPress = false;
        this.element = element;
        this.options = {
            swipeThreshold: 50,
            longPressDelay: 500,
            tapThreshold: 10,
            velocityThreshold: 0.3,
            preventDefault: true,
            stopPropagation: false,
            ...options
        };
        this.setupEventListeners();
    }
    setupEventListeners() {
        // Touch events
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
        // Mouse events for desktop compatibility
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.element.addEventListener('click', this.handleClick.bind(this));
    }
    handleTouchStart(event) {
        if (this.options.preventDefault) {
            event.preventDefault();
        }
        if (this.options.stopPropagation) {
            event.stopPropagation();
        }
        const touch = event.touches[0];
        this.touchCount = event.touches.length;
        this.startTime = Date.now();
        this.startPosition = { x: touch.clientX, y: touch.clientY };
        this.lastPosition = { x: touch.clientX, y: touch.clientY };
        this.isLongPress = false;
        // Start long press timer
        this.longPressTimer = window.setTimeout(() => {
            this.isLongPress = true;
            this.triggerGesture({
                type: 'longpress',
                center: this.startPosition,
                duration: this.options.longPressDelay
            });
        }, this.options.longPressDelay);
    }
    handleTouchMove(event) {
        if (this.options.preventDefault) {
            event.preventDefault();
        }
        if (this.options.stopPropagation) {
            event.stopPropagation();
        }
        if (event.touches.length === 0)
            return;
        const touch = event.touches[0];
        this.lastPosition = { x: touch.clientX, y: touch.clientY };
        // Cancel long press if moved too much
        if (this.longPressTimer && this.getDistance(this.startPosition, this.lastPosition) > this.options.tapThreshold) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        // Handle multi-touch gestures
        if (event.touches.length === 2) {
            this.handlePinch(event);
        }
        else if (event.touches.length === 1) {
            this.handlePan(event);
        }
    }
    handleTouchEnd(event) {
        if (this.options.preventDefault) {
            event.preventDefault();
        }
        if (this.options.stopPropagation) {
            event.stopPropagation();
        }
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        const duration = Date.now() - this.startTime;
        const distance = this.getDistance(this.startPosition, this.lastPosition);
        const velocity = this.getVelocity(distance, duration);
        // Determine gesture type
        if (this.isLongPress) {
            // Long press already handled
            return;
        }
        else if (distance > this.options.swipeThreshold) {
            // Swipe gesture
            const direction = this.getSwipeDirection(this.startPosition, this.lastPosition);
            this.triggerGesture({
                type: 'swipe',
                direction,
                distance,
                duration,
                velocity,
                center: this.getCenter(this.startPosition, this.lastPosition)
            });
        }
        else if (distance < this.options.tapThreshold && duration < 300) {
            // Tap gesture
            this.triggerGesture({
                type: 'tap',
                center: this.startPosition,
                duration
            });
        }
    }
    handleTouchCancel(event) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    handleMouseDown(event) {
        this.startTime = Date.now();
        this.startPosition = { x: event.clientX, y: event.clientY };
        this.lastPosition = { x: event.clientX, y: event.clientY };
        this.isLongPress = false;
        // Start long press timer for mouse
        this.longPressTimer = window.setTimeout(() => {
            this.isLongPress = true;
            this.triggerGesture({
                type: 'longpress',
                center: this.startPosition,
                duration: this.options.longPressDelay
            });
        }, this.options.longPressDelay);
    }
    handleMouseMove(event) {
        this.lastPosition = { x: event.clientX, y: event.clientY };
        // Cancel long press if moved too much
        if (this.longPressTimer && this.getDistance(this.startPosition, this.lastPosition) > this.options.tapThreshold) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    handleMouseUp(event) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        const duration = Date.now() - this.startTime;
        const distance = this.getDistance(this.startPosition, this.lastPosition);
        if (!this.isLongPress && distance < this.options.tapThreshold && duration < 300) {
            this.triggerGesture({
                type: 'tap',
                center: this.startPosition,
                duration
            });
        }
    }
    handleClick(event) {
        // Prevent double-tap on mobile
        if (this.isLongPress) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
    handlePinch(event) {
        if (event.touches.length !== 2)
            return;
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const distance = this.getDistance({ x: touch1.clientX, y: touch1.clientY }, { x: touch2.clientX, y: touch2.clientY });
        const center = this.getCenter({ x: touch1.clientX, y: touch1.clientY }, { x: touch2.clientX, y: touch2.clientY });
        this.triggerGesture({
            type: 'pinch',
            center,
            distance
        });
    }
    handlePan(event) {
        if (event.touches.length !== 1)
            return;
        const touch = event.touches[0];
        const currentPosition = { x: touch.clientX, y: touch.clientY };
        const distance = this.getDistance(this.startPosition, currentPosition);
        const duration = Date.now() - this.startTime;
        const velocity = this.getVelocity(distance, duration);
        this.triggerGesture({
            type: 'pan',
            distance,
            duration,
            velocity,
            center: currentPosition
        });
    }
    getDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    getVelocity(distance, duration) {
        return duration > 0 ? distance / duration : 0;
    }
    getSwipeDirection(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx > absDy) {
            return dx > 0 ? 'right' : 'left';
        }
        else {
            return dy > 0 ? 'down' : 'up';
        }
    }
    getCenter(point1, point2) {
        return {
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2
        };
    }
    triggerGesture(gesture) {
        const callback = this.callbacks.get(gesture.type);
        if (callback) {
            callback(gesture);
        }
    }
    // Public API
    on(gestureType, callback) {
        this.callbacks.set(gestureType, callback);
    }
    off(gestureType) {
        this.callbacks.delete(gestureType);
    }
    destroy() {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchCancel);
        this.element.removeEventListener('mousedown', this.handleMouseDown);
        this.element.removeEventListener('mousemove', this.handleMouseMove);
        this.element.removeEventListener('mouseup', this.handleMouseUp);
        this.element.removeEventListener('click', this.handleClick);
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }
}
exports.TouchHandler = TouchHandler;
// Utility functions for common touch interactions
class TouchUtils {
    /**
     * Create a swipe handler for carousel navigation
     */
    static createSwipeHandler(element, onSwipeLeft, onSwipeRight, options) {
        const handler = new TouchHandler(element, options);
        handler.on('swipe', (gesture) => {
            if (gesture.direction === 'left') {
                onSwipeLeft();
            }
            else if (gesture.direction === 'right') {
                onSwipeRight();
            }
        });
        return handler;
    }
    /**
     * Create a tap handler for button-like elements
     */
    static createTapHandler(element, onTap, options) {
        const handler = new TouchHandler(element, options);
        handler.on('tap', onTap);
        return handler;
    }
    /**
     * Create a long press handler for context menus
     */
    static createLongPressHandler(element, onLongPress, options) {
        const handler = new TouchHandler(element, options);
        handler.on('longpress', onLongPress);
        return handler;
    }
    /**
     * Check if device supports touch
     */
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
     * Check if device is in landscape mode
     */
    static isLandscape() {
        return window.innerWidth > window.innerHeight;
    }
    /**
     * Add haptic feedback if supported
     */
    static hapticFeedback(type = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30]
            };
            navigator.vibrate(patterns[type]);
        }
    }
}
exports.TouchUtils = TouchUtils;
// Export convenience functions
exports.createSwipeHandler = TouchUtils.createSwipeHandler;
exports.createTapHandler = TouchUtils.createTapHandler;
exports.createLongPressHandler = TouchUtils.createLongPressHandler;
exports.isTouchDevice = TouchUtils.isTouchDevice;
exports.getDeviceType = TouchUtils.getDeviceType;
exports.isLandscape = TouchUtils.isLandscape;
exports.hapticFeedback = TouchUtils.hapticFeedback;
