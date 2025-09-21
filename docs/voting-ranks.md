# Voting Ranks

| Rank  |  Label  | Emoji | Seen  | Meaning                       |
| :---: | :-----: | :---: | :---: | :---------------------------- |
|   1   | Rewatch |   ⭐   |   ✅   | would happily watch it again. |
|   2   | Stoked  |   🔥   |   ❌   | excited to watch it.          |
|   3   |  Later  |   ⏳   |   ❌   | Indifferent.                  |
|   4   |   Meh   |   😐   |   ✅   | Indifferent about rewatching. |
|   5   |  Skip   |   💤   |   ❌   | Absolutely don’t want to.     |
|   6   |  Never  |   🚫   |   ✅   | never want to watch it again. |

## Ranking System Calculation

```js
/**
 * Updates appeal values based on vote ranks
 * @returns {Object} Result with updated and total counts
 */
function updateAppealValues() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const votesSheet = getSheet(SHEET_NAMES.VOTES);
    const marqueeSheet = getSheet(SHEET_NAMES.MARQUEE);
    
    // Get all votes - handle case where there are no votes
    const lastRow = votesSheet.getLastRow();
    if (lastRow < 2) {
      console.log('No votes found in sheet');
      return { updated: 0, total: 0 };
    }
    
    const votesData = votesSheet.getRange(2, 1, lastRow - 1, 5).getValues();
  
  // Calculate appeal for each movie
  const movieAppeals = {};
  const uniqueVoters = new Set();

  votesData.forEach(row => {
    const voter = row[VOTE_COLUMNS.USER];       // Column C - Voter Name
    const movieTitle = row[VOTE_COLUMNS.TITLE]; // Column B - Movie Title
    const vote = row[VOTE_COLUMNS.VOTE];       // Column D - Vote (emoji)
    const seen = row[VOTE_COLUMNS.SEEN];       // Column E - Seen status
    
    if (movieTitle && vote) {
      // Track unique voters
      if (voter) {
        uniqueVoters.add(voter);
      }
      
      if (!movieAppeals[movieTitle]) {
        movieAppeals[movieTitle] = {
          totalVotes: 0,
          totalAppeal: 0,
          seenCount: 0,
          voters: new Set()
        };
      }
      
      movieAppeals[movieTitle].totalVotes++;
      movieAppeals[movieTitle].totalAppeal += parseInt(vote) || 0;
      
      // Track seen status for visibility score
      if (seen === "true" || seen === "TRUE") {
        movieAppeals[movieTitle].seenCount++;
      }
      
      // Track unique voters for this movie
      if (voter) {
        movieAppeals[movieTitle].voters.add(voter);
      }
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
  const totalUniqueVoters = uniqueVoters.size;
  
  Object.keys(movieAppeals).forEach(voteTitle => {
    const movie = movieAppeals[voteTitle];
    const movieVoterCount = movie.voters.size;
    
    // Calculate visibility score (lower = less seen = better for tie-breaking)
    // Formula: (seenCount / movieVoterCount) * 0.1 to make it a small modifier
    const visibilityRatio = movieVoterCount > 0 ? movie.seenCount / movieVoterCount : 0;
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
      totalVoters: movieVoterCount,
      totalUniqueVoters: totalUniqueVoters
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
      console.log(`${voteTitle}: Original=${appealData.originalAppeal}, Seen=${appealData.seenCount}/${appealData.totalVoters} (${(appealData.visibilityRatio * 100).toFixed(1)}%), Modifier=${appealData.visibilityModifier.toFixed(3)}, Final=${appealData.finalAppeal.toFixed(3)}, TotalVoters=${appealData.totalUniqueVoters}`);
    } else {
      // Log unmatched titles for debugging
      console.log(`No match found for vote title: "${voteTitle}" (normalized: "${normalizedVoteTitle}")`);
    }
  });
  
    return {
      updated: updatedCount,
      total: Object.keys(movieAppeals).length,
      movies: finalAppeals,
      totalUniqueVoters: totalUniqueVoters
    };
  } catch (error) {
    console.error('Error in updateAppealValues:', error);
    throw new Error('Failed to update appeal values: ' + error.message);
  }
}
```
