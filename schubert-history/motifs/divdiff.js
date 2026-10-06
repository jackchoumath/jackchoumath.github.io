// 1973/74 — Divided difference operators (Bernstein–Gelfand–Gelfand; Demazure).
//   ∂_i f = (f − s_i f) / (x_i − x_{i+1})
// Live computation (checked with a polynomial-dict script and numerically):
//   s_1(x_1^2 x_2) = x_2^2 x_1,   x_1^2x_2 − x_2^2x_1 = x_1x_2(x_1 − x_2),
//   so ∂_1(x_1^2 x_2) = x_1 x_2.
// Beats (4-beat card): formula + setup by p = .2 -> s_1 swaps x_1 and x_2 in the
// second term (x_1 leapfrogs over, x_2 dips under the exponent, which stays in its
// slot; "s_i f" in the formula lights cyan), landing at p = .375 -> the numerator
// factors on beat 2 (p = .5), (x_1 − x_2) cancels top and bottom -> the surviving
// x_1x_2 drops out to "= x_1x_2" in amber, landing on beat 3 (p = .75); then it is
// underlined while the scaffolding recedes.
MOTIF('divdiff', {
  draw(ctx, hot, p, k, env, box) {
    const { C, U, rgba, clamp, lerp, ease, seg } = env;
    const M = '−', SP = '\\;';
    const meas = (s, z) => U.math(ctx, s, 0, 0, z, '#000', 'left', 0);
    const put = (g, s, x, y, z, col, a = 1) => { if (a > 0.003) U.math(g, s, x, y, z, col, 'left', a); };
    const ink = a => rgba(C.ink, a);

    // ---- layout at nominal size Z, then scale to the box. Three rows share
    // one "=" column:   ∂_i f = (f − s_i f)/(x_i − x_{i+1})
    //                   ∂_1(x_1^2x_2) = (x_1^2x_2 − x_2^2x_1)/(x_1 − x_2)
    //                                 = x_1x_2
    const Z = 100, FZ = 0.74;                          // formula row is set smaller
    const P = {
      L: '\\partial_1(x_1^2x_2)', T1: 'x_1^2x_2', mid: SP + M + SP,
      N2a: 'x_1x_2', N2b: '(x_1' + SP + M + SP + 'x_2)', D: 'x_1' + SP + M + SP + 'x_2',
      eq: '=', var1: 'x_1', x: 'x',
      fL: '\\partial_if', fN1: 'f' + SP + M + SP, fN2: 's_if', fD: 'x_i' + SP + M + SP + 'x_{i+1}',
    };
    const w = {}; for (const key in P) w[key] = meas(P[key], Z);
    const wN1 = w.T1 + w.mid + 2 * w.var1, wN2 = w.N2a + w.N2b;
    const FW = Math.max(wN1, wN2, w.D) + Z * 0.3;      // fraction bar length
    const fW = (Math.max(w.fN1 + w.fN2, w.fD) + Z * 0.3) * FZ;
    const g = Z * 0.3;                                 // space around "="
    const left = Math.max(w.L, w.fL * FZ) + g, right = w.eq + g + Math.max(FW, fW);
    const blockH = Z * 5.6;
    const z = Math.min(box.w * 0.92 / (left + right), box.h * 0.88 / blockH) * Z;
    const S = z / Z, zf = z * FZ;
    const lwB = Math.max(1.5, z * 0.024);              // strokes scale with the type
    const tail = seg(p, 0.78, 1, ease.soft);           // after the answer lands: the scaffolding recedes
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const drift = 1 + 0.025 * ease.soft(clamp((p - 0.3) / 0.7)) + 0.012 * k;
    ctx.save(); hot.save();
    // Rows A+B sit centred in the box until row C arrives, then the block glides up
    // to make room for the answer.
    const oy = 0.5 * z * (1 - seg(p, 0.5, 0.64, ease.inOut));
    for (const c of [ctx, hot]) { c.translate(cx, cy); c.scale(drift, drift); c.translate(-cx, -cy + oy); }

    const eqx = cx + (left - right) * S / 2;           // the shared "=" column
    const fx0 = eqx + (w.eq + g) * S;                  // fractions start here
    const fxc = fx0 + FW * S / 2;
    const top = cy - blockH * S / 2;
    const yA = top + z * 0.9, yB = yA + z * 2.55, yC = yB + z * 1.9;   // bars / last baseline
    const axis = z * 0.25;                             // math axis above the baseline
    const numY = (y, zz) => y - zz * 0.42, denY = (y, zz) => y + zz * 0.72;

    // ---- row A: the definition. "s_i f" lights cyan while s_1 acts below.
    const aF = seg(p, 0.0, 0.12, ease.out), YA = yA + (1 - aF) * z * 0.4;
    const swapU = seg(p, 0.2, 0.375, ease.inOut);
    const lit = seg(p, 0.09, 0.16) * (1 - seg(p, 0.4, 0.47));     // the s_1 f term is cyan until it is computed
    put(ctx, P.fL, eqx - g * S - w.fL * zf / Z, YA + axis * FZ, zf, ink(0.78 * (1 - 0.35 * tail)), aF);
    put(ctx, '=', eqx + (w.eq * (S - zf / Z)) / 2, YA + axis * FZ, zf, ink(0.78 * (1 - 0.35 * tail)), aF);
    const fax = fx0 + (fW - (w.fN1 + w.fN2) * FZ) * S / 2;
    put(ctx, P.fN1, fax, numY(YA, zf), zf, ink(0.78 * (1 - 0.35 * tail)), aF);
    put(ctx, P.fN2, fax + w.fN1 * zf / Z, numY(YA, zf), zf, ink(0.78 * (1 - 0.35 * tail)), aF * (1 - lit));
    put(ctx, P.fN2, fax + w.fN1 * zf / Z, numY(YA, zf), zf, rgba(C.cyan, 1), aF * lit);
    if (lit > 0.02) put(hot, P.fN2, fax + w.fN1 * zf / Z, numY(YA, zf), zf, rgba(C.cyan, 0.25 * lit), aF);
    put(ctx, P.fD, fx0 + (fW * S - w.fD * zf / Z) / 2, denY(YA, zf), zf, ink(0.78 * (1 - 0.35 * tail)), aF);
    ctx.globalAlpha = aF; U.drawOn(ctx, fx0, YA, fx0 + fW * S, YA, aF, ink(0.78 * (1 - 0.35 * tail)), lwB * 0.8); ctx.globalAlpha = 1;

    // ---- row B: the live computation.
    const aB = seg(p, 0.04, 0.19, ease.out), Y = yB + (1 - aB) * z * 0.4;
    put(ctx, P.L, eqx - g * S - w.L * S, Y + axis, z, ink(1), aB);
    put(ctx, '=', eqx, Y + axis, z, ink(1), aB);
    ctx.globalAlpha = aB; U.drawOn(ctx, fx0, Y, fx0 + FW * S, Y, seg(p, 0.06, 0.21, ease.out), ink(0.95), lwB); ctx.globalAlpha = 1;
    const strikeN = seg(p, 0.5, 0.57, ease.out), strikeD = seg(p, 0.53, 0.6, ease.out);
    const dx = fxc - w.D * S / 2, dy = denY(Y, z);
    put(ctx, P.D, dx, dy, z, ink((1 - 0.62 * strikeD) * (1 - 0.4 * tail)), aB);

    // numerator, state 1:  x_1^2x_2 − (x_1^2x_2 -> x_2^2x_1 under s_1)
    // numerator swap: the old line leaves upward, then the factored one rises in
    const out1 = seg(p, 0.4, 0.445, ease.in), in2 = seg(p, 0.435, 0.5, ease.out);
    const a1 = aB * (1 - out1), a2 = aB * in2, ny = numY(Y, z);
    if (a1 > 0.003) {
      const n1x = fxc - wN1 * S / 2, yy = ny - out1 * z * 0.3;
      put(ctx, P.T1, n1x, yy, z, ink(1), a1);
      put(ctx, P.mid, n1x + w.T1 * S, yy, z, ink(1), a1);
      const xa = n1x + (w.T1 + w.mid) * S, xb = xa + w.var1 * S;
      // ivory <-> cyan blend for the s_1 f term
      const tint = (str, x, y) => {
        put(ctx, str, x, y, z, ink(1), a1 * (1 - lit));
        put(ctx, str, x, y, z, rgba(C.cyan, 1), a1 * lit);
      };
      const e = swapU, hop = Math.sin(Math.PI * e);
      // x_1 leapfrogs from slot A to slot B along a cubic: it lifts off up-left
      // (clear of the exponent, which stays in slot A), arcs over, and lands in B;
      // x_2 slides underneath into slot A.
      const bez = t => {
        const P = [[xa, yy], [xa - 1.3 * z, yy - 1.55 * z], [xb + 0.35 * z, yy - 2.4 * z], [xb, yy]], m = 1 - t;
        const c = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
        return [0, 1].map(d => c.reduce((acc, ci, i) => acc + ci * P[i][d], 0));
      };
      const [v1x, v1y] = bez(e), v2x = lerp(xb, xa, e);
      // the exponent stays in slot A; x_2 dips a little to pass under it
      tint('^2', xa + w.x * S, yy);
      const v2y = yy + 0.1 * z * hop;
      // once clear of the exponent, the airborne x_1 swells so it reads as a moving
      // object rather than as a superscript
      const hz = z * (1 + 0.22 * hop * e);
      put(ctx, 'x_1', v1x, v1y, hz, ink(1), a1 * (1 - lit)); put(ctx, 'x_1', v1x, v1y, hz, rgba(C.cyan, 1), a1 * lit);
      tint('x_2', v2x, v2y);
      const glow = 0.12 * lit + 0.14 * hop;
      if (glow > 0.02) {
        put(hot, 'x_1', v1x, v1y, hz, rgba(C.cyan, glow), a1);
        put(hot, 'x_2', v2x, v2y, z, rgba(C.cyan, glow), a1);
      }
    }
    // numerator, state 2:  x_1x_2 (x_1 − x_2), the factor (x_1 − x_2) struck top and bottom
    const n2x = fxc - wN2 * S / 2;
    if (a2 > 0.003) {
      const yy = ny + (1 - in2) * z * 0.3, keep = seg(p, 0.52, 0.6);
      put(ctx, P.N2a, n2x, yy, z, keep > 0 ? rgba(C.amber, 0.55 + 0.45 * keep) : ink(1), a2);
      if (keep > 0) put(hot, P.N2a, n2x, yy, z, rgba(C.amber, 0.2 * keep), a2);
      const px = n2x + w.N2a * S;
      put(ctx, P.N2b, px, yy, z, ink((1 - 0.62 * strikeN) * (1 - 0.4 * tail)), a2);
      U.drawOn(ctx, px + z * 0.05, yy + z * 0.2, px + w.N2b * S - z * 0.05, yy - z * 0.78, strikeN, rgba(C.cyan, 0.95 * (1 - 0.4 * tail)), lwB);
    }
    U.drawOn(ctx, dx - z * 0.02, dy + z * 0.2, dx + w.D * S + z * 0.02, dy - z * 0.62, strikeD, rgba(C.cyan, 0.95 * (1 - 0.4 * tail)), lwB);

    // ---- row C: "= x_1x_2" — the surviving factor drops out of the numerator.
    const aC = seg(p, 0.58, 0.66, ease.out), fly = seg(p, 0.58, 0.75, ease.out);
    put(ctx, '=', eqx, yC, z, ink(1), aC);
    if (fly > 0) {
      // It falls through the bar along a gentle arc whose midpoint (at the height of
      // the denominator) is centred in the gap between row B's "=" and the struck
      // denominator, so it never collides with either.
      const rx = fx0, bulge = Math.sin(Math.PI * fly);
      const gapMid = ((eqx + w.eq * S) + (dx - w.N2a * S)) / 2;
      const X = lerp(n2x, rx, fly) + bulge * (gapMid - lerp(n2x, rx, 0.5)), Yf = lerp(ny, yC, fly);
      const zz = z * (1 + 0.04 * k * (fly >= 1 ? 1 : 0));
      const glow = 0.15 + 0.08 * k + 0.12 * (1 - seg(p, 0.75, 1));
      put(ctx, P.N2a, X, Yf, zz, rgba(C.amber, 1));
      put(hot, P.N2a, X, Yf, zz, rgba(C.amber, glow));
      const ul = seg(p, 0.74, 0.86, ease.out), uy = yC + z * 0.42;
      U.drawOn(ctx, rx, uy, rx + w.N2a * S, uy, ul, rgba(C.amber, 0.95), lwB);
      U.drawOn(hot, rx, uy, rx + w.N2a * S, uy, ul, rgba(C.amber, 0.6), lwB * 1.2);
    }
    ctx.restore(); hot.restore();
  },
});
