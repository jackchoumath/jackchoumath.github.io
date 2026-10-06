// Motif 'puzzle2': two-step puzzles. Buch-Kresch-Purbhoo-Tamvakis (J. Algebraic
// Combin. 2016) proved Knutson's conjecture: Schubert structure constants of a
// two-step flag variety count puzzles built from eight pieces; Knutson-Zinn-Justin
// (2017-) rederived and extended the rule via quantum integrability.
//
// Labels 0, 1, 2 and composites 10, 20, 21, 2(10), (21)0 (codes a b c d e). The
// pieces are the triangles 000, 111, 222 and, for X > Y with product
// XY in {10, 20, 21, 2(10), (21)0}, the triangle reading Y, X, XY clockwise;
// rotations allowed, reflections not. A string u in {0,1,2}^n names the permutation
// (positions of 2s)(positions of 1s)(positions of 0s), of length #{i<j : u_i < u_j}.
// c_{uv}^w = #puzzles with u on the NW side (bottom-left up to the apex), v on the
// NE side (apex down to bottom-right), w along the bottom (left to right).
// Checked in Python against Schubert-polynomial structure constants
// (c = constant term of d_w(S_u S_v)): every triple for n <= 5 and every triple
// with all three labels present for n = 6 (about 85 000 triples), no mismatch.
// Shown: Fl(1,3;4), u = 1201, v = 1201, w = 0121, c = 1 (this is the only puzzle).
// Lattice (i,j) -> i*e1 + j*e2; H(i,j): (i,j)-(i+1,j), A(i,j): (i,j)-(i,j+1),
// B(i,j): (i+1,j)-(i,j+1). Up cell U(i,j) has edges A(i,j), B(i,j), H(i,j);
// down cell D(i,j) has edges H(i,j+1), A(i+1,j), B(i,j).
(function () {
  const N = 4, SQ = Math.sqrt(3) / 2;
  const NW = '1201', NE = '1201', SO = '0121';
  const EDGES = 'A001 A012 A020 A031 A101 A112 A12a A20c A21a A301 B00a B01b B020 B031 B101 B112 B122 B201 B210 B301 H000 H010 H020 H031 H101 H112 H12d H202 H211 H301';
  const LAB = {};
  EDGES.split(' ').forEach(t => { LAB[t.slice(0, 3)] = t[3]; });
  // constituents of each label with relative lengths: a composite edge is drawn as
  // split segments, e.g. 2(10) = long 2 then 1, 0 and (21)0 = 2, 1 then a long 0.
  const PARTS = { 0: [[0, 1]], 1: [[1, 1]], 2: [[2, 1]], a: [[1, 1], [0, 1]], b: [[2, 1], [0, 1]], c: [[2, 1], [1, 1]],
    d: [[2, 2], [1, 1], [0, 1]], e: [[2, 1], [1, 1], [0, 2]] };

  const L = (i, j) => [i + j / 2, j * SQ];
  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N - j; i++) {
    cells.push({ up: true, lat: [[i, j], [i + 1, j], [i, j + 1]], ed: [`H${i}${j}`, `B${i}${j}`, `A${i}${j}`] });
    if (i < N - 1 - j) cells.push({ up: false, lat: [[i + 1, j], [i + 1, j + 1], [i, j + 1]], ed: [`A${i + 1}${j}`, `H${i}${j + 1}`, `B${i}${j}`] });
  }
  // ed[m] is the edge from lat[m] to lat[m+1]
  const CEN = [N / 2, N * SQ / 3];
  const rr = R.rng(4242);
  cells.forEach(c => {
    c.pts = c.lat.map(([i, j]) => L(i, j));
    c.c = [0, 1].map(d => c.pts.reduce((s, q) => s + q[d], 0) / 3);
    c.labs = c.ed.map(e => LAB[e]);
    c.kind = c.labs[0] === c.labs[1] && c.labs[1] === c.labs[2] ? c.labs[0] : 'x';
    // distance of the centroid to the boundary (barycentric min)
    const j = c.c[1] / SQ, i = c.c[0] - j / 2;
    c.depth = Math.min(i, j, N - i - j) + 0.25 * rr();
    const dx = c.c[0] - CEN[0], dy = c.c[1] - CEN[1], d = Math.hypot(dx, dy) || 1;
    c.dir = [dx / d, dy / d];
    c.spin = (rr() < 0.5 ? -1 : 1) * (0.6 + 0.8 * rr());
  });
  cells.slice().sort((a, b) => a.depth - b.depth).forEach((c, r) => { c.rank = r; });

  MOTIF('puzzle2', {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease } = env;
      const COL = { 0: C.ink, 1: C.amber, 2: C.cyan };
      const side = Math.min(box.h * 0.78 / SQ, box.w * 0.8);
      const s = side / N;
      const x0 = box.x + box.w / 2 - side / 2, y0 = box.y + box.h / 2 + side * SQ / 2 - side * 0.02;
      const P = q => [x0 + q[0] * s, y0 - q[1] * s];
      const lw = Math.max(1.6, Math.min(3, s * 0.026));
      const gap = s * 0.045;
      const tc = P(CEN);
      const zoom = (1 + 0.025 * ease.soft(clamp((p - 0.35) / 0.65))) * (1 + 0.015 * k);
      for (const g of [ctx, hot]) { g.save(); g.translate(tc[0], tc[1]); g.scale(zoom, zoom); g.translate(-tc[0], -tc[1]); }

      // edge in a label's colours; a composite label is split into its constituents
      function edge(g, a, b, lab, alpha, w) {
        const parts = PARTS[lab], tot = parts.reduce((t, q) => t + q[1], 0), gp = parts.length > 1 ? 0.06 : 0;
        if (a[0] > b[0] + 0.5 || (Math.abs(a[0] - b[0]) <= 0.5 && a[1] < b[1])) [a, b] = [b, a];   // same pattern on both copies
        let t = 0;
        parts.forEach(([c, wt]) => {
          const t0 = t + (t > 0 ? gp / 2 : 0), t1 = t + wt / tot - (t + wt / tot < 0.999 ? gp / 2 : 0);
          U.line(g, lerp(a[0], b[0], t0), lerp(a[1], b[1], t0), lerp(a[0], b[0], t1), lerp(a[1], b[1], t1), rgba(COL[c], alpha), w);
          t += wt / tot;
        });
      }
      // inset piece outline in screen coords around its own centroid
      function shape(c, st) {
        const cc = P(c.c), f = 1 - gap / (s * SQ / 3);
        const sc = st.sc ?? 1, rot = st.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot);
        return c.pts.map(q => {
          const vx = (q[0] - c.c[0]) * s * f * sc, vy = -(q[1] - c.c[1]) * s * f * sc;
          return [cc[0] + (st.dx || 0) + vx * cs - vy * sn, cc[1] + (st.dy || 0) + vx * sn + vy * cs];
        });
      }
      function poly(g, q) { g.beginPath(); q.forEach((v, m) => (m ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); g.closePath(); }
      function piece(c, st, a) {
        const q = shape(c, st);
        poly(ctx, q);
        ctx.fillStyle = c.kind === 'x' ? rgba(C.violet, 0.13 * a) : rgba(COL[c.kind], (c.kind === '0' ? 0.13 : 0.3) * a);
        ctx.fill();
        q.forEach((v, m) => edge(ctx, v, q[(m + 1) % 3], c.labs[m], a, lw));
      }

      // ---- boundary: label strips and digits, drawn on first
      const NRM = [[-SQ, 0.5], [SQ, 0.5], [0, -1]];
      const BND = [];
      for (let m = 0; m < N; m++) {
        BND.push({ a: L(0, m), b: L(0, m + 1), l: NW[m], side: 0, m });
        BND.push({ a: L(m, N - m), b: L(m + 1, N - m - 1), l: NE[m], side: 1, m });
        BND.push({ a: L(m, 0), b: L(m + 1, 0), l: SO[m], side: 2, m });
      }
      BND.forEach(e => {
        const t0 = 0.012 * e.m + 0.006 * e.side, q = clamp((p - t0) / 0.07);
        if (q <= 0) return;
        const n = NRM[e.side], off = 0.13;
        const a = P([e.a[0] + n[0] * off, e.a[1] + n[1] * off]), b = P([e.b[0] + n[0] * off, e.b[1] + n[1] * off]);
        const pa = [lerp(a[0], b[0], 0.1), lerp(a[1], b[1], 0.1)], pb = [lerp(a[0], b[0], 0.9), lerp(a[1], b[1], 0.9)];
        U.drawOn(ctx, pa[0], pa[1], pb[0], pb[1], ease.out(q), rgba(COL[e.l], 1), Math.min(3, lw * 1.25));
        const fl = 1 - clamp((p - t0) / 0.12);
        if (fl > 0) U.drawOn(hot, pa[0], pa[1], pb[0], pb[1], ease.out(q), rgba(COL[e.l], 0.9 * fl), 3);
        const mp = P([(e.a[0] + e.b[0]) / 2 + n[0] * 0.4, (e.a[1] + e.b[1]) / 2 + n[1] * 0.4]);
        const sc = U.pop(clamp((p - t0 - 0.015) / 0.07));
        if (sc > 0.01) {
          ctx.save(); ctx.translate(mp[0], mp[1]); ctx.scale(sc, sc);
          U.text(ctx, e.l, 0, 0, `${Math.round(s * 0.3)}px ${F.main}`, rgba(COL[e.l], 1), 'center', 'middle');
          ctx.restore();
        }
      });

      // ---- pieces fly in from outside, outer ring first
      const T0 = 0.06, T1 = 0.25, FLY = 0.1;
      cells.forEach(c => {
        const st0 = T0 + (T1 - T0) * c.rank / (cells.length - 1);
        const q = clamp((p - st0) / FLY);
        if (q <= 0) return;
        const e = ease.out(q), far = s * (1.1 + 0.4 * c.depth);
        const cc = P(c.c), m = s * 0.35;
        let dx = c.dir[0] * far, dy = -c.dir[1] * far;
        dx = clamp(cc[0] + dx, box.x + m, box.x + box.w - m) - cc[0];
        dy = clamp(cc[1] + dy, box.y + m, box.y + box.h - m) - cc[1];
        const st = { dx: dx * (1 - e), dy: dy * (1 - e), rot: c.spin * (1 - e), sc: lerp(0.5, 1, ease.back(q)) };
        piece(c, st, clamp(q * 4));
        const fl = clamp((q - 0.5) / 0.2) * (1 - q) * 2.5;
        if (fl > 0) { poly(hot, shape(c, st)); hot.fillStyle = rgba(c.kind === 'x' ? C.violet : COL[c.kind], 0.45 * fl); hot.fill(); }
      });

      // ---- last piece lands: one flash over the whole board
      const burst = clamp(1 - Math.abs(p - (T1 + FLY) - 0.01) / 0.035);
      if (burst > 0) cells.forEach(c => { poly(hot, shape(c, {})); hot.fillStyle = rgba(c.kind === 'x' ? C.violet : COL[c.kind], 0.3 * burst); hot.fill(); });

      // ---- after assembly: composite edges light up in a travelling pulse
      const lit = clamp((p - 0.36) / 0.08);
      if (lit > 0) {
        cells.forEach(c => {
          const q = shape(c, {});
          c.labs.forEach((l, m) => {
            if (PARTS[l].length < 2) return;
            const ph = (c.c[0] * 0.9 + c.c[1] * 0.5) / N;
            const wave = 0.5 + 0.5 * Math.cos(6.283 * (p * 1.6 - ph));
            edge(hot, q[m], q[(m + 1) % 3], l, lit * (0.25 + 0.55 * wave) + 0.2 * k, 3);
          });
        });
      }
      // ---- two diagonal sweeps: each piece's outline lights up in its own labels
      [[0.5, 0.72], [0.78, 1.0]].forEach(([a0, a1], si) => {
        const q = clamp((p - a0) / (a1 - a0));
        if (q <= 0 || q >= 1) return;
        const front = lerp(-0.6, N + 0.6, ease.inOut(q));
        cells.forEach(c => {
          const d = si ? (N - c.c[0]) + 0.4 * c.c[1] : c.c[0] + 0.4 * c.c[1];
          const b = Math.max(0, 1 - Math.abs(d - front) / 0.9);
          if (b <= 0) return;
          const qv = shape(c, {});
          poly(hot, qv); hot.fillStyle = rgba(c.kind === 'x' ? C.violet : COL[c.kind], 0.18 * b); hot.fill();
          qv.forEach((v, m) => edge(hot, v, qv[(m + 1) % 3], c.labs[m], 0.85 * b, 2.5));
        });
      });
      ctx.restore(); hot.restore();
    },
  });
})();
