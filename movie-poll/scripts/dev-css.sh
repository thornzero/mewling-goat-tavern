#!/bin/bash

# CSS watcher script for development
# Watch for CSS changes and rebuild
while true; do
  if inotifywait -e modify,create,delete -r ./static/css/input.css ./tailwind.config.js 2>/dev/null; then
    echo "🎨 CSS changed, rebuilding..."
    ./build-css.sh
  fi
done
