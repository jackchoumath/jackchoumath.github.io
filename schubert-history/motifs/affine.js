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
      const { C, U, F, rgba, clamp, ease, seg, lerp } = env;
      const RES = [C.amber, C.cyan, C.violet];
      const drift = 1 + 0.03 * ease.soft(seg(p, 0.35, 1));
      const s = Math.min(box.w * 0.8 / 5, box.h * 0.66 / 3) * drift * (1 + 0.02 * k);
      // Centre between the bounding box and the centroid of the staircase.
      const gx = box.x + (box.w - 5 * s) / 2 + s * 0.28, gy = box.y + (box.h - 3 * s) / 2 + s * 0.2;
      const sweep = lerp(-3.5, 5.5, seg(p, 0.36, 1));  // highlight runs along the diagonals

      CELLS.forEach(cell => {
        const { r, c, h, old } = cell;
        let x, a, sc = 1;
        if (old) {                                       // a cell of lambda: appears, then slides
          const j = c - SHIFT[r];
          a = U.stagger(p, r * 2 + j, 5, 0, 0.1, 0.5);
          const slide = seg(p, 0.08 + r * 0.015, 0.2 + r * 0.015, ease.inOut);
          x = gx + lerp(j, c, slide) * s;
          sc = U.pop(a);
        } else {                                         // filled in by the bijection
          const order = (SHIFT[r] - 1 - c) + r * 0.6;
          a = seg(p, 0.17 + order * 0.025, 0.27 + order * 0.025);
          x = gx + c * s;
          sc = U.pop(a);
        }
        if (a <= 0) return;
        const y = gy + r * s, cx = x + s / 2, cy = y + s / 2;
        const tint = seg(p, 0.2, 0.34, ease.out);          // residue colours arrive
        const glow = Math.exp(-Math.pow((c - r) - sweep, 2) / 0.6);
        const col = RES[cell.res];
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.fillStyle = rgba(col, (0.2 + 0.22 * glow) * tint); ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
        ctx.strokeStyle = old ? rgba(C.ink, 0.95) : rgba(col, 0.9);
        ctx.lineWidth = old ? 2.6 : 2; ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
        const nq = seg(p, 0.22, 0.32);
        if (nq > 0) U.math(ctx, String(cell.h), cx, cy + s * 0.15, s * 0.42, rgba(h <= K ? C.ink : col, 1), 'center', nq);
        ctx.restore();
        // New cells flash as they are filled in; the diagonal sweep glows softly.
        const flash = old ? 0 : a * (1 - seg(p, 0.27 + 0.1, 0.5));
        const hg = Math.max(flash, 0.45 * glow * tint);
        if (hg > 0.01) { hot.strokeStyle = rgba(col, 0.8 * hg); hot.lineWidth = 3; hot.strokeRect(x + 3, y + 3, s - 6, s - 6); }
      });

      // One label: the bound.
      U.math(ctx, 'k = 2', gx + 5 * s - s * 0.1, gy + 3 * s - s * 0.12, s * 0.36, rgba(C.dim, 1), 'right', seg(p, 0.05, 0.2));
      void F;
    },
  };
})());
