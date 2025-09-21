#!/bin/bash

# Development script with better port management
PORT=${PORT:-3000}

echo "🔧 Starting development server on port $PORT..."

# Kill any existing processes on the port
echo "🧹 Cleaning up port $PORT..."
lsof -ti:"$PORT" | xargs -r kill -9 2>/dev/null || true

# Wait a moment for the port to be released
sleep 1

# Start Air with the specified port
echo "🚀 Starting Air hot reload..."
PORT=$PORT air