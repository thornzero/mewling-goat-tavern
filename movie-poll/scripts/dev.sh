#!/bin/bash

# Development script for movie poll with hot reloading
export TMDB_API_KEY=test
export DB_PATH=./db/movie_poll.db

# Cleanup function
cleanup() {
    # Prevent duplicate cleanup
    if [ "$CLEANUP_DONE" = "true" ]; then
        return
    fi
    CLEANUP_DONE=true
    
    echo "🧹 Cleaning up development processes..."
    kill $CSS_PID 2>/dev/null
    echo "✅ Development cleanup complete"
    exit 0
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

echo "🚀 Starting Movie Poll Development Server"
echo "📦 TMDB_API_KEY: $TMDB_API_KEY"
echo "🗄️  DB_PATH: $DB_PATH"
echo "🌐 Server: http://localhost:3000"
echo "🎨 CSS: Auto-compiled with Tailwind"
echo "🔄 Hot Reload: Enabled for Go + CSS"
echo "Press Ctrl+C to stop"
echo ""

# Build CSS initially
echo "🎨 Building initial CSS..."
cd "$(dirname "$0")/.." && ./scripts/build-css.sh

# Start CSS watcher in background
echo "🎨 Starting CSS watcher..."
cd "$(dirname "$0")/.." && ./scripts/dev-css.sh &
CSS_PID=$!

# Wait a moment for CSS watcher to start
sleep 1

# Start Air with hot reloading
echo "🔨 Starting Air..."
export TMDB_API_KEY=test
export DB_PATH=./db/movie_poll.db
~/go/bin/air
