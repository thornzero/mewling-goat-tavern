# Shared Infrastructure

This package contains shared infrastructure components for the Mewling Goat Tavern unified platform.

## Purpose

The shared infrastructure enables code reuse between multiple applications (movie-poll, barkeep, etc.) while maintaining consistency and reducing duplication.

## Package Structure

### `config/`

Application configuration management including environment variable loading and configuration structs.

- **Package**: `config`
- **Key Files**: `env.go`
- **Dependencies**: `joho/godotenv`

### `database/`

Database management using GORM with support for SQLite and PostgreSQL.

- **Package**: `database`
- **Key Files**: `database_config.go`, `gorm_service.go`
- **Dependencies**: `gorm.io/gorm`, `gorm.io/driver/sqlite`
- **Interface**: Implements `interfaces.DatabaseService`

### `models/`

Shared database models used across all applications.

- **Package**: `models`
- **Models**: `Movie`, `Vote`, `Appeal`, `User`, `AdminUser`, `DuplicateMovie`
- **Dependencies**: `gorm.io/gorm` (for GORM tags only)

### `session/`

Session management with GORM-backed persistence.

- **Package**: `session`
- **Key Files**: `session.go`
- **Dependencies**: `alexedwards/scs/v2`, `alexedwards/scs/gormstore`
- **Features**: Session data, admin authentication, voting progress tracking

### `interfaces/`

Interface definitions for shared services to enable dependency injection and testability.

- **Package**: `interfaces`
- **Interfaces**: `DatabaseService`, `SessionManager`

## Usage

### In Go Modules

```go
import (
    "github.com/thornzero/mewling-goat-tavern/shared/config"
    "github.com/thornzero/mewling-goat-tavern/shared/database"
    "github.com/thornzero/mewling-goat-tavern/shared/models"
    "github.com/thornzero/mewling-goat-tavern/shared/session"
)
```

### Example: Initialize Database

```go
// Create database service
dbService, err := database.NewService()
if err != nil {
    log.Fatal(err)
}
defer dbService.Close()

// Get GORM DB for queries
db := dbService.GetDB()

// Use models
var movies []models.Movie
db.Find(&movies)
```

### Example: Initialize Session

```go
// Create session manager
sessionMgr, err := session.NewSessionManager(db)
if err != nil {
    log.Fatal(err)
}

// Use as middleware
r := chi.NewRouter()
r.Use(sessionMgr.LoadAndSave)
```

### Example: Configuration

```go
// Load environment configuration
cfg := config.NewEnvConfig()

// Access configuration values
port := cfg.Port
dbPath := cfg.DBPath
```

## Design Principles

1. **Minimal Dependencies**: Shared packages avoid application-specific dependencies
2. **Interface-Based**: Services implement interfaces for testability
3. **Configuration-Driven**: Behavior configured via environment variables
4. **Database-Agnostic**: Support multiple database backends (SQLite, PostgreSQL)
5. **Session Persistence**: Sessions persisted in database for reliability

## Architecture Decision Records

- **ADR-001**: Shared Infrastructure Extraction ([docs/ADR-001-shared-infrastructure-extraction.md](../docs/ADR-001-shared-infrastructure-extraction.md))

## Testing

Run tests for shared packages:

```bash
cd shared
go test ./...
```

## Contributing

When modifying shared infrastructure:

1. Ensure changes are application-agnostic
2. Update interface definitions if adding new methods
3. Run tests across all applications that use shared code
4. Update this README if adding new packages or interfaces
