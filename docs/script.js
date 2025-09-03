// script.js - Movie Poll Application

// === CONFIGURATION ===
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";

// State
let movieTitles = [];
let movieData = [];
let remaining = 0;
let swiper;
let userName = '';
let moviesLoaded = false;
let currentMovieIndex = 0;
let userVotes = []; // Store votes locally until final submission



// Simple vote values - no complex mapping needed

// Step 1: Fetch movie titles list from Google Sheet
function fetchMovieTitles() {
  const cb = 'movieListCallback';
  window[cb] = function (resp) {
    if (Array.isArray(resp)) {
      movieTitles = resp;
      remaining = movieTitles.length;
      startSearchAndFetch();
    } else {
      console.error('Invalid movie list response', resp);
    }
    delete window[cb];
  };
  const s = document.createElement('script');
  s.src = `${proxyURL}?action=listMovies&callback=${cb}`;
  document.body.appendChild(s);
}

// Step 2: Search TMDb for each title to get ID
function startSearchAndFetch() {
  movieTitles.forEach((rawTitle, idx) => {
    const match = rawTitle.match(/(.+?)\s*\((\d{4})\)$/);
    const title = match ? match[1].trim() : rawTitle;
    const year = match ? match[2] : null;
    const searchCb = `searchCb_${idx}`;
    window[searchCb] = function (resp) {
      if (resp && resp.results && resp.results[0]) {
        fetchDetails(resp.results[0].id, idx);
      } else {
        console.error(`No result for "${rawTitle}"`);
        handleDone();
      }
      delete window[searchCb];
    };
    let url = `${proxyURL}?action=search&query=${encodeURIComponent(title)}`;
    if (year) url += `&year=${year}`;
    url += `&callback=${searchCb}`;
    const s = document.createElement('script');
    s.src = url;
    document.body.appendChild(s);
  });
}

// Step 3: Fetch movie details by ID
function fetchDetails(id, idx) {
  const storageKey = `movie_${id}`
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    movieData[idx] = JSON.parse(cached);
    handleDone();
    return;
  }

  const detailCb = `detailCb_${idx}`;
  window[detailCb] = function (data) {
    const entry = {
      title: data.title,
      poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      genres: data.genres.map(g => g.name),
      synopsis: data.overview,
      runtime: `${data.runtime} min`,
      videos: []
    };
    movieData[idx] = entry;
    // cache it 
    localStorage.setItem(storageKey, JSON.stringify(entry));
    delete window[detailCb];
    fetchVideos(id, idx);
  };
  const s = document.createElement('script');
  s.src = `${proxyURL}?action=movie&id=${id}&callback=${detailCb}`;
  document.body.appendChild(s);
}

// Step 4: Fetch videos (trailers/teasers) by movie ID
function fetchVideos(id, idx) {
  const videoCb = `videoCb_${idx}`;
  window[videoCb] = function (resp) {
    if (resp.results && resp.results.length) {
      movieData[idx].videos = resp.results.map(v => v);
    } else {
      console.warn(`No videos for movie ID ${id}`);
    }
    delete window[videoCb];
    handleDone();
  };
  const s = document.createElement('script');
  s.src = `${proxyURL}?action=videos&id=${id}&callback=${videoCb}`;
  document.body.appendChild(s);
}

// Step 5: Track completion and render
function handleDone() {
  if (--remaining === 0) {
    moviesLoaded = true;
    // If user is already waiting, show the poll
    const startBtn = document.getElementById('start-poll-btn');
    if (startBtn && startBtn.textContent === 'Loading movies...') {
      showMoviePoll();
    }
    // If we're already in the poll screen, create slides
    if (document.getElementById('movie-poll-screen') && !document.getElementById('movie-poll-screen').classList.contains('hidden')) {
      createSlides(movieData);
    }
  }
}

// Render carousel slides with guided voting flow
function createSlides(movies) {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";
  
  movies.forEach((m, i) => {
    const slide = document.createElement("div");
    const video = m.videos[0]
    slide.className = "swiper-slide bg-gray-700 p-6 rounded-lg shadow-lg";
    slide.innerHTML = `
      <div class="flex gap-6 h-full">
        <div class="w-1/3">
          <img class="w-full rounded-md mb-4" src="${m.poster}" alt="${m.title}">
          <div class="flex flex-wrap gap-2 mb-4">
            <button onclick="openVideo('${video.key}')" class="px-3 py-1 bg-pink-500 rounded hover:bg-pink-600 transition text-sm">▶ ${video.type}</button>
          </div>
        </div>
        
        <div class="flex-1 flex flex-col">
          <h2 class="text-2xl font-semibold text-pink-500 mb-2">${m.title}</h2>
          <div class="flex flex-wrap gap-2 mb-3">
            ${m.genres.map(t => `<span class="px-2 py-1 bg-gray-600 rounded-full text-sm">${t}</span>`).join('')}
          </div>
          <p class="text-gray-200 mb-3 flex-1">${m.synopsis}</p>
          <p class="font-medium mb-4">${m.runtime}</p>
          
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
    container.appendChild(slide);
  });

  // Initialize Swiper
  swiper = new Swiper('.swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    centeredSlides: false,
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
  });
}

// Open YouTube video in new tab
function openVideo(key) {
  window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
}

// Handle the "Have you seen it?" question
function answerSeen(movieIndex, hasSeen) {
  const seenQuestion = document.getElementById(`seen-question-${movieIndex}`);
  const ratingDiv = document.getElementById(`rating-${movieIndex}`);
  const interestDiv = document.getElementById(`interest-${movieIndex}`);
  
  // Hide the seen question
  seenQuestion.classList.add('hidden');
  
  // Show appropriate next step
  if (hasSeen) {
    ratingDiv.classList.remove('hidden');
  } else {
    interestDiv.classList.remove('hidden');
  }
}

// Submit a vote (store locally and advance slide)
function submitVote(movieIndex, voteValue) {
  if (!userName) { 
    alert("Please enter your name."); 
    return; 
  }
  
  const movie = movieData[movieIndex];
  if (!movie) {
    console.error('Movie not found for index:', movieIndex);
    return;
  }
  
  // Determine if user has seen the movie based on which buttons are visible
  const ratingDiv = document.getElementById(`rating-${movieIndex}`);
  const hasSeen = !ratingDiv.classList.contains('hidden');
  const seen = hasSeen ? "true" : "false"; // Simple true/false instead of emojis
  
  // Store vote locally with simple values
  userVotes[movieIndex] = {
    movieTitle: movie.title,
    vote: voteValue, // Direct numeric value
    seen: seen, // Simple true/false
    timestamp: Date.now()
  };
  
  // Show confirmation and advance to next slide
  showVoteConfirmationAndAdvance(movieIndex);
}

// Show vote confirmation and advance to next slide
function showVoteConfirmationAndAdvance(movieIndex) {
  const ratingDiv = document.getElementById(`rating-${movieIndex}`);
  const interestDiv = document.getElementById(`interest-${movieIndex}`);
  const confirmationDiv = document.getElementById(`confirmation-${movieIndex}`);
  
  // Hide current voting options
  ratingDiv.classList.add('hidden');
  interestDiv.classList.add('hidden');
  
  // Show simple confirmation
  confirmationDiv.innerHTML = `
    <div class="bg-green-800 border border-green-600 rounded-lg p-4">
      <p class="text-green-200">✅ Vote submitted! Thanks for your input.</p>
    </div>
  `;
  confirmationDiv.classList.remove('hidden');
  
  // Check if this is the last movie
  const isLastMovie = movieIndex === movieData.length - 1;
  
  if (isLastMovie) {
    // Show final submission message and submit all votes
    setTimeout(() => {
      submitAllVotes();
    }, 1500); // Show confirmation for 1.5 seconds before submitting
  } else {
    // Advance to next slide after a short delay
    setTimeout(() => {
      swiper.slideNext();
    }, 1000); // Show confirmation for 1 second before advancing
  }
}

// Submit all votes at once
function submitAllVotes() {
  if (userVotes.length === 0) {
    console.log('No votes to submit');
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
  let submittedCount = 0;
  const totalVotes = userVotes.filter(vote => vote !== undefined).length;
  
  userVotes.forEach((vote, index) => {
    if (vote) {
      const cb = `finalVoteCb_${index}_${Date.now()}`;
      window[cb] = function (resp) {
        submittedCount++;
        if (submittedCount === totalVotes) {
          // All votes submitted, show final success message
          showFinalSuccessMessage();
        }
        delete window[cb];
      };
      
      const script = document.createElement('script');
      script.src = `${proxyURL}`
        + `?action=vote`
        + `&movieTitle=${encodeURIComponent(vote.movieTitle)}`
        + `&userName=${encodeURIComponent(userName)}`
        + `&vote=${encodeURIComponent(vote.vote)}` // Now using numeric value
        + `&seen=${encodeURIComponent(vote.seen)}`
        + `&callback=${cb}`;
      document.body.appendChild(script);
    }
  });
}

// Show final success message
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
function initializeApp() {
  // Set up name input handling
  const usernameInput = document.getElementById('username');
  const startBtn = document.getElementById('start-poll-btn');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  usernameInput.addEventListener('input', function() {
    const name = this.value.trim();
    startBtn.disabled = !name;
    if (name) {
      userName = name;
    }
  });
  
  // Add Enter key support for name input
  usernameInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && userName && !startBtn.disabled) {
      event.preventDefault();
      startBtn.click();
    }
  });
  
  // Add focus management for better mobile experience
  usernameInput.addEventListener('focus', function() {
    // On mobile, this helps with keyboard behavior
    this.setAttribute('autocomplete', 'name');
  });
  
  startBtn.addEventListener('click', function() {
    if (userName && moviesLoaded) {
      showMoviePoll();
    } else if (userName && !moviesLoaded) {
      // Show loading indicator and wait for movies
      loadingIndicator.classList.remove('hidden');
      startBtn.disabled = true;
      startBtn.textContent = 'Loading movies...';
    }
  });
  
  // Start loading movies in background
  fetchMovieTitles();
}

// Show the movie poll screen
function showMoviePoll() {
  document.getElementById('name-entry-screen').classList.add('hidden');
  document.getElementById('movie-poll-screen').classList.remove('hidden');
  document.getElementById('user-greeting').textContent = `Welcome, ${userName}!`;
  
  // Initialize votes array
  userVotes = new Array(movieData.length);
  
  // Initialize swiper if not already done
  if (!swiper && movieData.length > 0) {
    createSlides(movieData);
  }
}

// Start the flow
initializeApp();