# Schubert Calculus, 1879 → today — a 32-second timeline film

A beat-synced motion-graphics film that races through the major results of
combinatorial Schubert calculus in chronological order. Every result shows its
year, its name, the paper or papers behind it, and an animated, mathematically
correct visual of the idea.

`schubert-history.mp4` is the rendered film (1920×1080, 60 fps, 32 s).

## Structure (128 BPM, 17 bars)

| beats | music | picture |
|---|---|---|
| 0–8 | intro: toms and booms | **1879**: four lines in space slam in on the toms, then the two transversals ignite, "= 2" |
| 8–24 | intro → build | the classical era, one result every two beats (1886 – 1959) |
| 24–31 | snare roll and riser | 1973, 1977, then the year counter accelerates toward 1982 through a tunnel of boxes |
| 31–32 | one beat of silence | a single line of light |
| 32 | **drop** | **1982 — Schubert polynomials**: white flash, burst, the S₃ tree cascades down by divided differences |
| 32–56 | drop | one result every two beats; heroes for pipe dreams (1993) and puzzles (2003, on the crash) |
| 56–63 | drop | one result per beat, 2008 → 2024 |
| 63 | the stop | "?" |
| 64–68 | final hit | the title over a wall of every visual in the film, then the open problem: a positive combinatorial rule for every Schubert structure constant c^w_{u,v} in 𝔖_u𝔖_v = Σ c^w_{u,v} 𝔖_w. **Still open.** |

## The timeline

| year | result | papers |
|---|---|---|
| 1879 | Schubert's calculus | Schubert, *Kalkül der abzählenden Geometrie* (Teubner) |
| 1886 | Degree of the Grassmannian | Schubert, Acta Math. 8; Mitt. Math. Ges. Hamburg 1 |
| 1893 | Pieri's rule | Pieri, Rend. Ist. Lombardo (2) 26 |
| 1900 | Hilbert's 15th problem | Hilbert, Nachr. Göttingen; transl. Bull. AMS 8 (1902) |
| 1903 | Giambelli's formula | Giambelli, Mem. R. Accad. Sci. Torino (2) 52 |
| 1934 | Schubert cells | Ehresmann, Ann. of Math. 35 |
| 1934 | Littlewood–Richardson rule | Littlewood–Richardson, Phil. Trans. A 233; Robinson, Amer. J. Math. 60 (1938) |
| 1947 | Schubert = Schur (Schubert classes are Schur functions) | Lesieur, C. R. Acad. Sci. 225 |
| 1959 | Monk's formula | Monk, Proc. LMS (3) 9 |
| 1973 | Divided differences | Bernstein–Gelfand–Gelfand, Uspekhi 28; Demazure, Ann. Sci. ÉNS 7 (1974) |
| 1977 | Jeu de taquin: LR rule proved | Schützenberger, LNM 579; Thomas, Adv. Math. 30 (1978) |
| 1982 | Schubert polynomials | Lascoux–Schützenberger, C. R. Acad. Sci. 294 and 295 |
| 1984 | Stanley symmetric functions | Stanley, European J. Combin. 5; Edelman–Greene, Adv. Math. 63 (1987) |
| 1992 | Essential set | Fulton, Duke Math. J. 65 |
| 1993 | RC-graphs (pipe dreams) | Billey–Jockusch–Stanley, J. Algebraic Combin. 2; Bergeron–Billey, Experiment. Math. 2 |
| 1997 | Quantum Schubert calculus | Bertram, Adv. Math. 128; Bertram–Ciocan-Fontanine–Fulton, J. Algebra 219 (1999) |
| 1999 | Honeycombs and saturation | Knutson–Tao, JAMS 12; Klyachko, Selecta Math. 4 (1998) |
| 2002 | K-theoretic LR rule | Buch, Acta Math. 189 |
| 2003 | Puzzles | Knutson–Tao, Duke Math. J. 119; Knutson–Tao–Woodward, JAMS 17 (2004) |
| 2005 | Gröbner geometry | Knutson–Miller, Ann. of Math. 161; Adv. Math. 184 (2004) |
| 2006 | Checkers | Vakil, Ann. of Math. 164 |
| 2008 | Affine Schubert calculus | Lam, JAMS 21; Lam–Shimozono, Acta Math. 204 (2010) |
| 2009 | Shapiro conjecture proved | Mukhin–Tarasov–Varchenko, Ann. of Math. 170 |
| 2016 | Two-step puzzles | Buch–Kresch–Purbhoo–Tamvakis, J. Algebraic Combin. 44; Buch, Ann. of Math. 182 (2015) |
| 2018 | Newton polytopes | Fink–Mészáros–St. Dizier, Adv. Math. 332 |
| 2021 | Bumpless pipe dreams | Lam–Lee–Shimozono, Compositio 157; Weigandt, JCTA 182 |
| 2023 | Separated descents | Huang, IMRN 2023; Knutson–Zinn-Justin, arXiv:2306.13855 |
| 2024 | Regularity | Pechenik–Speyer–Weigandt, Selecta Math. 30 |

Every citation was checked against the publisher or a bibliographic database.
The visuals are verified computations, for example:

- the five reduced pipe dreams of 1432, matching 𝔖₁₄₃₂ from divided differences
- the two Knutson–Tao puzzles for c^{321}_{21,21} = 2 in Gr(3,6)
- 𝔖₁₃₄₂ · 𝔖₃₂₁ = 𝔖₃₄₂₁ + 𝔖₄₂₃₁ + 𝔖₄₃₁₂ (separated descents at k = 2)

## Music

The film was cut to the beat map in `beats.js`. The requested track is
"Wordless" by HOYO-MiX (1:35–2:07). YouTube was unreachable from the build
environment, so the shipped render uses an original 128 BPM stand-in score
(`score.py`) with the same shape: intro, build, a one-beat gap, a drop, a stop
and a final hit.

To re-time the film to the real recording:

```
python3 resync.py path/to/wordless.mp3 --start 95 --dur 32
node render.mjs --html film.html --to 32 --workers 3 --blur 4 --preset slow --crf 17 --grain 5 \
  --audio out/music.wav --out schubert-history.mp4
```

`resync.py` fits a constant-tempo grid to the clip and finds the drop and the
final hit. It then remaps the film's design beats onto the song's beats, so
every cut, slam and flash lands on the music. The song itself is not committed.

## Files

- `film.html`, `film.js`: the film. Every frame is a pure function of time.
- `content.js`: the timeline (beats, years, names, citations).
- `motifs/*.js`: one visual per result. `motif-test.html?id=<motif>` previews one.
- `engine.js`: shared drawing helpers.
- `render.mjs`: deterministic frame-by-frame rendering with headless Chromium,
  4× sub-frame motion blur and ffmpeg encoding.
- `score.py`: the stand-in score and its beat map.
- `resync.py`: re-times the film to another recording.
- `contact.sh`: contact sheets of stills.
