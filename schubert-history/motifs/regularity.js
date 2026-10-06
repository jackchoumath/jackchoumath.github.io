// Motif 'regularity': Pechenik-Speyer-Weigandt, Castelnuovo-Mumford regularity of
// matrix Schubert varieties: reg(S/I_w) = deg G_w - l(w), and deg G_w = sum of the
// Rajchgot code of w (the top-degree part of G_w contains x^rajcode(w)).
// w = 1432, l(w) = 3. Computed in Python (sympy, re-checked for this cut) from
// G_{w0} = x1^3 x2^2 x3 with the isobaric operators pi_i f = d_i((1 - x_{i+1}) f):
//   G_1432 = x1^2x2 + x1^2x3 + x1x2^2 + x1x2x3 + x2^2x3          (degree 3 = S_1432)
//          - x1^2x2^2 - 2x1^2x2x3 - 2x1x2^2x3                    (degree 4)
//          + x1^2x2^2x3                                           (degree 5)
// rajcode(1432) = (2,2,1,0) (r_k = (n-k+1) - length of a longest increasing
// subsequence of w(k..n) starting with w(k)), sum 5 = deg G_w, and x^(2,2,1,0) is the
// top term. So the regularity is 5 - 3 = 2: the height of the stack above its
// Schubert base.
// Centre-stage cut (2 beats = 0.94 s, the beat at p = 0.5): stripped to the stack. The
// three degree rows rise (Schubert base ink, the correction terms dim, the single top
// term amber), the formula drops in above, a ruler beside the stack ticks off degrees
// 3, 4, 5 and the amber 2 lands by p = 0.44; on the beat, and again at p = 0.78, a light
// climbs the stack row by row.
MOTIF('regularity', (() => {
  const ROWS = [
    ['x_1^2x_2', 'x_1^2x_3', 'x_1x_2^2', 'x_1x_2x_3', 'x_2^2x_3'],
    ['−x_1^2x_2^2', '−2x_1^2x_2x_3', '−2x_1x_2^2x_3'],
    ['x_1^2x_2^2x_3'],
  ];
  const DEG = [3, 4, 5];
  const bump = x => Math.max(0, 1 - Math.abs(x));

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const meas = (t, z) => U.math(ctx, t, -9999, -9999, z, 'rgba(0,0,0,0)');
      // Layout in units of FS (the monomial size), measured at 100 px.
      const Z = 100;
      const BW = ROWS.map(row => row.map(t => Math.max(2.4, meas(t, Z) / Z + 0.75)));
      const GAPU = 0.28, BHU = 1.9, PITCH = 2.5;
      const rowW = BW.map(ws => ws.reduce((a, b) => a + b, 0) + GAPU * (ws.length - 1));
      const stackW = Math.max(...rowW), RULU = 2.4;                 // ruler + tick labels to the right
      const FZU = 1.25;
      ctx.font = `${Z}px ${F.main}`;
      const wF1 = ctx.measureText('reg = deg ').width / Z, wF2 = meas('\\G_{1432} − \\ell(1432) = ', Z) / Z, wTwo = 0.75;
      const formW = (wF1 + wF2 + wTwo) * FZU;
      const totH = FZU * 1.0 + 1.25 + 2 * PITCH + BHU;            // formula, gap, stack
      const FS = Math.min(box.h * 0.8 / totH, box.w * 0.9 / Math.max(stackW + RULU, formW));
      const drift = 1 + 0.025 * ease.soft(seg(p, 0.3, 1)) + 0.006 * k;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      for (const g of [ctx, hot]) { g.save(); g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }
      const top = cy - totH * FS / 2;
      const fy = top + FZU * FS * 0.78;                             // formula baseline
      const baseY = top + totH * FS - BHU * FS / 2;                 // centre line of the bottom row
      const sx = cx - (stackW + RULU) * FS / 2 + stackW * FS / 2;   // stack centre (stack + ruler centred)
      const lw = clamp(FS * 0.04, 1.4, 2.6), BH = BHU * FS;
      // the light climbing the stack after the reveal: on the beat (p = 0.5) and at p = 0.78
      const sweep = r => [0.5, 0.78].reduce((a, t0) => Math.max(a, bump((p - t0 - r * 0.06) / 0.07)), 0);

      // ---------------------------------------------------- the stack of G_w, by degree
      const rowT = [0.0, 0.07, 0.14];                               // when each row starts rising
      ROWS.forEach((row, r) => {
        let x = sx - rowW[r] * FS / 2;
        const isTop = r === ROWS.length - 1, col = isTop ? C.amber : r === 0 ? C.ink : C.dim;
        row.forEach((t, m) => {
          const bw = BW[r][m] * FS, st = rowT[r] + m * 0.018, bx = x;
          x += bw + GAPU * FS;
          const q = clamp((p - st) / 0.11);
          if (q <= 0) return;
          const bob = FS * 0.04 * Math.sin(6.283 * (p * 1.1 + m * 0.17 + r * 0.31)) * seg(p, 0.3, 0.45);
          const y = baseY - r * PITCH * FS + (1 - ease.out(q)) * FS * 0.9 + bob, a = clamp(q * 3);
          const sw = sweep(r);
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = rgba(col, isTop ? 0.16 : 0.07 + 0.08 * sw); ctx.fillRect(bx, y - BH / 2, bw, BH);
          ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = isTop ? lw * 1.1 : lw; ctx.strokeRect(bx, y - BH / 2, bw, BH);
          ctx.restore();
          U.math(ctx, t, bx + bw / 2, y + FS * 0.33, FS, rgba(isTop ? C.amber : C.ink, 1), 'center', a);
          const land = bump((q - 0.85) / 0.2) * 0.6;
          const glow = isTop ? clamp(0.4 + 0.5 * (1 - clamp((p - st - 0.1) / 0.2)) + 0.25 * k + sw) : Math.max(land, sw);
          if (glow > 0.01) {
            hot.strokeStyle = rgba(isTop ? C.amber : C.ink, glow * a * (isTop ? 1 : 0.8)); hot.lineWidth = lw * 1.3;
            hot.strokeRect(bx, y - BH / 2, bw, BH);
            if (isTop) U.math(hot, t, bx + bw / 2, y + FS * 0.33, FS, rgba(C.amber, 0.25), 'center', clamp(glow) * a);
          }
        });
      });

      // ---------------------------------------------------- the ruler: degrees 3, 4, 5
      const aq = seg(p, 0.2, 0.34, ease.out);
      if (aq > 0) {
        const ax = sx + stackW * FS / 2 + 0.75 * FS, y0 = baseY, yb = lerp(y0, baseY - 2 * PITCH * FS, aq);
        for (const [g, a, w] of [[ctx, 1, lw * 1.1], [hot, 0.4 + 0.3 * k + 0.4 * sweep(2), lw * 1.3]]) {
          U.line(g, ax, y0, ax, yb, rgba(C.amber, clamp(a)), w);
          DEG.forEach((_, r) => { const ty = baseY - r * PITCH * FS; if (yb <= ty + 0.5) U.line(g, ax - FS * 0.22, ty, ax + FS * 0.22, ty, rgba(C.amber, clamp(a)), w); });
        }
        DEG.forEach((dg, r) => {
          const ty = baseY - r * PITCH * FS, tq = clamp((y0 - yb - r * PITCH * FS) / (FS * 0.6) + 1);
          if (tq > 0 && (r === 0 || yb <= ty + 0.5)) U.math(ctx, String(dg), ax + FS * 0.5, ty + FS * 0.3, FS * 0.85, rgba(C.dim, 1), 'left', clamp(tq));
        });
      }

      // ---------------------------------------------------- reg = deg G_w - l(w) = 2
      const fq = seg(p, 0.16, 0.28, ease.out);
      if (fq > 0) {
        const FZ = FZU * FS, y = fy + (1 - fq) * FS * 0.3;
        const fx = cx - formW * FS / 2;
        U.text(ctx, 'reg = deg ', fx, y, `${FZ}px ${F.main}`, rgba(C.ink, 1), 'left', 'alphabetic', fq);   // upright operator names
        U.math(ctx, '\\G_{1432} − \\ell(1432) = ', fx + wF1 * FZ, y, FZ, rgba(C.ink, 1), 'left', fq);
        const two = seg(p, 0.36, 0.44);
        if (two > 0) {
          const s2 = lerp(1.8, 1, ease.out(two)) * (1 + 0.06 * k * seg(p, 0.48, 0.52)), tx = fx + (wF1 + wF2) * FZ + wTwo * FZ * 0.45;
          const glow = 0.1 + 0.1 * (1 - seg(p, 0.44, 0.7)) + 0.05 * sweep(2);   // big glyph: hot copy <= 0.25
          for (const [g, a] of [[ctx, 1], [hot, glow]]) {
            g.save(); g.translate(tx, y - FZ * 0.35); g.scale(s2, s2);
            U.math(g, '2', 0, FZ * 0.35, FZ * 1.12, rgba(C.amber, a), 'center', clamp(two * 3));
            g.restore();
          }
        }
      }
      ctx.restore(); hot.restore();
    },
  };
})());
