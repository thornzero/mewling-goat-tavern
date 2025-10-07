package services

import (
	"fmt"
	"sync"
	"time"

	"github.com/thornzero/movie-poll/models"
	"github.com/thornzero/movie-poll/types"
	"gorm.io/gorm"
)

// CacheEntry represents a cached item with TTL
type CacheEntry struct {
	Data      interface{} `json:"data"`
	ExpiresAt time.Time   `json:"expires_at"`
	CreatedAt time.Time   `json:"created_at"`
}

// CacheService provides comprehensive caching for TMDB API, sessions, and queries
type CacheService struct {
	db            *gorm.DB
	tmdbTTL       time.Duration
	sessionTTL    time.Duration
	queryTTL      time.Duration
	memoryCache   map[string]CacheEntry
	cacheMutex    sync.RWMutex
	hitCount      int64
	missCount     int64
	cleanupTicker *time.Ticker
}

// Cache statistics
type CacheStats struct {
	HitCount    int64   `json:"hit_count"`
	MissCount   int64   `json:"miss_count"`
	HitRate     float64 `json:"hit_rate"`
	MemoryItems int     `json:"memory_items"`
	TMDBTTL     string  `json:"tmdb_ttl"`
	SessionTTL  string  `json:"session_ttl"`
	QueryTTL    string  `json:"query_ttl"`
}

func NewCacheService(db *gorm.DB) *CacheService {
	cs := &CacheService{
		db:          db,
		tmdbTTL:     24 * time.Hour,   // TMDB API responses
		sessionTTL:  2 * time.Hour,    // Session data
		queryTTL:    15 * time.Minute, // Database queries
		memoryCache: make(map[string]CacheEntry),
	}

	// Start cleanup routine
	cs.startCleanup()

	return cs
}

// startCleanup runs periodic cleanup of expired cache entries
func (c *CacheService) startCleanup() {
	c.cleanupTicker = time.NewTicker(5 * time.Minute)
	go func() {
		for range c.cleanupTicker.C {
			c.cleanupExpiredEntries()
		}
	}()
}

// cleanupExpiredEntries removes expired entries from memory cache
func (c *CacheService) cleanupExpiredEntries() {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	now := time.Now()
	for key, entry := range c.memoryCache {
		if now.After(entry.ExpiresAt) {
			delete(c.memoryCache, key)
		}
	}
}

// getFromMemory retrieves an item from memory cache
func (c *CacheService) getFromMemory(key string) (interface{}, bool) {
	c.cacheMutex.RLock()
	defer c.cacheMutex.RUnlock()

	entry, exists := c.memoryCache[key]
	if !exists {
		c.missCount++
		return nil, false
	}

	if time.Now().After(entry.ExpiresAt) {
		c.missCount++
		return nil, false
	}

	c.hitCount++
	return entry.Data, true
}

// setInMemory stores an item in memory cache
func (c *CacheService) setInMemory(key string, data interface{}, ttl time.Duration) {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	c.memoryCache[key] = CacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
		CreatedAt: time.Now(),
	}
}

// GetMovie - smart movie lookup with caching
func (c *CacheService) GetMovie(tmdbID int) (*types.Movie, error) {
	var movie models.Movie

	// 1. Try to find in local cache first
	err := c.db.Where("tmdb_id = ?", tmdbID).First(&movie).Error
	if err == nil {
		// Check if cache is still fresh
		if time.Since(movie.UpdatedAt) < c.queryTTL {
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
	cutoff := time.Now().Add(-c.queryTTL)
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

// TMDB API Caching Methods

// CacheTMDBResponse caches TMDB API responses
func (c *CacheService) CacheTMDBResponse(key string, data interface{}) {
	c.setInMemory("tmdb:"+key, data, c.tmdbTTL)
}

// GetTMDBResponse retrieves cached TMDB API response
func (c *CacheService) GetTMDBResponse(key string) (interface{}, bool) {
	return c.getFromMemory("tmdb:" + key)
}

// CacheMovieSearch caches movie search results
func (c *CacheService) CacheMovieSearch(query string, results interface{}) {
	c.CacheTMDBResponse("search:"+query, results)
}

// GetCachedMovieSearch retrieves cached movie search results
func (c *CacheService) GetCachedMovieSearch(query string) (interface{}, bool) {
	return c.GetTMDBResponse("search:" + query)
}

// CacheMovieDetails caches movie details
func (c *CacheService) CacheMovieDetails(tmdbID int, movie interface{}) {
	key := fmt.Sprintf("movie:%d", tmdbID)
	c.CacheTMDBResponse(key, movie)
}

// GetCachedMovieDetails retrieves cached movie details
func (c *CacheService) GetCachedMovieDetails(tmdbID int) (interface{}, bool) {
	key := fmt.Sprintf("movie:%d", tmdbID)
	return c.GetTMDBResponse(key)
}

// Session Caching Methods

// CacheSessionData caches session data
func (c *CacheService) CacheSessionData(sessionID string, data interface{}) {
	c.setInMemory("session:"+sessionID, data, c.sessionTTL)
}

// GetCachedSessionData retrieves cached session data
func (c *CacheService) GetCachedSessionData(sessionID string) (interface{}, bool) {
	return c.getFromMemory("session:" + sessionID)
}

// InvalidateSessionCache invalidates session cache
func (c *CacheService) InvalidateSessionCache(sessionID string) {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()
	delete(c.memoryCache, "session:"+sessionID)
}

// Database Query Caching Methods

// CacheQueryResult caches database query results
func (c *CacheService) CacheQueryResult(queryKey string, result interface{}) {
	c.setInMemory("query:"+queryKey, result, c.queryTTL)
}

// GetCachedQueryResult retrieves cached query result
func (c *CacheService) GetCachedQueryResult(queryKey string) (interface{}, bool) {
	return c.getFromMemory("query:" + queryKey)
}

// CacheVotingStats caches voting statistics
func (c *CacheService) CacheVotingStats(stats interface{}) {
	c.CacheQueryResult("voting_stats", stats)
}

// GetCachedVotingStats retrieves cached voting statistics
func (c *CacheService) GetCachedVotingStats() (interface{}, bool) {
	return c.GetCachedQueryResult("voting_stats")
}

// CacheMovieResults caches movie results for display
func (c *CacheService) CacheMovieResults(results interface{}) {
	c.CacheQueryResult("movie_results", results)
}

// GetCachedMovieResults retrieves cached movie results
func (c *CacheService) GetCachedMovieResults() (interface{}, bool) {
	return c.GetCachedQueryResult("movie_results")
}

// Cache Management Methods

// GetCacheStats returns cache performance statistics
func (c *CacheService) GetCacheStats() CacheStats {
	c.cacheMutex.RLock()
	defer c.cacheMutex.RUnlock()

	total := c.hitCount + c.missCount
	hitRate := float64(0)
	if total > 0 {
		hitRate = float64(c.hitCount) / float64(total) * 100
	}

	return CacheStats{
		HitCount:    c.hitCount,
		MissCount:   c.missCount,
		HitRate:     hitRate,
		MemoryItems: len(c.memoryCache),
		TMDBTTL:     c.tmdbTTL.String(),
		SessionTTL:  c.sessionTTL.String(),
		QueryTTL:    c.queryTTL.String(),
	}
}

// ClearCache clears all cached data
func (c *CacheService) ClearCache() {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()
	c.memoryCache = make(map[string]CacheEntry)
	c.hitCount = 0
	c.missCount = 0
}

// ClearExpiredCache removes expired entries
func (c *CacheService) ClearExpiredCache() {
	c.cleanupExpiredEntries()
}

// StopCacheService stops the cache cleanup routine
func (c *CacheService) StopCacheService() {
	if c.cleanupTicker != nil {
		c.cleanupTicker.Stop()
	}
}

// InvalidateMovieCache invalidates movie-related caches when movies are updated
func (c *CacheService) InvalidateMovieCache(tmdbID int) {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	// Remove movie-specific caches
	delete(c.memoryCache, "tmdb:movie:"+fmt.Sprintf("%d", tmdbID))

	// Invalidate related caches
	delete(c.memoryCache, "query:movie_results")
	delete(c.memoryCache, "query:voting_stats")
}

// InvalidateVoteCache invalidates vote-related caches when votes are updated
func (c *CacheService) InvalidateVoteCache() {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	// Invalidate vote-related caches
	delete(c.memoryCache, "query:voting_stats")
	delete(c.memoryCache, "query:movie_results")
}
