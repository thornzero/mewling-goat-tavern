# IVR Audio Converter

A standalone system tool for converting audio files to IVR-appropriate format. This tool optimizes audio files for phone systems, VoIP providers, and IVR applications.

## Features

- **Phone System Optimized**: Converts audio to mono, 8kHz, 16-bit PCM format
- **Frequency Filtering**: Applies phone-optimized frequency filtering (300Hz-3400Hz)
- **Volume Normalization**: Prevents clipping with conservative audio processing
- **Multiple Tool Support**: Works with both `sox` (preferred) and `ffmpeg`
- **Flexible Input**: Supports WAV, MP3, and other common audio formats
- **Verbose Output**: Detailed logging and progress information
- **Dry Run Mode**: Preview conversions without actually processing files

## Installation

The tool is installed as a system command and can be used from anywhere:

```bash
# The tool is already installed at:
/usr/local/bin/ivr-audio-converter

# Or use the script directly:
./scripts/ivr-audio-converter
```

## Requirements

The tool requires either `sox` (preferred) or `ffmpeg` to be installed:

```bash
# Install sox (recommended)
sudo apt install sox

# Or install ffmpeg
sudo apt install ffmpeg
```

## Usage

### Basic Usage

```bash
# Convert with default settings (8kHz, auto-generated output name)
ivr-audio-converter input.wav

# Convert with custom output name
ivr-audio-converter input.mp3 output_ivr.wav

# Convert with custom sample rate
ivr-audio-converter input.wav -r 16000
```

### Advanced Options

```bash
# Verbose output with detailed information
ivr-audio-converter input.wav -v

# Dry run to see what would be done
ivr-audio-converter input.wav -n

# Custom output file and sample rate
ivr-audio-converter input.mp3 -o custom_output.wav -r 8000

# Get help
ivr-audio-converter --help
```

### Command Line Options

| Option              | Description             | Default        |
| ------------------- | ----------------------- | -------------- |
| `-r, --rate RATE`   | Sample rate in Hz       | 8000           |
| `-o, --output FILE` | Output file path        | Auto-generated |
| `-v, --verbose`     | Verbose output          | false          |
| `-n, --dry-run`     | Show what would be done | false          |
| `-h, --help`        | Show help message       | -              |

## Output Format

The converter produces audio files optimized for:

- **Callcentric** and other VoIP providers
- **FreePBX** and Asterisk systems
- **General phone system compatibility**
- **Clear voice transmission** over phone lines

### Technical Specifications

- **Channels**: Mono (single channel)
- **Sample Rate**: 8000 Hz (configurable)
- **Bit Depth**: 16-bit signed PCM
- **Frequency Range**: 300Hz - 3400Hz (phone-optimized)
- **Volume**: Normalized to -6dB to prevent clipping
- **Format**: WAV (PCM s16le)

## Examples

### Convert a single file

```bash
ivr-audio-converter greeting.wav
# Output: greeting_ivr_8000Hz.wav
```

### Convert with custom settings

```bash
ivr-audio-converter announcement.mp3 -o ivr_announcement.wav -r 8000 -v
```

### Batch conversion script

```bash
#!/bin/bash
# Convert all WAV files in current directory
for file in *.wav; do
    ivr-audio-converter "$file" -v
done
```

### Preview conversion

```bash
ivr-audio-converter input.wav -n -v
# Shows what would be done without actually converting
```

## Integration with Existing Scripts

You can easily integrate this tool into your existing audio processing scripts:

```bash
# Replace the convert_to_pcm8k function with:
convert_to_pcm8k() {
    local in="$1"
    local out="$2"
    ivr-audio-converter "$in" -o "$out" -r 8000
}
```

## Troubleshooting

### Common Issues

1. **"No audio processing tool found"**
   - Install sox: `sudo apt install sox`
   - Or install ffmpeg: `sudo apt install ffmpeg`

2. **"Input file does not exist"**
   - Check the file path and ensure the file exists
   - Use absolute paths if needed

3. **Permission denied**
   - Ensure the script is executable: `chmod +x ivr-audio-converter`
   - Check write permissions for the output directory

### Debug Mode

Use verbose mode to see detailed information about the conversion process:

```bash
ivr-audio-converter input.wav -v
```

## Technical Details

### Audio Processing Pipeline

1. **Input Validation**: Check file existence and format
2. **Tool Detection**: Automatically detect sox or ffmpeg
3. **Format Conversion**: Convert to target sample rate and channels
4. **Frequency Filtering**: Apply phone-optimized bandpass filter
5. **Volume Normalization**: Apply conservative gain to prevent clipping
6. **Output Generation**: Write optimized audio file

### Frequency Filtering

The tool applies a bandpass filter with:

- **High-pass filter**: 300Hz (removes low-frequency noise)
- **Low-pass filter**: 3400Hz (removes high-frequency artifacts)
- **Purpose**: Optimize for phone system frequency response

### Volume Processing

- **Normalization**: -6dB to prevent clipping
- **Additional gain**: -3dB for conservative levels
- **Result**: Consistent volume levels across different input files

## License

This tool is part of the Mewling Goat Tavern project and follows the same licensing terms.
