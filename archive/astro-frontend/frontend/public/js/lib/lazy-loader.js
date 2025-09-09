"use strict";
/**
 * Lazy Loader Utility
 * Provides dynamic imports and code splitting for better performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.preloadAllModules = exports.preloadCriticalModules = exports.loadErrorBoundary = exports.loadApiErrorWrapper = exports.loadFormValidator = exports.loadInputSecurity = exports.loadInputValidator = exports.loadErrorHandler = exports.LazyModules = exports.lazyLoader = void 0;
class LazyLoader {
    constructor() {
        this.modules = new Map();
        this.loadingPromises = new Map();
    }
    static getInstance() {
        if (!LazyLoader.instance) {
            LazyLoader.instance = new LazyLoader();
        }
        return LazyLoader.instance;
    }
    /**
     * Register a lazy module
     */
    register(name, loader) {
        const module = {
            load: loader,
            isLoaded: false
        };
        this.modules.set(name, module);
        return module;
    }
    /**
     * Load a module dynamically
     */
    async loadModule(name) {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module '${name}' not registered`);
        }
        if (module.isLoaded && module.module) {
            return module.module;
        }
        // Check if already loading
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        // Start loading
        const loadingPromise = module.load().then((loadedModule) => {
            module.isLoaded = true;
            module.module = loadedModule;
            this.loadingPromises.delete(name);
            return loadedModule;
        });
        this.loadingPromises.set(name, loadingPromise);
        return loadingPromise;
    }
    /**
     * Preload a module without executing it
     */
    async preloadModule(name) {
        if (this.modules.has(name) && !this.modules.get(name).isLoaded) {
            await this.loadModule(name);
        }
    }
    /**
     * Check if a module is loaded
     */
    isModuleLoaded(name) {
        const module = this.modules.get(name);
        return module?.isLoaded || false;
    }
    /**
     * Get loaded module without loading
     */
    getModule(name) {
        const module = this.modules.get(name);
        return module?.isLoaded ? module.module : undefined;
    }
    /**
     * Clear all modules (for testing)
     */
    clear() {
        this.modules.clear();
        this.loadingPromises.clear();
    }
}
// Export singleton instance
exports.lazyLoader = LazyLoader.getInstance();
// Predefined lazy modules for common use cases
exports.LazyModules = {
    // Error handling (loaded only when needed)
    ERROR_HANDLER: 'error-handler',
    // Input validation (loaded only when needed)
    INPUT_VALIDATION: 'input-validation',
    INPUT_SECURITY: 'input-security',
    // Form validation (loaded only when needed)
    FORM_VALIDATOR: 'form-validator',
    // API error wrapper (loaded only when needed)
    API_ERROR_WRAPPER: 'api-error-wrapper',
    // Error boundary (loaded only when needed)
    ERROR_BOUNDARY: 'error-boundary'
};
// Register lazy modules
exports.lazyLoader.register(exports.LazyModules.ERROR_HANDLER, () => import('./error-handler').then(m => m.errorHandler));
exports.lazyLoader.register(exports.LazyModules.INPUT_VALIDATION, () => import('./input-validation').then(m => m.inputValidator));
exports.lazyLoader.register(exports.LazyModules.INPUT_SECURITY, () => import('./input-security').then(m => m.inputSecurity));
exports.lazyLoader.register(exports.LazyModules.FORM_VALIDATOR, () => import('../components/FormValidator').then(m => m.createFormValidator));
exports.lazyLoader.register(exports.LazyModules.API_ERROR_WRAPPER, () => import('./api-error-wrapper').then(m => m.apiErrorWrapper));
exports.lazyLoader.register(exports.LazyModules.ERROR_BOUNDARY, () => import('../components/ErrorBoundary').then(m => m.createErrorBoundary));
// Convenience functions
const loadErrorHandler = () => exports.lazyLoader.loadModule(exports.LazyModules.ERROR_HANDLER);
exports.loadErrorHandler = loadErrorHandler;
const loadInputValidator = () => exports.lazyLoader.loadModule(exports.LazyModules.INPUT_VALIDATION);
exports.loadInputValidator = loadInputValidator;
const loadInputSecurity = () => exports.lazyLoader.loadModule(exports.LazyModules.INPUT_SECURITY);
exports.loadInputSecurity = loadInputSecurity;
const loadFormValidator = () => exports.lazyLoader.loadModule(exports.LazyModules.FORM_VALIDATOR);
exports.loadFormValidator = loadFormValidator;
const loadApiErrorWrapper = () => exports.lazyLoader.loadModule(exports.LazyModules.API_ERROR_WRAPPER);
exports.loadApiErrorWrapper = loadApiErrorWrapper;
const loadErrorBoundary = () => exports.lazyLoader.loadModule(exports.LazyModules.ERROR_BOUNDARY);
exports.loadErrorBoundary = loadErrorBoundary;
// Preload critical modules on user interaction
const preloadCriticalModules = async () => {
    // Preload error handling and validation when user starts interacting
    const criticalModules = [
        exports.LazyModules.ERROR_HANDLER,
        exports.LazyModules.INPUT_VALIDATION,
        exports.LazyModules.INPUT_SECURITY
    ];
    await Promise.all(criticalModules.map(name => exports.lazyLoader.preloadModule(name)));
};
exports.preloadCriticalModules = preloadCriticalModules;
// Preload all modules (for when user is likely to need them)
const preloadAllModules = async () => {
    const allModules = Object.values(exports.LazyModules);
    await Promise.all(allModules.map(name => exports.lazyLoader.preloadModule(name)));
};
exports.preloadAllModules = preloadAllModules;
