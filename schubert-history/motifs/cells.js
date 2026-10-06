// Ehresmann (1934): Schubert cells of Gr(3,7).
// A point of the cell with pivot columns {2,4,7} is the row space of a unique
// 3x7 matrix in reduced row echelon form:
//     0 1 * 0 * * 0
//     0 0 0 1 * * 0
//     0 0 0 0 0 0 1
// (pivots 1, zeros left of each pivot and in the other rows of pivot columns,
// free entries * elsewhere). Deleting the pivot columns leaves the 5 free
// entries right-justified in a 3x4 box: rows 3,2,0, i.e. the partition (3,2),
// and the cell is an affine space of dimension 5.
MOTIF('cells', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
    const N = 7, K = 3, PIV = [2, 4, 7];                  // 1-indexed pivot columns
    // Entry of row r, column c (1-indexed): '1' pivot, '0' zero, '*' free.
    const entry = (r, c) => {
      const pc = PIV[r - 1];
      if (c === pc) return '1';
      if (c < pc || PIV.includes(c)) return '0';
      return '*';
    };
    const isPiv = c => PIV.includes(c);

    // Phases.
    const brk = seg(p, 0.0, 0.16, ease.out);               // brackets draw on
    const col = seg(p, 0.38, 0.56, ease.inOut);            // pivot columns collapse
    const morph = seg(p, 0.55, 0.74, ease.out);            // stars -> boxes
    const lab = seg(p, 0.68, 0.84, ease.out);              // "dim = 5"
    const drift = 1 + 0.035 * ease.soft(clamp((p - 0.3) / 0.7)) + 0.025 * k * morph;

    // Geometry: cell size from the box, everything centred.
    const s = Math.min(box.w / 8.6, box.h / 5.4);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2 - s * 0.35 * lab;
    ctx.save(); hot.save();
    for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

    // Column widths shrink for pivot columns as they collapse.
    const cw = []; let W = 0;
    for (let c = 1; c <= N; c++) { cw[c] = s * (isPiv(c) ? 1 - col : 1); W += cw[c]; }
    const colX = []; let acc = cx - W / 2;
    for (let c = 1; c <= N; c++) { colX[c] = acc + cw[c] / 2; acc += cw[c]; }
    const top = cy - 1.5 * s;
    const rowY = r => top + (r - 0.5) * s;

    // Brackets of the matrix (fade out as it turns into a diagram).
    const ba = brk * (1 - morph);
    if (ba > 0.01) {
      const bx0 = cx - W / 2 - 0.18 * s, bx1 = cx + W / 2 + 0.18 * s;
      const by0 = top - 0.12 * s, by1 = top + 3.12 * s, ser = 0.26 * s;
      ctx.save(); ctx.globalAlpha = ba; ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = 2.5;
      const hgt = (by1 - by0) * brk;
      ctx.beginPath();
      ctx.moveTo(bx0 + ser, by0); ctx.lineTo(bx0, by0); ctx.lineTo(bx0, by0 + hgt); ctx.lineTo(bx0 + ser * brk, by0 + hgt);
      ctx.moveTo(bx1 - ser, by1); ctx.lineTo(bx1, by1); ctx.lineTo(bx1, by1 - hgt); ctx.lineTo(bx1 - ser * brk, by1 - hgt);
      ctx.stroke(); ctx.restore();
    }

    // Faint 3x4 frame (k x (n-k)) the free entries live in, after the collapse.
    if (morph > 0.01) {
      const gx = cx - 2 * s, gy = top;
      ctx.save(); ctx.globalAlpha = morph;
      ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo(gx + i * s, gy); ctx.lineTo(gx + i * s, gy + 3 * s); }
      for (let j = 1; j < 3; j++) { ctx.moveTo(gx, gy + j * s); ctx.lineTo(gx + 4 * s, gy + j * s); }
      ctx.stroke();
      ctx.strokeStyle = rgba(C.dim, 0.9); ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy, 4 * s, 3 * s);
      ctx.restore();
    }

    // Entries, appearing column by column.
    const fs = Math.round(s * 0.56);
    let starIdx = 0;
    for (let c = 1; c <= N; c++) {
      const q = U.stagger(p, c - 1, N, 0.03, 0.34, 0.45);
      if (q <= 0) continue;
      const pop = U.pop(q);
      for (let r = 1; r <= K; r++) {
        const e = entry(r, c), x = colX[c], y = rowY(r);
        if (e === '1' || (e === '0' && isPiv(c))) {
          // Pivot columns squeeze to nothing.
          const sx = (1 - col) * pop, a = clamp(q * 2) * (1 - col);
          if (a < 0.01 || sx < 0.01) continue;
          for (const g of (e === '1' ? [ctx, hot] : [ctx])) {
            g.save(); g.translate(x, y); g.scale(sx, pop);
            const colr = e === '1' ? rgba(C.amber, g === hot ? 0.55 : 1) : rgba(C.dim, 0.7);
            U.text(g, e, 0, fs * 0.36, `${e === '1' ? 'bold ' : ''}${fs}px ${F.main}`, colr, 'center', 'alphabetic', a);
            g.restore();
          }
        } else if (e === '0') {
          const a = clamp(q * 2) * lerp(1, 0.38, morph);
          ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
          U.text(ctx, '0', 0, fs * 0.36, `${fs}px ${F.main}`, rgba(C.dim, 0.7), 'center', 'alphabetic', a);
          ctx.restore();
        } else {
          // Free entry: an asterisk that becomes a box of the Young diagram.
          const i = starIdx++;
          const mq = clamp(morph * 1.6 - i * 0.12);
          const sa = clamp(q * 2) * (1 - mq);
          if (sa > 0.01) {
            ctx.save(); ctx.translate(x, y); ctx.scale(pop * (1 - 0.5 * mq), pop * (1 - 0.5 * mq));
            U.text(ctx, '∗', 0, fs * 0.42, `${Math.round(fs * 1.15)}px ${F.main}`, rgba(C.ink, 1), 'center', 'alphabetic', sa);
            ctx.restore();
          }
          if (mq > 0.01) {
            const bs = U.pop(mq), h = (s - 6) / 2 * bs;
            ctx.save(); ctx.globalAlpha = mq;
            ctx.fillStyle = rgba(C.amber, 0.16); ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
            ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = 2.5; ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
            ctx.restore();
            const wave = 0.5 + 0.5 * Math.sin((p - 0.75) * 14 - i * 1.1);
            hot.save(); hot.globalAlpha = mq * (0.4 + 0.3 * wave * seg(p, 0.74, 0.85) + 0.25 * k);
            hot.strokeStyle = rgba(C.amber, 0.8); hot.lineWidth = 3; hot.strokeRect(x - h, y - h, 2 * h, 2 * h);
            hot.restore();
          }
        }
      }
    }

    // dim = 5  (number of free entries = number of boxes)
    if (lab > 0.01) {
      const ly = top + 3 * s + s * 0.95, lf = Math.round(s * 0.62);
      ctx.save(); ctx.globalAlpha = lab; ctx.translate(0, (1 - lab) * s * 0.3);
      ctx.font = `${lf}px ${F.main}`;
      const a = 'dim = ', wa = ctx.measureText(a).width, wb = ctx.measureText('5').width, x0 = cx - (wa + wb) / 2;
      U.text(ctx, a, x0, ly, `${lf}px ${F.main}`, rgba(C.ink, 0.95));
      U.text(ctx, '5', x0 + wa, ly, `${lf}px ${F.main}`, rgba(C.amber, 1));
      ctx.restore();
    }
    ctx.restore(); hot.restore();
  },
});
