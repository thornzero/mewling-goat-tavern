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
  window[videoCb] = function(resp) {
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
      const label = v.type || 'Video';
      return `<button class="video-link" onclick="openVideo('${v.key}')">▶ ${label}</button>`;
    }).join(' ');

     const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <div class="slide-content">
        <img class="movie-poster" src="${m.poster}" alt="${m.title}">
        <div class="video-links">
          ${videoButtons}
        </div>
      </div>
      <h2>${m.title}</h2>
      <div class="genre-tags">
        ${m.genres.map(t => `<span>${t}</span>`).join("")}
      </div>
      <p>${m.synopsis}</p>
      <p><strong>Runtime:</strong> ${m.runtime}</p>
      <div class="seen-control">
        <div class="seen-label">Seen it?</div>
        <input type="checkbox" id="seen-${i}" hidden>
        <button id="seen-btn-${i}" class="seen-btn closed" onclick="toggleSeen(${i})">
          <span class="emoji open">👀</span>
          <span class="emoji closed">🙈</span>
        </button>
      </div>
      <div class="vote-buttons">
        <button class="love"    onclick="submitVote('${m.title}','❤️')">❤️</button>
        <button class="neutral" onclick="submitVote('${m.title}','😐')">😐</button>
        <button class="trash"   onclick="submitVote('${m.title}','🗑️')">🗑️</button>
      </div>
    `;
    container.appendChild(slide);
  });

  
  // Initialize Swiper
  swiper = new Swiper(".swiper", {
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev"
    }
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
  window[cb] = function(resp) {
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
