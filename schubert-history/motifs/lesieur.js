// Lesieur (1947): H*(Gr(k,n)) is a quotient of the ring of symmetric functions,
// the Schubert class sigma_lambda corresponding to the Schur function s_lambda.
// A Young diagram lambda (inside the faint k x (n-k) = 3 x 4 box) morphs through
// a few shapes -- (2,1) -> (3,1) -> (2,2) -> (2,2,1) -> (3,2,1), one box added or
// slid at a time, on beats one, two, the "and" of two, and beat three -- above
//   sigma_lambda <-> s_lambda,
// whose two subscripts are the same diagram in miniature, morphing in step with
// the big one (each change sends a spark both ways along the arrow).
// (Checked: every shape fits the 3 x 4 box, i.e. has <= 3 rows and <= 4 columns.)
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
  // Stage j is reached over [T[j][0], T[j][1]] of p (landing on the beat grid of the
  // 1.875 s card: 0.25, 0.5, 0.625, 0.75).
  const T = [[0.03, 0.16], [0.17, 0.25], [0.42, 0.5], [0.56, 0.625], [0.685, 0.75]];

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      // Layout, in cells s: the 3 x 4 frame, then the relation underneath.
      const fzU = 0.86, A_U = 1.55, hU = 3 + 0.6 + fzU * 1.15;
      const s = Math.min(box.w * 0.9 / 6.6, box.h * 0.88 / hU);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      const lw = Math.max(1.4, Math.min(3, s * 0.02));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }
      // 3 x 4 frame, top-left; nudged right since lambda (<= 3 columns) sits in its left part
      const gx = cx - 2 * s + 0.3 * s, gy = cy - hU * s / 2;

      // Faint k x (n-k) frame.
      const fa = seg(p, 0, 0.14, ease.out);
      ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = Math.max(1.2, lw * 0.6);
      ctx.setLineDash([s * 0.035, s * 0.045]);
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) { ctx.moveTo(gx + i * s, gy); ctx.lineTo(gx + i * s, gy + 3 * s); }
      for (let j = 0; j <= 3; j++) { ctx.moveTo(gx, gy + j * s); ctx.lineTo(gx + 4 * s, gy + j * s); }
      ctx.stroke(); ctx.restore();

      // Current stage and in-stage progress.
      let st = 0;
      for (let j = 1; j < T.length; j++) if (p >= T[j][0]) st = j;
      const u = st === 0 ? 1 : seg(p, T[st][0], T[st][1], ease.inOut);
      const glowLast = 1 - seg(p, T[st][1], T[st][1] + 0.1) * 0.5;

      // Token states (shared by the big diagram and the two miniatures).
      const toks = [];
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
        toks.push({ r, c, sc, alpha, newest: st === 0 ? i === 2 : moving });
      });
      // Draw the shape with cell size cs and top-left (ox, oy).
      const shape = (ox, oy, cs, big, fade = 1) => {
        const lwi = big ? lw * 1.05 : Math.max(1, cs * 0.06);
        toks.forEach(({ r, c, sc, alpha, newest }) => {
          const px = ox + c * cs + cs / 2, py = oy + r * cs + cs / 2, h = (cs - (big ? 2 * lw : lwi * 1.4)) / 2 * sc;
          ctx.save(); ctx.globalAlpha = alpha * fade;
          ctx.fillStyle = newest ? rgba(C.amber, big ? 0.2 : 0.55) : rgba(C.ink, big ? 0.07 : 0.22);
          ctx.fillRect(px - h, py - h, 2 * h, 2 * h);
          ctx.strokeStyle = newest ? rgba(C.amber, 1) : rgba(C.ink, 0.95); ctx.lineWidth = lwi;
          ctx.strokeRect(px - h, py - h, 2 * h, 2 * h);
          ctx.restore();
          if (newest) {
            hot.save(); hot.globalAlpha = fade * alpha * glowLast * (big ? 0.6 + 0.3 * k : 0.45);
            hot.strokeStyle = rgba(C.amber, 0.9); hot.lineWidth = lwi * 1.2; hot.strokeRect(px - h, py - h, 2 * h, 2 * h);
            hot.fillStyle = rgba(C.amber, 0.12); hot.fillRect(px - h, py - h, 2 * h, 2 * h);
            hot.restore();
          }
        });
      };
      shape(gx, gy, s, true);

      // sigma_lambda  <-->  s_lambda
      const fz = s * fzU, ay = gy + 3 * s + 0.6 * s + fz * 0.42;  // arrow height (math axis)
      const A = A_U * s, arr = seg(p, 0.08, 0.26, ease.out), la = seg(p, 0.1, 0.28, ease.out);
      const half = (A - 0.2 * s) * arr, hd = 0.2 * s;
      ctx.save(); ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = lw; ctx.lineJoin = 'miter';
      if (arr > 0.01) {
        ctx.beginPath(); ctx.moveTo(cx - half, ay); ctx.lineTo(cx + half, ay);
        ctx.moveTo(cx - half + hd, ay - hd); ctx.lineTo(cx - half, ay); ctx.lineTo(cx - half + hd, ay + hd);
        ctx.moveTo(cx + half - hd, ay - hd); ctx.lineTo(cx + half, ay); ctx.lineTo(cx + half - hd, ay + hd);
        ctx.stroke();
      }
      ctx.restore();
      // Each change of lambda sends a spark both ways along the arrow.
      for (let j = 1; j < T.length; j++) {
        const q = seg(p, T[j][0] + 0.01, T[j][1] + 0.03, ease.out);
        if (q <= 0 || q >= 1) continue;
        const x = q * half, len = 0.6 * s * (1 - 0.6 * q);
        for (const g of [ctx, hot]) {
          g.save(); g.strokeStyle = rgba(C.amber, g === hot ? 0.8 : 1); g.lineWidth = lw * 1.2;
          g.beginPath(); g.moveTo(cx - x, ay); g.lineTo(cx - x + len, ay); g.moveTo(cx + x, ay); g.lineTo(cx + x - len, ay); g.stroke();
          g.restore();
        }
      }
      // The two symbols; the subscript is the diagram itself, in miniature (a lambda
      // when the box is too small for a legible miniature).
      const m = fz * 0.2, MW = 3 * m, base = ay + fz * 0.28;
      const fb = `italic ${fz}px ${F.math}`;
      const sym = (glyph, x, align) => {
        ctx.font = fb; const wb = ctx.measureText(glyph).width;
        const tot = wb + 0.06 * fz + MW, x0 = align === 'right' ? x - tot : x;
        U.text(ctx, glyph, x0, base, fb, rgba(C.ink, 1), 'left', 'alphabetic', la);
        const sx = x0 + wb + 0.06 * fz, sy = base - fz * 0.16;
        if (m >= 4) shape(sx, sy, m, false, la);
        else U.text(ctx, 'λ', sx, base + fz * 0.2, `italic ${Math.round(fz * 0.68)}px ${F.math}`, rgba(C.ink, 1), 'left', 'alphabetic', la);
      };
      const off = (1 - la) * s * 0.5;
      sym('σ', cx - A - 0.16 * s - off, 'right');
      sym('s', cx + A + 0.16 * s + off, 'left');
      ctx.restore(); hot.restore();
    },
  };
})());
