// Vakil (2006): the geometric Littlewood-Richardson rule -- checker games.
// Board convention: rows index the flag M (top = 1), columns the flag F (left = 1),
// a black checker at (i,j) means dim(M_i cap F_j) jumps there.  Black checkers
// start on the antidiagonal (transverse flags) and end on the diagonal (equal
// flags).  Specialization order: the black checker in the top row (the
// DESCENDING checker, amber) moves down one row at a time; the checker in the
// row below (the ascending checker) moves up to take its row.  Red checkers
// record the subspace V; they stay, or swap, as V's two-flag stratum degenerates.
// Game shown: sigma_1 * sigma_1 in Gr(2,4), red checkers start at (2,4), (4,2).
// Moves 1-4 of the branch that ends at sigma_2 (the other branch, at move 2,
// gives sigma_11).  Every move below was derived from the geometry and checked in
// python: each step is the flat limit of the stratum closure (candidate strata
// of the right dimension satisfying all limit rank conditions), and the full
// games built from these steps reproduce every LR coefficient of Gr(2,4),
// Gr(2,5), Gr(3,5), Gr(2,6), Gr(3,6).
//   move 1 (rows 1-2): reds stay          move 2 (rows 2-3): reds SWAP (2,4),(4,2) -> (2,2),(4,4)
//   move 3 (rows 3-4): reds stay          move 4 (rows 1-2): red (2,2) rises with the ascending checker -> (1,2)
MOTIF('checkers', (() => {
  const n = 4;
  // moves: critical row r, descending checker's column D, ascending checker's column A, red moves
  const MOVES = [
    { r: 1, D: 4, A: 3, red: {} },
    { r: 2, D: 4, A: 2, red: { 0: [2, 2], 1: [4, 4] } },
    { r: 3, D: 4, A: 1, red: {} },
    { r: 1, D: 3, A: 2, red: { 0: [1, 2] } },
  ];
  // States: rowOf[col] for black checkers (a black checker keeps its column), reds [row, col].
  const STATES = [{ rowOf: { 1: 4, 2: 3, 3: 2, 4: 1 }, reds: [[2, 4], [4, 2]] }];
  MOVES.forEach(m => {
    const prev = STATES[STATES.length - 1], rowOf = { ...prev.rowOf };
    if (rowOf[m.D] !== m.r || rowOf[m.A] !== m.r + 1 || m.D <= m.A) throw new Error('checkers: bad black move');
    rowOf[m.D] = m.r + 1; rowOf[m.A] = m.r;
    const reds = prev.reds.map((rc, i) => m.red[i] || rc);
    // every red checker needs a black checker weakly left in its row and weakly above in its column
    reds.forEach(([i, j]) => {
      const left = Object.keys(rowOf).some(c => rowOf[c] === i && +c <= j);
      if (!left || rowOf[j] > i) throw new Error('checkers: bad red position');
    });
    STATES.push({ rowOf, reds });
  });

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, lerp, ease, seg } = env;
      const B = Math.min(box.w * 0.8, box.h * 0.78), c = B / n;
      const cx = box.x + box.w / 2, x0 = cx - B / 2, y0 = box.y + (box.h - B) * 0.32;
      const ctr = (i, j) => [x0 + (j - 0.5) * c, y0 + (i - 0.5) * c];

      // Timeline: board 0-0.1, checkers pop 0.04-0.16, move m runs over [T0+m*DT, T0+m*DT+MV].
      const T0 = 0.18, DT = 0.17, MV = 0.12;
      let cur = 0, mq = 0;                                   // state index, progress of the next move
      for (let m = 0; m < MOVES.length; m++) {
        const q = seg(p, T0 + m * DT, T0 + m * DT + MV, ease.inOut);
        if (q >= 1) cur = m + 1; else { mq = q; break; }
      }
      const S = STATES[cur], N = STATES[Math.min(cur + 1, STATES.length - 1)], M = MOVES[cur];
      const moving = M && mq > 0;
      const pos = (a, b) => [lerp(a[0], b[0], moving ? mq : 0), lerp(a[1], b[1], moving ? mq : 0)];

      // --- board ---------------------------------------------------------------------
      const ba = seg(p, 0, 0.1);
      for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
        if ((i + j) % 2) { ctx.fillStyle = rgba(C.faint, 0.45 * ba); ctx.fillRect(x0 + (j - 1) * c, y0 + (i - 1) * c, c, c); }
      }
      // critical rows r, r+1 light up while their checkers trade places
      const band = M ? (moving ? Math.sin(Math.PI * mq) : 0) : 0;
      if (band > 0) { ctx.fillStyle = rgba(C.dim, 0.16 * band); ctx.fillRect(x0, y0 + (M.r - 1) * c, B, 2 * c); }
      ctx.strokeStyle = rgba(C.ink, 0.9 * ba); ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, B * ease.out(ba), B * ease.out(ba));

      // --- descending checker's trail -----------------------------------------------
      const dCol = M ? M.D : MOVES[MOVES.length - 1].D;
      const dRow = M ? lerp(S.rowOf[dCol], N.rowOf[dCol], moving ? mq : 0) : S.rowOf[dCol];
      if (dRow > 1.01) {
        const [tx, ty0] = ctr(1, dCol), ty1 = ctr(dRow, dCol)[1];
        ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = rgba(C.amber, 0.45); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx, ty0); ctx.lineTo(tx, ty1); ctx.stroke(); ctx.restore();
      }

      // --- black checkers (ivory rings; the descending one amber + glow) --------------
      const pop = col => U.pop(U.stagger(p, col - 1, n, 0.04, 0.16, 0.5));
      for (let col = 1; col <= n; col++) {
        const sc = pop(col);
        if (sc <= 0) continue;
        const [x, y] = pos(ctr(S.rowOf[col], col), ctr(N.rowOf[col], col));
        const isD = col === dCol, R = c * 0.36 * sc;
        ctx.fillStyle = rgba(isD ? C.amber : C.ink, isD ? 0.16 : 0.1);
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        U.ring(ctx, x, y, R, rgba(isD ? C.amber : C.ink, 1), 2.6);
        U.ring(ctx, x, y, R * 0.72, rgba(isD ? C.amber : C.ink, 0.45), 1.5);
        if (isD) U.ring(hot, x, y, R, rgba(C.amber, 0.7 + 0.25 * k), 3);
      }

      // --- red checkers -----------------------------------------------------------------
      S.reds.forEach((rc, i) => {
        const q = U.stagger(p, i, 2, 0.1, 0.18, 0.6);
        if (q <= 0) return;
        const [x, y] = pos(ctr(...rc), ctr(...N.reds[i]));
        const R = c * 0.2 * U.pop(q), jumped = moving && (N.reds[i][0] !== rc[0] || N.reds[i][1] !== rc[1]);
        U.dot(ctx, x, y, R, rgba(C.red, 1));
        U.dot(hot, x, y, R, rgba(C.red, jumped ? 0.4 + 0.4 * Math.sin(Math.PI * mq) : 0.4));
      });

      // --- label --------------------------------------------------------------------------
      U.math(ctx, '\\sigma_1\\cdot\\sigma_1', cx, y0 + B + c * 0.62, c * 0.36, rgba(C.ink, 0.9), 'center', seg(p, 0.06, 0.16));
    },
  };
})());
