package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/thornzero/movie-poll/types"
	"github.com/thornzero/movie-poll/views"
)

// HandlerRegistry contains all HTTP handlers
type HandlerRegistry struct {
	handlers map[string]http.HandlerFunc
}

// NewHandlerRegistry creates a new handler registry and registers all handlers
func NewHandlerRegistry() *HandlerRegistry {
	hr := &HandlerRegistry{
		handlers: make(map[string]http.HandlerFunc),
	}

	// Register all handlers
	hr.registerHandlers()

	return hr
}

// registerHandlers registers all application handlers
func (hr *HandlerRegistry) registerHandlers() {
	// Basic page handlers
	hr.handlers["home"] = hr.handleHome
	hr.handlers["results"] = hr.handleResults
	hr.handlers["test"] = hr.handleTest
	hr.handlers["favicon"] = hr.handleFavicon

	// Admin handlers
	hr.handlers["admin-login"] = hr.handleAdminLogin
	hr.handlers["admin-login-submit"] = hr.handleAdminLoginSubmit
	hr.handlers["admin-dashboard"] = hr.handleAdminDashboard
	hr.handlers["admin-movies"] = hr.handleAdminMovies
	hr.handlers["admin-logout"] = hr.handleAdminLogout
	hr.handlers["admin-cleanup-duplicates"] = hr.handleAdminCleanupDuplicates
	hr.handlers["admin-reset-database"] = hr.handleAdminResetDatabase
	hr.handlers["admin-list-votes"] = hr.handleAdminListVotes
	hr.handlers["admin-delete-all-votes"] = hr.handleAdminDeleteAllVotes
	hr.handlers["admin-delete-movie"] = hr.handleAdminDeleteMovie

	// User management handlers
	hr.handlers["admin-users"] = hr.handleAdminUsers
	hr.handlers["admin-user-stats"] = hr.handleAdminUserStats
	hr.handlers["admin-user-delete"] = hr.handleAdminUserDelete
	hr.handlers["admin-user-update-stats"] = hr.handleAdminUserUpdateStats
	hr.handlers["admin-users-api"] = hr.handleAdminUsersAPI

	// Debug handlers
	hr.handlers["debug"] = hr.handleDebug
	hr.handlers["debug-session"] = hr.handleDebugSession
	hr.handlers["debug-submit-results"] = hr.handleDebugSubmitResults
	hr.handlers["debug-page"] = hr.handleDebugPage

	// API handlers
	hr.handlers["movies"] = hr.handleMovies
	hr.handlers["vote"] = hr.handleVote
	hr.handlers["batch-vote"] = hr.handleBatchVote
	hr.handlers["start-poll"] = hr.handleStartPoll
	hr.handlers["validate-username"] = hr.handleValidateUsername
	hr.handlers["check-name-similarity"] = hr.handleCheckNameSimilarity
	hr.handlers["confirm-name"] = hr.handleConfirmName
	hr.handlers["search"] = hr.handleSearch
	hr.handlers["update-appeal"] = hr.handleUpdateAppeal

	// Voting flow handlers
	hr.handlers["voting-seen"] = hr.handleVotingSeen
	hr.handlers["voting-rating"] = hr.handleVotingRating
	hr.handlers["voting-interest"] = hr.handleVotingInterest
	hr.handlers["voting-next-movie"] = hr.handleVotingNextMovie
	hr.handlers["voting-change-vote"] = hr.handleVotingChangeVote

	// Results API handlers
	hr.handlers["results-summary"] = hr.handleResultsSummary
	hr.handlers["results-list"] = hr.handleResultsList
	hr.handlers["logout"] = hr.handleLogout

	// Movie management handlers
	hr.handlers["add-movie"] = hr.handleAddMovie
	hr.handlers["import-movies"] = hr.handleImportMovies
}

// Get retrieves a handler by name
func (hr *HandlerRegistry) Get(name string) http.HandlerFunc {
	return hr.handlers[name]
}

// Register adds a new handler to the registry
func (hr *HandlerRegistry) Register(name string, handler http.HandlerFunc) {
	hr.handlers[name] = handler
}

// Handler implementations (non-view handlers)

func (hr *HandlerRegistry) handleTest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Test page - to be implemented"))
}

func (hr *HandlerRegistry) handleFavicon(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "image/png")
	http.ServeFile(w, r, "static/img/favicon-32x32.png")
}

// API handlers

func (hr *HandlerRegistry) handleMovies(w http.ResponseWriter, r *http.Request) {
	// Get all movies from database
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		LogErrorf("Error fetching movies: %v", err)
		http.Error(w, "Failed to fetch movies", http.StatusInternalServerError)
		return
	}

	// Get session data to check for existing votes
	sessionData := Session.GetSessionData(r)

	// Create response with movies and vote status
	response := map[string]interface{}{
		"movies":       movies,
		"user_votes":   sessionData.Votes,
		"total_movies": len(movies),
		"voted_movies": len(sessionData.Votes),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (hr *HandlerRegistry) handleVote(w http.ResponseWriter, r *http.Request) {
	// Parse JSON request body
	var voteRequest struct {
		MovieID int  `json:"movie_id"`
		Vibe    int  `json:"vibe"`
		Seen    bool `json:"seen"`
	}

	if err := json.NewDecoder(r.Body).Decode(&voteRequest); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate vote data
	if voteRequest.MovieID <= 0 {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	if voteRequest.Vibe < 1 || voteRequest.Vibe > 6 {
		http.Error(w, "Invalid vibe rating (must be 1-6)", http.StatusBadRequest)
		return
	}

	// Get session data
	sessionData := Session.GetSessionData(r)
	if sessionData.UserName == "" {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	// Create vote object
	vote := types.Vote{
		MovieID:   voteRequest.MovieID,
		UserName:  sessionData.UserName,
		Vibe:      voteRequest.Vibe,
		Seen:      voteRequest.Seen,
		DeviceID:  sessionData.DeviceID,
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}

	// Submit vote to database
	_, err := DB.SubmitVote(vote)
	if err != nil {
		LogErrorf("Error submitting vote: %v", err)
		http.Error(w, "Failed to submit vote", http.StatusInternalServerError)
		return
	}

	// Update session data
	sessionData.Votes[voteRequest.MovieID] = vote
	Session.PutSessionData(r, sessionData)

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Vote submitted successfully",
		"vote":    vote,
	})
}

func (hr *HandlerRegistry) handleBatchVote(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true}`))
}

func (hr *HandlerRegistry) handleStartPoll(w http.ResponseWriter, r *http.Request) {
	// Parse the username from the request
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	username := r.FormValue("username")
	if username == "" {
		http.Error(w, "Username is required", http.StatusBadRequest)
		return
	}

	// Debug: Check cookies
	cookies := r.Cookies()
	LogDebugf("Cookies in handleStartPoll: %v", cookies)

	// Ensure session exists and get session data
	Session.RenewToken(r.Context()) // Explicitly create/renew session
	sessionData := Session.GetSessionData(r)

	// Store the name persistently for this device
	err := DB.AddDeviceName(sessionData.DeviceID, username)
	if err != nil {
		LogErrorf("Error adding device name: %v", err)
		// Continue anyway, don't fail the request
	}

	sessionData.UserName = username
	Session.PutSessionData(r, sessionData)

	// Debug: Check if session is being created
	sessionIDCheck := Session.Token(r.Context())
	LogDebugSession("handleStartPoll", sessionIDCheck, sessionData.UserName, sessionData.DeviceID, len(sessionData.Votes))

	// Debug: Check response headers before rendering
	LogDebugf("Response headers before render: %v", w.Header())

	// Get movies from database
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		LogErrorf("Error fetching movies: %v", err)
		http.Error(w, "Failed to load movies", http.StatusInternalServerError)
		return
	}

	// Render the movie poll page
	renderMoviePollPage(w, r, movies, sessionData)

	// Debug: Check response headers after rendering
	LogDebugf("Response headers after render: %v", w.Header())
}

func (hr *HandlerRegistry) handleValidateUsername(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"valid": true}`))
}

// handleCheckNameSimilarity checks if a name is similar to existing names
func (hr *HandlerRegistry) handleCheckNameSimilarity(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	name := r.FormValue("name")
	if name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Get session data to check if device already has a name
	sessionData := Session.GetSessionData(r)
	deviceID := sessionData.DeviceID

	// Check if device already has names
	deviceNames, err := DB.GetDeviceNames(deviceID)
	if err != nil {
		LogErrorf("Error getting device names: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// If device has names, check if any match closely
	if len(deviceNames) > 0 {
		for _, existingName := range deviceNames {
			similarity := calculateNameSimilarity(name, existingName)
			if similarity >= 0.8 {
				// Very similar to existing name, show all device names for selection
				w.WriteHeader(http.StatusOK)
				response := fmt.Sprintf(`{"hasExisting": true, "deviceNames": %s, "closestMatch": "%s", "similarity": %.2f}`, formatStringArray(deviceNames), existingName, similarity)
				w.Write([]byte(response))
				return
			}
		}
	}

	// Look for similar names in the database
	similarNames, err := DB.FindSimilarNames(name)
	if err != nil {
		LogErrorf("Error finding similar names: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if len(similarNames) > 0 {
		// Found similar names, return them for verification
		w.WriteHeader(http.StatusOK)
		response := fmt.Sprintf(`{"hasSimilar": true, "similarNames": %s}`, formatStringArray(similarNames))
		w.Write([]byte(response))
		return
	}

	// No similar names found
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"hasSimilar": false}`))
}

// handleConfirmName confirms a name choice (either new or existing)
func (hr *HandlerRegistry) handleConfirmName(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	name := r.FormValue("name")
	confirmed := r.FormValue("confirmed") == "true"

	if name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	// Get session data
	sessionData := Session.GetSessionData(r)
	deviceID := sessionData.DeviceID

	if confirmed {
		// User confirmed this name, add it to the device
		err := DB.AddDeviceName(deviceID, name)
		if err != nil {
			LogErrorf("Error adding device name: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		// Update session with the confirmed name
		sessionData.UserName = name
		Session.PutSessionData(r, sessionData)

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true, "message": "Name confirmed"}`))
	} else {
		// User rejected the name, continue with their original input
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true, "message": "Name rejected, using original"}`))
	}
}

// formatStringArray formats a string array as JSON
func formatStringArray(arr []string) string {
	if len(arr) == 0 {
		return "[]"
	}

	result := "["
	for i, s := range arr {
		if i > 0 {
			result += ","
		}
		result += fmt.Sprintf(`"%s"`, s)
	}
	result += "]"
	return result
}

func (hr *HandlerRegistry) handleSearch(w http.ResponseWriter, r *http.Request) {
	var movieID MovieID
	var err error

	// Parse query parameters
	movieID.Title = r.URL.Query().Get("q")
	if movieID.Title == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	movieID.Language = r.URL.Query().Get("lang")
	movieID.Region = r.URL.Query().Get("region")
	movieID.Adult = r.URL.Query().Get("adult") == "true"

	// Parse year parameter (optional)
	yearStr := r.URL.Query().Get("year")
	if yearStr != "" {
		movieID.Year, err = strconv.Atoi(yearStr)
		if err != nil {
			http.Error(w, "Invalid year", http.StatusBadRequest)
			return
		}
	} else {
		movieID.Year = 0 // Default to 0 if no year specified
	}

	pageStr := r.URL.Query().Get("page")
	page := 1
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	// Check if TMDB API key is configured
	if Config.TMDBAPIKey == "" {
		LogErrorf("TMDB API key not configured")
		http.Error(w, "TMDB API key not configured. Please set TMDB_API_KEY environment variable.", http.StatusServiceUnavailable)
		return
	}

	// Search movies using TMDB
	searchResult, err := TMDB.SearchMovies(movieID, page)
	if err != nil {
		LogErrorf("Error searching movies: %v", err)
		http.Error(w, "Failed to search movies", http.StatusInternalServerError)
		return
	}

	// Return search results as HTML
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	views.SearchResults(searchResult.Results).Render(r.Context(), w)
}

func (hr *HandlerRegistry) handleUpdateAppeal(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true}`))
}

func (hr *HandlerRegistry) handleResultsSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"summary": {}}`))
}

func (hr *HandlerRegistry) handleResultsList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"results": []}`))
}

func (hr *HandlerRegistry) handleLogout(w http.ResponseWriter, r *http.Request) {
	// Clear session data
	sessionData := Session.GetSessionData(r)
	sessionData.UserName = ""
	sessionData.Votes = make(map[int]types.Vote)
	Session.PutSessionData(r, sessionData)

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "message": "Logged out successfully"}`))
}

func (hr *HandlerRegistry) handleAddMovie(w http.ResponseWriter, r *http.Request) {
	// Parse JSON request body
	var addRequest struct {
		TMDBID int `json:"tmdb_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&addRequest); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if addRequest.TMDBID <= 0 {
		http.Error(w, "Invalid TMDB ID", http.StatusBadRequest)
		return
	}

	// Add movie from TMDB
	title, err := DB.AddMovieFromTMDB(addRequest.TMDBID)
	if err != nil {
		LogErrorf("Error adding movie: %v", err)
		http.Error(w, "Failed to add movie", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Movie added successfully",
		"title":   title,
	})
}

func (hr *HandlerRegistry) handleImportMovies(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max file size
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get the uploaded file
	file, _, err := r.FormFile("json_file")
	if err != nil {
		http.Error(w, "No file uploaded", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Parse JSON
	var movies []struct {
		Title       string   `json:"title"`
		Year        int      `json:"year"`
		TMDBID      int      `json:"tmdb_id"`
		AppealValue *float64 `json:"appeal_value,omitempty"`
	}

	err = json.Unmarshal(fileContent, &movies)
	if err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Import results
	var results struct {
		Success  int      `json:"success"`
		Skipped  int      `json:"skipped"`
		Errors   int      `json:"errors"`
		Messages []string `json:"messages"`
	}

	for _, movieData := range movies {
		if movieData.Title == "" || movieData.TMDBID <= 0 {
			results.Errors++
			results.Messages = append(results.Messages, fmt.Sprintf("Skipped invalid movie: %s (TMDB ID: %d)", movieData.Title, movieData.TMDBID))
			continue
		}

		// Try to add movie using TMDB ID
		title, err := DB.AddMovieFromTMDB(movieData.TMDBID)
		if err != nil {
			// If TMDB fails, try adding with basic info
			movie := types.Movie{
				TMDBID: &movieData.TMDBID,
				Title:  movieData.Title,
				Year:   &movieData.Year,
			}

			_, err = DB.AddMovie(movie)
			if err != nil {
				results.Errors++
				results.Messages = append(results.Messages, fmt.Sprintf("Failed to add '%s': %v", movieData.Title, err))
				continue
			}
			results.Success++
			results.Messages = append(results.Messages, fmt.Sprintf("Added '%s' (basic info)", movieData.Title))
		} else {
			results.Success++
			results.Messages = append(results.Messages, fmt.Sprintf("Added '%s' (from TMDB)", title))
		}
	}

	// Return results as HTML for display
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)

	// Generate HTML response
	fmt.Fprintf(w, `
		<div class="bg-goat-700 rounded-lg p-4">
			<h3 class="text-lg font-bold text-tavern-400 mb-3">Import Results</h3>
			<div class="grid grid-cols-3 gap-4 mb-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-green-400">%d</div>
					<div class="text-sm text-goat-300">Successfully Added</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-yellow-400">%d</div>
					<div class="text-sm text-goat-300">Skipped</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-red-400">%d</div>
					<div class="text-sm text-goat-300">Errors</div>
				</div>
			</div>
			<div class="max-h-60 overflow-y-auto">
				<ul class="space-y-1 text-sm">
	`, results.Success, results.Skipped, results.Errors)

	for _, message := range results.Messages {
		fmt.Fprintf(w, `<li class="text-goat-300">• %s</li>`, message)
	}

	fmt.Fprintf(w, `
				</ul>
			</div>
		</div>
	`)
}

// Voting flow handlers

func (hr *HandlerRegistry) handleVotingRating(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	movieIDStr := r.FormValue("movie_id")
	vibeStr := r.FormValue("vibe")

	movieID, err := strconv.Atoi(movieIDStr)
	if err != nil {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	vibe, err := strconv.Atoi(vibeStr)
	if err != nil || vibe < 1 || vibe > 6 {
		http.Error(w, "Invalid vibe rating", http.StatusBadRequest)
		return
	}

	// Get session data
	sessionData := Session.GetSessionData(r)
	if sessionData.UserName == "" {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	// Create and submit vote
	vote := types.Vote{
		MovieID:   movieID,
		UserName:  sessionData.UserName,
		Vibe:      vibe,
		Seen:      true,
		DeviceID:  sessionData.DeviceID,
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}

	_, err = DB.SubmitVote(vote)
	if err != nil {
		LogErrorf("Error submitting vote: %v", err)
		http.Error(w, "Failed to submit vote", http.StatusInternalServerError)
		return
	}

	// Update session data
	sessionData.Votes[movieID] = vote
	Session.PutSessionData(r, sessionData)

	// Render voted state with auto-advance
	renderVotedStateWithAdvance(w, r, movieID, vote, sessionData)
}

func (hr *HandlerRegistry) handleVotingInterest(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	movieIDStr := r.FormValue("movie_id")
	vibeStr := r.FormValue("vibe")

	movieID, err := strconv.Atoi(movieIDStr)
	if err != nil {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	vibe, err := strconv.Atoi(vibeStr)
	if err != nil || vibe < 1 || vibe > 6 {
		http.Error(w, "Invalid vibe rating", http.StatusBadRequest)
		return
	}

	// Get session data
	sessionData := Session.GetSessionData(r)
	if sessionData.UserName == "" {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	// Create and submit vote
	vote := types.Vote{
		MovieID:   movieID,
		UserName:  sessionData.UserName,
		Vibe:      vibe,
		Seen:      false,
		DeviceID:  sessionData.DeviceID,
		CreatedAt: time.Now().Unix(),
		UpdatedAt: time.Now().Unix(),
	}

	_, err = DB.SubmitVote(vote)
	if err != nil {
		LogErrorf("Error submitting vote: %v", err)
		http.Error(w, "Failed to submit vote", http.StatusInternalServerError)
		return
	}

	// Update session data
	sessionData.Votes[movieID] = vote
	Session.PutSessionData(r, sessionData)

	// Render voted state with auto-advance
	renderVotedStateWithAdvance(w, r, movieID, vote, sessionData)
}

func (hr *HandlerRegistry) handleVotingNextMovie(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	movieIDStr := r.FormValue("movie_id")
	currentMovieID, err := strconv.Atoi(movieIDStr)
	if err != nil {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	// Get session data
	sessionData := Session.GetSessionData(r)
	if sessionData.UserName == "" {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	// Get all movies
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		LogErrorf("Error fetching movies: %v", err)
		http.Error(w, "Failed to load movies", http.StatusInternalServerError)
		return
	}

	// Find next movie that hasn't been voted on
	var nextMovie *types.Movie
	for _, movie := range movies {
		if movie.ID > currentMovieID {
			// Check if user has voted on this movie
			if _, hasVoted := sessionData.Votes[movie.ID]; !hasVoted {
				nextMovie = &movie
				break
			}
		}
	}

	// If no next movie found, check if all movies are voted on
	if nextMovie == nil {
		allVoted := true
		for _, movie := range movies {
			if _, hasVoted := sessionData.Votes[movie.ID]; !hasVoted {
				allVoted = false
				break
			}
		}

		if allVoted {
			// All movies voted on, redirect to results
			http.Redirect(w, r, "/results", http.StatusSeeOther)
			return
		}
	}

	// If still no next movie, go to first unvoted movie
	if nextMovie == nil {
		for _, movie := range movies {
			if _, hasVoted := sessionData.Votes[movie.ID]; !hasVoted {
				nextMovie = &movie
				break
			}
		}
	}

	// If no unvoted movies found, redirect to results
	if nextMovie == nil {
		http.Redirect(w, r, "/results", http.StatusSeeOther)
		return
	}

	// Render the movie poll page with the next movie
	renderMoviePollPage(w, r, movies, sessionData)
}

// Admin handlers

func (hr *HandlerRegistry) handleAdminLogout(w http.ResponseWriter, r *http.Request) {
	// Clear admin session
	sessionData := Session.GetSessionData(r)
	sessionData.AdminUser = nil
	Session.PutSessionData(r, sessionData)

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success": true, "message": "Logged out successfully"}`))
}

func (hr *HandlerRegistry) handleAdminCleanupDuplicates(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Find and remove duplicates
	duplicates, err := DB.FindDuplicateMovies()
	if err != nil {
		LogErrorf("Error finding duplicates: %v", err)
		http.Error(w, "Failed to find duplicates", http.StatusInternalServerError)
		return
	}

	// Remove duplicates (keep the first one in each group)
	removedCount := 0
	for _, dup := range duplicates {
		movieIDsStr := dup.MovieIDs
		// Parse movie IDs
		var movieIDs []int
		for _, idStr := range strings.Split(movieIDsStr, ",") {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				movieIDs = append(movieIDs, id)
			}
		}

		// Keep the first movie, remove the rest
		if len(movieIDs) > 1 {
			for i := 1; i < len(movieIDs); i++ {
				err := DB.DeleteMovie(movieIDs[i])
				if err != nil {
					LogErrorf("Error removing duplicate movie %d: %v", movieIDs[i], err)
				} else {
					removedCount++
				}
			}
		}
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "Removed " + strconv.Itoa(removedCount) + " duplicate movies",
		"removed_count": removedCount,
	})
}

// Debug handlers

func (hr *HandlerRegistry) handleDebug(w http.ResponseWriter, r *http.Request) {
	debugInfo := map[string]interface{}{
		"method":      r.Method,
		"url":         r.URL.String(),
		"headers":     r.Header,
		"cookies":     r.Cookies(),
		"remote_addr": r.RemoteAddr,
	}

	// Get session info
	sessionData := Session.GetSessionData(r)
	sessionToken := Session.Token(r.Context())

	// Debug: Check if session is being loaded
	LogDebugEndpoint("DEBUG", sessionToken, sessionData.UserName, sessionData.DeviceID, len(sessionData.Votes))

	debugInfo["session"] = map[string]interface{}{
		"token":     sessionToken,
		"user_name": sessionData.UserName,
		"device_id": sessionData.DeviceID,
		"votes":     len(sessionData.Votes),
	}

	// Log debug info to server log
	LogDebugRequest(r.Method, r.URL.String(), r.Cookies())
	LogDebugEndpoint("DEBUG", sessionToken, sessionData.UserName, sessionData.DeviceID, len(sessionData.Votes))

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Return debug info
	json.NewEncoder(w).Encode(debugInfo)
}

func (hr *HandlerRegistry) handleDebugSession(w http.ResponseWriter, r *http.Request) {
	// Create/renew session
	Session.RenewToken(r.Context())

	// Get session data
	sessionData := Session.GetSessionData(r)
	sessionData.UserName = "DebugUser"
	Session.PutSessionData(r, sessionData)

	// Get session token
	token := Session.Token(r.Context())

	// Log debug session creation
	LogDebugRequest(r.Method, r.URL.String(), r.Cookies())
	LogDebugSession("SESSION", token, sessionData.UserName, sessionData.DeviceID, 0)

	// Try explicit cookie setting as a test
	cookie := &http.Cookie{
		Name:     "movie_poll_session",
		Value:    token,
		Path:     "/",
		HttpOnly: false, // Allow JS access for debugging
		Secure:   false,
		MaxAge:   86400, // 24 hours
	}
	http.SetCookie(w, cookie)
	LogDebugf("Explicitly set cookie: %s", cookie.String())

	// Return session info
	response := map[string]interface{}{
		"session_created":  true,
		"token":            token,
		"user_name":        sessionData.UserName,
		"device_id":        sessionData.DeviceID,
		"cookies_sent":     len(r.Cookies()),
		"response_headers": w.Header(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (hr *HandlerRegistry) handleDebugSubmitResults(w http.ResponseWriter, r *http.Request) {
	// Parse the test results
	var testResults map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&testResults); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Log the comprehensive test results
	LogDebugTestResults(testResults["timestamp"], testResults["browser"])

	// Analyze each test
	if tests, ok := testResults["tests"].([]interface{}); ok {
		for _, test := range tests {
			if testMap, ok := test.(map[string]interface{}); ok {
				var result map[string]interface{}
				var errStr string
				if r, ok := testMap["result"].(map[string]interface{}); ok {
					result = r
				}
				if e, ok := testMap["error"].(string); ok {
					errStr = e
				}
				LogDebugTest(
					testMap["name"].(string),
					testMap["status"].(string),
					testMap["duration"],
					result,
					errStr,
				)
			}
		}
	}

	// Analyze the results and provide diagnosis
	diagnosis := analyzeTestResults(testResults)

	// Save to file for permanent record
	saveTestResultsToFile(testResults, diagnosis)

	// Return analysis
	response := map[string]interface{}{
		"status":         "received",
		"tests_analyzed": len(testResults["tests"].([]interface{})),
		"diagnosis":      diagnosis,
		"timestamp":      testResults["timestamp"],
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleAdminResetDatabase handles database reset
func (hr *HandlerRegistry) handleAdminResetDatabase(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get confirmation from request body
	var request struct {
		Confirmation string `json:"confirmation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if request.Confirmation != "DELETE ALL DATA" {
		http.Error(w, "Invalid confirmation", http.StatusBadRequest)
		return
	}

	// Reset database
	err := DB.ResetDatabase()
	if err != nil {
		LogErrorf("Error resetting database: %v", err)
		http.Error(w, "Failed to reset database", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Database reset successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleAdminListVotes handles listing all votes
func (hr *HandlerRegistry) handleAdminListVotes(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get all votes
	votes, err := DB.GetAllVotes()
	if err != nil {
		LogErrorf("Error getting votes: %v", err)
		http.Error(w, "Failed to get votes", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"votes":   votes,
		"count":   len(votes),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleAdminDeleteAllVotes handles deleting all votes
func (hr *HandlerRegistry) handleAdminDeleteAllVotes(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get confirmation from request body
	var request struct {
		Confirmation string `json:"confirmation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if request.Confirmation != "DELETE ALL VOTES" {
		http.Error(w, "Invalid confirmation", http.StatusBadRequest)
		return
	}

	// Delete all votes
	err := DB.DeleteAllVotes()
	if err != nil {
		LogErrorf("Error deleting votes: %v", err)
		http.Error(w, "Failed to delete votes", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "All votes deleted successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleAdminDeleteMovie handles deleting a specific movie
func (hr *HandlerRegistry) handleAdminDeleteMovie(w http.ResponseWriter, r *http.Request) {
	// Check if logged in
	sessionData := Session.GetSessionData(r)
	if sessionData.AdminUser == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get movie ID from URL path
	movieIDStr := chi.URLParam(r, "id")
	movieID, err := strconv.Atoi(movieIDStr)
	if err != nil {
		http.Error(w, "Invalid movie ID", http.StatusBadRequest)
		return
	}

	// Delete movie
	err = DB.DeleteMovie(movieID)
	if err != nil {
		LogErrorf("Error deleting movie: %v", err)
		http.Error(w, "Failed to delete movie", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Movie deleted successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
