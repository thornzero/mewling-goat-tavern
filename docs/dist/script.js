/**
 * @file Movie Poll Application - Main script for handling movie voting interface
 * @author Mewling Goat Tavern
 * @version 1.0.0
 */
import Movie from './movie.js';
import Vote from './vote.js';
import { movieTitleSimilarity } from './utils.js';
import { API_CONFIG, makeApiCall } from './config.js';
let DEBUG = false; // Default to false, will be set by fetchDebug()
// Swiper type is now imported from the swiper package
/**
 * Check if two movie titles have significant word overlap
 * @param title1 - First title
 * @param title2 - Second title
 * @returns true if titles share significant words
 */
function hasSignificantWordOverlap(title1, title2) {
    const words1 = title1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = title2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    // Check for exact word matches (excluding common words)
    const commonWords = ['the', 'and', 'of', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by'];
    const significantWords1 = words1.filter(w => !commonWords.includes(w));
    const significantWords2 = words2.filter(w => !commonWords.includes(w));
    // Must share at least one significant word
    return significantWords1.some(w1 => significantWords2.includes(w1));
}
// === CONFIGURATION ===
/** @constant {string} Cloudflare D1 backend proxy URL for API calls */
// proxyURL is now imported from config.js
// State
let movieData = [];
let remaining = 0;
let swiper = null;
let searchAborted = false;
let moviesLoaded = false;
let userName = '';
/**
 * Logs debug messages when DEBUG mode is enabled
 * @param {string} message - The message to log
 * @param {string} [level='info'] - Log level: 'debug', 'info', 'error', 'warn'
 * @param {*} [data=null] - Additional data to log
 */
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
/**
 * Fetches movie titles list from Google Sheet
 * @async
 * @function
 */
async function fetchMovieTitles() {
    try {
        const resp = await makeApiCall(API_CONFIG.ACTIONS.LIST_MOVIES);
        logging('Raw response from D1 backend:', 'debug', resp);
        logging('Response type:', 'debug', typeof resp);
        logging('Movies array:', 'debug', resp.movies);
        if (resp && Array.isArray(resp.movies)) {
            movieData = resp.movies.map((movieTitle, index) => {
                logging(`Processing movie ${index}:`, movieTitle);
                // The response is an array of strings, not objects
                if (!movieTitle || typeof movieTitle !== 'string') {
                    logging('Invalid movie title:', 'error', movieTitle);
                    return null;
                }
                // Try multiple patterns to extract year and title
                let match = movieTitle.match(/(.+?)\s*\((\d{4})\)$/); // "Title (Year)"
                if (!match) {
                    match = movieTitle.match(/(.+?)\s+(\d{4})$/); // "Title Year"
                }
                if (!match) {
                    match = movieTitle.match(/(.+?)\s*\[(\d{4})\]$/); // "Title [Year]"
                }
                const parsedTitle = match ? match[1].trim() : movieTitle;
                const year = match ? match[2] : '';
                return new Movie(parsedTitle, year, '', [], '', '', [], null, null);
            }).filter(m => m !== null); // Remove any null entries
            logging('Processed movie data:', 'debug', movieData);
            remaining = movieData.length;
            startSearchAndFetch().catch(error => {
                logging('Error in startSearchAndFetch:', 'error', error);
                showApiError();
            });
        }
        else {
            logging('Invalid movie list response - expected movies array but got:', 'error', resp);
            showApiError();
        }
    }
    catch (error) {
        logging('Error fetching movie titles:', 'error', error);
        showApiError();
    }
}
/**
 * Searches TMDb for each movie title to get movie IDs
 * @function
 */
async function startSearchAndFetch() {
    // Safety check: don't start search if we have no movies
    if (!movieData || movieData.length === 0) {
        logging('No movies to search, skipping search and fetch', 'warn');
        handleDone();
        return;
    }
    // Reset abort flag for new search
    searchAborted = false;
    // Process movies sequentially to avoid overwhelming the API
    for (let i = 0; i < movieData.length; i++) {
        const m = movieData[i];
        // Check if search was aborted
        if (searchAborted) {
            logging(`Search aborted for "${m.title}"`, 'debug');
            break;
        }
        try {
            const params = { query: m.title };
            if (m.year)
                params.year = m.year;
            const resp = await makeApiCall(API_CONFIG.ACTIONS.SEARCH, params);
            logging(`Search results for "${m.title}" (${m.year}):`, 'debug', resp);
            if (resp && resp.results && resp.results.length > 0) {
                logging('Search result', 'debug', resp.results);
                let foundMatch = false;
                // First try to find exact year match with good similarity
                for (const r of resp.results) {
                    const similarity = movieTitleSimilarity(r.title, m.title);
                    const rYear = r.release_date ? r.release_date.slice(0, 4) : '';
                    logging(`Similarity: ${similarity}`, 'debug');
                    // Try exact year match with reasonable similarity threshold
                    if (similarity <= 5.0 && rYear == m.year) {
                        logging(`Found exact year match! Fetching details for ${r.title}`);
                        await fetchDetails(r.id, i);
                        foundMatch = true;
                        break; // Stop processing once we find a good match
                    }
                }
                // If no exact year match found, try flexible year matching (±2 years)
                if (!foundMatch) {
                    for (const r of resp.results) {
                        const similarity = movieTitleSimilarity(r.title, m.title);
                        const rYear = r.release_date ? parseInt(r.release_date.slice(0, 4)) : 0;
                        const mYear = m.year ? parseInt(m.year.toString()) : 0;
                        // Allow year difference of ±2 years for better matching
                        if (similarity <= 8.0 && Math.abs(rYear - mYear) <= 2) {
                            logging(`Found flexible year match! Fetching details for ${r.title} (${rYear} vs ${mYear})`);
                            await fetchDetails(r.id, i);
                            foundMatch = true;
                            break;
                        }
                    }
                }
                // If still no match found, use best similarity as fallback
                if (!foundMatch) {
                    logging(`No year match found for "${m.title}" (${m.year}), using best similarity match as fallback`, 'debug');
                    // Find the result with the best (lowest) similarity score
                    let bestMatch = resp.results[0];
                    let bestSimilarity = movieTitleSimilarity(bestMatch.title, m.title);
                    for (let j = 1; j < resp.results.length; j++) {
                        const similarity = movieTitleSimilarity(resp.results[j].title, m.title);
                        if (similarity < bestSimilarity) {
                            bestSimilarity = similarity;
                            bestMatch = resp.results[j];
                        }
                    }
                    // Only use fallback if similarity is reasonable AND the titles share some common words
                    const hasCommonWords = hasSignificantWordOverlap(m.title, bestMatch.title);
                    if (bestSimilarity <= 15.0 && hasCommonWords) { // Stricter threshold and word overlap check
                        logging(`Using fallback: ${bestMatch.title} (${bestMatch.release_date ? bestMatch.release_date.slice(0, 4) : 'unknown'}) - similarity: ${bestSimilarity}`, 'debug');
                        await fetchDetails(bestMatch.id, i);
                        foundMatch = true;
                    }
                    else {
                        logging(`No good match found for "${m.title}" - best similarity too poor: ${bestSimilarity} or no word overlap`, 'warn');
                        handleDone();
                    }
                }
            }
            else {
                logging(`No search results for "${m.title}"`, 'warn');
                handleDone();
            }
        }
        catch (error) {
            logging(`Error searching for "${m.title}":`, 'error', error);
            handleDone();
        }
    }
}
/**
 * Fetches detailed movie information by TMDb ID
 * @param {number} id - TMDb movie ID
 * @param {number} idx - Index in movieData array
 * @function
 */
async function fetchDetails(id, idx) {
    // Check if search was aborted
    if (searchAborted) {
        logging(`Fetch details aborted for movie ${idx}`, 'debug');
        return;
    }
    // Safety check: ensure movieData array has the expected index
    if (!movieData || idx >= movieData.length || !movieData[idx]) {
        logging(`Invalid movie index ${idx} - movieData length: ${movieData?.length || 0}`, 'error');
        handleDone();
        return;
    }
    const storageKey = `movie_${id}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
        const cachedData = JSON.parse(cached);
        // Update the existing Movie object with cached data
        movieData[idx].setTitle(cachedData.title);
        movieData[idx].setYear(cachedData.year);
        movieData[idx].setPoster(cachedData.poster);
        movieData[idx].setGenres(cachedData.genres);
        movieData[idx].setSynopsis(cachedData.synopsis);
        movieData[idx].setRuntime(cachedData.runtime);
        movieData[idx].setVideos(cachedData.videos);
        logging(`Loaded cached data for movie ${idx}:`, cachedData.title);
        handleDone();
        return;
    }
    try {
        const data = await makeApiCall(API_CONFIG.ACTIONS.MOVIE, { id: id });
        logging('Detail result', 'debug', data);
        if (data.error) {
            logging('Detail error', 'error', data.error);
            handleDone();
            return;
        }
        // Double-check movieData array is still valid
        if (!movieData || idx >= movieData.length || !movieData[idx]) {
            logging(`Movie data no longer valid for index ${idx}`, 'error');
            handleDone();
            return;
        }
        // Update the existing Movie object instead of replacing it
        movieData[idx].setTitle(data.title);
        movieData[idx].setYear(data.year);
        movieData[idx].setPoster(data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '');
        movieData[idx].setGenres(data.genres.map((g) => g.name));
        movieData[idx].setSynopsis(data.overview);
        movieData[idx].setRuntime(data.runtime ? `${data.runtime} min` : '');
        movieData[idx].setVideos(data.videos || []);
        movieData[idx].setTmdbId(data.id);
        logging(`Updated movie ${idx}:`, 'debug', {
            title: movieData[idx].title,
            poster: movieData[idx].poster,
            genres: movieData[idx].genres,
            synopsis: movieData[idx].synopsis
        });
        // cache it 
        localStorage.setItem(storageKey, JSON.stringify({
            title: movieData[idx].title,
            year: movieData[idx].year,
            poster: movieData[idx].poster,
            genres: movieData[idx].genres,
            synopsis: movieData[idx].synopsis,
            runtime: movieData[idx].runtime,
            videos: movieData[idx].videos
        }));
        logging(`Movie details fetched for: ${data.title}`);
        // Videos are now included in the movie details response, so no need for separate fetchVideos call
        handleDone();
    }
    catch (error) {
        logging('Error fetching movie details:', 'error', error);
        handleDone();
    }
}
/**
 * Tracks completion of movie data loading and renders UI when ready
 * @function
 */
function handleDone() {
    remaining--;
    logging(`Movies remaining to process: ${remaining}`);
    if (remaining === 0) {
        logging('All movies processed! Loading complete.');
        moviesLoaded = true;
        // Check if we have no movies (API error)
        if (movieData.length === 0) {
            logging('No movies loaded - API may be down', 'error');
            showApiError();
            return;
        }
        // Check if all movies have been fully loaded (have poster, genres, etc.)
        const allMoviesLoaded = movieData.every(movie => movie.poster && movie.genres && movie.synopsis);
        logging('All movies fully loaded:', 'debug', allMoviesLoaded);
        if (allMoviesLoaded) {
            // If user is already waiting, show the poll
            const startBtn = document.getElementById('start-poll-btn');
            if (startBtn && startBtn.textContent === 'Loading movies...') {
                logging('User is waiting, showing movie poll...');
                showMoviePoll();
            }
            // If we're already in the poll screen, create slides
            const moviePollScreen = document.getElementById('movie-poll-screen');
            if (moviePollScreen && !moviePollScreen.classList.contains('hidden')) {
                logging('Already in poll screen, creating slides...');
                createSlides(movieData);
            }
        }
        else {
            logging('Movies not fully loaded yet, waiting...');
            // Wait a bit and check again
            setTimeout(() => {
                if (remaining === 0) {
                    const allMoviesLoaded = movieData.every(movie => movie.poster && movie.genres && movie.synopsis);
                    if (allMoviesLoaded) {
                        const startBtn = document.getElementById('start-poll-btn');
                        if (startBtn && startBtn.textContent === 'Loading movies...') {
                            showMoviePoll();
                        }
                    }
                }
            }, 2000);
        }
    }
}
/**
 * Renders carousel slides with guided voting flow
 * @param {Movie[]} movies - Array of Movie objects to render
 * @function
 */
function createSlides(movies) {
    logging('Creating slides with movies:', 'debug', movies);
    const container = document.getElementById("movie-carousel");
    if (!container)
        return;
    container.innerHTML = "";
    movies.forEach((m, i) => {
        logging(`Creating slide ${i}:`, 'debug', m);
        // Safety checks for missing data
        if (!m || !m.title) {
            logging(`Invalid movie data at index ${i}:`, 'error', m);
            return;
        }
        const slide = document.createElement("div");
        const video = m.videos && m.videos[0] ? m.videos[0] : null;
        slide.className = "swiper-slide bg-gray-700 p-6 rounded-lg shadow-lg";
        slide.innerHTML = `
      <div class="flex gap-6 h-full">
        <div class="w-1/3">
          <img class="w-full rounded-md mb-4" src="${m.poster || 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${m.title}">
          <div class="flex flex-wrap gap-2 mb-4">
            ${video ? `<button onclick="openVideo('${video.key}')" class="px-3 py-1 bg-pink-500 rounded hover:bg-pink-600 transition text-sm">▶ ${video.type}</button>` : ''}
          </div>
        </div>
        
        <div class="flex-1 flex flex-col">
          <h2 class="text-2xl font-semibold text-pink-500 mb-2">${m.title}</h2>
          <div class="flex flex-wrap gap-2 mb-3">
            ${m.genres && Array.isArray(m.genres) ? m.genres.map((t) => `<span class="px-2 py-1 bg-gray-600 rounded-full text-sm">${t}</span>`).join('') : ''}
          </div>
          <p class="text-gray-200 mb-3 flex-1">${m.synopsis || 'No synopsis available'}</p>
          <p class="font-medium mb-4">${m.runtime || 'Runtime unknown'}</p>
          
          <!-- Voting Flow -->
          <div id="voting-flow-${i}" class="space-y-4">
            <!-- Step 1: Have you seen it? -->
            <div id="seen-question-${i}" class="voting-step">
              <h3 class="text-lg font-medium mb-3">Have you seen this movie?</h3>
              <div class="flex gap-3">
                <button onclick="answerSeen(${i}, true)" class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition">
                  Yes, I've seen it
                </button>
                <button onclick="answerSeen(${i}, false)" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition">
                  No, I haven't seen it
                </button>
              </div>
            </div>
            
            <!-- Step 2a: Rating (if seen) -->
            <div id="rating-${i}" class="voting-step hidden">
              <h3 class="text-lg font-medium mb-3">How did you like it?</h3>
              <div class="flex gap-3">
                <button onclick="submitVote(${i}, 1)" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
                  ⭐ Rewatch
                </button>
                <button onclick="submitVote(${i}, 2)" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition">
                  😐 Meh
                </button>
                <button onclick="submitVote(${i}, 3)" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition">
                  🚫 Hated it
                </button>
              </div>
            </div>
            
            <!-- Step 2b: Interest (if not seen) -->
            <div id="interest-${i}" class="voting-step hidden">
              <h3 class="text-lg font-medium mb-3">Are you interested in watching it?</h3>
              <div class="flex gap-3">
                <button onclick="submitVote(${i}, 4)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                  🔥 Stoked
                </button>
                <button onclick="submitVote(${i}, 5)" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                  ⏳ Indifferent
                </button>
                <button onclick="submitVote(${i}, 6)" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition">
                  💤 Not interested
                </button>
              </div>
            </div>
            
            <!-- Step 3: Confirmation -->
            <div id="confirmation-${i}" class="voting-step hidden">
              <div class="bg-green-800 border border-green-600 rounded-lg p-4">
                <p class="text-green-200">✅ Vote submitted! Thanks for your input.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
        container?.appendChild(slide);
    });
    // Initialize Swiper
    swiper = new Swiper('.swiper', {
        slidesPerView: 1,
        spaceBetween: 20,
        centeredSlides: false,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
        }
    });
}
/**
 * Opens a YouTube video in a new tab
 * @param {string} key - YouTube video key
 * @function
 */
function openVideo(key) {
    window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
}
// Make functions globally accessible for HTML onclick handlers
window.openVideo = openVideo;
/**
 * Handles the "Have you seen it?" question response
 * @param {number} movieIndex - Index of the movie in movieData array
 * @param {boolean} hasSeen - Whether the user has seen the movie
 * @function
 */
function answerSeen(movieIndex, hasSeen) {
    // Update the vote state data structure
    movieData[movieIndex].hasAnsweredSeen = true;
    movieData[movieIndex].hasSeen = hasSeen;
    movieData[movieIndex].currentStep = hasSeen ? 'rating' : 'interest';
    // Update the UI to reflect the new state
    updateMovieVotingUI(movieIndex);
}
// Make functions globally accessible for HTML onclick handlers
window.answerSeen = answerSeen;
/**
 * Submits a vote for a movie and advances to next slide
 * @param {number} movieIndex - Index of the movie in movieData array
 * @param {number} voteVibe - Vibe value (1-6 rating)
 * @function
 */
function submitVote(movieIndex, voteVibe) {
    if (!userName) {
        alert("Please enter your name.");
        return;
    }
    const movie = movieData[movieIndex];
    if (!movie) {
        logging('Movie not found for index:', 'error', movieIndex);
        return;
    }
    if (!movieData[movieIndex].hasAnsweredSeen) {
        logging('User has not answered the seen question yet', 'error');
        return;
    }
    // Update the vote state
    movieData[movieIndex].hasVoted = true;
    movieData[movieIndex].currentStep = 'confirmation';
    movieData[movieIndex].timestamp = Date.now();
    // Create and set the Vote object
    const vote = new Vote(voteVibe, movieData[movieIndex].hasSeen || false, Date.now());
    movieData[movieIndex].setVote(vote);
    // Update UI and advance to next slide
    updateMovieVotingUI(movieIndex);
    showVoteConfirmationAndAdvance(movieIndex);
}
// Make functions globally accessible for HTML onclick handlers
window.submitVote = submitVote;
/**
 * Updates the UI based on the vote state data structure
 * @param {number} movieIndex - Index of the movie in movieData array
 * @function
 */
function updateMovieVotingUI(movieIndex) {
    const seenQuestion = document.getElementById(`seen-question-${movieIndex}`);
    const ratingDiv = document.getElementById(`rating-${movieIndex}`);
    const interestDiv = document.getElementById(`interest-${movieIndex}`);
    const confirmationDiv = document.getElementById(`confirmation-${movieIndex}`);
    // Hide all sections first
    seenQuestion?.classList.add('hidden');
    ratingDiv?.classList.add('hidden');
    interestDiv?.classList.add('hidden');
    confirmationDiv?.classList.add('hidden');
    // Show the appropriate section based on current step
    switch (movieData[movieIndex].currentStep) {
        case 'seen-question':
            seenQuestion?.classList.remove('hidden');
            break;
        case 'rating':
            ratingDiv?.classList.remove('hidden');
            break;
        case 'interest':
            interestDiv?.classList.remove('hidden');
            break;
        case 'confirmation':
            confirmationDiv?.classList.remove('hidden');
            break;
    }
}
/**
 * Shows vote confirmation and advances to next slide
 * @param {number} movieIndex - Index of the movie in movieData array
 * @function
 */
function showVoteConfirmationAndAdvance(movieIndex) {
    const confirmationDiv = document.getElementById(`confirmation-${movieIndex}`);
    // Show simple confirmation
    if (confirmationDiv) {
        confirmationDiv.innerHTML = `
    <div class="bg-green-800 border border-green-600 rounded-lg p-4">
      <p class="text-green-200">✅ Vote submitted! Thanks for your input.</p>
    </div>
  `;
    }
    // Check if this is the last movie
    const isLastMovie = movieIndex === movieData.length - 1;
    if (isLastMovie) {
        // Show final submission message and submit all votes
        setTimeout(() => {
            submitAllVotes().catch(error => {
                logging('Error in submitAllVotes:', 'error', error);
                showApiError();
            });
        }, 1500); // Show confirmation for 1.5 seconds before submitting
    }
    else {
        // Advance to next slide after a short delay
        setTimeout(() => {
            if (swiper) {
                swiper.slideNext();
            }
        }, 1000); // Show confirmation for 1 second before advancing
    }
}
/**
 * Submits all votes to the Google Sheet at once
 * @function
 */
async function submitAllVotes() {
    // Get all movies that have been voted on
    const movieVotes = {
        votes: movieData.map((movie) => {
            const voteData = {
                movie_id: movie.tmdbId || 0, // We'll need to store TMDB ID in Movie class
                user_name: userName,
                vibe: movie.vote?.vibe ?? 0,
                seen: movie.vote?.seen ?? false
            };
            logging(`Vote data for ${movie.title}:`, 'debug', voteData);
            return voteData;
        }).filter(vote => vote.movie_id > 0) // Only include votes with valid movie IDs
    };
    const totalVotes = movieVotes.votes.length;
    if (totalVotes === 0) {
        logging('No votes to submit');
        return;
    }
    // Show loading state
    const lastSlide = document.querySelector('.swiper-slide-active');
    if (lastSlide) {
        const confirmationDiv = lastSlide.querySelector('[id^="confirmation-"]');
        if (confirmationDiv) {
            confirmationDiv.innerHTML = `
        <div class="bg-blue-800 border border-blue-600 rounded-lg p-4">
          <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
            <p class="text-blue-200">Submitting all votes...</p>
          </div>
        </div>
      `;
        }
    }
    try {
        const resp = await makeApiCall(API_CONFIG.ACTIONS.BATCH_VOTE, {}, 'POST', movieVotes);
        if (resp.success) {
            logging(`Successfully submitted ${resp.submitted_count} votes`, 'debug', resp);
            showFinalSuccessMessage();
        }
        else {
            logging(`Vote submission failed:`, 'error', resp);
            showApiError();
        }
    }
    catch (error) {
        logging('Error submitting votes:', 'error', error);
        showApiError();
    }
}
/**
 * Fetches debug status from Google Sheet
 * @async
 * @function
 */
async function fetchDebug() {
    try {
        const resp = await makeApiCall(API_CONFIG.ACTIONS.DEBUG);
        logging(`Debug response:`, 'debug', resp);
        DEBUG = resp.debug;
        logging('Debug status set to:', 'info', DEBUG);
    }
    catch (error) {
        logging('Error fetching debug status:', 'error', error);
        DEBUG = false; // Default to false on error
    }
}
/**
 * Shows API error message when movies can't be loaded
 * @function
 */
function showApiError() {
    const startBtn = document.getElementById('start-poll-btn');
    if (startBtn) {
        startBtn.innerHTML = `
      <div class="text-center">
        <div class="text-red-400 text-lg font-semibold mb-2">⚠️ API Error</div>
        <div class="text-gray-300 text-sm mb-4">
          Unable to load movies. The API may be temporarily unavailable.
        </div>
        <button onclick="location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
          Retry
        </button>
      </div>
    `;
        startBtn.disabled = false;
    }
}
/**
 * Shows final success message after all votes are submitted
 * @function
 */
function showFinalSuccessMessage() {
    const lastSlide = document.querySelector('.swiper-slide-active');
    if (lastSlide) {
        const confirmationDiv = lastSlide.querySelector('[id^="confirmation-"]');
        if (confirmationDiv) {
            confirmationDiv.innerHTML = `
        <div class="bg-green-800 border border-green-600 rounded-lg p-6 text-center">
          <div class="text-4xl mb-4">🎉</div>
          <h3 class="text-xl font-bold text-green-200 mb-2">All Done!</h3>
          <p class="text-green-200">Thanks for voting on all the movies, ${userName}!</p>
          <p class="text-green-300 text-sm mt-2">Your votes have been submitted successfully.</p>
        </div>
      `;
        }
    }
}
// Initialize the app
/**
 * Initializes the application and sets up event listeners
 * @function
 */
function initializeApp() {
    // Set up name input handling
    const usernameInput = document.getElementById('username');
    const startBtn = document.getElementById('start-poll-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    if (usernameInput) {
        usernameInput.addEventListener('input', function () {
            const name = this.value.trim();
            if (startBtn) {
                startBtn.disabled = !name;
            }
            if (name) {
                userName = name;
            }
        });
    }
    // Add Enter key support for name input
    if (usernameInput) {
        usernameInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && userName && startBtn && !startBtn.disabled) {
                event.preventDefault();
                startBtn.click();
            }
        });
        // Add focus management for better mobile experience
        usernameInput.addEventListener('focus', function () {
            // On mobile, this helps with keyboard behavior
            this.setAttribute('autocomplete', 'name');
        });
    }
    if (startBtn) {
        startBtn.addEventListener('click', function () {
            if (userName && moviesLoaded) {
                showMoviePoll();
            }
            else if (userName && !moviesLoaded) {
                // Show loading indicator and wait for movies
                if (loadingIndicator) {
                    loadingIndicator.classList.remove('hidden');
                }
                startBtn.disabled = true;
                startBtn.textContent = 'Loading movies...';
            }
        });
    }
    // Start loading movies in background
    fetchDebug().catch(error => {
        logging('Error in fetchDebug:', 'error', error);
    });
    fetchMovieTitles().catch(error => {
        logging('Error in fetchMovieTitles:', 'error', error);
        showApiError();
    });
}
/**
 * Shows the movie poll screen and initializes the carousel
 * @function
 */
function showMoviePoll() {
    const nameEntryScreen = document.getElementById('name-entry-screen');
    const moviePollScreen = document.getElementById('movie-poll-screen');
    const userGreeting = document.getElementById('user-greeting');
    nameEntryScreen?.classList.add('hidden');
    moviePollScreen?.classList.remove('hidden');
    if (userGreeting) {
        userGreeting.textContent = `Welcome, ${userName}!`;
    }
    // Initialize swiper if not already done
    if (!swiper && movieData.length > 0) {
        logging('Creating slides in showMoviePoll with movieData:', 'debug', movieData);
        createSlides(movieData);
    }
}
// Start the flow when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
//# sourceMappingURL=script.js.map