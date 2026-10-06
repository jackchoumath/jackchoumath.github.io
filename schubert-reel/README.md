# Schubert Calculus — a 15-second film

A motion-graphics short introducing Schubert calculus through its most famous
example: **how many lines meet four general lines in space?** The answer is 2.

## What the film shows

1. **Four lines in space.** The film asks how many lines meet all four.
2. **The surface.** A probe line slides along the lines that meet ℓ₁, ℓ₂ and ℓ₃.
   The strings it leaves behind weave the hyperboloid x² + y² − z² = 1. The
   other ruling then grows out of ℓ₁, ℓ₂, ℓ₃.
3. **Two.** ℓ₄ pierces the hyperboloid in exactly two points. Through each
   point passes one line of the other ruling, so **2 lines meet all four**.
   This count is over ℂ for general lines; in the configuration shown, both
   solutions are real.
4. **The ring.** Viewed from above, the surface becomes a string-art rosette,
   and the film moves into Young's lattice. The four lines become the exponent
   in σ₁⁴ = 2σ₂,₂ in H\*(Gr(2,4)), and the 2 becomes its coefficient.
   - σ₁ is the class of lines meeting a given line; σ₂,₂ is the class of one line.
   - Each σ₁ adds one box (the Pieri rule).
   - The two ways to fill the 2×2 square are the two standard Young tableaux.
5. **Title.** The 2×2 square flies into a row of 2×k rectangles. The same count
   for them gives the Catalan numbers: σ₁^{2k} = C_k σ_{k,k} in H\*(Gr(2, k+2)).

`geometry.py` checks the configuration numerically. Each transversal meets all
four lines to within about 1e-16, and ℓ₄ stays about 0.5 away from ℓ₁, ℓ₂, ℓ₃.

```
python3 geometry.py -50 5 55  0.25 -1.3 0.7  0.22 1.25 -0.65
```

## How it is made

There is no video footage and there are no image assets.

- **Picture.** `film.js` draws every frame as a pure function of time on Canvas 2D,
  with KaTeX and HTML type on top. The 3D camera, rulings, easing and bloom
  are written by hand in `engine.js`.
- **Sound.** `audio.py` synthesises the score procedurally with numpy, reading
  its cue times from the film itself, so picture and sound cannot drift:
  - Karplus–Strong plucked strings
  - FM bells
  - a pad that resolves from D minor to D major
- **Render.** `render.mjs` drives headless Chromium. It seeks each sub-frame,
  captures it losslessly, and streams it to ffmpeg. ffmpeg averages four
  sub-frames per frame for a 180° motion blur, adds grain and muxes the audio.

To rebuild the film, run:

```
npm install          # KaTeX (already vendored in vendor/)
./build.sh           # cue sheet -> score -> picture -> mux, about 10 minutes
```

To build the pieces separately:

```
node cues.mjs                                  # export event times to out/cues.json
python3 audio.py out/score-raw.wav             # synthesize the score from the cue sheet
node render.mjs --blur 4 --out out/picture.mp4 # render the picture with motion blur
node render.mjs --stills 3.5,7.8               # inspect single frames
```

Open `reel.html` in a browser and call `seek(t)` from the console to scrub.

Fonts: Instrument Serif, Inter and JetBrains Mono (SIL OFL) and KaTeX (MIT).
