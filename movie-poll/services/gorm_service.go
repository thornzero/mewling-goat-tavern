package services

import (
	"time"

	"github.com/thornzero/movie-poll/models"
	"github.com/thornzero/movie-poll/types"
	"gorm.io/gorm"
)

type GORMService struct {
	db           *gorm.DB
	movieService *MovieService
	voteService  *VoteService
	cacheService *CacheService
	userService  *UserService
}

func NewGORMService() (*GORMService, error) {
	config := LoadDatabaseConfig()
	db, err := NewDatabase(config)
	if err != nil {
		return nil, err
	}

	// Auto-migrate all models
	err = db.AutoMigrate(&models.Movie{}, &models.Vote{}, &models.Appeal{}, &models.AdminUser{}, &models.User{})
	if err != nil {
		return nil, err
	}

	// Create device_names table for compatibility
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS device_names (
			device_id TEXT NOT NULL,
			name TEXT NOT NULL,
			PRIMARY KEY (device_id, name)
		)
	`).Error
	if err != nil {
		return nil, err
	}

	return &GORMService{
		db:           db,
		movieService: NewMovieService(db),
		voteService:  NewVoteService(db),
		cacheService: NewCacheService(db),
		userService:  NewUserService(db),
	}, nil
}

// Implement the same interface as SQLite service
func (g *GORMService) GetMovies(limit int) ([]types.Movie, error) {
	return g.movieService.GetMovies(limit)
}

func (g *GORMService) GetMovieByID(id int) (*types.Movie, error) {
	return g.movieService.GetMovieByID(uint(id))
}

func (g *GORMService) GetMovieByTMDBID(tmdbID int) (*types.Movie, error) {
	return g.movieService.GetMovieByTMDBID(tmdbID)
}

func (g *GORMService) AddMovie(movie types.Movie) (int64, error) {
	err := g.movieService.AddMovie(&movie)
	return int64(movie.ID), err
}

func (g *GORMService) UpdateMovie(movie *types.Movie) error {
	return g.movieService.UpdateMovie(movie)
}

func (g *GORMService) DeleteMovie(id int) error {
	return g.movieService.DeleteMovie(uint(id))
}

func (g *GORMService) SearchMovies(query string, limit int) ([]types.Movie, error) {
	return g.movieService.SearchMovies(query, limit)
}

func (g *GORMService) SubmitVote(vote types.Vote) (int64, error) {
	err := g.voteService.SubmitVote(&vote)
	return 0, err // Return 0 for compatibility, could be enhanced to return actual ID
}

func (g *GORMService) GetUserVotes(userName, deviceID string) ([]types.Vote, error) {
	return g.voteService.GetUserVotes(userName, deviceID)
}

func (g *GORMService) GetAllVotes() ([]types.Vote, error) {
	return g.voteService.GetAllVotes()
}

// Additional GORM-specific methods
func (g *GORMService) GetMoviesWithVotes() ([]types.Movie, error) {
	return g.movieService.GetMoviesWithVotes()
}

func (g *GORMService) GetVoteStats() (map[string]interface{}, error) {
	return g.voteService.GetVoteStats()
}

func (g *GORMService) GetCachedMoviesCount() (int64, error) {
	return g.cacheService.GetCachedMoviesCount()
}

func (g *GORMService) InvalidateStaleCache() error {
	return g.cacheService.InvalidateStaleCache()
}

// Database access for compatibility
func (g *GORMService) GetDB() *gorm.DB {
	return g.db
}

// Additional methods needed for compatibility
func (g *GORMService) AddDeviceName(deviceID, name string) error {
	// For now, we'll use a simple approach - store in a device_names table
	// This could be enhanced later with a proper Device model
	return g.db.Exec("INSERT OR IGNORE INTO device_names (device_id, name) VALUES (?, ?)", deviceID, name).Error
}

func (g *GORMService) GetDeviceNames(deviceID string) ([]string, error) {
	var names []string
	err := g.db.Raw("SELECT name FROM device_names WHERE device_id = ?", deviceID).Scan(&names).Error
	return names, err
}

func (g *GORMService) FindSimilarNames(name string) ([]string, error) {
	var names []string
	err := g.db.Raw("SELECT DISTINCT name FROM device_names WHERE name LIKE ?", "%"+name+"%").Scan(&names).Error
	return names, err
}

func (g *GORMService) AddMovieFromTMDB(tmdbID int) (string, error) {
	// Check if movie already exists
	var movie models.Movie
	err := g.db.Where("tmdb_id = ?", tmdbID).First(&movie).Error
	if err == nil {
		return movie.Title, nil // Movie exists, return existing title
	}

	// Get movie details from TMDB
	tmdbData, err := TMDB.GetMovieDetails(tmdbID)
	if err != nil {
		return "", err
	}

	// Convert TMDB Movie to types.Movie
	overview := tmdbData.Overview
	posterPath := tmdbData.PosterPath
	backdropPath := tmdbData.BackdropPath
	releaseDate := tmdbData.ReleaseDate
	runtime := int(tmdbData.Runtime)
	originalLanguage := tmdbData.OriginalLanguage
	originalTitle := tmdbData.OriginalTitle
	popularity := float64(tmdbData.Popularity)
	voteAverage := float64(tmdbData.VoteAverage)
	voteCount := int(tmdbData.VoteCount)

	movieType := &types.Movie{
		TMDBID:           &tmdbData.ID,
		Title:            tmdbData.Title,
		Overview:         &overview,
		PosterPath:       &posterPath,
		BackdropPath:     &backdropPath,
		ReleaseDate:      &releaseDate,
		Runtime:          &runtime,
		Adult:            tmdbData.Adult,
		OriginalLanguage: &originalLanguage,
		OriginalTitle:    &originalTitle,
		Popularity:       &popularity,
		VoteAverage:      &voteAverage,
		VoteCount:        &voteCount,
		Video:            tmdbData.Video,
	}

	_, err = g.AddMovie(*movieType)
	return tmdbData.Title, err
}

func (g *GORMService) FindDuplicateMovies() ([]models.DuplicateMovie, error) {
	var duplicates []models.DuplicateMovie
	err := g.db.Raw(`
		SELECT LOWER(title) as title_lower, title, year, COUNT(*) as count, 
		       GROUP_CONCAT(id) as movie_ids
		FROM movies 
		GROUP BY LOWER(title), year 
		HAVING COUNT(*) > 1
	`).Scan(&duplicates).Error
	return duplicates, err
}

func (g *GORMService) ResetDatabase() error {
	// Drop and recreate all tables
	return g.db.Migrator().DropTable(&models.Movie{}, &models.Vote{}, &models.Appeal{}, &models.AdminUser{})
}

func (g *GORMService) DeleteAllVotes() error {
	return g.db.Where("1 = 1").Delete(&models.Vote{}).Error
}

func (g *GORMService) CalculateAppealScores() error {
	// This is a complex operation that calculates appeal scores
	// For now, we'll implement a simplified version
	// TODO: Implement full appeal calculation logic

	// Clear existing appeals
	g.db.Where("1 = 1").Delete(&models.Appeal{})

	// Get all movies with votes
	var movies []models.Movie
	err := g.db.Preload("Votes").Find(&movies).Error
	if err != nil {
		return err
	}

	// Calculate appeal scores for each movie
	for _, movie := range movies {
		if len(movie.Votes) == 0 {
			continue
		}

		totalVotes := len(movie.Votes)
		uniqueVoters := make(map[string]bool)
		seenCount := 0

		for _, vote := range movie.Votes {
			uniqueVoters[vote.UserName] = true
			if vote.Seen {
				seenCount++
			}
		}

		// Simple appeal calculation
		appealScore := float64(totalVotes) * float64(len(uniqueVoters)) / float64(seenCount+1)
		visibilityRatio := float64(seenCount) / float64(totalVotes)

		appeal := models.Appeal{
			MovieID:         movie.ID,
			AppealScore:     appealScore,
			TotalVotes:      totalVotes,
			UniqueVoters:    len(uniqueVoters),
			SeenCount:       seenCount,
			VisibilityRatio: visibilityRatio,
		}

		g.db.Create(&appeal)
	}

	return nil
}

func (g *GORMService) GetResultsSummary() ([]types.VotingSummary, error) {
	var summaries []types.VotingSummary

	// Get movies with appeals
	var appeals []models.Appeal
	err := g.db.Preload("Movie").Find(&appeals).Error
	if err != nil {
		return nil, err
	}

	for _, appeal := range appeals {
		summary := types.VotingSummary{
			MovieID:         int(appeal.Movie.ID),
			Title:           appeal.Movie.Title,
			Year:            appeal.Movie.Year,
			Overview:        appeal.Movie.Overview,
			PosterPath:      appeal.Movie.PosterPath,
			ReleaseDate:     appeal.Movie.ReleaseDate,
			VoteCount:       appeal.TotalVotes,
			AverageVibe:     0, // TODO: Calculate from votes
			AppealScore:     appeal.AppealScore,
			SeenCount:       appeal.SeenCount,
			NotSeenCount:    appeal.TotalVotes - appeal.SeenCount,
			VisibilityRatio: appeal.VisibilityRatio,
			TotalVotes:      appeal.TotalVotes,
			UniqueVoters:    appeal.UniqueVoters,
			CalculatedAt:    appeal.CalculatedAt.Unix(),
		}
		summaries = append(summaries, summary)
	}

	return summaries, nil
}

func (g *GORMService) GetVotingStats() (*types.VotingStats, error) {
	stats := &types.VotingStats{}

	// Count total movies
	var movieCount int64
	g.db.Model(&models.Movie{}).Count(&movieCount)
	stats.TotalMovies = int(movieCount)

	// Count total votes
	var voteCount int64
	g.db.Model(&models.Vote{}).Count(&voteCount)
	stats.TotalVotes = int(voteCount)

	// Count unique voters
	var uniqueVoters int64
	g.db.Model(&models.Vote{}).Distinct("user_name").Count(&uniqueVoters)
	stats.UniqueVoters = int(uniqueVoters)

	// Count movies with votes
	var moviesWithVotes int64
	g.db.Model(&models.Movie{}).Joins("JOIN votes ON movies.id = votes.movie_id").Distinct("movies.id").Count(&moviesWithVotes)
	stats.MoviesWithVotes = int(moviesWithVotes)

	// Calculate average appeal score
	var avgAppeal float64
	g.db.Model(&models.Appeal{}).Select("AVG(appeal_score)").Scan(&avgAppeal)
	stats.AverageAppealScore = avgAppeal

	// Find most voted movie
	var mostVoted struct {
		Title string
		Count int64
	}
	g.db.Model(&models.Vote{}).Select("movies.title, COUNT(*) as count").
		Joins("JOIN movies ON votes.movie_id = movies.id").
		Group("movies.id, movies.title").
		Order("count DESC").
		Limit(1).
		Scan(&mostVoted)

	stats.MostVotedMovie = mostVoted.Title
	stats.MostVotedCount = int(mostVoted.Count)

	return stats, nil
}

func (g *GORMService) GetDeviceMostRecentName(deviceID string) (string, error) {
	var name string
	err := g.db.Raw("SELECT name FROM device_names WHERE device_id = ? ORDER BY ROWID DESC LIMIT 1", deviceID).Scan(&name).Error
	return name, err
}

func (g *GORMService) UpdateDeviceLastSeen(deviceID string) error {
	// This could be implemented with a last_seen column if needed
	// For now, just return nil
	return nil
}

func (g *GORMService) AuthenticateAdmin(username, password string) (*models.AdminUser, error) {
	var admin models.AdminUser
	err := g.db.Where("username = ?", username).First(&admin).Error
	if err != nil {
		return nil, err
	}

	// Check password
	valid, err := VerifyPassword(password, admin.PasswordHash)
	if err != nil || !valid {
		return nil, err
	}

	// Update last login
	now := time.Now()
	admin.LastLogin = &now
	g.db.Save(&admin)

	return &admin, nil
}

// User management methods
func (g *GORMService) GetUsers(limit int) ([]models.User, error) {
	return g.userService.GetUsers(limit)
}

func (g *GORMService) GetUserStats() (map[string]interface{}, error) {
	return g.userService.GetUserStats()
}

func (g *GORMService) UpdateUserStats(userName, deviceID string) error {
	return g.userService.UpdateUserStats(userName, deviceID)
}

func (g *GORMService) DeleteUser(userName, deviceID string) error {
	return g.userService.DeleteUser(userName, deviceID)
}

func (g *GORMService) GetUsersWithVotes() ([]models.User, error) {
	return g.userService.GetUsersWithVotes()
}
