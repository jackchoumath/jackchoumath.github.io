// 2009 — Mukhin–Tarasov–Varchenko: the Shapiro conjecture. If the flags of a
// Schubert problem osculate the rational normal curve at real points, every
// solution is real. Simplest case: the lines meeting four lines tangent to the
// twisted cubic gamma(t) = (t, t^2, t^3) at t = -3/2, -1/2, 1/2, 3/2.
// Solved exactly (sympy): a line through gamma(-3/2) + a gamma'(-3/2) and
// gamma(3/2) + b gamma'(3/2) meets the two middle tangents iff b = -a and
// 9a^2 - 11a + 3 = 0, so a = (11 -+ sqrt13)/18: discriminant 13 > 0, both REAL.
//   L1: y = 5/12 + sqrt13/6, through (-+(8/9 + sqrt13/18), y, +-(3/4 - 3 sqrt13/8))
//   L2: y = 5/12 - sqrt13/6, through (-+(8/9 - sqrt13/18), y, +-(3/4 + 3 sqrt13/8))
// They meet the tangent at t in the points gamma(t) + v gamma'(t), v as in V below
// (point-to-line distances checked numerically, all < 1e-15). The drawing applies
// the affine map z -> z/2.6, which preserves lines, tangency and incidence.
// Re-checked for this cut (sympy): the two middle-tangent conditions give
// a = (11 -+ sqrt13)/18, b = -a; all eight hit points lie on their transversal
// (cross-product residuals < 2e-15).
// Centre-stage cut (4 beats = 1.875 s): the camera turns throughout. The cubic draws
// on, the four tangents shoot out (the last on beat 1), the transversals follow and
// sigma_1^4 = 2 lands on beat 2 (four general lines have two common transversals;
// here both are real). Then a spark runs along each transversal in turn and every
// tangent it meets flares cyan. Figure and caption are centred as one group.
MOTIF('real', (() => {
  const R13 = Math.sqrt(13);
  const g = t => [t, t * t, t * t * t], dg = t => [1, 2 * t, 3 * t * t];
  const at = (t, v) => g(t).map((c, i) => c + v * dg(t)[i]);
  const TS = [-1.5, -0.5, 0.5, 1.5];
  const V = [                                         // [v on L1, v on L2] per tangent
    [(11 - R13) / 18, (11 + R13) / 18], [-(1 + R13) / 6, (R13 - 1) / 6],
    [(1 + R13) / 6, (1 - R13) / 6], [-(11 - R13) / 18, -(11 + R13) / 18],
  ];
  const L = [                                         // transversals: [end, end, hit points]
    [[-8 / 9 - R13 / 18, 5 / 12 + R13 / 6, 3 / 4 - 3 * R13 / 8], [8 / 9 + R13 / 18, 5 / 12 + R13 / 6, -3 / 4 + 3 * R13 / 8]],
    [[-8 / 9 + R13 / 18, 5 / 12 - R13 / 6, 3 / 4 + 3 * R13 / 8], [8 / 9 - R13 / 18, 5 / 12 - R13 / 6, -3 / 4 - 3 * R13 / 8]],
  ].map(([a, b], m) => {
    const hits = TS.map((t, i) => at(t, V[i][m]));
    const d = b.map((c, i) => c - a[i]), dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    const us = hits.map(h => ((h[0] - a[0]) * d[0] + (h[1] - a[1]) * d[1] + (h[2] - a[2]) * d[2]) / dd);
    const lo = Math.min(...us) - 0.2, hi = Math.max(...us) + 0.2;
    return { p0: a.map((c, i) => c + lo * d[i]), p1: a.map((c, i) => c + hi * d[i]), hits, us: us.map(u => (u - lo) / (hi - lo)) };
  });
  // Tangent segments: cover the tangency point and both hits, with a margin.
  const TAN = TS.map((t, i) => {
    const lo = Math.min(0, ...V[i]) - 0.2, hi = Math.max(0, ...V[i]) + 0.2;
    return { t, lo, hi };
  });

  const TMAX = 1.62;                                  // curve shown for |t| <= TMAX
  const YAW0 = -1.22, YAW1 = -0.62, PITCH = 0.24, D = 11;
  const view = yaw => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    return ([x, y, z]) => {
      const X = x, Y = y - 1.05, Z = z / 2.6;
      const X1 = X * cy + Z * sy, Z1 = -X * sy + Z * cy;
      const Y2 = Y * cp - Z1 * sp, Z2 = Y * sp + Z1 * cp;
      const f = D / (D - Z2);
      return [X1 * f, -Y2 * f];
    };
  };
  // Everything that is drawn, for a fixed framing over the whole turn.
  const KEY = [];
  for (let m = 0; m <= 40; m++) KEY.push(g(-TMAX + 2 * TMAX * m / 40));
  TAN.forEach(({ t, lo, hi }) => KEY.push(at(t, lo), at(t, hi)));
  L.forEach(l => KEY.push(l.p0, l.p1));
  const BOUNDS = (() => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let m = 0; m <= 24; m++) {
      const P = view(YAW0 + (YAW1 - YAW0) * m / 24);
      KEY.forEach(q => { const [x, y] = P(q); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    }
    return { x0, x1, y0, y1 };
  })();

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, ease, seg, lerp } = env;
      const B = BOUNDS, bw = B.x1 - B.x0, bh = B.y1 - B.y0;
      // Caption sigma_1^4 = 2 to the right of the figure; the pair is centred as a group.
      const S0 = Math.min(box.w * 0.62 / bw, box.h * 0.87 / bh);
      const fz = Math.max(10, Math.min(box.h * 0.078, box.w * 0.042)), capW = fz * 3.3, capGap = fz * 0.55;
      const S = S0 * (1 + 0.006 * k);
      const groupW = bw * S0 + capGap + capW;
      const fx = box.x + box.w / 2 - groupW / 2;            // left edge of the figure's frame
      const ox = fx - S * B.x0 + (S0 - S) * bw / 2, oy = box.y + box.h / 2 - S * (B.y0 + B.y1) / 2;
      // The camera turns throughout (ease-in-out), showing the curve is not planar.
      const V3 = view(lerp(YAW0, YAW1, ease.inOut(p)));
      const P = q => { const [x, y] = V3(q); return [ox + S * x, oy + S * y]; };
      const line = (g2, a, b, q, col, w, q0 = 0) => {
        if (q <= q0) return;
        const A = P(a), Bq = P(b);
        g2.strokeStyle = col; g2.lineWidth = w; g2.beginPath();
        g2.moveTo(lerp(A[0], Bq[0], q0), lerp(A[1], Bq[1], q0)); g2.lineTo(lerp(A[0], Bq[0], q), lerp(A[1], Bq[1], q)); g2.stroke();
      };
      ctx.lineCap = 'round'; hot.lineCap = 'round';
      const lw = clamp(S * 0.011, 1.4, 3);
      // Dot sizes follow the drawing, small enough that the close pairs of hits stay two dots.
      const rT = clamp(S * 0.028, 2, 5), rH = clamp(S * 0.03, 2.2, 5.2);

      // Twisted cubic, drawn on from the middle outwards.
      const cq = seg(p, 0, 0.13, ease.out);
      ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = lw * 1.15;
      ctx.beginPath();
      for (let m = 0; m <= 140; m++) {
        const q = P(g(lerp(-TMAX, TMAX, m / 140) * cq));
        if (m) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();

      // Four tangent lines, shooting out from their points of tangency, one per sixteenth;
      // the last lands on beat 1.
      TAN.forEach(({ t, lo, hi }, i) => {
        const q = seg(p, 0.07 + i * 0.04, 0.14 + i * 0.04, ease.out);
        if (q <= 0) return;
        line(ctx, at(t, lo * q), at(t, hi * q), 1, rgba(C.cyan, 0.85), lw * 0.85);
        const c = P(g(t));
        U.dot(ctx, c[0], c[1], rT * U.pop(clamp(q * 2)), rgba(C.ink, 1));
      });

      // The two transversals: both real. L1 lands half-way to beat 2, L2 on beat 2.
      // Each hit flashes a ring as the line reaches it.
      const A0 = [0.25, 0.37], LEN = 0.12;
      L.forEach((l, m) => {
        const q = seg(p, A0[m], A0[m] + LEN);
        if (q <= 0) return;
        line(ctx, l.p0, l.p1, q, rgba(C.amber, 1), lw * 1.3);
        line(hot, l.p0, l.p1, q, rgba(C.amber, 0.55 + 0.25 * k), lw * 1.6);
      });
      // After the reveal a bead of light runs along each transversal in turn and every
      // tangent it crosses blinks: each line meets all four tangents.
      const dur = env.dur || 1.875;
      const RUN = dur >= 1.2 ? [[0.55, 0.74], [0.76, 0.95]] : [];
      const beadAt = m => { const r = RUN[m]; return r ? seg(p, r[0], r[1], ease.inOut) : 0; };
      L.forEach((l, m) => {
        const u = beadAt(m);
        if (u <= 0 || u >= 1) return;
        const a = l.p0.map((c, i) => lerp(c, l.p1[i], Math.max(0, u - 0.22))), b = l.p0.map((c, i) => lerp(c, l.p1[i], u));
        const A = P(a), Bq = P(b), fade = Math.min(1, Math.sin(Math.PI * u) * 1.6);
        const gr = hot.createLinearGradient(A[0], A[1], Bq[0], Bq[1]);
        gr.addColorStop(0, rgba(C.amberHot, 0)); gr.addColorStop(1, rgba(C.amberHot, 0.95 * fade));
        hot.strokeStyle = gr; hot.lineWidth = lw * 3; hot.beginPath(); hot.moveTo(A[0], A[1]); hot.lineTo(Bq[0], Bq[1]); hot.stroke();
        U.dot(hot, Bq[0], Bq[1], rH * 1.8, rgba(C.amberHot, 0.9 * fade));
        U.dot(ctx, Bq[0], Bq[1], rH * 1.1, rgba(C.amberHot, fade));
      });
      // ... and the tangent it is crossing flares cyan.
      TAN.forEach(({ t, lo, hi }, i) => {
        const fl = L.reduce((acc, l, m) => { const u = beadAt(m); return u > 0 && u < 1 ? Math.max(acc, 1 - Math.abs(u - l.us[i]) / 0.08) : acc; }, 0);
        if (fl > 0.02) line(hot, at(t, lo), at(t, hi), 1, rgba(C.cyan, 0.6 * fl), lw * 1.2);
      });
      // Hits as pale beads, also on the hot layer (it is composited over the line art).
      L.forEach((l, m) => l.hits.forEach((h, i) => {
        const since = (p - (A0[m] + LEN * l.us[i])) / 0.08;
        if (since <= 0) return;
        const c = P(h), bl = Math.max(0, 1 - Math.abs(beadAt(m) - l.us[i]) / 0.07) * (beadAt(m) < 1 ? 1 : 0);
        const r = rH * U.pop(clamp(since)) * (1 + 0.45 * bl);
        U.dot(ctx, c[0], c[1], r, rgba(C.amberHot, 1));
        U.dot(hot, c[0], c[1], r, rgba(C.amberHot, 0.9));
        if (since < 1) U.ring(ctx, c[0], c[1], rH * (1.2 + 3.5 * ease.out(since)), rgba(C.amber, 0.8 * (1 - since)), lw * 0.8);
        if (bl > 0.02) U.ring(ctx, c[0], c[1], rH * (1.6 + 2.2 * bl), rgba(C.amber, 0.7 * bl), lw * 0.8);
      }));
      ctx.lineCap = 'butt'; hot.lineCap = 'butt';

      // sigma_1^4 = 2: four lines in general position, two transversals. The 2 lands on beat 2.
      const tq = seg(p, 0.3, 0.42, ease.out);
      if (tq > 0) {
        const cx0 = fx + bw * S0 + capGap, cy0 = oy + S * (B.y0 + B.y1) / 2 + fz * 0.35;
        const wl = U.math(ctx, '\\sigma_1^4 =\\;', cx0, cy0 + (1 - tq) * fz * 0.3, fz, rgba(C.ink, 0.95), 'left', tq);
        const two = seg(p, 0.46, 0.52);
        if (two > 0) {
          const z = lerp(1.6, 1, ease.out(two)) * (1 + 0.06 * k * seg(p, 0.5, 0.56)), x2 = cx0 + wl + fz * 0.28, y2 = cy0 - fz * 0.35;
          for (const gg of [ctx, hot]) {
            gg.save(); gg.translate(x2, y2); gg.scale(z, z);
            U.math(gg, '2', 0, fz * 0.35, fz * 1.1, rgba(C.amber, gg === hot ? 0.25 : 1), 'center', clamp(two * 3));
            gg.restore();
          }
        }
      }
    },
  };
})());
