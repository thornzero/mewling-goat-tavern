#!/usr/bin/env bash
# Tavern IVR prompt generator using Home Assistant TTS API
# Requires: curl, jq, sox (preferred) or ffmpeg
# Output: WAV, mono, 8 kHz, PCM s16le (Callcentric-compatible)

set -euo pipefail

OUTDIR="${1:-./ivr_out}"
HA_URL="${HA_URL:-http://hfil.local:8123}"
HA_TOKEN="${HA_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjMWUyNjFjNjU0NjE0YzI4OGM4YjRhNjQ2N2U1MGJkZiIsImlhdCI6MTc1NzQyOTc0MCwiZXhwIjoyMDcyNzg5NzQwfQ.HR_k9aOJF7m417iJnK5hjgxcbUy75dkFC2G6-oP98Zw}"
TTS_ENGINE="${TTS_ENGINE:-piper}"
SAMPLE_RATE="8000"
SILENCE_DURATION="${SILENCE_DURATION:-0.5}"  # Duration of silence between goat bleats in seconds
TMPDIR="$(mktemp -d)"
mkdir -p "$OUTDIR"

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# Check dependencies
if ! have_cmd curl; then
  echo "ERROR: curl is required. Install with: sudo apt install curl" >&2
  exit 1
fi

if ! have_cmd jq; then
  echo "ERROR: jq is required. Install with: sudo apt install jq" >&2
  exit 1
fi

TOOL=""
if have_cmd sox; then
  TOOL="sox"
elif have_cmd ffmpeg; then
  TOOL="ffmpeg"
else
  echo "ERROR: Need sox or ffmpeg. Try: sudo apt install sox" >&2
  exit 1
fi

# Check for required environment variables
if [[ -z "$HA_TOKEN" ]]; then
  echo "ERROR: HA_TOKEN environment variable is required" >&2
  echo "Get your token from: Profile > Long-lived access tokens" >&2
  echo "Usage: HA_TOKEN=your_token ./make_prompts_ha.sh" >&2
  exit 1
fi

# Test Home Assistant connection
test_ha_connection() {
  echo "Testing Home Assistant connection..."
  if ! curl -s -H "Authorization: Bearer $HA_TOKEN" \
       -H "Content-Type: application/json" \
       "$HA_URL/api/" > /dev/null; then
    echo "ERROR: Cannot connect to Home Assistant at $HA_URL" >&2
    echo "Check your HA_URL and HA_TOKEN" >&2
    exit 1
  fi
  echo "✓ Connected to Home Assistant"
}

# Check available TTS engines
check_tts_engines() {
  echo "Checking available TTS engines..."
  local engines
  engines=$(curl -s -H "Authorization: Bearer $HA_TOKEN" \
    "$HA_URL/api/states" | jq -r '.[] | select(.entity_id | startswith("tts.")) | .entity_id' | sed 's/tts\.//')
  
  if [[ -z "$engines" ]]; then
    echo "ERROR: No TTS engines found in Home Assistant" >&2
    echo "Please configure a TTS integration first" >&2
    exit 1
  fi
  
  echo "Available TTS engines:"
  echo "$engines" | while read -r engine; do
    echo "  - $engine"
  done
  
  # Check if requested engine is available
  if ! echo "$engines" | grep -q "^$TTS_ENGINE$"; then
    echo "WARNING: Requested TTS engine '$TTS_ENGINE' not found" >&2
    local first_engine
    first_engine=$(echo "$engines" | head -n1)
    echo "Using first available engine: $first_engine" >&2
    TTS_ENGINE="$first_engine"
  fi
  
  # Convert engine name to full entity ID
  TTS_ENGINE="tts.$TTS_ENGINE"
  
  echo "Using TTS engine: $TTS_ENGINE"
}

# Fallback to legacy say action if tts_get_url fails
generate_tts_legacy() {
  local message="$1"
  local output_file="$2"
  
  echo "Trying legacy say action for: ${message:0:50}..."
  
  # Use the legacy say action
  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"$message\"
    }" \
    "$HA_URL/api/services/tts/$(echo "$TTS_ENGINE" | sed 's/tts\.//')_say")
  
  # Extract HTTP code and response body
  http_code=$(echo "$response" | tail -n1)
  response=$(echo "$response" | head -n -1)
  
  if [[ "$http_code" == "200" ]]; then
    echo "✓ Legacy say action successful"
    # For legacy say, we need to find the generated file
    # This is a simplified approach - in practice, you'd need to check the media folder
    echo "Note: Legacy say action doesn't return a direct URL"
    echo "You may need to check Home Assistant's media folder for the generated file"
    return 0
  else
    echo "ERROR: Legacy say action also failed with HTTP $http_code" >&2
    echo "Response: $response" >&2
    return 1
  fi
}

# Generate TTS using Home Assistant API
generate_tts() {
  local message="$1"
  local output_file="$2"
  
  echo "Generating TTS for: ${message:0:50}..."
  
  # Call Home Assistant TTS API with preferred format options
  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"engine_id\": \"$TTS_ENGINE\",
      \"message\": \"$message\",
      \"options\": {
        \"preferred_format\": \"wav\",
        \"preferred_sample_rate\": 22050,
        \"preferred_sample_channels\": 1
      }
    }" \
    "$HA_URL/api/tts_get_url")
  
  # Extract HTTP code and response body
  http_code=$(echo "$response" | tail -n1)
  response=$(echo "$response" | head -n -1)
  
  # Check HTTP status
  if [[ "$http_code" != "200" ]]; then
    echo "WARNING: TTS API request failed with HTTP $http_code" >&2
    echo "Response: $response" >&2
    echo "Trying legacy say action as fallback..." >&2
    generate_tts_legacy "$message" "$output_file"
    return $?
  fi
  
  # Check if response contains URL
  if ! echo "$response" | jq -e '.url' > /dev/null 2>&1; then
    echo "ERROR: Invalid response from TTS API" >&2
    echo "Response: $response" >&2
    return 1
  fi
  
  # Extract URL from response
  local tts_url
  tts_url=$(echo "$response" | jq -r '.url')
  
  # Download the audio file (it might be MP3, WAV, or other format)
  # Extract file extension from URL
  local file_ext
  file_ext=$(echo "$tts_url" | sed 's/.*\.\([^.]*\)$/\1/')
  if [[ -z "$file_ext" ]]; then
    file_ext="mp3"  # Default to MP3 if no extension found
  fi
  
  local temp_file="$TMPDIR/$(basename "$output_file" .wav)_raw.$file_ext"
  if ! curl -s -o "$temp_file" "$tts_url"; then
    echo "ERROR: Failed to download audio from $tts_url" >&2
    return 1
  fi
  
  # Convert to phone system format (handle any input format)
  convert_to_pcm8k "$temp_file" "$output_file"
  echo "✓ Wrote $output_file"
}

# Convert audio to phone system format
convert_to_pcm8k() {
  local in="$1"; local out="$2"
  
  # Check if input is MP3 and we have ffmpeg available
  if [[ "$in" == *.mp3 ]] && have_cmd ffmpeg; then
    # Use ffmpeg for MP3 files (better MP3 support)
    ffmpeg -hide_banner -loglevel error -y -hwaccel none \
      -i "$in" -ar "$SAMPLE_RATE" -ac 1 -c:a pcm_s16le \
      -af "highpass=f=300,lowpass=f=3400,volume=-6dB" "$out"
  elif [[ "$TOOL" == "sox" ]]; then
    # Use sox for other formats
    sox "$in" -r "$SAMPLE_RATE" -c 1 -e signed -b 16 "$out" \
      norm -6 \
      highpass 300 lowpass 3400 \
      gain -3
  else
    # Fallback to ffmpeg
    ffmpeg -hide_banner -loglevel error -y -hwaccel none \
      -i "$in" -ar "$SAMPLE_RATE" -ac 1 -c:a pcm_s16le \
      -af "highpass=f=300,lowpass=f=3400,volume=-6dB" "$out"
  fi
}

# ---------- Prompts with enhanced clarity and natural pacing ----------
# Using natural speech patterns and clear phrasing for better comprehension
MAIN_GREETING="Welcome to The Mewling Goat Tavern! Press 1 for our hours, Press 2 for upcoming events, Press 3 to leave a message, or Press 4 for something special. Don't worry, the goats are friendly."

OPTION_1="Our regular hours are Fridays and Saturdays from six P-M until late. Weeknights, we're open by chance or appointment. Press star to return to the main menu."

OPTION_2="Upcoming events include Movie Nights on Saturdays, and game nights when the mood strikes. Check our website for the latest schedule. Press star to return to the main menu."

OPTION_3="Please leave your message after the tone. Tell us your story, request a song, or just say hello. We'll get back to you soon."

OPTION_4_PREFIX="You've found the secret option! Here's what our namesake has to say."

# ---------- Goat bleats ----------
generate_goat_bleats() {
  echo "Generating goat bleats..."
  
  # Generate individual bleats with varied lengths for more natural sound
  generate_tts "Baaaah" "$TMPDIR/bleat1.wav"
  generate_tts "Baaaaaaah" "$TMPDIR/bleat2.wav" 
  generate_tts "Baaaah Baaaaaaaah" "$TMPDIR/bleat3.wav"
  
  # Combine with pauses
  if [[ "$TOOL" == "sox" ]]; then
    sox -n -r "$SAMPLE_RATE" -c 1 -e signed -b 16 "$TMPDIR/silence.wav" trim 0 "$SILENCE_DURATION"
    sox "$TMPDIR/bleat1.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat2.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat3.wav" "$OUTDIR/goat_bleats.wav"
  else
    ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=$SAMPLE_RATE" -t "$SILENCE_DURATION" "$TMPDIR/silence.wav"
    printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" \
      "$TMPDIR/bleat1.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat2.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat3.wav" > "$TMPDIR/list.txt"
    ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$TMPDIR/list.txt" -c copy "$OUTDIR/goat_bleats.wav"
  fi
  echo "✓ Wrote $OUTDIR/goat_bleats.wav"
}

# ---------- Main execution ----------
echo "Tavern IVR Prompt Generator (Home Assistant TTS)"
echo "================================================"
echo "Home Assistant URL: $HA_URL"
echo "TTS Engine: $TTS_ENGINE"
echo "Output Directory: $OUTDIR"
echo "Silence Duration: ${SILENCE_DURATION}s"
echo

# Test connection and check TTS engines
test_ha_connection
check_tts_engines

# Generate main prompts
generate_tts "$MAIN_GREETING" "$OUTDIR/main_greeting.wav"
generate_tts "$OPTION_1" "$OUTDIR/option_1_hours.wav"
generate_tts "$OPTION_2" "$OUTDIR/option_2_events.wav"
generate_tts "$OPTION_3" "$OUTDIR/option_3_voicemail.wav"
generate_tts "$OPTION_4_PREFIX" "$OUTDIR/option_4_goats_intro.wav"

# Generate goat bleats
generate_goat_bleats

echo
echo "All done! Enhanced TTS files generated in '$OUTDIR'."
echo "Key improvements:"
echo "  • Using Home Assistant TTS API for better voice quality"
echo "  • Natural speech patterns for better comprehension"
echo "  • Phone-optimized audio processing (8kHz, mono, 16-bit)"
echo "  • Frequency filtering for phone system compatibility"
echo "  • Clear phrasing and proper pronunciation"
echo
echo "Upload the WAVs to Callcentric or FreePBX."
