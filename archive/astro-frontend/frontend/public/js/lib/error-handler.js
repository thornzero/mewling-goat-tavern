"use strict";
/**
 * Centralized Error Handling System
 * Provides consistent error handling, logging, and user feedback across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetryFunction = exports.handleError = exports.errorHandler = exports.ErrorSeverity = exports.ErrorType = void 0;
var ErrorType;
(function (ErrorType) {
    ErrorType["NETWORK"] = "NETWORK";
    ErrorType["API"] = "API";
    ErrorType["VALIDATION"] = "VALIDATION";
    ErrorType["UI"] = "UI";
    ErrorType["UNKNOWN"] = "UNKNOWN";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "LOW";
    ErrorSeverity["MEDIUM"] = "MEDIUM";
    ErrorSeverity["HIGH"] = "HIGH";
    ErrorSeverity["CRITICAL"] = "CRITICAL";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
    }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    /**
     * Handle and log an error
     */
    handleError(error, context, userMessage) {
        let appError;
        if (this.isAppError(error)) {
            appError = error;
        }
        else {
            appError = this.createAppError(error, context, userMessage);
        }
        // Log the error
        this.logError(appError, context);
        // Show user feedback
        this.showUserFeedback(appError);
        // Report to external service if critical
        if (appError.severity === ErrorSeverity.CRITICAL) {
            this.reportError(appError, context);
        }
        return appError;
    }
    /**
     * Create a standardized AppError from a generic Error
     */
    createAppError(error, context, userMessage) {
        const type = this.determineErrorType(error, context);
        const severity = this.determineErrorSeverity(error, type);
        return {
            type,
            severity,
            message: error.message,
            code: this.extractErrorCode(error),
            details: {
                stack: error.stack,
                name: error.name,
                ...context?.additionalData
            },
            timestamp: new Date(),
            userMessage: userMessage || this.getDefaultUserMessage(type, severity),
            retryable: this.isRetryable(error, type)
        };
    }
    /**
     * Determine error type based on error and context
     */
    determineErrorType(error, context) {
        const message = error.message.toLowerCase();
        if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
            return ErrorType.NETWORK;
        }
        if (message.includes('api') || message.includes('http') || message.includes('status')) {
            return ErrorType.API;
        }
        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return ErrorType.VALIDATION;
        }
        if (context?.component) {
            return ErrorType.UI;
        }
        return ErrorType.UNKNOWN;
    }
    /**
     * Determine error severity
     */
    determineErrorSeverity(error, type) {
        if (type === ErrorType.NETWORK) {
            return ErrorSeverity.MEDIUM;
        }
        if (type === ErrorType.API) {
            return ErrorSeverity.HIGH;
        }
        if (type === ErrorType.VALIDATION) {
            return ErrorSeverity.LOW;
        }
        if (type === ErrorType.UI) {
            return ErrorSeverity.MEDIUM;
        }
        return ErrorSeverity.HIGH;
    }
    /**
     * Extract error code from error message or name
     */
    extractErrorCode(error) {
        // Try to extract HTTP status codes
        const statusMatch = error.message.match(/(\d{3})/);
        if (statusMatch) {
            return `HTTP_${statusMatch[1]}`;
        }
        // Try to extract custom error codes
        const codeMatch = error.message.match(/\[(\w+)\]/);
        if (codeMatch) {
            return codeMatch[1];
        }
        return error.name || 'UNKNOWN_ERROR';
    }
    /**
     * Get default user-friendly message based on error type and severity
     */
    getDefaultUserMessage(type, severity) {
        const messages = {
            [ErrorType.NETWORK]: {
                [ErrorSeverity.LOW]: 'Connection issue. Please check your internet connection.',
                [ErrorSeverity.MEDIUM]: 'Unable to connect to the server. Please try again.',
                [ErrorSeverity.HIGH]: 'Network error. Please refresh the page and try again.',
                [ErrorSeverity.CRITICAL]: 'Critical network error. Please contact support.'
            },
            [ErrorType.API]: {
                [ErrorSeverity.LOW]: 'Service temporarily unavailable. Please try again later.',
                [ErrorSeverity.MEDIUM]: 'Server error. Please try again in a moment.',
                [ErrorSeverity.HIGH]: 'API error. Please refresh the page and try again.',
                [ErrorSeverity.CRITICAL]: 'Critical server error. Please contact support.'
            },
            [ErrorType.VALIDATION]: {
                [ErrorSeverity.LOW]: 'Please check your input and try again.',
                [ErrorSeverity.MEDIUM]: 'Invalid input. Please review and try again.',
                [ErrorSeverity.HIGH]: 'Input validation failed. Please check your data.',
                [ErrorSeverity.CRITICAL]: 'Critical validation error. Please contact support.'
            },
            [ErrorType.UI]: {
                [ErrorSeverity.LOW]: 'Display issue. Please refresh the page.',
                [ErrorSeverity.MEDIUM]: 'Interface error. Please try again.',
                [ErrorSeverity.HIGH]: 'UI error. Please refresh the page.',
                [ErrorSeverity.CRITICAL]: 'Critical interface error. Please contact support.'
            },
            [ErrorType.UNKNOWN]: {
                [ErrorSeverity.LOW]: 'Something went wrong. Please try again.',
                [ErrorSeverity.MEDIUM]: 'An error occurred. Please try again.',
                [ErrorSeverity.HIGH]: 'Unexpected error. Please refresh the page.',
                [ErrorSeverity.CRITICAL]: 'Critical error. Please contact support.'
            }
        };
        return messages[type][severity];
    }
    /**
     * Check if error is retryable
     */
    isRetryable(error, type) {
        if (type === ErrorType.NETWORK) {
            return true;
        }
        if (type === ErrorType.API) {
            const message = error.message.toLowerCase();
            return message.includes('timeout') || message.includes('5') || message.includes('503');
        }
        return false;
    }
    /**
     * Check if error is an AppError
     */
    isAppError(error) {
        return error && typeof error === 'object' && 'type' in error && 'severity' in error;
    }
    /**
     * Log error to console and internal log
     */
    logError(error, context) {
        const logMessage = `[${error.type}:${error.severity}] ${error.message}`;
        const logData = {
            error,
            context,
            timestamp: new Date().toISOString()
        };
        // Console logging based on severity
        switch (error.severity) {
            case ErrorSeverity.LOW:
                console.warn(logMessage, logData);
                break;
            case ErrorSeverity.MEDIUM:
                console.error(logMessage, logData);
                break;
            case ErrorSeverity.HIGH:
                console.error(logMessage, logData);
                break;
            case ErrorSeverity.CRITICAL:
                console.error(logMessage, logData);
                break;
        }
        // Add to internal log
        this.errorLog.push(error);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    }
    /**
     * Show user feedback based on error severity
     */
    showUserFeedback(error) {
        // For now, we'll use the existing toast system
        // In a more advanced implementation, this could trigger different UI components
        this.showToast(error.userMessage, error.severity === ErrorSeverity.CRITICAL ? 'error' : 'warning');
    }
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `fixed z-50 max-w-sm w-full p-4 rounded-lg border shadow-lg transition-all duration-300 ${type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' :
            type === 'warning' ? 'bg-yellow-900/90 border-yellow-500 text-yellow-100' :
                type === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' :
                    'bg-blue-900/90 border-blue-500 text-blue-100'} top-4 right-4`;
        toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0 text-lg" aria-hidden="true">
          ${type === 'error' ? '✗' : type === 'warning' ? '⚠' : type === 'success' ? '✓' : 'ℹ'}
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <button 
          class="flex-shrink-0 ml-2 text-lg hover:opacity-70 transition-opacity"
          onclick="this.parentElement.parentElement.remove()"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    `;
        document.body.appendChild(toast);
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }
    /**
     * Report critical errors to external service
     */
    reportError(error, context) {
        // In a production environment, this would send to an error reporting service
        // like Sentry, LogRocket, or a custom API endpoint
        console.log('Reporting critical error:', { error, context });
        // Example: Send to external service
        // fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ error, context, timestamp: new Date().toISOString() })
        // }).catch(console.error);
    }
    /**
     * Get error log for debugging
     */
    getErrorLog() {
        return [...this.errorLog];
    }
    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }
    /**
     * Create a retry function for retryable errors
     */
    createRetryFunction(originalFunction, maxRetries = 3) {
        return async () => {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    return await originalFunction();
                }
                catch (error) {
                    retries++;
                    const appError = this.handleError(error, { action: 'retry' });
                    if (!appError.retryable || retries >= maxRetries) {
                        throw error;
                    }
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
                }
            }
        };
    }
}
// Export singleton instance
exports.errorHandler = ErrorHandler.getInstance();
// Export convenience functions
const handleError = (error, context, userMessage) => exports.errorHandler.handleError(error, context, userMessage);
exports.handleError = handleError;
const createRetryFunction = (originalFunction, maxRetries) => exports.errorHandler.createRetryFunction(originalFunction, maxRetries);
exports.createRetryFunction = createRetryFunction;
