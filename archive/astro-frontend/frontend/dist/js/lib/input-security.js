"use strict";
/**
 * Input Security Utilities
 * Provides additional security measures for input handling and XSS prevention
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCSP = exports.escapeHtml = exports.sanitizeUrl = exports.sanitizeText = exports.sanitizeHtml = exports.inputSecurity = exports.InputSecurity = void 0;
class InputSecurity {
    static getInstance() {
        if (!InputSecurity.instance) {
            InputSecurity.instance = new InputSecurity();
        }
        return InputSecurity.instance;
    }
    constructor() {
        this.suspiciousPatterns = [];
        this.blockedPatterns = [];
        this.config = {
            maxLength: 1000,
            allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
            allowedAttributes: ['class', 'id'],
            allowedProtocols: ['http:', 'https:'],
            enableCSP: true,
            logSuspiciousActivity: true
        };
        this.initializeSecurityPatterns();
    }
    initializeSecurityPatterns() {
        // Suspicious patterns that might indicate XSS attempts
        this.suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=\s*["'][^"']*["']/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
            /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
            /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
            /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
            /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
            /expression\s*\(/gi,
            /url\s*\(/gi,
            /@import/gi,
            /vbscript:/gi,
            /data:/gi,
            /blob:/gi
        ];
        // Patterns that should be completely blocked
        this.blockedPatterns = [
            /<script/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /data:text\/html/gi,
            /data:application\/javascript/gi,
            /on\w+\s*=/gi
        ];
    }
    /**
     * Sanitize HTML content with security measures
     */
    sanitizeHtml(input) {
        if (typeof input !== 'string')
            return '';
        // Check for blocked patterns first
        if (this.isBlocked(input)) {
            this.logSuspiciousActivity('Blocked dangerous pattern detected', input);
            return '';
        }
        // Remove suspicious patterns
        let sanitized = input;
        for (const pattern of this.suspiciousPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }
        // Basic HTML sanitization
        sanitized = this.basicHtmlSanitization(sanitized);
        // Validate URLs
        sanitized = this.sanitizeUrls(sanitized);
        return sanitized;
    }
    /**
     * Escape HTML entities
     */
    escapeHtml(input) {
        if (typeof input !== 'string')
            return '';
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return input.replace(/[&<>"'`=\/]/g, (match) => htmlEscapes[match] || match);
    }
    /**
     * Sanitize text input for safe display
     */
    sanitizeText(input) {
        if (typeof input !== 'string')
            return '';
        // Check for blocked patterns
        if (this.isBlocked(input)) {
            this.logSuspiciousActivity('Blocked dangerous pattern in text input', input);
            return '';
        }
        // Remove HTML tags
        let sanitized = input.replace(/<[^>]*>/g, '');
        // Escape HTML entities
        sanitized = this.escapeHtml(sanitized);
        // Remove suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
            sanitized = sanitized.replace(pattern, '');
        }
        // Trim and limit length
        sanitized = sanitized.trim().substring(0, this.config.maxLength);
        return sanitized;
    }
    /**
     * Sanitize URL input
     */
    sanitizeUrl(input) {
        if (typeof input !== 'string')
            return '';
        try {
            const url = new URL(input);
            // Check if protocol is allowed
            if (!this.config.allowedProtocols.includes(url.protocol)) {
                this.logSuspiciousActivity('Blocked protocol in URL', input);
                return '';
            }
            // Basic URL validation
            if (url.hostname.includes('<') || url.hostname.includes('>')) {
                this.logSuspiciousActivity('Suspicious characters in URL hostname', input);
                return '';
            }
            return url.toString();
        }
        catch {
            // Invalid URL
            return '';
        }
    }
    /**
     * Validate and sanitize form data
     */
    sanitizeFormData(formData) {
        const sanitized = new Map();
        for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
                const sanitizedKey = this.sanitizeText(key);
                const sanitizedValue = this.sanitizeText(value);
                if (sanitizedKey && sanitizedValue) {
                    sanitized.set(sanitizedKey, sanitizedValue);
                }
            }
        }
        return sanitized;
    }
    /**
     * Check if input contains blocked patterns
     */
    isBlocked(input) {
        return this.blockedPatterns.some(pattern => pattern.test(input));
    }
    /**
     * Basic HTML sanitization
     */
    basicHtmlSanitization(input) {
        // Remove all tags except allowed ones
        const allowedTagsRegex = new RegExp(`<(?!/?(?:${this.config.allowedTags.join('|')})\\b)[^>]*>`, 'gi');
        let sanitized = input.replace(allowedTagsRegex, '');
        // Remove attributes except allowed ones
        const allowedAttrsRegex = new RegExp(`\\s(?!${this.config.allowedAttributes.join('|')}\\b)[a-zA-Z-]+\\s*=`, 'gi');
        sanitized = sanitized.replace(allowedAttrsRegex, ' ');
        return sanitized;
    }
    /**
     * Sanitize URLs in content
     */
    sanitizeUrls(input) {
        const urlRegex = /https?:\/\/[^\s<>"']+/gi;
        return input.replace(urlRegex, (url) => {
            const sanitized = this.sanitizeUrl(url);
            return sanitized || '';
        });
    }
    /**
     * Log suspicious activity
     */
    logSuspiciousActivity(message, input) {
        if (this.config.logSuspiciousActivity) {
            console.warn(`[SECURITY] ${message}:`, {
                input: input.substring(0, 100), // Log only first 100 chars
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
        }
    }
    /**
     * Generate Content Security Policy header
     */
    generateCSP() {
        if (!this.config.enableCSP)
            return '';
        const directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ];
        return directives.join('; ');
    }
    /**
     * Validate file upload
     */
    validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
        // Check file size
        if (file.size > maxSize) {
            this.logSuspiciousActivity('File too large', file.name);
            return false;
        }
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            this.logSuspiciousActivity('Invalid file type', file.name);
            return false;
        }
        // Check file name for suspicious patterns
        if (this.isBlocked(file.name)) {
            this.logSuspiciousActivity('Suspicious file name', file.name);
            return false;
        }
        return true;
    }
    /**
     * Update security configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current security configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.InputSecurity = InputSecurity;
// Export singleton instance
exports.inputSecurity = InputSecurity.getInstance();
// Export convenience functions
const sanitizeHtml = (input) => exports.inputSecurity.sanitizeHtml(input);
exports.sanitizeHtml = sanitizeHtml;
const sanitizeText = (input) => exports.inputSecurity.sanitizeText(input);
exports.sanitizeText = sanitizeText;
const sanitizeUrl = (input) => exports.inputSecurity.sanitizeUrl(input);
exports.sanitizeUrl = sanitizeUrl;
const escapeHtml = (input) => exports.inputSecurity.escapeHtml(input);
exports.escapeHtml = escapeHtml;
const generateCSP = () => exports.inputSecurity.generateCSP();
exports.generateCSP = generateCSP;
