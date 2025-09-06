/**
 * Results page functionality for Movie Poll
 * Displays movies ranked by appeal rating with comprehensive statistics
 */
import { API_CONFIG, APP_CONFIG, makeJsonpCall } from './config.js';
/**
 * Results page controller class
 */
class ResultsPage {
    constructor() {
        this.moviesData = [];
        this.appealData = null;
        this.loadResults();
        this.setupAutoRefresh();
    }
    /**
     * Load results data from API
     */
    loadResults() {
        this.showLoading();
        this.hideError();
        this.hideResults();
        Promise.all([
            this.loadMovies(),
            this.loadAppealData()
        ]).then(() => {
            this.displayResults();
        }).catch(error => {
            console.error('Error loading results:', error);
            this.showError('Failed to load poll results. Please check your connection and try again.');
        });
    }
    /**
     * Load movies from API
     */
    loadMovies() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Movies loading timeout'));
            }, 10000); // 10 second timeout
            makeJsonpCall(API_CONFIG.ACTIONS.LIST_MOVIES, {}, (response) => {
                clearTimeout(timeout);
                try {
                    // Convert string array to MovieResponse array
                    this.moviesData = (response || []).map((title) => {
                        const match = title.match(/(.+?)\s*\((\d{4})\)$/);
                        const parsedTitle = match ? match[1].trim() : title;
                        const year = match ? match[2] : '';
                        return {
                            title: parsedTitle,
                            year: year ? parseInt(year) : undefined,
                            genre: undefined,
                            director: undefined
                        };
                    });
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    /**
     * Load appeal data from API
     */
    loadAppealData() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Appeal data loading timeout'));
            }, 10000); // 10 second timeout
            makeJsonpCall(API_CONFIG.ACTIONS.UPDATE_APPEAL, {}, (response) => {
                clearTimeout(timeout);
                this.appealData = response;
                resolve();
            });
        });
    }
    /**
     * Display results on the page
     */
    displayResults() {
        if (!this.moviesData.length) {
            this.showError('No movies found in the poll.');
            return;
        }
        // Merge movies with appeal data
        const moviesWithAppeal = this.mergeMoviesWithAppeal();
        // Sort by appeal (highest to lowest)
        moviesWithAppeal.sort((a, b) => (b.appeal.appeal || 0) - (a.appeal.appeal || 0));
        // Update summary stats
        this.updateSummaryStats(moviesWithAppeal);
        // Display movies
        this.displayMovies(moviesWithAppeal);
        this.hideLoading();
        this.showResults();
    }
    /**
     * Merge movies with their appeal data
     */
    mergeMoviesWithAppeal() {
        return this.moviesData.map(movie => {
            // Find matching appeal data by title
            const appealEntry = Object.entries(this.appealData?.movies || {}).find(([title]) => {
                // Try exact match first
                if (title.toLowerCase().trim() === movie.title.toLowerCase().trim()) {
                    return true;
                }
                // Try normalized match (remove year)
                const normalizedTitle = title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                const normalizedMovieTitle = movie.title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                return normalizedTitle.toLowerCase() === normalizedMovieTitle.toLowerCase();
            });
            const appeal = appealEntry ? appealEntry[1] : null;
            return {
                ...movie,
                appeal: appeal ? {
                    appeal: appeal.finalAppeal || 0,
                    voters: appeal.totalVoters || 0,
                    totalAppeal: appeal.originalAppeal || 0,
                    seenCount: appeal.seenCount || 0,
                    visibilityRatio: appeal.visibilityRatio || 0
                } : {
                    appeal: 0,
                    voters: 0,
                    totalAppeal: 0,
                    seenCount: 0,
                    visibilityRatio: 0
                }
            };
        });
    }
    /**
     * Update summary statistics
     */
    updateSummaryStats(movies) {
        const totalMovies = movies.length;
        const totalVotes = movies.reduce((sum, movie) => sum + (movie.appeal.voters || 0), 0);
        const uniqueVoters = this.appealData?.totalUniqueVoters || 0;
        const lastUpdated = new Date().toLocaleString();
        this.updateElement('total-movies', totalMovies.toString());
        this.updateElement('total-votes', totalVotes.toString());
        this.updateElement('unique-voters', uniqueVoters.toString());
        this.updateElement('last-updated', lastUpdated);
    }
    /**
     * Display movies in the results list
     */
    displayMovies(movies) {
        const container = document.getElementById('movies-list');
        if (!container)
            return;
        container.innerHTML = '';
        movies.forEach((movie, index) => {
            const rank = index + 1;
            const appeal = movie.appeal.appeal || 0;
            const voters = movie.appeal.voters || 0;
            const totalAppeal = movie.appeal.totalAppeal || 0;
            // Determine appeal level for styling
            let appealClass = 'appeal-unknown';
            if (appeal >= 4)
                appealClass = 'appeal-high';
            else if (appeal >= 2)
                appealClass = 'appeal-medium';
            else if (appeal > 0)
                appealClass = 'appeal-low';
            const movieCard = document.createElement('div');
            movieCard.className = `movie-card ${appealClass} bg-gray-800 rounded-lg p-6 shadow-lg`;
            movieCard.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-4 flex-1">
                        <div class="rank-badge">
                            ${rank}
                        </div>
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-white mb-2">${movie.title}</h3>
                            <div class="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                                <span>Year: ${movie.year || 'Unknown'}</span>
                                <span>Genre: ${movie.genre || 'Unknown'}</span>
                                <span>Director: ${movie.director || 'Unknown'}</span>
                            </div>
                            <div class="flex flex-wrap gap-4 text-sm">
                                <div class="vote-count">
                                    <span class="text-gray-400">Votes:</span>
                                    <span class="text-white font-semibold ml-1">${voters}</span>
                                </div>
                                <div class="vote-count">
                                    <span class="text-gray-400">Total Appeal:</span>
                                    <span class="text-white font-semibold ml-1">${totalAppeal.toFixed(1)}</span>
                                </div>
                                <div class="vote-count">
                                    <span class="text-gray-400">Seen:</span>
                                    <span class="text-white font-semibold ml-1">${movie.appeal.seenCount || 0}</span>
                                </div>
                                <div class="vote-count">
                                    <span class="text-gray-400">Visibility:</span>
                                    <span class="text-white font-semibold ml-1">${((movie.appeal.visibilityRatio || 0) * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="appeal-score">
                            ${appeal.toFixed(1)}
                        </div>
                        <div class="text-sm text-gray-400 mt-1">Appeal Rating</div>
                    </div>
                </div>
            `;
            container.appendChild(movieCard);
        });
    }
    /**
     * Setup auto-refresh functionality
     */
    setupAutoRefresh() {
        setInterval(() => {
            this.loadResults();
        }, APP_CONFIG.RESULTS_REFRESH_INTERVAL);
    }
    /**
     * Update element text content
     */
    updateElement(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }
    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading')?.classList.remove('hidden');
    }
    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loading')?.classList.add('hidden');
    }
    /**
     * Show error state
     */
    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
        document.getElementById('error')?.classList.remove('hidden');
        this.hideLoading();
    }
    /**
     * Hide error state
     */
    hideError() {
        document.getElementById('error')?.classList.add('hidden');
    }
    /**
     * Show results content
     */
    showResults() {
        document.getElementById('results-content')?.classList.remove('hidden');
    }
    /**
     * Hide results content
     */
    hideResults() {
        document.getElementById('results-content')?.classList.add('hidden');
    }
}
// Initialize results page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResultsPage();
});
//# sourceMappingURL=results.js.map