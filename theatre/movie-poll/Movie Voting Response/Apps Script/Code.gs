const scriptProperties = PropertiesService.getScriptProperties();
const TMDB_API_KEY = scriptProperties.getProperty("TMDB_API_KEY");

if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY not configured in script properties');
}

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
      cache.put(url, jsonText, 21600);
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
  let body;

  

  switch (action) {
    // ─── listMovies ──────────────────────────────────────────────────────
    case 'listMovies': {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Marquee');
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1).getValues();
      const titles = rows.map(r => r[0]).filter(Boolean);
      body = cb + '(' + JSON.stringify(titles) + ');';
      break;
    }

    // ─── search by title ─────────────────────────────────────────────────
    case 'search': {
      if (!p.query) {
        body = cb + '(' + JSON.stringify({ error: 'Missing query' }) + ');';
      } else {
        // Build URL with optional year filter
        let url = 'https://api.themoviedb.org/3/search/movie'
          + '?language=en-US'
          + '&query=' + encodeURIComponent(p.query);
        if (p.year) {
          url += '&year=' + encodeURIComponent(p.year);
        }
        body = CachedFetch(url, cb);
      }
      break;
    }

    // ─── movie details ───────────────────────────────────────────────────
    case 'movie': {
      if (!p.id) {
        body = cb + '(' + JSON.stringify({ error: 'Missing id parameter' }) + ');';
      } else {
        const url = 'https://api.themoviedb.org/3/movie/' + encodeURIComponent(p.id)
          + '?language=en-US';
        body = CachedFetch(url, cb);
      }
      break;
    }

    // ─── videos (trailers/teasers) ────────────────────────────────────────
    case 'videos': {
      if (!p.id) {
        body = cb + '(' + JSON.stringify({ error: 'Missing id parameter' }) + ');';
      } else {
        const url = 'https://api.themoviedb.org/3/movie/' + encodeURIComponent(p.id)
          + '/videos?language=en-US';
        body = CachedFetch(url, cb);
      }
      break;
    }

    // ─── vote submission ─────────────────────────────────────────────────
    case 'vote': {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Votes');
      sheet.appendRow([
        new Date(),
        p.movieTitle || '',
        p.userName || '',
        p.vote || '',
        p.seen || ''
      ]);
      body = cb + '(' + JSON.stringify({ status: 'ok' }) + ');';
      break;
    }

    // ─── batch vote submission ───────────────────────────────────────────
    case 'batchVote': {
      if (!p.votes) {
        body = cb + '(' + JSON.stringify({ error: 'Missing votes parameter' }) + ');';
      } else {
        try {
          const votes = JSON.parse(p.votes);
          const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Votes');
          
          // Prepare all rows to append
          const rowsToAppend = votes.map(vote => [
            new Date(vote.timestamp || Date.now()),
            vote.movieTitle || '',
            vote.userName || '',
            vote.vote || '',
            vote.seen || ''
          ]);
          
          // Append all rows at once
          if (rowsToAppend.length > 0) {
            sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
            
            // Automatically update appeal values after votes are submitted
            try {
              const appealResult = updateAppealValues();
              body = cb + '(' + JSON.stringify({ 
                status: 'ok',
                submitted: rowsToAppend.length,
                appealUpdated: appealResult.updated,
                appealTotal: appealResult.total
              }) + ');';
            } catch (appealError) {
              // If appeal update fails, still return success for vote submission
              body = cb + '(' + JSON.stringify({ 
                status: 'ok',
                submitted: rowsToAppend.length,
                appealError: appealError.message
              }) + ');';
            }
          } else {
            body = cb + '(' + JSON.stringify({ 
              status: 'ok',
              submitted: 0 
            }) + ');';
          }
        } catch (error) {
          body = cb + '(' + JSON.stringify({ 
            error: 'Invalid votes JSON: ' + error.message 
          }) + ');';
        }
      }
      break;
    }

    // ─── update appeal values ────────────────────────────────────────────
    case 'updateAppeal': {
      try {
        const result = updateAppealValues();
        body = cb + '(' + JSON.stringify({ 
          status: 'ok',
          updated: result.updated,
          total: result.total
        }) + ');';
      } catch (error) {
        body = cb + '(' + JSON.stringify({ 
          error: 'Failed to update appeal: ' + error.message 
        }) + ');';
      }
      break;
    }

    // ─── invalid action ──────────────────────────────────────────────────
    default: {
      body = cb + '(' + JSON.stringify({ error: 'Invalid action' }) + ');';
    }
  }

  // Return JSONP-wrapped response as JavaScript
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// Function to update appeal values based on vote ranks
function updateAppealValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const votesSheet = ss.getSheetByName('Votes');
  const marqueeSheet = ss.getSheetByName('Marquee');
  
  if (!votesSheet || !marqueeSheet) {
    throw new Error('Required sheets not found');
  }
  
  // Get all votes
  const votesData = votesSheet.getRange(2, 1, votesSheet.getLastRow() - 1, 5).getValues();
  
  // Vote rank mapping based on emoji
  const voteRanks = {
    '⭐': 1,  // Rewatch - highest rank
    '🔥': 2,  // Stoked
    '⏳': 3,  // Later
    '😐': 4,  // Meh
    '💤': 5,  // Skip
    '🚫': 6   // Never - lowest rank
  };
  
  // Calculate appeal for each movie
  const movieAppeals = {};
  
  votesData.forEach(row => {
    const movieTitle = row[1]; // Column B - Movie Title
    const vote = row[3];       // Column D - Vote (emoji)
    const seen = row[4];       // Column E - Seen status
    
    if (movieTitle && vote && voteRanks.hasOwnProperty(vote)) {
      if (!movieAppeals[movieTitle]) {
        movieAppeals[movieTitle] = {
          totalVotes: 0,
          totalAppeal: 0,
          seenCount: 0,
          totalVoters: 0
        };
      }
      
      movieAppeals[movieTitle].totalVotes++;
      movieAppeals[movieTitle].totalAppeal += voteRanks[vote];
      
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