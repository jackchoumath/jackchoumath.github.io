// Vakil (2006): the geometric Littlewood-Richardson rule -- checker games.
// Board convention: rows index the flag M (top = 1), columns the flag F (left = 1),
// a black checker at (i,j) means dim(M_i cap F_j) jumps there.  Black checkers
// start on the antidiagonal (transverse flags) and end on the diagonal (equal
// flags).  Specialization order: the black checker in the top row (the
// DESCENDING checker, amber) moves down one row at a time; the checker in the
// row below (the ascending checker) moves up to take its row.  Red checkers
// record the subspace V; they stay, move or swap as V's two-flag stratum degenerates,
// and at one move the game can BRANCH (the limit has two components).
// Game shown: sigma_1 * sigma_1 in Gr(2,4), red checkers start at (2,4), (4,2).
// All six moves of both branches were derived from the geometry and checked in
// python (each step = the flat limit of the stratum closure: candidate strata of the
// right dimension satisfying all limit rank conditions; the same engine reproduces
// every LR coefficient of Gr(2,4), Gr(2,5), Gr(3,5), Gr(2,6), Gr(3,6)):
//   move 1 (rows 1-2): reds stay
//   move 2 (rows 2-3): the game FORKS:  swap (2,4),(4,2) -> (2,2),(4,4)   |   (2,4) -> (2,3)
//   move 3 (rows 3-4): stay                                             |   (4,2) -> (3,2)
//   move 4 (rows 1-2): (2,2) rises with the ascending checker -> (1,2)   |   stay
//   move 5 (rows 2-3): stay                                             |   swap -> (2,2),(3,3)
//   move 6 (rows 1-2): (1,2) -> (1,1)                                   |   stay
// The black checkers end on the diagonal; the red checkers end on it too, in rows
// {1,4} -> sigma_{(4-2+1-1, 4-2+2-4)} = sigma_2  and  rows {2,3} -> sigma_11, so
//   sigma_1 * sigma_1 = sigma_2 + sigma_11.
// On a 4-beat card: move 1, the fork lands on beat one, moves 3-6 on sixteenths, the
// answer on beat two; a cyan read-out light runs down both diagonals on beat three.
MOTIF('checkers', (() => {
  const n = 4, k = 2;
  // moves: critical row r, descending checker's column D, ascending checker's column A
  const MOVES = [
    { r: 1, D: 4, A: 3 }, { r: 2, D: 4, A: 2 }, { r: 3, D: 4, A: 1 },
    { r: 1, D: 3, A: 2 }, { r: 2, D: 3, A: 1 }, { r: 1, D: 2, A: 1 },
  ];
  // red checker positions after each move (index 0 = start), per branch; red i keeps its identity
  const START = [[2, 4], [4, 2]];
  const REDS = [
    [START, START, [[2, 2], [4, 4]], [[2, 2], [4, 4]], [[1, 2], [4, 4]], [[1, 2], [4, 4]], [[1, 1], [4, 4]]],
    [START, START, [[2, 3], [4, 2]], [[2, 3], [3, 2]], [[2, 3], [3, 2]], [[2, 2], [3, 3]], [[2, 2], [3, 3]]],
  ];
  // Black states: rowOf[col] (a black checker keeps its column).
  const BLACK = [{ 1: 4, 2: 3, 3: 2, 4: 1 }];
  MOVES.forEach(m => {
    const rowOf = { ...BLACK[BLACK.length - 1] };
    if (rowOf[m.D] !== m.r || rowOf[m.A] !== m.r + 1 || m.D <= m.A) throw new Error('checkers: bad black move');
    rowOf[m.D] = m.r + 1; rowOf[m.A] = m.r;
    BLACK.push(rowOf);
  });
  if (Object.keys(BLACK[6]).some(c => BLACK[6][c] !== +c)) throw new Error('checkers: blacks must end on the diagonal');
  // every red checker needs a black checker weakly left in its row and weakly above in its column
  const CLASS = REDS.map(br => {
    br.forEach((reds, s) => reds.forEach(([i, j]) => {
      const left = Object.keys(BLACK[s]).some(c => BLACK[s][c] === i && +c <= j);
      if (!left || BLACK[s][j] > i) throw new Error('checkers: bad red position');
    }));
    const fin = br[6];
    if (fin.some(([i, j]) => i !== j)) throw new Error('checkers: reds must end on the diagonal');
    const rows = fin.map(([i]) => i).sort((a, b) => a - b);
    return rows.map((a, s) => n - k + s + 1 - a).filter(v => v > 0).join('');   // '2' and '11'
  });

  // Timeline (p): move m runs over WIN[m]; the board splits over FORK.
  const WIN = [[0.10, 0.165], [0.19, 0.25], [0.265, 0.315], [0.325, 0.375], [0.385, 0.435], [0.445, 0.5]];
  const FORK = [0.165, 0.25], ANS = 0.5, SCAN = [0.69, 0.86];

  return {
    draw(ctx, hot, p, kick, env, box) {
      const { C, U, rgba, clamp, lerp, ease, seg } = env;
      // Layout: two boards of side B with gap G, the formula under them.
      const B = Math.min(box.w * 0.93 / 2.42, box.h * 0.92 / 1.3);
      const c = B / n, G = 0.3 * B, fz = 0.115 * B;
      const cx = box.x + box.w / 2;
      const top = box.y + (box.h - 1.3 * B) / 2;
      const xL = cx - (B + G) / 2, xR = cx + (B + G) / 2;
      const fq = seg(p, FORK[0], FORK[1], ease.inOut);
      const lw = clamp(B * 0.0045, 1.5, 3);

      // Game state at p: index of the last finished move, progress of the running one.
      let cur = 0, mq = 0;
      for (let m = 0; m < MOVES.length; m++) {
        const q = seg(p, WIN[m][0], WIN[m][1], ease.inOut);
        if (q >= 1) cur = m + 1; else { mq = q; break; }
      }
      const M = MOVES[cur], moving = M && mq > 0;
      const done = cur === MOVES.length;

      function board(g, gh, bx, br, alpha) {
        const x0 = bx - B / 2, y0 = top;
        const ctr = (i, j) => [x0 + (j - 0.5) * c, y0 + (i - 0.5) * c];
        const mix = (a, b) => [lerp(a[0], b[0], moving ? mq : 0), lerp(a[1], b[1], moving ? mq : 0)];
        g.save(); g.globalAlpha *= alpha;
        // squares and frame
        const ba = seg(p, 0, 0.08);
        for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
          if ((i + j) % 2) { g.fillStyle = rgba(C.faint, 0.42 * ba); g.fillRect(x0 + (j - 1) * c, y0 + (i - 1) * c, c, c); }
        }
        const band = moving ? Math.sin(Math.PI * mq) : 0;   // the two critical rows
        if (band > 0) { g.fillStyle = rgba(C.dim, 0.14 * band); g.fillRect(x0, y0 + (M.r - 1) * c, B, 2 * c); }
        g.strokeStyle = rgba(C.ink, 0.9 * ba); g.lineWidth = lw;
        g.strokeRect(x0, y0, B * ease.out(ba), B * ease.out(ba));
        // the diagonal the game ends on: drawn in once all checkers are home
        const da = seg(p, ANS - 0.02, ANS + 0.08);
        if (da > 0) {
          g.save(); g.setLineDash([c * 0.06, c * 0.08]); g.strokeStyle = rgba(C.dim, 0.5 * da); g.lineWidth = lw * 0.6;
          g.beginPath(); g.moveTo(x0 + c * 0.2, y0 + c * 0.2); g.lineTo(x0 + B - c * 0.2, y0 + B - c * 0.2); g.stroke(); g.restore();
        }
        // descending checker's trail (until the game is over)
        const dCol = M ? M.D : MOVES[MOVES.length - 1].D;
        const dRow = M ? lerp(BLACK[cur][dCol], BLACK[cur + 1][dCol], moving ? mq : 0) : BLACK[cur][dCol];
        const ta = 1 - seg(p, ANS - 0.04, ANS + 0.04);
        if (dRow > 1.01 && ta > 0) {
          const [tx, ty0] = ctr(1, dCol), ty1 = ctr(dRow, dCol)[1];
          g.save(); g.setLineDash([c * 0.04, c * 0.06]); g.strokeStyle = rgba(C.amber, 0.45 * ta); g.lineWidth = lw * 0.8;
          g.beginPath(); g.moveTo(tx, ty0); g.lineTo(tx, ty1); g.stroke(); g.restore();
        }
        // read-out light running down the diagonal (beat three)
        const sq = seg(p, SCAN[0], SCAN[1]);
        const scanAt = sq > 0 && sq < 1 ? lerp(0.3, n + 0.7, ease.inOut(sq)) : -9;
        // black checkers
        for (let col = 1; col <= n; col++) {
          const sc = U.pop(U.stagger(p, col - 1, n, 0.02, 0.1, 0.5));
          if (sc <= 0) continue;
          const [x, y] = mix(ctr(BLACK[cur][col], col), ctr(BLACK[Math.min(cur + 1, 6)][col], col));
          const isD = !done && col === dCol, R = c * 0.36 * sc;
          g.fillStyle = rgba(isD ? C.amber : C.ink, isD ? 0.16 : 0.09);
          g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
          U.ring(g, x, y, R, rgba(isD ? C.amber : C.ink, 1), lw * 1.1);
          U.ring(g, x, y, R * 0.72, rgba(isD ? C.amber : C.ink, 0.42), lw * 0.6);
          if (isD) U.ring(gh, x, y, R, rgba(C.amber, (0.55 + 0.25 * kick) * alpha), lw * 1.3);
        }
        // red checkers
        const R0 = REDS[br][cur], R1 = REDS[br][Math.min(cur + 1, 6)];
        R0.forEach((rc, i) => {
          const q = U.stagger(p, i, 2, 0.06, 0.12, 0.6);
          if (q <= 0) return;
          const [x, y] = mix(ctr(...rc), ctr(...R1[i]));
          const jumped = moving && (R1[i][0] !== rc[0] || R1[i][1] !== rc[1]);
          const home = done ? Math.exp(-Math.max(0, p - ANS) * 9) : 0;
          const scan = Math.max(0, 1 - Math.abs(scanAt - rc[0]) / 0.6);
          const R = c * 0.2 * U.pop(q) * (1 + 0.25 * home + 0.18 * scan);
          U.dot(g, x, y, R, rgba(C.red, 1));
          U.dot(gh, x, y, R * 0.9, rgba(C.red, alpha * (jumped ? 0.18 + 0.3 * Math.sin(Math.PI * mq) : 0.16 + 0.3 * home + 0.25 * scan)));
          if (scan > 0.02) U.ring(g, x, y, c * 0.42, rgba(C.cyan, 0.9 * scan), lw);
        });
        if (scanAt > 0) {                                   // the light itself: a small cyan head on the diagonal
          const t = scanAt, a = clamp(Math.min(t - 0.3, n + 0.7 - t) * 2.5);
          const [px, py] = [x0 + (t - 0.5) * c, y0 + (t - 0.5) * c];
          U.dot(g, px, py, Math.max(1.5, c * 0.045), rgba(C.cyan, a));
          U.dot(gh, px, py, Math.max(2, c * 0.07), rgba(C.cyan, 0.5 * a));
        }
        g.restore();
      }

      // Before the fork one board in the centre; then it splits into the two branches.
      // The second branch slides out from UNDER the first: it is clipped to the outside of
      // the first board (no fills needed), and its frame flashes as it emerges.
      const bxL = lerp(cx, xL, fq), bxR = lerp(cx, xR, fq);
      if (fq > 0) {
        for (const g of [ctx, hot]) {
          g.save(); g.beginPath();
          g.rect(box.x - B, box.y - B, box.w + 2 * B, box.h + 2 * B);
          g.rect(bxL - B / 2 - lw, top - lw, B + 2 * lw, B + 2 * lw);
          g.clip('evenodd');
        }
        board(ctx, hot, bxR, 1, 1);
        const sl = Math.sin(Math.PI * fq);
        if (sl > 0.02) { hot.strokeStyle = rgba(C.amber, 0.5 * sl); hot.lineWidth = lw * 1.5; hot.strokeRect(bxR - B / 2, top, B, B); }
        ctx.restore(); hot.restore();
      }
      board(ctx, hot, bxL, 0, 1);

      // Formula: "sigma_1 . sigma_1" under the board; at the answer, "= sigma_2 + sigma_11"
      // with each term centred under its own board.
      const fy = top + B + 0.13 * B + fz * 0.75;
      const la = seg(p, 0.05, 0.14);
      if (la > 0) {
        const LHS = '\\sigma_1\\cdot\\sigma_1', EQ = '\\;=\\;';
        const wL = U.math(ctx, LHS, 0, 0, fz, '#000', 'left', 0), wE = U.math(ctx, EQ, 0, 0, fz, '#000', 'left', 0);
        const terms = CLASS.map(cl => `\\sigma_{${cl}}`);
        const wT = terms.map(t => U.math(ctx, t, 0, 0, fz, '#000', 'left', 0));
        // final x of the left side: it ends where the first term begins
        const lxEnd = xL - wT[0] / 2 - wE, lx = lerp(cx - wL / 2, lxEnd - wL, fq);
        U.math(ctx, LHS, lx, fy, fz, rgba(C.ink, 0.92), 'left', la);
        const ra = seg(p, ANS - 0.02, ANS + 0.05);
        if (ra > 0) {
          U.math(ctx, EQ, lxEnd, fy, fz, rgba(C.ink, 0.92), 'left', ra);
          U.math(ctx, '+', cx, fy, fz, rgba(C.ink, 0.92), 'center', ra);
          const pop = Math.exp(-Math.max(0, p - ANS) * 10);
          [xL, xR].forEach((x, i) => {
            const z = lerp(1.5, 1, ease.out(ra)) * (1 + 0.04 * kick * clamp((p - ANS) * 4));
            for (const [g, a] of [[ctx, 1], [hot, Math.min(0.28, 0.1 + 0.18 * pop)]]) {
              g.save(); g.translate(x, fy - fz * 0.3); g.scale(z, z);
              U.math(g, terms[i], 0, fz * 0.3, fz, rgba(C.amber, a), 'center', ra);
              g.restore();
            }
          });
        }
      }
    },
  };
})());
