# =============================================================================
# Mewling Goat Tavern - Movie Poll Application
# =============================================================================
# Modern TypeScript + Astro + Cloudflare Workers + D1 Backend

# =============================================================================
# FRONTEND COMMANDS (now in backend/src/frontend/)
# =============================================================================

# Build frontend (Astro)
build-frontend:
	cd backend/src/frontend && npm run build

# Start frontend development server
dev-frontend:
	cd backend/src/frontend && npm run dev

# Install frontend dependencies
install-frontend:
	cd backend/src/frontend && npm install

# =============================================================================
# BACKEND COMMANDS
# =============================================================================

# Deploy backend to Cloudflare Workers
deploy-backend:
	cd backend && npm run deploy

# Start backend development server
dev-backend:
	cd backend && npm run dev

# Run backend tests
test-backend:
	cd backend && npm test

# Run D1 database migrations
migrate:
	cd backend && npm run db:migrate

# Run D1 database migrations on remote
migrate-remote:
	cd backend && npm run db:migrate --remote

# Reset D1 database (DANGER: deletes all data)
reset-db:
	cd backend && npm run db:reset

# Install backend dependencies
install-backend:
	cd backend && npm install

# =============================================================================
# FULL STACK COMMANDS
# =============================================================================

# Install all dependencies
install: install-frontend install-backend

# Build everything (frontend + backend)
build: build-frontend

# Deploy everything using deployment script
deploy:
	./scripts/deploy.sh

# Development mode (both frontend and backend)
dev: dev-backend dev-frontend

# =============================================================================
# DATABASE COMMANDS
# =============================================================================

# Check database status
db-status:
	cd backend && npx wrangler d1 execute mewlinggoat_db --command="SELECT COUNT(*) as movie_count FROM movies;" --remote

# List movies in database
db-movies:
	cd backend && npx wrangler d1 execute mewlinggoat_db --command="SELECT title, year, tmdb_id FROM movies ORDER BY title;" --remote

# Seed database with movies
seed-db:
	node scripts/seed-movies-improved.js

# =============================================================================
# TESTING COMMANDS
# =============================================================================

# Test backend API endpoints
test-api:
	@echo "Testing backend API..."
	@curl -s "https://mewling-goat-backend.tavern-b8d.workers.dev/?action=debug" | jq .
	@echo "\nTesting listMovies endpoint..."
	@curl -s "https://mewling-goat-backend.tavern-b8d.workers.dev/?action=listMovies" | jq .

# Test frontend API endpoints
test-frontend-api:
	@echo "Testing frontend API proxy..."
	@curl -s "https://mewling-goat-backend.tavern-b8d.workers.dev/api?action=debug" | jq .
	@echo "\nTesting listMovies proxy..."
	@curl -s "https://mewling-goat-backend.tavern-b8d.workers.dev/api?action=listMovies" | jq .

# Test everything
test: test-backend test-frontend-api

# =============================================================================
# CLEANUP COMMANDS
# =============================================================================

# Clean generated files
clean:
	rm -rf backend/src/frontend/dist/*
	rm -rf backend/seed-movies.sql

# Clean node_modules
clean-deps:
	rm -rf backend/src/frontend/node_modules
	rm -rf backend/node_modules

# Clean everything
clean-all: clean clean-deps

# =============================================================================
# UTILITY COMMANDS
# =============================================================================

# Open live frontend in browser
open:
	open https://mewling-goat-backend.tavern-b8d.workers.dev/

# Open test page
open-test:
	open https://mewling-goat-backend.tavern-b8d.workers.dev/test

# Open results page
open-results:
	open https://mewling-goat-backend.tavern-b8d.workers.dev/results

# Open backend API directly
open-backend:
	open https://mewling-goat-backend.tavern-b8d.workers.dev/

# Show project status
status:
	@echo "=== Mewling Goat Tavern - Movie Poll Application ==="
	@echo "Frontend: Astro + TypeScript + Tailwind CSS + Swiper.js"
	@echo "Backend: Cloudflare Workers + D1 + TMDB API"
	@echo ""
	@echo "Frontend URL: https://mewling-goat-backend.tavern-b8d.workers.dev/"
	@echo "Backend URL: https://mewling-goat-backend.tavern-b8d.workers.dev"
	@echo ""
	@echo "Available commands:"
	@echo "  make build          - Build frontend"
	@echo "  make dev            - Start development servers"
	@echo "  make deploy         - Deploy everything"
	@echo "  make test           - Test all APIs"
	@echo "  make db-status      - Check database status"
	@echo "  make open           - Open frontend in browser"
	@echo "  make help           - Show detailed help"

# =============================================================================
# HELP
# =============================================================================

# Show detailed help
help:
	@echo "=== Mewling Goat Tavern - Movie Poll Application ==="
	@echo ""
	@echo "FRONTEND COMMANDS:"
	@echo "  make build-frontend  - Build Astro frontend"
	@echo "  make dev-frontend    - Start frontend development server"
	@echo "  make deploy-frontend - Deploy frontend to Cloudflare Workers"
	@echo "  make lint-frontend   - Lint frontend code"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo ""
	@echo "BACKEND COMMANDS:"
	@echo "  make deploy-backend  - Deploy backend to Cloudflare Workers"
	@echo "  make dev-backend     - Start backend development server"
	@echo "  make test-backend    - Run backend tests"
	@echo "  make migrate         - Run database migrations locally"
	@echo "  make migrate-remote  - Run database migrations on remote"
	@echo "  make reset-db        - Reset database (DANGER: deletes all data)"
	@echo "  make install-backend - Install backend dependencies"
	@echo ""
	@echo "FULL STACK COMMANDS:"
	@echo "  make install         - Install all dependencies"
	@echo "  make build           - Build everything"
	@echo "  make deploy          - Deploy everything using deployment script"
	@echo "  make dev             - Start development mode (both services)"
	@echo ""
	@echo "DATABASE COMMANDS:"
	@echo "  make db-status       - Check database status"
	@echo "  make db-movies       - List movies in database"
	@echo "  make seed-db         - Seed database with movies"
	@echo ""
	@echo "TESTING COMMANDS:"
	@echo "  make test-api        - Test backend API endpoints"
	@echo "  make test-frontend-api - Test frontend API proxy"
	@echo "  make test            - Test everything"
	@echo ""
	@echo "CLEANUP COMMANDS:"
	@echo "  make clean           - Clean generated files"
	@echo "  make clean-deps      - Clean node_modules"
	@echo "  make clean-all       - Clean everything"
	@echo ""
	@echo "UTILITY COMMANDS:"
	@echo "  make open            - Open frontend in browser"
	@echo "  make open-test       - Open test page"
	@echo "  make open-results    - Open results page"
	@echo "  make open-backend    - Open backend API"
	@echo "  make status          - Show project status"
	@echo "  make help            - Show this help message"

.PHONY: build-frontend dev-frontend deploy-frontend lint-frontend install-frontend
.PHONY: deploy-backend dev-backend test-backend migrate migrate-remote reset-db install-backend
.PHONY: install build deploy dev
.PHONY: db-status db-movies seed-db
.PHONY: test-api test-frontend-api test
.PHONY: clean clean-deps clean-all
.PHONY: open open-test open-results open-backend status help