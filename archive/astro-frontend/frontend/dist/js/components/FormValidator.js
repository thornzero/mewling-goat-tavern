"use strict";
/**
 * Form Validation Component
 * Provides real-time form validation with visual feedback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormValidationHelpers = exports.FormValidator = void 0;
exports.createFormValidator = createFormValidator;
const input_validation_1 = require("../lib/input-validation");
class FormValidator {
    constructor(form, options = {}) {
        this.fields = new Map();
        this.validationResults = new Map();
        this.errorContainers = new Map();
        this.form = form;
        this.options = {
            showErrors: true,
            highlightInvalid: true,
            preventSubmit: true,
            realTimeValidation: true,
            errorClass: 'border-red-500 bg-red-50',
            validClass: 'border-green-500 bg-green-50',
            errorContainerClass: 'text-red-500 text-sm mt-1',
            ...options
        };
        this.initializeForm();
    }
    /**
     * Add a field to validation
     */
    addField(field) {
        this.fields.set(field.name, field);
        this.setupFieldValidation(field);
    }
    /**
     * Add multiple fields at once
     */
    addFields(fields) {
        fields.forEach(field => this.addField(field));
    }
    /**
     * Validate all fields
     */
    validateAll() {
        let isValid = true;
        this.validationResults.clear();
        for (const [name, field] of this.fields) {
            const result = this.validateField(field);
            this.validationResults.set(name, result);
            if (!result.isValid) {
                isValid = false;
            }
            this.updateFieldDisplay(field, result);
        }
        return isValid;
    }
    /**
     * Validate a specific field
     */
    validateField(field) {
        const inputField = {
            name: field.name,
            value: field.element.value,
            rules: field.rules,
            required: field.required,
            label: field.label
        };
        const result = input_validation_1.inputValidator.validateField(inputField);
        // Apply sanitization if needed
        if (result.sanitizedValue !== undefined) {
            field.element.value = result.sanitizedValue;
        }
        return result;
    }
    /**
     * Get validation result for a field
     */
    getFieldResult(fieldName) {
        return this.validationResults.get(fieldName);
    }
    /**
     * Check if form is valid
     */
    isValid() {
        return Array.from(this.validationResults.values()).every(result => result.isValid);
    }
    /**
     * Get all validation errors
     */
    getAllErrors() {
        const errors = [];
        for (const result of this.validationResults.values()) {
            errors.push(...result.errors);
        }
        return errors;
    }
    /**
     * Clear all validation states
     */
    clearValidation() {
        this.validationResults.clear();
        for (const [name, field] of this.fields) {
            this.clearFieldDisplay(field);
        }
    }
    /**
     * Initialize form validation
     */
    initializeForm() {
        // Prevent default form submission if validation fails
        if (this.options.preventSubmit) {
            this.form.addEventListener('submit', (event) => {
                if (!this.validateAll()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
        }
        // Add form-level error display
        this.createFormErrorContainer();
    }
    /**
     * Setup validation for a specific field
     */
    setupFieldValidation(field) {
        if (this.options.realTimeValidation) {
            // Validate on input
            field.element.addEventListener('input', () => {
                const result = this.validateField(field);
                this.validationResults.set(field.name, result);
                this.updateFieldDisplay(field, result);
            });
            // Validate on blur
            field.element.addEventListener('blur', () => {
                const result = this.validateField(field);
                this.validationResults.set(field.name, result);
                this.updateFieldDisplay(field, result);
            });
        }
        // Create error container for this field
        this.createFieldErrorContainer(field);
    }
    /**
     * Update field display based on validation result
     */
    updateFieldDisplay(field, result) {
        const element = field.element;
        // Remove existing validation classes
        element.classList.remove(this.options.errorClass, this.options.validClass);
        if (this.options.highlightInvalid) {
            if (result.isValid) {
                element.classList.add(this.options.validClass);
            }
            else {
                element.classList.add(this.options.errorClass);
            }
        }
        // Update error display
        if (this.options.showErrors) {
            this.updateFieldErrorDisplay(field, result);
        }
    }
    /**
     * Clear field display
     */
    clearFieldDisplay(field) {
        const element = field.element;
        element.classList.remove(this.options.errorClass, this.options.validClass);
        const errorContainer = this.errorContainers.get(field.name);
        if (errorContainer) {
            errorContainer.textContent = '';
            errorContainer.classList.add('hidden');
        }
    }
    /**
     * Update field error display
     */
    updateFieldErrorDisplay(field, result) {
        const errorContainer = this.errorContainers.get(field.name);
        if (!errorContainer)
            return;
        if (result.isValid) {
            errorContainer.textContent = '';
            errorContainer.classList.add('hidden');
        }
        else {
            errorContainer.textContent = result.errors[0] || 'Invalid input';
            errorContainer.classList.remove('hidden');
        }
    }
    /**
     * Create error container for a field
     */
    createFieldErrorContainer(field) {
        const errorContainer = document.createElement('div');
        errorContainer.className = this.options.errorContainerClass;
        errorContainer.classList.add('hidden');
        // Insert after the field
        field.element.parentNode?.insertBefore(errorContainer, field.element.nextSibling);
        this.errorContainers.set(field.name, errorContainer);
    }
    /**
     * Create form-level error container
     */
    createFormErrorContainer() {
        const errorContainer = document.createElement('div');
        errorContainer.id = 'form-errors';
        errorContainer.className = 'hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        // Insert at the beginning of the form
        this.form.insertBefore(errorContainer, this.form.firstChild);
    }
    /**
     * Show form-level errors
     */
    showFormErrors(errors) {
        const errorContainer = document.getElementById('form-errors');
        if (!errorContainer)
            return;
        if (errors.length > 0) {
            errorContainer.innerHTML = `
        <strong>Please fix the following errors:</strong>
        <ul class="list-disc list-inside mt-2">
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      `;
            errorContainer.classList.remove('hidden');
        }
        else {
            errorContainer.classList.add('hidden');
        }
    }
    /**
     * Destroy form validator
     */
    destroy() {
        // Remove event listeners
        this.form.removeEventListener('submit', this.validateAll);
        // Clear validation states
        this.clearValidation();
        // Remove error containers
        this.errorContainers.forEach(container => container.remove());
        this.errorContainers.clear();
    }
}
exports.FormValidator = FormValidator;
/**
 * Create a form validator for a form element
 */
function createFormValidator(form, options) {
    return new FormValidator(form, options);
}
/**
 * Quick validation for common form types
 */
exports.FormValidationHelpers = {
    /**
     * Create username field validation
     */
    createUsernameField(element) {
        return {
            name: 'username',
            element,
            rules: input_validation_1.ValidationPresets.USERNAME,
            required: true,
            label: 'Username'
        };
    },
    /**
     * Create search query field validation
     */
    createSearchField(element) {
        return {
            name: 'search',
            element,
            rules: input_validation_1.ValidationPresets.SEARCH_QUERY,
            required: false,
            label: 'Search Query'
        };
    },
    /**
     * Create vibe rating field validation
     */
    createVibeField(element) {
        return {
            name: 'vibe',
            element,
            rules: input_validation_1.ValidationPresets.VIBE_RATING,
            required: true,
            label: 'Vibe Rating'
        };
    },
    /**
     * Create movie ID field validation
     */
    createMovieIdField(element) {
        return {
            name: 'movieId',
            element,
            rules: input_validation_1.ValidationPresets.MOVIE_ID,
            required: true,
            label: 'Movie ID'
        };
    }
};
