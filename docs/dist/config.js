/**
 * Configuration file for the Movie Poll application
 * Centralized location for all API endpoints and configuration values
 */
/**
 * Google Apps Script API Configuration
 */
export const API_CONFIG = {
    DEPLOYMENT_ID: "AKfycbysUhxHRCM6TspMeVRldxzLXm9B8ED-RIgGF9FBSW9C3vD-hd2xvr5Nxdx8CFUy_jquKg",
    /** The Google Apps Script deployment URL for API calls */
    PROXY_URL: "https://script.google.com/macros/s/${API_CONFIG.DEPLOYMENT_ID}/exec",
    /** API action endpoints */
    ACTIONS: {
        DEBUG: 'debug',
        LIST_MOVIES: 'listMovies',
        SEARCH: 'search',
        MOVIE: 'movie',
        VIDEOS: 'videos',
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
 * Utility function to make JSONP calls
 */
export function makeJsonpCall(action, params = {}, callback) {
    const script = document.createElement('script');
    const urlParams = new URLSearchParams({
        action: action,
        callback: `jsonpCallback_${Date.now()}`,
        ...params
    });
    // Store callback globally
    window[`jsonpCallback_${Date.now()}`] = callback;
    script.src = `${API_CONFIG.PROXY_URL}?${urlParams.toString()}`;
    script.onerror = () => {
        console.error(`JSONP call failed for action: ${action}`);
    };
    document.body.appendChild(script);
    // Clean up after a delay
    setTimeout(() => {
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
    }, 10000);
}
//# sourceMappingURL=config.js.map