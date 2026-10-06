// 2023 — Separated descents (Huang; Knutson–Zinn-Justin).
// u = 1342 has its only descent at position 3; v = 321 has descents at 1 and 2,
// so every descent of v is left of every descent of u: the descents are separated
// by a wall k between them, and S_u S_v expands positively by a puzzle rule.
// Computed by divided differences and expanding in the Schubert basis (sympy,
// re-checked for this cut):
//   S_1342 · S_321 = S_3421 + S_4231 + S_4312.
// Centre-stage cut (2 beats = 0.94 s; the beat falls at p = 0.5): the two words pop
// in, their descents are slashed (u violet, v cyan), the amber wall k drops between
// them, and the product lands term by term, the third on the beat, where the whole
// right-hand side flashes. Then it holds, breathing, until the cut.
MOTIF('separated', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
    const ROWS = [
      { lab: 'u', w: [1, 3, 4, 2], col: C.violet },
      { lab: 'v', w: [3, 2, 1], col: C.cyan },
    ];
    const LHS = '\\S_{1342}\\,\\S_{321} =', TERMS = ['\\S_{3421}', '\\S_{4231}', '\\S_{4312}'];
    const meas = (str, z) => U.math(ctx, str, -9999, -9999, z, 'rgba(0,0,0,0)');
    // Unit d = digit pitch. The group (wall label .. formula) is ~3.4 d tall and fills ~80% of
    // the box height; the one-line product is set a touch larger than the digits (f <= 0.48 d),
    // shrunk if it would be wider than the box.
    const Z = 100, gU = 0.3;
    const wPlus = meas('+', Z) / Z, wL = meas(LHS, Z) / Z, wT = TERMS.map(t => meas(t, Z) / Z);
    const totU = wL + gU + wT.reduce((a, b) => a + b, 0) + 2 * (wPlus + 2 * gU);
    const drift = 1 + 0.025 * ease.soft(seg(p, 0.25, 1));
    const d = Math.min(box.h * 0.8 / 3.4, box.w / 5.3);
    const f = Math.min(0.48 * d, box.w * 0.92 / totU);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    for (const g of [ctx, hot]) { g.save(); g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }
    const top = cy - 3.4 * d / 2;
    const yU = top + 1.03 * d, yV = yU + d, yF = yV + 1.1 * d + f * 0.3;
    const X = i => cx + (i - 2.35) * d;               // digit i (1-indexed); digits a touch right of centre, labels left
    const fz = Math.round(d * 0.44), lw = clamp(d * 0.016, 1.5, 2.6);

    // The wall between the descents of v (gaps 1, 2) and of u (gap 3): through position 3,
    // dashed, broken around the digits it passes.
    const wq = seg(p, 0.12, 0.28, ease.out);
    const wTop = yU - 0.66 * d, wBot = yV + 0.42 * d, yq = lerp(wTop, wBot, wq), wx = X(3);
    const breaks = [[wTop, yU - fz * 0.78], [yU + fz * 0.42, yV - fz * 0.78], [yV + fz * 0.42, wBot]];
    for (const [g, a] of [[ctx, 0.95], [hot, 0.3 + 0.25 * k]]) {
      g.save(); g.setLineDash([d * 0.07, d * 0.06]);
      breaks.forEach(([a0, b0]) => { if (yq > a0) U.line(g, wx, a0, wx, Math.min(b0, yq), rgba(C.amber, a), lw); });
      g.restore();
    }
    if (wq > 0) {
      const kz = U.pop(seg(p, 0.2, 0.3));
      ctx.save(); ctx.translate(wx, wTop - d * 0.14); ctx.scale(kz, kz);
      U.math(ctx, 'k', 0, 0, d * 0.36, rgba(C.amber, 1), 'center');
      ctx.restore();
    }

    ROWS.forEach((r, ri) => {
      const y = ri ? yV : yU;
      const rq = U.stagger(p, ri, 2, 0, 0.12, 0.6);
      if (rq <= 0) return;
      U.math(ctx, r.lab, X(1) - d * 0.85, y + fz * 0.0, fz * 0.92, rgba(C.dim, 1), 'center', rq);
      r.w.forEach((val, i) => {
        const q = U.pop(clamp(rq * 1.5 - i * 0.12));
        if (q <= 0) return;
        ctx.save(); ctx.translate(X(i + 1), y - fz * 0.35); ctx.scale(q, q);
        U.text(ctx, String(val), 0, fz * 0.35, `${fz}px ${F.main}`, rgba(C.ink, 1), 'center');
        ctx.restore();
      });
      // Descent markers: a slash in the gap between positions i and i+1.
      for (let i = 0; i + 1 < r.w.length; i++) {
        if (r.w[i] < r.w[i + 1]) continue;
        const mq = seg(p, 0.06 + ri * 0.04, 0.17 + ri * 0.04, ease.out);
        if (mq <= 0) continue;
        const gx = (X(i + 1) + X(i + 2)) / 2, h = d * 0.28, yc = y - fz * 0.35;
        U.drawOn(ctx, gx - h * 0.4, yc - h, gx + h * 0.4, yc + h, mq, rgba(r.col, 1), Math.min(3, lw * 1.25));
        U.drawOn(hot, gx - h * 0.4, yc - h, gx + h * 0.4, yc + h, mq, rgba(r.col, 0.45 + 0.3 * k), Math.min(3, lw * 1.25));
      }
    });

    // The product, one line, term by term; the third lands on the beat (p = 0.5) and the
    // whole right-hand side flashes amber, then settles to ink.
    const gap = gU * f, xs = [];
    let x = cx - totU * f / 2;
    const lq = seg(p, 0.2, 0.3, ease.out);
    U.math(ctx, LHS, x, yF + (1 - lq) * f * 0.3, f, rgba(C.ink, 0.95), 'left', lq);
    x += wL * f + gap;
    const flash = Math.exp(-Math.max(0, p - 0.5) * 7) * (p >= 0.49 ? 1 : 0);
    TERMS.forEach((tm, j) => {
      const t0 = 0.3 + j * 0.065, q = seg(p, t0, t0 + 0.06);
      if (j > 0) { U.math(ctx, '+', x + gap, yF, f, rgba(C.ink, 0.85), 'left', ease.out(q)); x += wPlus * f + 2 * gap; }
      if (q > 0) {
        const z = lerp(1.35, 1, ease.out(q)) * (1 + 0.05 * flash), w = wT[j] * f;
        const col = C.ink.map((c, m) => Math.round(lerp(c, C.amber[m], flash)));
        for (const g of [ctx, hot]) {
          const a = g === hot ? 0.22 * Math.max(flash, 1 - q) : 1;
          if (a <= 0.01) continue;
          g.save(); g.translate(x + w / 2, yF - f * 0.3); g.scale(z, z);
          U.math(g, tm, 0, f * 0.3, f, g === hot ? rgba(C.amber, a) : rgba(col, 1), 'center', clamp(q * 2.5));
          g.restore();
        }
      }
      x += wT[j] * f;
    });
    ctx.restore(); hot.restore();
  },
});
