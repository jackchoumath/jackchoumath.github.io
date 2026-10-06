#!/usr/bin/env bash
# Rebuild schubert-calculus.mp4 from source: cue sheet -> score -> picture -> mux.
set -euo pipefail
cd "$(dirname "$0")"
node cues.mjs > /dev/null
python3 audio.py out/score-raw.wav
# Two-pass linear loudness normalisation to -15 LUFS / -1 dBTP.
m=$(ffmpeg -hide_banner -nostats -i out/score-raw.wav -af loudnorm=I=-15:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$m" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i out/score-raw.wav -af "loudnorm=I=-15:TP=-1.0:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" -ar 48000 -c:a pcm_s16le out/score.wav
node render.mjs --workers 3 --blur 4 --preset slow --crf 17 --grain 5 --out out/picture.mp4
ffmpeg -v error -y -i out/picture.mp4 -i out/score.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart -metadata title="Schubert Calculus" schubert-calculus.mp4
echo "wrote schubert-calculus.mp4"
