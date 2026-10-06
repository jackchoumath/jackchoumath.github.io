// Lesieur (1947): H*(Gr(k,n)) is a quotient of the ring of symmetric functions,
// the Schubert class sigma_lambda corresponding to the Schur function s_lambda.
// A Young diagram lambda (inside the faint k x (n-k) = 3 x 4 box) morphs through
// a few shapes -- (2,1) -> (3,1) -> (2,2) -> (2,2,1) -> (3,2,1), one box added or
// slid at a time -- above  sigma_lambda <-> s_lambda.
MOTIF('lesieur', (() => {
  // Each box token: its cell at stages 0..4 (null = absent).
  const TOK = [
    [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
    [[0, 1], [0, 1], [0, 1], [0, 1], [0, 1]],
    [[1, 0], [1, 0], [1, 0], [1, 0], [1, 0]],
    [null, [0, 2], [1, 1], [1, 1], [1, 1]],     // added, then slides down-left
    [null, null, null, [2, 0], [2, 0]],
    [null, null, null, null, [0, 2]],
  ];
  // Stage j is reached over [T[j][0], T[j][1]] of p.
  const T = [[0.04, 0.28], [0.38, 0.47], [0.52, 0.63], [0.68, 0.77], [0.82, 0.91]];

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const s = Math.min(box.w / 7.6, box.h / 5.9);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }
      const gx = cx - 2 * s, gy = cy - 2.15 * s;                // 3 x 4 frame, top-left

      // Faint k x (n-k) frame.
      const fa = seg(p, 0, 0.18, ease.out);
      ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) { ctx.moveTo(gx + i * s, gy); ctx.lineTo(gx + i * s, gy + 3 * s); }
      for (let j = 0; j <= 3; j++) { ctx.moveTo(gx, gy + j * s); ctx.lineTo(gx + 4 * s, gy + j * s); }
      ctx.stroke(); ctx.restore();

      // Current stage and in-stage progress.
      let st = 0;
      for (let j = 1; j < T.length; j++) if (p >= T[j][0]) st = j;
      const u = st === 0 ? 1 : seg(p, T[st][0], T[st][1], ease.inOut);
      const glowLast = 1 - seg(p, T[st][1], T[st][1] + 0.1) * 0.5;

      TOK.forEach((path, i) => {
        const a = path[st], b = st > 0 ? path[st - 1] : null;
        let r, c, sc = 1, alpha = 1, moving = false;
        if (st === 0) {
          if (!a) return;
          const q = U.stagger(p, i, 3, T[0][0], T[0][1], 0.5);
          if (q <= 0) return;
          [r, c] = a; sc = U.pop(q); alpha = clamp(q * 2);
        } else if (a && b) {
          r = lerp(b[0], a[0], u); c = lerp(b[1], a[1], u);
          moving = b[0] !== a[0] || b[1] !== a[1];
        } else if (a) {
          [r, c] = a; sc = U.pop(seg(p, T[st][0], T[st][1])); alpha = clamp(sc * 2); moving = true;
        } else return;
        const newest = st === 0 ? i === 2 : moving;
        const px = gx + c * s + s / 2, py = gy + r * s + s / 2, h = (s - 4) / 2 * sc;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = newest ? rgba(C.amber, 0.2) : rgba(C.ink, 0.07);
        ctx.fillRect(px - h, py - h, 2 * h, 2 * h);
        ctx.strokeStyle = newest ? rgba(C.amber, 1) : rgba(C.ink, 0.95); ctx.lineWidth = 2.5;
        ctx.strokeRect(px - h, py - h, 2 * h, 2 * h);
        ctx.restore();
        if (newest) {
          hot.save(); hot.globalAlpha = alpha * glowLast * (0.6 + 0.3 * k);
          hot.strokeStyle = rgba(C.amber, 0.9); hot.lineWidth = 3; hot.strokeRect(px - h, py - h, 2 * h, 2 * h);
          hot.fillStyle = rgba(C.amber, 0.12); hot.fillRect(px - h, py - h, 2 * h, 2 * h);
          hot.restore();
        }
      });

      // sigma_lambda  <-->  s_lambda
      const ay = gy + 3 * s + 1.0 * s, fz = Math.round(s * 0.82);
      const A = 1.9 * s, arr = seg(p, 0.1, 0.3, ease.out), la = seg(p, 0.14, 0.32, ease.out);
      const half = (A - 0.2 * s) * arr, hd = 0.22 * s;
      ctx.save(); ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = 2.5; ctx.lineJoin = 'miter';
      if (arr > 0.01) {
        ctx.beginPath(); ctx.moveTo(cx - half, ay); ctx.lineTo(cx + half, ay);
        ctx.moveTo(cx - half + hd, ay - hd); ctx.lineTo(cx - half, ay); ctx.lineTo(cx - half + hd, ay + hd);
        ctx.moveTo(cx + half - hd, ay - hd); ctx.lineTo(cx + half, ay); ctx.lineTo(cx + half - hd, ay + hd);
        ctx.stroke();
      }
      ctx.restore();
      // Each change of lambda sends a spark both ways along the arrow and
      // makes both subscripts flash: sigma_lambda and s_lambda move together.
      let flash = 0;
      for (let j = 1; j < T.length; j++) {
        const q = seg(p, T[j][0] + 0.02, T[j][1] + 0.04, ease.out);
        if (q <= 0 || q >= 1) { if (q >= 1) flash = Math.max(flash, 1 - seg(p, T[j][1] + 0.02, T[j][1] + 0.08)); continue; }
        const x = q * half, len = 0.7 * s * (1 - 0.6 * q);
        for (const g of [ctx, hot]) {
          g.save(); g.strokeStyle = rgba(C.amber, g === hot ? 0.8 : 1); g.lineWidth = 3;
          g.beginPath(); g.moveTo(cx - x, ay); g.lineTo(cx - x + len, ay); g.moveTo(cx + x, ay); g.lineTo(cx + x - len, ay); g.stroke();
          g.restore();
        }
      }
      // Symbol with a subscript, set tight (italic KaTeX_Math), anchored left or right.
      const lerpC = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
      const sym = (base, sub, x, y, align, alpha) => {
        const fb = `italic ${fz}px ${F.math}`, fs = `italic ${Math.round(fz * 0.68)}px ${F.math}`;
        ctx.font = fb; const wb = ctx.measureText(base).width;
        ctx.font = fs; const ws = ctx.measureText(sub).width;
        const kern = -0.04 * fz, x0 = align === 'right' ? x - (wb + kern + ws) : x;
        U.text(ctx, base, x0, y, fb, rgba(C.ink, 1), 'left', 'alphabetic', alpha);
        for (const g of (flash > 0.02 ? [ctx, hot] : [ctx])) {
          const col = g === hot ? rgba(C.amber, 0.7 * flash) : rgba(lerpC(C.ink, C.amber, flash), 1);
          U.text(g, sub, x0 + wb + kern, y + fz * 0.2, fs, col, 'left', 'alphabetic', alpha);
        }
      };
      const off = (1 - la) * s * 0.6, ty = ay + fz * 0.22;
      sym('\u03c3', '\u03bb', cx - A - 0.14 * s - off, ty, 'right', la);
      sym('s', '\u03bb', cx + A + 0.14 * s + off, ty, 'left', la);
      ctx.restore(); hot.restore();
    },
  };
})());
