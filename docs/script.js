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

    // 1. Extract title + year
    let title = rawTitle;
    let year = null;
    const m = rawTitle.match(/(.+?)\s*\((\d{4})\)$/);
    if (m) {
      title = m[1].trim();
      year = m[2];
    }

    // 2. Set up callback
    const searchCb = `searchCb_${idx}`;
    window[searchCb] = function (resp) {
      if (resp && resp.results && resp.results[0]) {
        fetchDetails(resp.results[0].id, idx);
      } else {
        console.error(`No result for "${title}"`);
        handleDone();
      }
      delete window[searchCb];
    };

    // 3. Build the JSONP URL including &year= if we have one
    let url = `${proxyURL}?action=search`
      + `&query=${encodeURIComponent(title)}`;
    if (year) url += `&year=${year}`;
    url += `&callback=${searchCb}`;

    // 4. Inject the <script>
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
      videoKey: ''
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
      const teaser = resp.results.find(v => v.type === 'Teaser') || resp.results[0];
      movieData[idx].videoKey = teaser.key;
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
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <h2>${m.title}</h2>
      <div class="slide-content">
        <img class="movie-poster" src="${m.poster}" alt="${m.title}">
        ${m.videoKey ? `<div class="video-container">
          <iframe data-key="${m.videoKey}" src="https://www.youtube-nocookie.com/embed/${m.videoKey}?modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>` : ''}
      </div>
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

  // Initialize Swiper and handle slide-change for autoplay
  swiper = new Swiper(".swiper", {
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev"
    }
  });
  swiper.on('slideChange', playActiveVideo);
  playActiveVideo();
}

// Autoplay teaser for active slide
function playActiveVideo() {
  document.querySelectorAll('.swiper-slide').forEach((slide, idx) => {
    const iframe = slide.querySelector('iframe');
    if (iframe) {
      const key = iframe.dataset.key;
      let src = `https://www.youtube-nocookie.com/embed/${key}?modestbranding=1&rel=0`;
      if (idx === swiper.activeIndex) {
        src += '?autoplay=1';
      }
      iframe.src = src;
    }
  });
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
  const slides = Array.from(document.querySelectorAll(".swiper-slide"));
  const idx = slides.findIndex(s => s.querySelector("h2").innerText === movieTitle);
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
