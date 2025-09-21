-- Movies table with full TMDB integration
CREATE TABLE IF NOT EXISTS movies(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  runtime INTEGER,
  adult BOOLEAN DEFAULT 0,
  original_language TEXT DEFAULT 'en',
  original_title TEXT,
  popularity REAL DEFAULT 0,
  vote_average REAL DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  video BOOLEAN DEFAULT 0,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Votes table with 6-rank system
CREATE TABLE IF NOT EXISTS votes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  vibe INTEGER NOT NULL CHECK (vibe >= 1 AND vibe <= 6),  -- 1-6 ranking system
  seen BOOLEAN NOT NULL,  -- true/false
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Appeal calculations table
CREATE TABLE IF NOT EXISTS appeals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  appeal_score REAL NOT NULL,
  total_votes INTEGER NOT NULL DEFAULT 0,
  unique_voters INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  visibility_ratio REAL NOT NULL DEFAULT 0,
  calculated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Admin users table for secure access
CREATE TABLE IF NOT EXISTS admin_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  last_login INTEGER
);

-- User name-device mappings for persistent identity
CREATE TABLE IF NOT EXISTS user_devices(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  user_name TEXT NOT NULL,  -- The name used on this device
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  last_seen INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(device_id, user_name)  -- One device can have multiple names
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vote_user_movie ON votes(movie_id, user_name, device_id);
CREATE INDEX IF NOT EXISTS idx_votes_movie_id ON votes(movie_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_name ON votes(user_name);
CREATE INDEX IF NOT EXISTS idx_votes_device_id ON votes(device_id);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_appeals_movie_id ON appeals(movie_id);
CREATE INDEX IF NOT EXISTS idx_appeals_score ON appeals(appeal_score);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_name ON user_devices(user_name);
