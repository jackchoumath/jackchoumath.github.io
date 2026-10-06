// Quantum Schubert calculus (Bertram 1997; Fomin-Gelfand-Postnikov 1997).
// In QH*(Gr(2,4)):  sigma_1 * sigma_22 = q sigma_1.
// Rim-hook algorithm (Bertram-Ciocan-Fontanine-Fulton), checked in python:
//   s_1 * s_22 = s_32 + s_221, and s_221 = 0 in 2 variables, so we get s_32;
//   (3,2) sticks out of the 2x2 box, so remove an n = 4 rim hook:
//   (3,2)/(1) = {(0,1),(0,2),(1,0),(1,1)} is connected with no 2x2 square, it
//   spans 2 rows, sign (-1)^(k - rows) = +1, one q per hook  ->  + q sigma_1.
// (Same answer from Bertram's quantum Pieri: lambda_1 = n-k, drop a 3-ribbon.)
// Story: lambda = (2,2) fills the dashed 2x2 box, Pieri's new box lands OUTSIDE
// it (amber), the 4-cell ribbon flashes violet and is torn off in one piece,
// leaving (1), and a big amber q stamps on (on the second beat of a 2-beat slot).
MOTIF('quantum', (() => {
  const LAM = [[0, 0], [0, 1], [1, 0], [1, 1]];          // (2,2)
  const NEW = [0, 2];                                     // the box outside the frame
  const HOOK = [[1, 0], [1, 1], [0, 1], [0, 2]];          // rim hook of (3,2), along the rim
  const inHook = (r, c) => HOOK.some(([a, b]) => a === r && b === c);

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, lerp, ease, seg } = env;
      const s = Math.min(box.w / 5.4, box.h / 3.7);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const gx = cx - 0.8 * s, gy = cy - 1.42 * s;          // top-left of the diagram
      const at = (r, c) => [gx + c * s + s / 2, gy + r * s + s / 2];

      // Timeline.
      const qNew = seg(p, 0.11, 0.21);                      // new box arrives
      const qRed = seg(p, 0.23, 0.3);                       // ribbon turns violet, snake traced
      const qOff = seg(p, 0.32, 0.45, ease.out);            // ribbon yanked off (rigid motion)
      const qFade = seg(p, 0.35, 0.45);                     // ... and fades once it is clear
      const qQ = seg(p, 0.42, 0.52);                        // q stamps on
      const live = clamp((p - 0.52) / 0.48);                // afterglow

      // Slow drift so the frame never freezes.
      const drift = 1 + 0.035 * ease.soft(clamp((p - 0.3) / 0.7));
      for (const g of [ctx, hot]) { g.save(); g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      const square = (g, x, y, w, fill, stroke, lw) => {
        if (fill) { g.fillStyle = fill; g.fillRect(x - w / 2 + 1.5, y - w / 2 + 1.5, w - 3, w - 3); }
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(x - w / 2 + 1.5, y - w / 2 + 1.5, w - 3, w - 3); }
      };

      // --- the k x (n-k) = 2 x 2 frame (dashed, marching) -------------------------
      const fa = seg(p, 0, 0.1);
      ctx.save();
      ctx.setLineDash([s * 0.1, s * 0.07]); ctx.lineDashOffset = -p * s * 0.6;
      ctx.strokeStyle = rgba(C.dim, 0.85 * fa); ctx.lineWidth = 2;
      const m = 0.07 * s;
      ctx.strokeRect(gx - m, gy - m, 2 * s + 2 * m, 2 * s + 2 * m);
      ctx.restore();

      // --- ghost of the removed ribbon (stays after it is torn off) --------------
      if (qOff > 0) {
        ctx.save(); ctx.setLineDash([s * 0.06, s * 0.06]);
        ctx.strokeStyle = rgba(C.violet, 0.6 * clamp(qOff * 2) * (1 - 0.4 * live)); ctx.lineWidth = 1.5;
        HOOK.forEach(([r, c]) => { const [x, y] = at(r, c); ctx.strokeRect(x - s / 2 + 6, y - s / 2 + 6, s - 12, s - 12); });
        ctx.restore();
      }

      // --- the surviving cell (0,0): never part of the hook -----------------------
      {
        const q = U.stagger(p, 0, 4, 0, 0.1, 0.5);
        if (q > 0) {
          const [x, y] = at(0, 0), lit = clamp((qOff - 0.6) / 0.4);
          square(ctx, x, y, s * U.pop(q), rgba(C.ink, 0.12 * clamp(q * 2)), rgba(C.ink, 0.95 * clamp(q * 2)), lerp(2.4, 3, lit));
        }
      }

      // --- the other cells: lambda's three + the new box, then the rigid ribbon ---
      const oa = 1 - qFade;                                 // ribbon opacity while torn off
      if (oa > 0.01) {
        const [rx, ry] = at(0.5, 1.2);                      // ribbon centroid (pivot)
        const tx = qOff * s * 0.75, ty = -qOff * s * 0.85, sc = 1 - 0.45 * qOff, rot = 0.35 * qOff;
        for (const g of [ctx, hot]) { g.save(); g.translate(rx + tx, ry + ty); g.rotate(rot); g.scale(sc, sc); g.translate(-rx, -ry); }
        HOOK.forEach(([r, c]) => {
          const isNew = r === NEW[0] && c === NEW[1];
          const qIn = isNew ? qNew : U.stagger(p, LAM.findIndex(([a, b]) => a === r && b === c), 4, 0, 0.1, 0.5);
          if (qIn <= 0) return;
          let [x, y] = at(r, c);
          if (isNew) x += (1 - ease.out(qNew)) * s * 1.2;   // slides in from the right
          const w = s * U.pop(qIn), a = clamp(qIn * 2) * oa, red = qRed;
          if (red < 1) {
            const base = isNew ? C.amber : C.ink;
            square(ctx, x, y, w, rgba(base, (isNew ? 0.35 : 0.12) * a * (1 - red)), rgba(base, 0.95 * a * (1 - red)), 2.4);
            if (isNew) square(hot, x, y, w, rgba(C.amber, 0.4 * a * (1 - red)), rgba(C.amber, 0.7 * a * (1 - red)), 2.4);
          }
          if (red > 0) {
            square(ctx, x, y, w, rgba(C.violet, 0.3 * a * red), rgba(C.violet, a * red), 2.6);
            square(hot, x, y, w, rgba(C.violet, 0.22 * a * red), rgba(C.violet, 0.7 * a * red), 2.6);
          }
        });
        // the snake through the ribbon's cells, traced along the rim
        if (qRed > 0) {
          const pts = HOOK.map(([r, c]) => at(r, c)), tq = qRed * (pts.length - 1);
          for (const [g, col, al, lw] of [[hot, C.violet, 0.9, 5], [ctx, C.ink, 1, 3]]) {
            g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
            g.strokeStyle = rgba(col, al * oa); g.lineWidth = lw; g.beginPath();
            pts.forEach(([x, y], j) => {
              if (j === 0) g.moveTo(x, y);
              else if (j <= tq) g.lineTo(x, y);
              else if (j - 1 < tq) g.lineTo(lerp(pts[j - 1][0], x, tq - j + 1), lerp(pts[j - 1][1], y, tq - j + 1));
            });
            g.stroke(); g.restore();
          }
          U.dot(ctx, pts[0][0], pts[0][1], 5, rgba(C.ink, oa * clamp(qRed * 4)));
        }
        ctx.restore(); hot.restore();
      }

      // --- the big q stamps on ---------------------------------------------------
      if (qQ > 0) {
        const sc = lerp(2.0, 1, ease.back(qQ)) * (1 + 0.04 * k) * (1 + 0.025 * Math.sin(live * 9));
        const qx = gx - 0.62 * s, qy = gy + 0.78 * s, fs = s * 1.25;
        for (const [g, al] of [[ctx, 1], [hot, 0.75 + 0.15 * k]]) {
          g.save(); g.translate(qx, qy); g.scale(sc, sc);
          U.math(g, 'q', 0, 0, fs, rgba(C.amber, al), 'center', clamp(qQ * 2.5));
          g.restore();
        }
        const ring = clamp(qQ * 1.3);                        // stamp shock ring
        if (ring < 1) U.ring(hot, qx, qy - fs * 0.2, s * (0.35 + 0.5 * ease.out(ring)), rgba(C.amberHot, 0.7 * (1 - ring)), 2);
      }

      // --- label ------------------------------------------------------------------
      const la = seg(p, 0.04, 0.14);
      U.math(ctx, '\\sigma_1\\,\\star\\,\\sigma_{22}\\;=\\;q\\,\\sigma_1', cx, gy + 2 * s + s * 0.78, s * 0.36, rgba(C.ink, 0.92), 'center', la);
      ctx.restore(); hot.restore();
    },
  };
})());
