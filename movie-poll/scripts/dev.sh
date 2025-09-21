#!/bin/bash

# Development script with better port management
PORT=${PORT:-3000}

echo "🔧 Starting development server on port $PORT..."

# More aggressive cleanup - kill all server processes
echo "🧹 Cleaning up all server processes..."
pkill -f "tmp/server" 2>/dev/null || true
pkill -f "movie-poll" 2>/dev/null || true

# Kill any processes on the port and nearby ports
echo "🧹 Cleaning up ports..."
for port in $((PORT-1)) $PORT $((PORT+1)) $((PORT+2)) $((PORT+3)); do
    lsof -ti:"$port" | xargs -r kill -9 2>/dev/null || true
done

# Wait longer for ports to be released
echo "⏳ Waiting for ports to be released..."
sleep 3

# Start Air with the specified port
echo "🚀 Starting Air hot reload on port $PORT..."
export PATH="$PATH:/home/thornzero/go/bin"
PORT=$PORT air