# Mewling Goat Movie Poll

A modern movie voting application built with TypeScript, Tailwind CSS, and Cloudflare D1 database.

## Features

### Modern Architecture

- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Cloudflare D1**: Serverless SQL database for data persistence
- **Cloudflare Workers**: Serverless backend API
- **TMDB Integration**: Direct integration with The Movie Database API

### Desktop Version (`index.html`)

- Full-featured carousel interface with Swiper.js
- Keyboard shortcuts (1=❤️, 2=😐, 3=🗑️, S=Seen it)
- Detailed movie information display
- Real-time vote submission and tracking
- Appeal calculation and ranking system

### Test Pages

- **`test.html`**: API testing and debugging interface
- **`results.html`**: View poll results sorted by appeal rating
- **`test-d1-integration.html`**: Comprehensive D1 backend testing

## File Structure

```text
docs/
├── index.html              # Main application
├── test.html               # API testing page
├── results.html            # Results display page
├── test-d1-integration.html # D1 backend testing
├── dist/                   # Compiled TypeScript output
│   ├── script.js           # Main application logic
│   ├── config.js           # API configuration
│   ├── movie.js            # Movie class
│   ├── vote.js             # Vote class
│   └── utils.js            # Utility functions
├── build/                  # Build configuration
│   ├── tailwind.config.js  # Tailwind configuration
│   ├── input.css           # CSS source
│   └── output.css          # Compiled CSS
└── README.md               # This file

src/js/                     # TypeScript source files
├── script.ts               # Main application logic
├── config.ts               # API configuration
├── movie.ts                # Movie class
├── vote.ts                 # Vote class
├── utils.ts                # Utility functions
├── test.ts                 # Test page logic
└── results.ts              # Results page logic

d1-backend/                 # Cloudflare D1 backend
├── src/
│   ├── index.ts            # Worker main file
│   └── types.ts            # TypeScript interfaces
├── migrations/             # Database schema
└── wrangler.jsonc          # Cloudflare configuration
```

## Backend Architecture

### Cloudflare D1 Database

- **Movies**: Store movie information from TMDB
- **Votes**: User vote data with timestamps
- **Appeal Calculations**: Computed appeal ratings
- **Genres**: Movie genre information
- **Videos**: Movie trailers and clips

### API Endpoints

- `GET /?action=debug` - System status
- `GET /?action=listMovies` - Get all movies
- `GET /?action=search&query=...` - Search movies
- `GET /?action=movie&id=...` - Get movie details
- `POST /?action=vote` - Submit single vote
- `POST /?action=batchVote` - Submit multiple votes
- `GET /?action=updateAppeal` - Get appeal rankings

## Development

### Prerequisites

- Node.js 18+ 
- npm
- Cloudflare account (for D1 backend)

### Frontend Development

```bash
# Install dependencies
npm install

# Build TypeScript and CSS
npm run build

# Watch for changes
npm run watch

# Lint code
npm run lint
```

### Backend Development

```bash
cd d1-backend/mewling-goat-backend

# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Run database migrations
npm run db:migrate

# Set TMDB API key
npx wrangler secret put TMDB_API_KEY
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features with TypeScript compilation
- Progressive enhancement for older browsers

## License

MIT License - see LICENSE file for details
