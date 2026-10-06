// Knutson-Tao honeycombs (1999) and the saturation theorem:
//   c^{N nu}_{N lambda, N mu} > 0  =>  c^{nu}_{lambda mu} > 0.
// A GL_3 honeycomb: every edge lies on a line of direction 90, 210 or 330 deg
// (i.e. edges at 30/90/150 deg), trivalent balanced vertices, one interior
// hexagon, and 3+3+3 semi-infinite rays going N, SW, SE.  Here: regular hexagon
// of side s, three spokes of length s, s = one step of the triangular lattice
// {constant coordinates in Z}; every vertex is a lattice point.  The three rays
// of each family have constant coordinates (-2, 0, 2) lattice units, so after a
// shift the boundary is lambda = mu = (4,2,0), nu = (6,4,2) (the rays carry -nu),
// and c^{642}_{420,420} = 3 (python LR count) -- matching the 3 lattice honeycombs
// (hexagon side 0, 1, 2 units, the middle one drawn here).
// Animation: edges draw on (hexagon amber), then the honeycomb scales by N = 2
// about a lattice vertex against the FIXED lattice (still integral) and comes
// back down to lambda, mu, nu -- the direction of the saturation argument.
MOTIF('honeycomb', (() => {
  const R3 = Math.sqrt(3);
  const dir = deg => [Math.cos(deg * Math.PI / 180), -Math.sin(deg * Math.PI / 180)]; // screen (y down)
  // Geometry in units of s (hexagon side), origin = hexagon centre, y up -> screen via dir().
  const V = [30, 90, 150, 210, 270, 330].map(a => dir(a));            // hexagon vertices
  const O = { 30: dir(30).map(v => 2 * v), 150: dir(150).map(v => 2 * v), 270: dir(270).map(v => 2 * v) };
  const HEX = V.map((v, i) => [v, V[(i + 1) % 6]]);
  const SPOKES = [[V[0], O[30]], [V[2], O[150]], [V[4], O[270]]];
  // rays: [start, direction, family]  family: 'nu' (N), 'lam' (SW), 'mu' (SE)
  const RAYS = [
    [O[150], 90, 'nu'], [V[1], 90, 'nu'], [O[30], 90, 'nu'],
    [O[150], 210, 'lam'], [V[3], 210, 'lam'], [O[270], 210, 'lam'],
    [O[30], 330, 'mu'], [V[5], 330, 'mu'], [O[270], 330, 'mu'],
  ];

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, U, rgba, clamp, lerp, ease, seg } = env;
      const s = Math.min(box.w / 13, box.h / 10.8);
      // Pivot = the bottom outer vertex O270 (a lattice point): scaling about it by an
      // integer keeps the honeycomb integral and keeps the label wedge below it free.
      const px = box.x + box.w / 2, py = box.y + box.h * 0.66;
      const up = seg(p, 0.36, 0.56, ease.inOut), down = seg(p, 0.66, 0.84, ease.inOut);
      const N = 1 + up - down;                                          // 1 -> 2 -> 1
      const pt = ([x, y]) => [px + (x - O[270][0]) * s * N, py + (y - O[270][1]) * s * N];

      // --- the integer lattice (fixed): triangular lattice of step s through O270 ---
      const la = seg(p, 0, 0.15);
      if (la > 0) {
        const e1 = dir(30), e2 = dir(90), rad = Math.min(box.w, box.h) * 0.62;
        for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) {
          const x = px + (i * e1[0] + j * e2[0]) * s, y = py + (i * e1[1] + j * e2[1]) * s;
          if (x < box.x + 6 || x > box.x + box.w - 6 || y < box.y + 6 || y > box.y + box.h - 6) continue;
          const d = Math.hypot(x - px, (y - py + s * 1.8) * 1.2) / rad;
          if (d > 1) continue;
          U.dot(ctx, x, y, 1.7, rgba(C.dim, 0.55 * la * (1 - d * d)));
        }
      }

      const seg2 = (g, a, b, q, col, w) => {
        if (q <= 0) return; const [x0, y0] = pt(a), [x1, y1] = pt(b);
        U.drawOn(g, x0, y0, x1, y1, q, col, w);
      };

      // --- rays: shoot out, fade toward the box edge -------------------------------
      RAYS.forEach(([a, deg, fam], i) => {
        const q = seg(p, 0.1 + 0.012 * i, 0.3 + 0.012 * i, ease.out);
        if (q <= 0) return;
        const [x0, y0] = pt(a), [dx, dy] = dir(deg), m = 8;
        const tx = dx > 0 ? (box.x + box.w - m - x0) / dx : dx < 0 ? (box.x + m - x0) / dx : 1e9;
        const ty = dy > 0 ? (box.y + box.h - m - y0) / dy : dy < 0 ? (box.y + m - y0) / dy : 1e9;
        const L = Math.max(0, Math.min(tx, ty)) * q;
        if (L < 1) return;
        const gr = ctx.createLinearGradient(x0, y0, x0 + dx * L, y0 + dy * L);
        gr.addColorStop(0, rgba(C.ink, 0.95)); gr.addColorStop(0.55, rgba(C.ink, 0.7)); gr.addColorStop(1, rgba(C.ink, 0));
        ctx.strokeStyle = gr; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx * L, y0 + dy * L); ctx.stroke();
      });

      // --- spokes, then the hexagon (amber, on the hot layer too) -------------------
      SPOKES.forEach(([a, b], i) => seg2(ctx, a, b, seg(p, 0.06 + 0.02 * i, 0.16 + 0.02 * i, ease.out), rgba(C.ink, 0.95), 2.4));
      const land = seg(p, 0.84, 0.95), flash = land > 0 && land < 1 ? Math.sin(land * Math.PI) : 0;
      const glow = 0.65 + 0.2 * k + 0.35 * flash;
      HEX.forEach(([a, b], i) => {
        const q = seg(p, 0.0 + 0.017 * i, 0.06 + 0.017 * i, ease.out);
        seg2(ctx, a, b, q, rgba(C.amber, 1), 2.8);
        seg2(hot, a, b, q, rgba(C.amber, glow), 2.8);
      });
      // vertices: small lattice-point markers; they flash when the honeycomb lands back
      const va = seg(p, 0.14, 0.24);
      if (va > 0) {
        V.forEach(v => { const [x, y] = pt(v); U.dot(ctx, x, y, 3.2, rgba(C.amber, va)); if (flash > 0) U.dot(hot, x, y, 4 + 5 * flash, rgba(C.amberHot, 0.6 * flash)); });
        Object.values(O).forEach(v => { const [x, y] = pt(v); U.dot(ctx, x, y, 3, rgba(C.ink, va)); if (flash > 0) U.dot(hot, x, y, 3 + 4 * flash, rgba(C.amberHot, 0.45 * flash)); });
      }

      // --- "xN" read-out in the hexagon while it is scaled up ------------------------
      if (N > 1.25) {
        const [hx, hy] = pt([0, 0]), a = clamp((N - 1.25) * 2.5);
        const fz = s * 0.62 * N, by = hy + fz * 0.36, col = rgba(C.amber, 0.9 * a);
        U.text(ctx, '×', hx - fz * 0.06, by, `${fz * 0.8}px ${env.F.main}`, col, 'right');
        U.text(ctx, 'N', hx - fz * 0.02, by, `italic ${fz}px ${env.F.math}`, col, 'left');
      }

      // --- family labels, riding with their outermost ray ---------------------------
      const fl = seg(p, 0.22, 0.34), fs = s * 0.78;
      if (fl > 0) {
        const lab = (str, x, y) => U.math(ctx, str, x, y, fs, rgba(C.ink, 0.95), 'center', fl);
        const [ax, ay] = pt(O[30]);                         // nu: right of the right-most N ray
        lab('\\nu', ax + fs * 0.75, box.y + fs * 1.15);
        const along = (P0, deg, xEdge) => { const [x0, y0] = pt(P0), [dx, dy] = dir(deg); const t = (xEdge - x0) / dx; return [xEdge, y0 + dy * t]; };
        const [lx, ly] = along(O[150], 210, box.x + fs * 1.1);   // lambda: above the top SW ray
        lab('\\lambda', lx, ly - fs * 0.55);
        const [mx, my] = along(O[30], 330, box.x + box.w - fs * 1.1); // mu: above the top SE ray
        lab('\\mu', mx, my - fs * 0.55);
      }

      // --- saturation, in the free wedge under the pivot ----------------------------
      U.math(ctx, 'c_{Nλ,Nμ}^{Nν}\\,>\\,0\\;\\;\\Rightarrow\\;\\;c_{λμ}^{ν}\\,>\\,0', px, box.y + box.h - s * 0.5, s * 0.6, rgba(C.ink, 0.9), 'center', seg(p, 0.06, 0.16));
    },
  };
})());
