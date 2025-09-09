# System Architecture

## Overview

The Mewling Goat Tavern Movie Poll system is built as a microservices architecture using Cloudflare Workers.

## Components

### Frontend (Astro + Cloudflare Workers)

- **Purpose**: User interface and API proxy
- **Technology**: Astro, TypeScript, Tailwind CSS
- **Deployment**: Cloudflare Workers
- **URL**: <https://mewling-goat-backend.tavern-b8d.workers.dev>

### Backend (Cloudflare Workers)

- **Purpose**: Business logic, database operations, external API integration
- **Technology**: TypeScript, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **External APIs**: The Movie Database (TMDB)
- **URL**: <https://mewling-goat-backend.tavern-b8d.workers.dev>

## Data Flow

```flow
User Request → Frontend → Backend → D1 Database
                ↓
            Frontend ← Backend ← D1 Database
                ↓
            User Response
```

## API Architecture

The frontend acts as a proxy to eliminate CORS issues:

1. **Frontend API Routes**: `/api/debug`, `/api/listMovies`, etc.
2. **Proxy Layer**: Forwards requests to backend
3. **Backend Processing**: Handles all business logic
4. **Response**: Returns data through proxy chain

## Database Schema

- **movies**: Movie metadata and TMDB integration
- **votes**: User voting data
- **appeals**: Calculated appeal values and statistics

## Security

- **CORS**: Eliminated through same-origin proxy
- **API Keys**: Stored as Cloudflare Workers secrets
- **Validation**: Input validation on both frontend and backend
