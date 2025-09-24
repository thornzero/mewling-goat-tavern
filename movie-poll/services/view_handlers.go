package services

import (
	"net/http"
	"strconv"
	"time"

	"github.com/a-h/templ"
	"github.com/thornzero/movie-poll/types"
	"github.com/thornzero/movie-poll/views"
)

// View handlers that require templ views integration

func (hr *HandlerRegistry) handleHome(w http.ResponseWriter, r *http.Request) {
	sessionData := Session.GetSessionData(r)

	if sessionData.UserName == "" {
		// Show name entry page
		views.NameEntryPage().Render(r.Context(), w)
		return
	}

	// Get movies from database
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		LogErrorf("Error fetching movies: %v", err)
		http.Error(w, "Failed to load movies", http.StatusInternalServerError)
		return
	}

	// Render the movie poll page
	renderMoviePollPage(w, r, movies, sessionData)
}

func (hr *HandlerRegistry) handleResults(w http.ResponseWriter, r *http.Request) {
	// Calculate appeal scores first
	err := DB.CalculateAppealScores()
	if err != nil {
		LogErrorf("Error calculating appeal scores: %v", err)
		// Continue anyway - we'll show what we have
	}

	// Get results data
	votingSummary, err := DB.GetResultsSummary()
	if err != nil {
		LogErrorf("Error fetching results summary: %v", err)
		http.Error(w, "Failed to load results", http.StatusInternalServerError)
		return
	}

	// Get voting statistics
	stats, err := DB.GetVotingStats()
	if err != nil {
		LogErrorf("Error fetching voting stats: %v", err)
		// Continue with empty stats
		stats = &types.VotingStats{}
	}

	// Create results data
	resultsData := views.ResultsData{
		Movies: votingSummary,
		Stats:  *stats,
	}

	// Render the results page
	views.ResultsPage(resultsData).Render(r.Context(), w)
}

func (hr *HandlerRegistry) handleVotingSeen(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	movieIDStr := r.FormValue("movie_id")
	seenStr := r.FormValue("seen")

	movieID, err := strconv.Atoi(movieIDStr)
	if err != nil {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	seen := seenStr == "true"

	// Debug: Check cookies
	cookies := r.Cookies()
	LogDebugf("Cookies in handleVotingSeen: %v", cookies)

	// Debug: Check if session is being created
	sessionID := Session.Token(r.Context())
	LogDebugSession("handleVotingSeen", sessionID, "", "", 0)

	// Get session data to ensure it's properly loaded
	sessionData := Session.GetSessionData(r)
	LogDebugSession("handleVotingSeen", sessionID, sessionData.UserName, sessionData.DeviceID, len(sessionData.Votes))

	if sessionData.UserName == "" {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	// Save session data to ensure it persists
	Session.PutSessionData(r, sessionData)

	// Render the appropriate next step
	if seen {
		// Show rating options
		views.RatingInterface(movieID).Render(r.Context(), w)
	} else {
		// Show interest options
		views.InterestInterface(movieID).Render(r.Context(), w)
	}
}

func (hr *HandlerRegistry) handleVotingChangeVote(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	movieIDStr := r.FormValue("movie_id")
	movieID, err := strconv.Atoi(movieIDStr)
	if err != nil {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	// Render the voting interface (step 1: seen/not seen)
	views.VotingInterface(movieID).Render(r.Context(), w)
}

func (hr *HandlerRegistry) handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	// Check if already logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser != nil {
		http.Redirect(w, r, "/admin/dashboard", http.StatusSeeOther)
		return
	}

	// Show login page
	loginData := views.AdminLoginData{
		Error: "",
	}
	views.AdminLoginPage(loginData).Render(r.Context(), w)
}

func (hr *HandlerRegistry) handleAdminLoginSubmit(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	if username == "" || password == "" {
		loginData := views.AdminLoginData{
			Error: "Username and password are required",
		}
		views.AdminLoginPage(loginData).Render(r.Context(), w)
		return
	}

	// Authenticate admin user
	adminUser, err := DB.AuthenticateAdmin(username, password)
	if err != nil {
		LogErrorf("Admin login failed for user %s: %v", username, err)
		loginData := views.AdminLoginData{
			Error: "Invalid username or password",
		}
		views.AdminLoginPage(loginData).Render(r.Context(), w)
		return
	}

	// Set admin user in session
	sessionData := Session.GetSessionData(r)
	sessionData.AdminUser = &AdminUserInfo{
		ID:       int(adminUser.ID),
		Username: adminUser.Username,
	}
	Session.PutSessionData(r, sessionData)

	// Check if this is an HTMX request
	if r.Header.Get("HX-Request") == "true" {
		// For HTMX requests, render the dashboard directly
		hr.handleAdminDashboard(w, r)
	} else {
		// For regular requests, redirect to dashboard
		http.Redirect(w, r, "/admin/dashboard", http.StatusSeeOther)
	}
}

func (hr *HandlerRegistry) handleAdminDashboard(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
		return
	}

	// Get admin stats
	stats, err := DB.GetVotingStats()
	if err != nil {
		LogErrorf("Error getting admin stats: %v", err)
		stats = &types.VotingStats{}
	}

	// Get recent movies
	recentMovies, err := DB.GetMovies(10)
	if err != nil {
		LogErrorf("Error getting recent movies: %v", err)
		recentMovies = []types.Movie{}
	}

	// Convert to admin format
	adminMovies := make([]views.MovieInfo, len(recentMovies))
	for i, movie := range recentMovies {
		year := 0
		if movie.Year != nil {
			year = *movie.Year
		}
		adminMovies[i] = views.MovieInfo{
			ID:        movie.ID,
			Title:     movie.Title,
			Year:      year,
			VoteCount: 0, // TODO: Get actual vote count
			AddedAt:   time.Unix(movie.AddedAt, 0),
		}
	}

	// Create admin dashboard data
	dashboardData := views.AdminDashboardData{
		AdminUser: views.AdminUserInfo{
			ID:       sessionData.AdminUser.ID,
			Username: sessionData.AdminUser.Username,
		},
		Stats: views.AdminStats{
			TotalMovies:    stats.TotalMovies,
			TotalVotes:     stats.TotalVotes,
			UniqueVoters:   stats.UniqueVoters,
			ActiveSessions: 1, // TODO: Implement session tracking
			LastUpdated:    time.Now(),
		},
		RecentMovies: adminMovies,
		RecentVotes:  []views.VoteInfo{}, // TODO: Implement recent votes
	}

	views.AdminDashboard(dashboardData).Render(r.Context(), w)
}

func (hr *HandlerRegistry) handleAdminMovies(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
		return
	}

	// Get all movies
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		LogErrorf("Error getting movies for admin: %v", err)
		http.Error(w, "Failed to load movies", http.StatusInternalServerError)
		return
	}

	// Convert to admin format
	adminMovies := make([]views.MovieInfo, len(movies))
	for i, movie := range movies {
		year := 0
		if yearPtr := movie.ReleaseYear(); yearPtr != nil {
			year = *yearPtr
		}
		adminMovies[i] = views.MovieInfo{
			ID:        movie.ID,
			Title:     movie.Title,
			Year:      year,
			VoteCount: 0,          // TODO: Get actual vote count
			AddedAt:   time.Now(), // TODO: Get actual added date
		}
	}

	// Create movies page data
	moviesData := views.AdminMoviesData{
		AdminUser: views.AdminUserInfo{
			ID:       sessionData.AdminUser.ID,
			Username: sessionData.AdminUser.Username,
		},
		Movies: adminMovies,
	}

	views.AdminMoviesPage(moviesData).Render(r.Context(), w)
}

func (hr *HandlerRegistry) handleDebugPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/debug.html")
}

// Helper functions for rendering

func renderMoviePollPage(w http.ResponseWriter, r *http.Request, movies []types.Movie, sessionData *SessionData) {
	// Create movie card components
	var components []templ.Component
	for _, movie := range movies {
		// Check if user has voted on this movie
		userVote, hasVoted := sessionData.Votes[movie.ID]

		// Create movie card struct
		year := movie.Year
		overview := movie.Overview
		posterPath := movie.PosterPath
		releaseDate := movie.ReleaseDate

		movieCard := views.MovieCard{
			ID:          movie.ID,
			Title:       movie.Title,
			Year:        year,
			Overview:    overview,
			PosterPath:  posterPath,
			ReleaseDate: releaseDate,
		}

		// Create the voting interface component
		cardComponent := views.MovieCardTemplate(movieCard, hasVoted, userVote)
		components = append(components, cardComponent)
	}

	// Render the movie poll page
	views.MoviePollLayout(components, sessionData.UserName, len(movies), len(sessionData.Votes)).Render(r.Context(), w)
}

func renderVotedStateWithAdvance(w http.ResponseWriter, r *http.Request, movieID int, vote types.Vote, sessionData *SessionData) {
	// First render the voted state
	views.VotedState(movieID, vote).Render(r.Context(), w)

	// Get all movies to check if all have been voted on
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		LogErrorf("Error fetching movies for completion check: %v", err)
		// Fallback to just advancing slide
		w.Write([]byte(`
			<script>
				setTimeout(() => {
					const swiperEl = document.querySelector('.swiper[data-swiper-initialized]');
					if (swiperEl && swiperEl.swiper && swiperEl.swiper.slideNext) {
						swiperEl.swiper.slideNext();
					}
				}, 1000);
			</script>
		`))
		return
	}

	// Check if all movies have been voted on
	allVoted := true
	for _, movie := range movies {
		if _, hasVoted := sessionData.Votes[movie.ID]; !hasVoted {
			allVoted = false
			break
		}
	}

	if allVoted {
		// All movies voted on, redirect to results page
		w.Write([]byte(`
			<script>
				setTimeout(() => {
					window.location.href = '/results';
				}, 1500);
			</script>
		`))
	} else {
		// Not all movies voted on, advance to next slide
		w.Write([]byte(`
			<script>
				setTimeout(() => {
					// Find the active Swiper instance
					const swiperEl = document.querySelector('.swiper[data-swiper-initialized]');
					if (swiperEl && swiperEl.swiper && swiperEl.swiper.slideNext) {
						swiperEl.swiper.slideNext();
					} else {
						console.log('Swiper not found or not initialized');
					}
				}, 1000);
			</script>
		`))
	}
}
