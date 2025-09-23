# Movie Poll Documentation

This directory contains documentation for the Mewling Goat Tavern Movie Poll application.

## Documentation Structure

### Core Documentation

- **[Architecture](architecture.md)** - System architecture and design patterns
- **[TODO](TODO.md)** - Current project status and tasks
- **[Voting System](voting-system.md)** - Voting mechanics and appeal calculation
- **[Admin Panel](admin-panel.md)** - Administration features and functionality

### Design References

- **[Appeal Formula](appeal-formula-visualization.md)** - Detailed voting algorithm visualization
- **[Voting Ranks](voting-ranks.md)** - Vote ranking system implementation

### Future Design References

- **[GORM Migration Design](DESIGN_GORM_MIGRATION.md)** - Comprehensive plan for migrating from manual SQL to GORM

## Project Overview

The Movie Poll application is a Go-based web application that allows users to vote on movies using a sophisticated 6-rank voting system. The application features:

- **Voting System**: 6-rank scale (1-6) with seen/not-seen states
- **Appeal Calculation**: Complex algorithm balancing interest, novelty, quality, and consensus
- **Admin Panel**: Movie management with TMDB integration
- **Results Display**: Real-time rankings with detailed statistics
- **Session Management**: User state tracking and vote persistence

## Technology Stack

- **Backend**: Go with Chi router
- **Frontend**: HTMX + Templ templates
- **Database**: SQLite with manual SQL
- **Styling**: Tailwind CSS
- **External API**: The Movie Database (TMDB)

## Quick Start

1. **Development**: Run `make dev` in the `movie-poll/` directory
2. **Admin Access**: Visit `/admin` with password `mewling-goat-admin-2025`
3. **Testing**: Use `/test` page for API endpoint testing
4. **Results**: View `/results` for current poll standings

## Key Features

### Voting System

- 6-rank voting scale with emoji indicators
- Seen/not-seen state tracking
- Automatic appeal score calculation
- Real-time results updates

### Admin Panel

- TMDB movie search and addition
- Movie management (add/delete/swap)
- Appeal score recalculation
- Import/export functionality

### Technical Features

- Session-based user tracking
- HTMX-powered dynamic updates
- Responsive design with Tailwind CSS
- Comprehensive error handling

## Development Status

The application is currently in active development with core functionality complete. See [TODO.md](TODO.md) for current priorities and upcoming features.

## Contributing

When adding new features or making changes:

1. Update relevant documentation
2. Follow the established architectural patterns
3. Test thoroughly using the `/test` page
4. Update the TODO list with completed tasks
