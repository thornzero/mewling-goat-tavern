#!/bin/bash

# Cleanup script for movie-poll processes
echo "🧹 Cleaning up movie-poll processes..."

# Kill all movie-poll related processes
pkill -f movie-poll 2>/dev/null
pkill -f "tmp/server" 2>/dev/null
pkill -f "tmp/main" 2>/dev/null

# Wait for processes to terminate
echo "⏳ Waiting for processes to terminate..."
sleep 2

# Check if port 3000 is still in use
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is still in use. Force killing processes..."
    # Force kill any process using port 3000
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Final check
if lsof -i :3000 >/dev/null 2>&1; then
    echo "❌ Port 3000 is still in use. Manual cleanup may be required."
    lsof -i :3000
    exit 1
else
    echo "✅ All movie-poll processes cleaned up successfully"
    echo "✅ Port 3000 is now free"
fi
