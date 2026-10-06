// 2005 — Knutson–Miller: Gröbner geometry of Schubert polynomials.
// The matrix Schubert variety of w = 1432 in M_4 = {(z_ij)} is cut out by the
// 2x2 minors of the top-left 2x3 and 3x2 blocks (essential set {(2,3),(3,2)},
// rank 1). Their antidiagonal initial terms give
//   in(I_w) = < z12 z21, z13 z21, z13 z22, z12 z31, z22 z31 >   (a 5-cycle),
// whose minimal primes are the five coordinate subspaces L_P = {z_p = 0, p in P},
// P running over the reduced pipe dreams of 1432 (crosses listed below). Checked
// in Python (sympy): the antidiagonal terms of those minors are exactly the 5-cycle;
// its five minimal vertex covers are exactly the five reduced pipe dreams (brute
// force over the staircase); and
//   S_1432 = x1^2 x2 + x1^2 x3 + x1 x2^2 + x1 x2 x3 + x2^2 x3
// (divided differences from x1^3 x2^2 x3) = sum over P of prod_{(i,j) in P} x_i.
// Shown: the 4x4 matrix of variables, centred; row i carries the weight x_i. One
// subspace per eighth note: its three zero coordinates light (amber), the row weights
// of the zeros light, and the three zeros fly down into the sum line, where they become
// the monomial. All five land by beat 2.5; then the subspaces keep cycling, each
// re-lighting its own term.
MOTIF('groebner', (() => {
  const n = 4;
  const PDS = [                                   // [row, col] of the crosses, 1-based
    { x: [[1, 2], [1, 3], [2, 2]], m: 'x_1^2x_2' },
    { x: [[1, 2], [1, 3], [3, 1]], m: 'x_1^2x_3' },
    { x: [[1, 2], [2, 1], [2, 2]], m: 'x_1x_2^2' },
    { x: [[1, 3], [2, 1], [3, 1]], m: 'x_1x_2x_3' },
    { x: [[2, 1], [2, 2], [3, 1]], m: 'x_2^2x_3' },
  ];
  // Consistency: each monomial is the product of the row weights of its zeros.
  PDS.forEach(P => {
    const e = [0, 0, 0, 0]; P.x.forEach(([i]) => e[i - 1]++);
    const m = e.map((v, i) => (v ? `x_${i + 1}` + (v > 1 ? `^${v}` : '') : '')).join('');
    if (m !== P.m) throw new Error('groebner: monomial mismatch ' + P.m);
  });
  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, ease, seg, lerp } = env;
      // Timing: one subspace per eighth note (faster if the slot is short, so all five land).
      const step = Math.min(env.beat / 2 / env.dur, 0.14);
      const t0 = Math.min(0.125, step);
      const raw = (p - t0) / step;                     // step clock
      const cur = raw < 0 ? -1 : Math.floor(raw);      // 0..4 first pass, then cycles
      const q = raw < 0 ? 0 : raw - cur;               // progress inside the step
      const lit = cur < 0 ? -1 : cur % 5;
      const shown = Math.min(5, cur + 1);              // terms present in the sum

      // Layout: the sum line (size fz) under the matrix (cells s), row weights to its left.
      const SUM = ['\\S_{1432}\\;=\\;', ...PDS.map(P => P.m)], PLUS = '\\,+\\,';
      const m1 = str => U.math(ctx, str, 0, 0, 1, '#000', 'left', 0);
      const wPre = m1(SUM[0]) * 100, wTerms = PDS.map(P => m1(P.m) * 100), wPlus = m1(PLUS) * 100;
      const wSum = (wPre + wTerms.reduce((a, b) => a + b, 0) + 4 * wPlus) / 100;   // width per unit size
      const fz = Math.min(box.h * 0.075, box.w * 0.94 / wSum);
      const s = Math.min((box.h * 0.97 - fz * 2.35) / 4.25, box.w * 0.8 / 4.9);
      const cx = box.x + box.w / 2;
      const top = box.y + (box.h - (4.25 * s + fz * 2.35)) / 2;
      const gx = cx - n * s / 2 + s * 0.25, gy = top + s * 0.12;   // matrix (shifted right to balance the x_i column)
      const lw = clamp(s * 0.012, 1.5, 3);
      const build = seg(p, 0, t0 + step * 0.4, ease.out);
      const bump = 1 + 0.015 * k;

      // Sum line layout (fixed, so nothing jumps as terms arrive).
      const ly = top + 4.25 * s + fz * 1.6;
      const lx0 = cx - wSum * fz / 2;
      const xs = []; { let x = lx0 + wPre * fz / 100; wTerms.forEach((w, r) => { if (r) x += wPlus * fz / 100; xs.push(x); x += w * fz / 100; }); }

      // Matrix brackets.
      const bq = ease.out(build);
      ctx.strokeStyle = rgba(C.ink, 0.9); ctx.lineWidth = lw * 1.1; ctx.lineCap = 'butt';
      const by0 = gy - s * 0.1, by1 = gy + n * s + s * 0.1, bw = s * 0.14;
      const bh = (by1 - by0) * bq, bm = (by0 + by1) / 2;
      [[gx - s * 0.08, 1], [gx + n * s + s * 0.08, -1]].forEach(([bx, d]) => {
        ctx.beginPath(); ctx.moveTo(bx + d * bw, bm - bh / 2); ctx.lineTo(bx, bm - bh / 2);
        ctx.lineTo(bx, bm + bh / 2); ctx.lineTo(bx + d * bw, bm + bh / 2); ctx.stroke();
      });
      // Row weights: z_ij has weight x_i.
      const crosses = lit >= 0 ? PDS[lit].x : [];
      for (let i = 1; i <= n; i++) {
        const cnt = crosses.filter(([r]) => r === i).length;
        const on = cnt > 0 && q < 0.92;
        U.math(ctx, `x_${i}`, gx - s * 0.55, gy + (i - 0.5) * s + s * 0.1, s * 0.3,
          rgba(on ? C.amber : C.dim, 1), 'center', build);
      }
      // Faint cell grid and the variables; the zeros of the current subspace in amber.
      const pop = lerp(cur >= 5 ? 0.86 : 0.55, 1, ease.back(clamp(q * 3.2))) * bump;   // first pass pops from small
      for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
        const a = U.stagger(p, (i - 1) + (j - 1), 2 * n - 1, 0, t0 + step * 0.5, 0.5);
        if (a <= 0) continue;
        const x = gx + (j - 1) * s, y = gy + (i - 1) * s;
        ctx.strokeStyle = rgba(C.faint, a); ctx.lineWidth = lw * 0.8; ctx.strokeRect(x, y, s, s);
        const isX = crosses.some(([r, c]) => r === i && c === j);
        if (isX) {                                      // z_ij = 0 on the subspace L_P
          const g = s * 0.4 * pop, cxx = x + s / 2, cyy = y + s / 2;
          ctx.fillStyle = rgba(C.amber, 0.14); ctx.fillRect(cxx - g, cyy - g, 2 * g, 2 * g);
          ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = lw * 1.1; ctx.strokeRect(cxx - g, cyy - g, 2 * g, 2 * g);
          hot.strokeStyle = rgba(C.amber, 0.55); hot.lineWidth = lw * 1.2; hot.strokeRect(cxx - g, cyy - g, 2 * g, 2 * g);
          U.math(ctx, '0', cxx, cyy + s * 0.15, s * 0.44 * pop, rgba(C.amberHot, 1), 'center');
          U.math(hot, '0', cxx, cyy + s * 0.15, s * 0.44 * pop, rgba(C.amber, 0.18), 'center');
        } else {
          const stair = i + j <= n;                     // the pipe-dream staircase
          U.math(ctx, `z_{${i}${j}}`, x + s / 2 - s * 0.03, y + s / 2 + s * 0.08, s * 0.3,
            rgba(stair ? C.ink : C.dim, stair ? 0.95 : 0.6), 'center', a);
        }
      }

      // Sum line: S_1432 = (the five monomials, each arriving with its subspace).
      U.math(ctx, SUM[0], lx0, ly, fz, rgba(C.ink, 1), 'left', build);
      for (let r = 0; r < shown; r++) {
        const fresh = r === cur ? q : 1;               // this term is still arriving
        const fly = seg(fresh, 0.15, 0.55, ease.inOut);
        const tx = xs[r] + wTerms[r] * fz / 200, ty = ly - fz * 0.32;
        if (r === cur && fly > 0 && fly < 1) {           // the three zeros fly down into the term
          PDS[r].x.forEach(([i, j], z) => {
            const bx = gx + (j - 0.5) * s, byy = gy + (i - 0.5) * s;
            const ex = tx + (z - 1) * fz * 0.45, fx = lerp(bx, ex, fly), fy = lerp(byy, ty, fly) - Math.sin(Math.PI * fly) * s * 0.25;
            const g = lerp(s * 0.4, fz * 0.18, fly);
            ctx.fillStyle = rgba(C.amber, lerp(0.14, 0.9, fly)); ctx.fillRect(fx - g, fy - g, 2 * g, 2 * g);
            hot.fillStyle = rgba(C.amber, 0.35 * fly); hot.fillRect(fx - g, fy - g, 2 * g, 2 * g);
          });
        }
        const ma = seg(fresh, 0.45, 0.7, ease.out);
        if (ma <= 0) continue;
        const on = r === lit && q < 0.92;
        const sc = r === cur ? lerp(1.35, 1, ease.out(ma)) : 1;
        if (r) U.math(ctx, PLUS, xs[r] - wPlus * fz / 100, ly, fz, rgba(C.ink, 0.9), 'left', ma);
        for (const [g, a] of on ? [[ctx, 1], [hot, 0.2]] : [[ctx, 1]]) {
          g.save(); g.translate(tx, ty); g.scale(sc, sc);
          U.math(g, PDS[r].m, -wTerms[r] * fz / 200, fz * 0.32, fz, rgba(on ? C.amber : C.ink, a), 'left', ma);
          g.restore();
        }
      }
    },
  };
})());
