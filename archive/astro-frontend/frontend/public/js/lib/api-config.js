/**
 * Shared API configuration for frontend scripts
 */
// Global API configuration - accessible to all scripts
window.API_CONFIG = {
    PROXY_URL: typeof window !== 'undefined' ? window.location.origin : '',
    ACTIONS: {
        DEBUG: '/api?action=debug',
        LIST_MOVIES: '/api?action=listMovies',
        SEARCH: '/api?action=search',
        MOVIE: '/api?action=movie',
        VOTE: '/api?action=vote',
        BATCH_VOTE: '/api?action=batchVote',
        UPDATE_APPEAL: '/api?action=updateAppeal'
    }
};
