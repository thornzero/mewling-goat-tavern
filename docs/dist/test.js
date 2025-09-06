/**
 * Test page functionality for Movie Poll API testing
 * Provides comprehensive testing interface for all API endpoints
 */
import { API_CONFIG, APP_CONFIG, makeApiCall } from './config.js';
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
    async testDebugStatus() {
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.DEBUG);
            this.logResult('debug-result', `Debug Status: ${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Debug Status', true, 'Debug status retrieved successfully', response);
        }
        catch (error) {
            this.logResult('debug-result', `Error fetching debug status:\n${error}`, 'error');
            this.addTestResult('Debug Status', false, `Failed to retrieve debug status: ${error}`, null);
        }
    }
    /**
     * Test movie list endpoint
     */
    async testMovieList() {
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.LIST_MOVIES);
            this.logResult('movies-result', `Movie List (${response.length} movies):\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie List', true, `Retrieved ${response.length} movies`, response);
        }
        catch (error) {
            this.logResult('movies-result', `Error fetching movie list:\n${error}`, 'error');
            this.addTestResult('Movie List', false, `Failed to retrieve movie list: ${error}`, null);
        }
    }
    /**
     * Test movie search endpoint
     */
    async testMovieSearch() {
        const query = document.getElementById('search-query')?.value || APP_CONFIG.TEST_DEFAULTS.SEARCH_QUERY;
        const year = document.getElementById('search-year')?.value || APP_CONFIG.TEST_DEFAULTS.SEARCH_YEAR;
        const params = { query: query };
        if (year)
            params.year = year;
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.SEARCH, params);
            this.logResult('search-result', `Search Results for "${query}" (${year || 'any year'}):\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie Search', true, `Found ${response.results?.length || 0} results for "${query}"`, response);
        }
        catch (error) {
            this.logResult('search-result', `Error searching for movies:\n${error}`, 'error');
            this.addTestResult('Movie Search', false, `Failed to search movies: ${error}`, null);
        }
    }
    /**
     * Test movie details endpoint
     */
    async testMovieDetails() {
        const movieId = document.getElementById('movie-id')?.value || APP_CONFIG.TEST_DEFAULTS.MOVIE_ID;
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.MOVIE, { id: movieId });
            this.logResult('movie-result', `Movie Details for ID ${movieId}:\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Movie Details', true, `Retrieved details for movie ID ${movieId}`, response);
        }
        catch (error) {
            this.logResult('movie-result', `Error fetching movie details:\n${error}`, 'error');
            this.addTestResult('Movie Details', false, `Failed to retrieve movie details: ${error}`, null);
        }
    }
    /**
     * Test movie videos endpoint (now included in movie details)
     */
    async testMovieVideos() {
        const videoId = document.getElementById('video-id')?.value || APP_CONFIG.TEST_DEFAULTS.MOVIE_ID;
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.MOVIE, { id: videoId });
            const videos = response.videos || [];
            this.logResult('videos-result', `Videos for Movie ID ${videoId}:\n${JSON.stringify(videos, null, 2)}`, 'success');
            this.addTestResult('Movie Videos', true, `Retrieved ${videos.length} videos for movie ID ${videoId}`, videos);
        }
        catch (error) {
            this.logResult('videos-result', `Error fetching videos for Movie ID ${videoId}:\n${error}`, 'error');
            this.addTestResult('Movie Videos', false, `Failed to retrieve videos: ${error}`, null);
        }
    }
    /**
     * Test single vote submission
     */
    async testSingleVote() {
        const vote = {
            timestamp: Date.now(),
            movieTitle: document.getElementById('test-movie-title')?.value || APP_CONFIG.TEST_DEFAULTS.MOVIE_TITLE,
            userName: document.getElementById('test-user')?.value || APP_CONFIG.TEST_DEFAULTS.USER_NAME,
            vibe: parseInt(document.getElementById('test-vibe')?.value || APP_CONFIG.TEST_DEFAULTS.VIBE.toString()),
            seen: document.getElementById('test-seen')?.value === 'true' || APP_CONFIG.TEST_DEFAULTS.SEEN
        };
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.VOTE, vote, 'POST');
            this.logResult('vote-result', `Single Vote Submitted:\nVote: ${JSON.stringify(vote, null, 2)}\nResponse: ${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Single Vote', true, 'Vote submitted successfully', { vote, response });
        }
        catch (error) {
            this.logResult('vote-result', `Error submitting vote:\n${error}`, 'error');
            this.addTestResult('Single Vote', false, `Failed to submit vote: ${error}`, null);
        }
    }
    /**
     * Test batch vote submission
     */
    async testBatchVote() {
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
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.BATCH_VOTE, { votes: JSON.stringify(votes) }, 'POST');
            this.logResult('vote-result', `Batch Vote Submitted:\nVotes: ${JSON.stringify(votes, null, 2)}\nResponse: ${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Batch Vote', true, `Submitted ${votes.length} votes successfully`, { votes, response });
        }
        catch (error) {
            this.logResult('vote-result', `Error submitting batch vote:\n${error}`, 'error');
            this.addTestResult('Batch Vote', false, `Failed to submit batch vote: ${error}`, null);
        }
    }
    /**
     * Test appeal calculation
     */
    async testAppealCalculation() {
        try {
            const response = await makeApiCall(API_CONFIG.ACTIONS.UPDATE_APPEAL);
            this.logResult('appeal-result', `Appeal Calculation Results:\n${JSON.stringify(response, null, 2)}`, 'success');
            this.addTestResult('Appeal Calculation', true, 'Appeal values calculated successfully', response);
        }
        catch (error) {
            this.logResult('appeal-result', `Error calculating appeal values:\n${error}`, 'error');
            this.addTestResult('Appeal Calculation', false, `Failed to calculate appeal values: ${error}`, null);
        }
    }
    /**
     * Run all tests sequentially
     */
    runAllTests() {
        this.testResults = [];
        this.logResult('all-tests-result', 'Running all tests...', 'info');
        // Run tests with delays
        setTimeout(async () => await this.testDebugStatus(), 100);
        setTimeout(async () => await this.testMovieList(), 500);
        setTimeout(async () => await this.testMovieSearch(), 1000);
        setTimeout(async () => await this.testMovieDetails(), 1500);
        setTimeout(async () => await this.testMovieVideos(), 2000);
        setTimeout(async () => await this.testSingleVote(), 2500);
        setTimeout(async () => await this.testBatchVote(), 3000);
        setTimeout(async () => await this.testAppealCalculation(), 3500);
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