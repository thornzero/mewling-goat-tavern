# Movie Poll Backend - Cloudflare D1 + TMDB API

A robust backend service for the Movie Poll application, built with Cloudflare Workers and D1 database, integrated with The Movie Database (TMDB) API.

## 🚀 Features

- **Movie Management**: Store and retrieve movie data from TMDB
- **Voting System**: Handle user votes with validation and conflict resolution
- **Appeal Calculations**: Calculate movie appeal scores based on votes and visibility
- **Batch Operations**: Support for batch vote submissions
- **CORS Support**: Configured for frontend integration
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error handling with custom error types

## 🏗️ Architecture

### Database Schema

- **movies**: Core movie data from TMDB
- **genres**: Movie genre information
- **movie_genres**: Many-to-many relationship between movies and genres
- **videos**: Movie trailers and videos
- **votes**: User votes for movies
- **appeal_calculations**: Calculated appeal scores
- **poll_sessions**: Voting session management
- **session_movies**: Movies in specific poll sessions

### API Endpoints

- `GET /?action=debug` - Debug information
- `GET /?action=listMovies` - List all movies
- `GET /?action=search&query=<query>` - Search movies via TMDB
- `GET /?action=movie&id=<id>` - Get movie details
- `POST /?action=vote` - Submit a single vote
- `POST /?action=batchVote` - Submit multiple votes
- `GET /?action=updateAppeal` - Calculate and update appeal scores

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Cloudflare account
- TMDB API key
- Wrangler CLI installed globally

### Installation

1. **Clone and navigate to the backend directory:**

   ```bash
   cd d1-backend/mewling-goat-backend
   ```

2. **Run the setup script:**

   ```bash
   ./setup.sh
   ```

3. **Set up environment variables:**

   ```bash
   wrangler secret put TMDB_API_KEY
   # Enter your TMDB API key when prompted
   ```

### Manual Setup

If you prefer manual setup:

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create D1 database:**

   ```bash
   wrangler d1 create mewlinggoat_db
   ```

3. **Run migrations:**

   ```bash
   npm run db:migrate
   ```

4. **Generate types:**

   ```bash
   npm run cf-typegen
   ```

5. **Set secrets:**

   ```bash
   wrangler secret put TMDB_API_KEY
   ```

## 🚀 Development

### Start Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Deploy to Production

```bash
npm run deploy
```

## 📊 Database Management

### Reset Database

```bash
npm run db:reset
```

### Run Migrations

```bash
npm run db:migrate
```

### Seed Database (if seed.sql exists)

```bash
npm run db:seed
```

## 🔧 Configuration

### Environment Variables

- `TMDB_API_KEY`: Your TMDB API key (set as secret)
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `DEBUG`: Enable debug mode (true/false)

### CORS Configuration

The backend is configured to allow requests from:

- `https://moviepoll.mewling-goat-tavern.online` (production)
- `http://localhost:3000` (local development)
- `http://localhost:8787` (Wrangler dev server)

## 📝 API Usage

### Search Movies

```bash
curl "https://your-worker.your-subdomain.workers.dev/?action=search&query=The%20Thing"
```

### Submit Vote

```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/?action=vote" \
  -H "Content-Type: application/json" \
  -d '{
    "movie_id": 123,
    "user_name": "JohnDoe",
    "vibe": 5,
    "seen": true
  }'
```

### Get Appeal Rankings

```bash
curl "https://your-worker.your-subdomain.workers.dev/?action=updateAppeal"
```

## 🧪 Testing

The backend includes comprehensive error handling and validation:

- **Input Validation**: All inputs are validated before processing
- **Database Errors**: Proper error handling for database operations
- **TMDB API Errors**: Graceful handling of TMDB API failures
- **CORS Support**: Proper CORS headers for frontend integration

## 🔍 Debugging

Enable debug mode by setting the `DEBUG` environment variable to `true`:

```bash
wrangler secret put DEBUG
# Enter "true" when prompted
```

## 📚 Type Definitions

The backend includes comprehensive TypeScript types in `src/types.ts`:

- Database entity types
- API request/response types
- TMDB API types
- Error types
- Frontend compatibility types

## 🚨 Error Handling

The backend uses custom error types for better error handling:

- `ApiError`: General API errors
- `ValidationError`: Input validation errors
- `NotFoundError`: Resource not found errors
- `DatabaseError`: Database operation errors

## 🔄 Migration from Google Apps Script

This backend replaces the Google Apps Script backend with:

- **Better Performance**: Cloudflare Workers are faster and more reliable
- **Type Safety**: Full TypeScript support
- **Better Error Handling**: Comprehensive error types and handling
- **Scalability**: Cloudflare's global network
- **Maintainability**: Modern development practices

## 📞 Support

For issues or questions:

1. Check the error logs in Cloudflare Workers dashboard
2. Verify environment variables are set correctly
3. Ensure TMDB API key is valid
4. Check database migrations have been applied

## 🎯 Next Steps

1. Deploy the backend to Cloudflare
2. Update frontend configuration to use the new backend
3. Test all functionality
4. Monitor performance and errors
5. Clean up old Google Apps Script code
