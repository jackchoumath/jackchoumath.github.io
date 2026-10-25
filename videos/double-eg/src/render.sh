#!/bin/bash
# usage: render.sh QUALITY(l|m|h|k) MEDIA_ROOT [Scene ...]
# Renders scenes in parallel (4 at a time), each with its own media dir so that
# the LaTeX caches do not race.  With no scene names, renders all of them.
Q=$1; ROOT=$2; shift 2
PY=${MANIM:-manim}
ALL="scenes_a:Hook scenes_a:Setup scenes_a:Coefficients scenes_a:Problem \
scenes_b:HorizonCut scenes_b:Flip \
scenes_c:DiagonalCut scenes_c:Chains scenes_c:Reverse scenes_c:Assemble scenes_c:Outro"
WANT="$*"
cd "$(dirname "$0")"
mkdir -p "$ROOT"
for item in $ALL; do
  f=${item%%:*}; s=${item##*:}
  if [ -n "$WANT" ] && [[ " $WANT " != *" $s "* ]]; then continue; fi
  while [ "$(jobs -r | wc -l)" -ge 4 ]; do sleep 2; done
  ( $PY -q$Q --media_dir "$ROOT/$s" --disable_caching $f.py $s > "$ROOT/$s.log" 2>&1 \
      && echo "ok   $s" || echo "FAIL $s (see $ROOT/$s.log)" ) &
done
wait
