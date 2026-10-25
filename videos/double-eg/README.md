# Video: double Edelman–Greene coefficients

A 3Blue1Brown-style explainer (about 15 minutes) of the paper
*A positive combinatorial formula for the double Edelman–Greene coefficients*
by Jack Chou and Tianyi Yu ([arXiv:2512.12185](https://arxiv.org/abs/2512.12185)).

- `double-eg.mp4`: the video (1080p, chapter markers embedded)
- `double-eg.vtt`, `double-eg.srt`: subtitles

It explains the problem (Schubert polynomials, pipe dreams, bumpless pipe dreams,
the back-stable limit, double Schur functions, and the Lam–Lee–Shimozono positivity
theorem) and then the solution with its three "weapons": the sword of
Lam–Lee–Shimozono (cutting bumpless pipe dreams into trapezoids and triangles), the
glasses of Lenart–Sottile (pipes become chains in Bruhat order) and the gauntlet of
Samuel (swapping chain labels). The sword, glasses and gauntlet drawings come from
the talk slides in `slides/`.

## Rebuilding

Everything is in `src/`:

| file | what it does |
| --- | --- |
| `combinatorics.py` | pipe dreams, bumpless pipe dreams and Bruhat chains, with checks against divided differences |
| `diagrams.py` | computes and verifies every diagram shown, writes `diagrams.json` |
| `narration.py` | the script, with `{markers}` the animations sync to |
| `tts.py` | synthesizes the narration with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (a 70/30 blend of the `zf_xiaobei` and `af_nicole` voices) |
| `common.py`, `scenes_*.py` | the manim scenes |
| `render.sh`, `assemble.py` | render all scenes in parallel, then join them with chapters and subtitles |

```sh
pip install -r src/requirements.txt          # also needs LaTeX, dvisvgm, ffmpeg, espeak-ng
cd src
python combinatorics.py && python diagrams.py   # verify the math, regenerate diagrams.json
python tts.py /path/to/kokoro-model-dir         # kokoro-v1.0.onnx + voices-v1.0.bin
python lint_sync.py scenes_*.py                 # every animation sync point exists
NARRATION_LOG=/tmp/media/narration_log.jsonl ./render.sh h /tmp/media
python assemble.py /tmp/media ..
```

The narration audio is synthesized (no human voice was recorded).
