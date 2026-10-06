// Monk's rule (1959):  sigma_{s_r} * sigma_w = sum of sigma_{w t_ij} over i <= r < j with
// l(w t_ij) = l(w) + 1.   Here w = 3142 (one-line), r = 2, l(w) = 3.
// Candidates t_13, t_14, t_23, t_24; the length test (computed below by
// counting inversions) keeps t_13, t_23, t_24 and rejects t_14 (3142 -> 2143,
// length 2), so
//     sigma_{s_2} sigma_{3142} = sigma_{4132} + sigma_{3412} + sigma_{3241}.
// Each kept transposition lights as an arc over the dots and swaps the values.
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
  const WIN = TERMS.map((_, m) => [0.1 + m * 0.28, 0.1 + m * 0.28 + 0.28]);
  const MAXSPAN = Math.max(...TERMS.map(([i, j]) => j - i));

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const n = W.length;
      const d = Math.min(box.w / 5, box.h / 4.3);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }
      const y = cy + 0.2 * d, rad = 0.3 * d;
      const X = i => cx + (i - (n + 1) / 2) * d;    // x of position i (1-indexed)
      const H = span => 0.42 * d * span + 0.18 * d; // arc height over the dot centres
      // Point on the upper (sgn=-1) or lower (sgn=+1) half-ellipse from i to j at t in [0,1].
      const arcPt = (i, j, t, sgn, hk = 1) => {
        const a = Math.PI * (1 - t), mx = (X(i) + X(j)) / 2, rx = (X(j) - X(i)) / 2;
        return [mx + rx * Math.cos(a), y + sgn * H(j - i) * hk * Math.sin(a)];
      };
      const arcPath = (g, i, j, t0, t1) => {
        g.beginPath();
        for (let q = 0; q <= 40; q++) { const [px, py] = arcPt(i, j, lerp(t0, t1, q / 40), -1); q ? g.lineTo(px, py) : g.moveTo(px, py); }
      };

      // Dots carrying the values of w; during a window the two values swap
      // (one over the lit arc, one underneath) and then swap back.
      let cur = -1;
      WIN.forEach(([a], m) => { if (p >= a) cur = m; });
      const pos = W.map((_, idx) => [X(idx + 1), y]);
      const lit = new Set();
      if (cur >= 0) {
        const [i, j] = TERMS[cur], u = seg(p, WIN[cur][0], WIN[cur][1]);
        const t = ease.inOut(seg(u, 0.16, 0.45)) - ease.inOut(seg(u, 0.84, 1.0));
        if (t > 0) {
          pos[i - 1] = arcPt(i, j, t, -1);
          pos[j - 1] = arcPt(i, j, 1 - t, +1, 0.45);
        }
        if (u > 0.05 && u < 0.99) { lit.add(i - 1); lit.add(j - 1); }
      }
      const dq = W.map((_, idx) => U.stagger(p, idx, n, 0, 0.14, 0.5));
      const dsc = dq.map((q, idx) => (q > 0 ? U.pop(q) * (lit.has(idx) ? 1 + 0.04 * k : 1) : 0));
      // Lines (divider, arcs) are clipped out of the dot discs, so nothing
      // shows through a dot (on either layer) and no background is painted.
      const clipDots = g => {
        g.beginPath(); g.rect(box.x - box.w, box.y - box.h, 3 * box.w, 3 * box.h);
        pos.forEach(([px, py], idx) => { const rr = rad * dsc[idx] + 1.5; if (rr > 2) { g.moveTo(px + rr, py); g.arc(px, py, rr, 0, Math.PI * 2); } });
        g.clip('evenodd');
      };
      ctx.save(); hot.save(); clipDots(ctx); clipDots(hot);

      // Divider between positions r and r+1, just taller than the highest arc.
      const dv = seg(p, 0.02, 0.16, ease.out), dx = (X(R) + X(R + 1)) / 2;
      const dTop = y - H(MAXSPAN) - 0.25 * d, dBot = y + rad + 0.25 * d;
      ctx.save(); ctx.setLineDash([6, 6]);
      U.drawOn(ctx, dx, dBot, dx, dTop, dv, rgba(C.cyan, 0.85), 2);
      ctx.restore();

      // Arcs: each lights (amber) in its window, then stays as ivory.
      TERMS.forEach(([i, j], m) => {
        const u = seg(p, WIN[m][0], WIN[m][1]);
        if (u <= 0) return;
        const draw = ease.out(clamp(u / 0.3)), live = m === cur;
        ctx.save(); ctx.strokeStyle = live ? rgba(C.amber, 1) : rgba(C.ink, 0.55); ctx.lineWidth = live ? 3 : 2;
        arcPath(ctx, i, j, 0, draw); ctx.stroke(); ctx.restore();
        if (live) {
          hot.save(); hot.strokeStyle = rgba(C.amber, 0.75 + 0.2 * k); hot.lineWidth = 3;
          arcPath(hot, i, j, 0, draw); hot.stroke(); hot.restore();
        }
      });
      ctx.restore(); hot.restore();

      const fz = Math.round(d * 0.38);
      W.forEach((val, idx) => {
        if (dq[idx] <= 0) return;
        const [px, py] = pos[idx], sc = dsc[idx], on = lit.has(idx);
        ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
        U.ring(ctx, 0, 0, rad, on ? rgba(C.amber, 1) : rgba(C.ink, 0.95), 2.5);
        U.text(ctx, String(val), 0, fz * 0.36, `${fz}px ${F.main}`, on ? rgba(C.amber, 1) : rgba(C.ink, 1), 'center');
        ctx.restore();
        if (on) {
          hot.save(); hot.translate(px, py); hot.scale(sc, sc);
          U.ring(hot, 0, 0, rad, rgba(C.amber, 0.7), 3);
          hot.restore();
        }
      });

      // The sum, one term per lit transposition (newest in amber).
      const sz = Math.round(d * 0.4), ly = y + rad + 0.9 * d;
      // Monk's notation (Schubert classes; the fraktur S of Schubert polynomials only arrives in 1982).
      const parts = TERMS.map(([, , v]) => `\\sigma_{${v.join('')}}`);
      // s_r in one-line notation (s_2 = 1324), matching the other subscripts.
      const sr = W.map((_, i) => i + 1); [sr[R - 1], sr[R]] = [sr[R], sr[R - 1]];
      const lhs = `\\sigma_{${sr.join('')}}\u22c5\\sigma_{${W.join('')}}\\;=`;
      const wPlus = U.math(ctx, '+', -9999, -9999, sz, rgba(C.ink, 0)), gap = sz * 0.35;
      const wL = U.math(ctx, lhs, -9999, -9999, sz, rgba(C.ink, 0));
      const wT = parts.map(s => U.math(ctx, s, -9999, -9999, sz, rgba(C.ink, 0)));
      const total = wL + gap + wT.reduce((a, b) => a + b, 0) + (parts.length - 1) * (wPlus + 2 * gap);
      let x = cx - total / 2;
      U.math(ctx, lhs, x, ly, sz, rgba(C.ink, 0.95), 'left', ease.out(seg(p, 0.04, 0.14)));
      x += wL + gap;
      parts.forEach((str, m) => {
        const u = seg(p, WIN[m][0], WIN[m][1]), a = ease.out(seg(u, 0.38, 0.62));
        if (m > 0) { U.math(ctx, '+', x + gap, ly, sz, rgba(C.ink, 0.8), 'left', a); x += wPlus + 2 * gap; }
        if (a > 0) {
          const newest = m === cur, dy = (1 - a) * sz * 0.4;
          U.math(ctx, str, x, ly + dy, sz, newest ? rgba(C.amber, 1) : rgba(C.ink, 0.95), 'left', a);
          if (newest) U.math(hot, str, x, ly + dy, sz, rgba(C.amber, 0.45), 'left', a);
        }
        x += wT[m];
      });
      ctx.restore(); hot.restore();
    },
  };
})());
