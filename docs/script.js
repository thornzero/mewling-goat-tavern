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
    slide.className = "swiper-slide bg-gray-700 p-6 rounded-lg shadow-lg";
    slide.innerHTML = `
      <div class="flex gap-6 h-full">
        <div class="w-1/3">
          <img class="w-full rounded-md mb-4" src="${m.poster}" alt="${m.title}">
          <div class="flex flex-wrap gap-2 mb-4">
            ${m.videos.map(v => `<button onclick="openVideo('${v.key}')" class="px-3 py-1 bg-pink-500 rounded hover:bg-pink-600 transition text-sm">▶ ${v.type}</button>`).join('')}
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
                <button onclick="submitVote(${i}, 'love')" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
                  ❤️ Love it
                </button>
                <button onclick="submitVote(${i}, 'like')" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition">
                  👍 Like it
                </button>
                <button onclick="submitVote(${i}, 'meh')" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition">
                  😐 It's okay
                </button>
                <button onclick="submitVote(${i}, 'dislike')" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition">
                  👎 Dislike it
                </button>
              </div>
            </div>
            
            <!-- Step 2b: Interest (if not seen) -->
            <div id="interest-${i}" class="voting-step hidden">
              <h3 class="text-lg font-medium mb-3">Are you interested in watching it?</h3>
              <div class="flex gap-3">
                <button onclick="submitVote(${i}, 'want-to-see')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                  🎬 Want to see it
                </button>
                <button onclick="submitVote(${i}, 'maybe')" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                  🤔 Maybe
                </button>
                <button onclick="submitVote(${i}, 'not-interested')" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition">
                  🚫 Not interested
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

// Submit a vote via JSONP
function submitVote(movieIndex, vote) {
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
  const seen = hasSeen ? "✅" : "❌";
  
  const cb = `voteCb_${movieIndex}_${Date.now()}`;
  window[cb] = function (resp) {
    if (resp.status === "ok") {
      // Show confirmation
      showVoteConfirmation(movieIndex);
    } else {
      alert("Error submitting vote. Please try again.");
    }
    delete window[cb];
  };
  
  const script = document.createElement('script');
  script.src = `${proxyURL}`
    + `?action=vote`
    + `&movieTitle=${encodeURIComponent(movie.title)}`
    + `&userName=${encodeURIComponent(userName)}`
    + `&vote=${encodeURIComponent(vote)}`
    + `&seen=${encodeURIComponent(seen)}`
    + `&callback=${cb}`;
  document.body.appendChild(script);
}

// Show vote confirmation
function showVoteConfirmation(movieIndex) {
  const ratingDiv = document.getElementById(`rating-${movieIndex}`);
  const interestDiv = document.getElementById(`interest-${movieIndex}`);
  const confirmationDiv = document.getElementById(`confirmation-${movieIndex}`);
  
  // Hide current voting options
  ratingDiv.classList.add('hidden');
  interestDiv.classList.add('hidden');
  
  // Show confirmation
  confirmationDiv.classList.remove('hidden');
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
  
  // Initialize swiper if not already done
  if (!swiper && movieData.length > 0) {
    createSlides(movieData);
  }
}

// Start the flow
initializeApp();