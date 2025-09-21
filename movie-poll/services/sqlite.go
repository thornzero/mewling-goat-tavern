package services

import (
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/thornzero/movie-poll/types"
	"golang.org/x/crypto/argon2"
	_ "modernc.org/sqlite"
)

type SQLite struct {
	*sql.DB
}

type Result struct {
	sql.Result
}

func NewSQLite() (*SQLite, error) {
	sqlite := &sql.DB{}
	var err error
	// initialize the database
	sqlite, err = sql.Open("sqlite", Config.DBPath+"?_busy_timeout=5000&_journal_mode=WAL")
	if err != nil {
		return nil, err
	}

	return &SQLite{sqlite}, nil
}

func (s *SQLite) ApplyDBSchema() error {
	// Embedded schema to avoid file dependency issues
	schema := `
-- Movies table with full TMDB integration
CREATE TABLE IF NOT EXISTS movies(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  runtime INTEGER,
  adult BOOLEAN DEFAULT 0,
  original_language TEXT DEFAULT 'en',
  original_title TEXT,
  popularity REAL DEFAULT 0,
  vote_average REAL DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  video BOOLEAN DEFAULT 0,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Votes table with 6-rank system
CREATE TABLE IF NOT EXISTS votes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  vibe INTEGER NOT NULL CHECK (vibe >= 1 AND vibe <= 6),  -- 1-6 ranking system
  seen BOOLEAN NOT NULL,  -- true/false
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Appeal calculations table
CREATE TABLE IF NOT EXISTS appeals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  appeal_score REAL NOT NULL,
  total_votes INTEGER NOT NULL DEFAULT 0,
  unique_voters INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  visibility_ratio REAL NOT NULL DEFAULT 0,
  calculated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Admin users table for secure access
CREATE TABLE IF NOT EXISTS admin_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  last_login INTEGER
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vote_user_movie ON votes(movie_id, user_name, device_id);
CREATE INDEX IF NOT EXISTS idx_votes_movie_id ON votes(movie_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_name ON votes(user_name);
CREATE INDEX IF NOT EXISTS idx_votes_device_id ON votes(device_id);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_appeals_movie_id ON appeals(movie_id);
CREATE INDEX IF NOT EXISTS idx_appeals_score ON appeals(appeal_score);
`

	_, err := s.Exec(schema)
	if err != nil {
		return err
	}
	return nil
}

// Appeal represents calculated appeal scores
type Appeal struct {
	ID              int     `json:"id"`
	MovieID         int     `json:"movie_id"`
	AppealScore     float64 `json:"appeal_score"`
	TotalVotes      int     `json:"total_votes"`
	UniqueVoters    int     `json:"unique_voters"`
	SeenCount       int     `json:"seen_count"`
	VisibilityRatio float64 `json:"visibility_ratio"`
	CalculatedAt    int64   `json:"calculated_at"`
}

// AdminUser represents an admin user
type AdminUser struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"password_hash"`
	CreatedAt    int64  `json:"created_at"`
	LastLogin    *int64 `json:"last_login"`
}

// DuplicateMovie represents a duplicate movie entry
type DuplicateMovie struct {
	TitleLower string `json:"title_lower"`
	Title      string `json:"title"`
	Year       int    `json:"year"`
	Count      int    `json:"count"`
	MovieIDs   string `json:"movie_ids"`
}

func (s *SQLite) GetMovieDetails(id int) (*Movie, error) {
	row := s.QueryRow("SELECT title, year FROM movies WHERE id = ?", id)
	if row == nil {
		details, err := TMDB.GetMovieDetails(id)
		if err != nil {
			return nil, err
		}
		return &details, nil
	}
	return nil, errors.New("movie not found locally or on TheMovieDB")
}

func (s *SQLite) GetMovieCount() (int, error) {
	var count int
	err := s.QueryRow("SELECT COUNT(*) FROM movies").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *SQLite) GetVoteCount() (int, error) {
	var count int
	err := s.QueryRow("SELECT COUNT(*) FROM votes").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *SQLite) GetUniqueVoterCount() (int, error) {
	var count int
	err := s.QueryRow("SELECT COUNT(DISTINCT user_name) FROM votes").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *SQLite) GetMoviesWithVotesCount() (int, error) {
	var count int
	err := s.QueryRow("SELECT COUNT(*) FROM movies WHERE id IN (SELECT DISTINCT movie_id FROM votes)").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *SQLite) GetAverageAppealScore() (float64, error) {
	var avg float64
	err := s.QueryRow("SELECT AVG(appeal_score) FROM appeals").Scan(&avg)
	if err != nil {
		return 0, err
	}
	return avg, nil
}

func (s *SQLite) GetMostVotedMovie() (string, int, error) {
	var movie string
	var voteCount int

	err := s.QueryRow(`	SELECT m.title, COUNT(v.id) as vote_count
		FROM movies m
		JOIN votes v ON m.id = v.movie_id
		GROUP BY m.id, m.title
		ORDER BY vote_count DESC
		LIMIT 1`).Scan(&movie, &voteCount)
	if err != nil {
		return "", 0, err
	}
	return movie, voteCount, nil
}

// GetMovies retrieves all or some movies from the database based on the limit.
// If limit <= 0, returns all movies. If limit > 0, returns up to 'limit' movies.
func (s *SQLite) GetMovies(limit int) ([]types.Movie, error) {
	var rows *sql.Rows
	var err error

	if limit > 0 {
		rows, err = s.Query(`
			SELECT id, tmdb_id, title, year, overview, poster_path, backdrop_path, 
			       release_date, runtime, adult, original_language, original_title,
			       popularity, vote_average, vote_count, video, added_at, updated_at
			FROM movies 
			ORDER BY title
			LIMIT ?
		`, limit)
	} else {
		rows, err = s.Query(`
			SELECT id, tmdb_id, title, year, overview, poster_path, backdrop_path, 
			       release_date, runtime, adult, original_language, original_title,
			       popularity, vote_average, vote_count, video, added_at, updated_at
			FROM movies 
			ORDER BY title
		`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var movies []types.Movie
	for rows.Next() {
		var movie types.Movie
		var year int
		err := rows.Scan(
			&movie.ID, &movie.TMDBID, &movie.Title, &year, &movie.Overview,
			&movie.PosterPath, &movie.BackdropPath, &movie.ReleaseDate, &movie.Runtime,
			&movie.Adult, &movie.OriginalLanguage, &movie.OriginalTitle,
			&movie.Popularity, &movie.VoteAverage, &movie.VoteCount, &movie.Video,
			&movie.AddedAt, &movie.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		// Set the year if it's not zero
		if year > 0 {
			movie.Year = &year
		}
		movies = append(movies, movie)
	}
	return movies, nil
}

// GetMovieByID retrieves a movie by its ID
func (s *SQLite) GetMovieByID(id int) (*Movie, error) {
	row := s.QueryRow(`
		SELECT tmdb_id, title, overview, poster_path, backdrop_path, 
		release_date, runtime, adult, original_language, original_title,
		popularity, vote_average, vote_count, video, added_at, updated_at
		FROM movies WHERE id = ?
	`, id)

	var movie Movie
	err := row.Scan(
		&movie.ID, &movie.Title, &movie.Overview, &movie.PosterPath, &movie.BackdropPath,
		&movie.ReleaseDate, &movie.Runtime, &movie.Adult, &movie.OriginalLanguage, &movie.OriginalTitle,
		&movie.Popularity, &movie.VoteAverage, &movie.VoteCount, &movie.Video, &movie.AddedAt, &movie.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &movie, nil
}

// AddMovie adds a new movie to the database (with duplicate prevention)
func (s *SQLite) AddMovie(movie types.Movie) (int64, error) {
	// First check if movie already exists by tmdb_id or title+year
	var existingID int64
	var err error

	if movie.ID != 0 {
		// Check by TMDB ID first
		err = s.QueryRow(`
			SELECT id FROM movies WHERE tmdb_id = ?
		`, movie.ID).Scan(&existingID)
		if err != nil && err != sql.ErrNoRows {
			return 0, err
		}
	}

	if existingID != 0 {
		// Movie exists, return existing ID
		return existingID, errors.New("movie already exists")
	}

	var timestamp int64 = time.Now().Unix()

	// Movie doesn't exist, insert it
	result, err := s.Exec(`
		INSERT INTO movies (tmdb_id, title, overview, poster_path, backdrop_path,
		release_date, runtime, adult, original_language, original_title,
		popularity, vote_average, vote_count, video, added_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, movie.TMDBID, movie.Title, movie.Overview, movie.PosterPath,
		movie.BackdropPath, movie.ReleaseDate, movie.Runtime, movie.Adult,
		movie.OriginalLanguage, movie.OriginalTitle, movie.Popularity,
		movie.VoteAverage, movie.VoteCount, movie.Video, timestamp, timestamp)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// Submittypes.Vote submits a vote for a movie
func (s *SQLite) SubmitVote(vote types.Vote) (int64, error) {
	// Check if vote already exists
	var existingID int
	err := s.QueryRow(`
		SELECT id FROM votes 
		WHERE movie_id = ? AND user_name = ? AND device_id = ?
	`, vote.MovieID, vote.UserName, vote.DeviceID).Scan(&existingID)

	switch err {
	case nil:
		// Update existing vote
		_, err = s.Exec(`
			UPDATE votes SET vibe = ?, seen = ?, updated_at = ?
			WHERE id = ?
		`, vote.Vibe, vote.Seen, vote.UpdatedAt, existingID)
		return int64(existingID), err
	case sql.ErrNoRows:
		// Insert new vote
		result, err := s.Exec(`
			INSERT INTO votes (movie_id, user_name, vibe, seen, device_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, vote.MovieID, vote.UserName, vote.Vibe, vote.Seen, vote.DeviceID, vote.CreatedAt, vote.UpdatedAt)
		if err != nil {
			return 0, err
		}
		return result.LastInsertId()
	}
	return 0, err
}

// GetUsertypes.Votes retrieves all votes for a specific user/device
func (s *SQLite) GetUserVotes(userName, deviceID string) ([]types.Vote, error) {
	rows, err := s.Query(`
		SELECT id, movie_id, user_name, vibe, seen, device_id, created_at, updated_at
		FROM votes 
		WHERE user_name = ? AND device_id = ?
		ORDER BY created_at DESC
	`, userName, deviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var votes []types.Vote
	for rows.Next() {
		var vote types.Vote
		err := rows.Scan(&vote.ID, &vote.MovieID, &vote.UserName, &vote.Vibe,
			&vote.Seen, &vote.DeviceID, &vote.CreatedAt, &vote.UpdatedAt)
		if err != nil {
			return nil, err
		}
		votes = append(votes, vote)
	}
	return votes, nil
}

// GetAlltypes.Votes retrieves all votes from the database
func (s *SQLite) GetAllVotes() ([]types.Vote, error) {
	rows, err := s.Query(`
		SELECT id, movie_id, user_name, vibe, seen, device_id, created_at, updated_at
		FROM votes
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var votes []types.Vote
	for rows.Next() {
		var vote types.Vote
		err := rows.Scan(&vote.ID, &vote.MovieID, &vote.UserName, &vote.Vibe,
			&vote.Seen, &vote.DeviceID, &vote.CreatedAt, &vote.UpdatedAt)
		if err != nil {
			return nil, err
		}
		votes = append(votes, vote)
	}
	return votes, nil
}

// CalculateAppealScores calculates and updates appeal scores for all movies
// Uses a sophisticated algorithm that prioritizes movies for shared new experiences
func (s *SQLite) CalculateAppealScores() error {
	// Use a transaction to avoid database locking issues
	tx, err := s.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// First, delete existing appeals to avoid duplicates
	_, err = tx.Exec("DELETE FROM appeals")
	if err != nil {
		return err
	}

	// Get all movies with their vote data for calculation
	rows, err := tx.Query(`
		SELECT 
			m.id,
			m.title,
			COUNT(v.id) as total_votes,
			COUNT(DISTINCT v.user_name) as unique_voters,
			COUNT(CASE WHEN v.seen = 1 THEN 1 END) as seen_count,
			COUNT(CASE WHEN v.seen = 0 THEN 1 END) as not_seen_count,
			AVG(CASE WHEN v.seen = 1 THEN v.vibe END) as avg_rating,
			AVG(CASE WHEN v.seen = 0 THEN v.vibe END) as avg_interest,
			COUNT(CASE WHEN v.seen = 1 AND v.vibe >= 2 THEN 1 END) as high_rating_count,
			COUNT(CASE WHEN v.seen = 0 AND v.vibe >= 2 THEN 1 END) as high_interest_count,
			COALESCE(MAX(user_vote_counts.vote_count) * 1.0 / COUNT(v.id), 0) as top_user_concentration
		FROM movies m
		LEFT JOIN votes v ON m.id = v.movie_id
		LEFT JOIN (
			SELECT movie_id, user_name, COUNT(*) as vote_count
			FROM votes
			GROUP BY movie_id, user_name
		) user_vote_counts ON m.id = user_vote_counts.movie_id
		GROUP BY m.id
		HAVING COUNT(v.id) > 0
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	// Process each movie and calculate appeal score
	for rows.Next() {
		var movieID int
		var title string
		var totalVotes, uniqueVoters, seenCount, notSeenCount int
		var avgRating, avgInterest *float64
		var highRatingCount, highInterestCount int
		var topUserConcentration float64

		err := rows.Scan(&movieID, &title, &totalVotes, &uniqueVoters, &seenCount, &notSeenCount,
			&avgRating, &avgInterest, &highRatingCount, &highInterestCount, &topUserConcentration)
		if err != nil {
			return err
		}

		// Calculate appeal score using sophisticated algorithm
		appealScore := calculateMovieAppeal(
			totalVotes, uniqueVoters, seenCount, notSeenCount,
			avgRating, avgInterest, highRatingCount, highInterestCount, topUserConcentration,
		)

		// Calculate visibility ratio (how many people have seen it)
		visibilityRatio := 0.0
		if totalVotes > 0 {
			visibilityRatio = float64(seenCount) / float64(totalVotes)
		}

		// Insert the calculated appeal score
		_, err = tx.Exec(`
			INSERT INTO appeals (movie_id, appeal_score, total_votes, unique_voters, seen_count, visibility_ratio, calculated_at)
			VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'))
		`, movieID, appealScore, totalVotes, uniqueVoters, seenCount, visibilityRatio)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// calculateMovieAppeal calculates the appeal score for a movie using a simplified algorithm
// that prioritizes group interest and shared new experiences
func calculateMovieAppeal(totalVotes, uniqueVoters, seenCount, notSeenCount int,
	avgRating, avgInterest *float64, highRatingCount, highInterestCount int, topUserConcentration float64) float64 {

	// PARTICIPATION THRESHOLD - Most important fix
	if totalVotes < Config.ParticipationThreshold {
		return 0.0
	}

	// Base appeal from actual votes (like original Google Sheets formula)
	baseAppeal := 0.0
	if avgInterest != nil {
		// Interest scale: 1=Later, 2=Interested, 3=Stoked
		// Convert to 0-5 scale (similar to original 1-6 scale)
		baseAppeal = (*avgInterest - 1.0) * 2.5 // 0 to 5.0 points
	}

	// Novelty bonus: Movies that fewer people have seen get higher appeal
	// This encourages trying new things together (like original visibility penalty, but positive)
	noveltyBonus := 0.0
	if totalVotes > 0 {
		notSeenRatio := float64(notSeenCount) / float64(totalVotes)
		noveltyBonus = notSeenRatio * 1.0 // Up to 1.0 points for complete novelty
	}

	// Participation bonus: Movies with higher participation get a small boost
	// This uses the previously unused uniqueVoters parameter
	participationBonus := 0.0
	if uniqueVoters > 0 {
		participationRate := float64(totalVotes) / float64(uniqueVoters)
		participationBonus = participationRate * 0.5 // Up to 0.5 points
	}

	// Quality factor: For movies people have seen, how good were they?
	// This adds value for movies that are known to be good
	qualityBonus := 0.0
	if avgRating != nil && seenCount > 0 {
		// Rating scale: 1=Meh, 2=Good, 3=Rewatch
		// Convert to 0-2 scale
		qualityBonus = (*avgRating - 1.0) * 1.0 // 0 to 2.0 points
	}

	// INTEREST QUALITY GATE - Prevent quality trap
	if avgInterest != nil && *avgInterest < 1.5 {
		// Still calculate other bonuses, just skip quality
		qualityBonus = 0.0
	}

	// Consensus bonus: Movies with strong agreement get a boost
	// This uses the previously unused highRatingCount and highInterestCount parameters
	consensusBonus := 0.0
	if totalVotes > 0 {
		highRatingRatio := float64(highRatingCount) / float64(totalVotes)
		highInterestRatio := float64(highInterestCount) / float64(totalVotes)
		// Bonus for strong consensus (either high quality or high interest)
		consensusBonus = (highRatingRatio + highInterestRatio) * 0.5 // Up to 1.0 points
	}

	// USER CONCENTRATION PENALTY - Prevent vote bombing and gaming
	concentrationPenalty := 0.0
	if topUserConcentration > 0.6 { // More than 60% from one user
		concentrationPenalty = (topUserConcentration - 0.6) * 2.0 // Up to 0.8 penalty
	}

	// Calculate final appeal score
	finalScore := baseAppeal + noveltyBonus + participationBonus + qualityBonus + consensusBonus - concentrationPenalty

	// Ensure score is never negative
	if finalScore < 0 {
		finalScore = 0
	}

	// Cap at reasonable maximum (9.5)
	if finalScore > 9.5 {
		finalScore = 9.5
	}

	return finalScore
}

// Name matching and device management functions

// calculateNameSimilarity calculates similarity between two names (0.0 to 1.0)
func calculateNameSimilarity(name1, name2 string) float64 {
	if name1 == name2 {
		return 1.0
	}

	// Convert to lowercase for comparison
	n1 := strings.ToLower(strings.TrimSpace(name1))
	n2 := strings.ToLower(strings.TrimSpace(name2))

	if n1 == n2 {
		return 1.0
	}

	// Check for substring relationships (nicknames)
	if strings.Contains(n1, n2) || strings.Contains(n2, n1) {
		// If one name contains the other, it's likely a nickname
		shorterLen := len(n1)
		if len(n2) < shorterLen {
			shorterLen = len(n2)
		}
		if shorterLen >= 3 { // Only if the shorter name is at least 3 chars
			return 0.8
		}
	}

	// Simple Levenshtein distance for other cases
	distance := levenshteinDistance(n1, n2)
	maxLen := max(len(n1), len(n2))
	if maxLen == 0 {
		return 0.0
	}

	similarity := 1.0 - (float64(distance) / float64(maxLen))
	if similarity < 0.3 {
		return 0.0 // Too different
	}

	return similarity
}

// levenshteinDistance calculates the edit distance between two strings
func levenshteinDistance(s1, s2 string) int {
	r1, r2 := []rune(s1), []rune(s2)
	rows := len(r1) + 1
	cols := len(r2) + 1

	d := make([][]int, rows)
	for i := range d {
		d[i] = make([]int, cols)
	}

	for i := 1; i < rows; i++ {
		d[i][0] = i
	}
	for j := 1; j < cols; j++ {
		d[0][j] = j
	}

	for i := 1; i < rows; i++ {
		for j := 1; j < cols; j++ {
			cost := 0
			if r1[i-1] != r2[j-1] {
				cost = 1
			}
			d[i][j] = min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost)
		}
	}

	return d[rows-1][cols-1]
}

// min returns the minimum of three integers
func min(a, b, c int) int {
	if a < b && a < c {
		return a
	}
	if b < c {
		return b
	}
	return c
}

// max returns the maximum of two integers
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// FindSimilarNames finds names similar to the given name from all users who have voted
func (s *SQLite) FindSimilarNames(inputName string) ([]string, error) {
	// Get all unique names from votes table (people who have actually voted)
	rows, err := s.Query(`
		SELECT DISTINCT user_name 
		FROM votes 
		WHERE user_name IS NOT NULL AND user_name != ''
		ORDER BY user_name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var similarNames []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}

		similarity := calculateNameSimilarity(inputName, name)
		if similarity >= 0.6 { // 60% similarity threshold
			similarNames = append(similarNames, name)
		}
	}

	return similarNames, nil
}

// GetDeviceNames gets all names associated with a device
func (s *SQLite) GetDeviceNames(deviceID string) ([]string, error) {
	rows, err := s.Query(`
		SELECT user_name 
		FROM user_devices 
		WHERE device_id = ?
		ORDER BY last_seen DESC
	`, deviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		names = append(names, name)
	}

	return names, nil
}

// GetDeviceMostRecentName gets the most recently used name for a device
func (s *SQLite) GetDeviceMostRecentName(deviceID string) (string, error) {
	var userName string
	err := s.QueryRow(`
		SELECT user_name 
		FROM user_devices 
		WHERE device_id = ?
		ORDER BY last_seen DESC
		LIMIT 1
	`, deviceID).Scan(&userName)

	if err == sql.ErrNoRows {
		return "", nil // No name found
	}
	return userName, err
}

// AddDeviceName adds a name to a device (supports multiple names per device)
func (s *SQLite) AddDeviceName(deviceID, userName string) error {
	_, err := s.Exec(`
		INSERT INTO user_devices (device_id, user_name, last_seen)
		VALUES (?, ?, strftime('%s','now'))
		ON CONFLICT(device_id, user_name) DO UPDATE SET
			last_seen = excluded.last_seen
	`, deviceID, userName)
	return err
}

// UpdateDeviceLastSeen updates the last seen timestamp for a device
func (s *SQLite) UpdateDeviceLastSeen(deviceID string) error {
	_, err := s.Exec(`
		UPDATE user_devices 
		SET last_seen = strftime('%s','now')
		WHERE device_id = ?
	`, deviceID)
	return err
}

// GetResultsSummary returns a summary of all voting results with appeal scores
func (s *SQLite) GetResultsSummary() ([]types.VotingSummary, error) {
	rows, err := s.Query(`
		SELECT 
			m.id,
			m.title,
			m.poster_path,
			m.overview,
			COALESCE(a.appeal_score, 0) as appeal_score,
			COALESCE(a.total_votes, 0) as total_votes,
			COALESCE(a.unique_voters, 0) as unique_voters,
			COALESCE(a.seen_count, 0) as seen_count,
			COALESCE(a.visibility_ratio, 0) as visibility_ratio,
			COALESCE(a.calculated_at, 0) as calculated_at
		FROM movies m
		LEFT JOIN appeals a ON m.id = a.movie_id
		WHERE m.id IN (SELECT DISTINCT movie_id FROM votes)
		ORDER BY a.appeal_score DESC, a.total_votes DESC, m.title ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results = []types.VotingSummary{}
	for rows.Next() {
		var votingSummary types.VotingSummary
		err := rows.Scan(&votingSummary.MovieID, &votingSummary.Title, &votingSummary.PosterPath, &votingSummary.Overview,
			&votingSummary.AppealScore, &votingSummary.TotalVotes, &votingSummary.UniqueVoters, &votingSummary.SeenCount,
			&votingSummary.VisibilityRatio, &votingSummary.CalculatedAt)
		if err != nil {
			return nil, err
		}
		results = append(results, votingSummary)
	}

	return results, nil
}

// GetVotingStats returns overall voting statistics
func (s *SQLite) GetVotingStats() (types.VotingStats, error) {
	stats := types.VotingStats{}

	var err error
	// Total movies
	stats.TotalMovies, err = s.GetMovieCount()
	if err != nil {
		return stats, err
	}

	// Total votes
	stats.TotalVotes, err = s.GetVoteCount()
	if err != nil {
		return stats, err
	}

	// Unique voters

	stats.UniqueVoters, err = s.GetUniqueVoterCount()
	if err != nil {
		return stats, err
	}

	// Movies with votes

	stats.MoviesWithVotes, err = s.GetMoviesWithVotesCount()
	if err != nil {
		return stats, err
	}

	// Average appeal score
	stats.AverageAppealScore, err = s.GetAverageAppealScore()
	if err != nil {
		stats.AverageAppealScore = 0
	}

	// Most voted movie
	stats.MostVotedMovie, _, err = s.GetMostVotedMovie()
	if err != nil {
		return stats, err
	}
	err = s.QueryRow(`
		SELECT m.title, COUNT(v.id) as vote_count
		FROM movies m
		JOIN votes v ON m.id = v.movie_id
		GROUP BY m.id, m.title
		ORDER BY vote_count DESC
		LIMIT 1
	`).Scan(&stats.MostVotedMovie, &stats.MostVotedCount)
	if err != nil {
		stats.MostVotedMovie = "None"
		stats.MostVotedCount = 0
	}

	return stats, nil
}

// AddMovieFromTMDB adds a movie from TMDB data (with duplicate prevention)
func (s *SQLite) AddMovieFromTMDB(tmdbID int) (string, error) {
	// First check if movie already exists by tmdb_id or title+year
	var existingID int64
	var existingTitle string

	if tmdbID <= 0 {
		return "", errors.New("no valid identifier provided")
	}

	// Check if movie exists by TMDB ID

	err := s.QueryRow(`
		SELECT id, title FROM movies WHERE tmdb_id = ?
	`, tmdbID).Scan(&existingID, &existingTitle)
	if err != nil {
		return "", err
	}

	if existingID > 0 {
		// Movie exists, return existing ID
		return existingTitle, nil
	}

	// Movie doesn't exist, find it on TMDB, and insert it
	tmdbData, err := TMDB.GetMovieDetails(tmdbID)
	if err != nil {
		return "", err
	}

	query := `
		INSERT INTO movies (
			tmdb_id, title, overview, poster_path, backdrop_path,
			release_date, runtime, adult, original_language, original_title,
			popularity, vote_average, vote_count, video, added_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = s.Exec(query,
		tmdbData.ID,
		tmdbData.Title,
		tmdbData.Overview,
		tmdbData.PosterPath,
		tmdbData.BackdropPath,
		tmdbData.ReleaseDate,
		tmdbData.Runtime,
		tmdbData.Adult,
		tmdbData.OriginalLanguage,
		tmdbData.OriginalTitle,
		tmdbData.Popularity,
		tmdbData.VoteAverage,
		tmdbData.VoteCount,
		tmdbData.Video,
		tmdbData.AddedAt,
		tmdbData.UpdatedAt,
	)
	if err != nil {
		return "", err
	}

	return tmdbData.Title, nil
}

// FindDuplicateMovies finds movies that are duplicates based on title (case-insensitive)
func (s *SQLite) FindDuplicateMovies() ([]DuplicateMovie, error) {
	query := `
		SELECT LOWER(TRIM(title)) as title_lower, title, COUNT(*) as count, GROUP_CONCAT(id) as movie_ids
		FROM movies 
		WHERE title IS NOT NULL
		GROUP BY LOWER(TRIM(title))
		HAVING COUNT(*) > 1
		ORDER BY count DESC, title
	`

	rows, err := s.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var duplicates []DuplicateMovie
	for rows.Next() {
		var duplicate DuplicateMovie

		err := rows.Scan(&duplicate.TitleLower, &duplicate.Title, &duplicate.Year, &duplicate.Count, &duplicate.MovieIDs)
		if err != nil {
			return nil, err
		}

		duplicates = append(duplicates, duplicate)
	}

	return duplicates, nil
}

// RemoveDuplicateMovies removes duplicate movies, keeping the one with the most votes
func (s *SQLite) RemoveDuplicateMovies() error {
	// Find all duplicates
	duplicates, err := s.FindDuplicateMovies()
	if err != nil {
		return err
	}

	for _, dup := range duplicates {
		movieIDsStr := dup.MovieIDs
		// Parse movie IDs
		var movieIDs []int
		for _, idStr := range strings.Split(movieIDsStr, ",") {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				movieIDs = append(movieIDs, id)
			}
		}

		if len(movieIDs) <= 1 {
			continue
		}

		// Find the movie with the most votes
		var bestMovieID int
		var maxVotes int

		for _, movieID := range movieIDs {
			var voteCount int
			err := s.QueryRow(`
				SELECT COUNT(*) FROM votes WHERE movie_id = ?
			`, movieID).Scan(&voteCount)
			if err != nil {
				continue
			}

			if voteCount > maxVotes {
				maxVotes = voteCount
				bestMovieID = movieID
			}
		}

		// If no votes, keep the first one (oldest)
		if bestMovieID == 0 {
			bestMovieID = movieIDs[0]
		}

		// Move votes from duplicate movies to the best one
		for _, movieID := range movieIDs {
			if movieID == bestMovieID {
				continue
			}

			// Update votes to point to the best movie
			_, err := s.Exec(`
				UPDATE votes SET movie_id = ? WHERE movie_id = ?
			`, bestMovieID, movieID)
			if err != nil {
				continue
			}

			// Delete the duplicate movie
			_, err = s.Exec(`
				DELETE FROM movies WHERE id = ?
			`, movieID)
			if err != nil {
				continue
			}
		}
	}

	return nil
}

// GetMovieByTMDBID retrieves a movie by its TMDB ID
func (s *SQLite) GetMovieByTMDBID(tmdbID int) (*Movie, error) {
	var movie Movie
	err := s.QueryRow(`
		SELECT tmdb_id, title, overview, poster_path, backdrop_path,
		       release_date, runtime, adult, original_language, original_title,
		       popularity, vote_average, vote_count, video, added_at, updated_at
		FROM movies 
		WHERE tmdb_id = ?
	`, tmdbID).Scan(
		&movie.ID, &movie.Title, &movie.Overview, &movie.PosterPath, &movie.BackdropPath,
		&movie.ReleaseDate, &movie.Runtime, &movie.Adult, &movie.OriginalLanguage, &movie.OriginalTitle,
		&movie.Popularity, &movie.VoteAverage, &movie.VoteCount, &movie.Video, &movie.AddedAt, &movie.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &movie, nil
}

// MovieExistsByTMDBID checks if a movie exists by TMDB ID
func (s *SQLite) MovieExistsByTMDBID(tmdbID int) (bool, error) {
	var count int
	err := s.QueryRow("SELECT COUNT(*) FROM movies WHERE tmdb_id = ?", tmdbID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// UpdateMovieFromTMDB updates an existing movie with fresh TMDB data
func (s *SQLite) UpdateMovieFromTMDB(tmdbID int, movie *Movie) error {
	query := `
		UPDATE movies SET
			title = ?, overview = ?, poster_path = ?, backdrop_path = ?,
			release_date = ?, runtime = ?, adult = ?, original_language = ?, original_title = ?,
			popularity = ?, vote_average = ?, vote_count = ?, video = ?, updated_at = ?
		WHERE tmdb_id = ?
	`

	_, err := s.Exec(query,
		movie.Title,
		movie.Overview,
		movie.PosterPath,
		movie.BackdropPath,
		movie.ReleaseDate,
		movie.Runtime,
		movie.Adult,
		movie.OriginalLanguage,
		movie.OriginalTitle,
		movie.Popularity,
		movie.VoteAverage,
		movie.VoteCount,
		movie.Video,
		movie.UpdatedAt,
		tmdbID,
	)
	return err
}

// Password hashing functions using Argon2id
type params struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

var defaultParams = &params{
	memory:      64 * 1024, // 64 MB
	iterations:  3,
	parallelism: 2,
	saltLength:  16,
	keyLength:   32,
}

// HashPassword creates a hash of the password using Argon2id
func HashPassword(password string) (string, error) {
	salt, err := generateRandomBytes(defaultParams.saltLength)
	if err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, defaultParams.iterations, defaultParams.memory, defaultParams.parallelism, defaultParams.keyLength)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encodedHash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, defaultParams.memory, defaultParams.iterations, defaultParams.parallelism, b64Salt, b64Hash)

	return encodedHash, nil
}

// VerifyPassword verifies a password against a hash
func VerifyPassword(password, encodedHash string) (bool, error) {
	p, salt, hash, err := decodeHash(encodedHash)
	if err != nil {
		return false, err
	}

	otherHash := argon2.IDKey([]byte(password), salt, p.iterations, p.memory, p.parallelism, p.keyLength)

	if subtle.ConstantTimeCompare(hash, otherHash) == 1 {
		return true, nil
	}
	return false, nil
}

func generateRandomBytes(n uint32) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func decodeHash(encodedHash string) (p *params, salt, hash []byte, err error) {
	vals := strings.Split(encodedHash, "$")
	if len(vals) != 6 {
		return nil, nil, nil, errors.New("invalid hash format")
	}

	var version int
	_, err = fmt.Sscanf(vals[2], "v=%d", &version)
	if err != nil {
		return nil, nil, nil, err
	}
	if version != argon2.Version {
		return nil, nil, nil, errors.New("incompatible version")
	}

	p = &params{}
	_, err = fmt.Sscanf(vals[3], "m=%d,t=%d,p=%d", &p.memory, &p.iterations, &p.parallelism)
	if err != nil {
		return nil, nil, nil, err
	}

	salt, err = base64.RawStdEncoding.DecodeString(vals[4])
	if err != nil {
		return nil, nil, nil, err
	}
	p.saltLength = uint32(len(salt))

	hash, err = base64.RawStdEncoding.DecodeString(vals[5])
	if err != nil {
		return nil, nil, nil, err
	}
	p.keyLength = uint32(len(hash))

	return p, salt, hash, nil
}

// Admin user management functions

// CreateAdminUser creates a new admin user
func (s *SQLite) CreateAdminUser(username, password string) error {
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}

	_, err = s.Exec(`
		INSERT INTO admin_users (username, password_hash, created_at)
		VALUES (?, ?, ?)
	`, username, hash, time.Now().Unix())
	return err
}

// AuthenticateAdmin verifies admin credentials
func (s *SQLite) AuthenticateAdmin(username, password string) (*AdminUser, error) {
	var admin AdminUser
	err := s.QueryRow(`
		SELECT id, username, password_hash, created_at, last_login
		FROM admin_users WHERE username = ?
	`, username).Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.CreatedAt, &admin.LastLogin)

	if err != nil {
		return nil, err
	}

	valid, err := VerifyPassword(password, admin.PasswordHash)
	if err != nil {
		return nil, err
	}

	if !valid {
		return nil, errors.New("invalid password")
	}

	// Update last login
	now := time.Now().Unix()
	_, err = s.Exec(`
		UPDATE admin_users SET last_login = ? WHERE id = ?
	`, now, admin.ID)
	if err != nil {
		return nil, err
	}

	admin.LastLogin = &now
	return &admin, nil
}

// GetAdminUser retrieves an admin user by ID
func (s *SQLite) GetAdminUser(id int) (*AdminUser, error) {
	var admin AdminUser
	err := s.QueryRow(`
		SELECT id, username, password_hash, created_at, last_login
		FROM admin_users WHERE id = ?
	`, id).Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.CreatedAt, &admin.LastLogin)

	if err != nil {
		return nil, err
	}
	return &admin, nil
}

// ListAdminUsers retrieves all admin users
func (s *SQLite) ListAdminUsers() ([]AdminUser, error) {
	rows, err := s.Query(`
		SELECT id, username, password_hash, created_at, last_login
		FROM admin_users ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var admins []AdminUser
	for rows.Next() {
		var admin AdminUser
		err := rows.Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.CreatedAt, &admin.LastLogin)
		if err != nil {
			return nil, err
		}
		admins = append(admins, admin)
	}
	return admins, nil
}

// DeleteAdminUser deletes an admin user
func (s *SQLite) DeleteAdminUser(id int) error {
	_, err := s.Exec("DELETE FROM admin_users WHERE id = ?", id)
	return err
}

// UpdateAdminPassword updates an admin user's password
func (s *SQLite) UpdateAdminPassword(id int, newPassword string) error {
	hash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	_, err = s.Exec(`
		UPDATE admin_users SET password_hash = ? WHERE id = ?
	`, hash, id)
	return err
}

// DeleteMovie deletes a movie by ID
func (s *SQLite) DeleteMovie(id int) error {
	_, err := s.Exec("DELETE FROM movies WHERE id = ?", id)
	return err
}

// ResetDatabase resets the entire database by dropping and recreating all tables
func (s *SQLite) ResetDatabase() error {
	// Drop all tables
	tables := []string{"votes", "appeals", "admin_users", "movies"}
	for _, table := range tables {
		_, err := s.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", table))
		if err != nil {
			return err
		}
	}

	// Recreate schema
	return s.ApplyDBSchema()
}

// DeleteAllVotes deletes all votes from the database
func (s *SQLite) DeleteAllVotes() error {
	_, err := s.Exec("DELETE FROM votes")
	return err
}
