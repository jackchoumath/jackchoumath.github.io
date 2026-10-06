#!/usr/bin/env bash
# Render stills of film.html at the given times and tile them into out/contact.png.
set -e
cd "$(dirname "$0")"
rm -rf out/film-stills
times=$(IFS=,; echo "$*")
node render.mjs --html film.html --dir film-stills --stills "$times" > /dev/null
montage $(ls out/film-stills/*.png | sort) -tile 4x -geometry 960x540+6+6 -background '#222' out/contact.png
echo out/contact.png
