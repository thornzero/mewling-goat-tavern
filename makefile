# Mewling Goat Tavern - Movie Poll Makefile
.PHONY: help dev start stop build clean test deps

.DEFAULT_GOAL := help

BINARY_NAME := server
BUILD_DIR := ./build

help: ## Show this help message
	@echo "Mewling Goat Tavern - Movie Poll"
	@echo "Built-in Features: Port management, graceful shutdown, auto-restart"
	@echo "Hot Reload: Go + Templ + CSS automatically rebuild on changes"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development
dev: ## Start development server with hot reloading (Go + Templ + CSS)
	@cd movie-poll && ./scripts/dev.sh

start: build ## Start the server (with built-in port management and graceful shutdown)
	@cd movie-poll && TMDB_API_KEY=test DB_PATH=./db/movie_poll.db ./$(BINARY_NAME)

start-bg: build ## Start the server in background
	@cd movie-poll && TMDB_API_KEY=test DB_PATH=./db/movie_poll.db ./$(BINARY_NAME) &
	@echo "Server started in background. Use 'make stop' to stop it."

stop: ## Stop all server instances gracefully
	@echo "🛑 Stopping all movie-poll servers..."
	@for port in 3000 3001 3002 3003 3004 3005; do \
		pid=$$(lsof -ti:$$port 2>/dev/null); \
		if [ -n "$$pid" ]; then \
			echo "Stopping server on port $$port (PID $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || true; \
		fi; \
	done
	@echo "✅ All servers stopped"

# Database management
db-stats: ## Show database statistics
	@cd movie-poll && go run cmd/db-manager/main.go stats

db-clean: ## Clean duplicate movies
	@cd movie-poll && go run cmd/db-manager/main.go clean

db-reset: ## Reset database (WARNING: deletes all data)
	@cd movie-poll && go run cmd/db-manager/main.go reset

db-movies: ## List all movies
	@cd movie-poll && go run cmd/db-manager/main.go movies

db-votes: ## List all votes
	@cd movie-poll && go run cmd/db-manager/main.go votes

db-delete-votes: ## Delete all votes
	@cd movie-poll && go run cmd/db-manager/main.go delete-votes

# Build targets
build: generate build-css ## Build the application
	@cd movie-poll && go build -o $(BINARY_NAME) .
	@echo "Build complete: $(BINARY_NAME)"

build-db-manager: ## Build the CLI database manager
	@cd movie-poll && go build -o $(BUILD_DIR)/db-manager ./cmd/db-manager
	@mv $(BUILD_DIR)/db-manager ./
	@chmod +x ./db-manager
	@echo "DB Manager built: ./db-manager"

build-css: ## Build CSS only
	@cd movie-poll && ./scripts/build-css.sh

# Production build
prod-build: generate build-css ## Build for production (optimized)
	@cd movie-poll && CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o $(BINARY_NAME) .
	@echo "Production build complete: $(BINARY_NAME)"

# Code generation
generate: ## Generate templ files
	@cd movie-poll && go run github.com/a-h/templ/cmd/templ@latest generate

# Dependencies
deps: ## Install dependencies
	@cd movie-poll && go mod tidy
	@cd movie-poll && go mod download

install-tools: ## Install development tools
	@go install github.com/a-h/templ/cmd/templ@latest
	@go install github.com/air-verse/air@latest

# Testing
test: ## Run tests
	@cd movie-poll && go test -v ./...

# Cleanup
clean: ## Clean build artifacts
	@cd movie-poll && rm -rf $(BUILD_DIR)
	@cd movie-poll && rm -f coverage.out coverage.html

kill: ## Force kill all running movie-poll processes
	@echo "💀 Force killing all movie-poll processes..."
	@for port in 3000 3001 3002 3003 3004 3005; do \
		pid=$$(lsof -ti:$$port 2>/dev/null); \
		if [ -n "$$pid" ]; then \
			echo "Force killing server on port $$port (PID $$pid)..."; \
			kill -9 $$pid 2>/dev/null || true; \
		fi; \
	done
	@cd movie-poll && ./scripts/cleanup.sh
	@echo "✅ All processes force killed"

# Railway deployment
deploy: prod-build ## Deploy to Railway
	@cd movie-poll && railway up

logs: ## View Railway logs
	@cd movie-poll && railway logs

railway-status: ## Check Railway deployment status
	@cd movie-poll && railway status

# Railpack commands (optional - requires railpack CLI)
railpack-build: ## Build with Railpack locally
	@cd movie-poll && railpack build

railpack-run: ## Run with Railpack locally
	@cd movie-poll && railpack run

# Status
status: ## Show project status
	@echo "Go Version: $$(go version)"
	@echo "Binary: $$(ls -la movie-poll/$(BINARY_NAME) 2>/dev/null || echo 'Not built')"
	@echo "Database: $$(ls -la movie-poll/db/movie_poll.db 2>/dev/null || echo 'Not found')"
	@echo "CSS: $$(ls -la movie-poll/static/css/style.css 2>/dev/null || echo 'Not built')"
	@echo "Running Processes:"
	@ps aux | grep -E "(movie-poll|$(BINARY_NAME))" | grep -v grep || echo "  No movie-poll processes running"
	@echo "Port 3000: $$(lsof -i :3000 2>/dev/null | grep LISTEN || echo '  Not in use')"
	@echo "Port 3001: $$(lsof -i :3001 2>/dev/null | grep LISTEN || echo '  Not in use')"