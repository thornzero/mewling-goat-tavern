class m{static baseUrl="";static async makeRequest(t,n={}){const o=`${this.baseUrl}/api?action=${t}`,s=await fetch(o,{headers:{"Content-Type":"application/json",...n.headers},...n});if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);return await s.json()}static async vote(t){return await this.makeRequest("vote",{method:"POST",body:JSON.stringify(t)})}static async batchVote(t){return await this.makeRequest("batchVote",{method:"POST",body:JSON.stringify(t)})}static async searchMovies(t){const n=new URLSearchParams({query:t.query,...t.year&&{year:t.year.toString()},page:(t.page||1).toString()});return await this.makeRequest(`search&${n}`)}static async listMovies(){return await this.makeRequest("listMovies")}static async getMovieDetails(t){return await this.makeRequest(`movie&id=${t.id}`)}static async updateAppeal(){return await this.makeRequest("updateAppeal",{method:"POST"})}static async debug(){return await this.makeRequest("debug")}}let r=[],l=0,g=!1,c="",d=null;document.addEventListener("DOMContentLoaded",async()=>{console.log("Initializing movie poll app"),p(),console.log("App initialized successfully")});function p(){const e=document.getElementById("username"),t=document.getElementById("start-poll-btn"),n=document.querySelector("form");if(!e||!t||!n){console.error("Name entry form elements not found");return}function o(){const i=e.value.trim().length>=2;t.disabled=!i}function s(){const i=e.value.trim();i&&(c=i,b())}function a(i){i.key==="Enter"&&!t.disabled&&s()}e.addEventListener("input",o),e.addEventListener("keypress",a),t.addEventListener("click",s),o()}async function b(){try{const e=document.getElementById("loading-indicator");e&&e.classList.remove("hidden"),console.log("Loading movies..."),r=(await m.listMovies()).movies||[],l=r.length,g=!0,console.log(`Loaded ${r.length} movies`),y();const n=document.getElementById("movie-carousel");if(!n)throw new Error("Movie carousel not found");n.innerHTML="";for(const i of r){const h=f(i);n.appendChild(h)}const o=document.getElementById("name-entry-screen"),s=document.getElementById("movie-poll-screen"),a=document.getElementById("user-greeting");o&&s&&(o.classList.add("hidden"),s.classList.remove("hidden")),a&&(a.textContent=`Hello, ${c}!`),v(),u(),e&&e.classList.add("hidden"),console.log("Movie poll started successfully")}catch(e){console.error("Failed to start movie poll",e),I("Failed to load the movie poll. Please refresh the page.");const t=document.getElementById("loading-indicator");t&&t.classList.add("hidden")}}function y(){if(d&&d.destroy(!0,!0),!document.querySelector(".swiper")){console.error("Swiper container not found");return}d=new window.Swiper(".swiper",{direction:"horizontal",loop:!1,allowTouchMove:!0,resistanceRatio:.85,pagination:{el:".swiper-pagination",clickable:!0},on:{slideChange:()=>{v(),u()},reachEnd:()=>{q()}}})}function f(e){const t=document.createElement("div");t.className="swiper-slide movie-card",t.dataset.movieId=e.id.toString();const n=e.poster_path?`https://image.tmdb.org/t/p/w500${e.poster_path}`:"/placeholder-poster.jpg";return t.innerHTML=`
        <div class="movie-poster">
            <img src="${n}" alt="${e.title} poster" loading="lazy">
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${e.title}</h3>
            <p class="movie-year">${e.year}</p>
            <p class="movie-overview">${e.overview||"No overview available"}</p>
        </div>
        <div class="voting-flow">
            <div class="voting-step rating">
                <h3>How does this movie make you feel?</h3>
                <div class="flex">
                    <button class="rating-btn" data-vibe="1">Hate it</button>
                    <button class="rating-btn" data-vibe="2">Dislike</button>
                    <button class="rating-btn" data-vibe="3">Meh</button>
                    <button class="rating-btn" data-vibe="4">Like it</button>
                    <button class="rating-btn" data-vibe="5">Love it</button>
                    <button class="rating-btn" data-vibe="6">Obsessed</button>
                </div>
            </div>
            <div class="voting-step interest hidden">
                <h3>How interested are you in watching this?</h3>
                <div class="flex">
                    <button class="interest-btn" data-vibe="4">Not interested</button>
                    <button class="interest-btn" data-vibe="5">Somewhat interested</button>
                    <button class="interest-btn" data-vibe="6">Very interested</button>
                </div>
            </div>
            <div class="voting-step seen hidden">
                <h3>Have you seen this movie?</h3>
                <div class="flex">
                    <button class="seen-yes-btn">Yes</button>
                    <button class="seen-no-btn">No</button>
                </div>
            </div>
            <div class="voting-step confirmation hidden">
                <h3>✅ Vote recorded!</h3>
                <p>Thank you for your vote!</p>
            </div>
        </div>
    `,w(t),t}function w(e){const t=e.querySelectorAll(".rating-btn"),n=e.querySelectorAll(".interest-btn"),o=e.querySelectorAll(".seen-yes-btn, .seen-no-btn");t.forEach(s=>{s.addEventListener("click",()=>{parseInt(s.getAttribute("data-vibe")||"0"),E(e)})}),n.forEach(s=>{s.addEventListener("click",()=>{parseInt(s.getAttribute("data-vibe")||"0"),L(e)})}),o.forEach(s=>{s.addEventListener("click",()=>{const a=s.classList.contains("seen-yes-btn");S(e,a)})})}function E(e,t){const n=e.querySelector(".rating"),o=e.querySelector(".interest");n&&o&&(n.classList.add("hidden"),o.classList.remove("hidden"))}function L(e,t){const n=e.querySelector(".interest"),o=e.querySelector(".seen");n&&o&&(n.classList.add("hidden"),o.classList.remove("hidden"))}async function S(e,t){const n=parseInt(e.dataset.movieId||"0"),o=4;try{const s=await m.vote({movie_id:n,user_name:c,vibe:o,seen:t});if(s.success)e.classList.add("voted"),u(),x(e),setTimeout(()=>{d&&!d.isEnd&&d.slideNext()},1500);else throw new Error(s.message||"Failed to record vote")}catch(s){console.error("Failed to record vote",s),k(e,"Failed to record your vote. Please try again.")}}function k(e,t){const n=document.createElement("div");n.className="vote-error bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4",n.innerHTML=`
        <div class="flex items-center space-x-2">
            <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-red-300">${t}</span>
        </div>
    `;const o=e.querySelector(".voting-flow");o&&(o.insertBefore(n,o.firstChild),setTimeout(()=>{n.parentNode&&n.remove()},5e3))}function x(e){const t=e.querySelector(".rating"),n=e.querySelector(".interest"),o=e.querySelector(".seen"),s=e.querySelector(".confirmation");t.classList.add("hidden"),n.classList.add("hidden"),o.classList.add("hidden"),s.classList.remove("hidden")}function v(){const e=document.getElementById("remaining");e&&(e.textContent=`${l} movies remaining`)}function u(){const e=document.getElementById("progress-bar");if(e&&r.length>0){const t=(r.length-l)/r.length*100;e.style.width=`${t}%`}}function q(){const e=document.getElementById("completion-message");e&&e.classList.remove("hidden")}function I(e){const t=document.getElementById("error")||C();t.innerHTML=`
        <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <div class="mb-4">
                <svg class="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 class="text-xl font-bold text-red-400 mb-2">Oops! Something went wrong</h2>
                <p class="text-red-300 mb-4">${e}</p>
                <button onclick="window.location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        </div>
    `,t.classList.remove("hidden")}function C(){const e=document.createElement("div");return e.id="error",e.className="hidden max-w-4xl mx-auto px-4 py-8",document.body.appendChild(e),e}
