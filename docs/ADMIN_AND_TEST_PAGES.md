# Admin Panel and Test Pages

This document describes the admin panel and test pages that have been added to the Mewling Goat Tavern movie poll application.

## Admin Panel (`/admin`)

### Admin Panel Features

- **Password-protected login** with admin authentication
- **Movie search** using TMDB API to find movies to add
- **Add movies** to the poll with full movie details
- **View current movies** in the poll with appeal scores
- **Delete movies** from the poll
- **Swap movies** - replace one movie with another
- **Update appeal values** - recalculate appeal scores
- **Export movie list** - download current movies as JSON
- **Import movies** - upload JSON file to add multiple movies at once

### Admin Panel Login

- Default password: `mewling-goat-admin-2025`
- Password is stored in localStorage for session persistence
- Change the password in the admin.html file for security

### Admin Panel API Endpoints

- `POST /api/admin/add-movie` - Add a new movie to the poll
- `POST /api/admin/delete-movie` - Delete a movie from the poll

### Import/Export Format (JSON)

The import and export functionality uses a consistent JSON format:

```json
[
  {
    "title": "Movie Title",
    "year": 2023,
    "tmdb_id": 12345,
    "appeal_value": null
  }
]
```

**Required fields:**

- `title` - Movie title
- `year` - Release year
- `tmdb_id` - The Movie Database ID

**Optional fields:**

- `appeal_value` - Appeal score (calculated automatically)
- `poster_path` - Movie poster path
- `overview` - Movie description

## Test Page (`/test`)

### Test Page Features

- **Comprehensive API testing** for all endpoints
- **Individual test buttons** for each API function
- **Run all tests** button to test everything at once
- **Real-time results** with detailed JSON responses
- **Test summary** showing pass/fail status

### Test Page Categories

1. **Debug Status** - System information and statistics
2. **Movie List** - Retrieve all movies in the poll
3. **Movie Search** - Search TMDB for movies
4. **Movie Details** - Get detailed movie information
5. **Movie Videos** - Get movie trailers and videos
6. **Single Vote** - Submit individual votes
7. **Batch Vote** - Submit multiple votes at once
8. **Appeal Calculation** - Test appeal value calculations

### Test Page API Endpoints

- `GET /api/debug` - System debug information
- `GET /api/movie?id=123` - Get movie details by TMDB ID

## Navigation (HTML)

All pages now include navigation links:

- **Main Poll** (`/`) - The voting interface
- **Results** (`/results`) - View poll results
- **Test Page** (`/test`) - API testing interface
- **Admin Panel** (`/admin`) - Movie management

## Security Notes (Security)

- Admin password is currently hardcoded - change for production
- No rate limiting implemented - consider adding for production
- Admin endpoints don't have additional authentication beyond password
- Consider implementing proper session management for production

## Usage (Usage)

1. **For Testing**: Visit `/test` to verify all API endpoints are working
2. **For Administration**: Visit `/admin` and login to manage movies
3. **For Voting**: Visit `/` to participate in the poll
4. **For Results**: Visit `/results` to see current standings

## Development (Development)

The admin and test functionality is built with:

- **HTMX** for dynamic content loading
- **Tailwind CSS** for styling
- **Vanilla JavaScript** for client-side logic
- **TypeScript** for backend API endpoints
- **Cloudflare D1** for database operations
