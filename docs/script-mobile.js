// script-mobile.js - Mobile-optimized version

// === CONFIGURATION ===
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";

// State
let movieTitles = [];
let movieData = [];
let remaining = 0;
let swiper;
let seenStates = {};
let currentMovieIndex = 0;

// DOM elements
const elements = {
  loading: null,
  carouselContainer: null,
  currentMovieTitle: null,
  currentMovieGenres: null,
  currentSlide: null,
  totalSlides: null,
  seenToggle: null,
  seenEmoji: null,
  voteLove: null,
  voteMeh: null,
  votePass: null,
  instructionsModal: null,
  helpButton: null,
  closeInstructions: null
};

// Initialize DOM elements
function initElements() {
  elements.loading = document.getElementById('loading');
  elements.carouselContainer = document.getElementById('carousel-container');
  elements.currentMovieTitle = document.getElementById('current-movie-title');
  elements.currentMovieGenres = document.getElementById('current-movie-genres');
  elements.currentSlide = document.getElementById('current-slide');
  elements.totalSlides = document.getElementById('total-slides');
  elements.seenToggle = document.getElementById('seen-toggle');
  elements.seenEmoji = document.getElementById('seen-emoji');
  elements.voteLove = document.getElementById('vote-love');
  elements.voteMeh = document.getElementById('vote-meh');
  elements.votePass = document.getElementById('vote-pass');
  elements.instructionsModal = document.getElementById('instructions-modal');
  elements.helpButton = document.getElementById('help-button');
  elements.closeInstructions = document.getElementById('close-instructions');
}

// Loading state management
function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.carouselContainer.classList.add('hidden');
}

function hideLoading() {
  elements.loading.classList.add('hidden');
  elements.carouselContainer.classList.remove('hidden');
}

// Update movie info bar
function updateMovieInfo(index) {
  const movie = movieData[index];
  if (!movie) return;
  
  currentMovieIndex = index;
  elements.currentMovieTitle.textContent = movie.title;
  elements.currentMovieGenres.textContent = movie.genres.join(', ');
  elements.currentSlide.textContent = index + 1;
  elements.totalSlides.textContent = movieData.length;
  
  // Update seen toggle state
  updateSeenToggle(index);
}

// Update seen toggle
function updateSeenToggle(index) {
  const isSeen = seenStates[index];
  elements.seenEmoji.textContent = isSeen ? '✅' : '❌';
  elements.seenToggle.querySelector('span:last-child').textContent = isSeen ? 'Seen it' : 'Haven\'t seen it';
  elements.seenToggle.className = `w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors ${isSeen ? 'bg-green-600' : 'bg-gray-700'}`;
}

// Event handlers
function setupEventHandlers() {
  // Seen toggle
  elements.seenToggle.addEventListener('click', () => {
    toggleSeen(currentMovieIndex);
  });
  
  // Vote buttons
  elements.voteLove.addEventListener('click', () => {
    submitVote(movieData[currentMovieIndex].title, '❤️');
  });
  
  elements.voteMeh.addEventListener('click', () => {
    submitVote(movieData[currentMovieIndex].title, '😐');
  });
  
  elements.votePass.addEventListener('click', () => {
    submitVote(movieData[currentMovieIndex].title, '🗑️');
  });
  
  // Help modal
  elements.helpButton.addEventListener('click', () => {
    elements.instructionsModal.classList.remove('hidden');
  });
  
  elements.closeInstructions.addEventListener('click', () => {
    elements.instructionsModal.classList.add('hidden');
  });
  
  // Close modal on background click
  elements.instructionsModal.addEventListener('click', (e) => {
    if (e.target === elements.instructionsModal) {
      elements.instructionsModal.classList.add('hidden');
    }
  });
}

// Step 1: Fetch movie titles list from Google Sheet
function fetchMovieTitles() {
  showLoading();
  const cb = 'movieListCallback';
  window[cb] = function (resp) {
    if (Array.isArray(resp)) {
      movieTitles = resp;
      remaining = movieTitles.length;
      if (remaining === 0) {
        showError('No movies found in the list.');
        hideLoading();
        return;
      }
      startSearchAndFetch();
    } else {
      console.error('Invalid movie list response', resp);
      showError('Failed to load movie list. Please try again later.');
      hideLoading();
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
      } else if (resp && resp.rateLimitExceeded) {
        showRateLimitError();
        handleDone();
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
    if (data && data.rateLimitExceeded) {
      showRateLimitError();
      handleDone();
      return;
    }
    
    const entry = {
      title: data.title,
      poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      genres: data.genres.map(g => g.name),
      synopsis: data.overview,
      runtime: `${data.runtime} min`,
      videos: []
    };
    movieData[idx] = entry;
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
    if (resp && resp.rateLimitExceeded) {
      showRateLimitError();
      handleDone();
      return;
    }
    
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
    createSlides(movieData);
    hideLoading();
  }
}

// Error handling functions
function showRateLimitError() {
  showToast('⚠️ API rate limit reached. Please wait and refresh.', 'error');
}

function showError(message) {
  showToast(`❌ ${message}`, 'error');
}

function showSuccess(message) {
  showToast(`✅ ${message}`, 'success');
}

// Toast notification system
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600';
  
  toast.className = `fixed top-4 left-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 text-center`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}

// Render carousel slides
function createSlides(movies) {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";
  
  movies.forEach((m, i) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide bg-gray-700 p-4 flex flex-col";
    slide.innerHTML = `
      <div class="flex-1 flex flex-col">
        <div class="relative mb-4">
          <img class="w-full aspect-[2/3] object-cover rounded-lg" src="${m.poster}" alt="${m.title}">
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-pink-500 mb-2">${m.title}</h3>
          <div class="flex flex-wrap gap-1 mb-2">
            ${m.genres.slice(0, 3).map(t => `<span class="px-2 py-1 bg-gray-600 rounded-full text-xs">${t}</span>`).join('')}
          </div>
          <p class="text-gray-300 text-sm mb-2 line-clamp-3">${m.synopsis}</p>
          <p class="text-gray-400 text-sm">${m.runtime}</p>
          ${m.videos.length > 0 ? `
            <div class="mt-3">
              <button onclick="openVideo('${m.videos[0].key}')" class="w-full py-2 bg-pink-500 text-white rounded-lg text-sm font-medium">
                ▶ Watch Trailer
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    container.appendChild(slide);
  });

  // Initialize Swiper
  swiper = new Swiper('.swiper', {
    slidesPerView: 1,
    spaceBetween: 0,
    centeredSlides: false,
    loop: false,
    navigation: { 
      nextEl: '.swiper-button-next', 
      prevEl: '.swiper-button-prev' 
    },
    on: {
      slideChange: function () {
        updateMovieInfo(this.activeIndex);
      }
    }
  });
  
  // Initialize first movie info
  updateMovieInfo(0);
}

// Open YouTube video in new tab
function openVideo(key) {
  window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
}

// Toggle "Seen it" state
function toggleSeen(idx) {
  seenStates[idx] = !seenStates[idx];
  updateSeenToggle(idx);
}

// Submit a vote via JSONP
function submitVote(movieTitle, vote) {
  const userName = document.getElementById("username").value.trim();
  if (!userName) { 
    showError("Please enter your name before voting.");
    return; 
  }
  
  const idx = movieData.findIndex(m => m.title === movieTitle);
  const seen = seenStates[idx] ? "✅" : "❌";
  
  const cb = `voteCb_${idx}_${Date.now()}`;
  window[cb] = function (resp) {
    if (resp && resp.rateLimitExceeded) {
      showRateLimitError();
    } else if (resp && resp.status === "ok") {
      showSuccess(`Vote submitted!`);
    } else {
      showError("Error submitting vote. Please try again.");
    }
    delete window[cb];
  };
  
  const script = document.createElement('script');
  script.src = `${proxyURL}`
    + `?action=vote`
    + `&movieTitle=${encodeURIComponent(movieTitle)}`
    + `&userName=${encodeURIComponent(userName)}`
    + `&vote=${encodeURIComponent(vote)}`
    + `&seen=${encodeURIComponent(seen)}`
    + `&callback=${cb}`;
  document.body.appendChild(script);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  initElements();
  setupEventHandlers();
  fetchMovieTitles();
}); 