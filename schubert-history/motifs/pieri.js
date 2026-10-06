// Pieri (1893): sigma_r * sigma_lambda = sum of sigma_mu over mu with mu/lambda a
// horizontal strip of r boxes.  lambda = (3,1) in ivory; the two amber boxes snap
// through every valid mu for r = 2 (computed below: 51, 42, 411, 33, 321).  Faint
// dashed slots mark where strip boxes may go -- exactly one slot per column, which is
// the "no two in the same column" rule made visible.  Underneath, the identity
// sigma_2 . sigma_31 = (sum of the five mu) assembles term by term.
MOTIF('pieri', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease } = env;
    const lam = [3, 1, 0], R = 2;

    // mu interlaces lambda: lam_i <= mu_i <= lam_{i-1}, |mu| - |lam| = R (lex-descending).
    const MU = [];
    (function gen(i, acc, left) {
      if (i === lam.length) { if (left === 0) MU.push(acc); return; }
      const hi = i === 0 ? lam[0] + left : Math.min(lam[i - 1], lam[i] + left);
      for (let m = hi; m >= lam[i]; m--) gen(i + 1, [...acc, m], left - (m - lam[i]));
    })(0, [], R);
    const added = mu => mu.flatMap((m, i) => Array.from({ length: m - lam[i] }, (_, j) => [i, lam[i] + j]));
    // One candidate slot per column c: the row i with lam_i <= c < lam_{i-1}.
    const SLOTS = [];
    for (let c = 0; c < lam[0] + R; c++) { let i = 0; while (i + 1 < lam.length && lam[i] > c) i++; SLOTS.push([i, c]); }

    const T0 = 0.13, DT = 0.14;                       // mu_i snaps on at T0 + i*DT
    const cur = Math.max(-1, Math.min(MU.length - 1, Math.floor((p - T0) / DT)));
    const since = cur >= 0 ? p - (T0 + cur * DT) : 0;

    // Layout: big diagram (5 x 3 grid) above, the sum of the five terms below.
    const s = Math.min(box.w / 6.6, box.h / 5.0) * (1 + 0.015 * ease.soft(p));
    const t = s * 0.22;                               // thumbnail cell
    const gx = box.x + box.w / 2 - 2.5 * s, gy = box.y + box.h / 2 - (3.55 * s + 3 * t) / 2;

    // --- lambda in ivory (pops in) ------------------------------------------------
    const cells = lam.flatMap((n, r) => Array.from({ length: n }, (_, c) => [r, c]));
    cells.forEach(([r, c], i) => {
      const q = U.stagger(p, i, cells.length, 0, 0.12, 0.5);
      if (q <= 0) return;
      const sc = U.pop(q), cx = gx + c * s + s / 2, cy = gy + r * s + s / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      U.young(ctx, [1], gx + c * s, gy + r * s, s, { stroke: rgba(C.ink, 0.95), lw: 2.4 });
      ctx.restore();
    });

    // --- dashed candidate slots (one per column) ---------------------------------
    const sa = clamp((p - 0.07) / 0.08);
    if (sa > 0) {
      const filled = cur >= 0 ? added(MU[cur]) : [];
      ctx.save(); ctx.setLineDash([s * 0.09, s * 0.07]); ctx.lineDashOffset = -p * s * 0.9; // marching dashes
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.dim, 0.6 * sa);
      SLOTS.forEach(([r, c]) => {
        if (filled.some(([fr, fc]) => fr === r && fc === c) && since > 0.03) return;
        ctx.strokeRect(gx + c * s + 4, gy + r * s + 4, s - 8, s - 8);
      });
      ctx.restore();
    }

    // --- the two strip boxes for the current mu (amber, snapping on) -------------
    const box1 = (g, x, y, w, a, fillA, lw) => {
      g.fillStyle = rgba(C.amber, fillA * a); g.fillRect(x + 1.5, y + 1.5, w - 3, w - 3);
      g.strokeStyle = rgba(C.amber, a); g.lineWidth = lw; g.strokeRect(x + 1.5, y + 1.5, w - 3, w - 3);
    };
    if (cur >= 1 && since < 0.045) {                  // previous strip lets go as the next snaps on
      const f = 1 - since / 0.045;
      added(MU[cur - 1]).forEach(([r, c]) => {
        const w = s * lerp(0.8, 1, f), cx = gx + c * s + s / 2, cy = gy + r * s + s / 2;
        box1(ctx, cx - w / 2, cy - w / 2, w, f, 0.3, 2.6);
        box1(hot, cx - w / 2, cy - w / 2, w, 0.6 * f, 0.45, 2.6);
      });
    }
    if (cur >= 0) {
      const glow = 0.7 + 0.2 * k + 0.1 * Math.sin(p * 18);
      added(MU[cur]).forEach(([r, c], j) => {
        const q = clamp((since - j * 0.018) / 0.05);
        if (q <= 0) return;
        const sc = lerp(1.45, 1, ease.back(q)), a = clamp(q * 3);
        const cx = gx + c * s + s / 2, cy = gy + r * s + s / 2, w = s * sc;
        box1(ctx, cx - w / 2, cy - w / 2, w, a, 0.3, 2.6);
        box1(hot, cx - w / 2, cy - w / 2, w, a * glow, 0.45, 2.6);
        // snap flash
        const fl = 1 - clamp(since / 0.07);
        if (fl > 0) { hot.fillStyle = rgba(C.amberHot, 0.3 * fl); hot.fillRect(cx - w / 2 + 3, cy - w / 2 + 3, w - 6, w - 6); }
      });
    }

    // --- label in the empty lower-right corner of the grid -------------------------
    const fs = s * 0.42, la = clamp((p - 0.05) / 0.1);
    U.math(ctx, '\\sigma_2\\cdot\\sigma_{31}', gx + 5 * s - s * 0.08, gy + 2.5 * s + fs * 0.32, fs, rgba(C.ink, 0.92), 'right', la);

    // --- the sum  mu_1 + mu_2 + ... + mu_5 , term by term ---------------------------
    const plusW = s * 0.42, ps = s * 0.36;
    const thW = MU.map(m => m[0] * t);
    const rowW = thW.reduce((a, b) => a + b, 0) + plusW * (MU.length - 1);
    const ry = gy + 3 * s + s * 0.55;                 // thumbnails' top (top-aligned)
    let x = box.x + box.w / 2 - rowW / 2;
    MU.forEach((mu, i) => {
      const q = clamp((p - (T0 + i * DT)) / 0.06);
      if (i > 0) U.text(ctx, '+', x - plusW / 2, ry + t + ps * 0.3, `${ps}px ${F.main}`, rgba(C.ink, 0.7), 'center', 'alphabetic', q);
      if (q > 0) {
        const on = i === cur ? 1 : 0.5, sc = lerp(1.6, 1, ease.back(q));
        const cx = x + thW[i] / 2, cy = ry + t;
        const add = added(mu), shape = mu.filter(m => m > 0);
        const isAdd = (r, c) => add.some(([ar, ac]) => ar === r && ac === c);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        U.young(ctx, shape, x, ry, t, {
          lw: 1.5, alpha: () => clamp(q * 2), stroke: rgba(C.ink, 0.92 * on),
          fill: (r, c) => (isAdd(r, c) ? rgba(C.amber, 0.95 * on) : null),
        });
        ctx.restore();
        if (i === cur) add.forEach(([r, c]) => { hot.fillStyle = rgba(C.amber, 0.55 * q); hot.fillRect(x + c * t + 1.5, ry + r * t + 1.5, t - 3, t - 3); });
      }
      x += thW[i] + plusW;
    });
  },
});
