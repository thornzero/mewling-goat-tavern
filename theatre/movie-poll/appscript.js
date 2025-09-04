const scriptProperties = PropertiesService.getScriptProperties();
const TMDB_API_KEY = scriptProperties.getProperty("TMDB_API_KEY");

if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY not configured in script properties');
}

// === CONSTANTS ===
const SHEET_NAMES = {
  MARQUEE: 'Marquee',
  VOTES: 'Votes'
};

const VOTE_COLUMNS = {
  TITLE: 1,    // Column B
  VOTE: 3,      // Column D  
  SEEN: 4       // Column E
};

const CACHE_DURATION = {
  API_RESPONSE: 21600,  // 6 hours
  RATE_LIMIT: 60        // 1 minute
};

const VOTE_RANKS = {
  '⭐': 1,  // Rewatch - highest rank
  '🔥': 2,  // Stoked
  '⏳': 3,  // Later
  '😐': 4,  // Meh
  '💤': 5,  // Skip
  '🚫': 6   // Never - lowest rank
};

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 40,  // TMDB allows 40 requests per 10 seconds
  MAX_REQUESTS_PER_HOUR: 1000,  // Conservative hourly limit
  WINDOW_MINUTE: 60,            // 1 minute window
  WINDOW_HOUR: 3600             // 1 hour window
};

// Prepare common UrlFetch options with Authorization header
  const fetchOpts = {
    method: 'get',
    headers: {
      'accept': 'application/json',
      'Authorization': 'Bearer ' + TMDB_API_KEY
    }
  };

const cache = CacheService.getScriptCache();

// === HELPER FUNCTIONS ===

/**
 * Creates a JSONP response
 * @param {string} callback - JSONP callback function name
 * @param {Object} data - Data to wrap in JSONP
 * @returns {string} JSONP response
 */
function createJsonpResponse(callback, data) {
  return callback + '(' + JSON.stringify(data) + ');';
}

/**
 * Creates an error response
 * @param {string} callback - JSONP callback function name
 * @param {string} message - Error message
 * @returns {string} JSONP error response
 */
function createErrorResponse(callback, message) {
  return createJsonpResponse(callback, { error: message });
}

/**
 * Creates a success response
 * @param {string} callback - JSONP callback function name
 * @param {Object} data - Additional data to include
 * @returns {string} JSONP success response
 */
function createSuccessResponse(callback, data = {}) {
  return createJsonpResponse(callback, { status: 'ok', ...data });
}

/**
 * Gets a sheet by name with error handling
 * @param {string} name - Sheet name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The sheet
 * @throws {Error} If sheet not found
 */
function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet '${name}' not found`);
  }
  return sheet;
}

/**
 * Validates required parameters
 * @param {Object} params - Parameters object
 * @param {string[]} requiredFields - Array of required field names
 * @throws {Error} If any required fields are missing
 */
function validateRequiredParams(params, requiredFields) {
  const missing = requiredFields.filter(field => !params[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Submits a single vote to the sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Votes sheet
 * @param {string} movieTitle - Movie title
 * @param {string} userName - User name
 * @param {string} vote - Vote value
 * @param {string} seen - Seen status
 */
function submitVote(sheet, movieTitle, userName, vote, seen) {
  sheet.appendRow([
    new Date(),
    movieTitle || '',
    userName || '',
    vote || '',
    seen || ''
  ]);
}

/**
 * Submits multiple votes to the sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Votes sheet
 * @param {Array} votes - Array of vote objects
 * @returns {number} Number of votes submitted
 */
function submitBatchVotes(sheet, votes) {
  const rowsToAppend = votes.map(vote => [
    new Date(vote.timestamp || Date.now()),
    vote.movieTitle || '',
    vote.userName || '',
    vote.vote || '',
    vote.seen || ''
  ]);
  
  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
  }
  
  return rowsToAppend.length;
}

// Rate limiting functions
function checkRateLimit() {
  const now = Date.now();
  const minuteKey = 'rate_limit_minute_' + Math.floor(now / (RATE_LIMIT.WINDOW_MINUTE * 1000));
  const hourKey = 'rate_limit_hour_' + Math.floor(now / (RATE_LIMIT.WINDOW_HOUR * 1000));
  
  // Get current counts
  const minuteCount = parseInt(cache.get(minuteKey) || '0');
  const hourCount = parseInt(cache.get(hourKey) || '0');
  
  // Check limits
  if (minuteCount >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    throw new Error('Rate limit exceeded: Too many requests per minute');
  }
  
  if (hourCount >= RATE_LIMIT.MAX_REQUESTS_PER_HOUR) {
    throw new Error('Rate limit exceeded: Too many requests per hour');
  }
  
  // Increment counters
  cache.put(minuteKey, (minuteCount + 1).toString(), RATE_LIMIT.WINDOW_MINUTE);
  cache.put(hourKey, (hourCount + 1).toString(), RATE_LIMIT.WINDOW_HOUR);
  
  return { minuteCount: minuteCount + 1, hourCount: hourCount + 1 };
}

function CachedFetch(url, callback) {
  let jsonText = cache.get(url);
  if (!jsonText) {
    // Check rate limit before making API call
    try {
      checkRateLimit();
      jsonText = UrlFetchApp.fetch(url, fetchOpts).getContentText();
      // cache for 6 hours (max is 21600 seconds)
      cache.put(url, jsonText, CACHE_DURATION.API_RESPONSE);
    } catch (error) {
      // Return rate limit error as JSONP
      return callback + '(' + JSON.stringify({ 
        error: error.message,
        rateLimitExceeded: true 
      }) + ');';
    }
  }
  return callback + '(' + jsonText + ');';
}

function doGet(e) {
  const p = e.parameter;
  const action = p.action || 'vote';
  const cb = p.callback || 'callback';
  
  try {
    let body = handleAction(action, p, cb);
    return ContentService
      .createTextOutput(body)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(createErrorResponse(cb, error.message))
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

/**
 * Handles different actions based on the action parameter
 * @param {string} action - The action to perform
 * @param {Object} params - Request parameters
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleAction(action, params, callback) {
  switch (action) {
    case 'listMovies':
      return handleListMovies(callback);
    case 'search':
      return handleSearch(params, callback);
    case 'movie':
      return handleMovie(params, callback);
    case 'videos':
      return handleVideos(params, callback);
    case 'vote':
      return handleVote(params, callback);
    case 'batchVote':
      return handleBatchVote(params, callback);
    case 'updateAppeal':
      return handleUpdateAppeal(callback);
    default:
      throw new Error('Invalid action');
  }
}

/**
 * Fetches movie titles from the Marquee sheet
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response with movie titles array
 */
function handleListMovies(callback) {
  const sheet = getSheet(SHEET_NAMES.MARQUEE);
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1).getValues();
  const titles = rows.map(r => r[0]).filter(Boolean);
  return createJsonpResponse(callback, titles);
}

/**
 * Handles movie search requests
 * @param {Object} params - Request parameters
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleSearch(params, callback) {
  validateRequiredParams(params, ['query']);
  
  // Build URL with optional year filter
  let url = 'https://api.themoviedb.org/3/search/movie'
    + '?language=en-US'
    + '&query=' + encodeURIComponent(params.query);
  if (params.year) {
    url += '&year=' + encodeURIComponent(params.year);
  }
  return CachedFetch(url, callback);
}

/**
 * Handles movie details requests
 * @param {Object} params - Request parameters
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleMovie(params, callback) {
  validateRequiredParams(params, ['id']);
  
  const url = 'https://api.themoviedb.org/3/movie/' + encodeURIComponent(params.id)
    + '?language=en-US';
  return CachedFetch(url, callback);
}

/**
 * Handles movie videos requests
 * @param {Object} params - Request parameters
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleVideos(params, callback) {
  validateRequiredParams(params, ['id']);
  
  const url = 'https://api.themoviedb.org/3/movie/' + encodeURIComponent(params.id)
    + '/videos?language=en-US';
  return CachedFetch(url, callback);
}

/**
 * Handles single vote submission
 * @param {Object} params - Request parameters
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleVote(params, callback) {
  const sheet = getSheet(SHEET_NAMES.VOTES);
  submitVote(sheet, params.movieTitle, params.userName, params.vote, params.seen);
  return createSuccessResponse(callback);
}

/**
 * Handles batch vote submission
 * @param {Object} params - Request parameters
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleBatchVote(params, callback) {
  validateRequiredParams(params, ['votes']);
  
  try {
    const votes = JSON.parse(params.votes);
    const sheet = getSheet(SHEET_NAMES.VOTES);
    
    const submittedCount = submitBatchVotes(sheet, votes);
    
    // Automatically update appeal values after votes are submitted
    try {
      const appealResult = updateAppealValues();
      return createSuccessResponse(callback, {
        submitted: submittedCount,
        appealUpdated: appealResult.updated,
        appealTotal: appealResult.total
      });
    } catch (appealError) {
      // If appeal update fails, still return success for vote submission
      return createSuccessResponse(callback, {
        submitted: submittedCount,
        appealError: appealError.message
      });
    }
  } catch (error) {
    throw new Error('Invalid votes JSON: ' + error.message);
  }
}

/**
 * Handles appeal values update
 * @param {string} callback - JSONP callback function name
 * @returns {string} JSONP response
 */
function handleUpdateAppeal(callback) {
  const result = updateAppealValues();
  return createSuccessResponse(callback, {
    updated: result.updated,
    total: result.total
  });
}

/**
 * Updates appeal values based on vote ranks
 * @returns {Object} Result with updated and total counts
 */
function updateAppealValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const votesSheet = getSheet(SHEET_NAMES.VOTES);
  const marqueeSheet = getSheet(SHEET_NAMES.MARQUEE);
  
  // Get all votes
  const votesData = votesSheet.getRange(2, 1, votesSheet.getLastRow() - 1, 5).getValues();
  
  // Calculate appeal for each movie
  const movieAppeals = {};
  
  votesData.forEach(row => {
    const movieTitle = row[VOTE_COLUMNS.TITLE]; // Column B - Movie Title
    const vote = row[VOTE_COLUMNS.VOTE];       // Column D - Vote (emoji)
    const seen = row[VOTE_COLUMNS.SEEN];       // Column E - Seen status
    
    if (movieTitle && vote && VOTE_RANKS.hasOwnProperty(vote)) {
      if (!movieAppeals[movieTitle]) {
        movieAppeals[movieTitle] = {
          totalVotes: 0,
          totalAppeal: 0,
          seenCount: 0,
          totalVoters: 0
        };
      }
      
      movieAppeals[movieTitle].totalVotes++;
      movieAppeals[movieTitle].totalAppeal += VOTE_RANKS[vote];
      
      // Track seen status for visibility score
      if (seen === "✅") {
        movieAppeals[movieTitle].seenCount++;
      }
      movieAppeals[movieTitle].totalVoters++;
    }
  });
  
  // Get Marquee sheet data
  const marqueeData = marqueeSheet.getRange(2, 1, marqueeSheet.getLastRow() - 1, 3).getValues();
  let updatedCount = 0;
  
  // Helper function to normalize titles for comparison
  function normalizeTitle(title) {
    if (!title) return '';
    // Remove year in parentheses and trim whitespace
    return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
  }
  
  // Create a lookup map for normalized titles
  const marqueeTitleMap = {};
  marqueeData.forEach((row, index) => {
    const title = row[0]; // Column A - Title
    if (title) {
      const normalizedTitle = normalizeTitle(title);
      marqueeTitleMap[normalizedTitle] = {
        originalTitle: title,
        index: index
      };
    }
  });
  
  // Calculate visibility scores and final appeal values
  const finalAppeals = {};
  Object.keys(movieAppeals).forEach(voteTitle => {
    const movie = movieAppeals[voteTitle];
    
    // Calculate visibility score (lower = less seen = better for tie-breaking)
    // Formula: (seenCount / totalVoters) * 0.1 to make it a small modifier
    const visibilityRatio = movie.totalVoters > 0 ? movie.seenCount / movie.totalVoters : 0;
    const visibilityModifier = visibilityRatio * 0.1;
    
    // Final appeal = total appeal - visibility modifier
    // This gives an edge to less-seen movies (lower visibility = higher final appeal)
    const finalAppeal = movie.totalAppeal - visibilityModifier;
    
    finalAppeals[voteTitle] = {
      originalAppeal: movie.totalAppeal,
      visibilityRatio: visibilityRatio,
      visibilityModifier: visibilityModifier,
      finalAppeal: finalAppeal,
      seenCount: movie.seenCount,
      totalVoters: movie.totalVoters
    };
  });
  
  // Update appeal values in Marquee sheet
  Object.keys(finalAppeals).forEach(voteTitle => {
    const normalizedVoteTitle = normalizeTitle(voteTitle);
    const marqueeEntry = marqueeTitleMap[normalizedVoteTitle];
    
    if (marqueeEntry) {
      const appealData = finalAppeals[voteTitle];
      // Update Column C - Appeal with the final appeal value (including visibility modifier)
      marqueeSheet.getRange(marqueeEntry.index + 2, 3).setValue(appealData.finalAppeal);
      updatedCount++;
      
      // Log the calculation for debugging
      console.log(`${voteTitle}: Original=${appealData.originalAppeal}, Seen=${appealData.seenCount}/${appealData.totalVoters} (${(appealData.visibilityRatio * 100).toFixed(1)}%), Modifier=${appealData.visibilityModifier.toFixed(3)}, Final=${appealData.finalAppeal.toFixed(3)}`);
    } else {
      // Log unmatched titles for debugging
      console.log(`No match found for vote title: "${voteTitle}" (normalized: "${normalizedVoteTitle}")`);
    }
  });
  
  return {
    updated: updatedCount,
    total: Object.keys(movieAppeals).length
  };
}