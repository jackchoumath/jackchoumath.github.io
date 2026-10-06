// 1992 — Fulton: Rothe diagrams and the essential set. The matrix Schubert
// variety of w is cut out by the rank conditions rank(top-left i x j) <= r_w(i,j)
// for (i,j) in the essential set alone.
// w = 4 1 6 5 2 3: dots at (i, w(i)); death rays go right and down from each dot;
// the surviving boxes form D(w) = {(i,j) : j < w(i), i < w^{-1}(j)}, here
//   {(1,1),(1,2),(1,3)}, {(3,2),(3,3),(4,2),(4,3)}, {(3,5)}  (|D| = 8 = l(w)),
// with essential set (south-east corners) and ranks r_w(i,j) = #{k <= i : w(k) <= j}:
//   (1,3): 0,  (4,3): 1,  (3,5): 2.
// Everything below is computed from w; afterwards each rank condition is shown
// as the top-left i x j window with its r dots lit.
MOTIF('rothe', (() => {
  const w = [4, 1, 6, 5, 2, 3], n = w.length;
  const winv = []; w.forEach((v, i) => { winv[v] = i + 1; });
  const inD = (i, j) => i >= 1 && j >= 1 && i <= n && j <= n && j < w[i - 1] && i < winv[j];
  const D = [];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) if (inD(i, j)) D.push([i, j]);
  const rank = (i, j) => w.slice(0, i).filter(v => v <= j).length;
  const ESS = D.filter(([i, j]) => !inD(i + 1, j) && !inD(i, j + 1))
    .map(([i, j]) => ({ i, j, r: rank(i, j) }))
    .sort((a, b) => a.r - b.r);

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, ease, seg } = env;
      const s = Math.min(box.w * 0.84 / n, box.h * 0.88 / n);
      const gx = box.x + (box.w - n * s) / 2, gy = box.y + (box.h - n * s) / 2;
      const X = j => gx + (j - 0.5) * s, Y = i => gy + (i - 0.5) * s;   // cell centres
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      // Faint grid.
      const ga = seg(p, 0, 0.08, ease.out);
      ctx.save(); ctx.strokeStyle = rgba(C.faint, 0.95 * ga); ctx.lineWidth = 1.2; ctx.beginPath();
      for (let t = 0; t <= n; t++) {
        ctx.moveTo(gx + t * s, gy); ctx.lineTo(gx + t * s, gy + n * s);
        ctx.moveTo(gx, gy + t * s); ctx.lineTo(gx + n * s, gy + t * s);
      }
      ctx.stroke(); ctx.restore();

      // Death rays: right along the row, down along the column, shot row by row.
      for (let i = 1; i <= n; i++) {
        const q = seg(p, 0.06 + (i - 1) * 0.022, 0.16 + (i - 1) * 0.022, ease.out);
        if (q <= 0) continue;
        const x = X(w[i - 1]), y = Y(i);
        U.drawOn(ctx, x, y, gx + n * s, y, q, rgba(C.cyan, 0.55), 2);
        U.drawOn(ctx, x, y, x, gy + n * s, q, rgba(C.cyan, 0.55), 2);
      }

      // Rank window (after the build): top-left i x j block of an essential box,
      // its dots lit -- there are exactly r of them.
      const win = [[0.44, 0.6], [0.6, 0.76], [0.76, 1.01]];
      let lit = null;
      ESS.forEach((e, m) => {
        const [a, b] = win[m];
        if (p < a || p >= b) return;
        const inq = seg(p, a, a + 0.06, ease.out), outq = m < 2 ? seg(p, b - 0.03, b) : 0;
        lit = { e, a: inq * (1 - outq) };
      });
      if (lit) {
        const { e, a } = lit, W = e.j * s, H = e.i * s;
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = rgba(C.amber, 0.07); ctx.fillRect(gx, gy, W, H);
        ctx.strokeStyle = rgba(C.amber, 0.9); ctx.lineWidth = 2.5; ctx.strokeRect(gx, gy, W * ease.out(a), H * ease.out(a));
        ctx.restore();
        hot.save(); hot.globalAlpha = 0.35 * a; hot.strokeStyle = rgba(C.amber, 0.8); hot.lineWidth = 3;
        hot.strokeRect(gx, gy, W * ease.out(a), H * ease.out(a)); hot.restore();
      }

      // Dots (i, w(i)).
      for (let i = 1; i <= n; i++) {
        const q = seg(p, 0.01 + (i - 1) * 0.02, 0.08 + (i - 1) * 0.02);
        if (q <= 0) continue;
        const r = s * 0.15 * U.pop(q), x = X(w[i - 1]), y = Y(i);
        const inWin = lit && i <= lit.e.i && w[i - 1] <= lit.e.j;
        U.dot(ctx, x, y, r, rgba(C.ink, 1));
        if (inWin) {
          U.ring(ctx, x, y, r * 1.9, rgba(C.amber, lit.a), 2.5);
          U.dot(hot, x, y, r * 1.2, rgba(C.amber, 0.8 * lit.a));
        }
      }

      // D(w): the surviving boxes.
      D.forEach(([i, j], m) => {
        const q = U.stagger(p, m, D.length, 0.18, 0.32, 0.5);
        if (q <= 0) return;
        const sc = U.pop(q), h = (s / 2 - 4) * sc, x = X(j), y = Y(i);
        ctx.save(); ctx.globalAlpha = clamp(q * 2);
        ctx.fillStyle = rgba(C.ink, 0.1); ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
        ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = 2.5; ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
        ctx.restore();
      });

      // Essential set: amber, with the rank numbers r_w(i,j).
      ESS.forEach((e, m) => {
        const q = seg(p, 0.28 + m * 0.03, 0.37 + m * 0.03);
        if (q <= 0) return;
        const sc = U.pop(q), h = (s / 2 - 4) * sc, x = X(e.j), y = Y(e.i);
        const on = lit && lit.e === e ? lit.a : 0;
        const glow = (0.55 + 0.45 * on) * (1 + 0.25 * k);
        ctx.save();
        ctx.fillStyle = rgba(C.amber, 0.22 + 0.12 * on); ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
        ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = 3; ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
        ctx.restore();
        hot.save(); hot.globalAlpha = Math.min(1, glow);
        hot.strokeStyle = rgba(C.amber, 0.9); hot.lineWidth = 3; hot.strokeRect(x - h, y - h, 2 * h, 2 * h);
        hot.fillStyle = rgba(C.amber, 0.15); hot.fillRect(x - h, y - h, 2 * h, 2 * h);
        hot.restore();
        const fz = Math.round(s * 0.52 * sc * (1 + 0.12 * on));
        U.text(ctx, String(e.r), x, y + s * 0.03, `${fz}px ${F.main}`, rgba(C.amberHot, 1), 'center', 'middle', clamp(q * 2));
      });
      ctx.restore(); hot.restore();
    },
  };
})());
