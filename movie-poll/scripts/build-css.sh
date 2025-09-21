#!/bin/bash

# Tailwind CSS build script
echo "🎨 Building Tailwind CSS..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Build CSS
cd "$PROJECT_DIR" || exit
./tailwindcss build \
  -i ./static/css/input.css \
  -o ./static/css/style.css \
  --config ./tailwind.config.js

echo "✅ CSS build complete!"
