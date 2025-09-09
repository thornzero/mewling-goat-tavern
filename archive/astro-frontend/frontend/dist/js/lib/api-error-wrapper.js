"use strict";
/**
 * API Error Wrapper
 * Provides enhanced error handling for API calls with retry logic and better error messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeApiCall = exports.apiErrorWrapper = exports.ApiErrorWrapper = void 0;
const error_handler_1 = require("./error-handler");
class ApiErrorWrapper {
    constructor() {
        this.retryAttempts = new Map();
        this.maxRetries = 3;
    }
    static getInstance() {
        if (!ApiErrorWrapper.instance) {
            ApiErrorWrapper.instance = new ApiErrorWrapper();
        }
        return ApiErrorWrapper.instance;
    }
    /**
     * Enhanced API call with comprehensive error handling
     */
    async makeApiCall(action, params = {}, method = 'GET', body = null, context) {
        const url = new URL(`${window.API_CONFIG.PROXY_URL}/${action}`);
        const requestId = `${method}_${action}_${Date.now()}`;
        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key].toString());
            }
        });
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await this.fetchWithRetry(url.toString(), options, requestId);
            if (!response.ok) {
                throw await this.createApiError(response, action);
            }
            const data = await response.json();
            // Validate response structure
            if (data && typeof data === 'object' && 'success' in data && !data.success) {
                throw this.createApiErrorFromResponse(data, action);
            }
            return data;
        }
        catch (error) {
            const enhancedError = this.enhanceError(error, action, context);
            error_handler_1.errorHandler.handleError(enhancedError, {
                ...context,
                action: `API_${action}`,
                additionalData: { url: url.toString(), method, params, body }
            });
            throw enhancedError;
        }
    }
    /**
     * Fetch with retry logic
     */
    async fetchWithRetry(url, options, requestId) {
        const attempts = this.retryAttempts.get(requestId) || 0;
        try {
            const response = await fetch(url, options);
            // Reset retry count on success
            this.retryAttempts.delete(requestId);
            return response;
        }
        catch (error) {
            if (attempts < this.maxRetries && this.isRetryableError(error)) {
                this.retryAttempts.set(requestId, attempts + 1);
                // Exponential backoff
                const delay = Math.pow(2, attempts) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, requestId);
            }
            throw error;
        }
    }
    /**
     * Create API error from response
     */
    async createApiError(response, action) {
        let errorData;
        try {
            errorData = await response.json();
        }
        catch {
            errorData = { message: 'Unknown error' };
        }
        const error = new Error(errorData.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.code = errorData.code || `HTTP_${response.status}`;
        error.response = response;
        return error;
    }
    /**
     * Create API error from response data
     */
    createApiErrorFromResponse(data, action) {
        const error = new Error(data.message || 'API request failed');
        error.code = data.code || 'API_ERROR';
        error.status = 400; // Default to 400 for API errors
        return error;
    }
    /**
     * Enhance error with additional context
     */
    enhanceError(error, action, context) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            const networkError = new Error('Network connection failed');
            networkError.status = 0;
            networkError.code = 'NETWORK_ERROR';
            return networkError;
        }
        if (error.message.includes('timeout')) {
            const timeoutError = new Error('Request timeout');
            timeoutError.status = 408;
            timeoutError.code = 'TIMEOUT_ERROR';
            return timeoutError;
        }
        return error;
    }
    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const message = error.message.toLowerCase();
        // Network errors
        if (message.includes('network') || message.includes('fetch')) {
            return true;
        }
        // Timeout errors
        if (message.includes('timeout')) {
            return true;
        }
        // Server errors (5xx)
        if (error.name === 'ApiError' && error.status) {
            const status = error.status;
            return status >= 500 && status < 600;
        }
        return false;
    }
    /**
     * Get user-friendly error message
     */
    getErrorMessage(error, action) {
        if (error.name === 'ApiError') {
            const apiError = error;
            switch (apiError.status) {
                case 400:
                    return 'Invalid request. Please check your input and try again.';
                case 401:
                    return 'Authentication required. Please log in and try again.';
                case 403:
                    return 'Access denied. You don\'t have permission to perform this action.';
                case 404:
                    return 'The requested resource was not found.';
                case 408:
                    return 'Request timeout. Please try again.';
                case 429:
                    return 'Too many requests. Please wait a moment and try again.';
                case 500:
                    return 'Server error. Please try again later.';
                case 502:
                case 503:
                case 504:
                    return 'Service temporarily unavailable. Please try again later.';
                default:
                    return apiError.message || 'An error occurred. Please try again.';
            }
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        }
        if (error.message.includes('timeout')) {
            return 'Request timeout. Please try again.';
        }
        return error.message || 'An unexpected error occurred. Please try again.';
    }
}
exports.ApiErrorWrapper = ApiErrorWrapper;
// Export singleton instance
exports.apiErrorWrapper = ApiErrorWrapper.getInstance();
// Export convenience function
const makeApiCall = (action, params, method, body, context) => exports.apiErrorWrapper.makeApiCall(action, params, method, body, context);
exports.makeApiCall = makeApiCall;
