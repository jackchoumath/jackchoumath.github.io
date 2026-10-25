# Video: double Edelman–Greene coefficients

A 3Blue1Brown-style explainer of the paper
*A positive combinatorial formula for the double Edelman–Greene coefficients*
by Jack Chen-An Chou and Tianyi Yu ([arXiv:2512.12185](https://arxiv.org/abs/2512.12185)).

- `double-eg.mp4`: the video (1080p60, chapter markers embedded). It is narrated by a
  synthesized voice (Kyutai's [Pocket TTS](https://github.com/kyutai-labs/pocket-tts),
  cloned from the reference clip that ships with the model; no human voice was
  recorded for it). There are no captions and no music.

The whole video is one worked example in $S_\mathbb{Z}$, taken from the paper:
the coefficient of $s_{21}$ for $w = [1, -1, 0, 3, 4, 2]$ (on positions $-1, \ldots, 4$),

$$j^w_{(2,1)}(y) = (y_1 - y_0) + (y_3 - y_{-1}) + (y_2 - y_0).$$

After setting up bumpless pipe dreams, back stable Schubert functions, double Schur
functions and the positivity problem (Lam–Lee–Shimozono, Anderson), it follows the
paper's five steps on this example:

1. the horizon cut (Corollary 3.7): $\overleftarrow{\mathfrak S}_w = \sum_\sigma \overleftarrow{\mathfrak S}_\sigma\, \mathfrak S^\downarrow_{\sigma,w}$, here with $\sigma_1 = [1,0,-1]$ and $\sigma_2 = [2,0,-1,1]$;
2. the flip $\sigma \mapsto \neg\sigma$ (Corollary 3.9), so both factors are lower Schubert polynomials;
3. the diagonal cut (Proposition 3.11): a blank tile on the diagonal gives $x_i - y_i = 0$ at $x = y$,
   so only bottom pieces with a pipe in every diagonal tile count, and those are cut straight along
   the diagonal into a trapezoid and a triangle, glued along the boundary labels $\gamma$;
4. trapezoids as increasing chains from $U = [-1,1,0,3,4,2]$ to $W = [0,1,2,3,4,-1]$ (Proposition 4.10);
5. reversing the bars with Samuel's symmetry (Proposition 2.29), after which every chain
   gives $0$ or distinct type 3 forms (Proposition 4.17).

Steps 3 to 5 for $\sigma_1$ are the "example of the argument" in §4 of the paper.

One sign convention: for positivity to come out right (and for Proposition 2.6 to hold
already for $w = s_1$), $\omega_1$ has to send $x_i \mapsto -x_{1-i}$ and $y_i \mapsto -y_{1-i}$.
The paper prints it without the minus signs; the video uses the signed version.

## Rebuilding

Everything is in `src/`:

| file | what it does |
| --- | --- |
| `sz.py` | the paper's machinery on $S_\mathbb{Z}$: bumpless pipe dreams of any region, horizon and diagonal cuts, $\neg$ and $\omega_1$, increasing chains, Corollary 3.9 |
| `sz_example.py` | computes every diagram and formula shown for the running example, asserts each identity used on screen, writes `sz_data.json` |
| `common.py`, `scenes_*.py` | the manim scenes, drawn from `sz_data.json`; each `self.say("...")` is a line of narration, and the animations inside it run while it is spoken |
| `tts.py` | reads every `say()` line with Pocket TTS into `audio/`, checking each phrase with Whisper and regenerating it until it says what it should |
| `render.sh`, `assemble.py` | render all scenes in parallel, then join them with the narration at a standard loudness and add chapters |

```sh
pip install -r src/requirements.txt   # also needs LaTeX, dvisvgm and ffmpeg
cd src
python sz_example.py                  # verify the math, regenerate sz_data.json
python tts.py POCKET_DIR WHISPER_DIR  # see below
./render.sh h /tmp/media              # MANIM=/path/to/manim to pick a specific install
python assemble.py /tmp/media ..
```

`POCKET_DIR` and `WHISPER_DIR` are `sherpa-onnx-pocket-tts-int8-2026-01-26` and
`sherpa-onnx-whisper-small.en`, unpacked from the sherpa-onnx releases
([tts-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models),
[asr-models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)).
Without `audio/` (skip `tts.py`) the same scenes render as a silent video.
