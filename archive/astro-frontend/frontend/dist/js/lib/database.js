"use strict";
/**
 * Database utilities for direct D1 access
 * This provides an alternative to the API proxy for certain operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
class DatabaseService {
    constructor(env) {
        this.db = env.mewlinggoat_db;
    }
    /**
     * Get all movies with detailed information
     */
    async getMovies() {
        try {
            const result = await this.db
                .prepare(`
          SELECT * FROM movies 
          ORDER BY title
        `)
                .all();
            return result.results;
        }
        catch (error) {
            console.error('Database error in getMovies:', error);
            throw new Error('Failed to fetch movies');
        }
    }
    /**
     * Get movies with appeal data
     */
    async getMoviesWithAppeal() {
        try {
            const result = await this.db
                .prepare(`
          SELECT m.*, 
                 COALESCE(a.appeal_value, 0) as appeal_value,
                 COALESCE(a.seen_count, 0) as seen_count,
                 COALESCE(a.total_unique_voters, 0) as total_unique_voters,
                 COALESCE(a.visibility_ratio, 0) as visibility_ratio
          FROM movies m
          LEFT JOIN appeals a ON m.id = a.movie_id
          ORDER BY COALESCE(a.appeal_value, 0) DESC, m.title
        `)
                .all();
            return result.results;
        }
        catch (error) {
            console.error('Database error in getMoviesWithAppeal:', error);
            throw new Error('Failed to fetch movies with appeal data');
        }
    }
    /**
     * Get votes for a specific movie
     */
    async getVotesForMovie(movieId) {
        try {
            const result = await this.db
                .prepare(`
          SELECT * FROM votes 
          WHERE movie_id = ?
          ORDER BY created_at DESC
        `)
                .bind(movieId)
                .all();
            return result.results;
        }
        catch (error) {
            console.error('Database error in getVotesForMovie:', error);
            throw new Error('Failed to fetch votes for movie');
        }
    }
    /**
     * Get all votes
     */
    async getAllVotes() {
        try {
            const result = await this.db
                .prepare(`
          SELECT * FROM votes 
          ORDER BY created_at DESC
        `)
                .all();
            return result.results;
        }
        catch (error) {
            console.error('Database error in getAllVotes:', error);
            throw new Error('Failed to fetch all votes');
        }
    }
    /**
     * Submit a single vote
     */
    async submitVote(movieId, userName, vibe, seen) {
        try {
            // Check if movie exists
            const movieResult = await this.db
                .prepare('SELECT id FROM movies WHERE id = ?')
                .bind(movieId)
                .first();
            if (!movieResult) {
                throw new Error(`Movie with ID ${movieId} not found`);
            }
            // Insert or update vote
            await this.db
                .prepare(`
          INSERT INTO votes (movie_id, user_name, vibe, seen, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(movie_id, user_name) 
          DO UPDATE SET 
            vibe = excluded.vibe,
            seen = excluded.seen,
            updated_at = excluded.updated_at
        `)
                .bind(movieId, userName, vibe, seen ? 1 : 0, Date.now(), Date.now())
                .run();
        }
        catch (error) {
            console.error('Database error in submitVote:', error);
            throw new Error('Failed to submit vote');
        }
    }
    /**
     * Submit multiple votes in a batch
     */
    async submitBatchVotes(votes) {
        try {
            const timestamp = Date.now();
            // Use a transaction for batch operations
            await this.db.batch(votes.map(vote => this.db
                .prepare(`
              INSERT INTO votes (movie_id, user_name, vibe, seen, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(movie_id, user_name) 
              DO UPDATE SET 
                vibe = excluded.vibe,
                seen = excluded.seen,
                updated_at = excluded.updated_at
            `)
                .bind(vote.movie_id, vote.user_name, vote.vibe, vote.seen ? 1 : 0, timestamp, timestamp)));
        }
        catch (error) {
            console.error('Database error in submitBatchVotes:', error);
            throw new Error('Failed to submit batch votes');
        }
    }
    /**
     * Calculate appeal values for all movies
     */
    async calculateAppealValues() {
        try {
            // Get all votes
            const votes = await this.getAllVotes();
            // Group votes by movie
            const votesByMovie = new Map();
            votes.forEach(vote => {
                if (!votesByMovie.has(vote.movie_id)) {
                    votesByMovie.set(vote.movie_id, []);
                }
                votesByMovie.get(vote.movie_id).push(vote);
            });
            // Calculate appeal for each movie
            for (const [movieId, movieVotes] of votesByMovie) {
                const seenVotes = movieVotes.filter(v => v.seen === 1);
                const totalVotes = movieVotes.length;
                const seenCount = seenVotes.length;
                if (totalVotes === 0)
                    continue;
                // Calculate appeal based on vibe scores
                const totalAppeal = movieVotes.reduce((sum, vote) => sum + vote.vibe, 0);
                const averageAppeal = totalAppeal / totalVotes;
                // Calculate visibility ratio (seen vs total)
                const visibilityRatio = seenCount / totalVotes;
                // Apply visibility modifier
                const visibilityModifier = Math.max(0.1, visibilityRatio);
                const finalAppeal = averageAppeal * visibilityModifier;
                // Update or insert appeal data
                await this.db
                    .prepare(`
            INSERT INTO appeals (movie_id, appeal_value, seen_count, total_unique_voters, visibility_ratio, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(movie_id) 
            DO UPDATE SET 
              appeal_value = excluded.appeal_value,
              seen_count = excluded.seen_count,
              total_unique_voters = excluded.total_unique_voters,
              visibility_ratio = excluded.visibility_ratio,
              updated_at = excluded.updated_at
          `)
                    .bind(movieId, finalAppeal, seenCount, totalVotes, visibilityRatio, Date.now(), Date.now())
                    .run();
            }
        }
        catch (error) {
            console.error('Database error in calculateAppealValues:', error);
            throw new Error('Failed to calculate appeal values');
        }
    }
    /**
     * Get appeal data for results page
     */
    async getAppealData() {
        try {
            const movies = await this.getMoviesWithAppeal();
            const allVotes = await this.getAllVotes();
            const uniqueVoters = new Set(allVotes.map(v => v.user_name)).size;
            const appealData = {};
            movies.forEach(movie => {
                appealData[movie.title] = {
                    originalAppeal: movie.appeal_value || 0,
                    visibilityRatio: movie.visibility_ratio || 0,
                    visibilityModifier: Math.max(0.1, movie.visibility_ratio || 0),
                    finalAppeal: movie.appeal_value || 0,
                    seenCount: movie.seen_count || 0,
                    totalVoters: movie.total_unique_voters || 0,
                    totalUniqueVoters: uniqueVoters
                };
            });
            return {
                movies: appealData,
                totalUniqueVoters: uniqueVoters
            };
        }
        catch (error) {
            console.error('Database error in getAppealData:', error);
            throw new Error('Failed to fetch appeal data');
        }
    }
}
exports.DatabaseService = DatabaseService;
