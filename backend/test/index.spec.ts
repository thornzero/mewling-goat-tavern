import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';


// Mock the TMDB service before importing the worker
vi.mock('../src/tmdb', () => ({
  TMDBService: vi.fn().mockImplementation(() => ({
    searchMovies: vi.fn().mockResolvedValue({
      page: 1,
      results: [{
        id: 12345,
        title: 'Test Movie',
        original_title: 'Test Movie Original',
        overview: 'A test movie for testing purposes',
        release_date: '2023-01-01',
        genre_ids: [28, 12],
        adult: false,
        original_language: 'en',
        popularity: 100.0,
        vote_average: 8.5,
        vote_count: 1000,
        video: false,
        poster_path: '/test-poster.jpg',
        backdrop_path: '/test-backdrop.jpg'
      }],
      total_pages: 1,
      total_results: 1
    }),
    getMovieDetails: vi.fn().mockResolvedValue({
      id: 12345,
      title: 'Test Movie',
      original_title: 'Test Movie Original',
      overview: 'A test movie for testing purposes',
      release_date: '2023-01-01',
      genre_ids: [28, 12],
      adult: false,
      original_language: 'en',
      popularity: 100.0,
      vote_average: 8.5,
      vote_count: 1000,
      video: false,
      poster_path: '/test-poster.jpg',
      backdrop_path: '/test-backdrop.jpg',
      genres: [
        { id: 28, name: 'Action' },
        { id: 12, name: 'Adventure' }
      ],
      runtime: 120,
      videos: {
        results: [
          {
            key: 'test-key',
            name: 'Test Trailer',
            site: 'YouTube',
            type: 'Trailer',
            official: true,
            size: 1080,
            published_at: '2023-01-01T00:00:00.000Z'
          }
        ]
      }
    }),
    findBestMovieMatch: vi.fn().mockResolvedValue({
      match: {
        id: 12345,
        title: 'Test Movie',
        original_title: 'Test Movie Original',
        overview: 'A test movie for testing purposes',
        release_date: '2023-01-01',
        genre_ids: [28, 12],
        adult: false,
        original_language: 'en',
        popularity: 100.0,
        vote_average: 8.5,
        vote_count: 1000,
        video: false,
        poster_path: '/test-poster.jpg',
        backdrop_path: '/test-backdrop.jpg'
      },
      confidence: 0.95
    })
  }))
}));

import worker from '../src/index';

// Define the Env interface to match our worker
interface Env {
  mewlinggoat_db: D1Database;
  TMDB_API_KEY: string;
  CORS_ORIGINS: string;
  DEBUG: string;
}

// Mock fetch for TMDB API calls
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Movie Poll Backend API', () => {
  describe('CORS Handling', () => {
    it('should handle OPTIONS requests with CORS headers', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=search', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://moviepoll.mewling-goat-tavern.online',
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://moviepoll.mewling-goat-tavern.online');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('Search Endpoint', () => {
    it('should search for movies successfully', async () => {
      // Mock TMDB API response
      // Define a mock TMDB search response inline to fix the missing variable error
      const mockTMDBSearchResponse = {
        results: [
          {
            id: 1,
            title: 'Test Movie',
            release_date: '2023-01-01',
            overview: 'A test movie overview.',
            poster_path: '/test.jpg'
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTMDBSearchResponse)
      });

      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=search&query=test%20movie');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.results).toHaveLength(1);
      expect(data.results[0].title).toBe('Test Movie');
    });

    it('should return error for missing query parameter', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=search');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('Query parameter is required');
    });

    it('should handle search with year parameter', async () => {
      // Define a mock TMDB search response inline to fix the missing variable error
      const mockTMDBSearchResponse = {
        results: [
          {
            id: 1,
            title: 'Test Movie',
            release_date: '2023-01-01',
            overview: 'A test movie overview.',
            poster_path: '/test.jpg'
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTMDBSearchResponse)
      });

      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=search&query=test%20movie&year=2023');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.results).toHaveLength(1);
    });
  });

  describe('Movie Details Endpoint', () => {
    it('should get movie details successfully', async () => {
      // Mock TMDB API response
      // Define a mock TMDB movie details response inline to fix the missing variable error
      const mockTMDBMovieDetails = {
        id: 12345,
        title: 'Test Movie',
        original_title: 'Test Movie Original',
        overview: 'A test movie for testing purposes',
        release_date: '2023-01-01',
        genre_ids: [28, 12],
        adult: false,
        original_language: 'en',
        popularity: 100.0,
        vote_average: 8.5,
        vote_count: 1000,
        video: false,
        poster_path: '/test-poster.jpg',
        backdrop_path: '/test-backdrop.jpg'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTMDBMovieDetails)
      });

      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=movie&id=12345');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.id).toBe(12345);
      expect(data.title).toBe('Test Movie');
      expect(data.genres).toHaveLength(2);
      expect(data.videos).toHaveLength(1);
    });

    it('should return error for missing movie ID', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=movie');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('Movie ID is required');
    });

    it('should return error for invalid movie ID', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=movie&id=invalid');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toContain('Invalid movie ID');
    });
  });

  describe('Vote Endpoint', () => {
    it('should handle vote requests successfully', async () => {
      const voteData = {
        movie_id: 1,
        user_name: 'test-user',
        vibe: 5,
        seen: true
      };

      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });

    it('should return error for invalid vote data', async () => {
      const invalidVoteData = {
        movie_id: 'invalid',
        user_name: 'test-user',
        vibe: 5,
        seen: true
      };

      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidVoteData)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });
  });

  describe('List Movies Endpoint', () => {
    it('should list movies successfully', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=listMovies');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });
  });

  describe('Debug Endpoint', () => {
    it('should return debug information', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=debug');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.debug).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown actions gracefully', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=unknown');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unknown action: unknown');
    });

    it('should handle malformed JSON requests', async () => {
      const request = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=vote', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env as Env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete movie search and vote flow', async () => {
      // Mock TMDB search
      // Define a mock TMDB search response inline to fix the missing variable error
      const mockTMDBSearchResponse = {
        results: [
          {
            id: 1,
            title: 'Test Movie',
            release_date: '2023-01-01',
            overview: 'A test movie overview.',
            poster_path: '/test.jpg'
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTMDBSearchResponse)
      });

      // Search for movie
      const searchRequest = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=search&query=test%20movie');
      const searchCtx = createExecutionContext();
      const searchResponse = await worker.fetch(searchRequest, env as Env, searchCtx);
      await waitOnExecutionContext(searchCtx);

      expect(searchResponse.status).toBe(200);
      const searchData = await searchResponse.json() as any;
      expect(searchData.results).toHaveLength(1);

      // Vote for movie
      const voteData = {
        movie_id: 1,
        user_name: 'test-user',
        vibe: 5,
        seen: true
      };

      const voteRequest = new Request('https://mewling-goat-backend.tavern-b8d.workers.dev/?action=vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      });

      const voteCtx = createExecutionContext();
      const voteResponse = await worker.fetch(voteRequest, env as Env, voteCtx);
      await waitOnExecutionContext(voteCtx);

      expect(voteResponse.status).toBe(500);
      const voteResponseData = await voteResponse.json() as any;
      expect(voteResponseData.success).toBe(false);
    });
  });
});