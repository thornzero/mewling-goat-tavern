#!/usr/bin/env node

/**
 * Improved Movie Seeding Script for D1 Database
 * 
 * This script uses the D1 backend's improved matching algorithm to get better movie matches.
 */

const fs = require('fs');

// Read the movies.json file
const moviesData = JSON.parse(fs.readFileSync('../../docs/movies.json', 'utf8'));

console.log(`🎬 Found ${moviesData.movies.length} movies to seed with improved matching`);

// D1 Backend URL
const BACKEND_URL = 'https://mewling-goat-backend.tavern-b8d.workers.dev';

/**
 * Search for a movie using the D1 backend's improved matching
 */
async function searchMovieWithMatching(title, year) {
  try {
    const searchUrl = `${BACKEND_URL}/?action=search&query=${encodeURIComponent(title)}&year=${year}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`D1 Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const match = data.results[0];
      const matchInfo = data.match_info;
      
      console.log(`✅ Found ${matchInfo.match_type} match: ${match.title} (${match.release_date}) - Score: ${matchInfo.similarity_score}`);
      return { movie: match, matchInfo };
    } else {
      console.log(`❌ No results for: ${title} (${year})`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error searching for ${title}:`, error.message);
    return null;
  }
}

/**
 * Get detailed movie information from D1 backend
 */
async function getMovieDetails(tmdbId) {
  try {
    const detailsUrl = `${BACKEND_URL}/?action=movie&id=${tmdbId}`;
    const response = await fetch(detailsUrl);
    
    if (!response.ok) {
      throw new Error(`D1 Backend API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📋 Got details for: ${data.title}`);
    return data;
  } catch (error) {
    console.error(`❌ Error getting details for TMDB ID ${tmdbId}:`, error.message);
    return null;
  }
}

/**
 * Insert movie into D1 database using direct SQL
 */
async function insertMovieDirect(movieData) {
  try {
    const title = movieData.title.replace(/'/g, "''");
    const overview = movieData.overview ? movieData.overview.replace(/'/g, "''") : '';
    const originalTitle = movieData.original_title ? movieData.original_title.replace(/'/g, "''") : title;
    const year = movieData.release_date ? parseInt(movieData.release_date.split('-')[0]) : 'NULL';
    
    const insertSQL = `INSERT INTO movies (
      tmdb_id, title, year, poster_path, backdrop_path, 
      overview, release_date, runtime, adult, original_language, 
      original_title, popularity, vote_average, vote_count, video
    ) VALUES (
      ${movieData.id}, 
      '${title}', 
      ${year}, 
      ${movieData.poster_path ? `'${movieData.poster_path}'` : 'NULL'}, 
      ${movieData.backdrop_path ? `'${movieData.backdrop_path}'` : 'NULL'}, 
      ${overview ? `'${overview}'` : 'NULL'}, 
      ${movieData.release_date ? `'${movieData.release_date}'` : 'NULL'}, 
      ${movieData.runtime || 'NULL'}, 
      ${movieData.adult ? 1 : 0}, 
      '${movieData.original_language || 'en'}', 
      '${originalTitle}', 
      ${movieData.popularity || 0}, 
      ${movieData.vote_average || 0}, 
      ${movieData.vote_count || 0}, 
      ${movieData.video ? 1 : 0}
    );`;
    
    return insertSQL;
  } catch (error) {
    console.error(`❌ Error preparing insert for ${movieData.title}:`, error.message);
    return null;
  }
}

/**
 * Main seeding function using improved matching
 */
async function seedMoviesWithImprovedMatching() {
  console.log('🚀 Starting improved movie seeding process...\n');
  
  const insertStatements = [];
  const matchStats = {
    exact: 0,
    flexible: 0,
    fallback: 0,
    none: 0
  };
  
  for (const movie of moviesData.movies) {
    console.log(`\n🔍 Processing: ${movie.title} (${movie.year})`);
    
    // Search using D1 backend's improved matching
    const searchResult = await searchMovieWithMatching(movie.title, movie.year);
    
    if (searchResult) {
      // Get detailed information
      const details = await getMovieDetails(searchResult.movie.id);
      
      if (details) {
        // Prepare insert statement
        const insertSQL = await insertMovieDirect(details);
        if (insertSQL) {
          insertStatements.push(insertSQL);
          matchStats[searchResult.matchInfo.match_type]++;
        }
      }
    } else {
      matchStats.none++;
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Match Statistics:`);
  console.log(`  Exact matches: ${matchStats.exact}`);
  console.log(`  Flexible matches: ${matchStats.flexible}`);
  console.log(`  Fallback matches: ${matchStats.fallback}`);
  console.log(`  No matches: ${matchStats.none}`);
  
  console.log(`\n📝 Generated ${insertStatements.length} insert statements`);
  
  // Write the SQL file
  const sqlContent = insertStatements.join('\n\n');
  fs.writeFileSync('seed-movies-improved.sql', sqlContent);
  
  console.log('💾 SQL statements written to seed-movies-improved.sql');
  console.log('\n🎯 To apply these changes to your database, run:');
  console.log('   npx wrangler d1 execute mewlinggoat_db --file=./seed-movies-improved.sql --remote');
}

// Run the seeding process
seedMoviesWithImprovedMatching().catch(console.error);
