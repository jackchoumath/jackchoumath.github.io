// Giambelli (1902): sigma_lambda = det( sigma_{lambda_i + j - i} ), sigma_0 = 1,
// sigma_r = 0 for r < 0.  For lambda = (3,2,1) the matrix is computed below:
//   s3 s4 s5 / s1 s2 s3 / 0 1 s1.
// The Young diagram of (3,2,1) stands on the left, "=", then the determinant: bars draw
// on, entries pop in row by row, and the diagonal (sigma_{lambda_i}) glows amber.
// Afterwards a glint runs down the diagonal while row i of the diagram lights up with it.
MOTIF('giambelli', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease } = env;
    const lam = [3, 2, 1], n = lam.length;
    // Entry (i, j): sigma_{lam_i + j - i} -> '\sigma_r', '1' (r = 0) or '0' (r < 0).
    const ent = (i, j) => { const r = lam[i] + j - i; return r > 0 ? `\\sigma_${r}` : r === 0 ? '1' : '0'; };

    // Layout (units of the math font size fs).
    const fs = Math.min(box.w / 10.6, box.h / 4.9) * (1 + 0.012 * ease.soft(p));
    const yc = fs * 0.95;                       // Young diagram cell
    const cp = fs * 1.5, rp = fs * 1.22;        // matrix column / row pitch
    const padB = fs * 0.32, eqW = fs * 1.5;
    const totalW = 3 * yc + eqW + 2 * padB + 3 * cp;
    const x0 = box.x + (box.w - totalW) / 2, cy = box.y + box.h / 2;
    const yx = x0, yy = cy - 1.5 * yc;           // diagram top-left
    const mx = x0 + 3 * yc + eqW + padB;         // matrix left (first column's left edge)
    const my = cy - 1.5 * rp;                    // matrix top

    // Diagonal glint after the build: phase runs 0 -> 1 every 0.3 of p.
    const lit = p > 0.42 ? ((p - 0.42) / 0.3) % 1 : -1;
    const bump = i => (lit < 0 ? 0 : Math.max(0, 1 - Math.abs(lit * 1.35 - 0.1 - i * 0.4) / 0.22));

    // --- Young diagram of (3,2,1); row i lights up with the i-th diagonal entry ------
    const cells = lam.flatMap((m, r) => Array.from({ length: m }, (_, c) => [r, c]));
    cells.forEach(([r, c], i) => {
      const q = U.stagger(p, i, cells.length, 0, 0.13, 0.45);
      if (q <= 0) return;
      const sc = U.pop(q), cx = yx + c * yc + yc / 2, ccy = yy + r * yc + yc / 2;
      const b = bump(r);
      ctx.save(); ctx.translate(cx, ccy); ctx.scale(sc, sc); ctx.translate(-cx, -ccy);
      U.young(ctx, [1], yx + c * yc, yy + r * yc, yc, {
        stroke: rgba(C.ink, 0.95), lw: 2.4, fill: () => (b > 0 ? rgba(C.amber, 0.3 * b) : null),
      });
      ctx.restore();
      if (b > 0) { hot.fillStyle = rgba(C.amber, 0.35 * b); hot.fillRect(yx + c * yc + 4, yy + r * yc + 4, yc - 8, yc - 8); }
    });

    // --- "=" ---------------------------------------------------------------------
    U.text(ctx, '=', x0 + 3 * yc + eqW / 2, cy + fs * 0.26, `${fs * 1.05}px ${F.main}`, rgba(C.ink, 0.95), 'center', 'alphabetic', clamp((p - 0.06) / 0.08));

    // --- determinant bars draw on from the middle outwards -------------------------
    const bq = ease.out(clamp((p - 0.07) / 0.13)), bh = 1.5 * rp + fs * 0.12;
    [mx - padB, mx + 3 * cp + padB].forEach(bx => {
      U.drawOn(ctx, bx, cy, bx, cy - bh, bq, rgba(C.ink, 0.95), 2.4);
      U.drawOn(ctx, bx, cy, bx, cy + bh, bq, rgba(C.ink, 0.95), 2.4);
    });

    // --- soft amber band along the diagonal (hot layer only) ------------------------
    const dq = ease.out(clamp((p - 0.24) / 0.12));
    if (dq > 0) {
      const ax = mx + cp * 0.5, ay = my + rp * 0.5, bx = mx + cp * 2.5, by = my + rp * 2.5;
      hot.save(); hot.lineCap = 'round';
      U.drawOn(hot, ax, ay, bx, by, dq, rgba(C.amber, 0.065 + 0.03 * k), fs * 0.85);
      hot.restore();
    }

    // --- entries pop in row by row; diagonal turns amber ---------------------------
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const t0 = 0.11 + 0.055 * i + 0.02 * j, q = clamp((p - t0) / 0.07);
      if (q <= 0) continue;
      const ex = mx + cp * (j + 0.5), ey = my + rp * (i + 0.5), base = ey + fs * 0.24;
      const sc = lerp(1.5, 1, ease.back(q)), a = clamp(q * 2.5);
      const s = ent(i, j), diag = i === j;
      const am = diag ? ease.out(clamp((p - 0.25 - 0.03 * i) / 0.07)) : 0;
      const col = am > 0 ? rgba(C.ink.map((v, c) => Math.round(lerp(v, C.amber[c], am))), 1)
        : rgba(C.ink, /^[01]$/.test(s) ? 0.72 : 1);
      [ctx, hot].forEach(g => {
        if (g === hot && am <= 0) return;
        g.save(); g.translate(ex, ey); g.scale(sc, sc); g.translate(-ex, -ey);
        // hot copy kept low (a strong one clips the bloom to lemon yellow); the glint lifts it
        const ga = g === hot ? (0.2 + 0.4 * bump(i) + 0.08 * k) * am : 1;
        U.math(g, s, ex, base, fs, g === hot ? rgba(C.amber, 1) : col, 'center', a * ga);
        g.restore();
      });
    }
  },
});
