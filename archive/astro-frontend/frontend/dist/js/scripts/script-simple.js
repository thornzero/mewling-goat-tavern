"use strict";
/**
 * Simplified Movie Poll Script using Astro Actions
 * Clean, maintainable code without complex error handling cruft
 */
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../lib/api-client");
// Global state
let movieData = [];
let remaining = 0;
let moviesLoaded = false;
let userName = '';
let swiper = null;
// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing movie poll app');
    // Set up name entry form
    setupNameEntryForm();
    console.log('App initialized successfully');
});
// Set up name entry form
function setupNameEntryForm() {
    const usernameInput = document.getElementById('username');
    const startButton = document.getElementById('start-poll-btn');
    const form = document.querySelector('form');
    if (!usernameInput || !startButton || !form) {
        console.error('Name entry form elements not found');
        return;
    }
    // Enable/disable start button based on input
    function updateStartButton() {
        const isValid = usernameInput.value.trim().length >= 2;
        startButton.disabled = !isValid;
    }
    // Handle start button click
    function handleStartPoll() {
        const name = usernameInput.value.trim();
        if (!name)
            return;
        userName = name;
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
        // Show loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        // Load movies using Astro actions
        console.log('Loading movies...');
        const response = await api_client_1.ApiClient.listMovies();
        movieData = response.movies || [];
        remaining = movieData.length;
        moviesLoaded = true;
        console.log(`Loaded ${movieData.length} movies`);
        // Initialize Swiper
        initializeSwiper();
        // Create movie cards
        const movieCarousel = document.getElementById('movie-carousel');
        if (!movieCarousel) {
            throw new Error('Movie carousel not found');
        }
        // Clear existing content
        movieCarousel.innerHTML = '';
        // Create cards for each movie
        for (const movie of movieData) {
            const card = createMovieCard(movie);
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
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
        console.log('Movie poll started successfully');
    }
    catch (error) {
        console.error('Failed to start movie poll', error);
        // Show error message
        showErrorUI('Failed to load the movie poll. Please refresh the page.');
        // Hide loading indicator on error
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}
// Initialize Swiper
function initializeSwiper() {
    if (swiper) {
        swiper.destroy(true, true);
    }
    const swiperContainer = document.querySelector('.swiper');
    if (!swiperContainer) {
        console.error('Swiper container not found');
        return;
    }
    swiper = new window.Swiper('.swiper', {
        direction: 'horizontal',
        loop: false,
        allowTouchMove: true,
        resistanceRatio: 0.85,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
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
}
// Create movie card
function createMovieCard(movie) {
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
            <p class="movie-overview">${movie.overview || 'No overview available'}</p>
        </div>
        <div class="voting-flow">
            <div class="voting-step rating">
                <h3>How does this movie make you feel?</h3>
                <div class="flex">
                    <button class="rating-btn" data-vibe="1">Hate it</button>
                    <button class="rating-btn" data-vibe="2">Dislike</button>
                    <button class="rating-btn" data-vibe="3">Meh</button>
                    <button class="rating-btn" data-vibe="4">Like it</button>
                    <button class="rating-btn" data-vibe="5">Love it</button>
                    <button class="rating-btn" data-vibe="6">Obsessed</button>
                </div>
            </div>
            <div class="voting-step interest hidden">
                <h3>How interested are you in watching this?</h3>
                <div class="flex">
                    <button class="interest-btn" data-vibe="4">Not interested</button>
                    <button class="interest-btn" data-vibe="5">Somewhat interested</button>
                    <button class="interest-btn" data-vibe="6">Very interested</button>
                </div>
            </div>
            <div class="voting-step seen hidden">
                <h3>Have you seen this movie?</h3>
                <div class="flex">
                    <button class="seen-yes-btn">Yes</button>
                    <button class="seen-no-btn">No</button>
                </div>
            </div>
            <div class="voting-step confirmation hidden">
                <h3>✅ Vote recorded!</h3>
                <p>Thank you for your vote!</p>
            </div>
        </div>
    `;
    // Add event listeners
    setupVotingEventListeners(card);
    return card;
}
// Setup voting event listeners
function setupVotingEventListeners(card) {
    const ratingButtons = card.querySelectorAll('.rating-btn');
    const interestButtons = card.querySelectorAll('.interest-btn');
    const seenButtons = card.querySelectorAll('.seen-yes-btn, .seen-no-btn');
    ratingButtons.forEach(button => {
        button.addEventListener('click', () => {
            const vibe = parseInt(button.getAttribute('data-vibe') || '0');
            handleRatingClick(card, vibe);
        });
    });
    interestButtons.forEach(button => {
        button.addEventListener('click', () => {
            const vibe = parseInt(button.getAttribute('data-vibe') || '0');
            handleInterestClick(card, vibe);
        });
    });
    seenButtons.forEach(button => {
        button.addEventListener('click', () => {
            const seen = button.classList.contains('seen-yes-btn');
            handleSeenClick(card, seen);
        });
    });
}
// Handle rating click
function handleRatingClick(card, vibe) {
    // Show interest step
    const rating = card.querySelector('.rating');
    const interest = card.querySelector('.interest');
    if (rating && interest) {
        rating.classList.add('hidden');
        interest.classList.remove('hidden');
    }
}
// Handle interest click
function handleInterestClick(card, vibe) {
    // Show seen step
    const interest = card.querySelector('.interest');
    const seen = card.querySelector('.seen');
    if (interest && seen) {
        interest.classList.add('hidden');
        seen.classList.remove('hidden');
    }
}
// Handle seen click
async function handleSeenClick(card, seen) {
    const movieId = parseInt(card.dataset.movieId || '0');
    const vibe = 4; // Default vibe for now
    try {
        const response = await api_client_1.ApiClient.vote({
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
        console.error('Failed to record vote', error);
        showVoteError(card, 'Failed to record your vote. Please try again.');
    }
}
// Show vote error
function showVoteError(card, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'vote-error bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4';
    errorDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-red-300">${message}</span>
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
// Show error UI
function showErrorUI(message) {
    const errorContainer = document.getElementById('error') || createErrorContainer();
    errorContainer.innerHTML = `
        <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <div class="mb-4">
                <svg class="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 class="text-xl font-bold text-red-400 mb-2">Oops! Something went wrong</h2>
                <p class="text-red-300 mb-4">${message}</p>
                <button onclick="window.location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
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
