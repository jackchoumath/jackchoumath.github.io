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
    const lo = Math.min(0, ...V[i]) - 0.28, hi = Math.max(0, ...V[i]) + 0.28;
    return { t, lo, hi };
  });

  const TMAX = 1.62;                                  // curve shown for |t| <= TMAX
  const YAW0 = -1.1, YAW1 = -0.72, PITCH = 0.24, D = 11;
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
    for (let m = 0; m <= 6; m++) {
      const P = view(YAW0 + (YAW1 - YAW0) * m / 6);
      KEY.forEach(q => { const [x, y] = P(q); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    }
    return { x0, x1, y0, y1 };
  })();

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, ease, seg, lerp } = env;
      const B = BOUNDS;
      const S = Math.min(box.w * 0.9 / (B.x1 - B.x0), box.h * 0.9 / (B.y1 - B.y0)) * (1 + 0.015 * k);
      const ox = box.x + box.w / 2 - S * (B.x0 + B.x1) / 2, oy = box.y + box.h / 2 - S * (B.y0 + B.y1) / 2;
      const V3 = view(lerp(YAW0, YAW1, ease.inOut(p)));
      const P = q => { const [x, y] = V3(q); return [ox + S * x, oy + S * y]; };
      const line = (g2, a, b, q, col, w) => {
        if (q <= 0) return;
        const A = P(a), Bq = P(b);
        g2.strokeStyle = col; g2.lineWidth = w; g2.beginPath();
        g2.moveTo(A[0], A[1]); g2.lineTo(lerp(A[0], Bq[0], q), lerp(A[1], Bq[1], q)); g2.stroke();
      };
      ctx.lineCap = 'round'; hot.lineCap = 'round';
      // Dot sizes follow the drawing, small enough that the close pairs of hits stay two dots.
      const rT = clamp(S * 0.032, 3, 4.2), rH = clamp(S * 0.034, 3.2, 4.2);

      // Twisted cubic, drawn on from the middle outwards.
      const cq = seg(p, 0, 0.15, ease.out);
      ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let m = 0; m <= 120; m++) {
        const q = P(g(lerp(-TMAX, TMAX, m / 120) * cq));
        if (m) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke();

      // Four tangent lines, shooting out from their points of tangency.
      TAN.forEach(({ t, lo, hi }, i) => {
        const q = seg(p, 0.05 + i * 0.025, 0.2 + i * 0.025, ease.out);
        if (q <= 0) return;
        line(ctx, at(t, lo * q), at(t, hi * q), 1, rgba(C.cyan, 0.85), 2);
        const c = P(g(t));
        U.dot(ctx, c[0], c[1], rT * U.pop(clamp(q * 2)), rgba(C.ink, 1));
      });

      // The two transversals: both real. Each hit flashes a ring as the line reaches it.
      const A0 = m => 0.17 + m * 0.05, LEN = 0.13;
      L.forEach((l, m) => {
        const q = seg(p, A0(m), A0(m) + LEN);
        if (q <= 0) return;
        line(ctx, l.p0, l.p1, q, rgba(C.amber, 1), 3);
        line(hot, l.p0, l.p1, q, rgba(C.amber, 0.6 + 0.3 * k), 4);
      });
      // Hits as pale beads, also on the hot layer (it is composited over the line art).
      L.forEach((l, m) => l.hits.forEach((h, i) => {
        const since = (p - (A0(m) + LEN * l.us[i])) / 0.09;
        if (since <= 0) return;
        const c = P(h), r = rH * U.pop(clamp(since));
        U.dot(ctx, c[0], c[1], r, rgba(C.amberHot, 1));
        U.dot(hot, c[0], c[1], r, rgba(C.amberHot, 0.95));
        if (since < 1) U.ring(ctx, c[0], c[1], 5 + 16 * ease.out(since), rgba(C.amber, 0.8 * (1 - since)), 2);
      }));
      ctx.lineCap = 'butt'; hot.lineCap = 'butt';
    },
  };
})());
