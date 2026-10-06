// 2003/2008 — k-Schur functions (Lapointe–Lascoux–Morse) and affine Schubert
// calculus (Lam: k-Schur functions represent the Schubert classes in the homology
// of the affine Grassmannian of SL_{k+1}). Indexing sets: k-bounded partitions and
// (k+1)-cores, in Lapointe–Morse bijection.
// Shown: k = 2, lambda = (2,2,1)  <->  3-core (5,3,1).
//   core -> lambda: row i of lambda = #cells in row i of the core with hook <= k.
//   lambda -> core: from the bottom row up, slide each row right until all its
//   cells have hook <= k, then fill in the cells to its left.
// Hook lengths of (5,3,1): [7,5,4,2,1], [4,2,1], [1]  (none divisible by 3, so it
// is a 3-core); the cells with hook <= 2 are the last 2, 2, 1 of each row = lambda.
// Residues (column - row) mod 3: [0,1,2,0,1], [2,0,1], [1].
// Colour: lambda cells ink; the cells the bijection fills in (exactly the cells
// with hook > k: hooks 7,5,4,4) amber; afterwards each residue class lights cyan.
// Checked in Python: the bijection, both directions, for all 2-bounded
// partitions of size <= 10.
MOTIF('affine', (() => {
  const LAM = [2, 2, 1], CORE = [5, 3, 1], K = 2;
  const SHIFT = LAM.map((l, r) => CORE[r] - l);     // 3, 1, 0
  const conj = c => CORE.filter(len => len > c).length;
  const hook = (r, c) => (CORE[r] - c - 1) + (conj(c) - r - 1) + 1;
  const res = (r, c) => (((c - r) % 3) + 3) % 3;
  const CELLS = [];
  CORE.forEach((len, r) => { for (let c = 0; c < len; c++) CELLS.push({ r, c, h: hook(r, c), res: res(r, c), old: c >= SHIFT[r] }); });

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, ease, seg, lerp } = env;
      const drift = 1 + 0.03 * ease.soft(seg(p, 0.35, 1));
      const s = Math.min(box.w * 0.8 / 5, box.h * 0.66 / 3) * drift * (1 + 0.02 * k);
      // Centre between the bounding box and the centroid of the staircase.
      const gx = box.x + (box.w - 5 * s) / 2 + s * 0.28, gy = box.y + (box.h - 3 * s) / 2 + s * 0.2;
      // After the build, the residue classes (c - r) mod 3 light up in turn (cyan),
      // one after another; none is lit before p = 0.36 or at p = 1.
      const ph = lerp(-0.6, 3.6, seg(p, 0.36, 1));

      CELLS.forEach(cell => {
        const { r, c, h, old } = cell;
        let x, a;
        if (old) {                                       // a cell of lambda: appears, then slides
          const j = c - SHIFT[r];
          a = U.stagger(p, r * 2 + j, 5, 0, 0.1, 0.5);
          const slide = seg(p, 0.06 + (2 - r) * 0.02, 0.17 + (2 - r) * 0.02, ease.inOut);  // bottom row first
          x = gx + lerp(j, c, slide) * s;
        } else {                                         // filled in by the bijection (hook > k)
          const order = (SHIFT[r] - 1 - c) + r * 0.6;
          a = seg(p, 0.18 + order * 0.025, 0.28 + order * 0.025);
          x = gx + c * s;
        }
        if (a <= 0) return;
        const sc = U.pop(a), y = gy + r * s, cx = x + s / 2, cy = y + s / 2;
        const lit = ease.inOut(clamp(1.7 * (1 - Math.abs(ph - cell.res - 0.5) / 0.8)));
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.fillStyle = rgba(old ? C.ink : C.amber, old ? 0.04 : 0.16); ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
        if (lit > 0.01) {                                  // residue class: inset cyan ring
          const e = s * 0.13;
          ctx.fillStyle = rgba(C.cyan, 0.2 * lit); ctx.fillRect(x + e, y + e, s - 2 * e, s - 2 * e);
          ctx.strokeStyle = rgba(C.cyan, lit); ctx.lineWidth = 2.5; ctx.strokeRect(x + e, y + e, s - 2 * e, s - 2 * e);
        }
        ctx.strokeStyle = rgba(old ? C.ink : C.amber, 0.95);
        ctx.lineWidth = old ? 2.6 : 2.4; ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
        const nq = seg(p, 0.22, 0.32);
        if (nq > 0) U.math(ctx, String(h), cx, cy + s * 0.15, s * 0.42, rgba(h <= K ? C.ink : C.amber, 1), 'center', nq);
        ctx.restore();
        // The new core cells glow: a flash as each is filled in, then a steady ember.
        if (!old) {
          const hg = Math.max(1 - seg(p, 0.37, 0.5), 0.35) * clamp(a * 2);
          hot.save(); hot.translate(cx, cy); hot.scale(sc, sc); hot.translate(-cx, -cy);
          hot.strokeStyle = rgba(C.amber, 0.8 * hg); hot.lineWidth = 3; hot.strokeRect(x + 3, y + 3, s - 6, s - 6);
          hot.restore();
        }
      });

      // One label: the bound.
      U.math(ctx, 'k = 2', gx + 5 * s - s * 0.1, gy + 3 * s - s * 0.12, s * 0.36, rgba(C.dim, 1), 'right', seg(p, 0.05, 0.2));
    },
  };
})());
