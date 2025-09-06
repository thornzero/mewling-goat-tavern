# =============================================================================
# Mewling Goat Tavern - Movie Poll Application
# =============================================================================
# Modern TypeScript + Tailwind CSS + Cloudflare D1 Backend

# =============================================================================
# FRONTEND COMMANDS
# =============================================================================

# Build TypeScript and CSS
build:
	cd docs && npm run build

# Build TypeScript only
build-ts:
	cd docs && npm run build:ts

# Build CSS only
build-css:
	cd docs && npm run build:css:prod

# Watch for changes and rebuild
watch:
	cd docs && npm run dev

# Lint TypeScript code
lint:
	cd docs && npm run lint

# Fix linting issues
lint-fix:
	cd docs && npm run lint:fix

# Install frontend dependencies
install-frontend:
	cd docs && npm install

# =============================================================================
# BACKEND COMMANDS
# =============================================================================

# Deploy D1 backend to Cloudflare
deploy-backend:
	cd d1-backend/mewling-goat-backend && npm run deploy

# Start D1 backend development server
dev-backend:
	cd d1-backend/mewling-goat-backend && npm run dev

# Run D1 database migrations
migrate:
	cd d1-backend/mewling-goat-backend && npm run db:migrate

# Run D1 database migrations on remote
migrate-remote:
	cd d1-backend/mewling-goat-backend && npm run db:migrate --remote

# Reset D1 database (DANGER: deletes all data)
reset-db:
	cd d1-backend/mewling-goat-backend && npm run db:reset

# Install backend dependencies
install-backend:
	cd d1-backend/mewling-goat-backend && npm install

# =============================================================================
# FULL STACK COMMANDS
# =============================================================================

# Install all dependencies
install: install-frontend install-backend

# Build everything (frontend + backend)
build-all: build

# Deploy everything
deploy: deploy-backend

# Development mode (both frontend and backend)
dev: dev-backend

# =============================================================================
# DATABASE COMMANDS
# =============================================================================

# Check database status
db-status:
	cd d1-backend/mewling-goat-backend && npx wrangler d1 execute mewlinggoat_db --command="SELECT COUNT(*) as movie_count FROM movies;" --remote

# List movies in database
db-movies:
	cd d1-backend/mewling-goat-backend && npx wrangler d1 execute mewlinggoat_db --command="SELECT title, year, tmdb_id FROM movies ORDER BY title;" --remote

# =============================================================================
# TESTING COMMANDS
# =============================================================================

# Test D1 backend API
test-backend:
	@echo "Testing D1 backend API..."
	@curl -s "https://mewling-goat-backend.tavern-b8d.workers.dev/?action=debug" | jq .
	@echo "\nTesting listMovies endpoint..."
	@curl -s "https://mewling-goat-backend.tavern-b8d.workers.dev/?action=listMovies" | jq .

# Test frontend build
test-frontend:
	cd docs && npm run build && echo "Frontend build successful!"

# =============================================================================
# CLEANUP COMMANDS
# =============================================================================

# Clean generated files
clean:
	rm -rf docs/dist/*
	rm -rf docs/build/output.css
	rm -rf d1-backend/mewling-goat-backend/seed-movies.sql

# Clean node_modules
clean-deps:
	rm -rf docs/node_modules
	rm -rf d1-backend/mewling-goat-backend/node_modules

# =============================================================================
# UTILITY COMMANDS
# =============================================================================

# Open live page in browser
open:
	open https://moviepoll.mewling-goat-tavern.online/

# Open test page
open-test:
	open https://moviepoll.mewling-goat-tavern.online/test

# Open admin page
open-admin:
	open https://moviepoll.mewling-goat-tavern.online/admin

# Open results page
open-results:
	open https://moviepoll.mewling-goat-tavern.online/results

# Show project status
status:
	@echo "=== Mewling Goat Tavern - Movie Poll Application ==="
	@echo "Frontend: TypeScript + Tailwind CSS + Swiper.js"
	@echo "Backend: Cloudflare D1 + Workers + TMDB API"
	@echo ""
	@echo "Frontend URL: https://moviepoll.mewling-goat-tavern.online/"
	@echo "Backend URL: https://mewling-goat-backend.tavern-b8d.workers.dev"
	@echo ""
	@echo "Available commands:"
	@echo "  make build          - Build frontend (TypeScript + CSS)"
	@echo "  make dev            - Start backend development server"
	@echo "  make deploy-backend - Deploy backend to Cloudflare"
	@echo "  make migrate        - Run database migrations"
	@echo "  make test-backend   - Test backend API endpoints"
	@echo "  make db-status      - Check database status"
	@echo "  make open           - Open live page in browser"
	@echo "  make help           - Show detailed help"

# =============================================================================
# HELP
# =============================================================================

# Show detailed help
help:
	@echo "=== Mewling Goat Tavern - Movie Poll Application ==="
	@echo ""
	@echo "FRONTEND COMMANDS:"
	@echo "  make build          - Build TypeScript and CSS"
	@echo "  make build-ts       - Build TypeScript only"
	@echo "  make build-css      - Build CSS only"
	@echo "  make watch          - Watch for changes and rebuild"
	@echo "  make lint           - Lint TypeScript code"
	@echo "  make lint-fix        - Fix linting issues"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo ""
	@echo "BACKEND COMMANDS:"
	@echo "  make deploy-backend - Deploy D1 backend to Cloudflare"
	@echo "  make dev-backend    - Start D1 backend development server"
	@echo "  make migrate        - Run database migrations locally"
	@echo "  make migrate-remote - Run database migrations on remote"
	@echo "  make reset-db       - Reset database (DANGER: deletes all data)"
	@echo "  make install-backend - Install backend dependencies"
	@echo ""
	@echo "FULL STACK COMMANDS:"
	@echo "  make install        - Install all dependencies"
	@echo "  make build-all      - Build everything"
	@echo "  make deploy         - Deploy everything"
	@echo "  make dev            - Start development mode"
	@echo ""
	@echo "DATABASE COMMANDS:"
	@echo "  make db-status      - Check database status"
	@echo "  make db-movies      - List movies in database"
	@echo ""
	@echo "TESTING COMMANDS:"
	@echo "  make test-backend   - Test D1 backend API"
	@echo "  make test-frontend  - Test frontend build"
	@echo ""
	@echo "CLEANUP COMMANDS:"
	@echo "  make clean          - Clean generated files"
	@echo "  make clean-deps     - Clean node_modules"
	@echo ""
	@echo "UTILITY COMMANDS:"
	@echo "  make open           - Open live page in browser"
	@echo "  make open-test      - Open test page"
	@echo "  make open-admin     - Open admin page"
	@echo "  make open-results   - Open results page"
	@echo "  make status         - Show project status"
	@echo "  make help           - Show this help message"

.PHONY: build build-ts build-css watch lint lint-fix install-frontend
.PHONY: deploy-backend dev-backend migrate migrate-remote reset-db install-backend
.PHONY: install build-all deploy dev
.PHONY: db-status db-movies
.PHONY: test-backend test-frontend
.PHONY: clean clean-deps
.PHONY: open open-test open-admin open-results status help