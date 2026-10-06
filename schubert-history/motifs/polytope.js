// Motif 'polytope': Fink-Meszaros-St. Dizier (Adv. Math. 2018): the Newton polytope
// of a Schubert polynomial is a generalized permutahedron (the Schubitope) and S_w
// has saturated Newton polytope: every lattice point of it is an exponent of S_w.
// Example S_12543 (computed in Python by divided differences from S_{w0}):
//   S_12543 = x1^2x2 + x1^2x3 + x1^2x4 + x1x2^2 + 2x1x2x3 + x1x2x4 + x1x3^2
//           + x1x3x4 + x2^2x3 + x2^2x4 + x2x3^2 + x2x3x4 + x3^2x4      (13 terms)
// Its exponents lie in the plane a1+a2+a3+a4 = 3, drawn here inside the simplex
// 3*Delta_3 (a regular tetrahedron, x4 vertex pointing down, so the face a4 = 0, a
// hexagon = 2D permutahedron containing (1,1,1,0), is on top). Convex hull (scipy): 9 vertices,
// 15 edges, all parallel to roots e_i - e_j (a generalized permutahedron), 8 faces;
// it is {a in 3*Delta_3 : a_i <= 2, a_4 <= 1}. Its lattice points are exactly the 13
// exponents (saturation); the other 7 points of the simplex stay dark.
// The point (1,1,1,0) carries coefficient 2 (double ring).
MOTIF('polytope', (() => {
  const TERMS = '0021 0111 0120 0201 0210 1011 1020 1101 1110 1200 2001 2010 2100'.split(' ');
  const FACES = [['2001', '0021', '0201'], ['0120', '0021', '1020'], ['0210', '1200', '0201'], ['2010', '2001', '2100'],
    ['0201', '0021', '0120', '0210'], ['0201', '1200', '2100', '2001'], ['1200', '0210', '0120', '1020', '2010', '2100'],
    ['2010', '1020', '0021', '2001']];
  const R8 = Math.sqrt(8 / 9);
  const V = [90, 210, 330].map(t => [R8 * Math.cos(t * Math.PI / 180), 1 / 3, R8 * Math.sin(t * Math.PI / 180)]).concat([[0, -1, 0]]);
  const pos = s => [0, 1, 2].map(d => [0, 1, 2, 3].reduce((acc, i) => acc + (+s[i]) * V[i][d], 0) / 3);
  const ALL = [];
  for (let a = 0; a <= 3; a++) for (let b = 0; a + b <= 3; b++) for (let c = 0; a + b + c <= 3; c++) ALL.push(`${a}${b}${c}${3 - a - b - c}`);
  const OFF = ALL.filter(s => !TERMS.includes(s));
  const cen = [0, 1, 2].map(d => TERMS.reduce((acc, s) => acc + pos(s)[d], 0) / TERMS.length);
  const faces = FACES.map(f => {
    const P = f.map(pos), c = [0, 1, 2].map(d => P.reduce((acc, q) => acc + q[d], 0) / P.length);
    const u = P[1].map((x, d) => x - P[0][d]), v = P[2].map((x, d) => x - P[0][d]);
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (n.reduce((acc, x, d) => acc + x * (c[d] - cen[d]), 0) < 0) n = n.map(x => -x);
    return { f, c, n };
  });
  const edges = [];
  faces.forEach((F, fi) => F.f.forEach((s, m) => {
    const t = F.f[(m + 1) % F.f.length], key = [s, t].sort().join('-');
    const e = edges.find(q => q.key === key);
    if (e) e.faces.push(fi); else edges.push({ key, a: s, b: t, faces: [fi] });
  }));
  const TET = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]];
  // build order: edges by height (bottom first), lattice points bottom layer then top layer
  edges.forEach(e => { e.h = (+e.a[3]) + (+e.b[3]) + 0.1 * ((+e.a[0]) + (+e.b[0])); });
  edges.sort((a, b) => a.h - b.h);
  const PTS = TERMS.slice().sort((a, b) => a[3] - b[3] || a.localeCompare(b));

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, lerp, ease, seg } = env;
      // yaw swings in during the build, then drifts from ~1.33 to 1.6. That stays clear of the
      // mirror-symmetric views (phi = 1.05 + k pi/3: front and back dots coincide) and of the
      // edge-on views (phi = 0.28, 1.83, 2.38, ...: a face collapses to a line).
      const phi = 0.2 + 1.0 * ease.out(clamp(p / 0.4)) + 0.4 * p, el = 0.62;
      const cf = Math.cos(phi), sf = Math.sin(phi), ce = Math.cos(el), se = Math.sin(el);
      // the simplex projects into |x| <= 0.983, |y| <= 0.748 for every rotation (checked numerically)
      const S = Math.min(box.w / 1.966, box.h / 1.496) * 0.9 * (1 + 0.012 * k), D = 6;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const view = q => {                  // rotate about the vertical axis, tilt, perspective
        const x1 = q[0] * cf + q[2] * sf, z1 = -q[0] * sf + q[2] * cf;
        const y2 = q[1] * ce - z1 * se, z2 = q[1] * se + z1 * ce, f = D / (D - z2);
        return [cx + S * x1 * f, cy - S * y2 * f, z2];
      };
      const rot = n => {                   // a direction in view space
        const x1 = n[0] * cf + n[2] * sf, z1 = -n[0] * sf + n[2] * cf;
        return [x1, n[1] * ce - z1 * se, n[1] * se + z1 * ce];
      };
      const front = faces.map(F => {     // perspective test: the eye sits at (0, 0, D) in view space
        const n = rot(F.n), c = rot(F.c);
        return n[0] * -c[0] + n[1] * -c[1] + n[2] * (D - c[2]) > 0;
      });
      const LIGHT = [-0.45, 0.75, 0.5], LN = Math.hypot(...LIGHT);
      const shade = F => { const n = rot(F.n), l = Math.hypot(...n); return Math.max(0, (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / (l * LN)); };
      const PP = {}; ALL.forEach(s => { PP[s] = view(pos(s)); });

      // the simplex 3*Delta_3 and its 20 lattice points, faint
      TET.forEach(([i, j], m) => {
        const a = view(V[i]), b = view(V[j]);
        U.drawOn(ctx, a[0], a[1], b[0], b[1], seg(p, 0.01 * m, 0.1 + 0.01 * m, ease.out), rgba(C.dim, 0.32), 1.5);
      });
      OFF.forEach((s, m) => U.dot(ctx, PP[s][0], PP[s][1], 3.2 * U.pop(seg(p, 0.04 + 0.01 * m, 0.12 + 0.01 * m)), rgba(C.dim, 0.75)));

      // polytope edges draw on, back ones dim
      const eq = e => seg(p, 0.06 + 0.012 * edges.indexOf(e), 0.15 + 0.012 * edges.indexOf(e), ease.out);
      const isFront = e => e.faces.some(fi => front[fi]);
      edges.forEach(e => { if (!isFront(e)) { const a = PP[e.a], b = PP[e.b]; U.drawOn(ctx, a[0], a[1], b[0], b[1], eq(e), rgba(C.ink, 0.16), 1.5); } });

      // lattice points = monomials; those on back faces only go under the front faces
      const onFront = s => { const q = pos(s); return faces.some((F, fi) => front[fi] && Math.abs(F.n.reduce((acc, x, d) => acc + x * (q[d] - F.c[d]), 0)) < 1e-9); };
      const scan = [0.5, 0.78];            // after the build: light the two layers a4 = 0, 1
      const dotsOf = layer => PTS.forEach((s, m) => {
        if (onFront(s) !== layer) return;
        const q = seg(p, 0.13 + 0.012 * m, 0.21 + 0.012 * m);
        if (q <= 0) return;
        const [x, y] = PP[s], r = (layer ? 6.5 : 5) * U.pop(q);
        const lit = scan.reduce((acc, t0) => Math.max(acc, 1 - Math.abs(p - t0 - 0.07 * +s[3]) / 0.06), 0);
        U.dot(ctx, x, y, r, rgba(C.amber, layer ? 1 : 0.6));
        U.dot(hot, x, y, r * (1.1 + 0.5 * clamp(lit)), rgba(C.amber, clamp(0.55 + 0.45 * clamp(lit) + 0.2 * k) * (layer ? 1 : 0.6)));
        if (s === '1110') { U.ring(ctx, x, y, r + 5, rgba(C.amber, 0.8 * q), 2); U.ring(hot, x, y, r + 5, rgba(C.amber, 0.5 * q), 2); }
      });
      dotsOf(false);

      // front faces: a translucent skin, then crisp front edges
      const fq = seg(p, 0.24, 0.36, ease.out);
      faces.forEach((F, fi) => {
        if (!front[fi] || fq <= 0) return;
        ctx.beginPath(); F.f.forEach((s, m) => (m ? ctx.lineTo(PP[s][0], PP[s][1]) : ctx.moveTo(PP[s][0], PP[s][1]))); ctx.closePath();
        ctx.fillStyle = rgba(C.amber, (0.06 + 0.2 * shade(F)) * fq); ctx.fill();
      });
      edges.forEach(e => { if (isFront(e)) { const a = PP[e.a], b = PP[e.b]; U.drawOn(ctx, a[0], a[1], b[0], b[1], eq(e), rgba(C.ink, 0.95), 2.5); } });
      dotsOf(true);

      // label, bottom left: the simplex never reaches that corner
      U.math(ctx, '\\S_{12543}', box.x + box.w * 0.04, box.y + box.h * 0.1, Math.round(Math.min(box.w, box.h) * 0.075), rgba(C.ink, 0.9), 'left', seg(p, 0.26, 0.36));
    },
  };
})());
