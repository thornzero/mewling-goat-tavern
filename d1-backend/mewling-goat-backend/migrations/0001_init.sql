-- Movie Poll Database Schema for Cloudflare D1
-- Supports movie voting, appeal calculations, and TMDB integration

-- Movies table - stores movie information from TMDB
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER UNIQUE, -- TMDB movie ID for API calls
  title TEXT NOT NULL,
  year INTEGER,
  poster_path TEXT,
  backdrop_path TEXT,
  overview TEXT,
  release_date TEXT, -- ISO date string from TMDB
  runtime INTEGER, -- in minutes
  adult BOOLEAN DEFAULT FALSE,
  original_language TEXT DEFAULT 'en',
  original_title TEXT,
  popularity REAL DEFAULT 0,
  vote_average REAL DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  video BOOLEAN DEFAULT FALSE,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Genres table - stores movie genres
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER UNIQUE, -- TMDB genre ID
  name TEXT NOT NULL UNIQUE
);

-- Movie genres junction table - many-to-many relationship
CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);

-- Videos table - stores movie trailers/videos from TMDB
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  tmdb_key TEXT NOT NULL, -- YouTube key or similar
  name TEXT,
  site TEXT, -- YouTube, Vimeo, etc.
  type TEXT, -- Trailer, Teaser, etc.
  size INTEGER,
  official BOOLEAN DEFAULT FALSE,
  published_at TEXT, -- ISO date string
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Votes table - stores user votes for movies
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  vibe INTEGER NOT NULL CHECK (vibe >= 1 AND vibe <= 6), -- 1-6 rating
  seen BOOLEAN NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(movie_id, user_name) -- One vote per user per movie
);

-- Appeal calculations table - stores calculated appeal values
CREATE TABLE IF NOT EXISTS appeal_calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  original_appeal REAL NOT NULL DEFAULT 0,
  visibility_ratio REAL NOT NULL DEFAULT 0,
  visibility_modifier REAL NOT NULL DEFAULT 0,
  final_appeal REAL NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  total_voters INTEGER NOT NULL DEFAULT 0,
  total_unique_voters INTEGER NOT NULL DEFAULT 0,
  calculated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(movie_id) -- One calculation per movie
);

-- Poll sessions table - tracks voting sessions
CREATE TABLE IF NOT EXISTS poll_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  ended_at INTEGER
);

-- Session movies table - links movies to poll sessions
CREATE TABLE IF NOT EXISTS session_movies (
  session_id INTEGER NOT NULL REFERENCES poll_sessions(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  PRIMARY KEY (session_id, movie_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_votes_movie ON votes(movie_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_name);
CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_movie ON videos(movie_id);
CREATE INDEX IF NOT EXISTS idx_appeal_movie ON appeal_calculations(movie_id);
CREATE INDEX IF NOT EXISTS idx_appeal_final ON appeal_calculations(final_appeal DESC);
CREATE INDEX IF NOT EXISTS idx_genres_tmdb ON genres(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movie_genres_movie ON movie_genres(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre ON movie_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_session_movies_session ON session_movies(session_id);
CREATE INDEX IF NOT EXISTS idx_session_movies_movie ON session_movies(movie_id);

-- Views for common queries
CREATE VIEW IF NOT EXISTS movie_stats AS
SELECT 
  m.id,
  m.title,
  m.year,
  m.poster_path,
  m.overview,
  m.runtime,
  COUNT(v.id) as vote_count,
  AVG(v.vibe) as avg_vibe,
  COUNT(CASE WHEN v.seen = 1 THEN 1 END) as seen_count,
  ac.final_appeal,
  ac.visibility_ratio,
  ac.total_unique_voters
FROM movies m
LEFT JOIN votes v ON m.id = v.movie_id
LEFT JOIN appeal_calculations ac ON m.id = ac.movie_id
GROUP BY m.id, m.title, m.year, m.poster_path, m.overview, m.runtime, ac.final_appeal, ac.visibility_ratio, ac.total_unique_voters;

-- View for appeal rankings
CREATE VIEW IF NOT EXISTS appeal_rankings AS
SELECT 
  m.id,
  m.title,
  m.year,
  m.poster_path,
  ac.final_appeal,
  ac.seen_count,
  ac.total_unique_voters,
  ac.visibility_ratio,
  ROW_NUMBER() OVER (ORDER BY ac.final_appeal DESC) as rank
FROM movies m
JOIN appeal_calculations ac ON m.id = ac.movie_id
WHERE ac.final_appeal IS NOT NULL
ORDER BY ac.final_appeal DESC;
