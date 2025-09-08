#!/usr/bin/env bash
# Tavern IVR prompt generator — improved intelligibility
# Requires: espeak-ng, sox (preferred) or ffmpeg
# Output: WAV, mono, 8 kHz, PCM s16le (Callcentric-compatible)

set -euo pipefail

OUTDIR="${1:-./ivr_out}"
VOICE="${VOICE:-mb-us2}"        # clearer female voice; try en-us+m3 for deep male
RATE_WPM="${RATE_WPM:-145}"       # slower, clearer speech (140–160 works well)
PITCH="${PITCH:-45}"              # 40–55 range keeps it natural
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
    sox "$in" -r "$SAMPLE_RATE" -c 1 -e signed -b 16 "$out" \
      norm -3 treble -2 bass +1
  else
    ffmpeg -hide_banner -loglevel error -y -hwaccel none \
      -i "$in" -ar "$SAMPLE_RATE" -ac 1 -c:a pcm_s16le "$out"
  fi
}

synth() {
  local base="$1"; shift
  local text="$*"
  local raw="$TMPDIR/${base}_raw.wav"
  local out="$OUTDIR/${base}.wav"

  espeak-ng -v "$VOICE" -s "$RATE_WPM" -p "$PITCH" -w "$raw" "$text"
  convert_to_pcm8k "$raw" "$out"
  echo "✓ Wrote $out"
}

# ---------- Prompts with pauses for clarity ----------
MAIN_GREETING="Welcome to The Mewling Goat Tavern! [[slnc 300]] Press 1 to hear our hours, [[slnc 200]] Press 2 for upcoming events, [[slnc 200]] Press 3 to leave us a message, [[slnc 200]] or Press 4 if you're feeling curious. [[slnc 200]] Don't worry, the goats don't bite."
OPTION_1="We are usually open when the lights are on and the drinks are flowing. [[slnc 300]] For now, our hours are Fridays and Saturdays from six p.m. until the last song ends. [[slnc 300]] Weeknights, by chance or by appointment. [[slnc 300]] Press star to return to the main menu."
OPTION_2="Upcoming gatherings at the Tavern include Movie Nights on Saturdays, [[slnc 200]] and game nights scattered whenever the dice roll right. [[slnc 300]] Check our website or socials for the latest schedule. [[slnc 300]] Press star to return to the main menu."
OPTION_3="Leave your message after the tone. [[slnc 300]] Tell us your tale, request a song, or let us know you stopped by. [[slnc 300]] We'll get back to you as soon as the barkeep puts down his mug."
OPTION_4_PREFIX="Ah, you've chosen the secret option! [[slnc 200]] Here's what the Tavern's namesake has to say."

# ---------- Generate ----------
synth "main_greeting" "$MAIN_GREETING"
synth "option_1_hours" "$OPTION_1"
synth "option_2_events" "$OPTION_2"
synth "option_3_voicemail" "$OPTION_3"
synth "option_4_goats_intro" "$OPTION_4_PREFIX"

# ---------- Goat bleats ----------
make_bleat() {
  local name="$1"; local rate="$2"; local pitch="$3"
  local raw="$TMPDIR/${name}_raw.wav"
  local out="$TMPDIR/${name}.wav"
  espeak-ng -v "$VOICE" -s "$rate" -p "$pitch" -w "$raw" "baa! baa!"
  convert_to_pcm8k "$raw" "$out"
}

make_bleat "bleat1" 160 65
make_bleat "bleat2" 130 55
make_bleat "bleat3" 180 45

if [[ "$TOOL" == "sox" ]]; then
  sox "$TMPDIR/bleat1.wav" "$TMPDIR/bleat2.wav" "$TMPDIR/bleat3.wav" "$OUTDIR/goat_bleats.wav"
else
  printf "file '%s'\nfile '%s'\nfile '%s'\n" "$TMPDIR/bleat1.wav" "$TMPDIR/bleat2.wav" "$TMPDIR/bleat3.wav" > "$TMPDIR/list.txt"
  ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$TMPDIR/list.txt" -c copy "$OUTDIR/goat_bleats.wav"
fi
echo "✓ Wrote $OUTDIR/goat_bleats.wav"

echo
echo "All done. Upload the WAVs in '$OUTDIR' to Callcentric or FreePBX."

