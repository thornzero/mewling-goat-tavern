# Mewling Goat Tavern Movie Poll - Migration Design Document

## Overview

This document catalogs all features and functionality of the current GitHub Pages implementation to ensure a complete migration to Cloudflare Workers without losing any capabilities.

## Current Architecture

### Frontend (GitHub Pages)

- **Domain**: `moviepoll.mewling-goat-tavern.online` (via CNAME)
- **Hosting**: GitHub Pages
- **Build System**: TypeScript compilation + Tailwind CSS
- **CDN**: GitHub Pages CDN

### Backend (Cloudflare Workers)

- **Domain**: `mewling-goat-backend.tavern-b8d.workers.dev`
- **Database**: Cloudflare D1 (SQLite)
- **API**: TMDB integration via `moviedb-promise`
- **CORS**: Configured for frontend domain

## Feature Catalog

### 1. Main Application (`index.html`)

#### User Interface

- **Name Entry Screen**: User authentication with name input
- **Movie Poll Screen**: Carousel-based voting interface
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Dark Theme**: Gray-900 background with pink accents

#### Core Functionality

- **Movie Carousel**: Swiper.js-powered slide navigation
- **Voting Flow**: 3-step process per movie
  1. "Have you seen it?" (Yes/No)
  2. Rating (if seen): Rewatch/Meh/Hated it
  3. Interest (if not seen): Stoked/Indifferent/Not interested
- **Vote Submission**: Batch submission of all votes at completion
- **Progress Tracking**: Visual confirmation and slide advancement

#### Technical Features

- **Local Storage Caching**: Movie details cached for performance
- **Error Handling**: API error states with retry functionality
- **Loading States**: Visual feedback during data loading
- **Keyboard Support**: Enter key for name input

### 2. Results Page (`results.html`)

#### Display Features

- **Ranked Results**: Movies sorted by appeal rating
- **Statistics Dashboard**:
  - Total movies count
  - Total votes count
  - Unique voters count
  - Last updated timestamp
- **Appeal Visualization**: Color-coded appeal levels
  - High (≥4): Green
  - Medium (2-3.9): Yellow
  - Low (0.1-1.9): Red
  - Unknown (0): Gray

#### Data Features

- **Auto-refresh**: 5-minute interval updates
- **Detailed Metrics**: Per-movie statistics
  - Appeal rating
  - Vote count
  - Total appeal
  - Seen count
  - Visibility ratio
- **Error Handling**: Graceful fallback for API failures

### 3. Test Page (`test.html`)

#### API Testing Interface

- **Debug Status**: System health check
- **Movie List**: Fetch all movies from database
- **Movie Search**: TMDB search with query/year parameters
- **Movie Details**: Full movie information retrieval
- **Vote Submission**: Single and batch vote testing
- **Appeal Calculation**: Appeal rating computation
- **Comprehensive Test Suite**: Automated testing of all endpoints

#### Test Features

- **Individual Tests**: Each API endpoint can be tested separately
- **Batch Testing**: Run all tests sequentially
- **Parameter Input**: Customizable test parameters
- **Result Display**: Formatted JSON responses
- **Error Reporting**: Detailed error messages

### 4. TypeScript Architecture

#### Core Classes

- **Movie Class** (`movie.ts`): Movie data management
- **Vote Class** (`vote.ts`): Vote data structure
- **Config** (`config.ts`): API configuration and types
- **Utils** (`utils.ts`): Utility functions

#### API Integration

- **TMDB Integration**: Movie search and details
- **D1 Backend**: Vote submission and retrieval
- **Error Handling**: Comprehensive error management
- **Type Safety**: Full TypeScript type definitions

### 5. Build System

#### TypeScript Compilation

- **Source**: `src/js/*.ts` files
- **Output**: `docs/dist/*.js` files
- **Configuration**: `tsconfig.json`

#### CSS Processing

- **Tailwind CSS**: Utility-first styling
- **Custom Styles**: Additional CSS for animations
- **Build Process**: `input.css` → `output.css`

#### Asset Management

- **Favicons**: Complete favicon set
- **Fonts**: Custom web fonts
- **Images**: Movie posters and placeholders

## Migration Requirements

### 1. Cloudflare Workers Frontend

#### Static Asset Serving

- **HTML Files**: `index.html`, `results.html`, `test.html`
- **CSS**: Compiled Tailwind CSS
- **JavaScript**: Compiled TypeScript
- **Assets**: Favicons, fonts, images

#### Routing

- **Root Route** (`/`): Main application
- **Results Route** (`/results`): Results page
- **Test Route** (`/test`): Test page
- **API Routes**: Backend API endpoints

### 2. Domain Configuration

#### CNAME Migration

- **Current**: `moviepoll.mewling-goat-tavern.online` → GitHub Pages
- **New**: `moviepoll.mewling-goat-tavern.online` → Cloudflare Workers
- **DNS**: Update CNAME record to point to Workers

#### SSL/TLS

- **Certificate**: Cloudflare managed SSL
- **HTTPS**: Automatic HTTPS redirect
- **Security**: Cloudflare security features

### 3. API Integration

#### Backend Communication

- **Current**: Cross-origin requests to Workers backend
- **New**: Same-origin requests (no CORS needed)
- **URLs**: Update API calls to use relative URLs

#### Database Access

- **D1 Database**: Direct access from frontend Workers
- **Queries**: Move database queries to frontend
- **Caching**: Implement edge caching

### 4. Build Process

#### Workers Build

- **Wrangler**: Cloudflare Workers CLI
- **TypeScript**: Compile to Workers format
- **Assets**: Bundle static assets
- **Deployment**: Automated deployment

#### Development Workflow

- **Local Development**: `wrangler dev`
- **Testing**: Local testing environment
- **Deployment**: `wrangler deploy`

## Technical Specifications

### 1. Dependencies

#### Frontend Dependencies

- **Swiper.js**: Carousel functionality
- **Tailwind CSS**: Styling framework
- **TypeScript**: Type safety

#### Backend Dependencies

- **moviedb-promise**: TMDB API integration
- **Cloudflare D1**: Database
- **Vitest**: Testing framework

### 2. Environment Variables

#### Required Variables

- `TMDB_API_KEY`: The Movie Database API key
- `CORS_ORIGINS`: Allowed CORS origins
- `DEBUG`: Debug mode flag

#### Optional Variables

- `CACHE_TTL`: Cache time-to-live
- `RATE_LIMIT`: API rate limiting

### 3. Database Schema

#### Tables

- **movies**: Movie information
- **votes**: User votes
- **appeals**: Calculated appeal ratings

#### Indexes

- **movie_id**: Primary key
- **user_name**: User identification
- **timestamp**: Vote timing

## Migration Checklist

### Phase 1: Preparation

- [ ] Create new Workers project for frontend
- [ ] Set up build process for Workers
- [ ] Configure domain routing
- [ ] Test local development environment

### Phase 2: Migration

- [ ] Migrate HTML files to Workers
- [ ] Update API calls to use relative URLs
- [ ] Implement static asset serving
- [ ] Configure routing for all pages

### Phase 3: Testing

- [ ] Test all functionality locally
- [ ] Verify API integration
- [ ] Test responsive design
- [ ] Validate all user flows

### Phase 4: Deployment

- [ ] Deploy to Cloudflare Workers
- [ ] Update DNS CNAME record
- [ ] Verify SSL certificate
- [ ] Test production environment

### Phase 5: Cleanup

- [ ] Remove GitHub Pages configuration
- [ ] Update documentation
- [ ] Monitor performance
- [ ] Gather user feedback

## Performance Considerations

### 1. Edge Computing

- **Global Distribution**: Serve from edge locations
- **Reduced Latency**: Faster response times
- **Better UX**: Improved user experience

### 2. Caching Strategy

- **Static Assets**: Long-term caching
- **API Responses**: Short-term caching
- **Database Queries**: Query result caching

### 3. Optimization

- **Code Splitting**: Load only necessary code
- **Asset Optimization**: Compress images and CSS
- **Bundle Size**: Minimize JavaScript bundle

## Security Considerations

### 1. CORS Configuration

- **Same Origin**: No CORS needed for same domain
- **API Security**: Secure API endpoints
- **Input Validation**: Validate all inputs

### 2. Data Protection

- **User Data**: Secure vote storage
- **API Keys**: Environment variable protection
- **HTTPS**: Encrypted communication

## Monitoring and Maintenance

### 1. Analytics

- **Usage Metrics**: Track user engagement
- **Performance**: Monitor response times
- **Errors**: Track and log errors

### 2. Updates

- **Dependencies**: Regular dependency updates
- **Security**: Security patch management
- **Features**: New feature development

## Conclusion

This migration will consolidate the entire application on Cloudflare Workers, providing better performance, unified deployment, and simplified maintenance. The comprehensive feature catalog ensures no functionality is lost during the migration process.

The migration should be completed in phases to minimize risk and ensure a smooth transition for users.
