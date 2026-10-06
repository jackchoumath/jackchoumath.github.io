// 2005 — Knutson–Miller: Gröbner geometry of Schubert polynomials.
// The matrix Schubert variety of w = 1432 in M_4 = {(z_ij)} is cut out by the
// 2x2 minors of the top-left 2x3 and 3x2 blocks (essential set {(2,3),(3,2)},
// rank 1). Their antidiagonal initial terms give
//   in(I_w) = < z12 z21, z13 z21, z13 z22, z12 z31, z22 z31 >   (a 5-cycle),
// whose minimal primes are the five coordinate subspaces L_P = {z_p = 0, p in P},
// P running over the reduced pipe dreams of 1432 (crosses listed below). Checked
// in Python: the five minimal vertex covers of the 5-cycle are exactly the five
// reduced pipe dreams (brute force over the staircase), and
//   S_1432 = x1^2 x2 + x1^2 x3 + x1 x2^2 + x1 x2 x3 + x2^2 x3
// (divided differences) = sum over P of prod_{(i,j) in P} x_i.
// Shown: the 4x4 matrix of variables; each subspace lights its three zero
// coordinates (amber), which fly into a ledger where the sum assembles.
MOTIF('groebner', (() => {
  const n = 4;
  const PDS = [                                   // [row, col] of the crosses, 1-based
    { x: [[1, 2], [1, 3], [2, 2]], m: 'x_1^2x_2' },
    { x: [[1, 2], [1, 3], [3, 1]], m: 'x_1^2x_3' },
    { x: [[1, 2], [2, 1], [2, 2]], m: 'x_1x_2^2' },
    { x: [[1, 3], [2, 1], [3, 1]], m: 'x_1x_2x_3' },
    { x: [[2, 1], [2, 2], [3, 1]], m: 'x_2^2x_3' },
  ];
  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, ease, seg, lerp } = env;
      // Timing: one subspace per sixteenth note (eighth if the motif is long).
      const step = (env.dur * 0.75 / 5 >= env.beat / 2 ? env.beat / 2 : env.beat / 4) / env.dur;
      const t0 = Math.min(0.12, step);
      const raw = (p - t0) / step;                     // step clock
      const cur = raw < 0 ? -1 : Math.floor(raw);      // 0..4 first pass, then cycles
      const q = raw < 0 ? 0 : raw - cur;               // progress inside the step
      const lit = cur < 0 ? -1 : cur % 5;
      const shown = Math.min(5, cur + 1);              // ledger rows present

      // Layout: matrix on the left, ledger on the right.
      const s = Math.min(box.w * 0.5 / 4.7, box.h * 0.8 / 4.4) * (1 + 0.02 * k);
      const ts = Math.min(s * 0.2, box.h / 34);       // thumbnail cell
      const rowH = Math.min(box.h * 0.155, s * 0.98);
      const fs = Math.min(box.w * 0.046, rowH * 0.42);
      // Centre the group: labels + matrix + gap + ledger (thumb + monomial).
      const wide = s * 0.85 + n * s + s * 0.75 + fs * 1.35 + n * ts + fs * 3.3;
      const gx = box.x + (box.w - wide) / 2 + s * 0.85, gy = box.y + (box.h - n * s) / 2 + s * 0.05;
      const lx = gx + n * s + s * 0.75;               // ledger left edge
      const ly0 = box.y + box.h / 2 - rowH * 2.2;     // first ledger row centre
      const build = seg(p, 0, t0 + step * 0.4, ease.out);

      // Matrix brackets.
      const bq = ease.out(build);
      ctx.strokeStyle = rgba(C.ink, 0.9); ctx.lineWidth = 2.5; ctx.lineCap = 'butt';
      const by0 = gy - s * 0.12, by1 = gy + n * s + s * 0.12, bw = s * 0.16;
      const bh = (by1 - by0) * bq, bm = (by0 + by1) / 2;
      [[gx - s * 0.1, 1], [gx + n * s + s * 0.1, -1]].forEach(([bx, d]) => {
        ctx.beginPath(); ctx.moveTo(bx + d * bw, bm - bh / 2); ctx.lineTo(bx, bm - bh / 2);
        ctx.lineTo(bx, bm + bh / 2); ctx.lineTo(bx + d * bw, bm + bh / 2); ctx.stroke();
      });
      // Row weights: z_ij has weight x_i.
      for (let i = 1; i <= n; i++) {
        const on = lit >= 0 && PDS[lit].x.some(([r]) => r === i);
        U.math(ctx, `x_${i}`, gx - s * 0.62, gy + (i - 0.5) * s + s * 0.1, s * 0.3,
          rgba(on ? C.amber : C.dim, 1), 'center', build);
      }
      // Faint cell grid and the variables.
      const crosses = lit >= 0 ? PDS[lit].x : [];
      const pop = lerp(0.55, 1, ease.back(clamp(q * 3.2)));
      for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
        const a = U.stagger(p, (i - 1) + (j - 1), 2 * n - 1, 0, t0 + step * 0.5, 0.5);
        if (a <= 0) continue;
        const x = gx + (j - 1) * s, y = gy + (i - 1) * s;
        ctx.strokeStyle = rgba(C.faint, a); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, s, s);
        const isX = crosses.some(([r, c]) => r === i && c === j);
        if (isX) {                                      // z_ij = 0 on the subspace L_P
          const g = s * 0.4 * pop, cx = x + s / 2, cy = y + s / 2;
          ctx.fillStyle = rgba(C.amber, 0.16); ctx.fillRect(cx - g, cy - g, 2 * g, 2 * g);
          ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = 2.5; ctx.strokeRect(cx - g, cy - g, 2 * g, 2 * g);
          hot.strokeStyle = rgba(C.amber, 0.7); hot.lineWidth = 3; hot.strokeRect(cx - g, cy - g, 2 * g, 2 * g);
          U.math(ctx, '0', cx, cy + s * 0.15, s * 0.44 * pop, rgba(C.amberHot, 1), 'center');
          U.math(hot, '0', cx, cy + s * 0.15, s * 0.44 * pop, rgba(C.amber, 0.6), 'center');
        } else {
          const stair = i + j <= n;                     // the pipe-dream staircase
          U.math(ctx, `z_{${i}${j}}`, x + s / 2 - s * 0.03, y + s / 2 + s * 0.08, s * 0.32,
            rgba(stair ? C.ink : C.dim, stair ? 0.95 : 0.7), 'center', a);
        }
      }

      // Ledger: S_1432 = sum over the five subspaces of their monomials.
      U.math(ctx, '\\S_{1432} =', lx, ly0 - rowH * 0.82, fs * 1.1, rgba(C.ink, 1), 'left', build);
      for (let r = 0; r < shown; r++) {
        const yc = ly0 + r * rowH;
        const fresh = r === cur ? q : 1;               // this row is still arriving
        const land = seg(fresh, 0.15, 0.6, ease.inOut);
        const tx = lx + fs * 0.9, ty = yc - 2 * ts;
        const on = r === lit;
        // Thumbnail of the coordinate subspace.
        ctx.strokeStyle = rgba(on ? C.amber : C.dim, 0.55 * clamp(fresh * 4)); ctx.lineWidth = 1.5;
        ctx.strokeRect(tx, ty, n * ts, n * ts);
        PDS[r].x.forEach(([i, j]) => {
          const bx = gx + (j - 0.5) * s, byy = gy + (i - 0.5) * s, sx = tx + (j - 0.5) * ts, sy = ty + (i - 0.5) * ts;
          if (land > 0 && land < 1 && r === cur) {                 // fly from the matrix into the ledger
            const fx = lerp(bx, sx, land), fy = lerp(byy, sy, land), g = lerp(s * 0.4, ts * 0.42, land);
            ctx.fillStyle = rgba(C.amber, lerp(0.16, 0.95, land)); ctx.fillRect(fx - g, fy - g, 2 * g, 2 * g);
            ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = 2; ctx.strokeRect(fx - g, fy - g, 2 * g, 2 * g);
            hot.strokeStyle = rgba(C.amber, 0.6); hot.lineWidth = 2.5; hot.strokeRect(fx - g, fy - g, 2 * g, 2 * g);
          } else if (land >= 1 || r !== cur) {
            ctx.fillStyle = rgba(on ? C.amber : C.ink, on ? 0.95 : 0.75);
            ctx.fillRect(sx - ts * 0.42, sy - ts * 0.42, ts * 0.84, ts * 0.84);
          }
        });
        // Monomial.
        const ma = seg(fresh, 0.35, 0.75, ease.out);
        if (ma > 0) {
          const mx = tx + n * ts + fs * 0.45, my = yc + fs * 0.32, sl = (1 - ma) * fs * 0.6;
          // The plus sign waits until the flying cells have passed it.
          if (r) U.math(ctx, '+', lx - fs * 0.05, my, fs, rgba(C.ink, 0.9), 'left', seg(fresh, 0.6, 0.8));
          U.math(ctx, PDS[r].m, mx + sl, my, fs, rgba(on ? C.amber : C.ink, 1), 'left', ma);
          if (on) U.math(hot, PDS[r].m, mx + sl, my, fs, rgba(C.amber, 0.45), 'left', ma);
        }
      }
      void F;
    },
  };
})());
