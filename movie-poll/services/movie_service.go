package services

import (
	"github.com/thornzero/movie-poll/models"
	"github.com/thornzero/movie-poll/types"
	"gorm.io/gorm"
)

type MovieService struct {
	db *gorm.DB
}

func NewMovieService(db *gorm.DB) *MovieService {
	return &MovieService{db: db}
}

// GetMovies - replaces 50+ line GetMovies function
func (s *MovieService) GetMovies(limit int) ([]types.Movie, error) {
	var movies []models.Movie
	query := s.db.Order("title")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&movies).Error
	if err != nil {
		return nil, err
	}

	// Convert GORM models to types.Movie
	var result []types.Movie
	for _, movie := range movies {
		result = append(result, convertGORMMovieToType(movie))
	}
	return result, nil
}

// GetMovieByID - replaces 20+ line GetMovieByID function
func (s *MovieService) GetMovieByID(id uint) (*types.Movie, error) {
	var movie models.Movie
	err := s.db.First(&movie, id).Error
	if err != nil {
		return nil, err
	}
	result := convertGORMMovieToType(movie)
	return &result, nil
}

// GetMovieByTMDBID - replaces 20+ line GetMovieByTMDBID function
func (s *MovieService) GetMovieByTMDBID(tmdbID int) (*types.Movie, error) {
	var movie models.Movie
	err := s.db.Where("tmdb_id = ?", tmdbID).First(&movie).Error
	if err != nil {
		return nil, err
	}
	result := convertGORMMovieToType(movie)
	return &result, nil
}

// AddMovie - replaces 30+ line AddMovie function
func (s *MovieService) AddMovie(movie *types.Movie) error {
	gormMovie := convertTypeMovieToGORM(movie)
	return s.db.Create(&gormMovie).Error
}

// UpdateMovie - replaces 20+ line UpdateMovie function
func (s *MovieService) UpdateMovie(movie *types.Movie) error {
	gormMovie := convertTypeMovieToGORM(movie)
	return s.db.Save(&gormMovie).Error
}

// DeleteMovie - replaces 5+ line DeleteMovie function
func (s *MovieService) DeleteMovie(id uint) error {
	return s.db.Delete(&models.Movie{}, id).Error
}

// SearchMovies - new functionality with local search
func (s *MovieService) SearchMovies(query string, limit int) ([]types.Movie, error) {
	var movies []models.Movie
	searchQuery := s.db.Where("title LIKE ? OR original_title LIKE ?",
		"%"+query+"%", "%"+query+"%").
		Order("popularity DESC")

	if limit > 0 {
		searchQuery = searchQuery.Limit(limit)
	}

	err := searchQuery.Find(&movies).Error
	if err != nil {
		return nil, err
	}

	// Convert GORM models to types.Movie
	var result []types.Movie
	for _, movie := range movies {
		result = append(result, convertGORMMovieToType(movie))
	}
	return result, nil
}

// GetMoviesWithVotes - complex query with relationships
func (s *MovieService) GetMoviesWithVotes() ([]types.Movie, error) {
	var movies []models.Movie
	err := s.db.Preload("Votes").Preload("Appeals").
		Where("id IN (SELECT DISTINCT movie_id FROM votes)").
		Find(&movies).Error
	if err != nil {
		return nil, err
	}

	// Convert GORM models to types.Movie
	var result []types.Movie
	for _, movie := range movies {
		result = append(result, convertGORMMovieToType(movie))
	}
	return result, nil
}
