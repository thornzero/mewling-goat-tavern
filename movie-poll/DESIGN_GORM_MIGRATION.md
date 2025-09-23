# GORM Migration & Database Modernization Design Document

## AI Assistant Context & Instructions

**This document serves as a comprehensive prompt context for AI assistants to understand and implement the GORM migration for the Movie Poll application. Read this entire document before beginning any implementation work.**

### Current Project Structure

```tree
movie-poll/
├── main.go
├── go.mod
├── .env
├── .air.toml
├── services/
│   ├── sqlite.go          # 1,346 lines - TO BE REPLACED
│   ├── handlers.go
│   ├── router.go
│   ├── services.go
│   ├── tmdb_service.go
│   └── view_handlers.go
├── types/
│   └── movie.go
├── views/
│   ├── layout.templ
│   ├── movie-card.templ
│   ├── movie-poll.templ
│   └── admin-movies.templ
├── static/
│   ├── css/
│   └── js/
└── TODO.md
```

### Implementation Priority

1. **HIGH**: GORM setup and model creation
2. **HIGH**: Database service migration
3. **MEDIUM**: Caching implementation
4. **LOW**: Database agnosticism

### Key Requirements

- **DO NOT BREAK** existing functionality during migration
- **MAINTAIN** all current API endpoints
- **PRESERVE** all existing data
- **IMPLEMENT** gradual migration strategy
- **TEST** thoroughly at each step

## Overview

This document outlines the complete migration from manual SQLite to GORM-based database management, including advanced caching, database agnosticism, and performance optimizations for the Movie Poll application.

## Current State Analysis

### Problems with Current Implementation

- **1,346 lines** of manual SQL code in `services/sqlite.go`
- **Error-prone scanning** with `sql.NullInt32`, `sql.NullInt64`
- **Manual schema management** with 100+ line SQL schema
- **No caching** - every search hits TMDB API
- **Database lock-in** - hard to switch from SQLite
- **Complex transactions** - manual begin/commit/rollback
- **Type safety issues** - runtime errors from type mismatches

### Current Database Schema

```sql
-- Movies table (16 columns)
CREATE TABLE movies(
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

-- Votes table (8 columns)
CREATE TABLE votes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  vibe INTEGER NOT NULL CHECK (vibe >= 1 AND vibe <= 6),
  seen BOOLEAN NOT NULL,
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Appeals table (7 columns)
CREATE TABLE appeals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  appeal_score REAL NOT NULL,
  total_votes INTEGER NOT NULL DEFAULT 0,
  unique_voters INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  visibility_ratio REAL NOT NULL DEFAULT 0,
  calculated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Admin users table (5 columns)
CREATE TABLE admin_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  last_login INTEGER
);
```

## Target Architecture

### 1. GORM Models

#### Movie Model

```go
// models/movie.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Movie struct {
    ID               uint      `gorm:"primaryKey" json:"id"`
    TMDBID           *int      `gorm:"uniqueIndex" json:"tmdb_id,omitempty"`
    Title            string    `gorm:"not null;index" json:"title"`
    Year             *int      `gorm:"index" json:"year,omitempty"`
    Overview         *string   `json:"overview,omitempty"`
    PosterPath       *string   `json:"poster_path,omitempty"`
    BackdropPath     *string   `json:"backdrop_path,omitempty"`
    ReleaseDate      *string   `json:"release_date,omitempty"`
    Runtime          *int      `json:"runtime,omitempty"`
    Adult            bool      `gorm:"default:false" json:"adult"`
    OriginalLanguage *string   `gorm:"default:'en'" json:"original_language,omitempty"`
    OriginalTitle    *string   `json:"original_title,omitempty"`
    Popularity       *float64  `gorm:"default:0" json:"popularity,omitempty"`
    VoteAverage      *float64  `gorm:"default:0" json:"vote_average,omitempty"`
    VoteCount        *int      `gorm:"default:0" json:"vote_count,omitempty"`
    Video            bool      `gorm:"default:false" json:"video"`
    CreatedAt        time.Time `json:"created_at"`
    UpdatedAt        time.Time `json:"updated_at"`
    
    // Relationships
    Votes   []Vote   `gorm:"foreignKey:MovieID;constraint:OnDelete:CASCADE" json:"votes,omitempty"`
    Appeals []Appeal `gorm:"foreignKey:MovieID;constraint:OnDelete:CASCADE" json:"appeals,omitempty"`
}

// Helper methods
func (m *Movie) GetPosterURL() string {
    if m.PosterPath != nil {
        return "https://image.tmdb.org/t/p/w200" + *m.PosterPath
    }
    return ""
}

func (m *Movie) GetBackdropURL() string {
    if m.BackdropPath != nil {
        return "https://image.tmdb.org/t/p/w1280" + *m.BackdropPath
    }
    return ""
}
```

#### Vote Model

```go
// models/vote.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Vote struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    MovieID   uint      `gorm:"not null;index" json:"movie_id"`
    UserName  string    `gorm:"not null;index" json:"user_name"`
    Vibe      int       `gorm:"not null;check:vibe >= 1 AND vibe <= 6" json:"vibe"`
    Seen      bool      `gorm:"not null" json:"seen"`
    DeviceID  string    `gorm:"not null;index" json:"device_id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    
    // Relationships
    Movie Movie `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
}

// Validation
func (v *Vote) BeforeCreate(tx *gorm.DB) error {
    if v.Vibe < 1 || v.Vibe > 6 {
        return errors.New("vibe must be between 1 and 6")
    }
    return nil
}
```

#### Appeal Model

```go
// models/appeal.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Appeal struct {
    ID              uint      `gorm:"primaryKey" json:"id"`
    MovieID         uint      `gorm:"not null;index" json:"movie_id"`
    AppealScore     float64   `gorm:"not null;index" json:"appeal_score"`
    TotalVotes      int       `gorm:"not null;default:0" json:"total_votes"`
    UniqueVoters    int       `gorm:"not null;default:0" json:"unique_voters"`
    SeenCount       int       `gorm:"not null;default:0" json:"seen_count"`
    VisibilityRatio float64   `gorm:"not null;default:0" json:"visibility_ratio"`
    CalculatedAt    time.Time `json:"calculated_at"`
    
    // Relationships
    Movie Movie `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
}
```

#### AdminUser Model

```go
// models/admin_user.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type AdminUser struct {
    ID           uint       `gorm:"primaryKey" json:"id"`
    Username     string     `gorm:"uniqueIndex;not null" json:"username"`
    PasswordHash string     `gorm:"not null" json:"-"`
    CreatedAt    time.Time  `json:"created_at"`
    LastLogin    *time.Time `json:"last_login,omitempty"`
}

// Password validation
func (u *AdminUser) BeforeCreate(tx *gorm.DB) error {
    if len(u.PasswordHash) < 32 {
        return errors.New("password hash too short")
    }
    return nil
}
```

### 2. Database Service Architecture

#### Database Configuration

```go
// services/database_config.go
package services

import (
    "fmt"
    "os"
    "strconv"
    "gorm.io/driver/postgres"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

type DatabaseConfig struct {
    Type     string
    Host     string
    Port     int
    User     string
    Password string
    DBName   string
    SSLMode  string
    LogLevel logger.LogLevel
}

func LoadDatabaseConfig() DatabaseConfig {
    return DatabaseConfig{
        Type:     getEnv("DATABASE_TYPE", "sqlite"),
        Host:     getEnv("DATABASE_HOST", "localhost"),
        Port:     getEnvAsInt("DATABASE_PORT", 5432),
        User:     getEnv("DATABASE_USER", "postgres"),
        Password: getEnv("DATABASE_PASSWORD", ""),
        DBName:   getEnv("DATABASE_NAME", "movie_poll.db"),
        SSLMode:  getEnv("DATABASE_SSL_MODE", "disable"),
        LogLevel: logger.Info,
    }
}

func NewDatabase(config DatabaseConfig) (*gorm.DB, error) {
    var dialector gorm.Dialector
    
    switch config.Type {
    case "sqlite":
        dialector = sqlite.Open(config.DBName + "?_busy_timeout=5000&_journal_mode=WAL")
    case "postgres":
        dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s",
            config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode)
        dialector = postgres.Open(dsn)
    default:
        return nil, fmt.Errorf("unsupported database type: %s", config.Type)
    }
    
    return gorm.Open(dialector, &gorm.Config{
        Logger: logger.Default.LogMode(config.LogLevel),
    })
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}
```

#### Movie Service

```go
// services/movie_service.go
package services

import (
    "time"
    "your-app/models"
    "gorm.io/gorm"
)

type MovieService struct {
    db *gorm.DB
}

func NewMovieService(db *gorm.DB) *MovieService {
    return &MovieService{db: db}
}

// GetMovies - replaces 50+ line GetMovies function
func (s *MovieService) GetMovies(limit int) ([]models.Movie, error) {
    var movies []models.Movie
    query := s.db.Order("title")
    if limit > 0 {
        query = query.Limit(limit)
    }
    return movies, query.Find(&movies).Error
}

// GetMovieByID - replaces 20+ line GetMovieByID function
func (s *MovieService) GetMovieByID(id uint) (*models.Movie, error) {
    var movie models.Movie
    err := s.db.First(&movie, id).Error
    if err != nil {
        return nil, err
    }
    return &movie, nil
}

// GetMovieByTMDBID - replaces 20+ line GetMovieByTMDBID function
func (s *MovieService) GetMovieByTMDBID(tmdbID int) (*models.Movie, error) {
    var movie models.Movie
    err := s.db.Where("tmdb_id = ?", tmdbID).First(&movie).Error
    if err != nil {
        return nil, err
    }
    return &movie, nil
}

// AddMovie - replaces 30+ line AddMovie function
func (s *MovieService) AddMovie(movie *models.Movie) error {
    return s.db.Create(movie).Error
}

// UpdateMovie - replaces 20+ line UpdateMovie function
func (s *MovieService) UpdateMovie(movie *models.Movie) error {
    return s.db.Save(movie).Error
}

// DeleteMovie - replaces 5+ line DeleteMovie function
func (s *MovieService) DeleteMovie(id uint) error {
    return s.db.Delete(&models.Movie{}, id).Error
}

// SearchMovies - new functionality with local search
func (s *MovieService) SearchMovies(query string, limit int) ([]models.Movie, error) {
    var movies []models.Movie
    searchQuery := s.db.Where("title ILIKE ? OR original_title ILIKE ?", 
        "%"+query+"%", "%"+query+"%").
        Order("popularity DESC")
    
    if limit > 0 {
        searchQuery = searchQuery.Limit(limit)
    }
    
    return movies, searchQuery.Find(&movies).Error
}

// GetMoviesWithVotes - complex query with relationships
func (s *MovieService) GetMoviesWithVotes() ([]models.Movie, error) {
    var movies []models.Movie
    return movies, s.db.Preload("Votes").Preload("Appeals").
        Where("id IN (SELECT DISTINCT movie_id FROM votes)").
        Find(&movies).Error
}
```

#### Vote Service

```go
// services/vote_service.go
package services

import (
    "your-app/models"
    "gorm.io/gorm"
)

type VoteService struct {
    db *gorm.DB
}

func NewVoteService(db *gorm.DB) *VoteService {
    return &VoteService{db: db}
}

// SubmitVote - replaces 30+ line SubmitVote function
func (s *VoteService) SubmitVote(vote *models.Vote) error {
    return s.db.Where("movie_id = ? AND user_name = ? AND device_id = ?", 
        vote.MovieID, vote.UserName, vote.DeviceID).
        Assign(vote).
        FirstOrCreate(vote).Error
}

// GetUserVotes - replaces 20+ line GetUserVotes function
func (s *VoteService) GetUserVotes(userName, deviceID string) ([]models.Vote, error) {
    var votes []models.Vote
    return votes, s.db.Where("user_name = ? AND device_id = ?", userName, deviceID).
        Order("created_at DESC").
        Find(&votes).Error
}

// GetAllVotes - replaces 15+ line GetAllVotes function
func (s *VoteService) GetAllVotes() ([]models.Vote, error) {
    var votes []models.Vote
    return votes, s.db.Order("created_at DESC").Find(&votes).Error
}

// GetVoteStats - new functionality
func (s *VoteService) GetVoteStats() (map[string]interface{}, error) {
    var stats = make(map[string]interface{})
    
    var count int64
    s.db.Model(&models.Vote{}).Count(&count)
    stats["total_votes"] = count
    
    s.db.Model(&models.Vote{}).Distinct("user_name").Count(&count)
    stats["unique_voters"] = count
    
    s.db.Model(&models.Vote{}).Distinct("movie_id").Count(&count)
    stats["movies_with_votes"] = count
    
    return stats, nil
}
```

### 3. Caching Architecture

#### Cache Service

```go
// services/cache_service.go
package services

import (
    "encoding/json"
    "fmt"
    "time"
    "your-app/models"
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
func (c *CacheService) GetMovie(tmdbID int) (*models.Movie, error) {
    var movie models.Movie
    
    // 1. Try to find in local cache first
    err := c.db.Where("tmdb_id = ?", tmdbID).First(&movie).Error
    if err == nil {
        // Check if cache is still fresh
        if time.Since(movie.UpdatedAt) < c.ttl {
            return &movie, nil // Return cached data
        }
        // Cache is stale, fetch fresh data
    }
    
    // 2. Fetch fresh data from TMDB
    tmdbData, err := TMDB.GetMovieDetails(tmdbID)
    if err != nil {
        return nil, err
    }
    
    // 3. Update or create in cache
    movie = models.Movie{
        TMDBID:           &tmdbData.ID,
        Title:            tmdbData.Title,
        Overview:         tmdbData.Overview,
        PosterPath:       tmdbData.PosterPath,
        BackdropPath:     tmdbData.BackdropPath,
        ReleaseDate:      tmdbData.ReleaseDate,
        Runtime:          tmdbData.Runtime,
        Adult:            tmdbData.Adult,
        OriginalLanguage: tmdbData.OriginalLanguage,
        OriginalTitle:    tmdbData.OriginalTitle,
        Popularity:       tmdbData.Popularity,
        VoteAverage:      tmdbData.VoteAverage,
        VoteCount:        tmdbData.VoteCount,
        Video:            tmdbData.Video,
    }
    
    // GORM handles upsert automatically
    return &movie, c.db.Where("tmdb_id = ?", tmdbID).
        Assign(movie).
        FirstOrCreate(&movie).Error
}

// SearchMovies - search with intelligent caching
func (c *CacheService) SearchMovies(query string, limit int) ([]models.Movie, error) {
    // 1. Try local search first
    var movies []models.Movie
    err := c.db.Where("title ILIKE ? OR original_title ILIKE ?", 
        "%"+query+"%", "%"+query+"%").
        Order("popularity DESC").
        Limit(limit).
        Find(&movies).Error
    
    if err == nil && len(movies) > 0 {
        return movies, nil // Found locally
    }
    
    // 2. Search TMDB and cache results
    tmdbResults, err := TMDB.SearchMovies(query)
    if err != nil {
        return nil, err
    }
    
    // 3. Cache all results
    for _, tmdbMovie := range tmdbResults {
        movie := models.Movie{
            TMDBID: &tmdbMovie.ID,
            Title:  tmdbMovie.Title,
            // ... other fields
        }
        c.db.Where("tmdb_id = ?", tmdbMovie.ID).
            Assign(movie).
            FirstOrCreate(&movie)
        movies = append(movies, movie)
    }
    
    return movies, nil
}

// InvalidateStaleCache - cleanup stale entries
func (c *CacheService) InvalidateStaleCache() error {
    cutoff := time.Now().Add(-c.ttl)
    return c.db.Where("updated_at < ?", cutoff).Delete(&models.Movie{}).Error
}
```

### 4. Migration Strategy

#### Phase 1: Setup GORM (CRITICAL - DO THIS FIRST)

**Step 1: Install Dependencies**

```bash
cd movie-poll
go get gorm.io/gorm
go get gorm.io/driver/sqlite
go get gorm.io/driver/postgres
go mod tidy
```

**Step 2: Create Models Directory Structure**

```bash
mkdir -p models
touch models/movie.go
touch models/vote.go
touch models/appeal.go
touch models/admin_user.go
```

**Step 3: Create New Database Services**

```bash
touch services/database_config.go
touch services/movie_service.go
touch services/vote_service.go
touch services/cache_service.go
touch services/gorm_service.go  # Main GORM service
```

**Step 4: Update go.mod**

```go
// Add these imports to go.mod
require (
    gorm.io/gorm v1.25.5
    gorm.io/driver/sqlite v1.5.4
    gorm.io/driver/postgres v1.5.4
)
```

#### Phase 2: Gradual Migration (NON-BREAKING)

**CRITICAL**: Keep existing `services/sqlite.go` running alongside new GORM services

**Step 1: Create GORM Service Interface**

```go
// services/gorm_service.go
package services

import (
    "your-app/models"
    "gorm.io/gorm"
)

type GORMService struct {
    db            *gorm.DB
    movieService  *MovieService
    voteService   *VoteService
    cacheService  *CacheService
}

func NewGORMService() (*GORMService, error) {
    config := LoadDatabaseConfig()
    db, err := NewDatabase(config)
    if err != nil {
        return nil, err
    }
    
    // Auto-migrate all models
    err = db.AutoMigrate(&models.Movie{}, &models.Vote{}, &models.Appeal{}, &models.AdminUser{})
    if err != nil {
        return nil, err
    }
    
    return &GORMService{
        db:           db,
        movieService: NewMovieService(db),
        voteService:  NewVoteService(db),
        cacheService: NewCacheService(db),
    }, nil
}

// Implement the same interface as SQLite service
func (g *GORMService) GetMovies(limit int) ([]types.Movie, error) {
    movies, err := g.movieService.GetMovies(limit)
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

func convertGORMMovieToType(gormMovie models.Movie) types.Movie {
    return types.Movie{
        ID:               int(gormMovie.ID),
        TMDBID:           gormMovie.TMDBID,
        Title:            gormMovie.Title,
        Year:             gormMovie.Year,
        Overview:         gormMovie.Overview,
        PosterPath:       gormMovie.PosterPath,
        BackdropPath:     gormMovie.BackdropPath,
        ReleaseDate:      gormMovie.ReleaseDate,
        Runtime:          gormMovie.Runtime,
        Adult:            gormMovie.Adult,
        OriginalLanguage: gormMovie.OriginalLanguage,
        OriginalTitle:    gormMovie.OriginalTitle,
        Popularity:       gormMovie.Popularity,
        VoteAverage:      gormMovie.VoteAverage,
        VoteCount:        gormMovie.VoteCount,
        Video:            gormMovie.Video,
        AddedAt:          gormMovie.CreatedAt.Unix(),
        UpdatedAt:        gormMovie.UpdatedAt.Unix(),
    }
}
```

**Step 2: Update services.go to Support Both**

```go
// services/services.go - ADD THIS TO EXISTING FILE
type Services struct {
    // Existing fields...
    SQLiteDB *SQLite
    GORMDB   *GORMService  // NEW FIELD
    UseGORM  bool          // NEW FIELD - flag to switch between services
}

func NewServices() (*Services, error) {
    // Existing SQLite setup...
    sqliteDB, err := NewSQLite()
    if err != nil {
        return nil, err
    }
    
    // NEW: GORM setup
    gormDB, err := NewGORMService()
    if err != nil {
        log.Printf("Warning: GORM setup failed, falling back to SQLite: %v", err)
        gormDB = nil
    }
    
    return &Services{
        SQLiteDB: sqliteDB,
        GORMDB:   gormDB,
        UseGORM:  gormDB != nil, // Use GORM if available
    }, nil
}

// Add method to get the active database service
func (s *Services) GetDB() interface{} {
    if s.UseGORM && s.GORMDB != nil {
        return s.GORMDB
    }
    return s.SQLiteDB
}
```

**Step 3: Update Handlers Gradually**

```go
// services/handlers.go - UPDATE EXISTING HANDLERS
func (hr *HandlerRegistry) handleGetMovies(w http.ResponseWriter, r *http.Request) {
    // Get the active database service
    db := hr.services.GetDB()
    
    var movies []types.Movie
    var err error
    
    // Use GORM if available, otherwise fall back to SQLite
    if gormDB, ok := db.(*GORMService); ok {
        movies, err = gormDB.GetMovies(0) // 0 = no limit
    } else if sqliteDB, ok := db.(*SQLite); ok {
        movies, err = sqliteDB.GetMovies(0)
    } else {
        http.Error(w, "No database service available", http.StatusInternalServerError)
        return
    }
    
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    // Rest of handler remains the same...
}
```

#### Phase 3: Complete Migration (AFTER TESTING)

**Step 1: Verify All Functionality Works**

- Test all API endpoints
- Test admin panel
- Test movie search
- Test voting system
- Test results page

**Step 2: Remove Old SQLite Service**

```bash
# Only after confirming everything works with GORM
rm services/sqlite.go
```

**Step 3: Clean Up Services**

```go
// services/services.go - SIMPLIFY AFTER MIGRATION
type Services struct {
    DB *GORMService  // Only GORM service
}

func NewServices() (*Services, error) {
    gormDB, err := NewGORMService()
    if err != nil {
        return nil, err
    }
    
    return &Services{
        DB: gormDB,
    }, nil
}
```

#### Phase 4: Add Advanced Features

**Step 1: Implement Caching**

- Add Redis support
- Implement cache warming
- Add cache invalidation

**Step 2: Add Database Agnosticism**

- Support PostgreSQL
- Add migration tools
- Add environment-based configuration

### 5. Environment Configuration

#### .env File

```bash
# Database Configuration
DATABASE_TYPE=sqlite
DATABASE_NAME=movie_poll.db

# For PostgreSQL (production)
# DATABASE_TYPE=postgres
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=secret
# DATABASE_NAME=movie_poll
# DATABASE_SSL_MODE=disable

# Cache Configuration
CACHE_TTL=24h
CACHE_WARMING_ENABLED=true

# TMDB Configuration
TMDB_API_KEY=your_api_key_here
TMDB_CACHE_ENABLED=true
```

### 6. Performance Improvements

#### Expected Performance Gains

- **Code Reduction**: 1,346 lines → ~200 lines (85% reduction)
- **Query Performance**: 10-50ms for cached data vs 500ms+ for API calls
- **Cache Hit Rate**: 90%+ for popular movies
- **API Calls**: 90%+ reduction in external API calls
- **Error Rate**: 100% reduction in scanning errors
- **Maintainability**: Dramatically improved

#### Caching Strategy

1. **Local-First**: Check database before API calls
2. **Smart Invalidation**: Refresh stale data automatically
3. **Background Warming**: Pre-populate popular content
4. **Batch Operations**: Efficient bulk operations
5. **TTL Management**: Automatic cache expiration

### 7. Testing Strategy

#### Unit Tests

```go
// services/movie_service_test.go
func TestMovieService_GetMovies(t *testing.T) {
    db := setupTestDB(t)
    service := NewMovieService(db)
    
    // Test with limit
    movies, err := service.GetMovies(10)
    assert.NoError(t, err)
    assert.Len(t, movies, 0) // Empty initially
    
    // Test without limit
    movies, err = service.GetMovies(0)
    assert.NoError(t, err)
    assert.Len(t, movies, 0)
}
```

#### Integration Tests

```go
func TestMovieService_Integration(t *testing.T) {
    db := setupTestDB(t)
    service := NewMovieService(db)
    
    // Create test movie
    movie := &models.Movie{
        Title: "Test Movie",
        Year:  &[]int{2023}[0],
    }
    
    err := service.AddMovie(movie)
    assert.NoError(t, err)
    assert.NotZero(t, movie.ID)
    
    // Retrieve movie
    retrieved, err := service.GetMovieByID(movie.ID)
    assert.NoError(t, err)
    assert.Equal(t, movie.Title, retrieved.Title)
}
```

### 8. Deployment Strategy

#### Development

- Use SQLite for local development
- Enable debug logging
- Use in-memory cache for testing

#### Production

- Use PostgreSQL for production
- Enable connection pooling
- Use Redis for caching
- Enable query optimization

#### Migration Script

```go
// scripts/migrate.go
func main() {
    // Connect to source (SQLite)
    sourceDB := connectSQLite("movie_poll.db")
    
    // Connect to target (PostgreSQL)
    targetDB := connectPostgreSQL(os.Getenv("DATABASE_URL"))
    
    // Migrate data
    migrateMovies(sourceDB, targetDB)
    migrateVotes(sourceDB, targetDB)
    migrateAppeals(sourceDB, targetDB)
    migrateAdminUsers(sourceDB, targetDB)
    
    fmt.Println("Migration completed successfully!")
}
```

## Implementation Timeline

### Week 1: Foundation

- [ ] Install GORM dependencies
- [ ] Create model definitions
- [ ] Set up database configuration
- [ ] Create basic services

### Week 2: Migration

- [ ] Implement movie service
- [ ] Implement vote service
- [ ] Update handlers gradually
- [ ] Add comprehensive tests

### Week 3: Caching

- [ ] Implement cache service
- [ ] Add intelligent caching
- [ ] Implement cache invalidation
- [ ] Add performance monitoring

### Week 4: Production Ready

- [ ] Add PostgreSQL support
- [ ] Implement database agnosticism
- [ ] Add migration tools
- [ ] Deploy to production

## AI Implementation Instructions

### CRITICAL: Read This Before Starting

**The next AI assistant should:**

1. **READ THE ENTIRE DOCUMENT** before making any changes
2. **FOLLOW THE PHASES EXACTLY** - do not skip steps
3. **TEST AFTER EACH PHASE** - ensure nothing breaks
4. **MAINTAIN BACKWARD COMPATIBILITY** - keep existing functionality working
5. **USE THE EXACT CODE EXAMPLES** provided in this document

### Phase 1 Implementation Checklist

**Before starting, verify:**

- [ ] Current app is running and functional
- [ ] All tests pass
- [ ] Database has existing data
- [ ] All API endpoints work

**Step-by-step implementation:**

1. **Install Dependencies**

   ```bash
   cd /home/thornzero/Repositories/mewling-goat-tavern/movie-poll
   go get gorm.io/gorm
   go get gorm.io/driver/sqlite
   go get gorm.io/driver/postgres
   go mod tidy
   ```

2. **Create Models Directory**

   ```bash
   mkdir -p models
   ```

3. **Create Each Model File** (use exact code from this document)
   - `models/movie.go`
   - `models/vote.go`
   - `models/appeal.go`
   - `models/admin_user.go`

4. **Create Database Services** (use exact code from this document)
   - `services/database_config.go`
   - `services/movie_service.go`
   - `services/vote_service.go`
   - `services/cache_service.go`
   - `services/gorm_service.go`

5. **Test Compilation**

   ```bash
   go build -o tmp/server .
   ```

### Phase 2 Implementation Checklist

**CRITICAL**: Do not remove existing `services/sqlite.go` yet!

1. **Update services.go** (add GORM support alongside existing SQLite)
2. **Update handlers.go** (add fallback logic)
3. **Test all endpoints** (ensure both SQLite and GORM work)
4. **Verify data integrity** (check that data is preserved)

### Testing Strategy

**After each phase, run these tests:**

1. **Compilation Test**

   ```bash
   go build -o tmp/server .
   ```

2. **Server Start Test**

   ```bash
   ./tmp/server
   # Should start without errors
   ```

3. **API Endpoint Tests**

   ```bash
   # Test main page
   curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/"
   
   # Test movie search
   curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/search?q=House"
   
   # Test admin page
   curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/admin/movies"
   ```

4. **Database Integrity Test**

   ```bash
   # Check that existing data is preserved
   sqlite3 movie_poll.db "SELECT COUNT(*) FROM movies;"
   sqlite3 movie_poll.db "SELECT COUNT(*) FROM votes;"
   ```

### Common Issues and Solutions

**Issue 1: Import Errors**

```go
// Fix: Update import paths to match your project structure
import "github.com/thornzero/movie-poll/models"
import "github.com/thornzero/movie-poll/types"
```

**Issue 2: Type Conversion Errors**

```go
// Fix: Use the exact conversion functions provided in this document
func convertGORMMovieToType(gormMovie models.Movie) types.Movie {
    // Use the exact implementation from this document
}
```

**Issue 3: Database Connection Errors**

```go
// Fix: Check .env file and database configuration
// Ensure DATABASE_TYPE=sqlite is set
// Ensure DATABASE_NAME=movie_poll.db is set
```

**Issue 4: Handler Update Errors**

```go
// Fix: Use the exact handler update pattern from this document
// Do not change the handler logic, only add the database selection logic
```

### Validation Checklist

**Before considering the migration complete:**

- [ ] All existing API endpoints work identically
- [ ] Admin panel functions correctly
- [ ] Movie search works
- [ ] Voting system works
- [ ] Results page displays correctly
- [ ] No data loss occurred
- [ ] Performance is maintained or improved
- [ ] Error handling works correctly
- [ ] All tests pass

### Rollback Plan

**If anything goes wrong:**

1. **Stop the server**
2. **Revert to previous commit**

   ```bash
   git checkout HEAD~1
   ```

3. **Restart the server**

   ```bash
   ./scripts/dev.sh
   ```

4. **Verify functionality is restored**

### Success Criteria

**The migration is successful when:**

1. **Code Reduction**: Database code reduced from 1,346 lines to ~200 lines
2. **Functionality Preserved**: All existing features work identically
3. **Performance Maintained**: Response times are the same or better
4. **Error Elimination**: No more scanning errors
5. **Type Safety**: Compile-time checking works
6. **Maintainability**: Code is easier to understand and modify

### Next Steps After Migration

**Once Phase 2 is complete and tested:**

1. **Implement caching** (Phase 3)
2. **Add database agnosticism** (Phase 4)
3. **Remove old SQLite service** (Phase 5)
4. **Add advanced features** (Phase 6)

### Emergency Contacts

**If you encounter issues:**

1. **Check the TODO.md** for current status
2. **Review the design document** for implementation details
3. **Test each phase thoroughly** before proceeding
4. **Maintain backward compatibility** at all times

## Success Metrics

### Code Quality

- [ ] 85% reduction in database code
- [ ] 100% elimination of scanning errors
- [ ] 100% type safety
- [ ] Zero manual SQL management

### Performance

- [ ] 90%+ cache hit rate
- [ ] 90%+ reduction in API calls
- [ ] 10-50ms response times for cached data
- [ ] Support for 1000+ concurrent users

### Maintainability

- [ ] Easy database switching
- [ ] Automatic schema migrations
- [ ] Comprehensive test coverage
- [ ] Clear separation of concerns

## Conclusion

This GORM migration will transform the Movie Poll application from a complex, error-prone system to a modern, maintainable, and performant application. The benefits include:

1. **Dramatic code reduction** (85% less database code)
2. **Zero error-prone scanning** (automatic type handling)
3. **Intelligent caching** (90%+ performance improvement)
4. **Database agnosticism** (easy switching between databases)
5. **Modern architecture** (type-safe, maintainable, testable)

The migration can be done gradually without breaking existing functionality, ensuring a smooth transition to a more robust and scalable system.
