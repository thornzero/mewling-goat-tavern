/**
 * @file Movie Poll Application - Main script for handling movie voting interface
 * @author Mewling Goat Tavern
 * @version 1.0.0
 */
import Movie from './movie.js';
import Vote from './vote.js';
// === CONFIGURATION ===
/** @constant {string} Google Apps Script proxy URL for API calls */
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";
/** @constant {boolean} Debug mode flag */
const DEBUG = false; // Set to true for debugging
// State
let movieData = [];
let remaining = 0;
let swiper = null;
let moviesLoaded = false;
let userName = '';
/**
 * Logs debug messages when DEBUG mode is enabled
 * @param {string} message - The message to log
 * @param {string} [level='info'] - Log level: 'debug', 'info', 'error', 'warn'
 * @param {*} [data=null] - Additional data to log
 */
function logging(message, level = 'info', data = null) {
    if (DEBUG) {
        if (level === 'debug') {
            console.debug(message, data);
        }
        else if (level === 'info') {
            console.info(message, data);
        }
        else if (level === 'error') {
            console.error(message, data);
        }
        else if (level === 'warn') {
            console.warn(message, data);
        }
    }
}
/**
 * Fetches movie titles list from Google Sheet
 * @async
 * @function
 */
function fetchMovieTitles() {
    const cb = 'movieListCallback';
    window[cb] = function (resp) {
        logging('Raw response from Google Sheet:', 'debug', resp);
        if (Array.isArray(resp)) {
            movieData = resp.map((movieTitle, index) => {
                logging(`Processing movie ${index}:`, movieTitle);
                // The response is an array of strings, not objects
                if (!movieTitle || typeof movieTitle !== 'string') {
                    logging('Invalid movie title:', 'error', movieTitle);
                    return null;
                }
                const match = movieTitle.match(/(.+?)\s*\((\d{4})\)$/);
                const parsedTitle = match ? match[1].trim() : movieTitle;
                const year = match ? match[2] : '';
                return new Movie(parsedTitle, year, '', [], '', '', [], null);
            }).filter(m => m !== null); // Remove any null entries
            logging('Processed movie data:', 'debug', movieData);
            remaining = movieData.length;
            startSearchAndFetch();
        }
        else {
            logging('Invalid movie list response', 'error', resp);
        }
        delete window[cb];
    };
    const s = document.createElement('script');
    s.src = `${proxyURL}?action=listMovies&callback=${cb}`;
    document.body.appendChild(s);
}
/**
 * Searches TMDb for each movie title to get movie IDs
 * @function
 */
function startSearchAndFetch() {
    movieData.forEach((m, i) => {
        const searchCb = `searchCb_${i}`;
        window[searchCb] = function (resp) {
            logging(`Search results for "${m.title}" (${m.year}):`, 'debug', resp);
            if (resp && resp.results && resp.results.length > 0) {
                logging('Search result', 'debug', resp.results);
                let foundMatch = false;
                resp.results.forEach((r) => {
                    // Extract year from release_date (format: "YYYY-MM-DD")
                    const rYear = r.release_date ? r.release_date.slice(0, 4) : '';
                    logging(`Checking result: ${r.title} (${rYear}) vs ${m.title} (${m.year})`, 'debug');
                    if (rYear == m.year) { // Use == instead of === to handle string vs number comparison
                        logging(`Found match! Fetching details for ${r.title}`);
                        fetchDetails(r.id, i);
                        foundMatch = true;
                    }
                });
                // If no exact year match found, try using the first result as fallback
                if (!foundMatch) {
                    logging(`No exact year match for "${m.title}" (${m.year}), using first result as fallback`, 'debug');
                    const firstResult = resp.results[0];
                    logging(`Using fallback: ${firstResult.title} (${firstResult.release_date.slice(0, 4)})`, 'debug');
                    fetchDetails(firstResult.id, i);
                }
            }
            else {
                logging(`No search results for "${m.title}"`, 'warn');
                handleDone();
            }
            delete window[searchCb];
        };
        let url = `${proxyURL}?action=search&query=${encodeURIComponent(m.title)}`;
        if (m.year)
            url += `&year=${encodeURIComponent(m.year)}`;
        url += `&callback=${searchCb}`;
        const s = document.createElement('script');
        s.src = url;
        document.body.appendChild(s);
    });
}
/**
 * Fetches detailed movie information by TMDb ID
 * @param {number} id - TMDb movie ID
 * @param {number} idx - Index in movieData array
 * @function
 */
function fetchDetails(id, idx) {
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
    const detailCb = `detailCb_${idx}`;
    window[detailCb] = function (data) {
        logging('Detail result', 'debug', data);
        if (data.error) {
            logging('Detail error', 'error', data.error);
            handleDone();
            return;
        }
        // Update the existing Movie object instead of replacing it
        movieData[idx].setTitle(data.title);
        movieData[idx].setYear(data.year);
        movieData[idx].setPoster(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
        movieData[idx].setGenres(data.genres.map((g) => g.name));
        movieData[idx].setSynopsis(data.overview);
        movieData[idx].setRuntime(`${data.runtime} min`);
        movieData[idx].setVideos([]);
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
        delete window[detailCb];
        fetchVideos(id, idx);
    };
    const s = document.createElement('script');
    s.src = `${proxyURL}?action=movie&id=${id}&callback=${detailCb}`;
    document.body.appendChild(s);
}
/**
 * Fetches movie videos (trailers/teasers) by TMDb ID
 * @param {number} id - TMDb movie ID
 * @param {number} idx - Index in movieData array
 * @function
 */
function fetchVideos(id, idx) {
    const videoCb = `videoCb_${idx}`;
    window[videoCb] = function (resp) {
        if (resp.results && resp.results.length) {
            movieData[idx].setVideos(resp.results.map((v) => v));
            logging(`Videos fetched for: ${movieData[idx].title} (${resp.results.length} videos)`);
        }
        else {
            logging(`No videos for movie ID ${id}`, 'warn');
        }
        delete window[videoCb];
        handleDone();
    };
    const s = document.createElement('script');
    s.src = `${proxyURL}?action=videos&id=${id}&callback=${videoCb}`;
    document.body.appendChild(s);
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
            submitAllVotes();
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
function submitAllVotes() {
    // Get all movies that have been voted on
    const movieVotes = {
        votes: movieData.map((movie) => {
            return {
                timestamp: movie.vote?.timestamp ?? Date.now(),
                movieTitle: movie.title,
                userName: userName,
                vibe: movie.vote?.vibe ?? 0,
                seen: movie.vote?.seen ?? false
            };
        })
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
    // Submit votes one by one
    const cb = `finalVoteCb_${Date.now()}`;
    window[cb] = function (resp) {
        if ('error' in resp) {
            logging(`Vote ${totalVotes} submitted:`, 'error', resp);
            return;
        }
        if ('appealUpdated' in resp) {
            logging(`AppealUpdated: ${resp.appealUpdated} AppealTotal: ${resp.appealTotal} `, 'debug', resp);
            showFinalSuccessMessage();
        }
        delete window[cb];
    };
    const script = document.createElement('script');
    script.src = `${proxyURL}`
        + `?action=batchVote`
        + `&votes=${encodeURIComponent(JSON.stringify(movieVotes.votes))}`
        + `&callback=${cb}`;
    document.body.appendChild(script);
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
    fetchMovieTitles();
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