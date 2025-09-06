/**
 * Test page functionality for Movie Poll API testing
 * Provides comprehensive testing interface for all API endpoints
 */
import { API_CONFIG, APP_CONFIG, makeJsonpCall } from './config.js';
class TestPage {
    constructor() {
        this.testResults = [];
        this.initializeEventListeners();
        this.loadDebugStatus();
    }
    /**
     * Initialize all event listeners for test buttons
     */
    initializeEventListeners() {
        document.getElementById('test-debug')?.addEventListener('click', () => this.testDebugStatus());
        document.getElementById('test-movies')?.addEventListener('click', () => this.testMovieList());
        document.getElementById('test-search')?.addEventListener('click', () => this.testMovieSearch());
        document.getElementById('test-movie')?.addEventListener('click', () => this.testMovieDetails());
        document.getElementById('test-videos')?.addEventListener('click', () => this.testMovieVideos());
        document.getElementById('test-single-vote')?.addEventListener('click', () => this.testSingleVote());
        document.getElementById('test-batch-vote')?.addEventListener('click', () => this.testBatchVote());
        document.getElementById('test-appeal')?.addEventListener('click', () => this.testAppealCalculation());
        document.getElementById('run-all-tests')?.addEventListener('click', () => this.runAllTests());
    }
    /**
     * Load debug status on page load
     */
    loadDebugStatus() {
        this.testDebugStatus();
    }
    /**
     * Test debug status endpoint
     */
    testDebugStatus() {
        makeJsonpCall(API_CONFIG.ACTIONS.DEBUG, {}, (response) => {
            this.logResult('debug-result', `Debug Status: ${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Debug Status', true, 'Debug status retrieved successfully', response);
        });
    }
    /**
     * Test movie list endpoint
     */
    testMovieList() {
        makeJsonpCall(API_CONFIG.ACTIONS.LIST_MOVIES, {}, (response) => {
            this.logResult('movies-result', `Movie List (${response.length} movies):\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie List', true, `Retrieved ${response.length} movies`, response);
        });
    }
    /**
     * Test movie search endpoint
     */
    testMovieSearch() {
        const query = document.getElementById('search-query')?.value || APP_CONFIG.TEST_DEFAULTS.SEARCH_QUERY;
        const year = document.getElementById('search-year')?.value || APP_CONFIG.TEST_DEFAULTS.SEARCH_YEAR;
        const params = { query: query };
        if (year)
            params.year = year;
        makeJsonpCall(API_CONFIG.ACTIONS.SEARCH, params, (response) => {
            this.logResult('search-result', `Search Results for "${query}" (${year || 'any year'}):\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie Search', true, `Found ${response.results?.length || 0} results for "${query}"`, response);
        });
    }
    /**
     * Test movie details endpoint
     */
    testMovieDetails() {
        const movieId = document.getElementById('movie-id')?.value || APP_CONFIG.TEST_DEFAULTS.MOVIE_ID;
        makeJsonpCall(API_CONFIG.ACTIONS.MOVIE, { id: movieId }, (response) => {
            this.logResult('movie-result', `Movie Details for ID ${movieId}:\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie Details', true, `Retrieved details for movie ID ${movieId}`, response);
        });
    }
    /**
     * Test movie videos endpoint
     */
    testMovieVideos() {
        const videoId = document.getElementById('video-id')?.value || APP_CONFIG.TEST_DEFAULTS.MOVIE_ID;
        makeJsonpCall(API_CONFIG.ACTIONS.VIDEOS, { id: videoId }, (response) => {
            this.logResult('videos-result', `Videos for Movie ID ${videoId}:\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie Videos', true, `Retrieved ${response.results?.length || 0} videos for movie ID ${videoId}`, response);
        });
    }
    /**
     * Test single vote submission
     */
    testSingleVote() {
        const vote = {
            timestamp: Date.now(),
            movieTitle: document.getElementById('test-movie-title')?.value || APP_CONFIG.TEST_DEFAULTS.MOVIE_TITLE,
            userName: document.getElementById('test-user')?.value || APP_CONFIG.TEST_DEFAULTS.USER_NAME,
            vibe: parseInt(document.getElementById('test-vibe')?.value || APP_CONFIG.TEST_DEFAULTS.VIBE.toString()),
            seen: document.getElementById('test-seen')?.value === 'true' || APP_CONFIG.TEST_DEFAULTS.SEEN
        };
        makeJsonpCall(API_CONFIG.ACTIONS.VOTE, vote, (response) => {
            this.logResult('vote-result', `Single Vote Submitted:\nVote: ${JSON.stringify(vote, null, 2)}\nResponse: ${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Single Vote', true, 'Vote submitted successfully', { vote, response });
        });
    }
    /**
     * Test batch vote submission
     */
    testBatchVote() {
        const votes = [
            {
                timestamp: Date.now(),
                movieTitle: "The Thing (1982)",
                userName: document.getElementById('test-user')?.value || APP_CONFIG.TEST_DEFAULTS.USER_NAME,
                vibe: 5,
                seen: true
            },
            {
                timestamp: Date.now() + 1000,
                movieTitle: "Predator (1987)",
                userName: document.getElementById('test-user')?.value || APP_CONFIG.TEST_DEFAULTS.USER_NAME,
                vibe: 4,
                seen: true
            },
            {
                timestamp: Date.now() + 2000,
                movieTitle: "Alien (1979)",
                userName: document.getElementById('test-user')?.value || APP_CONFIG.TEST_DEFAULTS.USER_NAME,
                vibe: 6,
                seen: true
            }
        ];
        makeJsonpCall(API_CONFIG.ACTIONS.BATCH_VOTE, { votes: JSON.stringify(votes) }, (response) => {
            this.logResult('vote-result', `Batch Vote Submitted:\nVotes: ${JSON.stringify(votes, null, 2)}\nResponse: ${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Batch Vote', true, `Submitted ${votes.length} votes successfully`, { votes, response });
        });
    }
    /**
     * Test appeal calculation
     */
    testAppealCalculation() {
        makeJsonpCall(API_CONFIG.ACTIONS.UPDATE_APPEAL, {}, (response) => {
            this.logResult('appeal-result', `Appeal Calculation Results:\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Appeal Calculation', true, 'Appeal values calculated successfully', response);
        });
    }
    /**
     * Run all tests sequentially
     */
    runAllTests() {
        this.testResults = [];
        this.logResult('all-tests-result', 'Running all tests...', 'info');
        // Run tests with delays
        setTimeout(() => this.testDebugStatus(), 100);
        setTimeout(() => this.testMovieList(), 500);
        setTimeout(() => this.testMovieSearch(), 1000);
        setTimeout(() => this.testMovieDetails(), 1500);
        setTimeout(() => this.testMovieVideos(), 2000);
        setTimeout(() => this.testSingleVote(), 2500);
        setTimeout(() => this.testBatchVote(), 3000);
        setTimeout(() => this.testAppealCalculation(), 3500);
        // Show results after all tests complete
        setTimeout(() => {
            const successCount = this.testResults.filter(r => r.success).length;
            const totalCount = this.testResults.length;
            const summary = this.testResults.map(r => `${r.success ? '✅' : '❌'} ${r.test}: ${r.message}`).join('\n');
            this.logResult('all-tests-result', `Test Results Summary:\n${successCount}/${totalCount} tests passed\n\n${summary}`, successCount === totalCount ? 'success' : 'warning');
        }, 4000);
    }
    /**
     * Log result to a specific element
     */
    logResult(elementId, message, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
            element.className = `test-result ${type}`;
            element.textContent = message;
        }
    }
    /**
     * Add test result to tracking array
     */
    addTestResult(testName, success, message, data) {
        this.testResults.push({
            test: testName,
            success: success,
            message: message,
            data: data,
            timestamp: new Date().toISOString()
        });
    }
}
// Initialize test page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestPage();
});
//# sourceMappingURL=test.js.map