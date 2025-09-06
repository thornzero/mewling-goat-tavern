/* 
Adult: boolean;
backdrop_path: string;
genre_ids: number[];
id: number;
original_language: string;
original_title: string;
overview: string;
popularity: number;
poster_path: string;
release_date: string;
title: string;
video: boolean;
vote_average: number;
vote_count: number; 

*/

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  year  INTEGER,
  added_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id   INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  vibe       INTEGER NOT NULL, 
  seen       BOOLEAN NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_votes_movie ON votes(movie_id);
