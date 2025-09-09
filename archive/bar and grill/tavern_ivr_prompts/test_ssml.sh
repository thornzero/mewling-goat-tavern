#!/usr/bin/env bash
# Test SSML support with Home Assistant TTS engines

set -euo pipefail

HA_URL="${HA_URL:-http://hfil.local:8123}"
HA_TOKEN="${HA_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjMWUyNjFjNjU0NjE0YzI4OGM4YjRhNjQ2N2U1MGJkZiIsImlhdCI6MTc1NzQyOTc0MCwiZXhwIjoyMDcyNzg5NzQwfQ.HR_k9aOJF7m417iJnK5hjgxcbUy75dkFC2G6-oP98Zw}"

echo "Testing SSML Support with Home Assistant TTS"
echo "============================================="
echo

# Test function
test_ssml() {
  local engine="$1"
  local test_name="$2"
  local message="$3"
  
  echo "Testing: $test_name"
  echo "Engine: $engine"
  echo "Message: $message"
  
  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"engine_id\": \"tts.$engine\",
      \"message\": \"$message\",
      \"options\": {
        \"preferred_format\": \"wav\"
      }
    }" \
    "$HA_URL/api/tts_get_url")
  
  http_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | head -n -1)
  
  if [[ "$http_code" == "200" ]]; then
    echo "✅ SUCCESS"
    if echo "$response_body" | jq -e '.url' > /dev/null 2>&1; then
      local url=$(echo "$response_body" | jq -r '.url')
      echo "   URL: $url"
    fi
  else
    echo "❌ FAILED (HTTP $http_code)"
    echo "   Response: $response_body"
  fi
  echo
}

# Test with both engines
for engine in "piper" "home_assistant_cloud"; do
  echo "=== Testing $engine ==="
  echo
  
  # Test 1: Basic text (control)
  test_ssml "$engine" "Basic Text" "Hello world"
  
  # Test 2: Simple pause syntax
  test_ssml "$engine" "Simple Pause" "Hello [[pau 500]] world"
  
  # Test 3: SSML break tags
  test_ssml "$engine" "SSML Break" "<speak>Hello <break time=\"500ms\"/> world</speak>"
  
  # Test 4: SSML prosody (rate/pitch)
  test_ssml "$engine" "SSML Prosody" "<speak><prosody rate=\"slow\">Hello world</prosody></speak>"
  
  # Test 5: SSML emphasis
  test_ssml "$engine" "SSML Emphasis" "<speak>Hello <emphasis level=\"strong\">world</emphasis></speak>"
  
  # Test 6: SSML say-as
  test_ssml "$engine" "SSML Say-As" "<speak>Call <say-as interpret-as=\"telephone\">555-1234</say-as></speak>"
  
  # Test 7: SSML phoneme
  test_ssml "$engine" "SSML Phoneme" "<speak><phoneme alphabet=\"ipa\" ph=\"həˈloʊ\">hello</phoneme> world</speak>"
  
  # Test 8: Complex SSML
  test_ssml "$engine" "Complex SSML" "<speak>Welcome to <break time=\"300ms\"/> <prosody rate=\"slow\">The Mewling Goat Tavern</prosody> <break time=\"500ms\"/> Press <emphasis level=\"strong\">1</emphasis> for hours</speak>"
  
  # Test 9: espeak-ng style pauses
  test_ssml "$engine" "espeak-ng Style" "Hello [[slnc 500]] world"
  
  # Test 10: Multiple pause types
  test_ssml "$engine" "Multiple Pauses" "Hello [[pau 200]] [[pau 300]] world"
  
  echo "--- End $engine tests ---"
  echo
done

echo "SSML Testing Complete!"
echo
echo "Summary:"
echo "- ✅ = SSML command worked"
echo "- ❌ = SSML command failed"
echo "- Check the generated URLs to listen to the actual audio output"
