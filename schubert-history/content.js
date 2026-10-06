// Timeline of the 75-second cut. Each entry sits on the music's beat grid (score75.py):
//   b    : start beat (index into BEATS.beats)
//   len  : length in beats (cards 4 = 1.875 s, heroes 8, the final run 1-2)
//   era  : 'classical' | 'revolution' | 'modern'   (colour story)
//   kind : 'hero' | 'card' | 'flash'   (default: card, or flash when len <= 1)
//   inter: the interstitial the music plays before this entry ('turn' = the build tunnel, 'count' = "c = #?")
// Citations: [authors, title, venue · year]. Every citation was checked against the publisher or a
// bibliographic database (see README.md).
window.ENTRIES = [
  // ---------------------------------------------------------------- intro: 1879 on the toms (4 bars)
  { b: 0, len: 16, kind: 'hero', era: 'classical', year: 1879, name: "Schubert's calculus", motif: 'lines4',
    cites: [["H. Schubert", "Kalkül der abzählenden Geometrie", "B. G. Teubner, Leipzig · 1879"]] },
  // ---------------------------------------------------------------- verse: the classical era, one bar each
  { b: 16, len: 4, era: 'classical', year: 1886, name: "Degree of the Grassmannian", motif: 'rectSYT',
    cites: [["H. Schubert", "Anzahl-Bestimmungen für lineare Räume beliebiger Dimension", "Acta Math. 8 · 1886"],
      ["H. Schubert", "Lösung des Characteristiken-Problems für lineare Räume beliebiger Dimension", "Mitt. Math. Ges. Hamburg 1 · 1886"]] },
  { b: 20, len: 4, era: 'classical', year: 1893, name: "Pieri's rule", motif: 'pieri',
    cites: [["M. Pieri", "Sul problema degli spazi secanti. Nota 1ª", "Rend. Ist. Lombardo (2) 26 · 1893"]] },
  { b: 24, len: 4, era: 'classical', year: 1900, name: "Hilbert's 15th problem", motif: 'hilbert',
    cites: [["D. Hilbert", "Mathematische Probleme", "Nachr. Ges. Wiss. Göttingen · 1900"],
      ["D. Hilbert, transl. M. W. Newson", "Mathematical problems", "Bull. Amer. Math. Soc. 8 · 1902"]] },
  { b: 28, len: 4, era: 'classical', year: 1903, name: "Giambelli's formula", motif: 'giambelli',
    cites: [["G. Z. Giambelli", "Risoluzione del problema degli spazi secanti", "Mem. R. Accad. Sci. Torino (2) 52 · 1903"]] },
  { b: 32, len: 4, era: 'classical', year: 1934, name: "Schubert cells", motif: 'cells',
    cites: [["C. Ehresmann", "Sur la topologie de certains espaces homogènes", "Ann. of Math. 35 · 1934"]] },
  { b: 36, len: 4, era: 'classical', year: 1934, name: "Littlewood–Richardson rule", motif: 'lr',
    cites: [["D. E. Littlewood, A. R. Richardson", "Group characters and algebra", "Phil. Trans. R. Soc. A 233 · 1934"],
      ["G. de B. Robinson", "On the representations of the symmetric group", "Amer. J. Math. 60 · 1938"]] },
  { b: 40, len: 4, era: 'classical', year: 1947, name: "Schubert = Schur", motif: 'lesieur',
    cites: [["L. Lesieur", "Les problèmes d'intersection sur une variété de Grassmann", "C. R. Acad. Sci. Paris 225 · 1947"]] },
  { b: 44, len: 4, era: 'classical', year: 1959, name: "Monk's formula", motif: 'monk',
    cites: [["D. Monk", "The geometry of flag manifolds", "Proc. London Math. Soc. (3) 9 · 1959"]] },
  // ---------------------------------------------------------------- build: algebra turns combinatorial (then the tunnel and one beat of silence)
  { b: 48, len: 4, era: 'revolution', year: 1973, name: "Divided differences", motif: 'divdiff',
    cites: [["I. N. Bernstein, I. M. Gelfand, S. I. Gelfand", "Schubert cells and cohomology of the spaces G/P", "Uspekhi Mat. Nauk 28 (Russian Math. Surveys 28) · 1973"],
      ["M. Demazure", "Désingularisation des variétés de Schubert généralisées", "Ann. Sci. ÉNS (4) 7 · 1974"]] },
  { b: 52, len: 4, era: 'revolution', year: 1977, name: "Jeu de taquin: LR rule proved", motif: 'jdt',
    cites: [["M.-P. Schützenberger", "La correspondance de Robinson", "Lecture Notes in Math. 579 · 1977"],
      ["G. P. Thomas", "On Schensted's construction and the multiplication of Schur functions", "Adv. Math. 30 · 1978"]] },
  // ---------------------------------------------------------------- drop A
  { b: 64, len: 8, kind: 'hero', era: 'revolution', year: 1982, name: "Schubert polynomials", motif: 'schubpoly', inter: 'turn',
    cites: [["A. Lascoux, M.-P. Schützenberger", "Polynômes de Schubert", "C. R. Acad. Sci. Paris 294 · 1982"],
      ["A. Lascoux, M.-P. Schützenberger", "Structure de Hopf de l'anneau de cohomologie et de l'anneau de Grothendieck d'une variété de drapeaux", "C. R. Acad. Sci. Paris 295 · 1982"]] },
  { b: 72, len: 4, era: 'revolution', year: 1984, name: "Stanley symmetric functions", motif: 'wiring',
    cites: [["R. P. Stanley", "On the number of reduced decompositions of elements of Coxeter groups", "European J. Combin. 5 · 1984"],
      ["P. Edelman, C. Greene", "Balanced tableaux", "Adv. Math. 63 · 1987"]] },
  { b: 76, len: 4, era: 'revolution', year: 1990, name: "Smoothness by patterns", motif: 'patterns',
    cites: [["V. Lakshmibai, B. Sandhya", "Criterion for smoothness of Schubert varieties in Sl(n)/B", "Proc. Indian Acad. Sci. Math. Sci. 100 · 1990"]] },
  { b: 80, len: 4, era: 'revolution', year: 1992, name: "Essential set", motif: 'rothe',
    cites: [["W. Fulton", "Flags, Schubert polynomials, degeneracy loci, and determinantal formulas", "Duke Math. J. 65 · 1992"]] },
  { b: 84, len: 8, kind: 'hero', era: 'revolution', year: 1993, name: "RC-graphs (pipe dreams)", motif: 'pipedream',
    cites: [["S. Billey, W. Jockusch, R. P. Stanley", "Some combinatorial properties of Schubert polynomials", "J. Algebraic Combin. 2 · 1993"],
      ["N. Bergeron, S. Billey", "RC-graphs and Schubert polynomials", "Experiment. Math. 2 · 1993"]] },
  { b: 92, len: 4, era: 'revolution', year: 1994, name: "The nilCoxeter algebra", motif: 'nilcoxeter',
    cites: [["S. Fomin, R. P. Stanley", "Schubert polynomials and the nilCoxeter algebra", "Adv. Math. 103 · 1994"],
      ["S. Fomin, A. N. Kirillov", "The Yang–Baxter equation, symmetric functions, and Schubert polynomials", "Discrete Math. 153 · 1996"]] },
  // ---------------------------------------------------------------- break (half-time), then the riser into "c = #?"
  { b: 96, len: 4, era: 'revolution', year: 1997, name: "Quantum Schubert calculus", motif: 'quantum',
    cites: [["A. Bertram", "Quantum Schubert calculus", "Adv. Math. 128 · 1997"],
      ["A. Bertram, I. Ciocan-Fontanine, W. Fulton", "Quantum multiplication of Schur polynomials", "J. Algebra 219 · 1999"]] },
  { b: 100, len: 4, era: 'revolution', year: 1999, name: "Honeycombs & saturation", motif: 'honeycomb',
    cites: [["A. Knutson, T. Tao", "The honeycomb model of GLn(C) tensor products I: Proof of the saturation conjecture", "J. Amer. Math. Soc. 12 · 1999"],
      ["A. Klyachko", "Stable bundles, representation theory and Hermitian operators", "Selecta Math. 4 · 1998"]] },
  { b: 104, len: 4, era: 'modern', year: 2002, name: "K-theoretic LR rule", motif: 'setvalued',
    cites: [["A. S. Buch", "A Littlewood–Richardson rule for the K-theory of Grassmannians", "Acta Math. 189 · 2002"]] },
  // ---------------------------------------------------------------- drop B
  { b: 112, len: 8, kind: 'hero', era: 'modern', year: 2003, name: "Puzzles", motif: 'puzzle', inter: 'count',
    cites: [["A. Knutson, T. Tao", "Puzzles and (equivariant) cohomology of Grassmannians", "Duke Math. J. 119 · 2003"],
      ["A. Knutson, T. Tao, C. Woodward", "The honeycomb model of GLn(C) tensor products II: Puzzles determine facets of the Littlewood–Richardson cone", "J. Amer. Math. Soc. 17 · 2004"]] },
  { b: 120, len: 4, era: 'modern', year: 2005, name: "Gröbner geometry", motif: 'groebner',
    cites: [["A. Knutson, E. Miller", "Gröbner geometry of Schubert polynomials", "Ann. of Math. 161 · 2005"],
      ["A. Knutson, E. Miller", "Subword complexes in Coxeter groups", "Adv. Math. 184 · 2004"]] },
  { b: 124, len: 4, era: 'modern', year: 2006, name: "Checkers", motif: 'checkers',
    cites: [["R. Vakil", "A geometric Littlewood–Richardson rule", "Ann. of Math. 164 · 2006"]] },
  { b: 128, len: 4, era: 'modern', year: 2008, name: "Affine Schubert calculus", motif: 'affine',
    cites: [["T. Lam", "Schubert polynomials for the affine Grassmannian", "J. Amer. Math. Soc. 21 · 2008"],
      ["T. Lam, M. Shimozono", "Quantum cohomology of G/P and homology of affine Grassmannian", "Acta Math. 204 · 2010"]] },
  { b: 132, len: 4, era: 'modern', year: 2009, name: "Shapiro conjecture proved", motif: 'real',
    cites: [["E. Mukhin, V. Tarasov, A. Varchenko", "The B. and M. Shapiro conjecture in real algebraic geometry and the Bethe ansatz", "Ann. of Math. 170 · 2009"]] },
  { b: 136, len: 4, era: 'modern', year: 2016, name: "Two-step puzzles", motif: 'puzzle2',
    cites: [["A. S. Buch, A. Kresch, K. Purbhoo, H. Tamvakis", "The puzzle conjecture for the cohomology of two-step flag manifolds", "J. Algebraic Combin. 44 · 2016"],
      ["A. S. Buch", "Mutations of puzzles and equivariant cohomology of two-step flag varieties", "Ann. of Math. 182 · 2015"]] },
  { b: 140, len: 4, era: 'modern', year: 2018, name: "Newton polytopes", motif: 'polytope',
    cites: [["A. Fink, K. Mészáros, A. St. Dizier", "Schubert polynomials as integer point transforms of generalized permutahedra", "Adv. Math. 332 · 2018"]] },
  // ---------------------------------------------------------------- final run, then the stop and the final hit
  { b: 144, len: 2, era: 'modern', year: 2021, name: "Bumpless pipe dreams", motif: 'bpd',
    cites: [["T. Lam, S. J. Lee, M. Shimozono", "Back stable Schubert calculus", "Compositio Math. 157 · 2021"],
      ["A. Weigandt", "Bumpless pipe dreams and alternating sign matrices", "J. Combin. Theory Ser. A 182 · 2021"]] },
  { b: 146, len: 2, era: 'modern', year: 2022, name: "Schur log-concavity", motif: 'logconcave',
    cites: [["J. Huh, J. P. Matherne, K. Mészáros, A. St. Dizier", "Logarithmic concavity of Schur and related polynomials", "Trans. Amer. Math. Soc. 375 · 2022"]] },
  { b: 148, len: 2, era: 'modern', year: 2023, name: "Separated descents", motif: 'separated',
    cites: [["D. Huang", "Schubert products for permutations with separated descents", "Int. Math. Res. Not. IMRN · 2023"],
      ["A. Knutson, P. Zinn-Justin", "Schubert puzzles and integrability III: separated descents", "arXiv:2306.13855 · 2023"]] },
  { b: 150, len: 1, era: 'modern', year: 2024, name: "Regularity", motif: 'regularity',
    cites: [["O. Pechenik, D. E. Speyer, A. Weigandt", "Castelnuovo–Mumford regularity of matrix Schubert varieties", "Selecta Math. 30 · 2024"]] },
];
window.FINALE = {
  "question": "A positive combinatorial rule for every Schubert structure constant",
  "formula": [
    "\\S_u\\,\\S_v\\;=\\;\\sum_w",
    "\\,c_{u,v}^{w}",
    "\\,\\S_w"
  ],
  "status": "Still open.",
  "title": "Schubert Calculus",
  "span": "1879 — today"
};
