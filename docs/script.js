// script.js - Desktop version with new flow

// === CONFIGURATION ===
// Replace with your Google Apps Script Web App URL
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

// Loading state management
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('carousel-container').classList.add('hidden');
  const summaryContainer = document.getElementById('summary-container');
  if (summaryContainer) {
    summaryContainer.classList.add('hidden');
  }
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
  if (appState === 'voting') {
    document.getElementById('carousel-container').classList.remove('hidden');
    const summaryContainer = document.getElementById('summary-container');
    if (summaryContainer) {
      summaryContainer.classList.add('hidden');
    }
  } else {
    document.getElementById('carousel-container').classList.add('hidden');
    const summaryContainer = document.getElementById('summary-container');
    if (summaryContainer) {
      summaryContainer.classList.remove('hidden');
    }
  }
}

// Load saved votes from localStorage
function loadSavedVotes() {
  const saved = localStorage.getItem('movieVotes');
  if (saved) {
    userVotes = JSON.parse(saved);
  }
}

// Save votes to localStorage
function saveVotes() {
  localStorage.setItem('movieVotes', JSON.stringify(userVotes));
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
  
  // Check if all movies are voted on
  if (votedCount === totalCount && appState === 'voting' && totalCount > 0) {
    showSummary();
  }
}

// Show summary slide
function showSummary() {
  appState = 'summary';
  hideLoading();
  
  const summaryContainer = document.getElementById('summary-container');
  if (!summaryContainer) return;
  
  summaryContainer.innerHTML = `
    <div class="p-6 min-h-screen flex flex-col">
      <h2 class="text-3xl font-bold text-pink-500 mb-6 text-center">Your Movie Votes</h2>
      <div class="flex-1 overflow-y-auto">
        <div class="grid gap-4 max-h-[calc(100vh-200px)]">
          ${movieData.map((movie, index) => {
            const voteData = userVotes[index];
            const voteEmoji = voteData ? voteData.emoji : '❓';
            const voteLabel = voteData ? voteData.label : 'No vote';
            const seen = seenStates[index] ? '✅' : '❌';
            return `
              <div class="bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors" onclick="goToMovie(${index})">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-200">${movie.title}</h3>
                    <p class="text-sm text-gray-400">${movie.genres.slice(0, 3).join(', ')}</p>
                    <p class="text-xs text-gray-500">${voteLabel}</p>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">${voteEmoji}</span>
                    <span class="text-lg">${seen}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="mt-8 text-center">
        <button id="submit-all-btn" class="px-8 py-3 bg-pink-500 text-white rounded-lg font-bold text-lg hover:bg-pink-600 transition-colors">
          Submit All Votes
        </button>
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
  
  nameModal.classList.remove('hidden');
  nameInput.focus();
  nameError.textContent = '';
}

// Hide name entry modal
function hideNameModal() {
  const nameModal = document.getElementById('name-modal');
  const nameInput = document.getElementById('name-input');
  
  nameModal.classList.add('hidden');
  nameInput.value = '';
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
  
  // Get all movies that have votes
  const votesToSubmit = [];
  movieData.forEach((movie, index) => {
    if (userVotes[index]) {
      votesToSubmit.push({
        movie: movie,
        voteData: userVotes[index],
        seen: seenStates[index] ? "✅" : "❌",
        originalIndex: index
      });
    }
  });
  
  if (votesToSubmit.length === 0) {
    nameError.textContent = 'No votes to submit. Please vote on at least one movie.';
    nameSubmit.textContent = 'Submit';
    nameSubmit.disabled = false;
    return;
  }
  
  console.log(`Submitting ${votesToSubmit.length} votes:`, votesToSubmit.map(v => `${v.movie.title}: ${v.voteData.emoji}`));
  
  // Submit votes
  const promises = votesToSubmit.map((voteInfo) => {
    return new Promise((resolve, reject) => {
      const cb = `batchVoteCb_${voteInfo.originalIndex}_${Date.now()}`;
      window[cb] = function (resp) {
        if (resp && resp.rateLimitExceeded) {
          reject(new Error('Rate limit exceeded'));
        } else if (resp && resp.status === "ok") {
          resolve();
        } else {
          reject(new Error('Submission failed'));
        }
        delete window[cb];
      };
      
      const script = document.createElement('script');
      script.src = `${proxyURL}`
        + `?action=vote`
        + `&movieTitle=${encodeURIComponent(voteInfo.movie.title)}`
        + `&userName=${encodeURIComponent(userName)}`
        + `&vote=${encodeURIComponent(voteInfo.voteData.emoji)}`
        + `&seen=${encodeURIComponent(voteInfo.seen)}`
        + `&callback=${cb}`;
      document.body.appendChild(script);
    });
  });
  
  Promise.all(promises)
    .then(() => {
      // Show success message first, then hide modal after a delay
      showSuccess(`Successfully submitted ${votesToSubmit.length} votes!`);
      
      // Update summary page to show submission status
      updateSummaryAfterSubmission();
      
      setTimeout(() => {
        hideNameModal();
        // Clear local storage
        localStorage.removeItem('movieVotes');
        userVotes = {};
        // Reset progress
        updateProgress();
      }, 3000); // Show success message for 3 seconds
    })
    .catch((error) => {
      nameSubmit.textContent = 'Submit';
      nameSubmit.disabled = false;
      if (error.message === 'Rate limit exceeded') {
        showRateLimitError();
      } else {
        showError('Error submitting votes. Please try again.');
      }
    });
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
    
    switch(e.key) {
      case '1':
        e.preventDefault();
        recordVote(currentIndex, '❤️');
        break;
      case '2':
        e.preventDefault();
        recordVote(currentIndex, '😐');
        break;
      case '3':
        e.preventDefault();
        recordVote(currentIndex, '🗑️');
        break;
      case 's':
      case 'S':
        e.preventDefault();
        toggleSeen(currentIndex);
        break;
    }
  });
}

// Record a vote
function recordVote(index, voteData) {
  userVotes[index] = voteData; // Store the full vote data object
  saveVotes();
  updateProgress();
  
  // Auto-advance to next movie if not the last one
  if (index < movieData.length - 1 && swiper) {
    setTimeout(() => {
      swiper.slideNext();
    }, 500);
  }
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
    updateProgress();
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
          <div id="vote-buttons-${i}" class="flex gap-2">
            ${generateVoteButtons(i)}
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

// Generate vote buttons based on seen state
function generateVoteButtons(index) {
  const isSeen = seenStates[index];
  const options = isSeen ? VOTE_OPTIONS.seen : VOTE_OPTIONS.notSeen;
  const currentVote = userVotes[index];
  
  return options.map(option => {
    const isSelected = currentVote && currentVote.emoji === option.emoji;
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
    
    return `<button onclick="recordVote(${index}, ${JSON.stringify(option).replace(/"/g, '&quot;')})" 
                    class="px-3 py-1 ${bgColor} rounded ${hoverColor} transition ${borderClass}" 
                    title="${option.label}: ${option.meaning}">${option.emoji}</button>`;
  }).join('');
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
  const voteButtonsContainer = document.getElementById(`vote-buttons-${idx}`);
  if (voteButtonsContainer) {
    voteButtonsContainer.innerHTML = generateVoteButtons(idx);
  }
}

// Initialize everything
setupKeyboardShortcuts();
fetchMovieTitles();
