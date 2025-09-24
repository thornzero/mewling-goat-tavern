package services

import (
	"fmt"
	"time"

	"github.com/thornzero/movie-poll/models"
	"github.com/thornzero/movie-poll/types"
	"gorm.io/gorm"
)

type CacheService struct {
	db  *gorm.DB
	ttl time.Duration
}

func NewCacheService(db *gorm.DB) *CacheService {
	return &CacheService{
		db:  db,
		ttl: 24 * time.Hour, // Cache for 24 hours
	}
}

// GetMovie - smart movie lookup with caching
func (c *CacheService) GetMovie(tmdbID int) (*types.Movie, error) {
	var movie models.Movie

	// 1. Try to find in local cache first
	err := c.db.Where("tmdb_id = ?", tmdbID).First(&movie).Error
	if err == nil {
		// Check if cache is still fresh
		if time.Since(movie.UpdatedAt) < c.ttl {
			result := convertGORMMovieToType(movie)
			return &result, nil // Return cached data
		}
		// Cache is stale, fetch fresh data
	}

	// 2. For now, just return the cached data even if stale
	// TODO: Integrate with TMDB service for fresh data
	if err == gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("movie with TMDB ID %d not found", tmdbID)
	}

	result := convertGORMMovieToType(movie)
	return &result, err
}

// SearchMovies - search with intelligent caching
func (c *CacheService) SearchMovies(query string, limit int) ([]types.Movie, error) {
	// 1. Try local search first
	var movies []models.Movie
	searchQuery := c.db.Where("title LIKE ? OR original_title LIKE ?",
		"%"+query+"%", "%"+query+"%").
		Order("popularity DESC")

	if limit > 0 {
		searchQuery = searchQuery.Limit(limit)
	}

	err := searchQuery.Find(&movies).Error

	if err != nil {
		return nil, err
	}

	// 2. Convert and return results
	var result []types.Movie
	for _, movie := range movies {
		result = append(result, convertGORMMovieToType(movie))
	}

	return result, nil
}

// InvalidateStaleCache - cleanup stale entries
func (c *CacheService) InvalidateStaleCache() error {
	cutoff := time.Now().Add(-c.ttl)
	return c.db.Where("updated_at < ?", cutoff).Delete(&models.Movie{}).Error
}

// AddMovieToCache - add a movie to the cache
func (c *CacheService) AddMovieToCache(movie *types.Movie) error {
	gormMovie := convertTypeMovieToGORM(movie)

	// GORM handles upsert automatically
	return c.db.Where("tmdb_id = ?", gormMovie.TMDBID).
		Assign(gormMovie).
		FirstOrCreate(&gormMovie).Error
}

// GetCachedMoviesCount - get count of cached movies
func (c *CacheService) GetCachedMoviesCount() (int64, error) {
	var count int64
	err := c.db.Model(&models.Movie{}).Count(&count).Error
	return count, err
}
