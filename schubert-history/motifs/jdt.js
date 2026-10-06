// 1977 — Schützenberger's jeu de taquin: sliding a skew tableau into straight shape.
// Skew standard tableau of shape (3,3,1)/(2):
//      .  .  2
//      1  3  4
//      5
// Slide into the inner corner (0,1): right 2 < below 3, so 2 slides left; then
// only 4 is below, it slides up; the hole exits at (1,2).
// Slide into (0,0): right 2 > below 1, so 1 slides up; then right 3 < below 5,
// 3 slides left; the hole exits at (1,1).
// Result 1 2 4 / 3 / 5 = RSK insertion tableau of the reading word 5 1 3 4 2
// (checked by brute force in python; the slides below are computed, not typed).
MOTIF('jdt', (() => {
  const T0 = { '0,2': 2, '1,0': 1, '1,1': 3, '1,2': 4, '2,0': 5 };
  const INNER = [[0, 1], [0, 0]];                     // inner corners, in slide order
  // Run jeu de taquin: each slide is a list of moves {val, from, to} and the exit cell.
  const SLIDES = [];
  const T = { ...T0 };
  for (const start of INNER) {
    let [r, c] = start; const moves = [];
    for (;;) {
      const R = T[`${r},${c + 1}`], D = T[`${r + 1},${c}`];
      if (R == null && D == null) break;
      const [sr, sc] = D == null || (R != null && R < D) ? [r, c + 1] : [r + 1, c];
      const val = T[`${sr},${sc}`];
      T[`${r},${c}`] = val; delete T[`${sr},${sc}`];
      moves.push({ val, from: [sr, sc], to: [r, c] });
      [r, c] = [sr, sc];
    }
    SLIDES.push({ start, moves, exit: [r, c] });
  }
  // Timeline (fractions of p): marker in, moves, exit — per slide.
  const PLAN = [
    { mark: 0.2, moves: [[0.27, 0.37], [0.38, 0.48]], exit: [0.48, 0.56] },
    { mark: 0.52, moves: [[0.58, 0.68], [0.69, 0.79]], exit: [0.79, 0.87] },
  ];

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const s = Math.min(box.w / 5.0, box.h / 4.3);
      const gx = box.x + box.w / 2 - 1.5 * s, gy = box.y + box.h / 2 - 1.5 * s;
      const cellXY = ([r, c]) => [gx + c * s, gy + r * s];
      const pad = 3, lw = 2.5;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.25) / 0.75));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      // Dashed inner cells (the removed corner) until a box lands in them.
      const filledAt = {};                              // cell key -> p when a box starts sliding in
      SLIDES.forEach((sl, j) => sl.moves.forEach((m, i) => { filledAt[m.to.join()] = PLAN[j].moves[i][0]; }));
      const dashA = seg(p, 0.06, 0.2, ease.out);
      ctx.save(); ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5;
      for (const cell of INNER) {
        const fa = 1 - seg(p, filledAt[cell.join()], filledAt[cell.join()] + 0.04);
        if (fa <= 0) continue;
        const [x, y] = cellXY(cell);
        ctx.strokeStyle = rgba(C.dim, 0.75 * dashA * fa);
        ctx.strokeRect(x + pad, y + pad, s - 2 * pad, s - 2 * pad);
      }
      ctx.restore();

      // The hole: an amber, glowing empty cell. Like a sliding puzzle, while a box
      // slides in, the hole is exactly the part of (target ∪ source) the box does
      // not cover, so it shrinks behind the box and opens up in its wake.
      const holeRect = (x0, y0, x1, y1, a, frac) => {
        const i = pad + 3; x0 += i; y0 += i; x1 -= i; y1 -= i;
        if (x1 - x0 < 3 || y1 - y0 < 3 || a <= 0.01) return;
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = rgba(C.amber, 0.15); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = lw; ctx.setLineDash([7, 5]);
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
        U.dot(ctx, (x0 + x1) / 2, (y0 + y1) / 2, s * 0.07 * frac, rgba(C.amber, 1));
        ctx.restore();
        hot.save(); hot.globalAlpha = a * (0.75 + 0.25 * k);
        hot.strokeStyle = rgba(C.amber, 0.9); hot.lineWidth = 3; hot.strokeRect(x0, y0, x1 - x0, y1 - y0);
        U.dot(hot, (x0 + x1) / 2, (y0 + y1) / 2, s * 0.1 * frac, rgba(C.amber, 0.9));
        hot.restore();
      };
      SLIDES.forEach((sl, j) => {
        const pl = PLAN[j];
        const appear = seg(p, pl.mark, pl.mark + 0.07, ease.out);
        const gone = seg(p, pl.exit[0], pl.exit[1], ease.in);
        if (appear <= 0 || gone >= 1) return;
        let pos = sl.start, split = null;
        sl.moves.forEach((m, i) => {
          const u = seg(p, pl.moves[i][0], pl.moves[i][1], ease.inOut);
          if (u >= 1) pos = m.from; else if (u > 0) split = { m, u };
        });
        if (split) {
          const { m, u } = split, [dx, dy] = cellXY(m.to), [sx, sy] = cellXY(m.from);
          if (m.from[1] > m.to[1]) {     // box comes from the right
            holeRect(dx, dy, dx + (1 - u) * s, dy + s, 1, 1 - u);
            holeRect(sx + (1 - u) * s, sy, sx + s, sy + s, 1, u);
          } else {                       // box comes from below
            holeRect(dx, dy, dx + s, dy + (1 - u) * s, 1, 1 - u);
            holeRect(sx, sy + (1 - u) * s, sx + s, sy + s, 1, u);
          }
          return;
        }
        // Pop in at the inner corner; at the end, drift outward (down-right) and vanish.
        const out = ease.out(gone), sc = U.pop(appear) * (1 - 0.6 * out) * (1 + 0.05 * k);
        const [x, y] = cellXY(pos), mx = x + s / 2 + out * s * 0.35, my = y + s / 2 + out * s * 0.35;
        const h = (s / 2) * sc;
        holeRect(mx - h, my - h, mx + h, my + h, 1 - gone, sc);
      });

      // Position of every number at progress p.
      const tokens = Object.entries(T0).map(([key, val], i) => ({ val, i, pos: key.split(',').map(Number), moving: 0 }));
      SLIDES.forEach((sl, j) => sl.moves.forEach((m, i) => {
        const [a, b] = PLAN[j].moves[i];
        const u = seg(p, a, b, ease.inOut);
        if (u <= 0) return;
        const tk = tokens.find(t => t.val === m.val);
        tk.pos = [lerp(m.from[0], m.to[0], u), lerp(m.from[1], m.to[1], u)];
        if (u < 1) tk.moving = Math.sin(Math.PI * u);
      }));

      // Boxes: pop in, then slide.
      const ord = [...tokens].sort((A, B) => A.pos[0] + A.pos[1] - (B.pos[0] + B.pos[1]));
      ord.forEach((tk, n) => {
        const q = U.stagger(p, n, tokens.length, 0.0, 0.24, 0.45);
        if (q <= 0) return;
        const sc = U.pop(q) * (1 + 0.06 * tk.moving);
        const [x, y] = cellXY(tk.pos), mx = x + s / 2, my = y + s / 2, h = (s / 2 - pad) * sc;
        ctx.save(); ctx.globalAlpha = clamp(q * 2);
        ctx.fillStyle = rgba(C.ink, 0.06 + 0.1 * tk.moving); ctx.fillRect(mx - h, my - h, 2 * h, 2 * h);
        ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = lw; ctx.strokeRect(mx - h, my - h, 2 * h, 2 * h);
        U.text(ctx, String(tk.val), mx, my + s * 0.03, `${Math.round(s * 0.48 * sc)}px ${F.main}`, rgba(C.ink, 1), 'center', 'middle');
        ctx.restore();
        if (tk.moving > 0.02) {
          hot.save(); hot.globalAlpha = 0.5 * tk.moving; hot.strokeStyle = rgba(C.ink, 0.8); hot.lineWidth = 3;
          hot.strokeRect(mx - h, my - h, 2 * h, 2 * h); hot.restore();
        }
      });

      // Straight shape reached: its outline traces in amber.
      const fin = seg(p, 0.86, 0.98, ease.out);
      if (fin > 0) {
        const shape = [];
        Object.keys(T).forEach(key => { const [r, c] = key.split(',').map(Number); shape[r] = Math.max(shape[r] || 0, c + 1); });
        // Boundary walk: top edge, then down the right side of each row, then up the left edge.
        const pts = [[0, 0], [shape[0], 0]];
        shape.forEach((len, r) => { pts.push([len, r + 1]); if (r + 1 < shape.length) pts.push([shape[r + 1], r + 1]); });
        pts.push([0, shape.length], [0, 0]);
        const P = pts.map(([c, r]) => [gx + c * s, gy + r * s]);
        const lens = P.slice(1).map((q, i) => Math.hypot(q[0] - P[i][0], q[1] - P[i][1]));
        let left = fin * lens.reduce((a, b) => a + b, 0);
        for (const g of [ctx, hot]) {
          g.save(); g.strokeStyle = rgba(C.amber, g === ctx ? 0.95 : 0.7); g.lineWidth = g === ctx ? 3 : 4;
          g.lineJoin = 'miter'; g.beginPath(); g.moveTo(...P[0]);
          let rem = left;
          for (let i = 0; i < lens.length && rem > 0; i++) {
            const t = Math.min(1, rem / lens[i]);
            g.lineTo(lerp(P[i][0], P[i + 1][0], t), lerp(P[i][1], P[i + 1][1], t)); rem -= lens[i];
          }
          g.stroke(); g.restore();
        }
      }
      ctx.restore(); hot.restore();
    },
  };
})());
