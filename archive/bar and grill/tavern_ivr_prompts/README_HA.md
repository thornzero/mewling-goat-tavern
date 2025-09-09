# Tavern IVR Prompt Generator (Home Assistant TTS)

This version uses the [Home Assistant TTS API](https://www.home-assistant.io/integrations/tts/) to generate high-quality speech audio for your IVR system.

## Prerequisites

1. **Home Assistant instance** running and accessible
2. **Long-lived access token** from Home Assistant
3. **TTS integration** configured (e.g., Google Translate, Microsoft, Amazon Polly)
4. **Dependencies**: `curl`, `jq`, `sox` (or `ffmpeg`)

## Installation

```bash
# Install dependencies
sudo apt update
sudo apt install -y curl jq sox  # or ffmpeg

# Make script executable
chmod +x ./make_prompts_ha.sh
```

## Configuration

### 1. Get Home Assistant Token

1. Open Home Assistant web interface
2. Go to **Profile** (click your user icon)
3. Scroll down to **Long-lived access tokens**
4. Click **Create token**
5. Give it a name like "IVR TTS Generator"
6. Copy the generated token

### 2. Set Environment Variables

```bash
# Required: Your Home Assistant access token
export HA_TOKEN="your_long_lived_access_token_here"

# Optional: Home Assistant URL (default: http://localhost:8123)
export HA_URL="http://your-ha-instance:8123"

# Optional: TTS Engine (default: piper)
export TTS_ENGINE="piper"  # or home_assistant_cloud, microsoft, amazon_polly, etc.

# Optional: Silence duration between goat bleats (default: 0.2 seconds)
export SILENCE_DURATION="0.2"  # Adjust pause length between goat sounds
```

### 3. Configure TTS Integration

Make sure you have a TTS integration configured in Home Assistant. Common options:

- **Google Translate TTS** (free, no setup required)
- **Microsoft TTS** (requires Azure account)
- **Amazon Polly** (requires AWS account)

## Usage

```bash
# Basic usage (uses default settings)
./make_prompts_ha.sh

# Specify output directory
./make_prompts_ha.sh ./my_ivr_files

# With custom settings
HA_URL="https://homeassistant.example.com" \
HA_TOKEN="your_token" \
TTS_ENGINE="microsoft" \
SILENCE_DURATION="0.5" \
./make_prompts_ha.sh
```

## Output

The script generates the following files in the output directory:

- `main_greeting.wav` - Main IVR greeting
- `option_1_hours.wav` - Hours information
- `option_2_events.wav` - Events information  
- `option_3_voicemail.wav` - Voicemail prompt
- `option_4_goats_intro.wav` - Secret option intro
- `goat_bleats.wav` - Goat sounds

All files are optimized for phone systems:

- **Format**: WAV, mono, 8kHz, 16-bit PCM
- **Frequency range**: 300-3400Hz (phone-optimized)
- **Volume**: Normalized to prevent clipping

## Advantages over espeak-ng

1. **Better voice quality** - Uses professional TTS engines
2. **More natural speech** - Better pronunciation and intonation
3. **SSML support** - Strategic pauses and speech control
4. **Multiple voice options** - Choose from various TTS providers
5. **Consistent quality** - No clipping or audio artifacts
6. **Easy configuration** - Change voices via Home Assistant UI

## Troubleshooting

### Connection Issues

```bash
# Test Home Assistant connection
curl -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/"

# Check if TTS is working
curl -H "Authorization: Bearer $HA_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"engine_id": "google_translate", "message": "test"}' \
     "$HA_URL/api/tts_get_url"
```

### Audio Quality Issues

- Try different TTS engines in Home Assistant
- Adjust `preferred_sample_rate` in the script (currently 22050Hz)
- Check Home Assistant logs for TTS errors

### Permission Issues

- Ensure the token has proper permissions
- Check Home Assistant configuration for TTS restrictions

## Customization

### Change Voice/Engine

Edit the `TTS_ENGINE` variable or set it as an environment variable:

```bash
# Use Microsoft TTS
export TTS_ENGINE="microsoft"

# Use Amazon Polly
export TTS_ENGINE="amazon_polly"
```

### Adjust Goat Bleat Timing

Control the pause duration between goat sounds:

```bash
# Shorter pauses (0.1 seconds)
export SILENCE_DURATION="0.1"

# Longer pauses (0.5 seconds)
export SILENCE_DURATION="0.5"

# No pauses between bleats
export SILENCE_DURATION="0"
```

### SSML Features

The script uses SSML (Speech Synthesis Markup Language) for better speech control:

**Working SSML Features:**

- `<speak>text</speak>` - Basic SSML wrapper
- `[[pau X]]` - Pauses in milliseconds
- `[[slnc X]]` - espeak-ng style pauses

**Example SSML Usage:**

```xml
<speak>Welcome to The Mewling Goat Tavern! [[pau 500]] Press 1 for our hours</speak>
```

**Note:** Advanced SSML features like `<prosody>`, `<emphasis>`, and `<say-as>` are not supported by the current TTS engines.

### Modify Prompts

Edit the text variables in the script:

- `MAIN_GREETING`
- `OPTION_1`, `OPTION_2`, `OPTION_3`
- `OPTION_4_PREFIX`

### Adjust Audio Processing

Modify the `convert_to_pcm8k()` function to change:

- Sample rate
- Frequency filtering
- Volume normalization

## Security Notes

- Store your `HA_TOKEN` securely
- Consider using a dedicated user account for this script
- Regularly rotate your access tokens
- Use HTTPS for remote Home Assistant instances
