/**
 * Configuration file for the Movie Poll application
 * Centralized location for all API endpoints and configuration values
 */
/**
 * Cloudflare D1 Backend API Configuration
 */
const WORKER_URL = "https://mewling-goat-backend.tavern-b8d.workers.dev";
export const API_CONFIG = {
    /** The Cloudflare Worker URL for API calls */
    PROXY_URL: WORKER_URL,
    /** API action endpoints */
    ACTIONS: {
        DEBUG: 'debug',
        LIST_MOVIES: 'listMovies',
        SEARCH: 'search',
        MOVIE: 'movie',
        VOTE: 'vote',
        BATCH_VOTE: 'batchVote',
        UPDATE_APPEAL: 'updateAppeal'
    }
};
/**
 * Application Configuration
 */
export const APP_CONFIG = {
    /** Auto-refresh interval for results page (in milliseconds) */
    RESULTS_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    /** Default test values */
    TEST_DEFAULTS: {
        SEARCH_QUERY: 'The Thing',
        SEARCH_YEAR: 1982,
        MOVIE_ID: 694,
        USER_NAME: 'TestUser',
        MOVIE_TITLE: 'The Thing (1982)',
        VIBE: 4,
        SEEN: false
    }
};
/**
 * Utility function to make API calls to D1 backend
 * Uses standard fetch instead of JSONP for better error handling
 */
export async function makeApiCall(action, params = {}, method = 'GET', body) {
    const url = new URL(API_CONFIG.PROXY_URL);
    url.searchParams.set('action', action);
    // Add query parameters for GET requests
    if (method === 'GET') {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value));
        });
    }
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    // Add body for POST requests
    if (method === 'POST' && body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(url.toString(), options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error(`API call failed for action: ${action}`, error);
        throw error;
    }
}
/**
 * Legacy JSONP function for backward compatibility
 * @deprecated Use makeApiCall instead
 */
export function makeJsonpCall(action, params = {}, callback) {
    // Convert to modern API call
    makeApiCall(action, params)
        .then(callback)
        .catch(error => {
        console.error(`API call failed for action: ${action}`, error);
        // Call callback with error response for backward compatibility
        callback({ success: false, error: error.message });
    });
}
//# sourceMappingURL=config.js.map