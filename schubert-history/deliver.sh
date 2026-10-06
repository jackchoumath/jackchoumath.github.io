#!/usr/bin/env bash
# Encode the deliverables from a clean master (rendered with --grain 0 --crf 12):
#   1. the repository copy: film grain added here, two-pass x264 at ~4.5 Mbit/s
#   2. a send copy under 30 MiB: no grain (grain is what compresses worst), ~2.9 Mbit/s
#
#   ./deliver.sh out/master75.mp4 schubert-history-75s.mp4 out/schubert-history-75s-send.mp4
set -euo pipefail
cd "$(dirname "$0")"
master=$1; repo=$2; send=$3
tmp=$(mktemp -d)
common=(-c:v libx264 -preset slower -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -x264-params colormatrix=bt709)
meta=(-metadata "title=Schubert Calculus, 1879 to today")

enc() {  # enc <in> <out> <video kbit/s> <audio kbit/s> <extra -vf or empty>
  local in=$1 out=$2 vb=$3 ab=$4 vf=$5
  local vfa=(); [ -n "$vf" ] && vfa=(-vf "$vf")
  (cd "$tmp" && ffmpeg -v error -y -i "$OLDPWD/$in" "${vfa[@]}" "${common[@]}" -b:v "${vb}k" -pass 1 -an -f null /dev/null)
  (cd "$tmp" && ffmpeg -v error -y -i "$OLDPWD/$in" "${vfa[@]}" "${common[@]}" -b:v "${vb}k" -pass 2 -c:a aac -b:a "${ab}k" -movflags +faststart "${meta[@]}" "$OLDPWD/$out")
  ls -la "$out"
}
enc "$master" "$repo" 4500 256 "noise=c0s=4:c0f=t+u"
enc "$master" "$send" 2900 160 ""
rm -rf "$tmp"
