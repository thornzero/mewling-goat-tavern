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
<<<<<<< HEAD
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
    <div class="p-2 md:p-4 lg:p-6 h-full flex flex-col min-h-0">
      <h2 class="text-lg md:text-2xl lg:text-3xl font-bold text-pink-500 mb-2 md:mb-4 lg:mb-6 text-center flex-shrink-0">Your Movie Votes</h2>
      <div class="flex-1 overflow-y-auto min-h-0">
        <div class="space-y-2 md:space-y-3 lg:space-y-4">
          ${movieData.map((movie, index) => {
            const voteData = userVotes[index];
            const voteEmoji = voteData ? voteData.emoji : '❓';
            const voteLabel = voteData ? voteData.label : 'No vote';
            const seen = seenStates[index] ? '✅' : '❌';
            return `
              <div class="bg-gray-700 p-2 md:p-3 lg:p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors" onclick="goToMovie(${index})">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-200 text-xs md:text-sm lg:text-lg truncate">${movie.title}</h3>
                    <p class="text-xs md:text-sm text-gray-400 truncate">${movie.genres.slice(0, 3).join(', ')}</p>
                    <p class="text-xs text-gray-500">${voteLabel}</p>
                  </div>
                  <div class="flex items-center space-x-1 md:space-x-2 lg:space-x-3 flex-shrink-0">
                    <span class="text-sm md:text-lg lg:text-2xl">${voteEmoji}</span>
                    <span class="text-xs md:text-sm lg:text-lg">${seen}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="mt-4 md:mt-6 text-center space-y-2 md:space-y-4 flex-shrink-0">
        <button id="submit-all-btn" class="px-4 md:px-6 lg:px-8 py-2 md:py-3 bg-pink-500 text-white rounded-lg font-bold text-sm md:text-lg hover:bg-pink-600 transition-colors">
          Submit All Votes
        </button>
        <div>
          <button onclick="resetAllData()" class="px-4 md:px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-xs md:text-sm">
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
=======
let userName = '';
let moviesLoaded = false;
let currentMovieIndex = 0;
>>>>>>> c3f7d55 (changed voting to be step by step name first, then seen/not seen, then vibe)

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
<<<<<<< HEAD
    createSlides(movieData);
    hideLoading();
    updateProgress();
  }
}

// Render carousel slides
=======
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
>>>>>>> c3f7d55 (changed voting to be step by step name first, then seen/not seen, then vibe)
function createSlides(movies) {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";
  
<<<<<<< HEAD
  // Store current movies for orientation changes
  currentMovies = movies;
  
  movies.forEach((m, i) => {
    // Debug: Log video data for each movie
    console.log(`Movie ${i}: ${m.title} - Videos:`, m.videos);
    console.log(`Movie ${i}: ${m.title} - Videos length:`, m.videos ? m.videos.length : 0);
    console.log(`Movie ${i}: ${m.title} - First video key:`, m.videos && m.videos.length > 0 ? m.videos[0].key : 'none');
    
    const slide = document.createElement("div");
    slide.className = "swiper-slide bg-gray-700 p-2 md:p-3 lg:p-4 flex flex-col h-full";
    
    // Check if we're in landscape mode
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (isLandscape) {
      // Landscape layout: poster on left, content on right - scales proportionally
      slide.innerHTML = `
        <div class="flex-1 flex flex-row gap-2 md:gap-4 lg:gap-6 h-full min-h-0">
          <!-- Poster on the left - scales with screen size -->
          <div class="w-2/5 flex-shrink-0 flex flex-col">
            <div class="relative h-full">
              <img class="w-full h-full object-cover rounded-lg shadow-lg" style="max-height: 100%;" src="${m.poster}" alt="${m.title}">
              <!-- Trailer button chip over top left corner -->
              ${m.videos && m.videos.length > 0 ? `
                <button onclick="openVideo('${m.videos[0].key}')" 
                        class="absolute top-1 md:top-2 left-1 md:left-2 bg-black bg-opacity-90 hover:bg-opacity-100 text-white rounded-full px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 flex items-center space-x-1 md:space-x-2 transition-all duration-200 transform hover:scale-105 z-20 text-xs md:text-sm font-medium shadow-lg border border-white border-opacity-20 min-w-[60px] md:min-w-[70px] lg:min-w-[80px]"
                        title="Watch Trailer">
                  <span class="text-xs md:text-sm lg:text-base">▶</span>
                  <span class="whitespace-nowrap">Trailer</span>
                </button>
              ` : ''}
            </div>
          </div>
          
          <!-- Content on the right - scales with screen size -->
          <div class="flex-1 flex flex-col justify-between min-h-0">
            <div class="flex-1 flex flex-col min-h-0">
              <h3 class="text-sm md:text-lg lg:text-2xl font-bold text-pink-500 mb-1 md:mb-2 lg:mb-3 flex-shrink-0">${m.title}</h3>
              <div class="flex flex-wrap gap-1 md:gap-2 mb-1 md:mb-2 lg:mb-4 flex-shrink-0">
                ${m.genres.slice(0, 4).map(t => `<span class="px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 bg-gray-600 rounded-full text-xs md:text-sm">${t}</span>`).join('')}
              </div>
              <div class="flex-1 min-h-0 overflow-hidden">
                <p class="text-gray-300 text-xs md:text-sm lg:text-base leading-relaxed line-clamp-4 md:line-clamp-6 lg:line-clamp-8">${m.synopsis}</p>
              </div>
              <p class="text-gray-400 text-xs md:text-sm lg:text-lg font-medium mt-1 md:mt-2 lg:mt-4 flex-shrink-0">${m.runtime}</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Portrait layout: stacked - scales proportionally
      slide.innerHTML = `
        <div class="flex-1 flex flex-col h-full min-h-0">
          <div class="relative mb-2 md:mb-3 lg:mb-4 flex-shrink-0" style="height: 75%;">
            <img class="w-full h-full object-cover rounded-lg" src="${m.poster}" alt="${m.title}">
            <!-- Trailer button chip over top left corner -->
            ${m.videos && m.videos.length > 0 ? `
              <button onclick="openVideo('${m.videos[0].key}')" 
                      class="absolute top-1 md:top-2 left-1 md:left-2 bg-black bg-opacity-90 hover:bg-opacity-100 text-white rounded-full px-2 md:px-3 py-1 md:py-1.5 flex items-center space-x-1 md:space-x-2 transition-all duration-200 transform hover:scale-105 z-20 text-xs md:text-sm font-medium shadow-lg border border-white border-opacity-20 min-w-[60px] md:min-w-[70px]"
                      title="Watch Trailer">
                <span class="text-xs md:text-sm">▶</span>
                <span class="whitespace-nowrap">Trailer</span>
              </button>
            ` : ''}
          </div>
          <div class="flex-1 flex flex-col min-h-0">
            <h3 class="text-sm md:text-lg lg:text-2xl font-bold text-pink-500 mb-1 md:mb-2 lg:mb-3 flex-shrink-0">${m.title}</h3>
            <div class="flex flex-wrap gap-1 md:gap-2 mb-1 md:mb-2 lg:mb-4 flex-shrink-0">
              ${m.genres.slice(0, 3).map(t => `<span class="px-1.5 md:px-2 lg:px-3 py-0.5 md:py-1 bg-gray-600 rounded-full text-xs md:text-sm">${t}</span>`).join('')}
            </div>
            <div class="flex-1 min-h-0 overflow-hidden">
              <p class="text-gray-300 text-xs md:text-sm lg:text-base leading-relaxed line-clamp-3 md:line-clamp-4 lg:line-clamp-5">${m.synopsis}</p>
            </div>
            <p class="text-gray-400 text-xs md:text-sm lg:text-lg font-medium mt-1 md:mt-2 lg:mt-4 flex-shrink-0">${m.runtime}</p>
          </div>
        </div>
      `;
    }
    
=======
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
>>>>>>> c3f7d55 (changed voting to be step by step name first, then seen/not seen, then vibe)
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
<<<<<<< HEAD
  
  // Initialize first movie info
  updateMovieInfo(0);
=======
>>>>>>> c3f7d55 (changed voting to be step by step name first, then seen/not seen, then vibe)
}

// Open YouTube video in new tab
function openVideo(key) {
  if (key) {
    window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
  }
}

<<<<<<< HEAD
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
=======
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
>>>>>>> c3f7d55 (changed voting to be step by step name first, then seen/not seen, then vibe)
