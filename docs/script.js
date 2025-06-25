// script.js

// === CONFIGURATION ===
// Replace with your Google Apps Script Web App URL
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";

// State
let movieTitles = [];
let movieData = [];
let remaining = 0;
let swiper;
let seenStates = {}; // Track seen states for each movie

// Loading state management
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('carousel-container').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('carousel-container').classList.remove('hidden');
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Only handle shortcuts when carousel is visible
    if (document.getElementById('carousel-container').classList.contains('hidden')) {
      return;
    }
    
    const currentIndex = swiper ? swiper.activeIndex : 0;
    const currentMovie = movieData[currentIndex];
    
    if (!currentMovie) return;
    
    switch(e.key) {
      case '1':
        e.preventDefault();
        submitVote(currentMovie.title, '❤️');
        break;
      case '2':
        e.preventDefault();
        submitVote(currentMovie.title, '😐');
        break;
      case '3':
        e.preventDefault();
        submitVote(currentMovie.title, '🗑️');
        break;
      case 's':
      case 'S':
        e.preventDefault();
        toggleSeen(currentIndex);
        break;
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
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  errorDiv.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>⚠️</span>
      <span>API rate limit reached. Please wait a moment and refresh.</span>
    </div>
  `;
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 10000);
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  errorDiv.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>❌</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Render carousel slides with poster & teaser floated
function createSlides(movies) {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";
  movies.forEach((m, i) => {
    const videoButtons = m.videos.map(v => {
      return `<button class="video-link ${v.type}" onclick="openVideo('${v.key}')">${v.type || 'Video'}</button>`;
    }).join(' ');

    const slide = document.createElement("div");
    slide.className = "swiper-slide bg-gray-700 p-6 rounded-lg shadow-lg flex flex-col space-y-4";
    slide.innerHTML = `
    <h2 class="text-2xl font-semibold text-pink-500">${m.title}</h2>
    <div class="flex gap-6">
      <img class="w-2/5 rounded-md" src="${m.poster}" alt="${m.title}">
      <div class="flex-1 flex flex-col space-y-2">
        <div class="flex flex-wrap gap-2">
          ${m.genres.map(t => `<span class="px-2 py-1 bg-gray-600 rounded-full text-sm">${t}</span>`).join('')}
        </div>
        <p class="text-gray-200 flex-1">${m.synopsis}</p>
        <p class="font-medium">${m.runtime}</p>
        <div class="flex flex-wrap gap-2">
          ${m.videos.map(v => `<button onclick="openVideo('${v.key}')" class="px-3 py-1 bg-pink-500 rounded hover:bg-pink-600 transition">▶ ${v.type}</button>`).join('')}
        </div>
        <div class="flex items-center justify-between">
          <button id="seen-btn-${i}" onclick="toggleSeen(${i})" class="flex items-center space-x-2 px-3 py-1 rounded transition-colors ${seenStates[i] ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}">
            <span class="text-2xl">${seenStates[i] ? '✅' : '❌'}</span>
            <span class="font-medium">Seen it? (S)</span>
          </button>
          <div class="flex gap-2">
            <button onclick="submitVote('${m.title}', '❤️')" class="px-3 py-1 bg-green-600 rounded hover:bg-green-700 transition" title="Love it (1)">❤️</button>
            <button onclick="submitVote('${m.title}', '😐')" class="px-3 py-1 bg-yellow-500 rounded hover:bg-yellow-600 transition" title="Meh (2)">😐</button>
            <button onclick="submitVote('${m.title}', '🗑️')" class="px-3 py-1 bg-red-600 rounded hover:bg-red-700 transition" title="Pass (3)">🗑️</button>
          </div>
        </div>
      </div>
    </div>
    `;
    container.appendChild(slide);
  });

  // Initialize Swiper with improved configuration
  swiper = new Swiper('.swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    centeredSlides: false,
    loop: false,
    navigation: { 
      nextEl: '.swiper-button-next', 
      prevEl: '.swiper-button-prev' 
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true
    },
    keyboard: {
      enabled: true,
      onlyInViewport: true
    },
    a11y: {
      prevSlideMessage: 'Previous movie',
      nextSlideMessage: 'Next movie',
      firstSlideMessage: 'This is the first movie',
      lastSlideMessage: 'This is the last movie'
    }
  });
}

// Open YouTube video in new tab
function openVideo(key) {
  window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
}

// Toggle "Seen it" state
function toggleSeen(idx) {
  seenStates[idx] = !seenStates[idx];
  const btn = document.getElementById(`seen-btn-${idx}`);
  if (btn) {
    btn.classList.toggle('bg-green-600', seenStates[idx]);
    btn.classList.toggle('bg-gray-600', !seenStates[idx]);
    btn.classList.toggle('hover:bg-gray-500', !seenStates[idx]);
    
    const emoji = btn.querySelector('.text-2xl');
    if (emoji) {
      emoji.textContent = seenStates[idx] ? '✅' : '❌';
    }
  }
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
      showSuccess(`Vote for "${movieTitle}" submitted successfully!`);
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

// Success message function
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  successDiv.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>✅</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(successDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

// Initialize everything
setupKeyboardShortcuts();
fetchMovieTitles();
