// script.js

// === CONFIGURATION ===
// Replace with your Google Apps Script Web App URL
const proxyURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";
// List of TMDb IDs for your movie candidates
const movieIds = [1091, 46838, 4232, 6978]; // The Thing, Tucker & Dale, Scream, Big Trouble

// Container for fetched movie data
const movieData = [];

// Initialize: fetch all movie details via JSONP and render when done
function init() {
  let remaining = movieIds.length;

  movieIds.forEach((id, idx) => {
    // Dynamically create a unique callback for each movie
    const cbName = `tmdbCallback_${id}`;
    window[cbName] = function (data) {
      // Transform TMDb response into slide-friendly format
      movieData.push({
        title: data.title,
        poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
        genres: data.genres.map(g => g.name),
        synopsis: data.overview,
        runtime: `${data.runtime} min`
      });
      remaining--;
      if (remaining === 0) {
        createSlidesFromData(movieData);
      }
      // Clean up
      delete window[cbName];
    };

    // Inject JSONP <script> tag to fetch movie details
    const script = document.createElement('script');
    script.src = `${proxyURL}`
      + `?action=movie&id=${id}`
      + `&callback=tmdbCallback_${id}`;
    document.body.appendChild(script);
  });
}

// Render carousel slides from fetched data
function createSlidesFromData(movies) {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";

  movies.forEach((m, i) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <img class="movie-poster" src="${m.poster}" alt="${m.title}">
      <h2>${m.title}</h2>
      <div class="genre-tags">
        ${m.genres.map(t => `<span>${t}</span>`).join("")}
      </div>
      <p>${m.synopsis}</p>
      <p><strong>Runtime:</strong> ${m.runtime}</p>
      <div class="vote-buttons">
        <button class="love"    onclick="submitVote('${m.title}','❤️')">❤️</button>
        <button class="neutral" onclick="submitVote('${m.title}','😐')">😐</button>
        <button class="trash"   onclick="submitVote('${m.title}','🗑️')">🗑️</button>
        <label class="switch">
          <input type="checkbox" id="seen-${i}">
            <span class="slider round"></span>
            Seen it
        </label>
      </div>
    `;
    container.appendChild(slide);
  });

  // Initialize Swiper carousel navigation
  new Swiper(".swiper", {
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev"
    }
  });
}

// Submit a vote via JSONP to the Apps Script proxy
function submitVote(movieTitle, vote) {
  const userName = document.getElementById("username").value.trim();
  if (!userName) {
    alert("Please enter your name.");
    return;
  }

  // Determine slide index for 'seen' checkbox
  const slides = Array.from(document.querySelectorAll(".swiper-slide"));
  const idx = slides.findIndex(s => s.querySelector("h2").innerText === movieTitle);
  const seen = document.getElementById(`seen-${idx}`)?.checked ? "✅" : "❌";

  // Create unique callback for vote response
  const cbName = `voteCallback_${idx}_${Date.now()}`;
  window[cbName] = function (resp) {
    if (resp && resp.status === "ok") {
      alert(`Vote for "${movieTitle}" submitted.`);
    } else {
      alert("Error submitting vote.");
    }
    delete window[cbName];
  };

  // Inject JSONP <script> to submit vote
  const script = document.createElement('script');
  script.src = `${proxyURL}`
    + `?action=vote`
    + `&movieTitle=${encodeURIComponent(movieTitle)}`
    + `&userName=${encodeURIComponent(userName)}`
    + `&vote=${encodeURIComponent(vote)}`
    + `&seen=${encodeURIComponent(seen)}`
    + `&callback=${cbName}`;
  document.body.appendChild(script);
}

// Kick off the init on load
init();
