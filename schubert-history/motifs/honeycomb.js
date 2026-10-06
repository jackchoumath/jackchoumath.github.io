// Knutson-Tao honeycombs (1999) and the saturation theorem:
//   c^{N nu}_{N lambda, N mu} > 0  =>  c^{nu}_{lambda mu} > 0.
// A GL_3 honeycomb: every edge lies on a line of direction 90, 210 or 330 deg
// (i.e. edges at 30/90/150 deg), trivalent balanced vertices, one interior
// hexagon, and 3+3+3 semi-infinite rays going N, SW, SE.  Here: regular hexagon
// of side 1, three spokes of length 1, 1 = one step of the triangular lattice
// {constant coordinates in Z}; every vertex is a lattice point.  The three rays
// of each family have constant coordinates (-2, 0, 2) lattice units, so after a
// shift the boundary is lambda = mu = (4,2,0), nu = (6,4,2) (the rays carry -nu),
// and c^{642}_{420,420} = 3 (python LR count) -- matching the 3 lattice honeycombs
// (hexagon side 0, 1, 2 units, the middle one drawn here).
// Animation (4-beat card): the honeycomb draws on (hexagon amber) over the lattice;
// from beat one it scales by N = 2 about its bottom vertex -- a lattice point, so it
// stays integral -- while the camera pulls back (the lattice is drawn in world
// coordinates, so it visibly gets finer: the honeycomb is exactly twice as big in
// lattice units). On beat two its vertices flash on lattice points and the left half of
// the formula lights; it comes back down to lambda, mu, nu, landing on beat three with
// the conclusion c^nu_{lambda mu} > 0 in amber; on beat 3.5 light runs out along the rays.
MOTIF('honeycomb', (() => {
  const dir = deg => [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)];   // world (y up)
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
  const PIV = O[270];                                                   // (0, -2): a lattice point
  const ZR = 1.5;                                                       // camera pull-back at N = 2

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      // --- timeline ---
      const up = seg(p, 0.25, 0.46, ease.inOut), down = seg(p, 0.54, 0.75, ease.inOut);
      const N = 1 + up - down;                                          // 1 -> 2 -> 1
      const zN = Math.pow(N, -Math.log(ZR) / Math.log(2));               // camera zoom: 1 at N=1, 1/ZR at N=2
      const atTop = Math.exp(-Math.max(0, p - 0.5) * 12) * (p >= 0.46 ? 1 : 0);   // flash at N = 2 (beat two)
      const land = p >= 0.75 ? Math.exp(-(p - 0.75) * 10) : 0;          // flash on landing (beat three)

      // --- layout: formula in the wedge under the pivot, honeycomb above it ---
      const FL = 'c_{Nλ,Nμ}^{Nν}\\,>\\,0', FR = 'c_{λμ}^{ν}\\,>\\,0', IMP = '\\;\\;\\Rightarrow\\;\\;';
      const m100 = s => U.math(ctx, s, 0, 0, 100, '#000', 'left', 0) / 100;
      const wFL = m100(FL), wFR = m100(FR), wIMP = m100(IMP), wF = wFL + wIMP + wFR;
      const fz = Math.min(box.h * 0.068, box.w * 0.62 / wF);
      const depth = (wF * fz) / (2 * Math.sqrt(3)) + 1.45 * fz;          // the text box fits in the 120-degree wedge
      const px = box.x + box.w / 2, py = box.y + box.h - depth - 0.45 * fz;
      const u1 = Math.min((py - box.y - box.h * 0.1) / (6 / ZR), box.w / 9);    // lattice step on screen at N = 1
      const u = u1 * zN;                                                 // current lattice step on screen
      const S = ([x, y]) => [px + (x - PIV[0]) * u, py - (y - PIV[1]) * u];      // world -> screen
      const H = w => S([PIV[0] + N * (w[0] - PIV[0]), PIV[1] + N * (w[1] - PIV[1])]);   // honeycomb point
      const lw = clamp(u1 * 0.022, 1.5, 3);
      const drift = 1 + 0.02 * ease.soft(clamp((p - 0.75) / 0.25));
      for (const g of [ctx, hot]) { g.save(); g.translate(px, py); g.scale(drift, drift); g.translate(-px, -py); }

      // --- the integer lattice (world coordinates: it gets finer as the camera pulls back) ---
      const la = seg(p, 0, 0.15);
      if (la > 0) {
        const e1 = dir(30), e2 = dir(90), [hcx, hcy] = H([0, 0]), rad = Math.max(box.w, box.h) * 0.55;
        const R = Math.ceil(Math.max(box.w, box.h) / u) + 2;
        for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
          const [x, y] = S([PIV[0] + i * e1[0] + j * e2[0], PIV[1] + i * e1[1] + j * e2[1]]);
          if (x < box.x + 6 || x > box.x + box.w - 6 || y < box.y + 6 || y > box.y + box.h - 6) continue;
          const d = Math.hypot(x - hcx, (y - hcy) * 1.25) / rad;
          if (d > 1) continue;
          U.dot(ctx, x, y, Math.max(1.2, lw * 0.85), rgba(C.dim, 0.7 * la * (1 - d * d)));
        }
      }

      const seg2 = (g, a, b, q, col, w) => {
        if (q <= 0) return; const [x0, y0] = H(a), [x1, y1] = H(b);
        U.drawOn(g, x0, y0, x1, y1, q, col, w);
      };
      // ray from world point a in direction deg, clipped to the box: [x0, y0, dx, dy, L]
      const ray = (a, deg) => {
        const [x0, y0] = H(a), d = dir(deg), dx = d[0], dy = -d[1], m = 8;
        const tx = dx > 1e-9 ? (box.x + box.w - m - x0) / dx : dx < -1e-9 ? (box.x + m - x0) / dx : 1e9;
        const ty = dy > 1e-9 ? (box.y + box.h - m - y0) / dy : dy < -1e-9 ? (box.y + m - y0) / dy : 1e9;
        return [x0, y0, dx, dy, Math.max(0, Math.min(tx, ty))];
      };

      // --- rays: shoot out, fade toward the box edge; on beat 3.5 light runs out along them ---
      const run = seg(p, 0.85, 1.0);
      RAYS.forEach(([a, deg], i) => {
        const q = seg(p, 0.08 + 0.01 * i, 0.24 + 0.01 * i, ease.out);
        if (q <= 0) return;
        const [x0, y0, dx, dy, Lmax] = ray(a, deg), L = Lmax * q;
        if (L < 1) return;
        const gr = ctx.createLinearGradient(x0, y0, x0 + dx * L, y0 + dy * L);
        gr.addColorStop(0, rgba(C.ink, 0.95)); gr.addColorStop(0.6, rgba(C.ink, 0.65)); gr.addColorStop(1, rgba(C.ink, 0));
        ctx.strokeStyle = gr; ctx.lineWidth = lw * 0.9;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx * L, y0 + dy * L); ctx.stroke();
        if (run > 0 && run < 1) {
          const t = ease.out(run) * Lmax, len = u1 * 0.9, a2 = Math.sin(Math.PI * run) * 0.75 * (1 - 0.85 * t / Math.max(1, Lmax));
          const t0 = Math.max(0, t - len);
          hot.strokeStyle = rgba(C.amberHot, a2); hot.lineWidth = lw;
          hot.beginPath(); hot.moveTo(x0 + dx * t0, y0 + dy * t0); hot.lineTo(x0 + dx * t, y0 + dy * t); hot.stroke();
        }
      });

      // --- spokes, then the hexagon (amber, on the hot layer too) -------------------
      SPOKES.forEach(([a, b], i) => seg2(ctx, a, b, seg(p, 0.05 + 0.02 * i, 0.13 + 0.02 * i, ease.out), rgba(C.ink, 0.95), lw * 1.05));
      const glow = 0.5 + 0.15 * k + 0.35 * Math.max(atTop, land);
      HEX.forEach(([a, b], i) => {
        const q = seg(p, 0.0 + 0.014 * i, 0.05 + 0.014 * i, ease.out);
        seg2(ctx, a, b, q, rgba(C.amber, 1), lw * 1.25);
        seg2(hot, a, b, q, rgba(C.amber, glow), lw * 1.25);
      });
      // vertices: lattice-point markers; they flash at N = 2 and when the honeycomb lands back
      const va = seg(p, 0.12, 0.2), fl = Math.max(atTop, land);
      if (va > 0) {
        V.forEach(v => { const [x, y] = H(v); U.dot(ctx, x, y, lw * 1.4, rgba(C.amber, va)); if (fl > 0.02) U.ring(hot, x, y, lw * (2 + 4 * (1 - fl)), rgba(C.amberHot, 0.7 * fl), lw); });
        Object.values(O).forEach(v => { const [x, y] = H(v); U.dot(ctx, x, y, lw * 1.3, rgba(C.ink, va)); if (fl > 0.02) U.ring(hot, x, y, lw * (2 + 4 * (1 - fl)), rgba(C.amberHot, 0.55 * fl), lw); });
      }

      // --- "xN" in the hexagon while it is scaled up ----------------------------------
      if (N > 1.2) {
        const [hx, hy] = H([0, 0]), a = clamp((N - 1.2) * 2.5);
        const fzN = u * 0.62 * N, by = hy + fzN * 0.36, col = rgba(C.amber, 0.92 * a);
        U.text(ctx, '×', hx - fzN * 0.06, by, `${fzN * 0.8}px ${F.main}`, col, 'right');
        U.text(ctx, 'N', hx - fzN * 0.02, by, `italic ${fzN}px ${F.math}`, col, 'left');
      }

      // --- family labels, riding with their outermost ray (kept inside the box) --------
      const fla = seg(p, 0.2, 0.3), fs = Math.max(12, fz * 1.05);
      if (fla > 0) {
        const lab = (str, x, y) => U.math(ctx, str, clamp(x, box.x + fs, box.x + box.w - fs), clamp(y, box.y + fs, box.y + box.h - fs), fs, rgba(C.ink, 0.95), 'center', fla);
        const [ax, ay] = H(O[30]);                                       // nu: right of the right-most N ray, mid-way up it
        lab('\\nu', ax + fs * 0.75, Math.min(box.y + fs * 1.15, (box.y + ay) / 2 + fs * 0.35));
        const along = (P0, deg, xEdge) => { const [x0, y0] = H(P0), d = dir(deg); const t = (xEdge - x0) / d[0]; return [xEdge, y0 - d[1] * t]; };
        const [lx, ly] = along(O[150], 210, box.x + fs * 1.2);           // lambda: above the top SW ray
        lab('\\lambda', lx, ly - fs * 0.6);
        const [mx, my] = along(O[30], 330, box.x + box.w - fs * 1.2);    // mu: above the top SE ray
        lab('\\mu', mx, my - fs * 0.6);
      }
      ctx.restore(); hot.restore();

      // --- saturation, in the free wedge under the pivot ----------------------------------
      // Both halves appear dim; the left half lights at N = 2, the conclusion lands in amber.
      const fa = seg(p, 0.06, 0.16);
      if (fa > 0) {
        const fy = py + depth, x0 = px - wF * fz / 2;
        const aL = lerp(0.55, 1, seg(p, 0.44, 0.5)), aR = lerp(0.55, 1, seg(p, 0.72, 0.76));
        U.math(ctx, FL, x0, fy, fz, rgba(C.ink, aL), 'left', fa);
        U.math(ctx, IMP, x0 + wFL * fz, fy, fz, rgba(C.ink, 0.6 + 0.4 * seg(p, 0.6, 0.7)), 'left', fa);
        const done = seg(p, 0.72, 0.76);
        U.math(ctx, FR, x0 + (wFL + wIMP) * fz, fy, fz, rgba(done > 0.5 ? C.amber : C.ink, aR), 'left', fa);
        if (land > 0.02) U.math(hot, FR, x0 + (wFL + wIMP) * fz, fy, fz, rgba(C.amber, 0.22 * land), 'left', fa);
        if (atTop > 0.02) U.math(hot, FL, x0, fy, fz, rgba(C.ink, 0.16 * atTop), 'left', fa);
      }
    },
  };
})());
