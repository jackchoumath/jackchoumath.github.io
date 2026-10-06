// 1993 — Pipe dreams (Billey–Jockusch–Stanley; Bergeron–Billey; Fomin–Kirillov).
// The five reduced pipe dreams of w = 1432 (verified by brute force against the
// Schubert polynomial computed by divided differences):
//   S_1432 = x1^2 x2 + x1^2 x3 + x1 x2^2 + x1 x2 x3 + x2^2 x3,
// one monomial per pipe dream (x_i for every cross in row i).
MOTIF('pipedream', {
  draw(ctx, hot, p, k, env, box) {
    const { C, U, rgba, clamp, ease, lerp } = env;
    const n = 4;
    const PDS = [
      { x: [[1, 2], [1, 3], [2, 2]], m: 'x_1^2x_2' },
      { x: [[1, 2], [1, 3], [3, 1]], m: 'x_1^2x_3' },
      { x: [[1, 2], [2, 1], [2, 2]], m: 'x_1x_2^2' },
      { x: [[1, 3], [2, 1], [3, 1]], m: 'x_1x_2x_3' },
      { x: [[2, 1], [2, 2], [3, 1]], m: 'x_2^2x_3' },
    ];
    // Flip through the pipe dreams on eighth notes, then keep cycling.
    const eighth = env.beat / 2 / env.dur;            // one eighth note in units of p
    const idx = Math.min(4, Math.floor(p / eighth)) + (p > 5 * eighth + 1e-9 ? 0 : 0);
    const cyc = p < 5 * eighth ? idx : Math.floor((p - 5 * eighth) / eighth) % 5;
    const sinceFlip = (p - (p < 5 * eighth ? idx : 5 + Math.floor((p - 5 * eighth) / eighth)) * eighth) / eighth;
    const pd = PDS[cyc];
    const crosses = new Set(pd.x.map(([i, j]) => `${i},${j}`));

    const s = Math.min(box.h * 0.62 / n, box.w * 0.46 / n) * (1 + 0.025 * k);
    const gx = box.x + box.w * 0.30 - (n * s) / 2, gy = box.y + (box.h - n * s) / 2 + s * 0.15;
    const build = clamp(p / Math.max(eighth * 1.5, 1e-3));

    // Grid of the staircase tiles (i + j <= n + 1).
    ctx.strokeStyle = rgba(C.faint, 0.9); ctx.lineWidth = 1;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= n + 1 - i; j++) ctx.strokeRect(gx + (j - 1) * s, gy + (i - 1) * s, s, s);

    // Trace each pipe from the west edge of its row.
    const cols = [C.ink, C.cyan, C.violet, C.dim];
    const tile = (i, j) => (i + j === n + 1 ? 'half' : crosses.has(`${i},${j}`) ? 'cross' : 'elbow');
    for (let r = 1; r <= n; r++) {
      let i = r, j = 1, dir = 'E';
      const segs = [];
      for (let guard = 0; guard < 2 * n + 2 && i >= 1; guard++) {
        const kind = tile(i, j);
        const from = dir === 'E' ? 'W' : 'S';
        let to;
        if (kind === 'cross') to = dir === 'E' ? 'E' : 'N';
        else to = dir === 'E' ? 'N' : 'E';
        segs.push({ i, j, from, to, kind });
        dir = to === 'N' ? 'N' : 'E';
        if (to === 'N') i -= 1; else j += 1;
      }
      const reveal = clamp(build * 1.3 - (r - 1) * 0.08);
      const shown = Math.floor(reveal * segs.length + 1e-6);
      ctx.strokeStyle = rgba(cols[r - 1], 0.95); ctx.lineWidth = Math.max(2.5, s * 0.07); ctx.lineCap = 'round';
      segs.slice(0, shown).forEach(({ i, j, from, to }) => {
        const x = gx + (j - 1) * s, y = gy + (i - 1) * s;
        const mid = { W: [x, y + s / 2], E: [x + s, y + s / 2], N: [x + s / 2, y], S: [x + s / 2, y + s] };
        ctx.beginPath();
        if ((from === 'W' && to === 'E') || (from === 'S' && to === 'N')) {
          ctx.moveTo(...mid[from]); ctx.lineTo(...mid[to]);
        } else if (from === 'W' && to === 'N') {
          ctx.arc(x, y, s / 2, Math.PI / 2, 0, true);           // around the top-left corner
        } else {
          ctx.arc(x + s, y + s, s / 2, Math.PI, Math.PI * 1.5);  // south -> east, around the bottom-right corner
        }
        ctx.stroke();
      });
      ctx.lineCap = 'butt';
      // Row labels on the left, exit labels on top.
      U.text(ctx, String(r), gx - s * 0.28, gy + (r - 0.5) * s + s * 0.12, `${Math.round(s * 0.32)}px ${env.F.main}`, rgba(C.dim, build), 'center');
      U.text(ctx, String(r), gx + (r - 0.5) * s, gy - s * 0.18, `${Math.round(s * 0.32)}px ${env.F.main}`, rgba(C.dim, build), 'center');
    }
    // Crosses glow: each one is a variable x_i of the monomial.
    const pop = ease.back(clamp(sinceFlip * 3));
    pd.x.forEach(([i, j]) => {
      const cx = gx + (j - 0.5) * s, cy = gy + (i - 0.5) * s;
      U.ring(ctx, cx, cy, s * 0.2 * pop, rgba(C.amber, 0.95), 2.5);
      U.dot(hot, cx, cy, s * 0.16 * pop, rgba(C.amber, 0.9));
      U.math(ctx, `x_${i}`, cx + s * 0.22, cy - s * 0.22, s * 0.24, rgba(C.amberHot, pop), 'left');
    });

    // The Schubert polynomial assembles term by term to the right.
    const fx = box.x + box.w * 0.62, fy0 = gy + s * 0.2;
    const fs = Math.min(46, box.w * 0.055);
    U.math(ctx, '\\S_{1432} =', fx, fy0, fs * 1.05, rgba(C.ink, clamp(build * 2)), 'left');
    PDS.forEach((d, q) => {
      const appear = q <= (p < 5 * eighth ? idx : 4) ? 1 : 0;
      if (!appear) return;
      const on = q === cyc;
      const y = fy0 + (q + 1) * fs * 1.25;
      const a = q === idx && p < 5 * eighth ? ease.out(clamp(sinceFlip * 4)) : 1;
      U.math(ctx, (q ? '+\\,' : '') + d.m, fx + (q ? 0 : fs * 0.5), y, fs, rgba(on ? C.amber : C.ink, a), 'left');
      if (on) U.math(hot, (q ? '+\\,' : '') + d.m, fx + (q ? 0 : fs * 0.5), y, fs, rgba(C.amber, 0.5 * a), 'left');
    });
    void lerp;
  },
});
