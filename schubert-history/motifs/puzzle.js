// HERO motif 'puzzle': Knutson-Tao puzzles compute Littlewood-Richardson numbers.
// (A. Knutson, T. Tao, "Puzzles and (equivariant) cohomology of Grassmannians",
//  Duke Math. J. 119 (2003); Knutson-Tao-Woodward, J. AMS 17 (2004).)
//
// Convention, checked in Python by enumerating every puzzle and comparing with
// LR coefficients computed two independent ways (LR tableaux, and products of
// Schur polynomials): every boundary triple in Gr(1,3), Gr(2,4), Gr(2,5),
// Gr(3,5), Gr(2,6), Gr(3,6), Gr(4,6), Gr(3,7) (42 875 triples), plus all
// degree-matching triples of Gr(4,8), where c = 3 also occurs.
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
  const inB = new Set(PZ_B), inA = new Set(PZ_A);
  A.forEach(pc => { pc.common = inB.has(pc.code); });
  B.forEach(pc => { pc.common = inA.has(pc.code); });
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

  // Assembly order: outside -> in (a closing iris), deterministic jitter.
  const r0 = R.rng(1729);
  A.forEach((pc, m) => {
    const dx = pc.c[0] - CEN[0], dy = pc.c[1] - CEN[1], d = Math.hypot(dx, dy);
    const ang = d > 0.05 ? Math.atan2(dy, dx) : r0() * 6.283;
    pc.dir = [Math.cos(ang), Math.sin(ang)];
    pc.key = -d + 0.55 * r0();
    pc.spin = (r0() < 0.5 ? -1 : 1) * (0.7 + 0.9 * r0());
    pc.extra = 0.55 + 0.6 * r0();
  });
  const order = A.map((pc, m) => m).sort((a, b) => A[a].key - A[b].key);
  order.forEach((m, r) => { A[m].rank = r; });
  // Morph order (A-only pieces out, B-only pieces in): a cascade from the apex down.
  const morphKey = pc => -pc.c[1] + 0.35 * pc.c[0];
  const aOnly = A.filter(pc => !pc.common).sort((a, b) => morphKey(a) - morphKey(b));
  const bOnly = B.filter(pc => !pc.common).sort((a, b) => morphKey(a) - morphKey(b));
  aOnly.forEach((pc, r) => { pc.mrank = r; });
  bOnly.forEach((pc, r) => { pc.mrank = r; });
  const NM = aOnly.length;

  // Boundary edges, in reading order on each side.
  const BND = [];
  for (let m = 0; m < N; m++) {
    BND.push({ a: L(0, m), b: L(0, m + 1), l: +NW[m], side: 0, m });            // NW, up
    BND.push({ a: L(m, N - m), b: L(m + 1, N - m - 1), l: +NE[m], side: 1, m }); // NE, down
    BND.push({ a: L(m, 0), b: L(m + 1, 0), l: +SO[m], side: 2, m });            // S, right
  }
  const NRM = [[-SQ, 0.5], [SQ, 0.5], [0, -1]];          // outward normals (unit coords, y up)

  MOTIF('puzzle', {
    pieces: { A, B, BND, N },        // exposed for the consistency check
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease } = env;
      const side = Math.min(box.h * 0.85 / SQ, box.w * 0.94);
      const s = side / N;
      const cx = box.x + box.w / 2, cyMid = box.y + box.h / 2;
      const x0 = cx - side / 2, y0 = cyMid + side * SQ / 2 - side * 0.018;
      const X = u => x0 + u * s, Y = v => y0 - v * s;
      const P = q => [X(q[0]), Y(q[1])];
      const lw = Math.max(2, Math.min(3, s * 0.028));
      const inset = s * 0.036;
      const ink = C.ink, amb = C.amber, cyan = C.cyan;
      const labCol = (l, a = 1) => rgba(l ? amb : ink, a);
      const tc = P(CEN);

      // Whole-puzzle transform: beat punch + slow drift so it never freezes.
      const zoom = 1 + 0.018 * k + 0.02 * ease.soft(clamp((p - 0.45) / 0.55));
      const group = g => { g.translate(tc[0], tc[1]); g.scale(zoom, zoom); g.translate(-tc[0], -tc[1]); };

      // ------------------------------------------------------------ pieces
      // Local piece path around its own centroid (screen units), inset for the mosaic gap.
      function localPts(pc) {
        const f = Math.max(0, (pc.inr * s - inset) / (pc.inr * s));
        return pc.pts.map(q => [(q[0] - pc.c[0]) * s * f, -(q[1] - pc.c[1]) * s * f]);
      }
      function withPiece(g, pc, st, fn) {
        const c = P(pc.c);
        g.save();
        g.translate(c[0] + (st.dx || 0), c[1] + (st.dy || 0));
        if (st.rot) g.rotate(st.rot);
        g.scale(st.sx ?? st.sc ?? 1, st.sy ?? st.sc ?? 1);
        g.globalAlpha *= st.a ?? 1;
        fn(localPts(pc));
        g.restore();
      }
      function polyPath(g, q) { g.beginPath(); q.forEach((v, m) => (m ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); g.closePath(); }
      function drawPiece(g, pc, st) {
        withPiece(g, pc, st, q => {
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
      function flashPiece(g, pc, st, a) {
        if (a <= 0.003) return;
        withPiece(g, pc, st, q => {
          polyPath(g, q);
          const col = pc.kind === 'R' ? cyan : pc.kind === '1' ? C.amberHot : ink;
          g.fillStyle = rgba(col, 0.55 * a); g.fill();
          g.strokeStyle = rgba(col, a); g.lineWidth = lw; g.stroke();
        });
      }

      // Assembly state of piece pc of puzzle A (q = local flight progress).
      const T0 = 0.03, T1 = 0.33, FLY = 0.115;
      function flight(pc) {
        const st0 = T0 + (T1 - T0) * pc.rank / (A.length - 1);
        const q = clamp((p - st0) / FLY);
        if (q <= 0) return null;
        const e = ease.out(q);
        const dist = (exitDist(pc.c, pc.dir) + pc.extra) * s;
        let dx = pc.dir[0] * dist, dy = -pc.dir[1] * dist;
        // keep the start point inside the box
        const c = P(pc.c), m = s * 0.3;
        dx = clamp(c[0] + dx, box.x + m, box.x + box.w - m) - c[0];
        dy = clamp(c[1] + dy, box.y + m, box.y + box.h - m) - c[1];
        return { q, dx: dx * (1 - e), dy: dy * (1 - e), rot: pc.spin * (1 - e), sc: lerp(0.45, 1, ease.back(q)), a: clamp(q * 5) };
      }

      // ------------------------------------------------------------ crash shockwave (p = 0)
      hot.save(); group(hot);
      {
        const q = clamp(p / 0.09);
        if (q < 1) {
          // triangular shock front
          const sc = lerp(0.18, 1.08, ease.out(q));
          const tri = [L(0, 0), L(N, 0), L(0, N)].map(v => [tc[0] + (X(v[0]) - tc[0]) * sc, tc[1] + (Y(v[1]) - tc[1]) * sc]);
          hot.strokeStyle = rgba(C.amberHot, 0.95 * (1 - q) ** 1.5); hot.lineWidth = lw * 1.4;
          hot.lineJoin = 'miter'; polyPath(hot, tri); hot.stroke();
          // spark rays out of the centre
          const rr = R.rng(77);
          hot.lineCap = 'butt';
          for (let m = 0; m < 18; m++) {
            const ang = (m / 18) * 6.2832 + rr() * 0.3, len = side * (0.18 + 0.25 * rr());
            const ca = Math.cos(ang), sa = Math.sin(ang), mg = 6;
            // longest radius that keeps the ray inside the box
            const rMax = Math.min(ca > 0 ? (box.x + box.w - mg - tc[0]) / ca : ca < 0 ? (box.x + mg - tc[0]) / ca : 1e9,
              sa > 0 ? (box.y + box.h - mg - tc[1]) / sa : sa < 0 ? (box.y + mg - tc[1]) / sa : 1e9) / zoom;
            const r1 = Math.min(rMax, side * 0.05 + ease.out(q) * side * (0.25 + 0.2 * rr())), r2 = Math.min(rMax, r1 + len * (1 - q));
            if (r2 - r1 < 1) continue;
            hot.strokeStyle = rgba(m % 3 ? C.amberHot : C.cyan, 0.9 * (1 - q));
            hot.lineWidth = 2.5;
            hot.beginPath(); hot.moveTo(tc[0] + ca * r1, tc[1] + sa * r1);
            hot.lineTo(tc[0] + ca * r2, tc[1] + sa * r2); hot.stroke();
          }
        }
      }
      hot.restore();

      ctx.save(); group(ctx);
      hot.save(); group(hot);

      // ------------------------------------------------------------ boundary strings
      const fo = s * 0.075;
      BND.forEach(e => {
        const t0 = e.m * 0.009 + e.side * 0.003;
        const q = clamp((p - t0) / 0.05);
        if (q <= 0) return;
        const n = NRM[e.side];
        const a = P([e.a[0] + n[0] * fo / s, e.a[1] + n[1] * fo / s]), b = P([e.b[0] + n[0] * fo / s, e.b[1] + n[1] * fo / s]);
        const g0 = 0.07, g1 = 0.93;
        const pa = [lerp(a[0], b[0], g0), lerp(a[1], b[1], g0)], pb = [lerp(a[0], b[0], g1), lerp(a[1], b[1], g1)];
        ctx.lineCap = 'butt';
        U.drawOn(ctx, pa[0], pa[1], pb[0], pb[1], ease.out(q), labCol(e.l, 1), Math.min(3, lw * 1.2));
        // the digit
        const mid = [(e.a[0] + e.b[0]) / 2 + n[0] * 0.33, (e.a[1] + e.b[1]) / 2 + n[1] * 0.33];
        const mp = P(mid), sc = U.pop(clamp((p - t0 - 0.01) / 0.06));
        if (sc > 0.01) {
          ctx.save(); ctx.translate(mp[0], mp[1]); ctx.scale(sc, sc);
          U.text(ctx, String(e.l), 0, 0, `700 ${Math.round(s * 0.27)}px ${F.main}`, labCol(e.l, 1), 'center', 'middle');
          ctx.restore();
        }
        // arrival flash on the emissive layer
        const fl = 1 - clamp((p - t0) / 0.09);
        if (fl > 0 && q > 0) { hot.lineCap = 'butt'; U.drawOn(hot, pa[0], pa[1], pb[0], pb[1], ease.out(q), rgba(e.l ? C.amberHot : ink, 0.8 * fl), lw * 1.6); }
      });
      // side names
      const nameA = clamp((p - 0.06) / 0.08);
      if (nameA > 0) {
        const fnt = `italic ${Math.round(s * 0.36)}px ${F.math}`;
        const nl = P([N / 4 + NRM[0][0] * 0.78, N * SQ / 2 + NRM[0][1] * 0.78]);
        const nr = P([3 * N / 4 + NRM[1][0] * 0.78, N * SQ / 2 + NRM[1][1] * 0.78]);
        U.text(ctx, 'λ', nl[0], nl[1], fnt, rgba(C.dim, 1), 'center', 'middle', nameA);
        U.text(ctx, 'μ', nr[0], nr[1], fnt, rgba(C.dim, 1), 'center', 'middle', nameA);
        const nb = P([-0.42, -0.33]);
        U.text(ctx, 'ν', nb[0], nb[1], fnt, rgba(C.dim, 1), 'center', 'middle', nameA);
      }

      // ------------------------------------------------------------ puzzle A assembly / morph to B
      const M0 = 0.625, M1 = 0.715, MOUT = 0.034, MIN = 0.05, MLAG = 0.016;
      const mStart = r => M0 + (M1 - M0) * r / (NM - 1);
      // ghosts (speed trails) first, then pieces
      A.forEach(pc => {
        const f = flight(pc);
        if (!f || f.q >= 1) return;
        [0.07, 0.14].forEach((lag, gi) => {
          const st0 = T0 + (T1 - T0) * pc.rank / (A.length - 1);
          const qq = clamp((p - lag * FLY * 2.2 - st0) / FLY);
          if (qq <= 0) return;
          const e = ease.out(qq), e1 = ease.out(f.q);
          const k1 = (1 - e) / Math.max(1e-6, 1 - e1);
          withPiece(hot, pc, { dx: f.dx * k1, dy: f.dy * k1, rot: pc.spin * (1 - e), sc: lerp(0.45, 1, ease.back(qq)), a: (gi ? 0.12 : 0.24) * (1 - f.q) }, q => {
            polyPath(hot, q); hot.fillStyle = rgba(pc.kind === 'R' ? cyan : pc.kind === '1' ? amb : ink, 1); hot.fill();
          });
        });
      });
      A.forEach(pc => {
        const f = flight(pc);
        if (!f) return;
        let st = f;
        if (!pc.common) {
          const q = clamp((p - mStart(pc.mrank)) / MOUT);
          if (q >= 1) return;
          if (q > 0) st = { ...f, sx: 1 - ease.in(q), sy: 1 + 0.08 * Math.sin(Math.PI * q), sc: undefined, a: 1 };
        }
        drawPiece(ctx, pc, st);
        if (f.q < 1) flashPiece(hot, pc, st, clamp((f.q - 0.35) / 0.25) * (1 - f.q) / 0.65 * 1.2);
      });
      B.forEach(pc => {
        if (pc.common) return;
        const q = clamp((p - mStart(pc.mrank) - MLAG) / MIN);
        if (q <= 0) return;
        const st = { sx: ease.back(q), sy: 1 + 0.08 * Math.sin(Math.PI * clamp(q * 1.4)), a: clamp(q * 4) };
        drawPiece(ctx, pc, st);
        flashPiece(hot, pc, st, Math.sin(Math.PI * clamp(q * 1.15)) * 0.9);
      });
      const nowPieces = p < M0 + 0.06 ? A : B;

      // final piece lands: burst on the whole board
      const landT = T1 + FLY;
      const burst = clamp(1 - Math.abs(p - landT - 0.012) / 0.03);
      if (burst > 0) A.forEach(pc => flashPiece(hot, pc, {}, 0.38 * burst));

      // ------------------------------------------------------------ glow sweeps
      function sweep(pc0, pc1, dir, strength, bandW) {
        const q = clamp((p - pc0) / (pc1 - pc0));
        if (q <= 0 || q >= 1) return;
        const corners = [L(0, 0), L(N, 0), L(0, N)].map(P);
        const pr = corners.map(v => v[0] * dir[0] + v[1] * dir[1]);
        const lo = Math.min(...pr) - bandW, hi = Math.max(...pr) + bandW;
        const c = lerp(lo, hi, ease.inOut(q));
        const ax = dir[0] * (c - bandW), ay = dir[1] * (c - bandW), bx = dir[0] * (c + bandW), by = dir[1] * (c + bandW);
        const mk = (col, a) => {
          const gr = hot.createLinearGradient(ax, ay, bx, by);
          gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
          return gr;
        };
        const fillG = mk(C.amberHot, 0.16 * strength), lineG = mk(C.amberHot, 0.95 * strength);
        nowPieces.forEach(pc => {
          const f = Math.max(0, (pc.inr * s - inset) / (pc.inr * s)), c0 = P(pc.c);
          polyPath(hot, pc.pts.map(q => [c0[0] + (q[0] - pc.c[0]) * s * f, c0[1] - (q[1] - pc.c[1]) * s * f]));
          hot.fillStyle = fillG; hot.fill();
          hot.strokeStyle = lineG; hot.lineWidth = lw * 1.1; hot.stroke();
        });
      }
      const dn = Math.hypot(1, 0.55);
      sweep(0.44, 0.63, [1 / dn, -0.55 / dn], 1, s * 1.1);
      sweep(0.79, 1.05, [-1 / dn, -0.55 / dn], 0.75, s * 1.4);

      ctx.restore(); hot.restore();

      // ------------------------------------------------------------ the count
      const fs = s * 0.62;
      const la = ease.out(clamp((p - 0.47) / 0.1));
      if (la > 0) {
        const lx = box.x + box.w * 0.035 - (1 - la) * s * 0.6, ly = box.y + box.h * 0.04 + fs;
        U.math(ctx, 'c_{λμ}^{ν}', lx, ly, fs, rgba(ink, 1), 'left', la);
        U.text(ctx, '= #PUZZLES', lx + fs * 0.04, ly + fs * 0.92, `800 ${Math.round(fs * 0.62)}px ${F.display}`, rgba(ink, 0.82), 'left', 'alphabetic', la);
      }
      // tally: one lit triangle per puzzle found
      const rx = box.x + box.w * 0.965, ty = box.y + box.h * 0.04 + fs * 1.62, ts = s * 0.3;
      [0.455, M1 + MLAG + MIN * 0.6].forEach((t, m) => {
        const q = clamp((p - t) / 0.06);
        if (q <= 0) return;
        const sc = U.pop(q), ix = rx - ts * 0.5 - (1 - m) * ts * 1.35, iy = ty;
        const tri = [[ix - ts / 2, iy], [ix + ts / 2, iy], [ix, iy - ts * SQ]].map(v => [ix + (v[0] - ix) * sc, iy - ts * SQ / 3 + (v[1] - iy + ts * SQ / 3) * sc]);
        ctx.save(); polyPath(ctx, tri); ctx.fillStyle = rgba(amb, 0.85); ctx.fill(); ctx.restore();
        const fl = 1 - clamp((p - t) / 0.12);
        if (fl > 0) { polyPath(hot, tri); hot.fillStyle = rgba(C.amberHot, fl); hot.fill(); }
      });
      // "= 2" slams in when the second puzzle is complete
      const t2 = M1 + MLAG + MIN * 0.6, q2 = clamp((p - t2) / 0.07);
      if (q2 > 0) {
        const big = s * 1.05, sc = lerp(1.9, 1, ease.out(q2)) * (1 + 0.04 * k), bx = rx, by = ty - ts * 1.25;
        ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
        ctx.font = `${Math.round(big)}px ${F.main}`;
        const w2 = ctx.measureText('2').width;
        U.text(ctx, '2', 0, 0, `${Math.round(big)}px ${F.main}`, rgba(amb, 1), 'right', 'alphabetic', clamp(q2 * 3));
        U.text(ctx, '=', -w2 - big * 0.12, 0, `${Math.round(big * 0.7)}px ${F.main}`, rgba(ink, 1), 'right', 'alphabetic', clamp(q2 * 3));
        ctx.restore();
        hot.save(); hot.translate(bx, by); hot.scale(sc, sc);
        const glow = 0.35 + 0.65 * (1 - clamp((p - t2) / 0.15)) + 0.2 * k;
        U.text(hot, '2', 0, 0, `${Math.round(big)}px ${F.main}`, rgba(amb, 1), 'right', 'alphabetic', clamp(glow));
        hot.restore();
      }
    },
  });
})();
