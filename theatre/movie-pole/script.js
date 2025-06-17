const sheetURL = "https://script.google.com/macros/s/AKfycbyPj4t_9siY080jxDzSmAWfPjdSSW8872k0mVkXYVb5lU2PdkgTDy7Q9LJOQRba1uOoew/exec";

const movies = [
  {
    title: "The Thing",
    genres: ["Horror", "Sci-Fi", "Suspense"],
    synopsis: "A research team in Antarctica is hunted by a shape-shifting alien.",
    runtime: "109 min",
    poster: "https://upload.wikimedia.org/wikipedia/en/2/2c/The_Thing_%281982%29_theatrical_poster.jpg"
  },
  {
    title: "Tucker and Dale vs. Evil",
    genres: ["Horror", "Comedy"],
    synopsis: "Two hillbillies are mistaken for killers by a group of clueless college students.",
    runtime: "89 min",
    poster: "https://upload.wikimedia.org/wikipedia/en/5/50/Tucker_%26_Dale_vs._Evil_Poster.jpg"
  }
  // Add more movies here
];

function createSlides() {
  const container = document.getElementById("movie-carousel");
  container.innerHTML = "";

  movies.forEach((movie, index) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";

    slide.innerHTML = `
      <h2>${movie.title}</h2>
      <img class="movie-poster" src="${movie.poster}" alt="${movie.title}">
      <div class="genre-tags">
        ${movie.genres.map(tag => `<span>${tag}</span>`).join("")}
      </div>
      <p>${movie.synopsis}</p>
      <p><strong>Runtime:</strong> ${movie.runtime}</p>
      <div class="vote-buttons">
        <button class="love" onclick="submitVote('${movie.title}', '❤️')">❤️</button>
        <button class="neutral" onclick="submitVote('${movie.title}', '😐')">😐</button>
        <button class="trash" onclick="submitVote('${movie.title}', '🗑️')">🗑️</button>
        <br><label><input type="checkbox" id="seen-${index}"> Seen it</label>
      </div>
    `;
    container.appendChild(slide);
  });

  new Swiper(".swiper", {
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev"
    }
  });
}

function submitVote(movieTitle, vote) {
  const userName = document.getElementById("username").value.trim();
  if (!userName) {
    alert("Please enter your name.");
    return;
  }

  const slideIndex = Array.from(document.querySelectorAll(".swiper-slide")).findIndex(slide =>
    slide.querySelector("h2")?.innerText === movieTitle
  );

  const seen = document.getElementById(`seen-${slideIndex}`)?.checked ? "✅" : "❌";

  fetch(sheetURL, {
    method: "POST",
    body: JSON.stringify({
      movieTitle,
      userName,
      vote,
      seen
    }),
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(res => res.text())
    .then(() => alert(`Vote for "${movieTitle}" submitted.`))
    .catch(err => alert("Failed to submit vote."));
}

createSlides();
