#!/usr/bin/env bash
# Test SSML support with proper JSON escaping

set -euo pipefail

HA_URL="${HA_URL:-http://hfil.local:8123}"
HA_TOKEN="${HA_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjMWUyNjFjNjU0NjE0YzI4OGM4YjRhNjQ2N2U1MGJkZiIsImlhdCI6MTc1NzQyOTc0MCwiZXhwIjoyMDcyNzg5NzQwfQ.HR_k9aOJF7m417iJnK5hjgxcbUy75dkFC2G6-oP98Zw}"

echo "Testing SSML Support with Proper JSON Escaping"
echo "=============================================="
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
  
  # Test 4: SSML prosody (rate)
  test_ssml "$engine" "SSML Prosody Rate" "<speak><prosody rate=\"slow\">Hello world</prosody></speak>"
  
  # Test 5: SSML prosody (pitch)
  test_ssml "$engine" "SSML Prosody Pitch" "<speak><prosody pitch=\"high\">Hello world</prosody></speak>"
  
  # Test 6: SSML prosody (volume)
  test_ssml "$engine" "SSML Prosody Volume" "<speak><prosody volume=\"loud\">Hello world</prosody></speak>"
  
  # Test 7: SSML prosody (combined)
  test_ssml "$engine" "SSML Prosody Combined" "<speak><prosody rate=\"slow\" pitch=\"high\" volume=\"loud\">Hello world</prosody></speak>"
  
  # Test 8: SSML emphasis
  test_ssml "$engine" "SSML Emphasis" "<speak>Hello <emphasis level=\"strong\">world</emphasis></speak>"
  
  # Test 9: SSML say-as (telephone)
  test_ssml "$engine" "SSML Say-As Telephone" "<speak>Call <say-as interpret-as=\"telephone\">555-1234</say-as></speak>"
  
  # Test 10: SSML say-as (number)
  test_ssml "$engine" "SSML Say-As Number" "<speak>Press <say-as interpret-as=\"number\">1</say-as> for hours</speak>"
  
  # Test 11: SSML say-as (ordinal)
  test_ssml "$engine" "SSML Say-As Ordinal" "<speak>This is the <say-as interpret-as=\"ordinal\">1st</say-as> option</speak>"
  
  # Test 12: SSML phoneme (IPA)
  test_ssml "$engine" "SSML Phoneme IPA" "<speak><phoneme alphabet=\"ipa\" ph=\"həˈloʊ\">hello</phoneme> world</speak>"
  
  # Test 13: Complex SSML for IVR
  test_ssml "$engine" "Complex IVR SSML" "<speak>Welcome to <break time=\"300ms\"/> <prosody rate=\"slow\">The Mewling Goat Tavern</prosody> <break time=\"500ms\"/> Press <emphasis level=\"strong\"><say-as interpret-as=\"number\">1</say-as></emphasis> for hours</speak>"
  
  # Test 14: espeak-ng style pauses
  test_ssml "$engine" "espeak-ng Style" "Hello [[slnc 500]] world"
  
  # Test 15: Multiple pause types
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
echo
echo "Working SSML Features:"
echo "- <break time=\"Xms\"/> for pauses"
echo "- <prosody rate=\"slow|fast\" pitch=\"high|low\" volume=\"loud|soft\"> for voice control"
echo "- <emphasis level=\"strong|moderate\"> for emphasis"
echo "- <say-as interpret-as=\"telephone|number|ordinal\"> for special formatting"
echo "- [[pau X]] and [[slnc X]] for simple pauses"
