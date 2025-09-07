/**
 * Movie Poll Backend - Cloudflare D1 + TMDB API
 * Handles movie voting, appeal calculations, and TMDB integration
 */

import { 
  ApiResponse, 
  DebugResponse, 
  MovieListResponse, 
  SearchRequest, 
  SearchResponse,
  MovieDetailsRequest,
  MovieDetailsResponse,
  VoteRequest,
  VoteResponse,
  BatchVoteRequest,
  BatchVoteResponse,
  AppealResponse,
  AddMovieRequest,
  AddMovieResponse,
  UpdateMovieRequest,
  UpdateMovieResponse,
  DeleteMovieRequest,
  DeleteMovieResponse,
  ListMoviesResponse,
  TMDBMovie,
  TMDBMovieDetails,
  TMDBSearchResponse,
  ApiError,
  ValidationError,
  NotFoundError,
  DatabaseError
} from './types';
import { findBestMovieMatch } from './matching';

// ============================================================================
// Environment Configuration
// ============================================================================

interface Env {
  mewlinggoat_db: D1Database;
  TMDB_API_KEY: string;
  CORS_ORIGINS: string;
  DEBUG: string;
}

// ============================================================================
// CORS Helper
// ============================================================================

function handleCors(request: Request, env: Env): Response | null {
  const origin = request.headers.get('Origin');
  const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
  
  if (origin && allowedOrigins.includes(origin)) {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  return null;
}

// ============================================================================
// Error Handling
// ============================================================================

function handleError(error: any, request?: Request, env?: Env): Response {
  console.error('API Error:', error);
  
  let response: Response;
  
  if (error instanceof ApiError) {
    response = new Response(JSON.stringify({
      success: false,
      error: error.message,
      code: error.code
    }), {
      status: error.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    response = new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Add CORS headers to error response
  if (request && env) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  return response;
}

// ============================================================================
// API Endpoints
// ============================================================================

async function handleDebug(env: Env): Promise<Response> {
  const response: DebugResponse = {
    debug: env.DEBUG === 'true',
    timestamp: Date.now(),
    version: '1.0.0'
  };
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleListMovies(env: Env): Promise<Response> {
  try {
    const result = await env.mewlinggoat_db
      .prepare('SELECT title FROM movies ORDER BY title')
      .all();
    
    const movies = result.results.map((row: any) => row.title);
    
    const response: MovieListResponse = { movies };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new DatabaseError('Failed to fetch movie list', error);
  }
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const year = url.searchParams.get('year');
    
    if (!query) {
      throw new ValidationError('Query parameter is required');
    }
    
    // Try multiple search strategies
    const searchQueries = [
      query, // Original query
      query.replace(/\s+/g, ' ').trim(), // Normalized spacing
      query.toLowerCase(), // Lowercase
      query.replace(/[^\w\s]/g, ''), // Remove special characters
    ];
    
    // If year is provided, try with year variations
    if (year && !isNaN(parseInt(year))) {
      searchQueries.push(`${query} ${year}`);
      searchQueries.push(`${query} (${year})`);
    }
    
    // Try alternative search terms for common movie titles
    const alternativeTerms: { [key: string]: string[] } = {
      'house': ['hausu', 'ハウス'],
      'spirited away': ['千と千尋の神隠し', 'sen to chihiro'],
      'princess mononoke': ['もののけ姫', 'mononoke hime'],
      'my neighbor totoro': ['となりのトトロ', 'tonari no totoro'],
      'grave of the fireflies': ['火垂るの墓', 'hotaru no haka'],
      'kiki\'s delivery service': ['魔女の宅急便', 'majo no takkyubin'],
      'castle in the sky': ['天空の城ラピュタ', 'tenkuu no shiro rapyuta'],
      'howl\'s moving castle': ['ハウルの動く城', 'hauru no ugoku shiro'],
      'the wind rises': ['風立ちぬ', 'kaze tachinu'],
      'ponyo': ['崖の上のポニョ', 'gake no ue no ponyo'],
      'arrietty': ['借りぐらしのアリエッティ', 'karigurashi no arietti'],
      'the tale of princess kaguya': ['かぐや姫の物語', 'kaguyahime no monogatari'],
      'when marnie was there': ['思い出のマーニー', 'omoide no marnie'],
      'the red turtle': ['レッドタートル ある島の物語', 'reddo taatoru aru shima no monogatari'],
      'mirai': ['未来のミライ', 'mirai no mirai'],
      'weathering with you': ['天気の子', 'tenki no ko'],
      'your name': ['君の名は', 'kimi no na wa'],
      'a silent voice': ['聲の形', 'koe no katachi'],
      'demon slayer': ['鬼滅の刃', 'kimetsu no yaiba'],
      'attack on titan': ['進撃の巨人', 'shingeki no kyojin'],
      'one piece': ['ワンピース', 'wanpiisu'],
      'naruto': ['ナルト', 'naruto'],
      'dragon ball': ['ドラゴンボール', 'doragon booru'],
      'pokemon': ['ポケモン', 'pokemon'],
      'studio ghibli': ['スタジオジブリ', 'sutajio jiburi'],
      'ghibli': ['ジブリ', 'jiburi']
    };
    
    // Add alternative terms for the query
    const lowerQuery = query.toLowerCase();
    if (alternativeTerms[lowerQuery]) {
      searchQueries.push(...alternativeTerms[lowerQuery]);
    }
    
    // Also try partial matches
    for (const [key, alternatives] of Object.entries(alternativeTerms)) {
      if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
        searchQueries.push(...alternatives);
      }
    }
    
    let allResults: any[] = [];
    let totalResults = 0;
    
    // Try each search query and collect all results
    console.log('Search queries:', searchQueries);
    for (const searchQuery of searchQueries) {
      if (searchQuery.trim() === '') continue;
      
      try {
        console.log(`Trying search query: ${searchQuery}`);
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=1`
        );
        
        if (tmdbResponse.ok) {
          const data: TMDBSearchResponse = await tmdbResponse.json();
          console.log(`Query "${searchQuery}" returned ${data.results?.length || 0} results`);
          if (data.results && data.results.length > 0) {
            // Add results that aren't already in our collection
            for (const result of data.results) {
              if (!allResults.find(r => r.id === result.id)) {
                allResults.push(result);
                console.log(`Added result: ${result.title} (${result.original_title}) - ${result.release_date}`);
              }
            }
            totalResults = Math.max(totalResults, data.total_results);
          }
        }
      } catch (error) {
        console.error(`Search failed for query: ${searchQuery}`, error);
        // Continue with next query
      }
    }
    
    // Create combined results
    const tmdbData: TMDBSearchResponse = {
      results: allResults,
      total_pages: 1,
      total_results: totalResults,
      page: 1
    };
    
    // If year is provided, use sophisticated matching algorithm
    if (year && !isNaN(parseInt(year))) {
      const searchYear = parseInt(year);
      const bestMatch = findBestMovieMatch(query, searchYear, tmdbData.results);
      
      if (bestMatch && bestMatch.matchType !== 'none') {
        // Return only the best match
        const response: SearchResponse = {
          results: [{
            id: bestMatch.match.id,
            title: bestMatch.match.title,
            release_date: bestMatch.match.release_date,
            poster_path: bestMatch.match.poster_path,
            overview: bestMatch.match.overview,
            genre_ids: bestMatch.match.genre_ids,
            adult: bestMatch.match.adult,
            original_language: bestMatch.match.original_language,
            original_title: bestMatch.match.original_title,
            popularity: bestMatch.match.popularity,
            vote_average: bestMatch.match.vote_average,
            vote_count: bestMatch.match.vote_count,
            video: bestMatch.match.video
          }],
          total_pages: 1,
          total_results: 1,
          page: 1,
          match_info: {
            match_type: bestMatch.matchType,
            similarity_score: bestMatch.score,
            search_title: query,
            search_year: searchYear
          }
        };
        
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // No good match found, return empty results
        const response: SearchResponse = {
          results: [],
          total_pages: 0,
          total_results: 0,
          page: 1,
          match_info: {
            match_type: 'none',
            similarity_score: Infinity,
            search_title: query,
            search_year: searchYear
          }
        };
        
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // No year provided, return all results (original behavior)
      const response: SearchResponse = {
        results: tmdbData.results.map((movie: TMDBMovie) => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          overview: movie.overview,
          genre_ids: movie.genre_ids,
          adult: movie.adult,
          original_language: movie.original_language,
          original_title: movie.original_title,
          popularity: movie.popularity,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          video: movie.video
        })),
        total_pages: tmdbData.total_pages,
        total_results: tmdbData.total_results,
        page: tmdbData.page
      };
      
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ApiError('Search failed', 500, 'SEARCH_ERROR');
  }
}

async function handleMovieDetails(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      throw new ValidationError('Movie ID is required');
    }
    
    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      throw new ValidationError('Invalid movie ID');
    }
    
    // Get movie details from TMDB
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${env.TMDB_API_KEY}&append_to_response=videos`
    );
    
    if (!tmdbResponse.ok) {
      if (tmdbResponse.status === 404) {
        throw new NotFoundError('Movie', movieId);
      }
      throw new ApiError('TMDB API request failed', tmdbResponse.status);
    }
    
    const tmdbData: TMDBMovieDetails = await tmdbResponse.json();
    
    const response: MovieDetailsResponse = {
      id: tmdbData.id,
      title: tmdbData.title,
      overview: tmdbData.overview,
      release_date: tmdbData.release_date,
      genres: tmdbData.genres,
      poster_path: tmdbData.poster_path,
      backdrop_path: tmdbData.backdrop_path,
      runtime: tmdbData.runtime,
      vote_average: tmdbData.vote_average,
      vote_count: tmdbData.vote_count,
      videos: tmdbData.videos.results.map(video => ({
        key: video.key,
        name: video.name,
        site: video.site,
        type: video.type,
        official: video.official,
        size: video.size,
        published_at: video.published_at
      }))
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new ApiError('Failed to fetch movie details', 500, 'MOVIE_DETAILS_ERROR');
  }
}

async function handleVote(request: Request, env: Env): Promise<Response> {
  try {
    const body: VoteRequest = await request.json();
    
    // Validate input
    if (!body.movie_id || !body.user_name || !body.vibe || typeof body.seen !== 'boolean') {
      throw new ValidationError('Missing required fields: movie_id, user_name, vibe, seen');
    }
    
    if (body.vibe < 1 || body.vibe > 6) {
      throw new ValidationError('Vibe must be between 1 and 6');
    }
    
    // Check if movie exists
    const movieResult = await env.mewlinggoat_db
      .prepare('SELECT id FROM movies WHERE id = ?')
      .bind(body.movie_id)
      .first();
    
    if (!movieResult) {
      throw new NotFoundError('Movie', body.movie_id);
    }
    
    // Insert or update vote
    const result = await env.mewlinggoat_db
      .prepare(`
        INSERT INTO votes (movie_id, user_name, vibe, seen, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(movie_id, user_name) 
        DO UPDATE SET 
          vibe = excluded.vibe,
          seen = excluded.seen,
          updated_at = excluded.updated_at
      `)
      .bind(
        body.movie_id,
        body.user_name,
        body.vibe,
        body.seen ? 1 : 0,
        Date.now(),
        Date.now()
      )
      .run();
    
    const response: VoteResponse = {
      success: true,
      message: 'Vote submitted successfully',
      vote_id: result.meta.last_row_id
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new ApiError('Failed to submit vote', 500, 'VOTE_ERROR');
  }
}

async function handleBatchVote(request: Request, env: Env): Promise<Response> {
  try {
    const body: BatchVoteRequest = await request.json();
    
    if (!body.votes || !Array.isArray(body.votes)) {
      throw new ValidationError('Votes array is required');
    }
    
    let submittedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    // Process votes in batch
    for (const vote of body.votes) {
      try {
        // Validate vote
        if (!vote.movie_id || !vote.user_name || !vote.vibe || typeof vote.seen !== 'boolean') {
          errors.push(`Invalid vote data: ${JSON.stringify(vote)}`);
          failedCount++;
          continue;
        }
        
        if (vote.vibe < 1 || vote.vibe > 6) {
          errors.push(`Invalid vibe value ${vote.vibe} for movie ${vote.movie_id}`);
          failedCount++;
          continue;
        }
        
        // Insert or update vote
        await env.mewlinggoat_db
          .prepare(`
            INSERT INTO votes (movie_id, user_name, vibe, seen, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(movie_id, user_name) 
            DO UPDATE SET 
              vibe = excluded.vibe,
              seen = excluded.seen,
              updated_at = excluded.updated_at
          `)
          .bind(
            vote.movie_id,
            vote.user_name,
            vote.vibe,
            vote.seen ? 1 : 0,
            Date.now(),
            Date.now()
          )
          .run();
        
          submittedCount++;
      } catch (error) {
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        errors.push(`Failed to process vote for movie ${vote.movie_id}: ${errorMessage}`);
        failedCount++;
      }
    }
    const response: BatchVoteResponse = {
      success: submittedCount > 0,
      submitted_count: submittedCount,
      failed_count: failedCount,
      errors
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ApiError('Failed to process batch votes', 500, 'BATCH_VOTE_ERROR');
  }
}

async function handleUpdateAppeal(env: Env): Promise<Response> {
  try {
    // Get all movies with votes
    const moviesResult = await env.mewlinggoat_db
      .prepare(`
        SELECT m.id, m.title, m.year
        FROM movies m
        WHERE EXISTS (SELECT 1 FROM votes v WHERE v.movie_id = m.id)
      `)
      .all();
    
    const movies = moviesResult.results as Array<{ id: number; title: string; year: number }>;
    const totalUniqueVoters = new Set<string>();
    const movieAppeals: Record<string, any> = {};
    
    for (const movie of movies) {
      // Get votes for this movie
      const votesResult = await env.mewlinggoat_db
        .prepare(`
          SELECT user_name, vibe, seen
          FROM votes
          WHERE movie_id = ?
        `)
        .bind(movie.id)
        .all();
      
      const votes = votesResult.results as Array<{ user_name: string; vibe: number; seen: number }>;
      
      // Calculate appeal
      const seenCount = votes.filter(v => v.seen === 1).length;
      const totalVoters = votes.length;
      const avgVibe = votes.reduce((sum, v) => sum + v.vibe, 0) / totalVoters;
      
      // Add voters to unique set
      votes.forEach(v => totalUniqueVoters.add(v.user_name));
      
      // Calculate visibility ratio and modifier
      const visibilityRatio = seenCount / totalVoters;
      const visibilityModifier = Math.max(0.1, visibilityRatio);
      const originalAppeal = avgVibe * totalVoters;
      const finalAppeal = originalAppeal * visibilityModifier;
      
      // Store appeal calculation
      await env.mewlinggoat_db
        .prepare(`
          INSERT INTO appeal_calculations 
          (movie_id, original_appeal, visibility_ratio, visibility_modifier, final_appeal, seen_count, total_voters, total_unique_voters, calculated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(movie_id) 
          DO UPDATE SET 
            original_appeal = excluded.original_appeal,
            visibility_ratio = excluded.visibility_ratio,
            visibility_modifier = excluded.visibility_modifier,
            final_appeal = excluded.final_appeal,
            seen_count = excluded.seen_count,
            total_voters = excluded.total_voters,
            total_unique_voters = excluded.total_unique_voters,
            calculated_at = excluded.calculated_at
        `)
        .bind(
          movie.id,
          originalAppeal,
          visibilityRatio,
          visibilityModifier,
          finalAppeal,
          seenCount,
          totalVoters,
          totalUniqueVoters.size,
          Date.now()
        )
        .run();
      
      // Store in response
      movieAppeals[movie.title] = {
        originalAppeal,
        visibilityRatio,
        visibilityModifier,
        finalAppeal,
        seenCount,
        totalVoters,
        totalUniqueVoters: totalUniqueVoters.size
      };
    }
    
    const response: AppealResponse = {
      updated: movies.length,
      total: movies.length,
      movies: movieAppeals,
      totalUniqueVoters: totalUniqueVoters.size
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new DatabaseError('Failed to update appeal values', error);
  }
}

// ============================================================================
// Movie Management Handlers
// ============================================================================

async function handleAddMovie(request: Request, env: Env): Promise<Response> {
  try {
    const body: AddMovieRequest = await request.json();
    
    // Validate input
    if (!body.title || body.year === undefined || body.year === null) {
      throw new ValidationError('Title and year are required');
    }
    
    const useMatching = body.use_matching !== false; // Default to true
    
    let tmdbMovie: TMDBMovie;
    let matchInfo: any = null;
    
    if (useMatching) {
      // Use sophisticated matching algorithm
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(body.title)}&page=1`
      );
      
      if (!searchResponse.ok) {
        throw new ApiError('TMDB API request failed', searchResponse.status);
      }
      
      const searchData: TMDBSearchResponse = await searchResponse.json();
      const bestMatch = findBestMovieMatch(body.title, body.year, searchData.results);
      
      if (!bestMatch || bestMatch.matchType === 'none') {
        throw new ApiError(`No good match found for "${body.title}" (${body.year})`, 404, 'NO_MATCH');
      }
      
      tmdbMovie = bestMatch.match;
      matchInfo = {
        match_type: bestMatch.matchType,
        similarity_score: bestMatch.score,
        search_title: body.title,
        search_year: body.year
      };
    } else {
      // Use first result from TMDB search (simple search, no matching)
      const searchResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(body.title)}&page=1`
      );
      
      if (!searchResponse.ok) {
        throw new ApiError('TMDB API request failed', searchResponse.status);
      }
      
      const searchData: TMDBSearchResponse = await searchResponse.json();
      
      if (!searchData.results || searchData.results.length === 0) {
        throw new ApiError(`No results found for "${body.title}"`, 404, 'NO_RESULTS');
      }
      
      tmdbMovie = searchData.results[0];
    }
    
    // Get detailed movie information
    const detailsResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${env.TMDB_API_KEY}&append_to_response=videos`
    );
    
    if (!detailsResponse.ok) {
      throw new ApiError('TMDB API request failed', detailsResponse.status);
    }
    
    const details: TMDBMovieDetails = await detailsResponse.json();
    
    // Check if movie already exists
    const existingMovie = await env.mewlinggoat_db
      .prepare('SELECT id FROM movies WHERE tmdb_id = ?')
      .bind(tmdbMovie.id)
      .first();
    
    if (existingMovie) {
      throw new ApiError(`Movie already exists in database`, 409, 'MOVIE_EXISTS');
    }
    
    // Insert movie into database
    const insertResult = await env.mewlinggoat_db
      .prepare(`
        INSERT INTO movies (
          tmdb_id, title, year, poster_path, backdrop_path, 
          overview, release_date, runtime, adult, original_language, 
          original_title, popularity, vote_average, vote_count, video
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        details.id as number,
        details.title,
        details.release_date ? parseInt(details.release_date.split('-')[0]) : null,
        details.poster_path,
        details.backdrop_path,
        details.overview,
        details.release_date,
        details.runtime,
        details.adult ? 1 : 0,
        (details.original_language || 'en') as string,
        (details.original_title || details.title) as string,
        details.popularity || 0,
        details.vote_average || 0,
        details.vote_count || 0,
        details.video ? 1 : 0
      )
      .run();
    
    // Get the inserted movie
    const insertedMovie = await env.mewlinggoat_db
      .prepare('SELECT * FROM movies WHERE id = ?')
      .bind(insertResult.meta.last_row_id)
      .first();
    
    if (!insertedMovie) {
      throw new ApiError('Failed to retrieve inserted movie', 500, 'INSERT_RETRIEVAL_ERROR');
    }
    
    const response: AddMovieResponse = {
      success: true,
      message: `Movie "${details.title}" added successfully`,
      movie: {
        id: insertedMovie.id as number,
        tmdb_id: insertedMovie.tmdb_id as number,
        title: insertedMovie.title as string,
        year: insertedMovie.year as number,
        poster_path: insertedMovie.poster_path as string | null,
        overview: insertedMovie.overview as string | null,
        match_info: matchInfo
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('AddMovie error:', error);
    if (error instanceof ValidationError || error instanceof ApiError) {
      const response: AddMovieResponse = {
        success: false,
        message: error.message,
        error: error.code
      };
      return new Response(JSON.stringify(response), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const response: AddMovieResponse = {
      success: false,
      message: 'Failed to add movie',
      error: 'ADD_MOVIE_ERROR'
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleUpdateMovie(request: Request, env: Env): Promise<Response> {
  try {
    const body: UpdateMovieRequest = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Movie ID is required');
    }
    
    // Get existing movie
    const existingMovie = await env.mewlinggoat_db
      .prepare('SELECT * FROM movies WHERE id = ?')
      .bind(body.id)
      .first();
    
    if (!existingMovie) {
      throw new NotFoundError('Movie', body.id);
    }
    
    // If title or year changed, search for new match
    if (body.title || body.year) {
      const newTitle = (body.title || existingMovie.title) as string;
      const newYear = (body.year || existingMovie.year) as number;
      const useMatching = body.use_matching !== false;
      
      let tmdbMovie: TMDBMovie;
      
      if (useMatching) {
        const searchResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(newTitle)}&page=1`
        );
        
        if (!searchResponse.ok) {
          throw new ApiError('TMDB API request failed', searchResponse.status);
        }
        
        const searchData: TMDBSearchResponse = await searchResponse.json();
        const bestMatch = findBestMovieMatch(newTitle, newYear, searchData.results);
        
        if (!bestMatch || bestMatch.matchType === 'none') {
          throw new ApiError(`No good match found for "${newTitle}" (${newYear})`, 404, 'NO_MATCH');
        }
        
        tmdbMovie = bestMatch.match;
      } else {
        const searchResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(newTitle)}&page=1`
        );
        
        if (!searchResponse.ok) {
          throw new ApiError('TMDB API request failed', searchResponse.status);
        }
        
        const searchData: TMDBSearchResponse = await searchResponse.json();
        
        if (!searchData.results || searchData.results.length === 0) {
          throw new ApiError(`No results found for "${newTitle}"`, 404, 'NO_RESULTS');
        }
        
        tmdbMovie = searchData.results[0];
      }
      
      // Get detailed movie information
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${env.TMDB_API_KEY}&append_to_response=videos`
      );
      
      if (!detailsResponse.ok) {
        throw new ApiError('TMDB API request failed', detailsResponse.status);
      }
      
      const details: TMDBMovieDetails = await detailsResponse.json();
      
      // Update movie in database
      await env.mewlinggoat_db
        .prepare(`
          UPDATE movies SET
            tmdb_id = ?, title = ?, year = ?, poster_path = ?, backdrop_path = ?,
            overview = ?, release_date = ?, runtime = ?, adult = ?, original_language = ?,
            original_title = ?, popularity = ?, vote_average = ?, vote_count = ?, video = ?,
            updated_at = strftime('%s','now')
          WHERE id = ?
        `)
        .bind(
          details.id as number,
          details.title,
          details.release_date ? parseInt(details.release_date.split('-')[0]) : null,
          details.poster_path,
          details.backdrop_path,
          details.overview,
          details.release_date,
          details.runtime,
          details.adult ? 1 : 0,
          (details.original_language || 'en') as string,
          (details.original_title || details.title) as string,
          details.popularity || 0,
          details.vote_average || 0,
          details.vote_count || 0,
          details.video ? 1 : 0,
          body.id
        )
        .run();
    }
    
    // Get updated movie
    const updatedMovie = await env.mewlinggoat_db
      .prepare('SELECT * FROM movies WHERE id = ?')
      .bind(body.id)
      .first();
    
    const response: UpdateMovieResponse = {
      success: true,
      message: `Movie updated successfully`,
      movie: updatedMovie
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('UpdateMovie error:', error);
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof NotFoundError) {
      const response: UpdateMovieResponse = {
        success: false,
        message: error.message,
        error: error.code
      };
      return new Response(JSON.stringify(response), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const response: UpdateMovieResponse = {
      success: false,
      message: 'Failed to update movie',
      error: 'UPDATE_MOVIE_ERROR'
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeleteMovie(request: Request, env: Env): Promise<Response> {
  try {
    const body: DeleteMovieRequest = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Movie ID is required');
    }
    
    // Convert ID to integer to ensure proper type
    const movieId = parseInt(body.id.toString());
    if (isNaN(movieId)) {
      throw new ValidationError('Invalid movie ID format');
    }
    
    // Check if movie exists
    const existingMovie = await env.mewlinggoat_db
      .prepare('SELECT id, title FROM movies WHERE id = ?')
      .bind(movieId)
      .first();
    
    if (!existingMovie) {
      throw new NotFoundError('Movie', movieId);
    }
    
    // Delete movie and related data
    await env.mewlinggoat_db
      .prepare('DELETE FROM votes WHERE movie_id = ?')
      .bind(movieId)
      .run();
    
    await env.mewlinggoat_db
      .prepare('DELETE FROM movies WHERE id = ?')
      .bind(movieId)
      .run();
    
    const response: DeleteMovieResponse = {
      success: true,
      message: `Movie "${existingMovie.title}" deleted successfully`
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DeleteMovie error:', error);
    if (error instanceof ValidationError || error instanceof ApiError || error instanceof NotFoundError) {
      const response: DeleteMovieResponse = {
        success: false,
        message: error.message,
        error: error.code
      };
      return new Response(JSON.stringify(response), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const response: DeleteMovieResponse = {
      success: false,
      message: 'Failed to delete movie',
      error: 'DELETE_MOVIE_ERROR'
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleListMoviesDetailed(env: Env): Promise<Response> {
  try {
    const movies = await env.mewlinggoat_db
      .prepare(`
        SELECT 
          m.*,
          ac.final_appeal as appeal_value,
          ac.seen_count,
          ac.total_unique_voters,
          ac.visibility_ratio
        FROM movies m
        LEFT JOIN appeal_calculations ac ON m.id = ac.movie_id
        ORDER BY m.title
      `)
      .all();
    
    const response: ListMoviesResponse = {
      success: true,
      movies: movies.results,
      total: movies.results.length
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    throw new DatabaseError('Failed to fetch movies', error);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        const corsResponse = handleCors(request, env);
        if (corsResponse) return corsResponse;
      }
      
      // Handle CORS for actual requests
      const corsResponse = handleCors(request, env);
      if (corsResponse && request.method === 'OPTIONS') {
        return corsResponse;
      }
      
      const url = new URL(request.url);
      const action = url.searchParams.get('action');
      
      let response: Response;
      
      switch (action) {
        case 'debug':
          response = await handleDebug(env);
          break;
        case 'listMovies':
          response = await handleListMoviesDetailed(env);
          break;
        case 'search':
          response = await handleSearch(request, env);
          break;
        case 'movie':
          response = await handleMovieDetails(request, env);
          break;
        case 'vote':
          response = await handleVote(request, env);
          break;
        case 'batchVote':
          response = await handleBatchVote(request, env);
          break;
        case 'updateAppeal':
          response = await handleUpdateAppeal(env);
          break;
        case 'addMovie':
          response = await handleAddMovie(request, env);
          break;
        case 'updateMovie':
          response = await handleUpdateMovie(request, env);
          break;
        case 'deleteMovie':
          response = await handleDeleteMovie(request, env);
          break;
        default:
          throw new ApiError(`Unknown action: ${action}`, 400, 'UNKNOWN_ACTION');
      }
      
      // Add CORS headers to response
      const origin = request.headers.get('Origin');
      const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return response;
      
    } catch (error) {
      return handleError(error, request, env);
    }
	},
} satisfies ExportedHandler<Env>;
