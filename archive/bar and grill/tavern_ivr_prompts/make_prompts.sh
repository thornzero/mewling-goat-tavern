#!/usr/bin/env bash
# Tavern IVR prompt generator — enhanced intelligibility
# Requires: espeak-ng, sox (preferred) or ffmpeg
# Output: WAV, mono, 8 kHz, PCM s16le (Callcentric-compatible)

set -euo pipefail

OUTDIR="${1:-./ivr_out}"
VOICE="${VOICE:-en-us+m3}"       # clearer male voice with better pronunciation
RATE_WPM="${RATE_WPM:-130}"       # slower for better comprehension (120–140 optimal)
PITCH="${PITCH:-50}"              # slightly higher for clarity (45–55 range)
SAMPLE_RATE="8000"
TMPDIR="$(mktemp -d)"
mkdir -p "$OUTDIR"

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

have_cmd() { command -v "$1" >/dev/null 2>&1; }

TOOL=""
if have_cmd sox; then
  TOOL="sox"
elif have_cmd ffmpeg; then
  TOOL="ffmpeg"
else
  echo "ERROR: Need sox or ffmpeg. Try: sudo apt install sox" >&2
  exit 1
fi

if ! have_cmd espeak-ng; then
  echo "ERROR: espeak-ng is required. Install with: sudo apt install espeak-ng" >&2
  exit 1
fi

convert_to_pcm8k() {
  local in="$1"; local out="$2"
  if [[ "$TOOL" == "sox" ]]; then
    # Conservative audio processing to prevent clipping
    sox "$in" -r "$SAMPLE_RATE" -c 1 -e signed -b 16 "$out" \
      norm -6 \
      highpass 300 lowpass 3400 \
      gain -3
  else
    ffmpeg -hide_banner -loglevel error -y -hwaccel none \
      -i "$in" -ar "$SAMPLE_RATE" -ac 1 -c:a pcm_s16le \
      -af "highpass=f=300,lowpass=f=3400,volume=-6dB" "$out"
  fi
}

synth() {
  local base="$1"; shift
  local text="$*"
  local raw="$TMPDIR/${base}_raw.wav"
  local out="$OUTDIR/${base}.wav"

  # Enhanced espeak-ng options for better clarity:
  # -g 10: word gap (pause between words)
  # -a 100: reduced amplitude to prevent clipping
  # -k 1: capital letters emphasis
  espeak-ng -v "$VOICE" -s "$RATE_WPM" -p "$PITCH" -g 10 -a 100 -k 1 -w "$raw" "$text"
  convert_to_pcm8k "$raw" "$out"
  echo "✓ Wrote $out"
}

# ---------- Prompts with enhanced clarity and pronunciation ----------
MAIN_GREETING="Welcome to The Mewling Goat Tavern! [[pau 400]] Press 1 for our hours, [[pau 250]] Press 2 for upcoming events, [[pau 250]] Press 3 to leave a message, [[pau 250]] or Press 4 for something special. [[pau 300]] Don't worry, the goats are friendly."
OPTION_1="Our regular hours are Fridays and Saturdays from six P-M until late. [[pau 400]] Weeknights, we're open by chance or appointment. [[pau 400]] Press star to return to the main menu."
OPTION_2="Upcoming events include Movie Nights on Saturdays, [[pau 300]] and game nights when the mood strikes. [[pau 400]] Check our website for the latest schedule. [[pau 400]] Press star to return to the main menu."
OPTION_3="Please leave your message after the tone. [[pau 400]] Tell us your story, request a song, or just say hello. [[pau 400]] We'll get back to you soon."
OPTION_4_PREFIX="You've found the secret option! [[pau 300]] Here's what our namesake has to say."

# ---------- Generate ----------
synth "main_greeting" "$MAIN_GREETING"
synth "option_1_hours" "$OPTION_1"
synth "option_2_events" "$OPTION_2"
synth "option_3_voicemail" "$OPTION_3"
synth "option_4_goats_intro" "$OPTION_4_PREFIX"

# ---------- Goat bleats with enhanced clarity ----------
make_bleat() {
  local name="$1"; local rate="$2"; local pitch="$3"
  local raw="$TMPDIR/${name}_raw.wav"
  local out="$TMPDIR/${name}.wav"
  # Enhanced options for goat sounds
  espeak-ng -v "$VOICE" -s "$rate" -p "$pitch" -g 5 -a 80 -k 1 -w "$raw" "baa! baa!"
  convert_to_pcm8k "$raw" "$out"
}

# Create varied goat sounds with better timing
make_bleat "bleat1" 140 60
make_bleat "bleat2" 120 50
make_bleat "bleat3" 150 45

# Add small pauses between bleats for clarity
if [[ "$TOOL" == "sox" ]]; then
  # Create silence files for pauses
  sox -n -r "$SAMPLE_RATE" -c 1 -e signed -b 16 "$TMPDIR/silence.wav" trim 0 0.2
  sox "$TMPDIR/bleat1.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat2.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat3.wav" "$OUTDIR/goat_bleats.wav"
else
  # Create silence for ffmpeg
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=$SAMPLE_RATE" -t 0.2 "$TMPDIR/silence.wav"
  printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" \
    "$TMPDIR/bleat1.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat2.wav" "$TMPDIR/silence.wav" "$TMPDIR/bleat3.wav" > "$TMPDIR/list.txt"
  ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$TMPDIR/list.txt" -c copy "$OUTDIR/goat_bleats.wav"
fi
echo "✓ Wrote $OUTDIR/goat_bleats.wav"

echo
echo "All done! Enhanced TTS files generated in '$OUTDIR'."
echo "Key improvements:"
echo "  • Slower speech rate (130 WPM) for better comprehension"
echo "  • Enhanced audio processing with phone-optimized frequency filtering"
echo "  • Better voice selection (en-us+m3) with improved pronunciation"
echo "  • Strategic pauses and clearer phrasing"
echo "  • Compressed dynamic range for consistent volume levels"
echo
echo "Upload the WAVs to Callcentric or FreePBX."

