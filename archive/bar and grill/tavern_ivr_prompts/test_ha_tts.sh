#!/usr/bin/env bash
# Test Home Assistant TTS API

set -euo pipefail

HA_URL="${HA_URL:-http://hfil.local:8123}"
HA_TOKEN="${HA_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjMWUyNjFjNjU0NjE0YzI4OGM4YjRhNjQ2N2U1MGJkZiIsImlhdCI6MTc1NzQyOTc0MCwiZXhwIjoyMDcyNzg5NzQwfQ.HR_k9aOJF7m417iJnK5hjgxcbUy75dkFC2G6-oP98Zw}"

echo "Testing Home Assistant TTS API"
echo "==============================="
echo "URL: $HA_URL"
echo

# Test 1: Check available TTS engines
echo "1. Checking available TTS engines..."
engines=$(curl -s -H "Authorization: Bearer $HA_TOKEN" \
  "$HA_URL/api/states" | jq -r '.[] | select(.entity_id | startswith("tts.")) | .entity_id' | sed 's/tts\.//')

if [[ -z "$engines" ]]; then
  echo "❌ No TTS engines found"
  exit 1
fi

echo "✅ Available TTS engines:"
echo "$engines" | while read -r engine; do
  echo "   - $engine"
done

# Test 2: Try each engine with a simple message
echo
echo "2. Testing each TTS engine..."

for engine in $engines; do
  echo
  echo "Testing $engine..."
  
  # Test with minimal request using full entity ID
  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"engine_id\": \"tts.$engine\", \"message\": \"test\"}" \
    "$HA_URL/api/tts_get_url")
  
  http_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | head -n -1)
  
  if [[ "$http_code" == "200" ]]; then
    echo "✅ $engine: SUCCESS"
    if echo "$response_body" | jq -e '.url' > /dev/null 2>&1; then
      url=$(echo "$response_body" | jq -r '.url')
      echo "   URL: $url"
    fi
  else
    echo "❌ $engine: FAILED (HTTP $http_code)"
    echo "   Response: $response_body"
  fi
done

# Test 3: Try legacy say actions
echo
echo "3. Testing legacy say actions..."

for engine in $engines; do
  echo
  echo "Testing ${engine}_say..."
  
  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"test\"}" \
    "$HA_URL/api/services/tts/${engine}_say")
  
  http_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | head -n -1)
  
  if [[ "$http_code" == "200" ]]; then
    echo "✅ ${engine}_say: SUCCESS"
  else
    echo "❌ ${engine}_say: FAILED (HTTP $http_code)"
    echo "   Response: $response_body"
  fi
done

echo
echo "Test complete!"
