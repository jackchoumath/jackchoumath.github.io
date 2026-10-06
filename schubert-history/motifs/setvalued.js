// Buch (2002): K-theoretic Littlewood-Richardson rule.  Stable Grothendieck
// polynomials are sums over SET-VALUED tableaux:  G_lambda = sum_T (-1)^{|T|-|lambda|} x^T.
// A set-valued tableau fills each box with a nonempty set so that
//   max(box) <= min(box to its right)   and   max(box) < min(box below),
// i.e. every choice of one entry per box is a semistandard tableau.
// Here lambda = (3,2).  Start from the SSYT  1 1 3 / 2 4  and add, in amber,
//   2 to box (0,1)  ->  {1,2}      3 to box (1,0)  ->  {2,3}      4 to box (0,2)  ->  {3,4}
// Every stage was checked in python with BOTH characterizations above:
//   1 . 1 . 3 / 2 . 4            (+) x1^2 x2 x3 x4
//   1 . 12 . 3 / 2 . 4           (-) x1^2 x2^2 x3 x4
//   1 . 12 . 3 / 23 . 4          (+) x1^2 x2^2 x3^2 x4
//   1 . 12 . 34 / 23 . 4         (-) x1^2 x2^2 x3^2 x4^2
MOTIF('setvalued', (() => {
  const SHAPE = [3, 2];
  const BASE = [[1, 1, 3], [2, 4]];
  const ADD = [[0, 1, 2], [1, 0, 3], [0, 2, 4]];          // [row, col, new entry], in order
  // Sanity check of the final tableau (rows weak via max<=min, columns strict via max<min).
  const FINAL = BASE.map(row => row.map(v => [v]));
  ADD.forEach(([r, c, v]) => FINAL[r][c].push(v));
  const ok = FINAL.every((row, r) => row.every((S, c) =>
    (c + 1 >= row.length || Math.max(...S) <= Math.min(...row[c + 1])) &&
    (r + 1 >= FINAL.length || c >= FINAL[r + 1].length || Math.max(...S) < Math.min(...FINAL[r + 1][c]))));
  if (!ok) throw new Error('setvalued: invalid tableau');

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const s = Math.min(box.w / 4.4, box.h / 3.55);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const gx = cx - 1.5 * s, gy = cy - 1.36 * s;
      const live = clamp((p - 0.62) / 0.38);
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      for (const g of [ctx, hot]) { g.save(); g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      const T0 = 0.2, DT = 0.15;                             // ADD[i] lands at T0 + i*DT
      const addQ = i => seg(p, T0 + i * DT, T0 + i * DT + 0.09);

      // --- boxes -------------------------------------------------------------------
      let idx = 0;
      SHAPE.forEach((len, r) => {
        for (let c = 0; c < len; c++, idx++) {
          const q = U.stagger(p, idx, 5, 0, 0.12, 0.5);
          if (q <= 0) continue;
          const sc = U.pop(q), x = gx + c * s + s / 2, y = gy + r * s + s / 2, h = (s - 4) / 2 * sc;
          ctx.save(); ctx.globalAlpha = clamp(q * 2);
          ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = 2.4;
          ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
          ctx.restore();
          // a set-valued box gets a faint amber wash once it holds two entries
          const ai = ADD.findIndex(([ar, ac]) => ar === r && ac === c), qa = ai >= 0 ? addQ(ai) : 0;
          if (qa > 0) {
            const fl = 1 - clamp((p - (T0 + ai * DT)) / 0.12);
            ctx.fillStyle = rgba(C.amber, 0.09 * qa); ctx.fillRect(x - h + 2, y - h + 2, 2 * h - 4, 2 * h - 4);
            hot.strokeStyle = rgba(C.amber, 0.55 * fl * qa); hot.lineWidth = 3;
            hot.strokeRect(x - h, y - h, 2 * h, 2 * h);
          }
        }
      });

      // --- entries -----------------------------------------------------------------
      const fs = s * 0.4;
      const glyph = (g, v, x, y, col, size = fs) => U.text(g, String(v), x, y, `${size}px ${F.main}`, col, 'center', 'middle');
      BASE.forEach((row, r) => row.forEach((v, c) => {
        const q = U.stagger(p, r * 3 + c, 5, 0.05, 0.17, 0.5);
        if (q <= 0) return;
        const x = gx + c * s + s / 2, y = gy + r * s + s / 2 + 1;
        const ai = ADD.findIndex(([ar, ac]) => ar === r && ac === c), qa = ai >= 0 ? addQ(ai) : 0;
        const ex = ease.out(qa);
        // the old entry slides left to make room; the new one pops in on the right
        glyph(ctx, v, x - ex * s * 0.19, y, rgba(C.ink, clamp(q * 2)));
        if (qa <= 0) return;
        const nv = ADD[ai][2], sc = lerp(1.9, 1, ease.back(qa)), a = clamp(qa * 2.5);
        const nx = x + s * 0.19, size = fs * sc;
        U.text(ctx, ',', x - s * 0.005, y + fs * 0.12, `${fs}px ${F.main}`, rgba(C.dim, a), 'center', 'middle');
        glyph(ctx, nv, nx, y, rgba(C.amber, a), size);
        const pulse = 0.65 + 0.2 * k + 0.15 * Math.sin(live * 10 + ai * 2);
        glyph(hot, nv, nx, y, rgba(C.amber, a * pulse), size);
      }));

      // --- the generating function (one formula) -----------------------------------
      U.math(ctx, 'G_{λ}\\;=\\;Σ_{T}\\,(−1)^{|T|−|λ|}\\,x^{T}', cx, gy + 2 * s + s * 0.72, s * 0.3, rgba(C.ink, 0.9), 'center', seg(p, 0.06, 0.16));
      ctx.restore(); hot.restore();
    },
  };
})());
