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
// Re-checked in Python (sympy session): hooks, lambda = (2,2,1), no hook divisible
// by 3, residues as above; the bijection both ways for all 2-bounded partitions of
// size <= 10 (original check).
// Centre-stage cut (4 beats = 1.875 s; beats at p = .25 .5 .75): lambda pops in,
// its rows slide right and land on beat 1, the four amber cells fill in and the
// hooks appear, "3-core" lands on beat 2, then the residue classes 0, 1, 2 light
// in turn on beat 2, the and-of-2 and beat 3. The k = 2 / 3-core caption sits in
// the empty corner of the staircase, so the group is the core's bounding box.
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
      const { C, F, U, rgba, clamp, ease, seg, lerp } = env;
      const dur = env.dur || 1.875;
      // Cell size: the 5 x 3 core fills ~80% of the stage height.
      const s0 = Math.min(box.w * 0.84 / 5, box.h * 0.8 / 3);
      const drift = 1 + 0.035 * ease.soft(seg(p, 0.3, 1));
      const s = s0 * drift;
      const cxB = box.x + box.w / 2, cyB = box.y + box.h / 2 - box.h * 0.01;
      const gx = cxB - 2.5 * s, gy = cyB - 1.5 * s;
      const lw = clamp(s * 0.016, 1.4, 3), ins = clamp(s * 0.035, 1.5, 7);
      // Residue classes light in turn, half a beat apart from mid-slot: on a 4-beat card the
      // attacks fall on beat 2, the and-of-2 and beat 3. Timed in seconds so a short slot
      // shows fewer classes instead of strobing (none below 0.8 s) and a long one keeps
      // cycling 0, 1, 2, 0, ...; the last attack has decayed by p = 1 when the slot allows.
      const t = p * dur, half = (env.beat || 0.46875) / 2, DEC = 0.32;
      const showRes = dur >= 0.8;
      const nAtt = Math.max(1, Math.floor((0.5 * dur - DEC) / half + 1e-6) + 1);
      const litOf = r => {
        if (!showRes) return 0;
        let best = 0;
        for (let j = r; j < nAtt; j += 3) {
          const u = (t - (0.5 * dur + j * half)) / DEC;
          best = Math.max(best, u < -0.15 || u > 1 ? 0 : u < 0 ? ease.out(1 + u / 0.15) : Math.pow(1 - u, 1.6));
        }
        return best;
      };
      const kp = showRes ? k : 0;

      CELLS.forEach(cell => {
        const { r, c, h, old } = cell;
        let x, a;
        if (old) {                                       // a cell of lambda: appears, then slides
          const j = c - SHIFT[r];
          a = U.stagger(p, r * 2 + j, 5, 0, 0.1, 0.5);
          const t0 = 0.07 + (2 - r) * 0.035;             // bottom row first; the top row lands on beat 1
          const slide = seg(p, t0, t0 + 0.11, ease.inOut);
          x = gx + lerp(j, c, slide) * s;
        } else {                                         // filled in by the bijection (hook > k)
          const order = (SHIFT[r] - 1 - c) + r * 0.6;
          a = seg(p, 0.24 + order * 0.03, 0.33 + order * 0.03);
          x = gx + c * s;
        }
        if (a <= 0) return;
        const lit = litOf(cell.res);
        const sc = U.pop(a) * (1 + 0.04 * lit * kp + 0.03 * lit);
        const y = gy + r * s, cx = x + s / 2, cy = y + s / 2;
        const half = s / 2 - ins;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        ctx.fillStyle = rgba(old ? C.ink : C.amber, old ? 0.045 : 0.15); ctx.fillRect(-half, -half, 2 * half, 2 * half);
        if (lit > 0.01) {                                  // residue class: inset cyan ring
          const e = half * 0.78;
          ctx.fillStyle = rgba(C.cyan, 0.18 * lit); ctx.fillRect(-e, -e, 2 * e, 2 * e);
          ctx.strokeStyle = rgba(C.cyan, lit); ctx.lineWidth = lw * 1.05; ctx.strokeRect(-e, -e, 2 * e, 2 * e);
        }
        ctx.strokeStyle = rgba(old ? C.ink : C.amber, 0.95);
        ctx.lineWidth = lw; ctx.strokeRect(-half, -half, 2 * half, 2 * half);
        // hook lengths: the lambda cells (hook <= k) first, then the new ones as they land
        const nq = old ? seg(p, 0.27, 0.36) : seg(a, 0.5, 1);
        if (nq > 0) U.math(ctx, String(h), 0, s * 0.155, s * 0.44, rgba(h <= K ? C.ink : C.amber, 1), 'center', nq);
        ctx.restore();
        // The new core cells glow: a flash as each is filled in, then a low ember.
        if (!old) {
          const hg = Math.max(1 - seg(p, 0.4, 0.55), 0.3) * clamp(a * 2);
          hot.save(); hot.translate(cx, cy); hot.scale(sc, sc);
          hot.strokeStyle = rgba(C.amber, 0.75 * hg); hot.lineWidth = lw * 1.2; hot.strokeRect(-half, -half, 2 * half, 2 * half);
          hot.restore();
        }
        if (lit > 0.3) {
          const e = half * 0.78;
          hot.save(); hot.translate(cx, cy); hot.scale(sc, sc);
          hot.strokeStyle = rgba(C.cyan, 0.45 * lit); hot.lineWidth = lw; hot.strokeRect(-e, -e, 2 * e, 2 * e);
          hot.restore();
        }
      });

      // Caption in the empty lower-right corner of the staircase: the bound, then the name.
      const fz = s * 0.36, rx = gx + 5 * s - s * 0.08;
      const kq = seg(p, 0.03, 0.14, ease.out);
      if (kq > 0) U.math(ctx, 'k = 2', rx, gy + 1.62 * s + (1 - kq) * s * 0.1, fz, rgba(C.dim, 1), 'right', kq);
      const cq = seg(p, 0.4, 0.5, ease.out);
      if (cq > 0) {
        const pop = 1 + 0.12 * Math.exp(-Math.max(0, p - 0.5) * 14);
        const y = gy + 2.62 * s;
        for (const g of [ctx, hot]) {
          g.save(); g.translate(rx, y); g.scale(pop, pop);
          U.text(g, '3-core', 0, 0, `${Math.round(fz * 1.12)}px ${F.main}`, rgba(C.amber, g === hot ? 0.22 : 1), 'right', 'alphabetic', cq);
          g.restore();
        }
      }
    },
  };
})());
