// 2021 — Lam–Lee–Shimozono: bumpless pipe dreams (back stable Schubert calculus).
// n x n grid, pipes enter on the south edge and leave on the east edge; tiles are
// blank, cross, horizontal, vertical, the "┌" elbow (south->east) and the "┘" elbow
// (west->north); no bumping tile. The pipe leaving row i enters column w(i), and
//   S_w = sum over reduced BPDs of prod_{blank (i,j)} x_i.
// Checked in Python by enumerating all 42 BPDs of the 4x4 grid (= 42 ASMs) and
// comparing the blank-tile sums with divided differences for all 24 w in S_4.
// Shown: w = 1432 (as in the pipe-dream and Gröbner motifs). Its five reduced
// BPDs differ only in the path of the pipe from column 1 to row 1. Shown, in order:
//   Rothe BPD   blanks D(w) = {(2,2),(2,3),(3,2)}   x2^2 x3
//   droop (1,1)->(3,2)      {(1,1),(2,1),(2,3)}     x1 x2^2
//   droop (1,2)->(2,3)      {(1,1),(1,2),(2,1)}     x1^2 x2
// Each droop: the ┌ at the NW corner of a rectangle with no other elbows slides
// to the blank SE corner (which becomes ┘). Both droops checked against the list.
// Re-checked for this cut: S_1432 = x1^2x2 + x1^2x3 + x1x2^2 + x1x2x3 + x2^2x3 (sympy),
// and the three weights shown are terms of it.
// Centre-stage cut (2 beats = 0.94 s): built by p = 0.2, first droop lands just before
// the beat (p = 0.5), the second by p = 0.78; composition (grid, pipe ends, entry dots)
// centred at ~88% of the stage height.
MOTIF('bpd', (() => {
  const n = 4;
  // Fixed pipes [entry column, exit row]: each goes straight up, then east.
  const FIXED = [[4, 2], [3, 3], [2, 4]];
  const BLANKS = [
    [[2, 2], [2, 3], [3, 2]],
    [[1, 1], [2, 1], [2, 3]],
    [[1, 1], [1, 2], [2, 1]],
  ];
  // Flatten an axis-aligned polyline with rounded corners into dense points.
  function flatten(pts, rr) {
    const P = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 1e-6);
    const Q = P.filter((q, i) => {                   // drop collinear vertices
      if (i === 0 || i === P.length - 1) return true;
      const a = P[i - 1], b = P[i + 1];
      return Math.abs((q[0] - a[0]) * (b[1] - q[1]) - (q[1] - a[1]) * (b[0] - q[0])) > 1e-6;
    });
    const out = [Q[0]];
    for (let i = 1; i < Q.length - 1; i++) {
      const A = Q[i - 1], V = Q[i], B = Q[i + 1];
      const d1 = Math.hypot(V[0] - A[0], V[1] - A[1]), d2 = Math.hypot(B[0] - V[0], B[1] - V[1]);
      const r = Math.min(rr, i === 1 ? d1 : d1 / 2, i === Q.length - 2 ? d2 : d2 / 2);
      const u = [(V[0] - A[0]) / d1, (V[1] - A[1]) / d1], v = [(B[0] - V[0]) / d2, (B[1] - V[1]) / d2];
      const c = [V[0] - u[0] * r + v[0] * r, V[1] - u[1] * r + v[1] * r];
      const a0 = Math.atan2(-v[1], -v[0]);
      let da = Math.atan2(u[1], u[0]) - a0;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      for (let m = 0; m <= 10; m++) { const t = a0 + da * m / 10; out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); }
    }
    out.push(Q[Q.length - 1]);
    return out;
  }
  // Resample a point list to m points evenly spaced by arc length.
  function resample(pts, m) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1], out = [];
    let i = 1;
    for (let q = 0; q < m; q++) {
      const d = L * q / (m - 1);
      while (i < pts.length - 1 && cum[i] < d) i++;
      const t = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
    }
    return out;
  }
  function stroke(g, pts, frac, color, lw) {
    let L = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
    const stop = L * frac;
    g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (cum[i] <= stop) { g.lineTo(pts[i][0], pts[i][1]); continue; }
      const t = (stop - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
      g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t);
      break;
    }
    g.stroke();
  }
  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, ease, seg, lerp } = env;
      // The composition (grid, pipe ends 0.2 s to the right, entry dots 0.2 s below) fills
      // ~88% of the stage height and is centred as a whole.
      const s = Math.min(box.w * 0.66 / 4.2, box.h * 0.88 / 4.25) * (1 + 0.025 * ease.soft(seg(p, 0.2, 1)));
      const gx = box.x + box.w / 2 - 2.1 * s, gy = box.y + box.h / 2 - 2.12 * s;
      const X = j => gx + (j - 0.5) * s, Y = i => gy + (i - 0.5) * s;
      const bot = gy + n * s + s * 0.2, right = gx + n * s + s * 0.2;
      // 2-beat card (0.94 s): built by p = 0.2, first droop lands just before the beat at
      // p = 0.5, the second by p = 0.78; the last fifth holds the final diagram, glowing.
      const build = seg(p, 0, 0.2, ease.out);
      const d1 = seg(p, 0.21, 0.44, ease.inOut), d2 = seg(p, 0.55, 0.78, ease.inOut);
      const stage = d2 > 0.5 ? 2 : d1 > 0.5 ? 1 : 0;

      // Grid.
      const lw = clamp(s * 0.022, 1.5, 3);
      ctx.strokeStyle = rgba(C.faint, 0.95 * clamp(build * 3)); ctx.lineWidth = clamp(s * 0.011, 1, 1.6); ctx.beginPath();
      for (let t = 0; t <= n; t++) {
        ctx.moveTo(gx + t * s, gy); ctx.lineTo(gx + t * s, gy + n * s);
        ctx.moveTo(gx, gy + t * s); ctx.lineTo(gx + n * s, gy + t * s);
      }
      ctx.stroke();

      // Blank tiles, each weighted x_i (its row): they move when the pipe droops.
      const cur = BLANKS[stage], prev = BLANKS[Math.max(0, stage - 1)];
      const dq = stage === 0 ? 1 : seg(stage === 1 ? d1 : d2, 0.5, 1, ease.out);
      const tiles = new Map();
      cur.forEach(([i, j]) => tiles.set(`${i},${j}`, [i, j, prev.some(b => b[0] === i && b[1] === j) ? 1 : dq]));
      if (stage > 0) prev.forEach(([i, j]) => { const key = `${i},${j}`; if (!tiles.has(key)) tiles.set(key, [i, j, -(1 - dq)]); });
      tiles.forEach(([i, j, a]) => {
        const al = Math.abs(a) * clamp((build - 0.5) * 3);
        if (al <= 0.01) return;
        const g = s * 0.36 * (a > 0 ? U.pop(a) : 1);
        const f = a > 0 && a < 1 ? 1 - seg(a, 0.6, 1) : 0;          // a new blank flashes amber
        const col = C.cyan.map((v, m) => Math.round(lerp(v, C.amber[m], f)));
        ctx.fillStyle = rgba(col, 0.13 * al); ctx.fillRect(X(j) - g, Y(i) - g, 2 * g, 2 * g);
        ctx.strokeStyle = rgba(col, 0.8 * al); ctx.lineWidth = lw * 0.6; ctx.strokeRect(X(j) - g, Y(i) - g, 2 * g, 2 * g);
        if (f > 0) { hot.strokeStyle = rgba(C.amber, 0.6 * f); hot.lineWidth = lw * 0.7; hot.strokeRect(X(j) - g, Y(i) - g, 2 * g, 2 * g); }
        U.math(ctx, `x_${i}`, X(j) - s * 0.03, Y(i) + s * 0.1, s * 0.3, rgba(C.ink, 0.95), 'center', al);
      });

      // Fixed pipes: up from the south edge, east to the exit row.
      ctx.lineCap = 'round';
      FIXED.forEach(([c, r], m) => {
        const pts = flatten([[X(c), bot], [X(c), Y(r)], [right, Y(r)]], s / 2);
        stroke(ctx, pts, clamp(build * 1.25 - m * 0.08), rgba(C.ink, 0.95), lw);
      });
      // The drooping pipe (column 1 -> row 1). Its three shapes, as corner lists;
      // a droop blends two consecutive shapes point by point along arc length.
      const SH = [
        [[X(1), bot], [X(1), Y(1)], [right, Y(1)]],
        [[X(1), bot], [X(1), Y(3)], [X(2), Y(3)], [X(2), Y(1)], [right, Y(1)]],
        [[X(1), bot], [X(1), Y(3)], [X(2), Y(3)], [X(2), Y(2)], [X(3), Y(2)], [X(3), Y(1)], [right, Y(1)]],
      ].map(c => resample(flatten(c, s / 2), 240));
      const [A, B, t] = d2 > 0 ? [SH[1], SH[2], d2] : [SH[0], SH[1], d1];
      const pts = A.map((a, i) => [lerp(a[0], B[i][0], t), lerp(a[1], B[i][1], t)]);
      // The droop rectangle: NW corner the elbow that moves, SE corner the blank it lands on.
      const rect = d2 > 0 ? [1, 2, 2, 3, d2] : [1, 1, 3, 2, d1];
      const ra = Math.sin(Math.PI * clamp(rect[4])) * 0.9;
      if (ra > 0.01) {
        const [a0, b0, c0, e0] = rect;
        ctx.save(); ctx.setLineDash([s * 0.08, s * 0.07]); ctx.strokeStyle = rgba(C.amber, ra); ctx.lineWidth = lw * 0.6;
        ctx.strokeRect(gx + (b0 - 1) * s + 3, gy + (a0 - 1) * s + 3, (e0 - b0 + 1) * s - 6, (c0 - a0 + 1) * s - 6);
        ctx.restore();
      }
      const pf = clamp(build * 1.25 - 0.24);
      stroke(ctx, pts, pf, rgba(C.amber, 1), lw * 1.15);
      stroke(hot, pts, pf, rgba(C.amber, 0.55 + 0.25 * k), lw * 1.6);
      ctx.lineCap = 'butt';
      // Entry dots on the south edge.
      for (let c = 1; c <= n; c++) U.dot(ctx, X(c), bot, s * 0.05 * clamp(build * 4), rgba(c === 1 ? C.amber : C.ink, 1));
    },
  };
})());
