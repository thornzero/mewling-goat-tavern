#!/bin/bash

# Deploy script for Railway
echo "🚀 Deploying Movie Poll to Railway..."

# Generate templ files
echo "📝 Generating templ files..."
templ generate

# Build the application
echo "🔨 Building application..."
go build -o movie-poll .

# Deploy to Railway
echo "🚂 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
