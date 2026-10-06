// Pieri (1893): sigma_r * sigma_lambda = sum of sigma_mu over mu with mu/lambda a
// horizontal strip of r boxes.  lambda = (3,1) in ivory; the two amber boxes snap
// through every valid mu for r = 2 (computed below: 51, 42, 411, 33, 321), one per
// eighth note.  Faint dashed slots mark where strip boxes may go -- exactly one slot
// per column, which is the "no two in the same column" rule made visible.  Underneath,
// the identity  sigma_2 . sigma_31 = (sum of the five mu)  assembles term by term; on
// beat three the finished sum flashes as one.
// (Checked independently by expanding s_2 s_31 in 5 variables:
//  s_51 + s_42 + s_411 + s_33 + s_321.)
MOTIF('pieri', (() => {
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
  const COLS = lam[0] + R, ROWS = lam.length;          // 5 x 3 grid
  const THW = MU.reduce((a, m) => a + m[0], 0);         // total thumbnail width, in cells (19)
  const THR = Math.max(...MU.map(m => m.filter(v => v > 0).length)); // tallest thumbnail (3 rows)

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease } = env;

      // mu_i snaps on at TS[i]: on the eighth notes of the 1.875 s card.
      const TS = MU.map((_, i) => 0.125 * (i + 1));
      let cur = -1;
      TS.forEach((t0, i) => { if (p >= t0) cur = i; });
      const since = cur >= 0 ? p - TS[cur] : 0;
      const done = clamp((p - 0.75) / 0.02);           // beat three: the sum is complete
      const doneFl = p >= 0.75 ? Math.exp(-(p - 0.75) * 9) : 0;

      // Layout in units of the big cell s: 5 x 3 diagram, then the equation row
      //   sigma_2 . sigma_31 = [thumb] + [thumb] + ... ; both centred, sized to fill.
      const LAB = '\\sigma_2\\,\\cdot\\,\\sigma_{31}\\;=';
      const tU = 0.33, plU = 0.56, fsU = 0.4, gapU = 0.22, vgU = 0.5, bU = 1.15; // bU: big cell
      const labU = U.math(ctx, LAB, -9999, -9999, 100, rgba(C.ink, 0)) / 100 * fsU;
      const rowU = labU + gapU + THW * tU + (MU.length - 1) * plU;
      const hU = ROWS * bU + vgU + THR * tU;
      const u = Math.min(box.w * 0.94 / Math.max(rowU, COLS * bU), box.h * 0.86 / hU) * (1 + 0.015 * ease.soft(p));
      const s = u * bU, t = u * tU, plusW = u * plU, fs = u * fsU;
      const cx = box.x + box.w / 2, gy = box.y + box.h / 2 - hU * u / 2;
      // The 5 x 3 grid is centred a little right of its box: its mass (lambda) sits left.
      const gx = cx - COLS * s / 2 + 0.18 * s;
      const lw = Math.max(1.5, Math.min(3, s * 0.02));

      // --- lambda in ivory (pops in) ------------------------------------------------
      const cells = lam.flatMap((n, r) => Array.from({ length: n }, (_, c) => [r, c]));
      cells.forEach(([r, c], i) => {
        const q = U.stagger(p, i, cells.length, 0, 0.08, 0.5);
        if (q <= 0) return;
        const sc = U.pop(q), x = gx + c * s + s / 2, y = gy + r * s + s / 2;
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
        U.young(ctx, [1], gx + c * s, gy + r * s, s, { stroke: rgba(C.ink, 0.95), lw: lw * 1.1 });
        ctx.restore();
      });

      // --- dashed candidate slots (one per column) ---------------------------------
      const sa = clamp((p - 0.05) / 0.06);
      if (sa > 0) {
        const filled = cur >= 0 ? added(MU[cur]) : [];
        const m = Math.max(2, s * 0.035);
        ctx.save(); ctx.setLineDash([s * 0.09, s * 0.07]); ctx.lineDashOffset = -p * s * 0.9; // marching dashes
        ctx.lineWidth = Math.max(1.2, lw * 0.6); ctx.strokeStyle = rgba(C.dim, 0.65 * sa);
        SLOTS.forEach(([r, c]) => {
          if (filled.some(([fr, fc]) => fr === r && fc === c) && since > 0.02) return;
          ctx.strokeRect(gx + c * s + m, gy + r * s + m, s - 2 * m, s - 2 * m);
        });
        ctx.restore();
      }

      // --- the two strip boxes for the current mu (amber, snapping on) -------------
      const box1 = (g, x, y, w, a, fillA, lw) => {
        g.fillStyle = rgba(C.amber, fillA * a); g.fillRect(x + 1.5, y + 1.5, w - 3, w - 3);
        g.strokeStyle = rgba(C.amber, a); g.lineWidth = lw; g.strokeRect(x + 1.5, y + 1.5, w - 3, w - 3);
      };
      if (cur >= 1 && since < 0.04) {                  // previous strip lets go as the next snaps on
        const f = 1 - since / 0.04;
        added(MU[cur - 1]).forEach(([r, c]) => {
          const w = s * lerp(0.8, 1, f), x = gx + c * s + s / 2, y = gy + r * s + s / 2;
          box1(ctx, x - w / 2, y - w / 2, w, f, 0.3, lw * 1.1);
          box1(hot, x - w / 2, y - w / 2, w, 0.5 * f, 0.3, lw * 1.1);
        });
      }
      if (cur >= 0) {
        const glow = 0.6 + 0.25 * k + 0.15 * doneFl;
        added(MU[cur]).forEach(([r, c], j) => {
          const q = clamp((since - j * 0.016) / 0.045);
          if (q <= 0) return;
          const sc = lerp(1.45, 1, ease.back(q)) * (1 + 0.03 * k), a = clamp(q * 3);
          const x = gx + c * s + s / 2, y = gy + r * s + s / 2, w = s * sc;
          box1(ctx, x - w / 2, y - w / 2, w, a, 0.3, lw * 1.1);
          box1(hot, x - w / 2, y - w / 2, w, a * glow, 0.3, lw * 1.1);
          // snap flash
          const fl = 1 - clamp(since / 0.06);
          if (fl > 0) { hot.fillStyle = rgba(C.amberHot, 0.25 * fl); hot.fillRect(x - w / 2 + 3, y - w / 2 + 3, w - 6, w - 6); }
        });
      }

      // --- the equation row:  sigma_2 . sigma_31 = mu_1 + mu_2 + ... -------------------
      const ry = gy + ROWS * s + vgU * u;                 // thumbnails' top (top-aligned)
      const mid = ry + t;                               // math axis of the row
      let x = cx - rowU * u / 2;
      const la = clamp((p - 0.03) / 0.08);
      U.math(ctx, LAB, x, mid + fs * 0.3 + (1 - la) * fs * 0.3, fs, rgba(C.ink, 0.95), 'left', la);
      x += (labU + gapU) * u;
      MU.forEach((mu, i) => {
        const q = clamp((p - TS[i]) / 0.05);
        if (i > 0) U.text(ctx, '+', x - plusW / 2, mid + fs * 0.3, `${fs}px ${F.main}`, rgba(C.ink, 0.75), 'center', 'alphabetic', q);
        const w = mu[0] * t;
        if (q > 0) {
          const on = Math.max(i === cur ? 1 : 0.5, done), sc = lerp(1.6, 1, ease.back(q)) * (1 + 0.05 * doneFl);
          const tx = x + w / 2, ty = ry + t;
          const add = added(mu), shape = mu.filter(m => m > 0);
          const isAdd = (r, c) => add.some(([ar, ac]) => ar === r && ac === c);
          ctx.save(); ctx.translate(tx, ty); ctx.scale(sc, sc); ctx.translate(-tx, -ty);
          U.young(ctx, shape, x, ry, t, {
            lw: Math.max(1.2, lw * 0.7), alpha: () => clamp(q * 2), stroke: rgba(C.ink, 0.92 * on),
            fill: (r, c) => (isAdd(r, c) ? rgba(C.amber, 0.95 * on) : null),
          });
          ctx.restore();
          const ha = i === cur ? 0.28 * q : 0.22 * doneFl;
          if (ha > 0.01) add.forEach(([r, c]) => {
            hot.fillStyle = rgba(C.amber, ha);
            hot.fillRect(tx + (x + c * t + 1.5 - tx) * sc, ty + (ry + r * t + 1.5 - ty) * sc, (t - 3) * sc, (t - 3) * sc);
          });
        }
        x += w + plusW;
      });
    },
  };
})());
