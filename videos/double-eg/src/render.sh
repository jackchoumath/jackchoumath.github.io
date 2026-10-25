#!/bin/bash
# usage: render.sh QUALITY(l|m|h|k) MEDIA_ROOT [Scene ...]
# Renders scenes in parallel (4 at a time), each with its own media dir so that
# the LaTeX caches do not race.  With no scene names, renders all of them in order.
Q=$1; ROOT=$2; shift 2
PY=${MANIM:-manim}
ALL="scenes_a:ColdOpen scenes_a:Schubert scenes_a:PipeDreams scenes_a:Bumpless scenes_a:BackStable \
scenes_b:DoubleSchur scenes_b:Positivity scenes_b:Weapons scenes_b:Sword \
scenes_c:Glasses scenes_c:Gauntlet scenes_c:Theorem scenes_c:Outro"
WANT="$*"
cd "$(dirname "$0")"
for item in $ALL; do
  f=${item%%:*}; s=${item##*:}
  if [ -n "$WANT" ] && [[ " $WANT " != *" $s "* ]]; then continue; fi
  while [ "$(jobs -r | wc -l)" -ge 4 ]; do sleep 2; done
  ( $PY -q$Q --media_dir "$ROOT/$s" --disable_caching $f.py $s > "$ROOT/$s.log" 2>&1 \
      && echo "ok   $s" || echo "FAIL $s (see $ROOT/$s.log)" ) &
done
wait
