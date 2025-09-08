Tavern IVR Prompt Generator (v2)
--------------------------------
This version prefers **sox** for resampling/concat to avoid ffmpeg/VAAPI
symbol lookup errors on some distros. If sox isn't present, it falls back
to ffmpeg and forces software decode with `-hwaccel none`.

Install:
  sudo apt update
  sudo apt install -y espeak-ng sox   # (ffmpeg optional)

Use:
  chmod +x ./make_prompts.sh
  ./make_prompts.sh ./ivr_out

If you still want ffmpeg:
  sudo apt install -y ffmpeg
