// Giambelli (1902): sigma_lambda = det( sigma_{lambda_i + j - i} ), sigma_0 = 1,
// sigma_r = 0 for r < 0.  For lambda = (3,2,1) the matrix is computed below:
//   s3 s4 s5 / s1 s2 s3 / 0 1 s1.
// The Young diagram of (3,2,1) stands on the left, "=", then the determinant: bars draw
// on, entries pop in row by row.  From beat two the diagonal (sigma_{lambda_i}) turns
// amber one entry per triplet eighth, each together with row i of the diagram (lambda_i
// boxes); on beat three the glint runs down the diagonal and the rows once more.
// (Checked: the matrix subscripts are lambda_i + j - i = 345 / 123 / -1 0 1, and the
// determinant equals s_321 in 5 variables.)
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
    const lw = Math.max(1.5, Math.min(3, fs * 0.022)), ins = Math.max(2, yc * 0.04);

    // Diagonal glint, beat-synced: entry i (and diagram row i) peaks at 0.5 + i/12 and
    // again at 0.75 + i/12 (beats two and three of the 1.875 s card, triplet eighths).
    const PK = [0.5, 0.75], TRI = 1 / 12;
    const bump = i => Math.max(0, ...PK.map(t => 1 - Math.abs(p - (t + i * TRI)) / 0.055));
    const amOf = i => ease.out(clamp((p - (PK[0] + i * TRI - 0.035)) / 0.05)); // diagonal entry i turns amber

    // --- Young diagram of (3,2,1); row i lights up with the i-th diagonal entry ------
    const cells = lam.flatMap((m, r) => Array.from({ length: m }, (_, c) => [r, c]));
    cells.forEach(([r, c], i) => {
      const q = U.stagger(p, i, cells.length, 0, 0.12, 0.45);
      if (q <= 0) return;
      const sc = U.pop(q), cx = yx + c * yc + yc / 2, ccy = yy + r * yc + yc / 2;
      const b = bump(r);
      ctx.save(); ctx.translate(cx, ccy); ctx.scale(sc, sc); ctx.translate(-cx, -ccy);
      U.young(ctx, [1], yx + c * yc, yy + r * yc, yc, {
        stroke: rgba(C.ink, 0.95), lw, fill: () => { const f = Math.max(0.3 * b, 0.1 * amOf(r)); return f > 0.004 ? rgba(C.amber, f) : null; },
      });
      ctx.restore();
      if (b > 0) { hot.fillStyle = rgba(C.amber, 0.3 * b); hot.fillRect(yx + c * yc + ins, yy + r * yc + ins, yc - 2 * ins, yc - 2 * ins); }
    });

    // --- "=" ---------------------------------------------------------------------
    U.text(ctx, '=', x0 + 3 * yc + eqW / 2, cy + fs * 0.26, `${fs * 1.05}px ${F.main}`, rgba(C.ink, 0.95), 'center', 'alphabetic', clamp((p - 0.06) / 0.08));

    // --- determinant bars draw on from the middle outwards -------------------------
    const bq = ease.out(clamp((p - 0.06) / 0.14)), bh = 1.5 * rp + fs * 0.12;
    [mx - padB, mx + 3 * cp + padB].forEach(bx => {
      U.drawOn(ctx, bx, cy, bx, cy - bh, bq, rgba(C.ink, 0.95), lw);
      U.drawOn(ctx, bx, cy, bx, cy + bh, bq, rgba(C.ink, 0.95), lw);
    });

    // --- soft amber band along the diagonal (hot layer only), following the entries -----
    const dq = ease.inOut(clamp((p - PK[0] + 0.03) / (2 * TRI + 0.06)));
    if (dq > 0) {
      const ax = mx + cp * 0.5, ay = my + rp * 0.5, bx = mx + cp * 2.5, by = my + rp * 2.5;
      hot.save(); hot.lineCap = 'round';
      U.drawOn(hot, ax, ay, bx, by, dq, rgba(C.amber, 0.065 + 0.03 * k), fs * 0.85);
      hot.restore();
    }

    // --- entries pop in row by row; diagonal turns amber ---------------------------
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const t0 = 0.12 + 0.07 * i + 0.02 * j, q = clamp((p - t0) / 0.07);
      if (q <= 0) continue;
      const ex = mx + cp * (j + 0.5), ey = my + rp * (i + 0.5), base = ey + fs * 0.24;
      const sc = lerp(1.5, 1, ease.back(q)), a = clamp(q * 2.5);
      const s = ent(i, j), diag = i === j;
      const am = diag ? amOf(i) : 0;
      const col = am > 0 ? rgba(C.ink.map((v, c) => Math.round(lerp(v, C.amber[c], am))), 1)
        : rgba(C.ink, /^[01]$/.test(s) ? 0.72 : 1);
      [ctx, hot].forEach(g => {
        if (g === hot && am <= 0) return;
        const bs = sc * (1 + 0.07 * bump(i) * (diag ? 1 : 0));
        g.save(); g.translate(ex, ey); g.scale(bs, bs); g.translate(-ex, -ey);
        // hot copy kept low (a strong one clips the bloom to lemon yellow); the glint lifts it
        const ga = g === hot ? (0.2 + 0.4 * bump(i) + 0.08 * k) * am : 1;
        U.math(g, s, ex, base, fs, g === hot ? rgba(C.amber, 1) : col, 'center', a * ga);
        g.restore();
      });
    }
  },
});
