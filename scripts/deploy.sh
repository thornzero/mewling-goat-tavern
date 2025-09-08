#!/bin/bash

# Mewling Goat Tavern - Deployment Script
# Deploys both backend and frontend to Cloudflare Workers

set -e

echo "🚀 Starting deployment of Mewling Goat Tavern..."

# Deploy Backend
echo "📦 Deploying backend..."
cd backend
npm run deploy
echo "✅ Backend deployed successfully"

# Deploy Frontend  
echo "📦 Deploying frontend..."
cd src/frontend
npm run deploy
echo "✅ Frontend deployed successfully"

echo "🎉 Deployment complete!"
echo ""
echo "🌐 Live URLs:"
echo "  Application: https://mewling-goat-backend.tavern-b8d.workers.dev"
echo "  Backend:  https://mewling-goat-backend.tavern-b8d.workers.dev/api"
