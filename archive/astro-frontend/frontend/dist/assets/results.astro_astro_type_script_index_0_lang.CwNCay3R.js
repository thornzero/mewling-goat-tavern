class d{moviesData=[];appealData=null;constructor(){this.loadResults(),this.setupAutoRefresh()}async loadResults(){this.showLoading(),this.hideError(),this.hideResults();try{await Promise.all([this.loadMovies(),this.loadAppealData()]),this.displayResults()}catch(t){console.error("Error loading results:",t),this.showError("Failed to load poll results. Please check your connection and try again.")}}async loadMovies(){const t=await this.makeApiCall(window.API_CONFIG.ACTIONS.LIST_MOVIES);this.moviesData=t.movies||[]}async loadAppealData(){const t=await this.makeApiCall(window.API_CONFIG.ACTIONS.UPDATE_APPEAL);this.appealData=t}async makeApiCall(t,e={},s="GET",a=null){const i=new URL(`${window.API_CONFIG.PROXY_URL}/${t}`);Object.keys(e).forEach(o=>{e[o]!==void 0&&e[o]!==null&&i.searchParams.append(o,e[o].toString())});const l={method:s,headers:{"Content-Type":"application/json"}};a&&(l.body=JSON.stringify(a));const n=await fetch(i.toString(),l);if(!n.ok)throw new Error(`HTTP error! status: ${n.status}`);return await n.json()}displayResults(){if(this.hideLoading(),this.hideError(),this.showResults(),!this.appealData){this.showError("No appeal data available");return}this.renderResultsTable(),this.renderSummaryStats()}renderResultsTable(){const t=document.getElementById("results-table");if(!t||!this.appealData)return;const e=Object.entries(this.appealData.movies).sort(([,s],[,a])=>a.finalAppeal-s.finalAppeal);t.innerHTML=`
      <table class="results-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Movie</th>
            <th>Final Appeal</th>
            <th>Visibility</th>
            <th>Seen Count</th>
            <th>Total Voters</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${e.map(([s,a],i)=>`
            <tr>
              <td class="rank">${i+1}</td>
              <td class="movie-title">${s}</td>
              <td class="final-appeal">${a.finalAppeal.toFixed(2)}</td>
              <td class="visibility">
                <div class="visibility-bar">
                  <div class="visibility-fill" style="width: ${a.visibilityRatio*100}%"></div>
                  <span class="visibility-text">${(a.visibilityRatio*100).toFixed(1)}%</span>
                </div>
              </td>
              <td class="seen-count">${a.seenCount}</td>
              <td class="total-voters">${a.totalVoters}</td>
              <td class="details">
                <button class="details-btn" data-movie="${s}">View</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `,t.querySelectorAll(".details-btn").forEach(s=>{s.addEventListener("click",a=>{const i=a.target.dataset.movie;this.showMovieDetails(i||"")})})}renderSummaryStats(){const t=document.getElementById("summary-stats");if(!t||!this.appealData)return;const e=Object.keys(this.appealData.movies).length,s=this.appealData.totalUniqueVoters,a=Object.values(this.appealData.movies).reduce((i,l)=>i+l.finalAppeal,0)/e;t.innerHTML=`
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Movies</h3>
          <p class="stat-value">${e}</p>
        </div>
        <div class="stat-card">
          <h3>Total Voters</h3>
          <p class="stat-value">${s}</p>
        </div>
        <div class="stat-card">
          <h3>Average Appeal</h3>
          <p class="stat-value">${a.toFixed(2)}</p>
        </div>
        <div class="stat-card">
          <h3>Last Updated</h3>
          <p class="stat-value">${new Date().toLocaleString()}</p>
        </div>
      </div>
    `}showMovieDetails(t){if(!this.appealData||!this.appealData.movies[t])return;const e=this.appealData.movies[t],s=document.getElementById("movie-details-modal");if(!s)return;s.innerHTML=`
      <div class="modal-content">
        <div class="modal-header">
          <h2>${t}</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Final Appeal Score:</label>
              <span>${e.finalAppeal.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <label>Original Appeal:</label>
              <span>${e.originalAppeal.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <label>Visibility Ratio:</label>
              <span>${(e.visibilityRatio*100).toFixed(1)}%</span>
            </div>
            <div class="detail-item">
              <label>Visibility Modifier:</label>
              <span>${e.visibilityModifier.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <label>Seen Count:</label>
              <span>${e.seenCount}</span>
            </div>
            <div class="detail-item">
              <label>Total Voters:</label>
              <span>${e.totalVoters}</span>
            </div>
          </div>
          <div class="appeal-breakdown">
            <h3>Appeal Calculation</h3>
            <p>Final Appeal = Original Appeal × Visibility Modifier</p>
            <p>${e.finalAppeal.toFixed(2)} = ${e.originalAppeal.toFixed(2)} × ${e.visibilityModifier.toFixed(2)}</p>
          </div>
        </div>
      </div>
    `,s.style.display="block";const a=s.querySelector(".close-btn");a&&a.addEventListener("click",()=>{s.style.display="none"}),s.addEventListener("click",i=>{i.target===s&&(s.style.display="none")})}setupAutoRefresh(){setInterval(()=>{this.loadResults()},3e4);const t=document.getElementById("refresh-btn");t&&t.addEventListener("click",()=>{this.loadResults()})}showLoading(){const t=document.getElementById("loading");t&&(t.style.display="block")}hideLoading(){const t=document.getElementById("loading");t&&(t.style.display="none")}showError(t){const e=document.getElementById("error");e&&(e.textContent=t,e.style.display="block")}hideError(){const t=document.getElementById("error");t&&(t.style.display="none")}showResults(){const t=document.getElementById("results-content");t&&(t.style.display="block")}hideResults(){const t=document.getElementById("results-content");t&&(t.style.display="none")}}document.addEventListener("DOMContentLoaded",()=>{new d});
