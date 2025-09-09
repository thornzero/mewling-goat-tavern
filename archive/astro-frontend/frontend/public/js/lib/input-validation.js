"use strict";
/**
 * Input Validation and Sanitization System
 * Provides comprehensive validation, sanitization, and security for user inputs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationPresets = exports.sanitizeInput = exports.validateFields = exports.validateField = exports.inputValidator = exports.ValidationRule = void 0;
var ValidationRule;
(function (ValidationRule) {
    ValidationRule["REQUIRED"] = "REQUIRED";
    ValidationRule["MIN_LENGTH"] = "MIN_LENGTH";
    ValidationRule["MAX_LENGTH"] = "MAX_LENGTH";
    ValidationRule["PATTERN"] = "PATTERN";
    ValidationRule["EMAIL"] = "EMAIL";
    ValidationRule["NUMBER"] = "NUMBER";
    ValidationRule["INTEGER"] = "INTEGER";
    ValidationRule["RANGE"] = "RANGE";
    ValidationRule["NO_HTML"] = "NO_HTML";
    ValidationRule["NO_SCRIPT"] = "NO_SCRIPT";
    ValidationRule["ALPHANUMERIC"] = "ALPHANUMERIC";
    ValidationRule["SAFE_TEXT"] = "SAFE_TEXT";
})(ValidationRule || (exports.ValidationRule = ValidationRule = {}));
class InputValidator {
    constructor() {
        this.validationRules = new Map();
    }
    static getInstance() {
        if (!InputValidator.instance) {
            InputValidator.instance = new InputValidator();
            InputValidator.instance.initializeRules();
        }
        return InputValidator.instance;
    }
    initializeRules() {
        this.validationRules.set(ValidationRule.REQUIRED, this.validateRequired.bind(this));
        this.validationRules.set(ValidationRule.MIN_LENGTH, this.validateMinLength.bind(this));
        this.validationRules.set(ValidationRule.MAX_LENGTH, this.validateMaxLength.bind(this));
        this.validationRules.set(ValidationRule.PATTERN, this.validatePattern.bind(this));
        this.validationRules.set(ValidationRule.EMAIL, this.validateEmail.bind(this));
        this.validationRules.set(ValidationRule.NUMBER, this.validateNumber.bind(this));
        this.validationRules.set(ValidationRule.INTEGER, this.validateInteger.bind(this));
        this.validationRules.set(ValidationRule.RANGE, this.validateRange.bind(this));
        this.validationRules.set(ValidationRule.NO_HTML, this.validateNoHtml.bind(this));
        this.validationRules.set(ValidationRule.NO_SCRIPT, this.validateNoScript.bind(this));
        this.validationRules.set(ValidationRule.ALPHANUMERIC, this.validateAlphanumeric.bind(this));
        this.validationRules.set(ValidationRule.SAFE_TEXT, this.validateSafeText.bind(this));
    }
    /**
     * Validate a single input field
     */
    validateField(field) {
        const errors = [];
        let sanitizedValue = field.value;
        // Check if required field is empty
        if (field.required && this.isEmpty(field.value)) {
            errors.push(`${field.label || field.name} is required`);
            return {
                isValid: false,
                errors,
                originalValue: field.value
            };
        }
        // Skip validation if field is empty and not required
        if (this.isEmpty(field.value) && !field.required) {
            return {
                isValid: true,
                errors: [],
                sanitizedValue: sanitizedValue,
                originalValue: field.value
            };
        }
        // Apply validation rules
        for (const rule of field.rules) {
            const validator = this.validationRules.get(rule.rule);
            if (validator) {
                const result = validator(sanitizedValue, rule);
                if (!result.isValid) {
                    errors.push(rule.message || result.errors[0]);
                }
                if (result.sanitizedValue !== undefined) {
                    sanitizedValue = result.sanitizedValue;
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue,
            originalValue: field.value
        };
    }
    /**
     * Validate multiple fields
     */
    validateFields(fields) {
        const results = new Map();
        for (const field of fields) {
            results.set(field.name, this.validateField(field));
        }
        return results;
    }
    /**
     * Sanitize input value
     */
    sanitizeInput(value, rules) {
        let sanitized = value;
        for (const rule of rules) {
            if (rule.sanitize) {
                sanitized = this.applySanitization(sanitized, rule.rule);
            }
        }
        return sanitized;
    }
    /**
     * Check if value is empty
     */
    isEmpty(value) {
        if (value === null || value === undefined)
            return true;
        if (typeof value === 'string')
            return value.trim().length === 0;
        if (Array.isArray(value))
            return value.length === 0;
        return false;
    }
    /**
     * Apply sanitization based on rule
     */
    applySanitization(value, rule) {
        if (typeof value !== 'string')
            return value;
        switch (rule) {
            case ValidationRule.NO_HTML:
                return this.stripHtml(value);
            case ValidationRule.NO_SCRIPT:
                return this.stripScripts(value);
            case ValidationRule.SAFE_TEXT:
                return this.sanitizeText(value);
            case ValidationRule.ALPHANUMERIC:
                return value.replace(/[^a-zA-Z0-9\s]/g, '');
            default:
                return value;
        }
    }
    /**
     * Strip HTML tags
     */
    stripHtml(value) {
        return value.replace(/<[^>]*>/g, '');
    }
    /**
     * Strip script tags and event handlers
     */
    stripScripts(value) {
        return value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '');
    }
    /**
     * Sanitize text for safe display
     */
    sanitizeText(value) {
        return value
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
    }
    // Validation rule implementations
    validateRequired(value, config) {
        return {
            isValid: !this.isEmpty(value),
            errors: this.isEmpty(value) ? ['This field is required'] : [],
            originalValue: value
        };
    }
    validateMinLength(value, config) {
        const minLength = config.value || 0;
        const isValid = typeof value === 'string' && value.length >= minLength;
        return {
            isValid,
            errors: isValid ? [] : [`Must be at least ${minLength} characters long`],
            originalValue: value
        };
    }
    validateMaxLength(value, config) {
        const maxLength = config.value || 255;
        const isValid = typeof value === 'string' && value.length <= maxLength;
        return {
            isValid,
            errors: isValid ? [] : [`Must be no more than ${maxLength} characters long`],
            originalValue: value
        };
    }
    validatePattern(value, config) {
        const pattern = config.value;
        const isValid = typeof value === 'string' && new RegExp(pattern).test(value);
        return {
            isValid,
            errors: isValid ? [] : ['Invalid format'],
            originalValue: value
        };
    }
    validateEmail(value, config) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = typeof value === 'string' && emailPattern.test(value);
        return {
            isValid,
            errors: isValid ? [] : ['Invalid email format'],
            originalValue: value
        };
    }
    validateNumber(value, config) {
        const num = Number(value);
        const isValid = !isNaN(num) && isFinite(num);
        return {
            isValid,
            errors: isValid ? [] : ['Must be a valid number'],
            sanitizedValue: isValid ? num : value,
            originalValue: value
        };
    }
    validateInteger(value, config) {
        const num = Number(value);
        const isValid = !isNaN(num) && Number.isInteger(num);
        return {
            isValid,
            errors: isValid ? [] : ['Must be a valid integer'],
            sanitizedValue: isValid ? Math.floor(num) : value,
            originalValue: value
        };
    }
    validateRange(value, config) {
        const { min, max } = config.value || {};
        const num = Number(value);
        const isValid = !isNaN(num) && (min === undefined || num >= min) && (max === undefined || num <= max);
        return {
            isValid,
            errors: isValid ? [] : [`Must be between ${min || 'negative infinity'} and ${max || 'infinity'}`],
            sanitizedValue: isValid ? num : value,
            originalValue: value
        };
    }
    validateNoHtml(value, config) {
        const hasHtml = typeof value === 'string' && /<[^>]*>/.test(value);
        return {
            isValid: !hasHtml,
            errors: hasHtml ? ['HTML tags are not allowed'] : [],
            sanitizedValue: hasHtml ? this.stripHtml(value) : value,
            originalValue: value
        };
    }
    validateNoScript(value, config) {
        const hasScript = typeof value === 'string' && /<script\b|javascript:|on\w+\s*=/i.test(value);
        return {
            isValid: !hasScript,
            errors: hasScript ? ['Scripts and event handlers are not allowed'] : [],
            sanitizedValue: hasScript ? this.stripScripts(value) : value,
            originalValue: value
        };
    }
    validateAlphanumeric(value, config) {
        const isValid = typeof value === 'string' && /^[a-zA-Z0-9\s]*$/.test(value);
        return {
            isValid,
            errors: isValid ? [] : ['Only letters, numbers, and spaces are allowed'],
            sanitizedValue: isValid ? value : value.replace(/[^a-zA-Z0-9\s]/g, ''),
            originalValue: value
        };
    }
    validateSafeText(value, config) {
        const hasUnsafeContent = typeof value === 'string' &&
            (/<[^>]*>|javascript:|on\w+\s*=/i.test(value) || /[<>]/.test(value));
        return {
            isValid: !hasUnsafeContent,
            errors: hasUnsafeContent ? ['Text contains unsafe content'] : [],
            sanitizedValue: hasUnsafeContent ? this.sanitizeText(value) : value,
            originalValue: value
        };
    }
}
// Export singleton instance
exports.inputValidator = InputValidator.getInstance();
// Export convenience functions
const validateField = (field) => exports.inputValidator.validateField(field);
exports.validateField = validateField;
const validateFields = (fields) => exports.inputValidator.validateFields(fields);
exports.validateFields = validateFields;
const sanitizeInput = (value, rules) => exports.inputValidator.sanitizeInput(value, rules);
exports.sanitizeInput = sanitizeInput;
// Predefined validation configurations for common use cases
exports.ValidationPresets = {
    USERNAME: [
        { rule: ValidationRule.REQUIRED, message: 'Username is required' },
        { rule: ValidationRule.MIN_LENGTH, value: 2, message: 'Username must be at least 2 characters' },
        { rule: ValidationRule.MAX_LENGTH, value: 50, message: 'Username must be no more than 50 characters' },
        { rule: ValidationRule.SAFE_TEXT, sanitize: true, message: 'Username contains unsafe content' }
    ],
    SEARCH_QUERY: [
        { rule: ValidationRule.MIN_LENGTH, value: 2, message: 'Search query must be at least 2 characters' },
        { rule: ValidationRule.MAX_LENGTH, value: 100, message: 'Search query must be no more than 100 characters' },
        { rule: ValidationRule.SAFE_TEXT, sanitize: true, message: 'Search query contains unsafe content' }
    ],
    VIBE_RATING: [
        { rule: ValidationRule.REQUIRED, message: 'Vibe rating is required' },
        { rule: ValidationRule.INTEGER, message: 'Vibe rating must be a whole number' },
        { rule: ValidationRule.RANGE, value: { min: 1, max: 6 }, message: 'Vibe rating must be between 1 and 6' }
    ],
    MOVIE_ID: [
        { rule: ValidationRule.REQUIRED, message: 'Movie ID is required' },
        { rule: ValidationRule.INTEGER, message: 'Movie ID must be a valid number' },
        { rule: ValidationRule.RANGE, value: { min: 1 }, message: 'Movie ID must be a positive number' }
    ]
};
