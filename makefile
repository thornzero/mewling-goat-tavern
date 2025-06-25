# Build CSS from Tailwind source
css:
	cd docs && npx tailwindcss -i input.css -o output.css

# Watch for CSS changes and rebuild
watch:
	cd docs && npx tailwindcss -i input.css -o output.css --watch

# Clean generated files
clean:
	rm -f docs/output.css

# Build everything
build: css

# Development mode (watch for changes)
dev: watch

# Install dependencies (if needed)
install:
	cd docs && npm install

# Open live page in browser
open:
	open https://thornzero.github.io/mewling-goat-tavern/

# Help
help:
	@echo "Available commands:"
	@echo "  make css     - Build CSS from Tailwind source"
	@echo "  make watch   - Watch for changes and rebuild CSS"
	@echo "  make clean   - Remove generated files"
	@echo "  make build   - Build everything"
	@echo "  make dev     - Start development mode (watch)"
	@echo "  make install - Install dependencies"
	@echo "  make open    - Open live page in browser"
	@echo "  make help    - Show this help message"

.PHONY: css watch clean build dev install open help