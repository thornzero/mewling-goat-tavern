# API Documentation

## Overview

The Mewling Goat Tavern Movie Poll API provides endpoints for movie management, voting, and results calculation. The API is built on Cloudflare Workers and uses D1 database for data persistence.

## Base URL

```text
https://mewling-goat-backend.tavern-b8d.workers.dev
```

## Authentication

No authentication is required for public endpoints. All endpoints include input validation and error handling.

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Movies

Retrieve all movies in the database with optional appeal calculations.

**Endpoint:** `GET /api/movies`

**Response:**

```json
{
  "success": true,
  "movies": [
    {
      "id": 1,
      "tmdb_id": 123,
      "title": "Movie Title",
      "year": 2023,
      "overview": "Movie description...",
      "poster_path": "/poster.jpg",
      "backdrop_path": "/backdrop.jpg",
      "release_date": "2023-01-01",
      "runtime": 120,
      "adult": false,
      "original_language": "en",
      "original_title": "Original Title",
      "popularity": 100.0,
      "vote_average": 7.5,
      "vote_count": 1000,
      "video": false,
      "added_at": 1640995200000,
      "updated_at": 1640995200000,
      "appeal_value": 8.2,
      "seen_count": 15,
      "total_unique_voters": 20,
      "visibility_ratio": 0.75
    }
  ],
  "total": 1
}
```

**HTMX Support:** This endpoint also supports HTMX requests and returns HTML for carousel display.

### Submit Vote

Submit a single vote for a movie.

**Endpoint:** `POST /api/vote`

**Request Body:**

```json
{
  "movie_id": 123,
  "user_name": "JohnDoe",
  "vibe": 5,
  "seen": true
}
```

**Parameters:**

- `movie_id` (number, required): Movie ID (not TMDB ID)
- `user_name` (string, required): Voter's name
- `vibe` (number, required): Vote value (1-6)
- `seen` (boolean, required): Whether the user has seen the movie

**Response:**

```json
{
  "success": true,
  "message": "Vote submitted successfully",
  "vote_id": 456
}
```

### Submit Batch Votes

Submit multiple votes at once.

**Endpoint:** `POST /api/batch-vote`

**Request Body:**

```json
{
  "votes": [
    {
      "movie_id": 123,
      "user_name": "JohnDoe",
      "vibe": 5,
      "seen": true
    },
    {
      "movie_id": 456,
      "user_name": "JohnDoe",
      "vibe": 3,
      "seen": false
    }
  ]
}
```

**Parameters:**

- `votes` (array, required): Array of vote objects

**Response:**

```json
{
  "success": true,
  "message": "Successfully submitted 2 votes",
  "submitted_count": 2,
  "failed_count": 0,
  "errors": []
}
```

### Start Poll

Initialize the movie poll interface for a user.

**Endpoint:** `POST /api/start-poll`

**Request Body:**

```text
username=JohnDoe
```

**Response:** Returns HTML for the movie poll interface with carousel and voting controls.

### Validate Username

Validate a username for the poll.

**Endpoint:** `POST /api/validate-username`

**Request Body:**

```text
username=JohnDoe
```

**Response:** Returns HTML with validation status and enables/disables the start poll button.

### Search Movies

Search for movies using The Movie Database (TMDB) API with sophisticated matching.

**Endpoint:** `GET /api/search?query=<query>&year=<year>`

**Parameters:**

- `query` (string, required): Search query
- `year` (number, optional): Release year for more precise matching

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "id": 123,
      "title": "Movie Title",
      "release_date": "2023-01-01",
      "poster_path": "/poster.jpg",
      "overview": "Movie description...",
      "genre_ids": [28, 12],
      "adult": false,
      "original_language": "en",
      "original_title": "Original Title",
      "popularity": 100.0,
      "vote_average": 7.5,
      "vote_count": 1000,
      "video": false
    }
  ],
  "total_pages": 1,
  "total_results": 1,
  "page": 1,
  "match_info": {
    "match_type": "exact",
    "similarity_score": 0.95,
    "search_title": "Movie Title",
    "search_year": 2023
  }
}
```

### Update Appeal Scores

Calculate and update appeal scores for all movies.

**Endpoint:** `GET /api/update-appeal`

**Response:**

```json
{
  "success": true,
  "updated": 14,
  "total": 14,
  "movies": [
    {
      "id": 1,
      "title": "Movie Title",
      "appeal_score": 8.2
    }
  ],
  "totalUniqueVoters": 20
}
```

### Results Summary

Get summary statistics for the poll results.

**Endpoint:** `GET /api/results-summary`

**Response:** Returns HTML with summary cards showing total movies, votes, and unique voters.

### Results List

Get detailed results list with appeal scores.

**Endpoint:** `GET /api/results-list`

**Response:** Returns HTML with ranked movie list including appeal scores and vote counts.

## Error Codes

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

### Error Types

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `DATABASE_ERROR` - Database operation failed
- `TMDB_ERROR` - TMDB API error
- `INTERNAL_ERROR` - Internal server error

## CORS

The API supports CORS for the following origins:

- `https://moviepoll.mewling-goat-tavern.online`
- `http://localhost:3000`
- `http://localhost:8787`

## Examples

### cURL Examples

#### Get Movies

```bash
curl "https://mewling-goat-backend.tavern-b8d.workers.dev/api/movies"
```

#### Search Movies (cURL)

```bash
curl "https://mewling-goat-backend.tavern-b8d.workers.dev/api/search?query=The%20Thing&year=1982"
```

#### Submit Vote (cURL)

```bash
curl -X POST "https://mewling-goat-backend.tavern-b8d.workers.dev/api/vote" \
  -H "Content-Type: application/json" \
  -d '{
    "movie_id": 123,
    "user_name": "JohnDoe",
    "vibe": 5,
    "seen": true
  }'
```

#### Submit Batch Votes (cURL)

```bash
curl -X POST "https://mewling-goat-backend.tavern-b8d.workers.dev/api/batch-vote" \
  -H "Content-Type: application/json" \
  -d '{
    "votes": [
      {
        "movie_id": 123,
        "user_name": "JohnDoe",
        "vibe": 5,
        "seen": true
      }
    ]
  }'
```

#### Start Poll (cURL)

```bash
curl -X POST "https://mewling-goat-backend.tavern-b8d.workers.dev/api/start-poll" \
  -d "username=JohnDoe"
```

#### Update Appeal Scores (cURL)

```bash
curl "https://mewling-goat-backend.tavern-b8d.workers.dev/api/update-appeal"
```

### JavaScript Examples (cURL)

#### Fetch API (JavaScript)

```javascript
// Get movies
const response = await fetch('https://mewling-goat-backend.tavern-b8d.workers.dev/api/movies');
const data = await response.json();
console.log(data);

// Search movies
const searchResponse = await fetch('https://mewling-goat-backend.tavern-b8d.workers.dev/api/search?query=The%20Thing&year=1982');
const searchData = await searchResponse.json();
console.log(searchData);

// Submit vote
const voteResponse = await fetch('https://mewling-goat-backend.tavern-b8d.workers.dev/api/vote', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    movie_id: 123,
    user_name: 'JohnDoe',
    vibe: 5,
    seen: true
  })
});
const voteData = await voteResponse.json();
console.log(voteData);
```

#### HTMX Integration

```html
<!-- Load movies -->
<div hx-get="/api/movies" hx-target="#movie-carousel" hx-trigger="load">
  Loading movies...
</div>

<!-- Submit vote -->
<button hx-post="/api/vote" 
        hx-vals='{"movie_id": 123, "user_name": "JohnDoe", "vibe": 5, "seen": true}'
        hx-target="#vote-result">
  Submit Vote
</button>

<!-- Start poll -->
<form hx-post="/api/start-poll" hx-target="#main-content">
  <input type="text" name="username" placeholder="Enter your name" required>
  <button type="submit">Start Poll</button>
</form>
```

## Data Models

### Movie Entity

```typescript
interface MovieEntity {
  id: number;
  tmdb_id: number | null;
  title: string;
  year: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  release_date: string | null;
  runtime: number | null;
  adult: boolean;
  original_language: string;
  original_title: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  video: boolean;
  added_at: number;
  updated_at: number;
}
```

### Vote Entity

```typescript
interface VoteEntity {
  id: number;
  movie_id: number;
  user_name: string;
  vibe: number; // 1-6
  seen: boolean;
  created_at: number;
  updated_at: number;
}
```

### Appeal Calculation Entity

```typescript
interface AppealCalculationEntity {
  id: number;
  movie_id: number;
  appeal_score: number;
  total_votes: number;
  unique_voters: number;
  calculated_at: string;
}
```

### TMDB Movie

```typescript
interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  video: boolean;
}
```

### Search Response

```typescript
interface SearchResponse {
  results: Array<{
    id: number;
    title: string;
    release_date: string;
    poster_path: string | null;
    overview: string | null;
    genre_ids: number[];
    [key: string]: any;
  }>;
  total_pages: number;
  total_results: number;
  page: number;
  match_info?: {
    match_type: 'exact' | 'flexible' | 'fallback' | 'none';
    similarity_score: number;
    search_title: string;
    search_year: number;
  };
}
```

## Features

### HTMX Support

The API provides dual-mode responses:

- **JSON**: Standard API responses for programmatic access
- **HTML**: HTMX-compatible responses for dynamic web interfaces

### Sophisticated Movie Search

The search functionality includes:

- Multiple search strategies (exact, normalized, alternative terms)
- Year-based filtering and matching
- Support for international titles (Japanese, etc.)
- Fuzzy matching algorithms
- Confidence scoring

### Appeal Score Calculation

The system calculates appeal scores based on:

- Vote values (1-6 scale)
- User engagement (seen vs. not seen)
- Visibility ratios
- Unique voter counts

## Testing

### Test Endpoints

The API includes comprehensive endpoints for development and debugging:

- `GET /api/movies` - Test database connectivity and movie retrieval
- `GET /api/search?query=test` - Test TMDB API integration
- `GET /api/results-summary` - Test results calculation
- `GET /api/results-list` - Test detailed results display

### Error Handling

All endpoints include comprehensive error handling:

- Input validation with detailed error messages
- Database error handling with graceful fallbacks
- TMDB API error handling with retry logic
- Proper HTTP status codes and error responses

## Support

For API support or questions:

1. Check endpoint responses for error messages and status codes
2. Verify input parameters and data types
3. Review CORS configuration for cross-origin requests
4. Monitor Cloudflare Workers logs for detailed error information
5. Test with the provided cURL examples and JavaScript snippets
