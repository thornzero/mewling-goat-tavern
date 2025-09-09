"use strict";
// Optimized Movie Poll Application with Direct Database Access
// This version can use either direct D1 access or API proxy
Object.defineProperty(exports, "__esModule", { value: true });
// Import error handling system
const error_handler_1 = require("../lib/error-handler");
const api_error_wrapper_1 = require("../lib/api-error-wrapper");
const ErrorBoundary_1 = require("../components/ErrorBoundary");
// State
let DEBUG = false;
let movieData = [];
let remaining = 0;
let swiper = null;
let searchAborted = false;
let moviesLoaded = false;
let userName = '';
let searchTimeout = null;
// Utility functions
function logging(message, level = 'info', data = null) {
    switch (level.toUpperCase()) {
        case 'DEBUG':
            if (DEBUG) {
                console.debug(message, data);
            }
            break;
        case 'INFO':
            console.info(message, data);
            break;
        case 'ERROR':
            console.error(message, data);
            break;
        case 'WARN':
            console.warn(message, data);
            break;
    }
}
// Enhanced API call with comprehensive error handling
const makeApiCall = (0, ErrorBoundary_1.withAsyncErrorBoundary)(async (action, params = {}, method = 'GET', body = null) => {
    const context = {
        component: 'MoviePoll',
        action: `API_${action}`,
        additionalData: { method, params, body }
    };
    try {
        const data = await (0, api_error_wrapper_1.makeApiCall)(action, params, method, body, context);
        logging(`API call successful: ${action}`, 'DEBUG', data);
        return data;
    }
    catch (error) {
        logging(`API call failed: ${action}`, 'ERROR', error);
        throw error;
    }
}, { component: 'MoviePoll', action: 'API_CALL' });
// Movie data management with enhanced error handling
const loadMovies = (0, ErrorBoundary_1.withAsyncErrorBoundary)(async () => {
    try {
        logging('Loading movies...', 'INFO');
        const response = await makeApiCall(window.API_CONFIG.ACTIONS.LIST_MOVIES);
        movieData = response.movies || [];
        remaining = movieData.length;
        moviesLoaded = true;
        logging(`Loaded ${movieData.length} movies`, 'INFO');
    }
    catch (error) {
        const appError = error_handler_1.errorHandler.handleError(error, {
            component: 'MoviePoll',
            action: 'LOAD_MOVIES',
            additionalData: { movieCount: movieData.length }
        }, 'Failed to load movies. Please refresh the page and try again.');
        // Show error UI
        showErrorUI('Failed to load movies. Please check your connection and try again.');
        throw appError;
    }
}, { component: 'MoviePoll', action: 'LOAD_MOVIES' });
// Error UI helper function
function showErrorUI(message) {
    const errorContainer = document.getElementById('error') || createErrorContainer();
    errorContainer.innerHTML = `
    <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
      <div class="mb-4">
        <svg class="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-red-400 mb-2">Error</h2>
      <p class="text-red-300 mb-4">${message}</p>
      <button 
        onclick="location.reload()"
        class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  `;
    errorContainer.classList.remove('hidden');
}
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'error';
    container.className = 'hidden max-w-4xl mx-auto px-4 py-8';
    document.body.appendChild(container);
    return container;
}
// Swiper initialization
function initializeSwiper() {
    if (swiper) {
        swiper.destroy(true, true);
    }
    const swiperContainer = document.querySelector('.swiper');
    if (!swiperContainer) {
        logging('Swiper container not found', 'ERROR');
        return;
    }
    swiper = new window.Swiper('.swiper', {
        direction: 'horizontal',
        loop: false,
        allowTouchMove: true,
        resistanceRatio: 0.85,
        on: {
            slideChange: () => {
                updateRemainingCount();
                updateProgressBar();
            },
            reachEnd: () => {
                showCompletionMessage();
            }
        }
    });
    logging('Swiper initialized', 'DEBUG');
}
// UI updates
function updateRemainingCount() {
    const remainingElement = document.getElementById('remaining');
    if (remainingElement) {
        remainingElement.textContent = remaining.toString();
    }
}
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && movieData.length > 0) {
        const progress = ((movieData.length - remaining) / movieData.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
}
function showCompletionMessage() {
    const completionMessage = document.getElementById('completion-message');
    if (completionMessage) {
        completionMessage.style.display = 'block';
    }
}
// Movie card creation
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'swiper-slide movie-card';
    card.dataset.movieId = movie.id.toString();
    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '/placeholder-poster.jpg';
    card.innerHTML = `
    <div class="movie-poster">
      <img src="${posterUrl}" alt="${movie.title}" loading="lazy">
    </div>
    <div class="movie-info">
      <h3 class="movie-title">${movie.title}</h3>
      <p class="movie-year">${movie.year}</p>
      <p class="movie-overview">${movie.overview}</p>
    </div>
    
    <!-- Voting Flow -->
    <div class="voting-flow">
      <!-- Step 1: Have you seen it? -->
      <div class="voting-step seen-question">
        <h3 class="text-lg font-medium mb-3">Have you seen this movie?</h3>
        <div class="flex gap-3">
          <button class="seen-yes-btn px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition">
            Yes, I've seen it
          </button>
          <button class="seen-no-btn px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition">
            No, I haven't seen it
          </button>
        </div>
      </div>
      
      <!-- Step 2a: Rating (if seen) -->
      <div class="voting-step rating hidden">
        <h3 class="text-lg font-medium mb-3">How did you like it?</h3>
        <div class="flex gap-3">
          <button class="rating-btn" data-vibe="1" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
            ⭐ Rewatch
          </button>
          <button class="rating-btn" data-vibe="2" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition">
            😐 Meh
          </button>
          <button class="rating-btn" data-vibe="3" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition">
            🚫 Hated it
          </button>
        </div>
      </div>
      
      <!-- Step 2b: Interest (if not seen) -->
      <div class="voting-step interest hidden">
        <h3 class="text-lg font-medium mb-3">Are you interested in watching it?</h3>
        <div class="flex gap-3">
          <button class="interest-btn" data-vibe="4" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
            🔥 Stoked
          </button>
          <button class="interest-btn" data-vibe="5" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
            ⏳ Indifferent
          </button>
          <button class="interest-btn" data-vibe="6" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition">
            🚫 Not interested
          </button>
        </div>
      </div>
      
      <!-- Step 3: Confirmation -->
      <div class="voting-step confirmation hidden">
        <h3 class="text-lg font-medium mb-3 text-green-400">✓ Vote recorded!</h3>
        <p class="text-gray-400">Swipe to continue voting</p>
      </div>
    </div>
  `;
    // Add event listeners
    const seenYesBtn = card.querySelector('.seen-yes-btn');
    const seenNoBtn = card.querySelector('.seen-no-btn');
    const ratingBtns = card.querySelectorAll('.rating-btn');
    const interestBtns = card.querySelectorAll('.interest-btn');
    seenYesBtn.addEventListener('click', () => {
        answerSeen(card, true);
    });
    seenNoBtn.addEventListener('click', () => {
        answerSeen(card, false);
    });
    ratingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const vibe = parseInt(btn.dataset.vibe || '0');
            submitVote(card, vibe, true);
        });
    });
    interestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const vibe = parseInt(btn.dataset.vibe || '0');
            submitVote(card, vibe, false);
        });
    });
    return card;
}
// Voting flow functions
function answerSeen(card, hasSeen) {
    const seenQuestion = card.querySelector('.seen-question');
    const rating = card.querySelector('.rating');
    const interest = card.querySelector('.interest');
    // Hide seen question
    seenQuestion.classList.add('hidden');
    // Show appropriate next step
    if (hasSeen) {
        rating.classList.remove('hidden');
    }
    else {
        interest.classList.remove('hidden');
    }
}
const submitVote = (0, ErrorBoundary_1.withAsyncErrorBoundary)(async (card, vibe, seen) => {
    const movieId = parseInt(card.dataset.movieId || '0');
    if (!userName) {
        error_handler_1.errorHandler.handleError(new Error('User name not provided'), { component: 'MoviePoll', action: 'SUBMIT_VOTE' }, 'Please enter your name first');
        return;
    }
    try {
        const response = await makeApiCall(window.API_CONFIG.ACTIONS.VOTE, {}, 'POST', {
            movie_id: movieId,
            user_name: userName,
            vibe: vibe,
            seen: seen
        });
        if (response.success) {
            card.classList.add('voted');
            updateProgressBar();
            // Show confirmation
            showConfirmation(card);
            // Auto-advance to next slide after a short delay
            setTimeout(() => {
                if (swiper && !swiper.isEnd) {
                    swiper.slideNext();
                }
            }, 1500);
        }
        else {
            throw new Error(response.message || 'Failed to record vote');
        }
    }
    catch (error) {
        const appError = error_handler_1.errorHandler.handleError(error, {
            component: 'MoviePoll',
            action: 'SUBMIT_VOTE',
            additionalData: { movieId, vibe, seen, userName }
        }, 'Failed to record your vote. Please try again.');
        // Show user-friendly error message
        showVoteError(card, appError.userMessage);
        throw appError;
    }
}, { component: 'MoviePoll', action: 'SUBMIT_VOTE' });
function showVoteError(card, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'vote-error bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4';
    errorDiv.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p class="text-red-300 text-sm">${message}</p>
    </div>
  `;
    // Insert error message at the top of the card
    const votingFlow = card.querySelector('.voting-flow');
    if (votingFlow) {
        votingFlow.insertBefore(errorDiv, votingFlow.firstChild);
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}
function showConfirmation(card) {
    const rating = card.querySelector('.rating');
    const interest = card.querySelector('.interest');
    const confirmation = card.querySelector('.confirmation');
    // Hide current step
    rating.classList.add('hidden');
    interest.classList.add('hidden');
    // Show confirmation
    confirmation.classList.remove('hidden');
}
// Legacy voting functionality (kept for compatibility)
async function handleVote(movieId, card) {
    const vibeSlider = card.querySelector('.vibe-slider');
    const seenCheck = card.querySelector('.seen-check');
    const voteButton = card.querySelector('.vote-button');
    const vibe = parseInt(vibeSlider.value);
    const seen = seenCheck.checked;
    if (!userName) {
        userName = prompt('Please enter your name:') || 'Anonymous';
    }
    try {
        voteButton.disabled = true;
        voteButton.textContent = 'Voting...';
        await makeApiCall(window.API_CONFIG.ACTIONS.VOTE, {}, 'POST', {
            movie_id: movieId,
            user_name: userName,
            vibe: vibe,
            seen: seen
        });
        // Move to next slide
        if (swiper) {
            swiper.slideNext();
        }
        remaining--;
        updateRemainingCount();
        updateProgressBar();
        logging(`Vote submitted for movie ${movieId}`, 'INFO', { vibe, seen, userName });
    }
    catch (error) {
        logging('Failed to submit vote', 'ERROR', error);
        alert('Failed to submit vote. Please try again.');
    }
    finally {
        voteButton.disabled = false;
        voteButton.textContent = 'Vote';
    }
}
// Search functionality
function handleSearchInput(event) {
    const input = event.target;
    const query = input.value.trim();
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    searchTimeout = window.setTimeout(() => {
        performSearch(query);
    }, 300);
}
async function performSearch(query) {
    if (searchAborted)
        return;
    try {
        logging(`Searching for: ${query}`, 'DEBUG');
        const response = await makeApiCall(window.API_CONFIG.ACTIONS.SEARCH, { query: query });
        displaySearchResults(response.results || []);
    }
    catch (error) {
        logging('Search failed', 'ERROR', error);
        hideSearchResults();
    }
}
function displaySearchResults(results) {
    const container = document.getElementById('search-results');
    if (!container)
        return;
    if (results.length === 0) {
        container.innerHTML = '<p>No movies found</p>';
        return;
    }
    container.innerHTML = results.map(movie => `
    <div class="search-result" data-movie-id="${movie.id}">
      <img src="${movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : '/placeholder-poster.jpg'}" 
           alt="${movie.title}" class="search-poster">
      <div class="search-info">
        <h4>${movie.title} (${movie.year})</h4>
        <p>${movie.overview}</p>
      </div>
    </div>
  `).join('');
    // Add click handlers
    container.querySelectorAll('.search-result').forEach(result => {
        result.addEventListener('click', () => {
            const movieId = parseInt(result.dataset.movieId || '0');
            addMovieToPoll(movieId);
        });
    });
    container.style.display = 'block';
}
function hideSearchResults() {
    const container = document.getElementById('search-results');
    if (container) {
        container.style.display = 'none';
    }
}
async function addMovieToPoll(movieId) {
    try {
        const response = await makeApiCall(window.API_CONFIG.ACTIONS.MOVIE, { id: movieId });
        const movie = response.movie;
        if (movie && !movieData.find(m => m.id === movie.id)) {
            movieData.push(movie);
            remaining++;
            // Add to swiper
            if (swiper) {
                const newCard = createMovieCard(movie);
                swiper.appendSlide(newCard);
            }
            updateRemainingCount();
            logging(`Added movie to poll: ${movie.title}`, 'INFO');
        }
    }
    catch (error) {
        logging('Failed to add movie to poll', 'ERROR', error);
    }
    // Clear search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    hideSearchResults();
}
// Batch voting
async function submitBatchVotes() {
    console.warn('Batch voting is not supported with the new step-by-step interface');
    alert('Batch voting is not available with the new voting interface. Please vote on movies individually.');
}
// Name entry form handling
function setupNameEntryForm() {
    const usernameInput = document.getElementById('username');
    const startButton = document.getElementById('start-poll-btn');
    const nameEntryScreen = document.getElementById('name-entry-screen');
    const moviePollScreen = document.getElementById('movie-poll-screen');
    const userGreeting = document.getElementById('user-greeting');
    if (!usernameInput || !startButton || !nameEntryScreen || !moviePollScreen) {
        logging('Name entry form elements not found', 'ERROR');
        return;
    }
    // Enable/disable start button based on input
    function updateStartButton() {
        const hasName = usernameInput.value.trim().length > 0;
        startButton.disabled = !hasName;
    }
    // Handle start button click
    function handleStartPoll() {
        const name = usernameInput.value.trim();
        if (!name)
            return;
        userName = name;
        // Show loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        // Start the poll
        startMoviePoll();
    }
    // Handle enter key
    function handleKeyPress(event) {
        if (event.key === 'Enter' && !startButton.disabled) {
            handleStartPoll();
        }
    }
    // Set up event listeners
    usernameInput.addEventListener('input', updateStartButton);
    usernameInput.addEventListener('keypress', handleKeyPress);
    startButton.addEventListener('click', handleStartPoll);
    // Initial state
    updateStartButton();
}
// Start the movie poll
async function startMoviePoll() {
    try {
        // Load movies
        await loadMovies();
        // Initialize swiper
        initializeSwiper();
        // Create movie cards
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (swiperWrapper) {
            movieData.forEach(movie => {
                const card = createMovieCard(movie);
                swiperWrapper.appendChild(card);
            });
        }
        // Set up event listeners
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearchInput);
        }
        const batchVoteButton = document.getElementById('batch-vote');
        if (batchVoteButton) {
            batchVoteButton.addEventListener('click', submitBatchVotes);
        }
        // Update UI
        updateRemainingCount();
        updateProgressBar();
        // Show user greeting
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            userGreeting.textContent = `Hello, ${userName}!`;
        }
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        // Transition to movie poll screen
        const nameEntryScreen = document.getElementById('name-entry-screen');
        const moviePollScreen = document.getElementById('movie-poll-screen');
        if (nameEntryScreen && moviePollScreen) {
            nameEntryScreen.classList.add('hidden');
            moviePollScreen.classList.remove('hidden');
        }
        logging('Movie poll started successfully', 'INFO');
    }
    catch (error) {
        logging('Failed to start movie poll', 'ERROR', error);
        alert('Failed to load the movie poll. Please refresh the page.');
        // Hide loading indicator on error
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}
// Initialize the application with error boundaries
const initializeApp = (0, ErrorBoundary_1.withAsyncErrorBoundary)(async () => {
    try {
        logging('Initializing movie poll app', 'INFO');
        // Set up error boundaries for main containers
        const nameEntryScreen = document.getElementById('name-entry-screen');
        const moviePollScreen = document.getElementById('movie-poll-screen');
        if (nameEntryScreen) {
            (0, ErrorBoundary_1.createErrorBoundary)(nameEntryScreen, {
                onError: (error, errorInfo) => {
                    error_handler_1.errorHandler.handleError(error, {
                        component: 'NameEntryScreen',
                        action: 'INITIALIZE',
                        additionalData: { errorInfo }
                    });
                }
            });
        }
        if (moviePollScreen) {
            (0, ErrorBoundary_1.createErrorBoundary)(moviePollScreen, {
                onError: (error, errorInfo) => {
                    error_handler_1.errorHandler.handleError(error, {
                        component: 'MoviePollScreen',
                        action: 'INITIALIZE',
                        additionalData: { errorInfo }
                    });
                }
            });
        }
        // Set up name entry form
        setupNameEntryForm();
        logging('App initialized successfully', 'INFO');
    }
    catch (error) {
        const appError = error_handler_1.errorHandler.handleError(error, {
            component: 'App',
            action: 'INITIALIZE'
        }, 'Failed to initialize the application. Please refresh the page.');
        showErrorUI(appError.userMessage);
        throw appError;
    }
}, { component: 'App', action: 'INITIALIZE' });
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
