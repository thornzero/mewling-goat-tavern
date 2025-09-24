package services

import (
	"log"
	"net/http"

	"github.com/thornzero/movie-poll/types"
	"github.com/thornzero/movie-poll/views"
)

// BasicHandlers contains basic HTTP handlers
type BasicHandlers struct {
	available []string
}

// NewBasicHandlers creates a new BasicHandlers instance
func NewBasicHandlers() *BasicHandlers {
	return &BasicHandlers{
		available: []string{
			"home",
			"results",
			"test",
		},
	}
}

// HandleHome serves the home page
func (h *BasicHandlers) HandleHome(w http.ResponseWriter, r *http.Request) {
	sessionData := Session.GetSessionData(r)

	if sessionData.UserName == "" {
		// Show name entry page
		views.NameEntryPage().Render(r.Context(), w)
		return
	}

	// Get movies from database
	movies, err := DB.GetMovies(Config.MovieLimit)
	if err != nil {
		log.Printf("Error fetching movies: %v", err)
		http.Error(w, "Failed to load movies", http.StatusInternalServerError)
		return
	}

	// Render the movie poll page
	renderMoviePollPage(w, r, movies, sessionData)
}

// HandleResults serves the results page
func (h *BasicHandlers) HandleResults(w http.ResponseWriter, r *http.Request) {
	// Calculate appeal scores first
	err := DB.CalculateAppealScores()
	if err != nil {
		log.Printf("Error calculating appeal scores: %v", err)
		// Continue anyway - we'll show what we have
	}

	// Get results data
	votingSummary, err := DB.GetResultsSummary()
	if err != nil {
		log.Printf("Error fetching results summary: %v", err)
		http.Error(w, "Failed to load results", http.StatusInternalServerError)
		return
	}

	// Get voting statistics
	stats, err := DB.GetVotingStats()
	if err != nil {
		log.Printf("Error fetching voting stats: %v", err)
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

// HandleTest serves the test page
func (h *BasicHandlers) HandleTest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Test page - to be implemented"))
}

// HandleFavicon serves the favicon
func (h *BasicHandlers) HandleFavicon(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "image/png")
	http.ServeFile(w, r, "static/img/favicon-32x32.png")
}
