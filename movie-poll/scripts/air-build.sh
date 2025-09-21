#!/bin/bash

# Air build wrapper script
# This handles both Go compilation and CSS building

echo "🔨 Building application..."

# Build CSS first
echo "🎨 Building CSS..."
./scripts/build-css.sh

# Build Go application
echo "🔨 Building Go..."
go build -o ./tmp/main .

echo "✅ Build complete!"
