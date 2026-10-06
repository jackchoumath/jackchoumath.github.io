// Motif 'regularity': Pechenik-Speyer-Weigandt, Castelnuovo-Mumford regularity of
// matrix Schubert varieties: reg(S/I_w) = deg G_w - l(w), and deg G_w = sum of the
// Rajchgot code of w (the top-degree part of G_w contains x^rajcode(w)).
// w = 1432, l(w) = 3, Rothe diagram D(w) = {(2,2),(2,3),(3,2)}. Computed in Python
// from G_{w0} = x1^3 x2^2 x3 with the isobaric operators pi_i f = d_i((1 - x_{i+1}) f):
//   G_1432 = x1^2x2 + x1^2x3 + x1x2^2 + x1x2x3 + x2^2x3          (degree 3 = S_1432)
//          - x1^2x2^2 - 2x1^2x2x3 - 2x1x2^2x3                    (degree 4)
//          + x1^2x2^2x3                                           (degree 5)
// rajcode(1432) = (2,2,1,0) (r_k = (n-k+1) - length of a longest increasing
// subsequence of w(k..n) starting with w(k); this gives deg G_w for all w in S_3..S_5,
// checked), sum 5 = deg G_w, and x^(2,2,1,0) is the top term. So the
// regularity is 5 - 3 = 2: the height of the stack above its Schubert base.
// Drawn in a 580 x 440 design frame scaled into the box.
MOTIF('regularity', (() => {
  const w = [1, 4, 3, 2], n = 4;
  const winv = []; w.forEach((v, i) => { winv[v] = i + 1; });
  const D = [];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) if (j < w[i - 1] && i < winv[j]) D.push([i, j]);
  // G_w by degree, lowest first (the Schubert polynomial is the bottom row)
  const ROWS = [
    ['x_1^2x_2', 'x_1^2x_3', 'x_1x_2^2', 'x_1x_2x_3', 'x_2^2x_3'],
    ['−x_1^2x_2^2', '−2x_1^2x_2x_3', '−2x_1x_2^2x_3'],
    ['x_1^2x_2^2x_3'],
  ];
  const VW = 580, VH = 440;
  const FS = 23, BH = 48, ROWGAP = 66, GAP = 7, baseY = 344, cx0 = 356;   // the stack
  const cs = 36, gx = 14, gy = baseY - ROWGAP - 2 * cs;                       // the Rothe grid
  const bump = x => Math.max(0, 1 - Math.abs(x));

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const sc = Math.min(box.w / VW, box.h / VH);
      const ox = box.x + (box.w - VW * sc) / 2, oy = box.y + (box.h - VH * sc) / 2;
      const drift = 1 + 0.025 * ease.soft(clamp((p - 0.35) / 0.65)) + 0.012 * k;
      for (const g of [ctx, hot]) {
        g.save(); g.translate(ox, oy); g.scale(sc, sc);
        g.translate(VW / 2, VH / 2); g.scale(drift, drift); g.translate(-VW / 2, -VH / 2);
      }
      // degree sweeps after the build: the light climbs the stack row by row
      const sweep = r => [0.48, 0.74].reduce((a, t0) => Math.max(a, bump((p - t0 - r * 0.055) / 0.05)), 0);

      // ---------------------------------------------------- Rothe diagram of w
      const X = j => gx + (j - 0.5) * cs, Y = i => gy + (i - 0.5) * cs;
      ctx.strokeStyle = rgba(C.faint, seg(p, 0, 0.06, ease.out)); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let t = 0; t <= n; t++) {
        ctx.moveTo(gx + t * cs, gy); ctx.lineTo(gx + t * cs, gy + n * cs);
        ctx.moveTo(gx, gy + t * cs); ctx.lineTo(gx + n * cs, gy + t * cs);
      }
      ctx.stroke();
      for (let i = 1; i <= n; i++) {               // dots and their death rays (right, down)
        const q = seg(p, 0.01 + (i - 1) * 0.016, 0.08 + (i - 1) * 0.016, ease.out);
        if (q <= 0) continue;
        const x = X(w[i - 1]), y = Y(i);
        U.drawOn(ctx, x, y, gx + n * cs, y, q, rgba(C.cyan, 0.6), 2);
        U.drawOn(ctx, x, y, x, gy + n * cs, q, rgba(C.cyan, 0.6), 2);
        U.dot(ctx, x, y, 5.5 * U.pop(q), rgba(C.ink, 1));
      }
      D.forEach(([i, j], m) => {                    // the l(w) = 3 boxes of D(w)
        const q = seg(p, 0.07 + m * 0.02, 0.13 + m * 0.02);
        if (q <= 0) return;
        const s2 = U.pop(q) * (cs - 9), cx = X(j), cy = Y(i);
        ctx.fillStyle = rgba(C.ink, 0.16); ctx.fillRect(cx - s2 / 2, cy - s2 / 2, s2, s2);
        ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = 2; ctx.strokeRect(cx - s2 / 2, cy - s2 / 2, s2, s2);
        const fl = Math.max(bump((p - 0.07 - m * 0.02 - 0.06) / 0.05), sweep(0));
        if (fl > 0) { hot.strokeStyle = rgba(C.ink, 0.8 * fl); hot.lineWidth = 3; hot.strokeRect(cx - s2 / 2, cy - s2 / 2, s2, s2); }
      });

      // ---------------------------------------------------- the stack of G_w
      const widths = ROWS.map(row => row.map(t => Math.max(58, U.math(ctx, t, -9999, -9999, FS, 'rgba(0,0,0,0)') + 18)));
      const rowT = [0.1, 0.17, 0.23];               // when each row starts rising
      ROWS.forEach((row, r) => {
        const tot = widths[r].reduce((a, b) => a + b, 0) + GAP * (row.length - 1);
        let x = cx0 - tot / 2;
        const top = r === ROWS.length - 1, col = top ? C.amber : r === 0 ? C.ink : C.dim;
        row.forEach((t, m) => {
          const bw = widths[r][m], st = rowT[r] + m * 0.01, bx = x;
          x += bw + GAP;
          const q = clamp((p - st) / 0.07);
          if (q <= 0) return;
          const bob = 1.5 * Math.sin(6.283 * (p * 1.3 + m * 0.17 + r * 0.31)) * clamp((p - 0.35) / 0.1);
          const y = baseY - r * ROWGAP + (1 - ease.out(q)) * 40 + bob, a = clamp(q * 3);
          ctx.globalAlpha = a;
          ctx.fillStyle = rgba(col, top ? 0.16 : 0.08); ctx.fillRect(bx, y - BH / 2, bw, BH);
          ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = top ? 2.5 : 2; ctx.strokeRect(bx, y - BH / 2, bw, BH);
          ctx.globalAlpha = 1;
          U.math(ctx, t, bx + bw / 2, y + FS * 0.32, FS, rgba(top ? C.amber : C.ink, 1), 'center', a);
          const land = bump((q - 0.85) / 0.2) * 0.6, fl = Math.max(land, sweep(r));
          const glow = top ? clamp(0.45 + 0.55 * (1 - clamp((p - st - 0.05) / 0.15)) + 0.25 * k + fl) : fl;
          if (glow > 0) {
            hot.strokeStyle = rgba(top ? C.amber : C.ink, glow * a); hot.lineWidth = 3; hot.strokeRect(bx, y - BH / 2, bw, BH);
            if (top) U.math(hot, t, bx + bw / 2, y + FS * 0.32, FS, rgba(C.amber, 1), 'center', clamp(glow * 0.8) * a);
          }
        });
      });

      // ---------------------------------------------------- the span = regularity
      // a ruler beside the stack: one tick per degree 3, 4, 5, i.e. two steps
      const aq = seg(p, 0.24, 0.33, ease.out);
      if (aq > 0) {
        const ax = 556, y0 = baseY, yb = lerp(y0, baseY - 2 * ROWGAP, aq);
        for (const [g, a, lw] of [[ctx, 1, 2.5], [hot, 0.55 + 0.3 * k + 0.4 * sweep(2), 3]]) {
          U.line(g, ax, y0, ax, yb, rgba(C.amber, clamp(a)), lw);
          [0, 1, 2].forEach(r => { const ty = baseY - r * ROWGAP; if (yb <= ty + 0.5) U.line(g, ax - 7, ty, ax + 7, ty, rgba(C.amber, clamp(a)), lw); });
        }
      }
      // reg = deg G_w - l(w) = 2  ("reg = deg" upright, the rest in math italic)
      const fq = seg(p, 0.22, 0.32, ease.out);
      if (fq > 0) {
        // reg(S/I_w) = deg G_w - l(w) (Pechenik-Speyer-Weigandt), spelled out for w = 1432.
        const FZ = 31, fy = 104 + (1 - fq) * 10;
        ctx.font = `${FZ}px ${F.main}`;
        const wd = ctx.measureText('reg = deg ').width;
        const wm = U.math(ctx, '\\G_{1432} − \\ell(1432) = ', -9999, -9999, FZ, 'rgba(0,0,0,0)');
        const fx = VW / 2 - (wd + wm + FZ * 0.55) / 2;
        U.text(ctx, 'reg = deg', fx, fy, `${FZ}px ${F.main}`, rgba(C.ink, 1), 'left', 'alphabetic', fq);
        U.math(ctx, '\\G_{1432} − \\ell(1432) = ', fx + wd, fy, FZ, rgba(C.ink, 1), 'left', fq);
        const two = clamp((p - 0.28) / 0.07);
        if (two > 0) {
          const s2 = lerp(1.7, 1, ease.out(two)) * (1 + 0.05 * k), tx = fx + wd + wm + FZ * 0.3;
          const glow = 0.45 + 0.55 * (1 - clamp((p - 0.28) / 0.2)) + 0.4 * sweep(2);
          for (const [g, a] of [[ctx, 1], [hot, clamp(glow)]]) {
            g.save(); g.translate(tx, fy - FZ * 0.35); g.scale(s2, s2);
            U.math(g, '2', 0, FZ * 0.35, FZ * 1.15, rgba(C.amber, 1), 'center', a * clamp(two * 3));
            g.restore();
          }
        }
      }
      ctx.restore(); hot.restore();
    },
  };
})());
