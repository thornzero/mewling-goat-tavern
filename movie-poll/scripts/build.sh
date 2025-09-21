#!/bin/bash

# Comprehensive build script for movie poll
echo "🚀 Building Movie Poll Application..."

# Build CSS first
echo "🎨 Building Tailwind CSS..."
./build-css.sh

# Build Go application
echo "🔨 Building Go application..."
go build -o ./tmp/main .

echo "✅ Build complete!"
echo "📦 Binary: ./tmp/main"
echo "🎨 CSS: ./static/css/style.css"
