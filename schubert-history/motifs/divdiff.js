// 1973/74 — Divided difference operators (Bernstein–Gelfand–Gelfand; Demazure).
//   ∂_i f = (f − s_i f) / (x_i − x_{i+1})
// Live computation (checked with a polynomial-dict script and numerically):
//   s_1(x_1^2 x_2) = x_2^2 x_1,   x_1^2x_2 − x_2^2x_1 = x_1x_2(x_1 − x_2),
//   so ∂_1(x_1^2 x_2) = x_1 x_2.
// Beats: formula + setup (p<.3) -> s_1 swaps x_1 and x_2 in the second term
// (x_1 leapfrogs over x_2, the exponent stays in its slot) -> the numerator
// factors, (x_1 − x_2) cancels top and bottom -> the surviving x_1x_2 flies out
// to "= x_1x_2" in amber.
MOTIF('divdiff', {
  draw(ctx, hot, p, k, env, box) {
    const { C, U, rgba, clamp, lerp, ease, seg } = env;
    const M = '−', SP = '\\;';
    const meas = (s, z) => U.math(ctx, s, 0, 0, z, '#000', 'left', 0);
    const put = (g, s, x, y, z, col, a = 1) => (a > 0.003 ? U.math(g, s, x, y, z, col, 'left', a) : meas(s, z));

    // ---- layout at nominal size Z, then scale to the box.
    const Z = 100;
    const pieces = {
      L: '\\partial_1(x_1^2x_2)', T1: 'x_1^2x_2', mid: SP + M + SP,
      N2a: 'x_1x_2', N2b: '(x_1' + SP + M + SP + 'x_2)', D: 'x_1' + SP + M + SP + 'x_2',
      eq: '=', var1: 'x_1', var2: 'x_2', x: 'x',
      fL: '\\partial_i f', fN: 'f' + SP + M + SP + 's_if', fD: 'x_i' + SP + M + SP + 'x_{i+1}',
    };
    const w = {}; for (const key in pieces) w[key] = meas(pieces[key], Z);
    const slotA = w.var1;                             // "x_1^2" slot: x with sub/sup sharing the advance
    const wT2 = slotA + w.var2;
    const wN1 = w.T1 + w.mid + wT2, wN2 = w.N2a + w.N2b;
    const FW = Math.max(wN1, wN2, w.D) + Z * 0.3;      // fraction bar length
    const g = Z * 0.3;                                 // space around "="
    const rowW = w.L + 2 * g + w.eq + FW + 2 * g + w.eq + w.var1 * 2 + Z * 0.04;
    const rowH = Z * 4.9;                              // both rows, with fractions
    const z = Math.min(box.w * 0.9 / rowW, box.h * 0.84 / rowH) * Z;
    const S = z / Z;                                   // scale factor for nominal widths
    const drift = 1 + 0.025 * ease.soft(clamp((p - 0.3) / 0.7)) + 0.012 * k;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    ctx.save(); hot.save();
    for (const c of [ctx, hot]) { c.translate(cx, cy); c.scale(drift, drift); c.translate(-cx, -cy); }

    const x0 = cx - rowW * S / 2;
    const eq1x = x0 + (w.L + g) * S;                   // first "=" of the computation row
    const fx0 = eq1x + (w.eq + g) * S;                 // fraction left edge
    const fxc = fx0 + FW * S / 2;                      // fraction centre
    const yA = cy - rowH * S / 2 + z * 1.15;           // formula row: fraction bar
    const yB = yA + z * 2.75;                          // computation row: fraction bar
    const axis = z * 0.25;                             // math axis above the baseline
    const numY = (y, zz = z) => y - zz * 0.42, denY = (y, zz = z) => y + zz * 0.72;
    const ink = a => rgba(C.ink, a);

    // ---- formula row  ∂_i f = (f − s_i f)/(x_i − x_{i+1}), aligned on its "=".
    const zf = z * 0.74, Sf = zf / Z;
    const aF = seg(p, 0.0, 0.16, ease.out), dyF = (1 - aF) * z * 0.4;
    const swapU = seg(p, 0.3, 0.48, ease.inOut);
    const swapHi = Math.sin(Math.PI * seg(p, 0.27, 0.53));      // cyan link while s_1 acts
    const fbW = Math.max(w.fN, w.fD) * Sf + zf * 0.3, fbx = eq1x + (w.eq + g) * S;
    const yAf = yA + dyF;
    put(ctx, pieces.fL, eq1x - g * S - w.fL * Sf, yAf + axis * 0.74, zf, ink(0.8), aF);
    put(ctx, '=', eq1x, yAf + axis * 0.74, zf, ink(0.8), aF);
    // numerator f − s_i f, with "s_i f" lit cyan while the swap happens
    const fnx = fbx + (fbW - w.fN * Sf) / 2;
    const wf = meas('f' + SP + M + SP, zf);
    put(ctx, 'f' + SP + M + SP, fnx, numY(yAf, zf), zf, ink(0.8), aF);
    put(ctx, 's_if', fnx + wf, numY(yAf, zf), zf, swapHi > 0.02 ? rgba(C.cyan, 0.8 + 0.2 * swapHi) : ink(0.8), aF);
    if (swapHi > 0.02) put(hot, 's_if', fnx + wf, numY(yAf, zf), zf, rgba(C.cyan, 0.5 * swapHi), aF);
    put(ctx, pieces.fD, fbx + (fbW - w.fD * Sf) / 2, denY(yAf, zf), zf, ink(0.8), aF);
    ctx.globalAlpha = aF; U.drawOn(ctx, fbx, yAf, fbx + fbW, yAf, aF, ink(0.8), 2); ctx.globalAlpha = 1;

    // ---- computation row.
    const aB = seg(p, 0.08, 0.26, ease.out), dyB = (1 - aB) * z * 0.4, Y = yB + dyB;
    put(ctx, pieces.L, x0, Y + axis, z, ink(1), aB);
    put(ctx, '=', eq1x, Y + axis, z, ink(1), aB);
    ctx.globalAlpha = aB; U.drawOn(ctx, fx0, Y, fx0 + FW * S, Y, seg(p, 0.1, 0.3, ease.out), ink(0.95), 2.5); ctx.globalAlpha = 1;
    // denominator x_1 − x_2 (struck later)
    const dx = fxc - w.D * S / 2;
    const strike = seg(p, 0.66, 0.76, ease.out);
    put(ctx, pieces.D, dx, denY(Y), z, ink(1 - 0.6 * strike), aB);

    // numerator, state 1:  x_1^2x_2 − x_2^2x_1  (second term built by the swap)
    const morph = seg(p, 0.53, 0.65, ease.inOut);
    const a1 = aB * (1 - morph), a2 = aB * morph;
    const n1x = fxc - wN1 * S / 2, ny = numY(Y);
    if (a1 > 0.003) {
      const yy = ny - morph * z * 0.35;
      put(ctx, pieces.T1, n1x, yy, z, ink(1), a1);
      put(ctx, pieces.mid, n1x + w.T1 * S, yy, z, ink(1), a1);
      const xa = n1x + (w.T1 + w.mid) * S, xb = xa + slotA * S;
      put(ctx, '^2', xa + w.x * S - z * 0.0, yy, z, ink(1), a1);               // exponent stays in slot A
      const e = swapU, hop = Math.sin(Math.PI * e);
      const cyan = rgba(C.cyan, 1), col = hop > 0.02 ? cyan : ink(1);
      // x_1 leapfrogs from slot A over to slot B; x_2 slides underneath into slot A.
      const v1x = lerp(xa, xb, e), v1y = yy - hop * z * 0.95;
      const v2x = lerp(xb, xa, e), v2y = yy;
      put(ctx, 'x_1', v1x, v1y, z, col, a1);
      put(ctx, 'x_2', v2x, v2y, z, col, a1);
      if (hop > 0.02) {
        put(hot, 'x_1', v1x, v1y, z, rgba(C.cyan, 0.55 * hop), a1);
        put(hot, 'x_2', v2x, v2y, z, rgba(C.cyan, 0.55 * hop), a1);
        // faint arc trace for the leapfrog
        ctx.save(); ctx.strokeStyle = rgba(C.cyan, 0.45 * hop * a1); ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const t = i / 24 * e, X = lerp(xa, xb, t) + w.var1 * S / 2, Yc = yy - z * 0.3 - Math.sin(Math.PI * t) * z * 0.95;
          i ? ctx.lineTo(X, Yc) : ctx.moveTo(X, Yc);
        }
        ctx.stroke(); ctx.restore();
      }
    }
    // numerator, state 2:  x_1x_2 (x_1 − x_2)
    const n2x = fxc - wN2 * S / 2;
    const fly = seg(p, 0.72, 0.88, ease.out);
    if (a2 > 0.003) {
      const yy = ny + (1 - morph) * z * 0.35;
      const keep = seg(p, 0.66, 0.74);
      put(ctx, pieces.N2a, n2x, yy, z, keep > 0 ? rgba(C.amber, 0.6 + 0.4 * keep) : ink(1), a2);
      put(ctx, pieces.N2b, n2x + w.N2a * S, yy, z, ink(1 - 0.6 * strike), a2);
      // cancellation strokes across (x_1 − x_2) above and below the bar
      const sx0 = n2x + w.N2a * S - z * 0.05, sx1 = sx0 + w.N2b * S + z * 0.1;
      U.drawOn(ctx, sx0, yy + z * 0.18, sx1, yy - z * 0.72, strike, rgba(C.cyan, 0.95), 2.5);
      U.drawOn(ctx, dx - z * 0.08, denY(Y) + z * 0.18, dx + w.D * S + z * 0.08, denY(Y) - z * 0.72,
        seg(p, 0.69, 0.79, ease.out), rgba(C.cyan, 0.95), 2.5);
    }

    // ---- "= x_1x_2": the surviving factor flies out of the numerator.
    const eq2x = fx0 + FW * S + g * S, rx = eq2x + (w.eq + g) * S;
    const aEq = seg(p, 0.72, 0.8, ease.out);
    put(ctx, '=', eq2x, Y + axis, z, ink(1), aEq);
    if (fly > 0) {
      const fxp = lerp(n2x, rx, fly), fyp = lerp(ny, Y + axis, fly) - Math.sin(Math.PI * fly) * z * 0.5;
      const zz = z * (1 + 0.12 * Math.sin(Math.PI * fly));
      const glow = 0.55 + 0.25 * k + 0.2 * (1 - seg(p, 0.88, 1));
      put(ctx, pieces.N2a, fxp, fyp, zz, rgba(C.amber, 1), 1);
      put(hot, pieces.N2a, fxp, fyp, zz, rgba(C.amber, glow), 1);
      if (fly >= 1) {   // a short underline sweep under the answer
        const ul = seg(p, 0.86, 0.98, ease.out);
        U.drawOn(ctx, rx, Y + axis + z * 0.42, rx + w.N2a * S, Y + axis + z * 0.42, ul, rgba(C.amber, 0.9), 2.5);
        U.drawOn(hot, rx, Y + axis + z * 0.42, rx + w.N2a * S, Y + axis + z * 0.42, ul, rgba(C.amber, 0.6), 3);
      }
    }
    ctx.restore(); hot.restore();
  },
});
