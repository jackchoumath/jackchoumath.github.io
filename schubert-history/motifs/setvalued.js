// Buch (2002): K-theoretic Littlewood-Richardson rule.  Stable Grothendieck
// polynomials are sums over SET-VALUED tableaux:  G_lambda = sum_T (-1)^{|T|-|lambda|} x^T.
// A set-valued tableau fills each box with a nonempty set so that
//   max(box) <= min(box to its right)   and   max(box) < min(box below),
// i.e. every choice of one entry per box is a semistandard tableau.
// Here lambda = (3,2).  Start from the SSYT  1 1 3 / 2 4  and add, in amber,
//   2 to box (0,1)  ->  {1,2}      3 to box (1,0)  ->  {2,3}      4 to box (0,2)  ->  {3,4}
// Every stage was checked in python with BOTH characterizations above, and the
// running term (-1)^{|T|-|lambda|} x^T shown in the notch of the shape is
//   1 . 1 . 3 / 2 . 4            (+) x1^2 x2 x3 x4
//   1 . 12 . 3 / 2 . 4           (-) x1^2 x2^2 x3 x4
//   1 . 12 . 3 / 23 . 4          (+) x1^2 x2^2 x3^2 x4
//   1 . 12 . 34 / 23 . 4         (-) x1^2 x2^2 x3^2 x4^2
// After the last entry lands (beat two of a 4-beat card) the tableau shows its
// defining property: on beats 2.5 and 3 one entry of each set is picked (the other dims;
// all 8 such choices were checked to be semistandard), and on beat 3.5 the full sets return.
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
  // Exponent vector of x^T after m additions (computed, not typed in).
  const EXPO = [0, 1, 2, 3].map(m => {
    const e = [0, 0, 0, 0];
    BASE.flat().forEach(v => e[v - 1]++);
    ADD.slice(0, m).forEach(([, , v]) => e[v - 1]++);
    return e;
  });
  // Choices shown after the build: for each added box, take the old (0) or new (1) entry
  // (two complementary choices, so every entry is picked once), then back to the full sets.
  const CHOICES = [[0, 1, 0], [1, 0, 1], null];

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const T0 = 0.25, DT = 0.125;                           // ADD[i] lands at T0 + i*DT (beat 1, 1.5, 2)
      const addQ = i => seg(p, T0 + i * DT - 0.075, T0 + i * DT);
      const nAdd = ADD.filter((_, i) => p >= T0 + i * DT - 0.03).length;
      const CH0 = 0.625;                                     // choices on beats 2.5, 3; full sets on 3.5

      // ---- layout: tableau (3 x 2 cells of size s), running term in the notch, formula below
      const fsR = 0.27;                                      // running-term size / s
      const termW = 5.6 * fsR;                               // its width (units of s), measured below
      const s = Math.min(box.w * 0.9 / (2.2 + termW), box.h * 0.86 / 2.82);
      const tW = Math.max(3, 2.2 + termW) * s;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const gx = cx - tW / 2, gy = cy - 2.82 * s / 2;
      const lw = clamp(s * 0.012, 1.5, 3);
      const live = clamp((p - 0.5) / 0.5);
      const drift = 1 + 0.025 * ease.soft(clamp((p - 0.3) / 0.7));
      for (const g of [ctx, hot]) { g.save(); g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      // --- boxes -------------------------------------------------------------------
      let idx = 0;
      SHAPE.forEach((len, r) => {
        for (let c = 0; c < len; c++, idx++) {
          const q = U.stagger(p, idx, 5, 0, 0.12, 0.5);
          if (q <= 0) continue;
          const sc = U.pop(q), x = gx + c * s + s / 2, y = gy + r * s + s / 2, h = (s / 2 - Math.max(2, s * 0.012)) * sc;
          const ai = ADD.findIndex(([ar, ac]) => ar === r && ac === c), qa = ai >= 0 ? addQ(ai) : 0;
          if (qa > 0) {                                      // a set-valued box gets a faint amber wash
            ctx.fillStyle = rgba(C.amber, 0.08 * qa); ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
            const fl = Math.exp(-Math.max(0, p - (T0 + ai * DT)) * 14) * qa;
            if (fl > 0.02) { hot.strokeStyle = rgba(C.amber, 0.6 * fl); hot.lineWidth = lw * 1.4; hot.strokeRect(x - h, y - h, 2 * h, 2 * h); }
          }
          ctx.save(); ctx.globalAlpha = clamp(q * 2);
          ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = lw;
          ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
          ctx.restore();
        }
      });

      // --- entries -----------------------------------------------------------------
      const fs = s * 0.4;
      const glyph = (g, v, x, y, col, size = fs) => U.text(g, String(v), x, y, `${size}px ${F.main}`, col, 'center', 'middle');
      // which choice is showing (null before the build is done)
      const ci = p >= CH0 - 0.02 ? Math.min(CHOICES.length - 1, Math.floor((p - CH0 + 0.02) / 0.125)) : -1;
      const chA = ci >= 0 ? clamp((p - CH0 + 0.02 - ci * 0.125) / 0.03) : 0;   // quick crossfade in
      BASE.forEach((row, r) => row.forEach((v, c) => {
        const q = U.stagger(p, r * 3 + c, 5, 0.05, 0.17, 0.5);
        if (q <= 0) return;
        const x = gx + c * s + s / 2, y = gy + r * s + s / 2 + 1;
        const ai = ADD.findIndex(([ar, ac]) => ar === r && ac === c), qa = ai >= 0 ? addQ(ai) : 0;
        const ex = ease.out(qa);
        let dimOld = 1, dimNew = 1;
        if (ai >= 0 && ci >= 0) {
          const dims = ch => (ch === null || ch === undefined ? [1, 1] : ch[ai] ? [0.28, 1] : [1, 0.28]);
          const to = dims(CHOICES[ci]), from = dims(ci > 0 ? CHOICES[ci - 1] : null);
          dimOld = lerp(from[0], to[0], chA); dimNew = lerp(from[1], to[1], chA);
        }
        // the old entry slides left to make room; the new one pops in on the right
        glyph(ctx, v, x - ex * s * 0.19, y, rgba(C.ink, clamp(q * 2) * dimOld));
        if (qa <= 0) return;
        const nv = ADD[ai][2], sc = lerp(1.9, 1, ease.back(qa)), a = clamp(qa * 2.5);
        const nx = x + s * 0.19, size = fs * sc;
        U.text(ctx, ',', x - s * 0.005, y + fs * 0.12, `${fs}px ${F.main}`, rgba(C.dim, a), 'center', 'middle');
        glyph(ctx, nv, nx, y, rgba(C.amber, a * dimNew), size);
        const landed = Math.exp(-Math.max(0, p - (T0 + ai * DT)) * 10);
        const back = ci === CHOICES.length - 1 ? Math.exp(-Math.max(0, p - CH0 - ci * 0.125) * 10) : 0;   // all sets lit again
        glyph(hot, nv, nx, y, rgba(C.amber, a * dimNew * Math.min(0.3, 0.12 + 0.08 * k * live + 0.18 * Math.max(landed, back))), size);
      }));

      // --- the running term (-1)^{|T|-|lambda|} x^T, in the notch right of row 2 --------
      const ta = seg(p, 0.14, 0.22);
      if (ta > 0) {
        const fz = s * fsR, tx = gx + 2.2 * s, ty = gy + 1.5 * s + fz * 0.3;
        const m = Math.min(nAdd, 3), e = EXPO[m];
        const flip = m > 0 ? Math.exp(-Math.max(0, p - (T0 + (m - 1) * DT)) * 12) : 0;
        const sign = m % 2 ? '−' : '+';
        const sc = 1 + 0.35 * flip;
        // sign (amber the moment it flips), then the factors x_i^{e_i}; the one that just grew is amber
        ctx.save(); ctx.translate(tx + fz * 0.3, ty - fz * 0.3); ctx.scale(sc, sc);
        U.math(ctx, sign, 0, fz * 0.3, fz, rgba(m ? C.amber : C.ink, ta * (m ? lerp(0.85, 1, flip) : 0.9)), 'center');
        ctx.restore();
        let x = tx + fz * 0.85;
        const grew = m > 0 ? ADD[m - 1][2] - 1 : -1;
        e.forEach((ei, i) => {
          if (!ei) return;
          const str = `x_${i + 1}` + (ei > 1 ? `^${ei}` : '');
          const col = i === grew ? rgba(C.amber, ta) : rgba(C.ink, 0.92 * ta);
          x += U.math(ctx, str, x, ty, fz, col, 'left') + fz * 0.04;
        });
      }

      // --- the generating function (one formula) -----------------------------------
      U.math(ctx, 'G_{λ}\\;=\\;\\sum_{T}\\,(−1)^{|T|−|λ|}\\,x^{T}', cx, gy + 2 * s + s * 0.62, s * 0.24, rgba(C.ink, 0.9), 'center', seg(p, 0.06, 0.16));
      ctx.restore(); hot.restore();
    },
  };
})());
