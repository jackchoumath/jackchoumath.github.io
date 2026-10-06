// Motif 'logconcave': Huh-Matherne-Meszaros-St. Dizier (Trans. AMS 2022): the
// normalized Schur polynomial N(s_lambda) = sum_alpha K_{lambda,alpha} x^alpha / alpha!
// is Lorentzian, so its coefficients K_{lambda,alpha} are log-concave along every
// root direction: K_alpha^2 >= K_{alpha+e_i-e_j} K_{alpha-e_i+e_j}.
// Data: a_k = coefficient of x1^k x2^(8-k) x3^3 x4^2 in s_(8,5)(x1,x2,x3,x4)
// (Kostka numbers K_{(8,5),(k,8-k,3,2)}), k = 0..8:
//   1, 3, 6, 9, 10, 9, 6, 3, 1
// computed in Python twice (horizontal-strip count of SSYT, and the bialternant
// det(x_i^(lambda_j+n-j)) / Vandermonde in sympy). a_k^2 vs a_{k-1} a_{k+1}:
//   9>6, 36>27, 81>60, 100>81, 81>60, 36>27, 9>6.
// On bar k of the sliding window a tick marks sqrt(a_{k-1} a_{k+1}); the bar
// always clears it. Drawn in a 440-high design frame scaled into the box (wider than
// 580 on a wide box, so the bars spread). Kostka numbers re-checked for this cut.
// Centre-stage cut (1 beat = 0.47 s): the bars rise in a wave and the inequality drops
// in by p = 0.25; the window lands on the peak (10^2 >= 9 * 9) at p = 0.3 and glides
// to k = 5 (81 >= 60) before the cut.
MOTIF('logconcave', (() => {
  const A = [1, 3, 6, 9, 10, 9, 6, 3, 1], N = A.length;
  const VH = 440;
  const base = 360, top = 140;
  const H = v => (base - top) * v / 10;

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      // Design frame 440 high; on a wide box it widens (up to 740) so the bars spread and fatten.
      const VW = clamp(box.w * VH / box.h * 0.95, 580, 740);
      const pitch = (VW - 164) / (N - 1), bw = pitch * 0.58, x0 = VW / 2 - pitch * (N - 1) / 2;
      const bx = i => x0 + i * pitch;
      const sc = Math.min(box.w / VW, box.h / VH);
      const ox = box.x + (box.w - VW * sc) / 2, oy = box.y + (box.h - VH * sc) / 2;
      const drift = 1 + 0.025 * ease.soft(clamp((p - 0.3) / 0.7));
      for (const g of [ctx, hot]) {
        g.save(); g.translate(ox, oy); g.scale(sc, sc);
        g.translate(VW / 2, base); g.scale(drift, drift); g.translate(-VW / 2, -base);
      }

      // sliding window centre kc: after the build it parks on nStop consecutive bars around the
      // peak, gliding between. Each stop gets at least ~0.15 s, so a short motif does not strobe
      // (all 7 windows k = 1..7 once dur >= ~1.7 s; k = 4, 5 for a one-beat flash).
      const T0 = 0.3;
      const nStop = Math.max(2, Math.min(N - 2, Math.floor((1 - T0) * (env.dur || 1.9) / 0.15)));
      const k0 = 4 - Math.floor((nStop - 1) / 2), STEP = (1 - T0) / nStop;
      let kc = -1, f = 0;
      if (p >= T0) {
        const u = Math.min(nStop - 0.001, (p - T0) / STEP), s = Math.floor(u);
        f = u - s;
        kc = k0 + (s === 0 ? 0 : s - 1 + ease.inOut(clamp(f / 0.35)));
      }
      const kInt = kc < 0 ? -1 : Math.round(kc);
      const settle = kc < 0 ? 0 : 1 - Math.abs(kc - kInt) * 2;   // 1 when parked on a bar

      // baseline
      U.drawOn(ctx, bx(0) - 30, base, bx(N - 1) + 30, base, seg(p, 0, 0.08, ease.out), rgba(C.dim, 0.9), 2);

      // bars rise in a wave from the left
      const hs = A.map((v, i) => H(v) * ease.back(seg(p, 0.01 + i * 0.017, 0.11 + i * 0.017)));
      A.forEach((v, i) => {
        const h = hs[i];
        if (h <= 0.1) return;
        const inWin = kInt >= 0 && Math.abs(i - kInt) <= 1;
        const mid = i === kInt;
        const x = bx(i) - bw / 2;
        ctx.fillStyle = mid ? rgba(C.amber, 0.25 + 0.2 * settle) : rgba(C.ink, inWin ? 0.16 : 0.08);
        ctx.fillRect(x, base - h, bw, h);
        ctx.strokeStyle = mid ? rgba(C.amber, 1) : rgba(C.ink, inWin ? 1 : 0.8);
        ctx.lineWidth = mid ? 2.2 : 1.8; ctx.strokeRect(x, base - h, bw, h);
        if (mid) {
          hot.strokeStyle = rgba(C.amber, 0.45 + 0.35 * settle + 0.2 * k); hot.lineWidth = 3; hot.strokeRect(x, base - h, bw, h);
        }
        // the coefficient under its bar
        const la = seg(p, 0.06 + i * 0.017, 0.13 + i * 0.017);
        U.text(ctx, String(v), bx(i), base + 30, `${mid ? 22 : 19}px ${F.main}`, rgba(mid ? C.amber : inWin ? C.ink : C.dim, 1), 'center', 'alphabetic', la);
      });

      // smooth envelope through the bar tops (Catmull-Rom), drawn on after the bars
      const eq = seg(p, 0.13, 0.3, ease.inOut);
      if (eq > 0) {
        const P = A.map((v, i) => [bx(i), base - hs[i] - 10]);
        const steps = 16 * (N - 1), last = Math.floor(steps * eq);
        ctx.strokeStyle = rgba(C.ink, 0.7); ctx.lineWidth = 1.6; ctx.beginPath();
        for (let s = 0; s <= last; s++) {
          const t = s / 16, i = Math.min(N - 2, Math.floor(t)), f = t - i;
          const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(N - 1, i + 2)];
          const cr = d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * f + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * f * f + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * f * f * f);
          if (s) ctx.lineTo(cr(0), cr(1)); else ctx.moveTo(cr(0), cr(1));
        }
        ctx.stroke();
      }

      // the window: bracket under the triple, geometric-mean tick on the middle bar
      if (kc >= 0) {
        const xa = bx(kc - 1) - bw / 2 - 6, xb = xa + 2 * pitch + bw + 12;
        const yb = base + 44;
        ctx.strokeStyle = rgba(C.amber, 0.9); ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(xa, yb - 6); ctx.lineTo(xa, yb); ctx.lineTo(xb, yb); ctx.lineTo(xb, yb - 6); ctx.stroke();
        if (settle > 0.05) {
          const gm = H(Math.sqrt(A[kInt - 1] * A[kInt + 1])), x = bx(kInt);
          const yg = base - gm, yt = base - hs[kInt];
          // the margin a_k - sqrt(a_{k-1} a_{k+1}) glows above the tick
          hot.fillStyle = rgba(C.amber, 0.35 * settle + 0.12 * k); hot.fillRect(x - bw / 2 + 2, yt, bw - 4, Math.max(0, yg - yt));
          U.line(ctx, x - bw / 2 - 11, yg, x + bw / 2 + 11, yg, rgba(C.cyan, settle), 3);
        }
      }

      // the inequality
      const fq = seg(p, 0.1, 0.24, ease.out);
      if (fq > 0) {
        const punch = 1 + (kc >= 0 ? 0.06 * Math.max(0, 1 - Math.abs(f - 0.38) / 0.14) : 0) + 0.03 * k;   // on each landing
        ctx.save(); ctx.translate(VW / 2, 66); ctx.scale(punch, punch);
        U.math(ctx, 'a_k^2 \\geq a_{k−1}\\,a_{k+1}', 0, 14, 40, rgba(C.ink, 1), 'center', fq);
        ctx.restore();
      }
      ctx.restore(); hot.restore();
    },
  };
})());
