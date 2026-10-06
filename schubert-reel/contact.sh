#!/usr/bin/env bash
# Render stills at the given times and tile them into out/contact.png.
#   ./contact.sh 0.5 1.5 3 4.5 ...
set -e
cd "$(dirname "$0")"
rm -rf out/stills
times=$(IFS=,; echo "$*")
node render.mjs --stills "$times" > /dev/null
files=$(ls out/stills/*.png | sort)
montage $files -tile 4x -geometry 960x540+6+6 -background '#222' -font DejaVu-Sans -pointsize 22 -fill white \
  -label '%t' out/contact.png 2>/dev/null || montage $files -tile 4x -geometry 960x540+6+6 out/contact.png
echo out/contact.png
