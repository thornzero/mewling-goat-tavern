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