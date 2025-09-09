"use strict";
/**
 * Error Boundary for JavaScript Error Handling
 * Provides React-like error boundary functionality for vanilla JavaScript
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
exports.createErrorBoundary = createErrorBoundary;
exports.withErrorBoundary = withErrorBoundary;
exports.withAsyncErrorBoundary = withAsyncErrorBoundary;
const error_handler_1 = require("../lib/error-handler");
class ErrorBoundary {
    constructor(element, options = {}) {
        this.error = null;
        this.errorInfo = null;
        this.originalContent = '';
        this.retryCount = 0;
        this.maxRetries = 3;
        /**
         * Default fallback UI
         */
        this.defaultFallback = (error, errorInfo) => {
            const container = document.createElement('div');
            container.className = 'error-boundary-fallback bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center';
            container.innerHTML = `
      <div class="mb-4">
        <svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-red-400 mb-2">Something went wrong</h2>
      <p class="text-red-300 mb-4">An error occurred while rendering this component.</p>
      ${errorInfo.willRetry ? `
        <button 
          class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors mr-2"
          onclick="this.closest('.error-boundary-fallback').retry()"
        >
          Retry
        </button>
      ` : ''}
      <button 
        class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
        onclick="this.closest('.error-boundary-fallback').reset()"
      >
        Reset
      </button>
      ${process.env.NODE_ENV === 'development' ? `
        <details class="mt-4 text-left">
          <summary class="cursor-pointer text-red-300 hover:text-red-200">Error Details</summary>
          <pre class="mt-2 text-xs text-red-200 bg-red-900/50 p-2 rounded overflow-auto">${error.stack}</pre>
        </details>
      ` : ''}
    `;
            // Add retry and reset methods
            container.retry = () => this.retry();
            container.reset = () => this.reset();
            return container;
        };
        /**
         * Default error handler
         */
        this.defaultOnError = (error, errorInfo) => {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        };
        this.element = element;
        this.options = {
            fallback: this.defaultFallback,
            onError: this.defaultOnError,
            resetOnPropsChange: true,
            resetKeys: [],
            ...options
        };
        this.setupErrorHandling();
    }
    /**
     * Setup error handling for the element
     */
    setupErrorHandling() {
        // Store original content
        this.originalContent = this.element.innerHTML;
        // Add error event listeners
        this.element.addEventListener('error', this.handleError.bind(this));
        // unhandledrejection is a global window event, not an HTMLElement event
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
        // Wrap child elements with error handling
        this.wrapChildElements();
    }
    /**
     * Wrap child elements with error handling
     */
    wrapChildElements() {
        const children = Array.from(this.element.children);
        children.forEach(child => {
            if (child instanceof HTMLElement) {
                this.wrapElement(child);
            }
        });
    }
    /**
     * Wrap a single element with error handling
     */
    wrapElement(element) {
        const originalAddEventListener = element.addEventListener;
        const originalRemoveEventListener = element.removeEventListener;
        const errorBoundary = this;
        // Wrap event listeners to catch errors
        element.addEventListener = function (type, listener, options) {
            const wrappedListener = (event) => {
                try {
                    if (typeof listener === 'function') {
                        listener.call(element, event);
                    }
                    else if (listener && typeof listener === 'object' && 'handleEvent' in listener) {
                        listener.handleEvent(event);
                    }
                }
                catch (error) {
                    // Create a synthetic ErrorEvent for consistency
                    const errorEvent = new ErrorEvent('error', {
                        message: error.message,
                        filename: '',
                        lineno: 0,
                        colno: 0,
                        error: error
                    });
                    errorBoundary.handleError(errorEvent);
                }
            };
            return originalAddEventListener.call(element, type, wrappedListener, options);
        };
        element.removeEventListener = originalRemoveEventListener;
    }
    /**
     * Handle JavaScript errors
     */
    handleError(event) {
        const error = new Error(event.message);
        error.stack = event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined;
        this.catchError(error, {
            componentStack: this.getComponentStack(),
            errorBoundary: this.element.tagName,
            errorBoundaryStack: new Error().stack || '',
            willRetry: this.retryCount < this.maxRetries
        });
    }
    /**
     * Handle unhandled promise rejections
     */
    handlePromiseRejection(event) {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.catchError(error, {
            componentStack: this.getComponentStack(),
            errorBoundary: this.element.tagName,
            errorBoundaryStack: new Error().stack || '',
            willRetry: this.retryCount < this.maxRetries
        });
    }
    /**
     * Catch and handle errors
     */
    catchError(error, errorInfo) {
        this.error = error;
        this.errorInfo = errorInfo;
        // Call custom error handler
        if (this.options.onError) {
            this.options.onError(error, errorInfo);
        }
        // Handle error through centralized error handler
        error_handler_1.errorHandler.handleError(error, {
            component: this.element.tagName,
            action: 'error_boundary',
            additionalData: {
                errorInfo,
                retryCount: this.retryCount,
                elementId: this.element.id,
                elementClass: this.element.className
            }
        });
        // Show fallback UI
        this.showFallback();
        // Prevent error from bubbling up
        if (errorInfo.willRetry) {
            event?.preventDefault();
            event?.stopPropagation();
        }
    }
    /**
     * Show fallback UI
     */
    showFallback() {
        if (this.options.fallback && this.error && this.errorInfo) {
            const fallbackElement = this.options.fallback(this.error, this.errorInfo);
            this.element.innerHTML = '';
            this.element.appendChild(fallbackElement);
        }
    }
    /**
     * Get component stack for debugging
     */
    getComponentStack() {
        const stack = [];
        let element = this.element.parentElement;
        while (element && stack.length < 10) {
            stack.push(element.tagName.toLowerCase());
            element = element.parentElement;
        }
        return stack.join(' > ');
    }
    /**
     * Retry the component
     */
    retry() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.reset();
        }
    }
    /**
     * Reset the component to its original state
     */
    reset() {
        this.error = null;
        this.errorInfo = null;
        this.element.innerHTML = this.originalContent;
        this.setupErrorHandling();
    }
    /**
     * Update reset keys (for React-like behavior)
     */
    updateResetKeys(newResetKeys) {
        if (this.options.resetKeys && this.options.resetOnPropsChange) {
            const hasChanged = this.options.resetKeys.some((key, index) => key !== newResetKeys[index]);
            if (hasChanged) {
                this.reset();
            }
        }
        this.options.resetKeys = newResetKeys;
    }
    /**
     * Cleanup error boundary
     */
    destroy() {
        this.element.removeEventListener('error', this.handleError.bind(this));
        // unhandledrejection is a global window event, not an HTMLElement event
        window.removeEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }
}
exports.ErrorBoundary = ErrorBoundary;
/**
 * Create an error boundary for an element
 */
function createErrorBoundary(element, options) {
    return new ErrorBoundary(element, options);
}
/**
 * Wrap a function with error boundary protection
 */
function withErrorBoundary(fn, errorContext) {
    return ((...args) => {
        try {
            return fn(...args);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError(error, errorContext);
            throw error;
        }
    });
}
/**
 * Wrap an async function with error boundary protection
 */
function withAsyncErrorBoundary(fn, errorContext) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError(error, errorContext);
            throw error;
        }
    });
}
