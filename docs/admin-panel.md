# Admin Panel Documentation

## Overview

The admin panel provides comprehensive movie management capabilities for the Movie Poll application. It includes authentication, movie search, database management, and system administration features.

## Access

### Login

- **URL**: `/admin`
- **Default Password**: `mewling-goat-admin-2025`
- **Session**: Password stored in localStorage for persistence
- **Security**: Change password for production deployment

### Authentication

- Password-based authentication
- Session persistence across browser sessions
- Protected routes require authentication
- No additional rate limiting (consider for production)

## Features

### Movie Management

#### Add Movies

- **TMDB Integration**: Search The Movie Database for movies
- **Search Parameters**: Query by title and optional year
- **Movie Details**: Full movie information including poster, overview, metadata
- **Batch Addition**: Add multiple movies from search results
- **Validation**: Ensure movie doesn't already exist in database

#### Delete Movies

- **Individual Deletion**: Remove specific movies from poll
- **Cascade Deletion**: Automatically removes associated votes and appeals
- **Confirmation**: Prevents accidental deletions
- **Audit Trail**: Track deletion actions

#### Movie List Management

- **Current Movies**: View all movies in the poll
- **Appeal Scores**: Display current appeal values
- **Vote Counts**: Show voting statistics per movie
- **Sorting**: Sort by title, appeal score, or vote count
- **Filtering**: Filter movies by various criteria

#### Swap Movies

- **Replace Functionality**: Replace one movie with another
- **Preserve Data**: Maintain voting history where possible
- **Seamless Transition**: Update without breaking user sessions

### Database Operations

#### Appeal Score Management

- **Recalculation**: Manually trigger appeal score updates
- **Batch Processing**: Update all movies at once
- **Statistics**: View calculation results and statistics
- **Validation**: Verify calculation accuracy

#### Data Export/Import

- **JSON Export**: Download current movie list as JSON
- **JSON Import**: Upload JSON file to add multiple movies
- **Format Validation**: Ensure imported data is valid
- **Backup/Restore**: Create and restore database backups

#### Database Statistics

- **Total Movies**: Count of movies in database
- **Total Votes**: Count of all votes cast
- **Unique Voters**: Count of distinct voters
- **Last Updated**: Timestamp of last database modification

### System Administration

#### User Management

- **Vote Tracking**: Monitor user voting patterns
- **Session Management**: View active user sessions
- **Device Tracking**: Track voting devices
- **User Statistics**: Analyze user engagement

#### System Monitoring

- **Performance Metrics**: Monitor system performance
- **Error Tracking**: View system errors and logs
- **API Status**: Check external API connectivity
- **Database Health**: Monitor database performance

## API Endpoints

### Admin-Only Endpoints

#### Add Movie

```http
POST /api/admin/add-movie
Content-Type: application/json

{
  "tmdb_id": 12345,
  "title": "Movie Title",
  "year": 2023
}
```

#### Delete Movie

```http
POST /api/admin/delete-movie
Content-Type: application/json

{
  "movie_id": 123
}
```

#### Update Appeal Scores

```http
GET /api/admin/update-appeal
```

#### Export Movies

```http
GET /api/admin/export-movies
```

#### Import Movies

```http
POST /api/admin/import-movies
Content-Type: application/json

[
  {
    "title": "Movie Title",
    "year": 2023,
    "tmdb_id": 12345
  }
]
```

## Data Formats

### Import/Export JSON Format

```json
[
  {
    "title": "Movie Title",
    "year": 2023,
    "tmdb_id": 12345,
    "appeal_value": null,
    "poster_path": "/poster.jpg",
    "overview": "Movie description..."
  }
]
```

#### Required Fields

- `title`: Movie title
- `year`: Release year
- `tmdb_id`: The Movie Database ID

#### Optional Fields

- `appeal_value`: Appeal score (calculated automatically)
- `poster_path`: Movie poster path
- `overview`: Movie description
- `backdrop_path`: Movie backdrop path
- `runtime`: Movie runtime in minutes
- `release_date`: Release date string

## User Interface

### Design Elements

- **Dark Theme**: Consistent with main application
- **Responsive Layout**: Mobile-friendly design
- **Tailwind CSS**: Utility-first styling
- **HTMX Integration**: Dynamic content updates

### Navigation

- **Main Poll**: Link to voting interface
- **Results**: Link to results page
- **Test Page**: Link to API testing interface
- **Admin Panel**: Current page (highlighted)

### Interactive Elements

- **Search Interface**: Real-time movie search
- **Action Buttons**: Clear, labeled action buttons
- **Confirmation Dialogs**: Prevent accidental actions
- **Loading States**: Visual feedback during operations
- **Error Messages**: Clear error communication

## Security Considerations

### Current Security

- **Password Protection**: Basic authentication
- **Session Management**: Browser-based session storage
- **Input Validation**: Server-side validation
- **SQL Injection Prevention**: Parameterized queries

### Production Recommendations

- **Strong Passwords**: Use complex, unique passwords
- **Rate Limiting**: Implement API rate limiting
- **HTTPS**: Use secure connections
- **Session Security**: Implement proper session management
- **Audit Logging**: Track all admin actions
- **Access Control**: Implement role-based access

## Troubleshooting

### Common Issues

#### Login Problems

- **Password Issues**: Verify correct password
- **Session Storage**: Check localStorage functionality
- **Browser Compatibility**: Ensure modern browser support

#### Movie Management Issues

- **TMDB API**: Check API key and connectivity
- **Database Errors**: Verify database connectivity
- **Validation Errors**: Check input data format

#### Performance Issues

- **Slow Loading**: Check database performance
- **API Timeouts**: Monitor external API response times
- **Memory Usage**: Monitor application memory usage

### Debug Tools

- **Test Page**: Use `/test` for API endpoint testing
- **Browser Console**: Check for JavaScript errors
- **Network Tab**: Monitor API requests and responses
- **Database Logs**: Check server-side logs

## Development

### Adding New Features

1. **Backend**: Add new API endpoints
2. **Frontend**: Update admin interface
3. **Testing**: Test thoroughly with `/test` page
4. **Documentation**: Update this documentation

### Code Structure

- **Handlers**: Admin-specific request handlers
- **Services**: Business logic for admin operations
- **Templates**: Admin interface templates
- **API Routes**: Admin API endpoint definitions

### Testing

- **Manual Testing**: Use admin interface for testing
- **API Testing**: Use `/test` page for endpoint testing
- **Integration Testing**: Test complete workflows
- **Error Testing**: Test error conditions and edge cases

## Maintenance

### Regular Tasks

- **Password Updates**: Change admin password regularly
- **Database Cleanup**: Remove old or invalid data
- **Performance Monitoring**: Monitor system performance
- **Backup Creation**: Regular database backups

### Updates

- **Dependencies**: Keep dependencies updated
- **Security Patches**: Apply security updates
- **Feature Updates**: Add new functionality as needed
- **Documentation**: Keep documentation current
