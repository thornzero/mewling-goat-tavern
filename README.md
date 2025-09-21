# Mewling Goat Tavern - Movie Poll System

A modern movie polling application built with Go, HTMX, Templ, and SQLite. Features a clean service-oriented architecture with admin dashboard and CLI tools.

## 🏗️ Architecture

```flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │   SQLite DB     │
│   (Templ +      │◄──►│  (Go Services   │◄──►│   (Local File)  │
│   HTMX + CSS)   │    │   + Chi Router) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```tree
mewling-goat-tavern/
├── movie-poll/                 # Main Go application
│   ├── main.go                # Application entry point
│   ├── services/              # Service layer
│   │   ├── handlers.go        # HTTP handlers registry
│   │   ├── view_handlers.go   # Template rendering handlers
│   │   ├── router.go          # Chi routing service
│   │   ├── sqlite.go          # Database service
│   │   ├── session.go         # Session management
│   │   ├── tmdb_service.go    # TMDB API integration
│   │   └── services.go        # Service initialization
│   ├── types/                 # Shared type definitions
│   │   ├── vote.go           # Vote types
│   │   └── voting.go         # Voting statistics types
│   ├── views/                 # Templ templates
│   │   ├── *.templ           # Template files
│   │   └── *_templ.go        # Generated Go files
│   ├── static/                # Static assets
│   │   ├── css/              # Tailwind CSS
│   │   └── js/               # HTMX and custom JS
│   ├── cmd/                   # CLI utilities
│   │   └── db-manager/        # Database management tool
│   ├── db/                    # Database files
│   │   ├── movie_poll.db     # SQLite database
│   │   └── schema.sql        # Database schema
│   ├── scripts/               # Build and deployment scripts
│   └── makefile              # Development commands
│
├── docs/                      # Documentation
│   ├── architecture.md       # System architecture
│   ├── api/                  # API documentation
│   └── deployment/           # Deployment guides
│
└── archive/                   # Legacy code
    ├── astro-frontend/        # Previous Astro implementation
    ├── legacy-frontend/       # Old GitHub Pages version
    └── old-scripts/           # Deprecated scripts
```

## 🚀 Quick Start

### Development

```bash
# Install dependencies and tools
make install-tools
make deps

# Start development server with hot reload
make dev
```

### Production Deployment

```bash
# Build for production
make prod-build

# Deploy to Railway
make railway-deploy
```

## 🌐 Live URLs

- **Application**: <https://movie-poll-production.up.railway.app>
- **Admin Dashboard**: <https://movie-poll-production.up.railway.app/admin>
- **Results Page**: <https://movie-poll-production.up.railway.app/results>

## 🛠️ Development

### Available Commands

```bash
make help                    # Show all available commands
make dev                     # Start development server with hot reload
make build                   # Build the application
make start                   # Start the server
make stop                    # Stop the server
make clean                   # Clean build artifacts
```

### Database Management

```bash
make db-stats               # Show database statistics
make db-clean               # Clean duplicate movies
make db-reset               # Reset database (WARNING: deletes all data)
make db-movies              # List all movies
make db-votes               # List all votes
make db-delete-votes        # Delete all votes
```

### CLI Database Manager

```bash
# Build the CLI tool
go build -o db-manager ./cmd/db-manager

# Use the CLI tool
./db-manager stats
./db-manager movies
./db-manager votes
./db-manager clean
./db-manager reset
```

## 🏗️ Architecture Features

1. **Service-Oriented Architecture**: Clean separation of concerns with dedicated services
2. **Handler Registry Pattern**: Centralized HTTP handler management
3. **Type Safety**: Strong typing with shared type definitions
4. **Admin Dashboard**: Complete web-based administration interface
5. **CLI Tools**: Database management via command line
6. **Session Management**: Secure user session handling
7. **TMDB Integration**: The Movie Database API for movie information

## 📚 Documentation

- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)

## 🔧 Tech Stack

- **Backend**: Go with Chi router, SQLite database
- **Frontend**: Templ templates, HTMX, Tailwind CSS
- **Database**: SQLite with custom schema
- **External APIs**: The Movie Database (TMDB)
- **Deployment**: Railway
- **CLI Tools**: Go-based database management
- **Development**: Air for hot reload, Templ for type-safe templates
