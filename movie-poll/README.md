# Movie Poll - Mewling Goat Tavern

A modern movie voting application built with Go, HTMX, Templ, and SQLite. Features a clean service-oriented architecture with admin dashboard and CLI tools.

## Features

- 🎬 Movie voting interface with Swiper.js carousel
- ❤️ Three voting options: Loved It, Meh, Hated It
- 🎨 Beautiful dark theme with Tailwind CSS
- 📱 Responsive design
- 🔧 Admin dashboard with full database management
- 🛠️ CLI database management tools
- 🚀 Railway deployment ready
- 🔒 Secure session management
- 📊 Real-time voting statistics

## Tech Stack

- **Backend**: Go with Chi router and SQLite database
- **Frontend**: HTMX for dynamic interactions
- **Templates**: Templ for type-safe HTML generation
- **Styling**: Tailwind CSS with custom dark theme
- **Database**: SQLite with custom schema
- **CLI Tools**: Go-based database management
- **Deployment**: Railway

## Local Development

### Quick Start

```bash
# Install dependencies and tools
make install-tools
make deps

# Start development server with hot reload
make dev
```

### Manual Setup

1. Install dependencies:

   ```bash
   go mod tidy
   ```

2. Install development tools:

   ```bash
   go install github.com/a-h/templ/cmd/templ@latest
   go install github.com/air-verse/air@latest
   ```

3. Generate templ files:

   ```bash
   templ generate
   ```

4. Build CSS:

   ```bash
   make build-css
   ```

5. Run the application:

   ```bash
   go run main.go
   ```

6. Visit `http://localhost:3000`

## Railway Deployment

1. Make sure you're logged into Railway CLI:

   ```bash
   railway login
   ```

2. Link your project:

   ```bash
   railway link
   ```

3. Deploy:

   ```bash
   make railway-deploy
   ```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database path (default: db/movie_poll.db)
- `TMDB_API_KEY`: TheMovieDB API key (optional, for movie details)

## Project Structure

```tree
movie-poll/
├── main.go                    # Application entry point
├── services/                  # Service layer
│   ├── handlers.go           # HTTP handlers registry
│   ├── view_handlers.go      # Template rendering handlers
│   ├── router.go             # Chi routing service
│   ├── sqlite.go             # Database service
│   ├── session.go            # Session management
│   ├── tmdb_service.go       # TMDB API integration
│   └── services.go           # Service initialization
├── types/                     # Shared type definitions
│   ├── vote.go              # Vote types
│   └── voting.go            # Voting statistics types
├── views/                     # Templ templates
│   ├── *.templ              # Template files
│   └── *_templ.go           # Generated Go files
├── static/                    # Static assets
│   ├── css/                 # Tailwind CSS
│   └── js/                  # HTMX and custom JS
├── cmd/                       # CLI utilities
│   └── db-manager/          # Database management tool
├── db/                        # Database files
│   ├── movie_poll.db        # SQLite database
│   └── schema.sql           # Database schema
├── scripts/                   # Build and deployment scripts
└── makefile                  # Development commands
```

## Database Schema

The application uses SQLite with the following tables:

- `movies`: Movie information (id, title, year, overview, poster_path, etc.)
- `votes`: User votes (id, movie_id, user_name, vibe, seen, device_id, created_at, updated_at)
- `admin_users`: Admin user accounts (id, username, password_hash, created_at)
- `appeals`: Movie appeal scores (movie_id, appeal_score, calculated_at)

## Admin Dashboard

The application includes a comprehensive admin dashboard accessible at `/admin`:

- **Statistics**: View total movies, votes, and unique voters
- **Movie Management**: Add, view, and delete movies
- **Vote Management**: View and delete votes
- **Database Operations**: Reset database, clean duplicates
- **User Management**: Admin user accounts

## CLI Database Manager

A standalone CLI tool for database management:

```bash
# Build the CLI tool
go build -o db-manager ./cmd/db-manager

# Available commands
./db-manager stats              # Show database statistics
./db-manager movies             # List all movies
./db-manager votes              # List all votes
./db-manager clean              # Clean duplicate movies
./db-manager reset              # Reset database (WARNING: deletes all data)
./db-manager delete-movie <id>  # Delete a specific movie
./db-manager delete-votes       # Delete all votes
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details
