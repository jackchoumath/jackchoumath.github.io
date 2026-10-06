// 2023 — Separated descents (Huang; Knutson–Zinn-Justin).
// u = 1342 has its only descent at position 3; v = 321 has descents at 1 and 2,
// so the descents are separated (k = 2). Computed by divided differences and
// expanding in the Schubert basis:
//   S_1342 · S_321 = S_3421 + S_4231 + S_4312.
MOTIF('separated', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
    const ROWS = [
      { lab: 'v', w: [3, 2, 1], col: C.cyan },
      { lab: 'u', w: [1, 3, 4, 2], col: C.violet },
    ];
    const d = Math.min(box.w / 6.2, box.h / 5.2);
    const x0 = box.x + box.w * 0.5 - 1.5 * d;            // centre of position 1
    const X = i => x0 + (i - 1) * d;
    const y0 = box.y + box.h * 0.2;
    const fz = Math.round(d * 0.46);
    // The separating wall sits between descent gap 2 and gap 3.
    const wallX = X(3), wq = seg(p, 0.12, 0.34, ease.out);
    // Dashed, and broken around the digits it passes.
    ctx.save(); ctx.setLineDash([7, 7]);
    const top = y0 - d * 0.75, bot = y0 + d * 1.75, yq = lerp(top, bot, wq);
    [[top, y0 - fz * 0.75], [y0 + fz * 0.6, y0 + d * 1.05 - fz * 0.75], [y0 + d * 1.05 + fz * 0.6, bot]].forEach(([a, b]) => {
      if (yq > a) U.line(ctx, wallX, a, wallX, Math.min(b, yq), rgba(C.amber, 0.9), 2);
    });
    ctx.restore();
    if (wq > 0) U.text(ctx, 'k', wallX, y0 - d * 0.85, `italic ${Math.round(d * 0.3)}px ${F.math}`, rgba(C.amber, wq), 'center');

    ROWS.forEach((r, ri) => {
      const y = y0 + ri * d * 1.05;
      const rq = U.stagger(p, ri, 2, 0, 0.16, 0.6);
      if (rq <= 0) return;
      U.text(ctx, r.lab, X(1) - d * 0.75, y + fz * 0.35, `italic ${fz}px ${F.math}`, rgba(C.dim, rq), 'center');
      r.w.forEach((val, i) => {
        const q = U.pop(clamp(rq * 1.4 - i * 0.12));
        if (q <= 0) return;
        ctx.save(); ctx.translate(X(i + 1), y); ctx.scale(q, q);
        U.text(ctx, String(val), 0, fz * 0.35, `${fz}px ${F.main}`, rgba(C.ink, 1), 'center');
        ctx.restore();
      });
      // Descent markers: a slash in the gap between positions i and i+1.
      for (let i = 0; i + 1 < r.w.length; i++) {
        if (r.w[i] < r.w[i + 1]) continue;
        const mq = seg(p, 0.1 + ri * 0.06, 0.26 + ri * 0.06, ease.out);
        if (mq <= 0) continue;
        const gx = (X(i + 1) + X(i + 2)) / 2, h = d * 0.32;
        U.drawOn(ctx, gx - h * 0.35, y - h, gx + h * 0.35, y + h * 0.6, mq, rgba(r.col, 1), 3);
        U.drawOn(hot, gx - h * 0.35, y - h, gx + h * 0.35, y + h * 0.6, mq, rgba(r.col, 0.6 * (1 - 0.5 * clamp(p * 2))), 3);
      }
    });

    // The product expands with every coefficient positive.
    const fs = Math.min(50, box.w * 0.056);
    const ey = y0 + d * 2.75;
    const lhq = seg(p, 0.26, 0.4, ease.out);
    U.math(ctx, '\\S_{1342}\\,\\S_{321} =', box.x + box.w * 0.5, ey, fs * 1.1, rgba(C.ink, lhq), 'center');
    const TERMS = ['\\S_{3421}', '\\S_{4231}', '\\S_{4312}'];
    const step = fs * 4.1, tx0 = box.x + box.w * 0.5 - step;
    const pw = U.math(ctx, '+\\;', 0, 0, fs, 'rgba(0,0,0,0)', 'left', 0);   // the first term has no '+'; shift it for even gaps
    TERMS.forEach((tm, j) => {
      const q = U.pop(seg(p, 0.36 + j * 0.09, 0.52 + j * 0.09));
      if (q <= 0) return;
      const x = tx0 + j * step + (j ? 0 : pw / 2), y = ey + fs * 1.6;
      ctx.save(); ctx.translate(x, y); ctx.scale(q, q);
      U.math(ctx, (j ? '+\\;' : '') + tm, 0, 0, fs, rgba(j === 2 ? C.amber : C.ink, 1), 'center');
      ctx.restore();
      if (j === 2) { hot.save(); hot.translate(x, y); hot.scale(q, q); U.math(hot, '+\\;' + tm, 0, 0, fs, rgba(C.amber, 0.45), 'center'); hot.restore(); }
    });
    const cq = seg(p, 0.66, 0.8, ease.out);
    // Des(v) <= k <= Des(u): mono words, with the inequality signs from KaTeX_Main (the mono subset lacks them).
    const cf = `600 ${Math.round(fs * 0.5)}px ${F.mono}`, mf = `${Math.round(fs * 0.6)}px ${F.main}`;
    const parts = [['DES(v) ', cf], ['\u2264', mf], [' k ', cf], ['\u2264', mf], [' DES(u)', cf]];
    let cw = 0; parts.forEach(([str, f]) => { ctx.font = f; cw += ctx.measureText(str).width; });
    let cxp = box.x + box.w * 0.5 - cw / 2;
    parts.forEach(([str, f]) => { U.text(ctx, str, cxp, ey + fs * 3.3, f, rgba(C.dim, cq), 'left'); ctx.font = f; cxp += ctx.measureText(str).width; });
    void k;
  },
});
