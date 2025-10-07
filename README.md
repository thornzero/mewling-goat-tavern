# Mewling Goat Tavern - Unified Platform

A unified tavern management platform built with Go, HTMX, Templ, and SQLite. Features shared infrastructure supporting multiple applications including movie polling and barkeep management systems.

## 🏗️ Architecture

```flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Applications  │    │ Shared Services │    │   SQLite DB     │
│ Movie Poll +    │◄──►│  (Go + GORM +   │◄──►│   (Shared)      │
│ Barkeep Web     │    │   Chi + Templ)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```tree
mewling-goat-tavern/
├── shared/                    # ✅ Shared infrastructure (IMPLEMENTED)
│   ├── config/               # Environment configuration
│   ├── database/             # GORM database service
│   ├── models/               # Shared database models
│   ├── session/              # Session management
│   └── interfaces/           # Service contracts
│
├── movie-poll/               # Movie Poll application
│   ├── main.go              # Application entry point
│   ├── services/            # Application-specific services
│   ├── types/               # Application types
│   ├── views/               # Application templates
│   ├── static/              # Static assets
│   ├── cmd/                 # CLI utilities
│   ├── db/                  # Database files
│   └── makefile             # Development commands
│
├── docs/                    # Documentation
│   ├── architecture.md      # System architecture
│   ├── archive/             # Historical references
│   └── ADR-001-shared...md  # Architecture decisions
│
├── reference/               # External references
│   └── Common Tailwind...md # Tutorial materials
│
└── archive/                 # Legacy code
    └── bar and grill/        # Previous implementations
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
