// script.js

// === CONFIGURATION ===
// Replace with your Google Apps Script Web App URL
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";

// State
let movieTitles = [];
let movieData = [];
let remaining = 0;
let swiper;

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
  const detailCb = `detailCb_${idx}`;
  window[detailCb] = function (data) {
    movieData[idx] = {
      title: data.title,
      poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      genres: data.genres.map(g => g.name),
      synopsis: data.overview,
      runtime: `${data.runtime} min`,
      videos: []
    };
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
    createSlides(movieData);
  }
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
          <button onclick="toggleSeen(${i})" class="flex items-center space-x-2">
            <span class="text-2xl">${/* emoji toggles via JS */''}</span>
            <span class="font-medium">Have you seen it?</span>
          </button>
          <div class="flex gap-2">
            <button class="px-3 py-1 bg-green-600 rounded">❤️</button>
            <button class="px-3 py-1 bg-yellow-500 rounded">😐</button>
            <button class="px-3 py-1 bg-red-600 rounded">🗑️</button>
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

// Toggle "Seen it" state
function toggleSeen(idx) {
  const checkbox = document.getElementById(`seen-${idx}`);
  const btn = document.getElementById(`seen-btn-${idx}`);
  checkbox.checked = !checkbox.checked;
  btn.classList.toggle('open', checkbox.checked);
  btn.classList.toggle('closed', !checkbox.checked);
}

// Submit a vote via JSONP
function submitVote(movieTitle, vote) {
  const userName = document.getElementById("username").value.trim();
  if (!userName) { alert("Please enter your name."); return; }
  const idx = Array.from(document.querySelectorAll(".swiper-slide")).findIndex(s =>
    s.querySelector("h2").innerText === movieTitle
  );
  const seen = document.getElementById(`seen-${idx}`).checked ? "✅" : "❌";
  const cb = `voteCb_${idx}_${Date.now()}`;
  window[cb] = function (resp) {
    alert(resp.status === "ok" ? `Vote for \"${movieTitle}\" submitted.` : "Error submitting vote.");
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

// Start the flow
fetchMovieTitles();
