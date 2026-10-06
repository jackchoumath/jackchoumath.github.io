// Quantum Schubert calculus (Bertram 1997; Fomin-Gelfand-Postnikov 1997).
// In QH*(Gr(2,4)):  sigma_1 * sigma_22 = q sigma_1.
// Rim-hook algorithm (Bertram-Ciocan-Fontanine-Fulton), checked in python:
//   s_1 * s_22 = s_32 + s_221, and s_221 = 0 in 2 variables, so we get s_32;
//   (3,2) sticks out of the 2x2 box, so remove an n = 4 rim hook:
//   (3,2)/(1) = {(0,1),(0,2),(1,0),(1,1)} is connected with no 2x2 square, it
//   spans 2 rows, sign (-1)^(k - rows) = +1, one q per hook  ->  + q sigma_1.
// (Same answer from Bertram's quantum Pieri: lambda_1 = n-k, drop a 3-ribbon.)
// Story on a 4-beat card: lambda = (2,2) fills the dashed k x (n-k) frame; Pieri's new
// box lands OUTSIDE it on beat one; a violet snake traces the rim hook, numbering its
// n = 4 cells; the hook is torn off in one piece (the diagram slides over to make room)
// and q stamps on, on beat two, as the formula completes. Then it stays alive: q breathes on the kicks, and on beat three
// a violet light runs along the ghost of the removed hook.
MOTIF('quantum', (() => {
  const LAM = [[0, 0], [0, 1], [1, 0], [1, 1]];          // (2,2)
  const NEW = [0, 2];                                     // the box outside the frame
  const HOOK = [[1, 0], [1, 1], [0, 1], [0, 2]];          // rim hook of (3,2), along the rim
  const NHOOK = HOOK.length;                              // = n = 4

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, lerp, ease, seg } = env;
      // Layout (units of the cell size s): q (1.15 wide) + diagram (3 wide incl. the new
      // box), the formula under it. The group is centred on the box.
      const s = Math.min(box.w * 0.84 / 4.35, box.h * 0.84 / 3.2);
      const fz = s * 0.34;                                  // formula size
      const groupW = 4.35 * s, groupH = 2 * s + 0.62 * s + fz;
      const left = box.x + (box.w - groupW) / 2, top = box.y + (box.h - groupH) / 2;
      // Until q arrives the diagram alone is centred; as the hook tears off it slides right
      // to make room for q (which lands at its final place, left of the surviving cell).
      const room = seg(p, 0.37, 0.47, ease.inOut);
      const gxF = left + 1.3 * s, gx = gxF - 0.625 * s * (1 - room), gy = top;   // top-left of the diagram
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const at = (r, c) => [gx + c * s + s / 2, gy + r * s + s / 2];
      const lw = clamp(s * 0.016, 1.5, 3), ins = Math.max(2, s * 0.035);

      // Timeline (beats of a 4-beat card at p = .25, .5, .75).
      const qNew = seg(p, 0.12, 0.25);                      // new box arrives, lands on beat one
      const qRed = seg(p, 0.27, 0.4);                       // ribbon turns violet, snake traced
      const qOff = seg(p, 0.4, 0.5, ease.inOut);            // ribbon torn off (rigid motion)
      const qFade = seg(p, 0.43, 0.5);                      // ... and fades as it leaves
      const qQ = seg(p, 0.44, 0.5);                         // q slams on, lands on beat two
      const live = clamp((p - 0.5) / 0.5);                  // afterglow

      // Slow push-in so the frame never freezes.
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.25) / 0.75));
      for (const g of [ctx, hot]) { g.save(); g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      const square = (g, x, y, w, fill, stroke, lwd) => {
        const h = w / 2 - ins;
        if (h <= 0) return;
        if (fill) { g.fillStyle = fill; g.fillRect(x - h, y - h, 2 * h, 2 * h); }
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lwd; g.strokeRect(x - h, y - h, 2 * h, 2 * h); }
      };

      // --- the k x (n-k) = 2 x 2 frame (dashed, marching) -------------------------
      const fa = seg(p, 0, 0.08);
      if (fa > 0) {
        ctx.save();
        ctx.setLineDash([s * 0.09, s * 0.065]); ctx.lineDashOffset = -p * s * 0.9;
        ctx.strokeStyle = rgba(C.dim, 0.85 * fa); ctx.lineWidth = lw * 0.8;
        const m = 0.06 * s;
        ctx.strokeRect(gx - m, gy - m, 2 * s + 2 * m, 2 * s + 2 * m);
        ctx.restore();
      }

      // --- ghost of the removed ribbon (stays after it is torn off) --------------
      // On beat three a violet light runs along it, cell by cell, in rim order.
      if (qOff > 0) {
        const echo = seg(p, 0.7, 0.86);
        ctx.save(); ctx.setLineDash([s * 0.05, s * 0.05]); ctx.lineWidth = lw * 0.7;
        HOOK.forEach(([r, c], i) => {
          const [x, y] = at(r, c);
          const e = echo > 0 && echo < 1 ? Math.max(0, 1 - Math.abs(echo * (NHOOK + 1) - (i + 0.5)) / 1.1) : 0;
          ctx.strokeStyle = rgba(C.violet, (0.55 + 0.4 * e) * clamp(qOff * 2));
          const h = s / 2 - ins * 2.4;
          ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
          if (e > 0.02) {
            hot.save(); hot.strokeStyle = rgba(C.violet, 0.5 * e); hot.lineWidth = lw; hot.setLineDash([]);
            hot.strokeRect(x - h, y - h, 2 * h, 2 * h); hot.restore();
          }
        });
        ctx.restore();
      }

      // --- the surviving cell (0,0): never part of the hook -----------------------
      {
        const q = U.stagger(p, 0, 4, 0, 0.1, 0.5);
        if (q > 0) {
          const [x, y] = at(0, 0), lit = clamp((qOff - 0.6) / 0.4);
          square(ctx, x, y, s * U.pop(q), rgba(C.ink, (0.1 + 0.06 * lit) * clamp(q * 2)), rgba(C.ink, 0.95 * clamp(q * 2)), lerp(lw, lw * 1.25, lit));
        }
      }

      // --- the other cells: lambda's three + the new box, then the rigid ribbon ---
      const oa = 1 - qFade;                                 // ribbon opacity while torn off
      if (oa > 0.01) {
        const [rx, ry] = at(0.5, 1.2);                      // ribbon centroid (pivot)
        const tx = qOff * s * 0.55, ty = -qOff * s * 0.5, sc = 1 + 0.12 * qOff, rot = 0.22 * qOff;
        for (const g of [ctx, hot]) { g.save(); g.translate(rx + tx, ry + ty); g.rotate(rot); g.scale(sc, sc); g.translate(-rx, -ry); }
        HOOK.forEach(([r, c], i) => {
          const isNew = r === NEW[0] && c === NEW[1];
          const qIn = isNew ? qNew : U.stagger(p, LAM.findIndex(([a, b]) => a === r && b === c), 4, 0, 0.1, 0.5);
          if (qIn <= 0) return;
          let [x, y] = at(r, c);
          if (isNew) x += (1 - ease.out(qNew)) * s * 0.9;   // slides in from the right
          const w = s * U.pop(qIn), a = clamp(qIn * 2) * oa;
          // cell i turns violet as the snake reaches it (the last one exactly at qRed = 1)
          const red = clamp((qRed * (NHOOK - 0.6) - i) / 0.4);
          if (red < 1) {
            const base = isNew ? C.amber : C.ink;
            square(ctx, x, y, w, rgba(base, (isNew ? 0.2 : 0.1) * a * (1 - red)), rgba(base, 0.95 * a * (1 - red)), isNew ? lw * 1.2 : lw);
            if (isNew) {
              const land = Math.exp(-Math.max(0, p - 0.25) * 14);   // flash on landing
              square(hot, x, y, w, null, rgba(C.amber, (0.35 + 0.4 * land) * a * (1 - red)), lw * 1.3);
            }
          }
          if (red > 0) {
            square(ctx, x, y, w, rgba(C.violet, 0.22 * a * red), rgba(C.violet, a * red), lw * 1.1);
            square(hot, x, y, w, null, rgba(C.violet, 0.55 * a * red), lw * 1.1);
            // cell number 1..n along the rim
            U.text(ctx, String(i + 1), x + s * 0.3, y - s * 0.24, `${Math.round(s * 0.2)}px ${env.F.main}`, rgba(C.ink, 0.9 * a * red), 'center', 'middle');
          }
        });
        // the snake through the ribbon's cells, traced along the rim
        if (qRed > 0) {
          const pts = HOOK.map(([r, c]) => at(r, c)), tq = qRed * (pts.length - 1);
          for (const [g, col, al, w] of [[hot, C.violet, 0.8, lw * 2], [ctx, C.ink, 1, lw * 1.1]]) {
            g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
            g.strokeStyle = rgba(col, al * oa); g.lineWidth = w; g.beginPath();
            pts.forEach(([x, y], j) => {
              if (j === 0) g.moveTo(x, y);
              else if (j <= tq) g.lineTo(x, y);
              else if (j - 1 < tq) g.lineTo(lerp(pts[j - 1][0], x, tq - j + 1), lerp(pts[j - 1][1], y, tq - j + 1));
            });
            g.stroke(); g.restore();
          }
          U.dot(ctx, pts[0][0], pts[0][1], lw * 1.8, rgba(C.ink, oa * clamp(qRed * 4)));
        }
        ctx.restore(); hot.restore();
      }

      // --- the big q stamps on, left of the surviving cell -------------------------
      const qx = gxF - 0.68 * s, qy = gy + 0.5 * s, qfs = s * 0.95;
      if (qQ > 0) {
        const sc = lerp(1.9, 1, ease.out(qQ)) * (1 + 0.05 * k * live) * (1 + 0.02 * Math.sin(live * Math.PI * 4));
        const al = clamp(qQ * 2.5);
        for (const [g, a] of [[ctx, 1], [hot, Math.min(0.25, 0.12 + 0.08 * k * live + 0.13 * (1 - live))]]) {
          g.save(); g.translate(qx, qy); g.scale(sc, sc);
          U.math(g, 'q', 0, qfs * 0.22, qfs, rgba(C.amber, a), 'center', al);
          g.restore();
        }
        const ring = clamp((p - 0.5) / 0.12);                // shock ring as it lands
        if (p >= 0.5 && ring < 1) U.ring(hot, qx, qy, s * (0.4 + 0.45 * ease.out(ring)), rgba(C.amberHot, 0.6 * (1 - ring)), lw);
      }

      // --- the formula: the left side first, "= q sigma_1" lands with the stamp -----
      const fy = gy + 2 * s + 0.62 * s + fz * 0.7;
      const la = seg(p, 0.04, 0.14);
      if (la > 0) {
        const LHS = '\\sigma_1\\,\\star\\,\\sigma_{22}\\;=\\;', Q = 'q', RHS = '\\,\\sigma_1';
        const wL = U.math(ctx, LHS, 0, 0, fz, '#000', 'left', 0), wQ = U.math(ctx, Q, 0, 0, fz, '#000', 'left', 0);
        const wR = U.math(ctx, RHS, 0, 0, fz, '#000', 'left', 0);
        const fx = cx - (wL + wQ + wR) / 2;
        U.math(ctx, LHS, fx, fy, fz, rgba(C.ink, 0.92), 'left', la);
        // The identity holds in this space only (e.g. in QH*(Gr(2,5)) the product has no q term).
        U.text(ctx, 'in QH*(Gr(2,4))', cx, fy + fz * 0.95, `${Math.round(fz * 0.5)}px ${env.F.main}`, rgba(C.dim, 0.9), 'center', 'alphabetic', la);
        const ra = seg(p, 0.47, 0.53);
        if (ra > 0) {
          U.math(ctx, Q, fx + wL, fy, fz, rgba(C.amber, 1), 'left', ra);
          U.math(ctx, RHS, fx + wL + wQ, fy, fz, rgba(C.ink, 0.92), 'left', ra);
        } else {
          U.math(ctx, '?', fx + wL, fy, fz, rgba(C.dim, 0.7), 'left', la * clamp((p - 0.12) / 0.06));
        }
      }
      ctx.restore(); hot.restore();
    },
  };
})());
