// script.js - Unified responsive version

// === CONFIGURATION ===
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";

// Vote options based on seen state
const VOTE_OPTIONS = {
  seen: [
    { emoji: '⭐', label: 'Rewatch', rank: 1, meaning: 'I\'ve seen this and would happily watch it again.' },
    { emoji: '😐', label: 'Meh', rank: 4, meaning: 'I\'ve seen this and I\'m indifferent about rewatching.' },
    { emoji: '🚫', label: 'Never', rank: 6, meaning: 'I\'ve seen this and never want to watch it again.' }
  ],
  notSeen: [
    { emoji: '🔥', label: 'Stoked', rank: 2, meaning: 'I haven\'t seen this yet and I\'m excited to watch it.' },
    { emoji: '⏳', label: 'Later', rank: 3, meaning: 'I haven\'t seen this yet and I\'m indifferent.' },
    { emoji: '💤', label: 'Skip', rank: 5, meaning: 'I haven\'t seen this and absolutely don\'t want to.' }
  ]
};

// State
let movieTitles = [];
let movieData = [];
let remaining = 0;
let swiper;
let seenStates = {}; // Track seen states for each movie
let userVotes = {}; // Store user votes locally with context
let appState = 'voting'; // 'voting' or 'summary'
let currentMovieIndex = 0;
let currentMovies = []; // Store current movies for layout updates

// DOM elements
const elements = {
  loading: null,
  carouselContainer: null,
  seenToggle: null,
  seenEmoji: null,
  voteLove: null,
  voteMeh: null,
  votePass: null,
  instructionsModal: null,
  helpButton: null,
  closeInstructions: null,
  summaryContainer: null,
  progressBar: null,
  submitButton: null,
  nameModal: null,
  nameInput: null,
  nameSubmit: null,
  nameError: null
};

// Initialize DOM elements
function initElements() {
  elements.loading = document.getElementById('loading');
  elements.carouselContainer = document.getElementById('carousel-container');
  elements.seenToggle = document.getElementById('seen-toggle');
  elements.seenEmoji = document.getElementById('seen-emoji');
  elements.voteLove = document.getElementById('vote-love');
  elements.voteMeh = document.getElementById('vote-meh');
  elements.votePass = document.getElementById('vote-pass');
  elements.instructionsModal = document.getElementById('instructions-modal');
  elements.helpButton = document.getElementById('help-button');
  elements.closeInstructions = document.getElementById('close-instructions');
  elements.summaryContainer = document.getElementById('summary-container');
  elements.progressBar = document.getElementById('progress-bar');
  elements.submitButton = document.getElementById('submit-button');
  elements.nameModal = document.getElementById('name-modal');
  elements.nameInput = document.getElementById('name-input');
  elements.nameSubmit = document.getElementById('name-submit');
  elements.nameError = document.getElementById('name-error');
}

// Loading state management
function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.carouselContainer.classList.add('hidden');
  if (elements.summaryContainer) {
    elements.summaryContainer.classList.add('hidden');
  }
}

function hideLoading() {
  elements.loading.classList.add('hidden');
  if (appState === 'voting') {
    elements.carouselContainer.classList.remove('hidden');
    if (elements.summaryContainer) {
      elements.summaryContainer.classList.add('hidden');
    }
  } else {
    elements.carouselContainer.classList.add('hidden');
    if (elements.summaryContainer) {
      elements.summaryContainer.classList.remove('hidden');
    }
  }
}

// Load saved votes from localStorage
function loadSavedVotes() {
  const saved = localStorage.getItem('movieVotes');
  if (saved) {
    userVotes = JSON.parse(saved);
  }
  
  // Load saved seen states
  const savedSeenStates = localStorage.getItem('movieSeenStates');
  if (savedSeenStates) {
    seenStates = JSON.parse(savedSeenStates);
  }
}

// Save votes to localStorage
function saveVotes() {
  localStorage.setItem('movieVotes', JSON.stringify(userVotes));
}

// Save seen states to localStorage
function saveSeenStates() {
  localStorage.setItem('movieSeenStates', JSON.stringify(seenStates));
}

// Reset all data to fresh state
function resetAllData() {
  // Clear localStorage
  localStorage.removeItem('movieVotes');
  localStorage.removeItem('movieSeenStates');
  
  // Reset state variables
  userVotes = {};
  seenStates = {};
  appState = 'voting';
  
  // Update UI
  updateProgress();
  
  // Go back to first movie if carousel is visible
  if (swiper) {
    swiper.slideTo(0);
  }
  
  // Hide summary and show carousel
  hideLoading();
  
  // Show success message
  showSuccess('All data reset! Starting fresh.');
}

// Update progress bar
function updateProgress() {
  const votedCount = Object.keys(userVotes).length;
  const totalCount = movieData.length;
  const percentage = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;
  
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
  
  const progressText = document.getElementById('progress-text');
  if (progressText) {
    progressText.textContent = `${votedCount}/${totalCount}`;
  }
  
  // Show/hide "Back to Summary" button
  const backToSummaryBtn = document.getElementById('back-to-summary-btn');
  if (backToSummaryBtn) {
    if (votedCount === totalCount && totalCount > 0) {
      backToSummaryBtn.classList.remove('hidden');
    } else {
      backToSummaryBtn.classList.add('hidden');
    }
  }
  
  // Check if all movies are voted on
  if (votedCount === totalCount && appState === 'voting' && totalCount > 0) {
    showSummary();
  }
}

// Update movie info
function updateMovieInfo(index) {
  const movie = movieData[index];
  if (!movie) return;
  
  currentMovieIndex = index;
  
  // Update seen toggle state
  updateSeenToggle(index);
  
  // Update vote buttons state
  updateVoteButtons(index);
  
  // Update progress
  updateProgress();
}

// Update seen toggle
function updateSeenToggle(index) {
  const isSeen = seenStates[index];
  elements.seenEmoji.textContent = isSeen ? '✅' : '❌';
  elements.seenToggle.querySelector('span:last-child').textContent = isSeen ? 'Seen it' : 'Haven\'t seen it';
  elements.seenToggle.className = `w-full py-2 md:py-3 px-3 md:px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors ${isSeen ? 'bg-green-600' : 'bg-gray-700'}`;
}

// Update vote buttons to show current vote
function updateVoteButtons(index) {
  const voteData = userVotes[index] || null;
  const isSeen = seenStates[index];
  const options = isSeen ? VOTE_OPTIONS.seen : VOTE_OPTIONS.notSeen;
  
  // Update button elements with new options
  const voteButtons = [
    { element: elements.voteLove, option: options[0] },
    { element: elements.voteMeh, option: options[1] },
    { element: elements.votePass, option: options[2] }
  ];
  
  voteButtons.forEach(({ element, option }) => {
    const isSelected = voteData && voteData.emoji === option.emoji;
    
    // Set emoji and label
    element.textContent = option.emoji;
    element.title = `${option.label}: ${option.meaning}`;
    
    // Set colors based on emoji
    const bgColor = isSelected ? 
      (option.emoji === '⭐' ? 'bg-yellow-700' : 
       option.emoji === '🔥' ? 'bg-orange-700' : 
       option.emoji === '⏳' ? 'bg-blue-700' : 
       option.emoji === '😐' ? 'bg-yellow-700' : 
       option.emoji === '💤' ? 'bg-gray-700' : 'bg-red-700') :
      (option.emoji === '⭐' ? 'bg-yellow-600' : 
       option.emoji === '🔥' ? 'bg-orange-600' : 
       option.emoji === '⏳' ? 'bg-blue-600' : 
       option.emoji === '😐' ? 'bg-yellow-600' : 
       option.emoji === '💤' ? 'bg-gray-600' : 'bg-red-600');
    
    const hoverColor = option.emoji === '⭐' ? 'hover:bg-yellow-700' : 
                      option.emoji === '🔥' ? 'hover:bg-orange-700' : 
                      option.emoji === '⏳' ? 'hover:bg-blue-700' : 
                      option.emoji === '😐' ? 'hover:bg-yellow-700' : 
                      option.emoji === '💤' ? 'hover:bg-gray-700' : 'hover:bg-red-700';
    
    const borderClass = isSelected ? 'border-2 border-white' : '';
    
    // Update classes
    element.className = `py-3 md:py-4 px-2 ${bgColor} rounded-lg text-xl md:text-2xl font-bold transition-colors active:${hoverColor} ${borderClass}`;
    
    // Update onclick handler
    element.onclick = () => recordVote(index, option);
  });
}

// Show summary slide
function showSummary() {
  appState = 'summary';
  hideLoading();
  
  const summaryContainer = document.getElementById('summary-container');
  if (!summaryContainer) return;
  
  summaryContainer.innerHTML = `
    <div class="p-4 md:p-6 min-h-screen flex flex-col">
      <h2 class="text-2xl md:text-3xl font-bold text-pink-500 mb-4 md:mb-6 text-center">Your Movie Votes</h2>
      <div class="flex-1 overflow-y-auto">
        <div class="space-y-3 md:space-y-4 max-h-[calc(100vh-180px)]">
          ${movieData.map((movie, index) => {
            const voteData = userVotes[index];
            const voteEmoji = voteData ? voteData.emoji : '❓';
            const voteLabel = voteData ? voteData.label : 'No vote';
            const seen = seenStates[index] ? '✅' : '❌';
            return `
              <div class="bg-gray-700 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors" onclick="goToMovie(${index})">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-200 text-sm md:text-lg">${movie.title}</h3>
                    <p class="text-xs md:text-sm text-gray-400">${movie.genres.slice(0, 3).join(', ')}</p>
                    <p class="text-xs text-gray-500">${voteLabel}</p>
                  </div>
                  <div class="flex items-center space-x-2 md:space-x-3">
                    <span class="text-lg md:text-2xl">${voteEmoji}</span>
                    <span class="text-sm md:text-lg">${seen}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="mt-6 text-center space-y-4">
        <button id="submit-all-btn" class="px-6 md:px-8 py-3 bg-pink-500 text-white rounded-lg font-bold text-lg hover:bg-pink-600 transition-colors">
          Submit All Votes
        </button>
        <div>
          <button onclick="resetAllData()" class="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
            🔄 Reset All & Start Over
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listener for submit button
  document.getElementById('submit-all-btn').addEventListener('click', showNameModal);
}

// Go back to specific movie
function goToMovie(index) {
  appState = 'voting';
  hideLoading();
  if (swiper) {
    swiper.slideTo(index);
  }
}

// Show name entry modal
function showNameModal() {
  const nameModal = document.getElementById('name-modal');
  const nameInput = document.getElementById('name-input');
  const nameError = document.getElementById('name-error');
  
  if (nameModal) {
    nameModal.classList.remove('hidden');
  }
  
  if (nameInput) {
    nameInput.focus();
  }
  
  if (nameError) {
    nameError.textContent = '';
  }
}

// Hide name entry modal
function hideNameModal() {
  const nameModal = document.getElementById('name-modal');
  const nameInput = document.getElementById('name-input');
  const nameSubmit = document.getElementById('name-submit');
  
  if (nameModal) {
    nameModal.classList.add('hidden');
  }
  
  if (nameInput) {
    nameInput.value = '';
  }
  
  if (nameSubmit) {
    nameSubmit.textContent = 'Submit';
    nameSubmit.disabled = false;
  }
}

// Validate and submit votes
function submitAllVotes() {
  const nameInput = document.getElementById('name-input');
  const nameSubmit = document.getElementById('name-submit');
  const nameError = document.getElementById('name-error');
  
  const userName = nameInput.value.trim();
  
  if (userName.length < 2) {
    nameError.textContent = 'Please enter a name (at least 2 characters)';
    return;
  }
  
  // Show loading state
  nameSubmit.textContent = 'Submitting...';
  nameSubmit.disabled = true;
  
  // Prepare all votes as a single batch
  const votesBatch = [];
  movieData.forEach((movie, index) => {
    if (userVotes[index]) {
      votesBatch.push({
        movieTitle: movie.title,
        userName: userName,
        vote: userVotes[index].emoji,
        seen: seenStates[index] ? "✅" : "❌",
        timestamp: new Date().toISOString()
      });
    }
  });
  
  if (votesBatch.length === 0) {
    nameError.textContent = 'No votes to submit. Please vote on at least one movie.';
    nameSubmit.textContent = 'Submit';
    nameSubmit.disabled = false;
    return;
  }
  
  console.log(`Submitting batch of ${votesBatch.length} votes:`, votesBatch);
  
  // Submit all votes as a single batch
  const cb = `batchVoteCb_${Date.now()}`;
  window[cb] = function (resp) {
    if (resp && resp.rateLimitExceeded) {
      nameSubmit.textContent = 'Submit';
      nameSubmit.disabled = false;
      showRateLimitError();
    } else if (resp && resp.status === "ok") {
      // Show success message
      showSuccess(`Successfully submitted ${votesBatch.length} votes!`);
      
      // Update summary page to show submission status
      updateSummaryAfterSubmission();
      
      setTimeout(() => {
        hideNameModal();
        // Clear local storage
        localStorage.removeItem('movieVotes');
        localStorage.removeItem('movieSeenStates');
        userVotes = {};
        seenStates = {};
        // Reset progress
        updateProgress();
      }, 3000); // Show success message for 3 seconds
    } else {
      nameSubmit.textContent = 'Submit';
      nameSubmit.disabled = false;
      showError('Error submitting votes. Please try again.');
    }
    delete window[cb];
  };
  
  const script = document.createElement('script');
  script.src = `${proxyURL}`
    + `?action=batchVote`
    + `&votes=${encodeURIComponent(JSON.stringify(votesBatch))}`
    + `&callback=${cb}`;
  document.body.appendChild(script);
}

// Update summary page to show submission status
function updateSummaryAfterSubmission() {
  const summaryContainer = document.getElementById('summary-container');
  if (summaryContainer && appState === 'summary') {
    const submitButton = document.getElementById('submit-all-btn');
    if (submitButton) {
      submitButton.textContent = '✅ Votes Submitted!';
      submitButton.className = 'px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg transition-colors cursor-default';
      submitButton.disabled = true;
    }
  }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Only handle shortcuts when carousel is visible and in voting mode
    if (document.getElementById('carousel-container').classList.contains('hidden') || appState !== 'voting') {
      return;
    }
    
    const currentIndex = swiper ? swiper.activeIndex : 0;
    const currentMovie = movieData[currentIndex];
    
    if (!currentMovie) return;
    
    const isSeen = seenStates[currentIndex];
    const options = isSeen ? VOTE_OPTIONS.seen : VOTE_OPTIONS.notSeen;
    
    switch(e.key) {
      case '1':
        e.preventDefault();
        recordVote(currentIndex, options[0]); // First option (⭐ or 🔥)
        break;
      case '2':
        e.preventDefault();
        recordVote(currentIndex, options[1]); // Second option (😐 or ⏳)
        break;
      case '3':
        e.preventDefault();
        recordVote(currentIndex, options[2]); // Third option (🚫 or 💤)
        break;
      case 's':
      case 'S':
        e.preventDefault();
        toggleSeen(currentIndex);
        break;
      case 'Escape':
        e.preventDefault();
        // If we came from summary, go back to summary
        if (Object.keys(userVotes).length === movieData.length) {
          showSummary();
        }
        break;
    }
  });
}

// Record a vote
function recordVote(index, voteData) {
  userVotes[index] = voteData; // Store the full vote data object
  saveVotes();
  updateProgress();
  
  // Show feedback
  const option = voteData;
  showToast(`${option.label}: ${option.meaning}`, 'success');
  
  // Auto-advance to next movie if not the last one
  if (index < movieData.length - 1 && swiper) {
    setTimeout(() => {
      swiper.slideNext();
    }, 1000);
  }
}

// Setup event handlers
function setupEventHandlers() {
  // Seen toggle
  elements.seenToggle.addEventListener('click', () => {
    toggleSeen(currentMovieIndex);
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
  
  // Name modal events
  const nameSubmit = document.getElementById('name-submit');
  const nameInput = document.getElementById('name-input');
  const nameModal = document.getElementById('name-modal');
  
  if (nameSubmit) {
    nameSubmit.addEventListener('click', submitAllVotes);
  }
  
  if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitAllVotes();
      }
    });
  }
  
  // Close name modal on background click
  if (nameModal) {
    nameModal.addEventListener('click', (e) => {
      if (e.target === nameModal) {
        hideNameModal();
      }
    });
  }
  
  // Handle orientation change
  window.addEventListener('resize', handleOrientationChange);
  window.addEventListener('orientationchange', handleOrientationChange);
}

// Handle orientation change
function handleOrientationChange() {
  if (currentMovies.length > 0 && appState === 'voting') {
    const currentIndex = swiper ? swiper.activeIndex : 0;
    createSlides(currentMovies);
    if (swiper) {
      swiper.slideTo(currentIndex);
    }
  }
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

// Step 1: Fetch movie titles list from Google Sheet
function fetchMovieTitles() {
  showLoading();
  loadSavedVotes(); // Load any existing votes
  
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
    const cachedData = JSON.parse(cached);
    movieData[idx] = cachedData;
    
    // If cached data doesn't have videos, fetch them
    if (!cachedData.videos || cachedData.videos.length === 0) {
      fetchVideos(id, idx);
    } else {
      handleDone();
    }
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
      movieData[idx].videos = [];
    }
    
    // Update cache with videos included
    const storageKey = `movie_${id}`;
    localStorage.setItem(storageKey, JSON.stringify(movieData[idx]));
    
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
    updateProgress();
  }
}

// Render carousel slides
function createSlides(movies) {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";
  
  // Store current movies for orientation changes
  currentMovies = movies;
  
  movies.forEach((m, i) => {
    // Debug: Log video data for each movie
    console.log(`Movie ${i}: ${m.title} - Videos:`, m.videos);
    
    const slide = document.createElement("div");
    slide.className = "swiper-slide bg-gray-700 p-3 md:p-4 flex flex-col";
    
    // Check if we're in landscape mode
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isLandscape) {
      // Landscape layout: poster on left, content on right - scales proportionally
      slide.innerHTML = `
        <div class="flex-1 flex flex-row gap-4 md:gap-6">
          <!-- Poster on the left - scales with screen size -->
          <div class="w-2/5 flex-shrink-0">
            <div class="relative">
              <img class="w-full aspect-[2/3] object-cover rounded-lg shadow-lg" src="${m.poster}" alt="${m.title}">
              <!-- Trailer button chip over top left corner -->
              ${m.videos && m.videos.length > 0 ? `
                <button onclick="openVideo('${m.videos[0].key}')" 
                        class="absolute top-2 left-2 bg-black bg-opacity-80 hover:bg-opacity-95 text-white rounded-full px-3 py-1.5 md:px-4 md:py-2 flex items-center space-x-1 md:space-x-2 transition-all duration-200 transform hover:scale-105 z-10 text-xs md:text-sm font-medium"
                        title="Watch Trailer">
                  <span class="text-sm md:text-base">▶</span>
                  <span>Trailer</span>
                </button>
              ` : ''}
            </div>
          </div>
          
          <!-- Content on the right - scales with screen size -->
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-lg md:text-2xl font-bold text-pink-500 mb-2 md:mb-3">${m.title}</h3>
              <div class="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4">
                ${m.genres.slice(0, 4).map(t => `<span class="px-2 md:px-3 py-1 bg-gray-600 rounded-full text-xs md:text-sm">${t}</span>`).join('')}
              </div>
              <p class="text-gray-300 text-sm md:text-base leading-relaxed mb-2 md:mb-4">${m.synopsis}</p>
              <p class="text-gray-400 text-sm md:text-lg font-medium mb-2 md:mb-4">${m.runtime}</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Portrait layout: stacked - scales proportionally
      slide.innerHTML = `
        <div class="flex-1 flex flex-col">
          <div class="relative mb-3 md:mb-4">
            <img class="w-full aspect-[2/3] object-cover rounded-lg" src="${m.poster}" alt="${m.title}">
            <!-- Trailer button chip over top left corner -->
            ${m.videos && m.videos.length > 0 ? `
              <button onclick="openVideo('${m.videos[0].key}')" 
                      class="absolute top-2 left-2 bg-black bg-opacity-80 hover:bg-opacity-95 text-white rounded-full px-3 py-1.5 flex items-center space-x-1 transition-all duration-200 transform hover:scale-105 z-10 text-xs font-medium"
                      title="Watch Trailer">
                <span class="text-sm">▶</span>
                <span>Trailer</span>
              </button>
            ` : ''}
          </div>
          <div class="flex-1">
            <h3 class="text-base md:text-lg font-semibold text-pink-500 mb-1 md:mb-2">${m.title}</h3>
            <div class="flex flex-wrap gap-1 mb-1 md:mb-2">
              ${m.genres.slice(0, 3).map(t => `<span class="px-2 py-1 bg-gray-600 rounded-full text-xs">${t}</span>`).join('')}
            </div>
            <p class="text-gray-300 text-xs md:text-sm mb-1 md:mb-2 line-clamp-3">${m.synopsis}</p>
            <p class="text-gray-400 text-xs md:text-sm">${m.runtime}</p>
          </div>
        </div>
      `;
    }
    
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
  if (key) {
    window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
  }
}

// Toggle "Seen it" state
function toggleSeen(idx) {
  seenStates[idx] = !seenStates[idx];
  
  // Update seen toggle display
  updateSeenToggle(idx);
  
  // Clear existing vote if it's no longer valid for the new context
  const currentVote = userVotes[idx];
  if (currentVote) {
    const newOptions = seenStates[idx] ? VOTE_OPTIONS.seen : VOTE_OPTIONS.notSeen;
    const isValidVote = newOptions.some(option => option.emoji === currentVote.emoji);
    if (!isValidVote) {
      delete userVotes[idx];
      saveVotes();
    }
  }
  
  // Refresh vote buttons
  updateVoteButtons(idx);
  
  // Show feedback
  const status = seenStates[idx] ? 'seen' : 'not seen';
  showToast(`Marked as ${status}`, 'info');
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  initElements();
  setupEventHandlers();
  setupKeyboardShortcuts();
  fetchMovieTitles();
});
