// HERO motif 'puzzle': Knutson-Tao puzzles compute Littlewood-Richardson numbers.
// (A. Knutson, T. Tao, "Puzzles and (equivariant) cohomology of Grassmannians",
//  Duke Math. J. 119 (2003); Knutson-Tao-Woodward, J. AMS 17 (2004).)
//
// Convention, checked in Python by enumerating every puzzle and comparing with
// LR coefficients computed two independent ways (LR tableaux, and products of
// Schur polynomials): every boundary triple in Gr(1,3), Gr(2,4), Gr(2,5),
// Gr(3,5), Gr(2,6), Gr(3,6), Gr(4,6), Gr(3,7) (42 875 triples), plus all
// degree-matching triples of Gr(4,8), where c = 3 also occurs. Re-checked for the
// 75-second cut with an independent edge-label enumerator (labels 0, 1, 10; the
// triangle 0, 1, 10 read clockwise; 199 triples up to n = 5 agree with LR tableaux,
// the mirror convention fails): for the boundary below it finds exactly two puzzles,
// and they are PZ_A and PZ_B.
//  * Upward triangle of side n, cut into n^2 unit triangles. Pieces: the
//    0-triangle and the 1-triangle (both orientations), and the 60-degree
//    rhombus with opposite edges equal, which may be rotated but not reflected.
//    Upright (acute corners top and bottom), its "/" edges are 0 and its "\"
//    edges are 1. Rotated: horizontal + "/" rhombus: horizontal 0, "/" 1;
//    horizontal + "\" rhombus: horizontal 1, "\" 0. In the equivalent triangle
//    form, the pieces are 000, 111 and the triangle reading 0, 1, 10 clockwise.
//    Two of those triangles glue along their 10 edge to make the rhombus.
//  * A 0/1 string with k ones names the partition with one part per 1, equal
//    to the number of 0s to its left (101010 = (2,1), 010101 = (3,2,1)).
//  * c_{lambda mu}^{nu} = #puzzles with lambda on the NW side (read from the
//    bottom-left corner up to the apex), mu on the NE side (apex down to the
//    bottom-right corner), nu along the bottom (left to right). All three are
//    read left to right. The mirror-image rhombus goes with the mirror string
//    convention (0s to the right); reflecting the triangle swaps the two.
// Shown: Gr(3,6), lambda = mu = (2,1), nu = (3,2,1), c = 2. This is the
// smallest LR coefficient greater than 1. Both puzzles below are the complete
// list. Each has 9 rhombi, 9 0-triangles and 9 1-triangles.
// Piece codes: U/D + label + i + j is the up/down unit triangle at lattice (i,j).
// R + A/B/H + i + j is the rhombus glued along edge A(i,j) "/", B(i,j) "\" or
// H(i,j) "_". Lattice point (i,j) sits at i*e1 + j*e2 with e1 = (1,0) and
// e2 = (1/2, sqrt3/2). The corners are (0,0), (n,0) and the apex (0,n).
//
// Hero card, 8 beats (beat j at p = j/8): the light-triangle of the interstitial
// splits into two outlines and the boundary strings draw on both; puzzle A crashes in
// (pieces fly in from outside, outer ring first) and is complete on beat 3; the count
// line appears ("c = #PUZZLES >= 1"); puzzle B is dealt in as a wave across its
// triangle and is complete on beat 5, where the count slams to "= 2". Beats 6 and 7:
// light sweeps across A, then B (one, two), while the 2 pulses on the kicks.
(function () {
  const N = 6, SQ = Math.sqrt(3) / 2;
  const NW = '101010', NE = '101010', SO = '010101';
  const PZ_A = 'U110 U020 D030 U040 U001 D001 D111 U121 D121 U141 U112 D112 U122 U032 U003 D013 U104 U014 RA13 RA30 RA50 RB00 RB02 RB31 RH05 RH11 RH23'.split(' ');
  const PZ_B = 'U110 D110 U130 U040 U001 D011 U021 D021 D131 U141 U102 U012 D012 U022 D103 U123 U104 U014 RA11 RA32 RA50 RB00 RB13 RB20 RH03 RH05 RH31'.split(' ');

  // ---------------------------------------------------------------- geometry
  const L = (i, j) => [i + j / 2, j * SQ];               // lattice -> unit coords (y up)
  const dirOf = (a, b) => (b[1] === a[1] ? 'H' : b[0] === a[0] ? 'A' : 'B');
  const RLAB = { B: { H: 0, A: 1 }, A: { H: 1, B: 0 }, H: { A: 0, B: 1 } };
  function parse(code) {
    let lat, labs, kind;
    if (code[0] === 'R') {
      const g = code[1], i = +code[2], j = +code[3];
      lat = g === 'B' ? [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
        : g === 'A' ? [[i, j], [i + 1, j], [i, j + 1], [i - 1, j + 1]]
          : [[i + 1, j - 1], [i + 1, j], [i, j + 1], [i, j]];
      labs = lat.map((a, m) => RLAB[g][dirOf(a, lat[(m + 1) % 4])]);
      kind = 'R';
    } else {
      const l = +code[1], i = +code[2], j = +code[3];
      lat = code[0] === 'U' ? [[i, j], [i + 1, j], [i, j + 1]] : [[i + 1, j], [i, j + 1], [i + 1, j + 1]];
      labs = [l, l, l];
      kind = String(l);
    }
    const pts = lat.map(([i, j]) => L(i, j));
    const c = [0, 1].map(d => pts.reduce((s, q) => s + q[d], 0) / pts.length);
    const inr = kind === 'R' ? SQ / 2 : SQ / 3;
    let diag = null;
    if (kind === 'R') {
      const d02 = Math.hypot(pts[0][0] - pts[2][0], pts[0][1] - pts[2][1]);
      diag = d02 > 1.5 ? [pts[0], pts[2]] : [pts[1], pts[3]];
    }
    return { code, kind, pts, labs, c, inr, diag };
  }
  const A = PZ_A.map(parse), B = PZ_B.map(parse);
  const CEN = [N / 2, N * SQ / 3];                       // triangle centroid (unit coords)

  // Distance from point P along unit direction d (unit coords) to the triangle boundary.
  function exitDist(P, d) {
    const j = P[1] / SQ, i = P[0] - j / 2, dj = d[1] / SQ, di = d[0] - dj / 2;
    let t = 1e9;
    if (di < -1e-9) t = Math.min(t, -i / di);
    if (dj < -1e-9) t = Math.min(t, -j / dj);
    if (di + dj > 1e-9) t = Math.min(t, (N - i - j) / (di + dj));
    return t;
  }

  // Puzzle A assembles outside -> in (a closing iris), deterministic jitter.
  const r0 = R.rng(1729);
  A.forEach(pc => {
    const dx = pc.c[0] - CEN[0], dy = pc.c[1] - CEN[1], d = Math.hypot(dx, dy);
    const ang = d > 0.05 ? Math.atan2(dy, dx) : r0() * 6.283;
    pc.dir = [Math.cos(ang), Math.sin(ang)];
    pc.key = -d + 0.55 * r0();
    pc.spin = (r0() < 0.5 ? -1 : 1) * (0.7 + 0.9 * r0());
    pc.extra = 0.55 + 0.6 * r0();
  });
  A.map((pc, m) => m).sort((a, b) => A[a].key - A[b].key).forEach((m, r) => { A[m].rank = r; });
  // Puzzle B is dealt as a wave from its left corner to its right side.
  const r1 = R.rng(31);
  B.forEach(pc => { pc.key = pc.c[0] + 0.35 * pc.c[1] + 0.5 * r1(); });
  B.map((pc, m) => m).sort((a, b) => B[a].key - B[b].key).forEach((m, r) => { B[m].rank = r; });

  // Boundary edges, in reading order on each side.
  const BND = [];
  for (let m = 0; m < N; m++) {
    BND.push({ a: L(0, m), b: L(0, m + 1), l: +NW[m], side: 0, m });            // NW, up
    BND.push({ a: L(m, N - m), b: L(m + 1, N - m - 1), l: +NE[m], side: 1, m }); // NE, down
    BND.push({ a: L(m, 0), b: L(m + 1, 0), l: +SO[m], side: 2, m });            // S, right
  }
  const NRM = [[-SQ, 0.5], [SQ, 0.5], [0, -1]];          // outward normals (unit coords, y up)

  // Timeline (p over the 8-beat hero; beat j at p = j / 8).
  const T0 = 0.03, FLY = 0.075, T1 = 0.375 - FLY;        // A: last piece lands on beat 3
  const DEAL = 0.06, D0 = 0.405, D1 = 0.625 - DEAL;      // B: last piece lands on beat 5
  const DONE_A = 0.375, DONE_B = 0.625;

  MOTIF('puzzle', {
    pieces: { A, B, BND, N },        // exposed for the consistency check
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease } = env;
      // ---- layout: two triangles side by side (gap GAP units), the count line under them
      const GAP = 1.05, SIDE = 0.5, TOPU = 0.3, DIG = 0.66, CNT = 1.15;
      let s = Math.min(box.w / (2 * N + GAP + 2 * SIDE), box.h / (N * SQ + TOPU + DIG + CNT));
      const withCount = s >= 40;
      if (!withCount) s = Math.min(box.w / (2 * N + GAP + 2 * SIDE), box.h / (N * SQ + TOPU + DIG));
      const H = (N * SQ + TOPU + DIG + (withCount ? CNT : 0)) * s;
      const cx = box.x + box.w / 2, top = box.y + (box.h - H) / 2;
      const yBase = top + (TOPU + N * SQ) * s;
      const xA = cx - (2 * N + GAP) * s / 2, xB = xA + (N + GAP) * s;
      const lw = Math.max(1.5, Math.min(3, s * 0.028));
      const inset = s * 0.036;
      const ink = C.ink, amb = C.amber, cyan = C.cyan;
      const labCol = (l, a = 1) => rgba(l ? amb : ink, a);
      const showDigits = s >= 26;

      // One puzzle frame: unit coords -> screen, with the beat punch about its centroid.
      const frame = x0 => {
        const P = q => [x0 + q[0] * s, yBase - q[1] * s];
        return { x0, P, tc: P(CEN) };
      };
      const FA = frame(xA), FB = frame(xB);
      const zoom = 1 + 0.012 * k * clamp((p - DONE_A) * 8) + 0.015 * ease.soft(clamp((p - 0.5) / 0.5));
      const group = (g, fr) => { g.translate(fr.tc[0], fr.tc[1]); g.scale(zoom, zoom); g.translate(-fr.tc[0], -fr.tc[1]); };

      // ------------------------------------------------------------ pieces
      function localPts(pc) {
        const f = Math.max(0, (pc.inr * s - inset) / (pc.inr * s));
        return pc.pts.map(q => [(q[0] - pc.c[0]) * s * f, -(q[1] - pc.c[1]) * s * f]);
      }
      function withPiece(g, fr, pc, st, fn) {
        const c = fr.P(pc.c);
        g.save();
        g.translate(c[0] + (st.dx || 0), c[1] + (st.dy || 0));
        if (st.rot) g.rotate(st.rot);
        g.scale(st.sx ?? st.sc ?? 1, st.sy ?? st.sc ?? 1);
        g.globalAlpha *= st.a ?? 1;
        fn(localPts(pc));
        g.restore();
      }
      function polyPath(g, q) { g.beginPath(); q.forEach((v, m) => (m ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); g.closePath(); }
      function drawPiece(g, fr, pc, st) {
        withPiece(g, fr, pc, st, q => {
          polyPath(g, q);
          if (pc.kind === 'R') {
            const d0 = [(pc.diag[0][0] - pc.c[0]) * s, -(pc.diag[0][1] - pc.c[1]) * s];
            const gr = g.createLinearGradient(d0[0], d0[1], -d0[0], -d0[1]);
            gr.addColorStop(0, rgba(cyan, 0.55)); gr.addColorStop(0.5, rgba(cyan, 0.24)); gr.addColorStop(1, rgba(amb, 0.36));
            g.fillStyle = gr;
          } else g.fillStyle = pc.kind === '1' ? rgba(amb, 0.26) : rgba(ink, 0.075);
          g.fill();
          g.lineWidth = lw; g.lineJoin = 'miter'; g.lineCap = 'butt';
          if (pc.kind !== 'R') { g.strokeStyle = labCol(+pc.kind, 0.95); g.stroke(); }
          else {
            g.strokeStyle = labCol(0, 0.95); g.stroke();
            g.strokeStyle = labCol(1, 1);
            q.forEach((v, m) => {
              if (!pc.labs[m]) return;
              const w = q[(m + 1) % q.length];
              g.beginPath(); g.moveTo(v[0], v[1]); g.lineTo(w[0], w[1]); g.stroke();
            });
          }
        });
      }
      function flashPiece(g, fr, pc, st, a) {
        if (a <= 0.003) return;
        withPiece(g, fr, pc, st, q => {
          polyPath(g, q);
          const col = pc.kind === 'R' ? cyan : pc.kind === '1' ? C.amberHot : ink;
          g.fillStyle = rgba(col, 0.5 * a); g.fill();
          g.strokeStyle = rgba(col, a); g.lineWidth = lw; g.stroke();
        });
      }

      // Puzzle A: flight of piece pc (null before it starts).
      function flight(pc) {
        const st0 = T0 + (T1 - T0) * pc.rank / (A.length - 1);
        const q = clamp((p - st0) / FLY);
        if (q <= 0) return null;
        const e = ease.out(q);
        const dist = (exitDist(pc.c, pc.dir) + pc.extra) * s;
        let dx = pc.dir[0] * dist, dy = -pc.dir[1] * dist;
        const c = FA.P(pc.c), m = s * 0.3;                // keep the start point inside the box
        dx = clamp(c[0] + dx, box.x + m, box.x + box.w - m) - c[0];
        dy = clamp(c[1] + dy, box.y + m, box.y + box.h - m) - c[1];
        return { q, dx: dx * (1 - e), dy: dy * (1 - e), rot: pc.spin * (1 - e), sc: lerp(0.45, 1, ease.back(q)), a: clamp(q * 5), st0 };
      }
      // Puzzle B: dealt in (drops a little, flips open horizontally).
      function deal(pc) {
        const st0 = D0 + (D1 - D0) * pc.rank / (B.length - 1);
        const q = clamp((p - st0) / DEAL);
        if (q <= 0) return null;
        return { q, dy: -(1 - ease.out(q)) * s * 0.7, sx: ease.back(q), sy: lerp(1.25, 1, ease.out(q)), a: clamp(q * 4) };
      }

      // ------------------------------------------------------------ opening: the light-triangle splits in two
      {
        const q = clamp(p / 0.08);
        if (q < 1) {
          [FA, FB].forEach(fr => {
            const e = ease.out(q);
            const ox = lerp(cx, fr.tc[0], e), oy = lerp(box.y + box.h / 2, fr.tc[1], e), sc = lerp(0.75, 1.04, e);
            const tri = [L(0, 0), L(N, 0), L(0, N)].map(v => [ox + (v[0] - CEN[0]) * s * sc, oy - (v[1] - CEN[1]) * s * sc]);
            hot.strokeStyle = rgba(C.amberHot, 0.9 * (1 - q) ** 1.5); hot.lineWidth = Math.min(3, lw * 1.4);
            hot.lineJoin = 'miter'; polyPath(hot, tri); hot.stroke();
            ctx.strokeStyle = rgba(ink, 0.8 * (1 - q)); ctx.lineWidth = lw * 0.7; polyPath(ctx, tri); ctx.stroke();
          });
        }
      }

      // ------------------------------------------------------------ both puzzles
      [[FA, 0], [FB, 1]].forEach(([fr, which]) => {
        ctx.save(); group(ctx, fr); hot.save(); group(hot, fr);
        // boundary strings (identical on both puzzles: the same lambda, mu, nu)
        const fo = s * 0.075;
        BND.forEach(e => {
          const t0 = 0.012 + e.m * 0.008 + e.side * 0.003 + which * 0.01;
          const q = clamp((p - t0) / 0.05);
          if (q <= 0) return;
          const nn = NRM[e.side];
          const a = fr.P([e.a[0] + nn[0] * fo / s, e.a[1] + nn[1] * fo / s]), b = fr.P([e.b[0] + nn[0] * fo / s, e.b[1] + nn[1] * fo / s]);
          const pa = [lerp(a[0], b[0], 0.07), lerp(a[1], b[1], 0.07)], pb = [lerp(a[0], b[0], 0.93), lerp(a[1], b[1], 0.93)];
          ctx.lineCap = 'butt';
          U.drawOn(ctx, pa[0], pa[1], pb[0], pb[1], ease.out(q), labCol(e.l, 1), Math.min(3, lw * 1.2));
          if (showDigits) {
            const mid = [(e.a[0] + e.b[0]) / 2 + nn[0] * 0.33, (e.a[1] + e.b[1]) / 2 + nn[1] * 0.33];
            const mp = fr.P(mid), sc = U.pop(clamp((p - t0 - 0.01) / 0.06));
            if (sc > 0.01) {
              ctx.save(); ctx.translate(mp[0], mp[1]); ctx.scale(sc, sc);
              U.text(ctx, String(e.l), 0, 0, `700 ${Math.round(s * 0.27)}px ${F.main}`, labCol(e.l, 1), 'center', 'middle');
              ctx.restore();
            }
          }
          const fl = 1 - clamp((p - t0) / 0.09);
          if (fl > 0) { hot.lineCap = 'butt'; U.drawOn(hot, pa[0], pa[1], pb[0], pb[1], ease.out(q), rgba(e.l ? C.amberHot : ink, 0.75 * fl), Math.min(3, lw * 1.6)); }
        });
        // side names
        const nameA = clamp((p - 0.06) / 0.08);
        if (nameA > 0 && showDigits) {
          const fnt = `italic ${Math.round(s * 0.36)}px ${F.math}`;
          const nl = fr.P([N / 4 + NRM[0][0] * 0.8, N * SQ / 2 + NRM[0][1] * 0.8]);
          const nr = fr.P([3 * N / 4 + NRM[1][0] * 0.8, N * SQ / 2 + NRM[1][1] * 0.8]);
          U.text(ctx, 'λ', nl[0], nl[1], fnt, rgba(C.dim, 1), 'center', 'middle', nameA);
          U.text(ctx, 'μ', nr[0], nr[1], fnt, rgba(C.dim, 1), 'center', 'middle', nameA);
          const nb = fr.P([-0.3, -0.35]);
          U.text(ctx, 'ν', nb[0], nb[1], fnt, rgba(C.dim, 1), 'center', 'middle', nameA);
        }

        if (which === 0) {
          // speed trails, then the pieces
          A.forEach(pc => {
            const f = flight(pc);
            if (!f || f.q >= 1) return;
            [0.07, 0.14].forEach((lag, gi) => {
              const qq = clamp((p - lag * FLY * 2.2 - f.st0) / FLY);
              if (qq <= 0) return;
              const e = ease.out(qq), e1 = ease.out(f.q);
              const k1 = (1 - e) / Math.max(1e-6, 1 - e1);
              withPiece(hot, fr, pc, { dx: f.dx * k1, dy: f.dy * k1, rot: pc.spin * (1 - e), sc: lerp(0.45, 1, ease.back(qq)), a: (gi ? 0.1 : 0.2) * (1 - f.q) }, q => {
                polyPath(hot, q); hot.fillStyle = rgba(pc.kind === 'R' ? cyan : pc.kind === '1' ? amb : ink, 1); hot.fill();
              });
            });
          });
          A.forEach(pc => {
            const f = flight(pc);
            if (!f) return;
            drawPiece(ctx, fr, pc, f);
            if (f.q < 1) flashPiece(hot, fr, pc, f, clamp((f.q - 0.35) / 0.25) * (1 - f.q) / 0.65 * 1.1);
          });
        } else {
          B.forEach(pc => {
            const f = deal(pc);
            if (!f) return;
            drawPiece(ctx, fr, pc, f);
            if (f.q < 1) flashPiece(hot, fr, pc, f, Math.sin(Math.PI * f.q) * 0.75);
          });
        }
        const pcs = which ? B : A, done = which ? DONE_B : DONE_A;
        // completion burst on the whole board
        const burst = clamp(1 - Math.abs(p - done - 0.01) / 0.03);
        if (burst > 0) pcs.forEach(pc => flashPiece(hot, fr, pc, {}, 0.32 * burst));
        // glow sweeps: right after completion, and again on beat 6 (A) / beat 7 (B)
        const sweep = (p0, p1, dir, strength, bandW) => {
          const q = clamp((p - p0) / (p1 - p0));
          if (q <= 0 || q >= 1) return;
          const corners = [L(0, 0), L(N, 0), L(0, N)].map(fr.P);
          const pr = corners.map(v => v[0] * dir[0] + v[1] * dir[1]);
          const lo = Math.min(...pr) - bandW, hi = Math.max(...pr) + bandW;
          const c = lerp(lo, hi, ease.inOut(q));
          const ax = dir[0] * (c - bandW), ay = dir[1] * (c - bandW), bx = dir[0] * (c + bandW), by = dir[1] * (c + bandW);
          const mk = (col, a) => {
            const gr = hot.createLinearGradient(ax, ay, bx, by);
            gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
            return gr;
          };
          const fillG = mk(C.amberHot, 0.14 * strength), lineG = mk(C.amberHot, 0.9 * strength);
          pcs.forEach(pc => {
            const f = Math.max(0, (pc.inr * s - inset) / (pc.inr * s)), c0 = fr.P(pc.c);
            polyPath(hot, pc.pts.map(q => [c0[0] + (q[0] - pc.c[0]) * s * f, c0[1] - (q[1] - pc.c[1]) * s * f]));
            hot.fillStyle = fillG; hot.fill();
            hot.strokeStyle = lineG; hot.lineWidth = Math.min(3, lw * 1.1); hot.stroke();
          });
        };
        const dn = Math.hypot(1, 0.55);
        sweep(done + 0.005, done + 0.12, [1 / dn, -0.55 / dn], 1, s * 1.1);
        sweep(0.75 + which * 0.125 - 0.01, 0.75 + which * 0.125 + 0.1, [-1 / dn, -0.55 / dn], 0.7, s * 1.3);
        ctx.restore(); hot.restore();
      });

      // ------------------------------------------------------------ the count, centred under the two puzzles
      if (!withCount) return;
      const la = ease.out(clamp((p - DONE_A + 0.01) / 0.06));
      if (la <= 0) return;
      const fz = s * 0.56, ly = yBase + DIG * s + CNT * s * 0.62;
      const two = p >= DONE_B;
      const LHS = 'c_{λμ}^{ν}', EQ = '\\;=\\;';
      const wL = U.math(ctx, LHS, 0, 0, fz, '#000', 'left', 0), wE = U.math(ctx, EQ, 0, 0, fz, '#000', 'left', 0);
      const wordFont = `800 ${Math.round(fz * 0.8)}px ${F.display}`;
      ctx.font = wordFont; const wW = ctx.measureText('#PUZZLES').width;
      const nfz = fz * 1.3;
      ctx.font = `${Math.round(nfz)}px ${F.main}`; const wN = ctx.measureText('2').width;
      const rel = two ? '=' : '≥';
      const total = wL + wE + wW + wE + wN;
      let x = cx - total / 2;
      ctx.save(); ctx.globalAlpha *= la; ctx.translate(0, (1 - la) * s * 0.25);
      U.math(ctx, LHS, x, ly, fz, rgba(ink, 1), 'left'); x += wL;
      U.math(ctx, EQ, x, ly, fz, rgba(ink, 0.9), 'left'); x += wE;
      U.text(ctx, '#PUZZLES', x, ly, wordFont, rgba(ink, 0.9), 'left'); x += wW;
      U.math(ctx, `\\;${rel}\\;`, x, ly, fz, rgba(ink, 0.9), 'left'); x += wE;
      ctx.restore();
      // the number: "1" (ink) after puzzle A, slams to an amber "2" when puzzle B is complete
      const q2 = two ? clamp((p - DONE_B) / 0.05) : 0;
      const pop = two ? Math.exp(-(p - DONE_B) * 10) : Math.exp(-Math.max(0, p - DONE_A) * 10);
      const z = (two ? lerp(1.7, 1, ease.out(q2)) : 1 + 0.25 * pop) * (1 + 0.05 * k * (two ? 1 : 0));
      const nx = x + wN / 2, ny = ly - nfz * 0.34;
      for (const [g, a] of two ? [[ctx, 1], [hot, Math.min(0.25, 0.1 + 0.15 * pop + 0.06 * k)]] : [[ctx, 1]]) {
        g.save(); g.translate(nx, ny); g.scale(z, z);
        U.text(g, two ? '2' : '1', 0, nfz * 0.34, `${Math.round(nfz)}px ${F.main}`, rgba(two ? amb : ink, g === hot ? a : la), 'center');
        g.restore();
      }
    },
  });
})();
