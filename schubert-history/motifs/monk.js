// Monk's rule (1959):  sigma_{s_r} * sigma_w = sum of sigma_{w t_ij} over i <= r < j with
// l(w t_ij) = l(w) + 1.   Here w = 3142 (one-line), r = 2, l(w) = 3.
// Candidates t_13, t_14, t_23, t_24; the length test (computed below by
// counting inversions) keeps t_13, t_23, t_24 and rejects t_14 (3142 -> 2143,
// length 2), so
//     sigma_{s_2} sigma_{3142} = sigma_{4132} + sigma_{3412} + sigma_{3241}
// (re-checked in sympy as a product of Schubert polynomials S_1324 S_3142).
// Each kept transposition lights as an arc over the dots and swaps the values; the
// swapped permutation drops into the sum on the beat (beats 1, 2, 3 of a 4-beat
// card), and on the last eighth all three arcs and the whole right side light up.
MOTIF('monk', (() => {
  const W = [3, 1, 4, 2], R = 2;
  const inv = w => { let n = 0; for (let a = 0; a < w.length; a++) for (let b = a + 1; b < w.length; b++) if (w[a] > w[b]) n++; return n; };
  const TERMS = [];                                  // [i, j, w t_ij] (1-indexed positions)
  for (let i = 1; i <= R; i++) for (let j = R + 1; j <= W.length; j++) {
    const v = W.slice(); [v[i - 1], v[j - 1]] = [v[j - 1], v[i - 1]];
    if (inv(v) === inv(W) + 1) TERMS.push([i, j, v]);
  }
  // Present them by increasing arc span, then left to right: t_23, t_13, t_24.
  TERMS.sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]) || a[0] - b[0]);
  // Window m is centred on beat m+1 of a 4-beat slot (p = 0.25, 0.5, 0.75).
  const WIN = TERMS.map((_, m) => [0.125 + m * 0.25, 0.375 + m * 0.25]);
  const ALL = 0.875;                                 // the closing "all lit" eighth
  const MAXSPAN = Math.max(...TERMS.map(([i, j]) => j - i));

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const n = W.length;
      const meas = (s, z) => U.math(ctx, s, 0, 0, z, '#000', 'left', 0);
      // The sum, typeset at nominal size to find its width.
      const parts = TERMS.map(([, , v]) => `\\sigma_{${v.join('')}}`);
      // s_r in one-line notation (s_2 = 1324), matching the other subscripts.
      const sr = W.map((_, i) => i + 1); [sr[R - 1], sr[R]] = [sr[R], sr[R - 1]];
      const lhs = `\\sigma_{${sr.join('')}}\\,\\cdot\\,\\sigma_{${W.join('')}}\\;=`;
      const Z = 100, gapU = 0.35;
      const wPlusU = meas('+', Z) / Z, wLU = meas(lhs, Z) / Z, wTU = parts.map(s => meas(s, Z) / Z);
      const totU = wLU + gapU + wTU.reduce((a, b) => a + b, 0) + (parts.length - 1) * (wPlusU + 2 * gapU);

      // Layout unit d: arcs (up to 1.27 d above the dot centres), dots, sum below.
      const d = Math.min(box.h * 0.86 / 2.62, box.w / 5.4);
      const dx = Math.min(d * 1.05, box.w * 0.19);   // dot spacing
      const rad = 0.3 * d;
      const sz = Math.min(0.3 * d, box.w * 0.84 / totU);
      const cx = box.x + box.w / 2;
      const top = -MAXSPAN * 0.42 * d - 0.18 * d - 0.25 * d, bot = rad + 0.9 * d + 0.28 * sz;
      const y = box.y + box.h / 2 - (top + bot) / 2;
      const cy = y + (top + bot) / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }
      const X = i => cx + (i - (n + 1) / 2) * dx;   // x of position i (1-indexed)
      const H = span => 0.42 * d * span + 0.18 * d; // arc height over the dot centres
      // Point on the upper (sgn=-1) or lower (sgn=+1) half-ellipse from i to j at t in [0,1].
      const arcPt = (i, j, t, sgn, hk = 1) => {
        const a = Math.PI * (1 - t), mx = (X(i) + X(j)) / 2, rx = (X(j) - X(i)) / 2;
        return [mx + rx * Math.cos(a), y + sgn * H(j - i) * hk * Math.sin(a)];
      };
      const arcPath = (g, i, j, t0, t1) => {
        g.beginPath();
        for (let q = 0; q <= 48; q++) { const [px, py] = arcPt(i, j, lerp(t0, t1, q / 48), -1); q ? g.lineTo(px, py) : g.moveTo(px, py); }
      };
      const lwS = Math.max(1.5, d * 0.012);          // stroke scale

      // Dots carrying the values of w; during a window the two values swap
      // (one over the lit arc, one underneath) and then swap back.
      let cur = -1;
      WIN.forEach(([a], m) => { if (p >= a) cur = m; });
      const all = seg(p, ALL, ALL + 0.06, ease.out);
      const pos = W.map((_, idx) => [X(idx + 1), y]);
      const lit = new Set();
      if (cur >= 0) {
        const [i, j] = TERMS[cur], u = seg(p, WIN[cur][0], WIN[cur][1]);
        const t = ease.inOut(seg(u, 0.14, 0.47)) - ease.inOut(seg(u, 0.72, 1.0));
        if (t > 0) {
          pos[i - 1] = arcPt(i, j, t, -1);
          pos[j - 1] = arcPt(i, j, 1 - t, +1, 0.45);
        }
        if (u > 0.04 && u < 0.99) { lit.add(i - 1); lit.add(j - 1); }
      }
      const dq = W.map((_, idx) => U.stagger(p, idx, n, 0, 0.13, 0.5));
      const dsc = dq.map((q, idx) => (q > 0 ? U.pop(q) * (lit.has(idx) ? 1 + 0.05 * k : 1) : 0));
      // Lines (divider, arcs) are clipped out of the dot discs, so nothing
      // shows through a dot (on either layer) and no background is painted.
      const clipDots = g => {
        g.beginPath(); g.rect(box.x - box.w, box.y - box.h, 3 * box.w, 3 * box.h);
        pos.forEach(([px, py], idx) => { const rr = rad * dsc[idx] + lwS; if (rr > 2) { g.moveTo(px + rr, py); g.arc(px, py, rr, 0, Math.PI * 2); } });
        g.clip('evenodd');
      };
      ctx.save(); hot.save(); clipDots(ctx); clipDots(hot);

      // Divider between positions r and r+1, just taller than the highest arc.
      const dv = seg(p, 0.02, 0.15, ease.out), dX = (X(R) + X(R + 1)) / 2;
      const dTop = y - H(MAXSPAN) - 0.25 * d, dBot = y + rad + 0.25 * d;
      ctx.save(); ctx.setLineDash([6 * lwS / 1.5, 6 * lwS / 1.5]);
      U.drawOn(ctx, dX, dBot, dX, dTop, dv, rgba(C.cyan, 0.85), lwS * 1.2);
      ctx.restore();

      // Arcs: each lights (amber) in its window, then stays as ivory; on the last
      // eighth all three light together.
      TERMS.forEach(([i, j], m) => {
        const u = seg(p, WIN[m][0], WIN[m][1]);
        if (u <= 0) return;
        const draw = ease.out(clamp(u / 0.3)), live = m === cur && p < ALL;
        const amb = live ? 1 : all;
        ctx.save(); ctx.strokeStyle = amb > 0.5 ? rgba(C.amber, live ? 1 : 0.85) : rgba(C.ink, 0.55);
        ctx.lineWidth = (live ? 2.1 : amb > 0.5 ? 1.8 : 1.4) * lwS;
        arcPath(ctx, i, j, 0, draw); ctx.stroke(); ctx.restore();
        const ha = live ? 0.75 + 0.2 * k : 0.4 * all * (0.7 + 0.3 * k);
        if (ha > 0.02) {
          hot.save(); hot.strokeStyle = rgba(C.amber, ha); hot.lineWidth = 2 * lwS;
          arcPath(hot, i, j, 0, draw); hot.stroke(); hot.restore();
        }
      });
      ctx.restore(); hot.restore();

      const fz = Math.round(d * 0.36);
      W.forEach((val, idx) => {
        if (dq[idx] <= 0) return;
        const [px, py] = pos[idx], sc = dsc[idx], on = lit.has(idx);
        ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
        U.ring(ctx, 0, 0, rad, on ? rgba(C.amber, 1) : rgba(C.ink, 0.95), 1.7 * lwS);
        U.text(ctx, String(val), 0, fz * 0.36, `${fz}px ${F.main}`, on ? rgba(C.amber, 1) : rgba(C.ink, 1), 'center');
        ctx.restore();
        if (on) {
          hot.save(); hot.translate(px, py); hot.scale(sc, sc);
          U.ring(hot, 0, 0, rad, rgba(C.amber, 0.7), 2 * lwS);
          hot.restore();
        }
      });

      // The sum, one term per lit transposition (newest in amber; all amber at the end).
      const ly = y + rad + 0.9 * d, gap = gapU * sz, wPlus = wPlusU * sz;
      let x = cx - totU * sz / 2;
      U.math(ctx, lhs, x, ly, sz, rgba(C.ink, 0.95), 'left', ease.out(seg(p, 0.03, 0.13)));
      x += wLU * sz + gap;
      parts.forEach((str, m) => {
        const u = seg(p, WIN[m][0], WIN[m][1]), a = ease.out(seg(u, 0.3, 0.5));
        if (m > 0) { U.math(ctx, '+', x + gap, ly, sz, all > 0.5 ? rgba(C.amber, 0.85) : rgba(C.ink, 0.8), 'left', a); x += wPlus + 2 * gap; }
        if (a > 0) {
          const newest = m === cur && p < ALL, dy = (1 - a) * sz * 0.45;
          const amb = newest || all > 0.5;
          const zz = sz * (newest ? 1 + 0.035 * k : 1);
          U.math(ctx, str, x, ly + dy, zz, amb ? rgba(C.amber, 1) : rgba(C.ink, 0.95), 'left', a);
          const ga = newest ? 0.25 : 0.2 * all * (1 - 0.5 * seg(p, ALL + 0.04, 1));
          if (ga > 0.01) U.math(hot, str, x, ly + dy, zz, rgba(C.amber, ga), 'left', a);
        }
        x += wTU[m] * sz;
      });
      ctx.restore(); hot.restore();
    },
  };
})());
