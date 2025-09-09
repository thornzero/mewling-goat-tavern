// Optimized Movie Poll Application with Lazy Loading
// This version uses dynamic imports to reduce initial bundle size
// State
let DEBUG = false;
let movieData = [];
let remaining = 0;
let swiper = null;
let searchAborted = false;
let moviesLoaded = false;
let userName = '';
let searchTimeout = null;
// Lazy loaded modules
let errorHandler = null;
let inputValidator = null;
let inputSecurity = null;
let formValidator = null;
let apiErrorWrapper = null;
let errorBoundary = null;
// Utility functions
function logging(message, level = 'info', data = null) {
    if (!DEBUG && level === 'DEBUG')
        return;
    switch (level.toUpperCase()) {
        case 'DEBUG':
            console.log(message, data);
            break;
        case 'INFO':
            console.info(message, data);
            break;
        case 'WARN':
            console.warn(message, data);
            break;
        case 'ERROR':
            console.error(message, data);
            break;
        default:
            console.log(message, data);
    }
}
// Lazy load modules when needed
async function ensureErrorHandler() {
    if (!errorHandler) {
        const { errorHandler: handler } = await import('../lib/error-handler');
        errorHandler = handler;
    }
    return errorHandler;
}
async function ensureInputValidator() {
    if (!inputValidator) {
        const { inputValidator: validator } = await import('../lib/input-validation');
        inputValidator = validator;
    }
    return inputValidator;
}
async function ensureInputSecurity() {
    if (!inputSecurity) {
        const { inputSecurity: security } = await import('../lib/input-security');
        inputSecurity = security;
    }
    return inputSecurity;
}
async function ensureFormValidator() {
    if (!formValidator) {
        const { createFormValidator: validator } = await import('../components/FormValidator');
        formValidator = validator;
    }
    return formValidator;
}
async function ensureApiErrorWrapper() {
    if (!apiErrorWrapper) {
        const { apiErrorWrapper: wrapper } = await import('../lib/api-error-wrapper');
        apiErrorWrapper = wrapper;
    }
    return apiErrorWrapper;
}
async function ensureErrorBoundary() {
    if (!errorBoundary) {
        const { createErrorBoundary: boundary } = await import('../components/ErrorBoundary');
        errorBoundary = boundary;
    }
    return errorBoundary;
}
// Enhanced API call with lazy-loaded error handling
async function makeApiCall(action, params = {}, method = 'GET', body = null) {
    const url = new URL(`${window.API_CONFIG.PROXY_URL}/${action}`);
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
    logging(`Making API call: ${method} ${url.toString()}`, 'DEBUG', { params, body });
    try {
        const response = await fetch(url.toString(), options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        logging(`API call successful: ${action}`, 'DEBUG', data);
        return data;
    }
    catch (error) {
        logging(`API call failed: ${action}`, 'ERROR', error);
        // Load error handler only when needed
        const handler = await ensureErrorHandler();
        handler.handleError(error, {
            component: 'MoviePoll',
            action: `API_${action}`,
            additionalData: { method, params, body }
        });
        throw error;
    }
}
// Movie data management with lazy-loaded error handling
async function loadMovies() {
    try {
        logging('Loading movies...', 'INFO');
        const response = await makeApiCall(window.API_CONFIG.ACTIONS.LIST_MOVIES);
        movieData = response.movies || [];
        remaining = movieData.length;
        moviesLoaded = true;
        logging(`Loaded ${movieData.length} movies`, 'INFO');
    }
    catch (error) {
        const handler = await ensureErrorHandler();
        const appError = handler.handleError(error, {
            component: 'MoviePoll',
            action: 'LOAD_MOVIES',
            additionalData: { movieCount: movieData.length }
        }, 'Failed to load movies. Please refresh the page and try again.');
        // Show error UI
        showErrorUI(appError.userMessage);
        throw appError;
    }
}
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
// Mobile-optimized Swiper initialization
async function initializeSwiper() {
    if (swiper) {
        swiper.destroy();
    }
    const swiperContainer = document.querySelector('.swiper');
    if (!swiperContainer) {
        logging('Swiper container not found', 'ERROR');
        return;
    }
    // Load mobile swiper configuration
    const { createMobileSwiper } = await import('../lib/mobile-swiper');
    swiper = createMobileSwiper(swiperContainer, {
        onSlideChange: () => {
            updateRemainingCount();
            updateProgressBar();
        },
        onReachEnd: () => {
            showCompletionMessage();
        }
    });
    swiper.init();
}
// Update remaining count
function updateRemainingCount() {
    const remainingElement = document.getElementById('remaining');
    if (remainingElement) {
        remainingElement.textContent = `${remaining} movies remaining`;
    }
}
// Update progress bar
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && movieData.length > 0) {
        const progress = ((movieData.length - remaining) / movieData.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
}
// Show completion message
function showCompletionMessage() {
    const completionMessage = document.getElementById('completion-message');
    if (completionMessage) {
        completionMessage.classList.remove('hidden');
    }
}
// Create movie card with lazy-loaded validation
async function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'swiper-slide movie-card';
    card.dataset.movieId = movie.id.toString();
    const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '/placeholder-poster.jpg';
    card.innerHTML = `
    <div class="movie-poster">
      <img src="${posterUrl}" alt="${movie.title} poster" loading="lazy">
    </div>
    <div class="movie-info">
      <h3 class="movie-title">${movie.title}</h3>
      <p class="movie-year">${movie.year}</p>
      <p class="movie-overview">${movie.overview}</p>
    </div>
    <div class="voting-flow">
      <div class="voting-step rating">
        <h3>How do you feel about this movie?</h3>
        <div class="flex">
          <button class="rating-btn" data-vibe="1">Hated it</button>
          <button class="rating-btn" data-vibe="2">Disliked it</button>
          <button class="rating-btn" data-vibe="3">It was okay</button>
        </div>
      </div>
      <div class="voting-step interest hidden">
        <h3>How interested are you in this movie?</h3>
        <div class="flex">
          <button class="interest-btn" data-vibe="4">Liked it</button>
          <button class="interest-btn" data-vibe="5">Loved it</button>
          <button class="interest-btn" data-vibe="6">Masterpiece</button>
        </div>
      </div>
      <div class="voting-step seen hidden">
        <h3>Have you seen this movie?</h3>
        <div class="flex">
          <button class="seen-yes-btn">Yes, I've seen it</button>
          <button class="seen-no-btn">No, I haven't seen it</button>
        </div>
      </div>
      <div class="confirmation hidden">
        <h3>✓ Vote recorded!</h3>
        <p>Thank you for your vote.</p>
      </div>
    </div>
  `;
    // Add event listeners with lazy-loaded validation
    setupVotingEventListeners(card);
    return card;
}
// Setup voting event listeners with lazy-loaded validation
async function setupVotingEventListeners(card) {
    const ratingButtons = card.querySelectorAll('.rating-btn');
    const interestButtons = card.querySelectorAll('.interest-btn');
    const seenButtons = card.querySelectorAll('.seen-yes-btn, .seen-no-btn');
    ratingButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const vibe = parseInt(button.getAttribute('data-vibe') || '0');
            await handleRatingClick(card, vibe);
        });
    });
    interestButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const vibe = parseInt(button.getAttribute('data-vibe') || '0');
            await handleInterestClick(card, vibe);
        });
    });
    seenButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const seen = button.classList.contains('seen-yes-btn');
            await handleSeenClick(card, seen);
        });
    });
}
// Handle rating click with validation
async function handleRatingClick(card, vibe) {
    // Load validation only when needed
    const validator = await ensureInputValidator();
    const security = await ensureInputSecurity();
    // Validate vibe rating
    const validationResult = validator.validateField({
        name: 'vibe',
        value: vibe,
        rules: [
            { rule: 'REQUIRED', message: 'Vibe rating is required' },
            { rule: 'INTEGER', message: 'Vibe rating must be a whole number' },
            { rule: 'RANGE', value: { min: 1, max: 6 }, message: 'Vibe rating must be between 1 and 6' }
        ],
        required: true,
        label: 'Vibe Rating'
    });
    if (!validationResult.isValid) {
        showVoteError(card, validationResult.errors[0]);
        return;
    }
    // Sanitize and proceed
    const sanitizedVibe = security.sanitizeText(validationResult.sanitizedValue || vibe);
    // Show interest step
    const rating = card.querySelector('.rating');
    const interest = card.querySelector('.interest');
    if (rating && interest) {
        rating.classList.add('hidden');
        interest.classList.remove('hidden');
    }
}
// Handle interest click with validation
async function handleInterestClick(card, vibe) {
    // Load validation only when needed
    const validator = await ensureInputValidator();
    const security = await ensureInputSecurity();
    // Validate vibe rating
    const validationResult = validator.validateField({
        name: 'vibe',
        value: vibe,
        rules: [
            { rule: 'REQUIRED', message: 'Vibe rating is required' },
            { rule: 'INTEGER', message: 'Vibe rating must be a whole number' },
            { rule: 'RANGE', value: { min: 1, max: 6 }, message: 'Vibe rating must be between 1 and 6' }
        ],
        required: true,
        label: 'Vibe Rating'
    });
    if (!validationResult.isValid) {
        showVoteError(card, validationResult.errors[0]);
        return;
    }
    // Sanitize and proceed
    const sanitizedVibe = security.sanitizeText(validationResult.sanitizedValue || vibe);
    // Show seen step
    const interest = card.querySelector('.interest');
    const seen = card.querySelector('.seen');
    if (interest && seen) {
        interest.classList.add('hidden');
        seen.classList.remove('hidden');
    }
}
// Handle seen click with validation
async function handleSeenClick(card, seen) {
    // Load validation and error handling only when needed
    const validator = await ensureInputValidator();
    const security = await ensureInputSecurity();
    const handler = await ensureErrorHandler();
    const movieId = parseInt(card.dataset.movieId || '0');
    const vibe = 4; // Default vibe for now, would be captured from previous steps
    // Validate inputs
    const validationResults = validator.validateFields([
        {
            name: 'userName',
            value: userName,
            rules: [
                { rule: 'REQUIRED', message: 'Username is required' },
                { rule: 'MIN_LENGTH', value: 2, message: 'Username must be at least 2 characters' },
                { rule: 'MAX_LENGTH', value: 50, message: 'Username must be no more than 50 characters' },
                { rule: 'SAFE_TEXT', sanitize: true, message: 'Username contains unsafe content' }
            ],
            required: true,
            label: 'Username'
        },
        {
            name: 'movieId',
            value: movieId,
            rules: [
                { rule: 'REQUIRED', message: 'Movie ID is required' },
                { rule: 'INTEGER', message: 'Movie ID must be a valid number' },
                { rule: 'RANGE', value: { min: 1 }, message: 'Movie ID must be a positive number' }
            ],
            required: true,
            label: 'Movie ID'
        }
    ]);
    // Check for validation errors
    const userNameResult = validationResults.get('userName');
    const movieIdResult = validationResults.get('movieId');
    if (!userNameResult?.isValid) {
        handler.handleError(new Error('Invalid username'), { component: 'MoviePoll', action: 'SUBMIT_VOTE' }, userNameResult?.errors[0] || 'Please enter a valid username');
        return;
    }
    if (!movieIdResult?.isValid) {
        handler.handleError(new Error('Invalid movie ID'), { component: 'MoviePoll', action: 'SUBMIT_VOTE' }, movieIdResult?.errors[0] || 'Invalid movie selection');
        return;
    }
    // Sanitize inputs
    const sanitizedUserName = security.sanitizeText(userName || '');
    const sanitizedMovieId = movieIdResult.sanitizedValue || movieId;
    try {
        const response = await makeApiCall(window.API_CONFIG.ACTIONS.VOTE, {}, 'POST', {
            movie_id: sanitizedMovieId,
            user_name: sanitizedUserName,
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
        const appError = handler.handleError(error, {
            component: 'MoviePoll',
            action: 'SUBMIT_VOTE',
            additionalData: { movieId: sanitizedMovieId, vibe, seen, userName: sanitizedUserName }
        }, 'Failed to record your vote. Please try again.');
        // Show user-friendly error message
        showVoteError(card, appError.userMessage);
    }
}
// Show vote error
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
// Show confirmation
function showConfirmation(card) {
    const rating = card.querySelector('.rating');
    const interest = card.querySelector('.interest');
    const seen = card.querySelector('.seen');
    const confirmation = card.querySelector('.confirmation');
    // Hide current step
    rating.classList.add('hidden');
    interest.classList.add('hidden');
    seen.classList.add('hidden');
    // Show confirmation
    confirmation.classList.remove('hidden');
}
// Search functionality with lazy-loaded validation
async function handleSearchInput(event) {
    const input = event.target;
    const query = input.value.trim();
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    // Load validation only when needed
    const validator = await ensureInputValidator();
    const security = await ensureInputSecurity();
    // Validate search query
    const validationResult = validator.validateField({
        name: 'search',
        value: query,
        rules: [
            { rule: 'MIN_LENGTH', value: 2, message: 'Search query must be at least 2 characters' },
            { rule: 'MAX_LENGTH', value: 100, message: 'Search query must be no more than 100 characters' },
            { rule: 'SAFE_TEXT', sanitize: true, message: 'Search query contains unsafe content' }
        ],
        required: false,
        label: 'Search Query'
    });
    if (!validationResult.isValid) {
        // Show validation error
        showSearchError(validationResult.errors[0]);
        return;
    }
    // Sanitize search query
    const sanitizedQuery = security.sanitizeText(validationResult.sanitizedValue || query);
    if (sanitizedQuery.length < 2) {
        hideSearchResults();
        return;
    }
    searchTimeout = window.setTimeout(() => {
        performSearch(sanitizedQuery);
    }, 300);
}
// Show search error
function showSearchError(message) {
    const searchContainer = document.getElementById('search-container');
    if (!searchContainer)
        return;
    // Remove existing error
    const existingError = searchContainer.querySelector('.search-error');
    if (existingError) {
        existingError.remove();
    }
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'search-error bg-red-900/20 border border-red-500/30 rounded-lg p-2 mb-2';
    errorDiv.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p class="text-red-300 text-xs">${message}</p>
    </div>
  `;
    // Insert error message
    searchContainer.insertBefore(errorDiv, searchContainer.firstChild);
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
}
// Perform search
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
// Display search results
function displaySearchResults(results) {
    // Implementation would go here
    console.log('Search results:', results);
}
// Hide search results
function hideSearchResults() {
    // Implementation would go here
}
// Name entry form handling with lazy-loaded validation
async function setupNameEntryForm() {
    const usernameInput = document.getElementById('username');
    const startButton = document.getElementById('start-poll-btn');
    const nameEntryScreen = document.getElementById('name-entry-screen');
    const moviePollScreen = document.getElementById('movie-poll-screen');
    const userGreeting = document.getElementById('user-greeting');
    const form = document.querySelector('form');
    if (!usernameInput || !startButton || !nameEntryScreen || !moviePollScreen || !form) {
        logging('Name entry form elements not found', 'ERROR');
        return;
    }
    // Load form validator only when needed
    const validator = await ensureFormValidator();
    const security = await ensureInputSecurity();
    // Set up form validation
    const nameFormValidator = validator(form, {
        showErrors: true,
        highlightInvalid: true,
        preventSubmit: true,
        realTimeValidation: true
    });
    // Add username field validation
    nameFormValidator.addField({
        name: 'username',
        element: usernameInput,
        rules: [
            { rule: 'REQUIRED', message: 'Username is required' },
            { rule: 'MIN_LENGTH', value: 2, message: 'Username must be at least 2 characters' },
            { rule: 'MAX_LENGTH', value: 50, message: 'Username must be no more than 50 characters' },
            { rule: 'SAFE_TEXT', sanitize: true, message: 'Username contains unsafe content' }
        ],
        required: true,
        label: 'Username'
    });
    // Enable/disable start button based on validation
    function updateStartButton() {
        const validationResult = nameFormValidator.getFieldResult('username');
        const isValid = validationResult?.isValid || false;
        startButton.disabled = !isValid;
    }
    // Handle start button click
    function handleStartPoll() {
        // Validate form before proceeding
        if (!nameFormValidator.validateAll()) {
            return;
        }
        const name = usernameInput.value.trim();
        if (!name)
            return;
        // Sanitize username
        const sanitizedName = security.sanitizeText(name);
        userName = sanitizedName;
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
        // Initialize Swiper
        await initializeSwiper();
        // Create movie cards
        const movieCarousel = document.getElementById('movie-carousel');
        if (!movieCarousel) {
            throw new Error('Movie carousel not found');
        }
        // Clear existing content
        movieCarousel.innerHTML = '';
        // Create cards for each movie
        for (const movie of movieData) {
            const card = await createMovieCard(movie);
            movieCarousel.appendChild(card);
        }
        // Show movie poll screen
        const nameEntryScreen = document.getElementById('name-entry-screen');
        const moviePollScreen = document.getElementById('movie-poll-screen');
        const userGreeting = document.getElementById('user-greeting');
        if (nameEntryScreen && moviePollScreen) {
            nameEntryScreen.classList.add('hidden');
            moviePollScreen.classList.remove('hidden');
        }
        if (userGreeting) {
            userGreeting.textContent = `Hello, ${userName}!`;
        }
        // Update UI
        updateRemainingCount();
        updateProgressBar();
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        logging('Movie poll started successfully', 'INFO');
    }
    catch (error) {
        logging('Failed to start movie poll', 'ERROR', error);
        const handler = await ensureErrorHandler();
        const appError = handler.handleError(error, {
            component: 'MoviePoll',
            action: 'START_POLL'
        }, 'Failed to load the movie poll. Please refresh the page.');
        showErrorUI(appError.userMessage);
        // Hide loading indicator on error
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}
// Initialize the application with lazy loading
async function initializeApp() {
    try {
        logging('Initializing movie poll app', 'INFO');
        // Preload critical modules on user interaction
        const { preloadCriticalModules } = await import('../lib/lazy-loader');
        preloadCriticalModules();
        // Set up name entry form
        await setupNameEntryForm();
        logging('App initialized successfully', 'INFO');
    }
    catch (error) {
        logging('Failed to initialize app', 'ERROR', error);
        const handler = await ensureErrorHandler();
        const appError = handler.handleError(error, {
            component: 'App',
            action: 'INITIALIZE'
        }, 'Failed to initialize the application. Please refresh the page.');
        showErrorUI(appError.userMessage);
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
