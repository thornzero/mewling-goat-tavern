# Mewling Goat Tavern - Movie Poll System

A full-stack movie polling application built with Cloudflare Workers, D1 Database, and Astro.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │   D1 Database   │
│   (Astro +      │◄──►│  (Cloudflare    │◄──►│   (SQLite)      │
│   Workers)      │    │   Workers)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
mewling-goat-tavern/
├── backend/                    # Backend API service
│   ├── src/                   # TypeScript source code
│   ├── migrations/            # Database migrations
│   ├── test/                  # Backend tests
│   ├── package.json
│   └── wrangler.jsonc        # Cloudflare Workers config
│
├── backend/src/frontend/      # Frontend source code (Astro)
│   ├── src/                  # Astro source code
│   ├── public/               # Static assets
│   ├── package.json
│   └── astro.config.mjs      # Astro configuration
│
├── scripts/                   # Utility scripts
│   ├── seed-database.js      # Database seeding
│   └── deploy.sh             # Deployment script
│
├── docs/                      # Documentation
│   └── architecture.md       # System architecture
│
└── archive/                   # Legacy code
    ├── legacy-frontend/       # Old GitHub Pages version
    └── old-scripts/           # Deprecated scripts
```

## 🚀 Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🌐 Live URLs

- **Application**: <https://mewling-goat-backend.tavern-b8d.workers.dev>
- **Backend**: <https://mewling-goat-backend.tavern-b8d.workers.dev>

## 🛠️ Development

1. **Backend**: Handles all database operations, TMDB API integration, and business logic
2. **Frontend**: Provides UI and acts as API proxy to eliminate CORS issues
3. **Database**: D1 SQLite database for persistent storage

## 📚 Documentation

- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)

## 🔧 Tech Stack

- **Frontend**: Astro, TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers, TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **External APIs**: The Movie Database (TMDB)
- **Deployment**: Cloudflare Workers
