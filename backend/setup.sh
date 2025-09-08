#!/bin/bash

# Movie Poll Backend Setup Script
# Sets up the Cloudflare D1 backend for the movie poll application

set -e

echo "🎬 Setting up Movie Poll Backend..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run:"
    echo "   wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI found and authenticated"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate types
echo "🔧 Generating Cloudflare types..."
npm run cf-typegen

# Check if database exists
echo "🗄️ Checking database status..."
if wrangler d1 list | grep -q "mewlinggoat_db"; then
    echo "✅ Database 'mewlinggoat_db' already exists"
else
    echo "❌ Database 'mewlinggoat_db' not found. Please create it first:"
    echo "   wrangler d1 create mewlinggoat_db"
    exit 1
fi

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Set up environment variables
echo "🔐 Setting up environment variables..."
echo "Please set the following secrets:"
echo "   wrangler secret put TMDB_API_KEY"
echo "   (Enter your TMDB API key when prompted)"

# Test the setup
echo "🧪 Testing the setup..."
echo "Starting development server..."
echo "Press Ctrl+C to stop the server"
echo ""

# Start development server
npm run dev
