# Voting System Documentation

## Overview

The Movie Poll application uses a sophisticated 6-rank voting system that balances multiple factors to determine movie appeal scores. The system encourages shared new experiences while respecting quality and group consensus.

## Voting Scale

| Rank  |  Label  | Emoji | Seen  | Meaning                      |
| :---: | :-----: | :---: | :---: | :--------------------------- |
|   1   | Rewatch |   ⭐   |   ✅   | Would happily watch it again |
|   2   | Stoked  |   🔥   |   ❌   | Excited to watch it          |
|   3   |  Later  |   ⏳   |   ❌   | Indifferent                  |
|   4   |   Meh   |   😐   |   ✅   | Indifferent about rewatching |
|   5   |  Skip   |   💤   |   ❌   | Absolutely don't want to     |
|   6   |  Never  |   🚫   |   ✅   | Never want to watch it again |

## Voting Flow

### 1. User Authentication

- User enters their name on the main page
- System validates username and creates session
- User is redirected to the voting interface

### 2. Movie Presentation

- Movies are displayed in a carousel format
- Each movie shows poster, title, year, and overview
- User can navigate between movies using swipe/buttons

### 3. Voting Process

For each movie, the user follows a 3-step process:

1. **Seen Status**: "Have you seen this movie?" (Yes/No)
2. **Rating/Interest**: Based on seen status:
   - If **seen**: Rate quality (Rewatch/Meh/Never)
   - If **not seen**: Rate interest (Stoked/Later/Skip)
3. **Confirmation**: Vote is submitted and user advances to next movie

### 4. Completion

- When all movies are voted on, user is redirected to results
- Results show ranked movies with appeal scores
- User can view detailed statistics

## Appeal Score Calculation

The appeal score is calculated using a complex formula that balances multiple factors:

```math
Final Appeal = Base Appeal + Novelty Bonus + Participation Bonus + Quality Bonus + Consensus Bonus
```

### Formula Components

#### 1. Base Appeal (0-5.0 points)

- **Formula**: `(avgInterest - 1.0) × 2.5`
- Based on average interest votes from people who haven't seen the movie
- Scale: 1=Later, 2=Interested, 3=Stoked
- Converts to 0-5.0 point scale

#### 2. Novelty Bonus (0-1.0 points)

- **Formula**: `(notSeenCount / totalVotes) × 1.0`
- Rewards movies that fewer people have seen
- Encourages shared new experiences
- Higher ratio = higher bonus

#### 3. Participation Bonus (0-0.5 points)

- **Formula**: `(totalVotes / uniqueVoters) × 0.5`
- Uses the `uniqueVoters` parameter
- Rewards movies with higher participation rates
- Prevents low-participation movies from dominating

#### 4. Quality Bonus (0-2.0 points)

- **Formula**: `(avgRating - 1.0) × 1.0`
- Only applies to movies people have seen
- Based on average rating votes
- Scale: 1=Meh, 2=Good, 3=Rewatch

#### 5. Consensus Bonus (0-1.0 points)

- **Formula**: `((highRatingRatio + highInterestRatio) × 0.5`
- Uses `highRatingCount` and `highInterestCount` parameters
- Rewards movies with strong group agreement
- High ratings OR high interest = bonus

## Implementation Details

### Database Schema

#### Votes Table

```sql
CREATE TABLE votes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  vibe INTEGER NOT NULL CHECK (vibe >= 1 AND vibe <= 6),
  seen BOOLEAN NOT NULL,
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
```

#### Appeals Table

```sql
CREATE TABLE appeals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  appeal_score REAL NOT NULL,
  total_votes INTEGER NOT NULL DEFAULT 0,
  unique_voters INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  visibility_ratio REAL NOT NULL DEFAULT 0,
  calculated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
```

### Session Management

- **Session Creation**: Generated on username entry
- **Session Persistence**: Stored in cookies with device tracking
- **Vote Tracking**: Each vote is associated with user and device
- **State Management**: HTMX handles dynamic updates

### Error Handling

- **Validation**: All votes are validated before submission
- **Duplicate Prevention**: Users can update their votes
- **Graceful Degradation**: System continues if individual votes fail
- **User Feedback**: Clear error messages and success confirmations

## User Experience Features

### Visual Design

- **Dark Theme**: Gray-900 background with pink accents
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Swiper Integration**: Smooth carousel navigation
- **Loading States**: Visual feedback during operations

### Accessibility

- **Keyboard Navigation**: Enter key support for name input
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: High contrast for readability
- **Touch Support**: Mobile-friendly touch interactions

### Performance

- **Local Storage**: Movie details cached for performance
- **Efficient Queries**: Optimized database operations
- **Lazy Loading**: Movies loaded as needed
- **Error Recovery**: Automatic retry for failed operations

## Testing

### Manual Testing

- Use the `/test` page for comprehensive API testing
- Test all voting scenarios (seen/not seen combinations)
- Verify appeal score calculations
- Test session persistence across page refreshes

### Automated Testing

- Unit tests for appeal calculation functions
- Integration tests for voting flow
- Database tests for data integrity
- API tests for all endpoints

## Future Enhancements

### Planned Features

- **Progress Tracking**: Visual indicators for voting progress
- **Batch Voting**: Vote on multiple movies at once
- **Real-time Updates**: Live results updates
- **Advanced Analytics**: Detailed voting patterns and trends

### Technical Improvements

- **Caching**: Implement intelligent caching for better performance
- **Database Optimization**: GORM migration for better maintainability
- **API Rate Limiting**: Protect against abuse
- **Monitoring**: Add comprehensive logging and metrics

## Troubleshooting

### Common Issues

1. **Votes Not Saving**
   - Check session cookie settings
   - Verify database connectivity
   - Check browser console for errors

2. **Appeal Scores Not Updating**
   - Manually trigger appeal calculation
   - Check for sufficient vote data
   - Verify calculation algorithm

3. **Session Issues**
   - Clear browser cookies
   - Check device ID generation
   - Verify session storage

### Debug Tools

- **Test Page**: `/test` for comprehensive API testing
- **Admin Panel**: `/admin` for database management
- **Debug Endpoints**: Various debug endpoints for troubleshooting
- **Logs**: Check server logs for detailed error information
