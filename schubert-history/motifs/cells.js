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
// (Checked: free columns per row {3,5,6}, {5,6}, {} -> 3 + 2 + 0 = 5.)
// Beats of the 1.875 s card: the matrix is built by beat one, the pivot columns
// collapse (and the picture zooms in), the stars turn into boxes one by one while
// "dim = n" counts them, the fifth box and the amber 5 landing on beat two; on beat
// three a ripple runs through the five boxes.
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
    const NFREE = 5;

    // Phases.
    const brk = seg(p, 0.0, 0.14, ease.out);               // brackets draw on
    const col = seg(p, 0.27, 0.4, ease.inOut);             // pivot columns collapse
    // Star i becomes a box from LAND(i) - 0.015 (nearly complete at LAND(i)) and is
    // counted at LAND(i); the 5th is counted on beat two (p = 0.5).
    const LAND = i => 0.4 + i * 0.025;
    const mqOf = i => ease.out(clamp((p - (LAND(i) - 0.015)) / 0.035));
    const morph = seg(p, 0.35, 0.5, ease.out);             // matrix -> diagram (brackets fade, frame appears)
    const lab = seg(p, 0.36, 0.46, ease.out);              // "dim = n"
    const landed = Array.from({ length: NFREE }, (_, i) => p >= LAND(i)).filter(Boolean).length;
    const five = p >= LAND(NFREE - 1) ? Math.exp(-(p - LAND(NFREE - 1)) * 10) : 0;
    const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7)) + 0.02 * k * morph;

    // Geometry. Matrix phase: 7 x 3 cells fill the box; diagram phase: the 3 x 4 frame
    // plus the label (to the right in a wide box, underneath otherwise) fill it.
    const side = box.w / box.h > 1.45;
    const lfU = 0.6;                                        // label font, in cells
    ctx.font = `${100}px ${F.main}`;
    const labU = ctx.measureText('dim = 5').width / 100 * lfU;
    const sM = Math.min(box.w * 0.9 / 7.6, box.h * 0.8 / 3.5);
    const sD = side ? Math.min(box.w * 0.9 / (4.4 + 0.55 + labU), box.h * 0.8 / 3.3)
      : Math.min(box.w * 0.9 / 4.5, box.h * 0.82 / 4.4);
    const s = lerp(sM, sD, col);
    const lw = Math.max(1.5, Math.min(3, s * 0.018));
    const bcx = box.x + box.w / 2, bcy = box.y + box.h / 2;
    // the diagram moves aside (or up) to make room for the label
    const cx = bcx - (side ? (0.55 + labU) * s / 2 * lab : 0);
    const cy = bcy - (side ? 0 : 0.62 * s * lab);
    ctx.save(); hot.save();
    for (const g of [ctx, hot]) { g.translate(bcx, bcy); g.scale(drift, drift); g.translate(-bcx, -bcy); }

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
      ctx.save(); ctx.globalAlpha = ba; ctx.strokeStyle = rgba(C.ink, 0.95); ctx.lineWidth = lw * 1.1;
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
      ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = Math.max(1.2, lw * 0.6);
      ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo(gx + i * s, gy); ctx.lineTo(gx + i * s, gy + 3 * s); }
      for (let j = 1; j < 3; j++) { ctx.moveTo(gx, gy + j * s); ctx.lineTo(gx + 4 * s, gy + j * s); }
      ctx.stroke();
      ctx.strokeStyle = rgba(C.dim, 0.9); ctx.lineWidth = lw * 0.8;
      ctx.strokeRect(gx, gy, 4 * s, 3 * s);
      ctx.restore();
    }

    // Entries, appearing column by column.
    const fs = Math.round(s * 0.56);
    let starIdx = 0;
    for (let c = 1; c <= N; c++) {
      const q = U.stagger(p, c - 1, N, 0.02, 0.26, 0.45);
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
            const colr = e === '1' ? rgba(C.amber, g === hot ? 0.45 : 1) : rgba(C.dim, 0.7);
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
          const mq = mqOf(i);
          const sa = clamp(q * 2) * (1 - mq);
          if (sa > 0.01) {
            ctx.save(); ctx.translate(x, y); ctx.scale(pop * (1 - 0.5 * mq), pop * (1 - 0.5 * mq));
            U.text(ctx, '∗', 0, fs * 0.42, `${Math.round(fs * 1.15)}px ${F.main}`, rgba(C.ink, 1), 'center', 'alphabetic', sa);
            ctx.restore();
          }
          if (mq > 0.01) {
            // ripple on beat three (0.75), one box after another
            const rip = Math.max(0, 1 - Math.abs(p - (0.75 + i * 0.03)) / 0.05);
            const bs = U.pop(mq) * (1 + 0.06 * rip), h = (s - 3 * lw) / 2 * bs;
            ctx.save(); ctx.globalAlpha = mq;
            ctx.fillStyle = rgba(C.amber, 0.16 + 0.14 * rip); ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
            ctx.strokeStyle = rgba(C.amber, 1); ctx.lineWidth = lw * 1.1; ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
            ctx.restore();
            const land = p >= LAND(i) ? Math.exp(-(p - LAND(i)) * 14) : 0;
            hot.save(); hot.globalAlpha = mq * Math.min(1, 0.4 + 0.25 * k + 0.4 * rip + 0.4 * land);
            hot.strokeStyle = rgba(C.amber, 0.8); hot.lineWidth = lw * 1.3; hot.strokeRect(x - h, y - h, 2 * h, 2 * h);
            hot.restore();
          }
        }
      }
    }

    // dim = n  (counts the boxes as they land; 5 = number of free entries, in amber)
    if (lab > 0.01) {
      const lf = Math.round(s * lfU);
      const font = `${lf}px ${F.main}`;
      ctx.font = font;
      const a = 'dim = ', wa = ctx.measureText(a).width, wb = ctx.measureText('5').width;
      let x0, ly;
      if (side) { x0 = cx + 2 * s + 0.55 * s; ly = cy + lf * 0.32; }
      else { x0 = cx - (wa + wb) / 2; ly = top + 3 * s + s * 0.95; }
      ctx.save(); ctx.globalAlpha = lab;
      if (side) ctx.translate((1 - lab) * s * 0.4, 0); else ctx.translate(0, (1 - lab) * s * 0.3);
      U.text(ctx, a, x0, ly, font, rgba(C.ink, 0.95));
      if (landed > 0) {
        const done = landed === NFREE, nx = x0 + wa + wb / 2, ny = ly - lf * 0.35, z = 1 + 0.25 * five + 0.04 * k * (done ? 1 : 0);
        for (const g of (done ? [ctx, hot] : [ctx])) {
          g.save(); g.translate(nx, ny); g.scale(z, z);
          U.text(g, String(landed), 0, lf * 0.35, font, done ? rgba(C.amber, g === hot ? 0.3 + 0.3 * five : 1) : rgba(C.ink, 0.95), 'center');
          g.restore();
        }
      }
      ctx.restore();
    }
    ctx.restore(); hot.restore();
  },
});
