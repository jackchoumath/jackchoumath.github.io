// Schubert Calculus — a 15 second film. Everything is a pure function of t.
//
// Design rules: glow is reserved for the answer (amber); everything else is a
// crisp line. Skew lines cross with a gap (as in a knot diagram); lines that
// truly meet carry a dot. Events sit on a 0.25 s grid so picture and score
// lock together; the score reads its cue times from window.__film.cues.
(function () {
  const { W, H, clamp, lerp, seg, env, ease, v3, camera, projectSegment,
          hex, rgba, makeCanvas, bloom, drawGrain, drawVignette, el, tex, setStyle } = R;
  const params = new URLSearchParams(location.search);
  const GRAIN = params.has('nograin') ? 0 : 0.06;

  // ================================================================ palette
  const C = {
    bg0: '#060a11',
    bgGlow: [20, 44, 78],
    ink: hex('#ede8dc'),       // given lines (ivory)
    type: hex('#f3efe6'),
    rule: hex('#7fa3cf'),      // ruling strings
    ruleB: hex('#b4cdea'),
    sub: hex('#8ea3bd'),       // secondary type, HUD
    edge: hex('#3e5f86'),
    amber: hex('#f2c94c'),     // the answer, and only the answer
    amberHot: hex('#fff3c4'),
    cyan: hex('#86c8ff'),      // the fourth line
  };

  // ================================================================ geometry
  // Hyperboloid x^2 + y^2 - z^2 = 1 and its two rulings (verified in geometry.py).
  const D2R = Math.PI / 180;
  const rL = (a, s) => [Math.cos(a) - s * Math.sin(a), Math.sin(a) + s * Math.cos(a), s];
  const lL = (b, s) => [Math.cos(b) + s * Math.sin(b), Math.sin(b) - s * Math.cos(b), s];
  const A = [-50, 5, 55].map(d => d * D2R);                  // l1, l2, l3 (one ruling)
  const L4p = [0.25, -1.3, 0.7], L4q = [0.22, 1.25, -0.65];   // l4, ~0.5 from each of them
  const L4d = v3.sub(L4q, L4p);
  const L4at = u => v3.add(L4p, v3.scale(L4d, u));
  const L4u = (() => {                                         // where l4 pierces the surface
    const p = L4p, d = L4d;
    const qa = d[0] ** 2 + d[1] ** 2 - d[2] ** 2;
    const qb = 2 * (p[0] * d[0] + p[1] * d[1] - p[2] * d[2]);
    const qc = p[0] ** 2 + p[1] ** 2 - p[2] ** 2 - 1;
    const r = Math.sqrt(qb * qb - 4 * qa * qc);
    return [(-qb - r) / (2 * qa), (-qb + r) / (2 * qa)];
  })();
  const pierce = L4u.map(L4at);
  const lAngleThrough = ([x, y, z]) => Math.atan2(z * x + y, x - z * y);
  const B = pierce.map(lAngleThrough);                        // the two transversals
  const meetZ = (a, b) => Math.tan((b - a) / 2);              // where r_a meets l_b
  const ZR = 1.6;                                             // drawn half-height of the surface
  const L4range = [-0.5, 1.5];

  // ================================================================ timeline
  const T = {
    lineIn: [0.10, 0.28, 0.46, 0.64], lineDur: 0.62,
    cap1: [0.40, 2.75], cap2: [1.00, 2.75],
    l4dim: [2.75, 3.10],
    // Over this range all three meetings stay on the drawn surface.
    sweep: [3.00, 5.60], sweepFrom: -48 * D2R, sweepTo: 54 * D2R,
    gap: [3.05, 3.80],
    cap3: [2.95, 5.70],
    l4back: [5.70, 6.05],
    cap4: [5.75, 7.10],
    hits: [6.25, 6.50],                  // the pulse on l4 reaches P, then Q
    two: [7.10, 9.00],                   // "2 lines meet all four."
    foot: [7.25, 8.75],
    hold: [6.90, 8.45],                  // the camera is perfectly still
    rulA: [8.40, 9.20],                  // the second ruling joins for the rosette
    rise: [8.45, 9.50],                  // camera rises overhead -> rosette
    collapse: [8.50, 9.75],              // given lines -> sparks -> exponent 4
    fly: [8.95, 9.75],                   // the 2 becomes the coefficient
    formula: [9.30, 9.75],
    rosetteOut: [9.55, 10.05],
    nodes: [9.80, 10.20],
    comet: [10.25, 11.45],               // 4 Pieri steps, 0.30 s apart
    cap5: [9.85, 12.00], cap6: [10.55, 12.00],
    out4: [11.95, 12.30],
    title: [12.30, 15.0],
    fadeOut: [14.62, 15.0],
  };
  const STEP = 0.30;
  const RANK_T = r => T.comet[0] + r * STEP;                  // comet arrival per rank
  // The pulse moves along l4 at constant speed and passes P and Q on the beat.
  const uSpeed = (L4u[1] - L4u[0]) / (T.hits[1] - T.hits[0]);
  const pulseU = t => L4u[0] + (t - T.hits[0]) * uSpeed;
  const pulseT = [T.hits[0] - (L4u[0] - L4range[0]) / uSpeed, T.hits[1] + (L4range[1] - L4u[1]) / uSpeed];
  const sweepAngle = t => lerp(T.sweepFrom, T.sweepTo, seg(t, T.sweep[0], T.sweep[1], ease.inOut));
  const sweepTimeOf = b => {
    let lo = T.sweep[0], hi = T.sweep[1];
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (sweepAngle(m) < b) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const foreshadowT = B.map(sweepTimeOf);
  const NB = 72;                                              // strings per ruling
  const stringT = Array.from({ length: NB }, (_, i) => {      // when each B string is laid
    const b = i / NB * 2 * Math.PI - Math.PI;
    if (b >= T.sweepFrom && b <= T.sweepTo) return sweepTimeOf(b);
    const d = b < T.sweepFrom ? T.sweepFrom - b : b - T.sweepTo;
    return T.sweep[1] - 0.15 + d / Math.PI * 0.45;
  });

  // ================================================================ layers
  const bg = document.getElementById('bg').getContext('2d');
  const fx = document.getElementById('fx').getContext('2d');
  const post = document.getElementById('post').getContext('2d');
  const hotC = makeCanvas(), hot = hotC.getContext('2d');      // emissive (amber) layer

  // ================================================================ splines
  // Monotone cubic Hermite through [time, value] keys (no overshoot; equal
  // neighbouring keys give a true hold).
  function spline(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
    let i = 0;
    while (t > keys[i + 1][0]) i++;
    const slope = j => {
      if (j <= 0 || j >= keys.length - 1) return 0;
      const d0 = (keys[j][1] - keys[j - 1][1]) / (keys[j][0] - keys[j - 1][0]);
      const d1 = (keys[j + 1][1] - keys[j][1]) / (keys[j + 1][0] - keys[j][0]);
      return d0 * d1 <= 0 ? 0 : 2 / (1 / d0 + 1 / d1);
    };
    const [t0, y0] = keys[i], [t1, y1] = keys[i + 1], h = t1 - t0, s = (t - t0) / h;
    const m0 = slope(i) * h, m1 = slope(i + 1) * h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * m1;
  }

  // ================================================================ camera
  // One continuous move; it holds perfectly still while the answer lands.
  const CAM = {
    az: [[0, -48], [2.8, -26], [5.7, -9], [6.9, 1], [8.45, 1], [9.5, 18]],
    el: [[0, 8], [2.8, 13], [5.7, 16], [6.9, 18], [8.45, 18], [9.5, 88]],
    R: [[0, 9.8], [2.8, 10.4], [5.7, 11.0], [6.9, 10.3], [8.45, 10.3], [9.5, 15.5], [10.1, 17.5]],
    tx: [[0, 0.55], [5.7, 0.5], [8.45, 0.5], [9.4, 0.0]],
    fov: [[0, 30], [8.45, 30], [9.5, 24]],
    cx: [[0, 1060], [8.45, 1060], [9.4, 960]],
    cy: [[0, 500], [8.45, 500], [9.4, 540]],
  };
  function cameraAt(t) {
    const az = spline(CAM.az, t) * D2R, el = spline(CAM.el, t) * D2R, Rr = spline(CAM.R, t);
    const target = [spline(CAM.tx, t), 0, 0];
    const eye = v3.add(target, [Rr * Math.cos(el) * Math.cos(az), Rr * Math.cos(el) * Math.sin(az), Rr * Math.sin(el)]);
    // Near overhead, z-up is degenerate: blend the up vector toward the view azimuth.
    const k = seg(spline(CAM.el, t), 60, 88);
    const up = v3.norm([-k * Math.cos(az), -k * Math.sin(az), 1 - k + 1e-3]);
    const cx = spline(CAM.cx, t), cy = spline(CAM.cy, t);
    const cam = camera({ eye, target, up, fov: spline(CAM.fov, t), cx, cy });
    cam.cx = cx; cam.cy = cy;
    return cam;
  }

  // ================================================================ drawing helpers
  let DEPTH = [7.5, 13];
  // Stroke a 3D segment piecewise; alpha and width follow depth. Surface
  // strings (facing) dim where the hyperboloid faces away; taper fades the
  // ends so a segment reads as part of an infinite line.
  function line3D(ctx, cam, a, b, rgb, w, alpha, prog = 1, n = 24, from = 0.5, facing = false, taper = 0, strong = false) {
    if (prog <= 0.001 || alpha <= 0.002) return null;
    const m = v3.lerp(a, b, from);
    const pa = v3.lerp(m, a, prog), pb = v3.lerp(m, b, prog);
    const pts = projectSegment(cam, pa, pb, n);
    const [near, far] = DEPTH;
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i], q = pts[i + 1];
      const z = (p.z + q.z) / 2;
      const k = clamp((far - z) / (far - near), 0.15, 1);
      let al = alpha * (strong ? 0.25 + 0.75 * k : 0.3 + 0.7 * k);
      if (facing) {
        const X = v3.lerp(p.w, q.w, 0.5);
        const f = v3.dot(v3.norm([X[0], X[1], -X[2]]), v3.norm(v3.sub(cam.eye, X)));
        al *= lerp(0.32, 1, seg(f, -0.25, 0.25));
      }
      if (taper > 0) {
        const u = (p.u + q.u) / 2;
        al *= ease.soft(clamp(Math.min(u, 1 - u) / taper));
      }
      if (al <= 0.003) continue;
      ctx.strokeStyle = rgba(rgb, clamp(al));
      ctx.lineWidth = w * (strong ? 0.6 + 0.7 * k : 0.8 + 0.35 * k);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    return pts;
  }
  // Closest points between lines p + s d and q + u e.
  function closest(p, d, q, e) {
    const w = v3.sub(p, q), a = v3.dot(d, d), b = v3.dot(d, e), c = v3.dot(e, e);
    const dd = v3.dot(d, w), ee = v3.dot(e, w), den = a * c - b * b;
    const s = (b * ee - c * dd) / den, u = (a * ee - b * dd) / den;
    return [v3.add(p, v3.scale(d, s)), v3.add(q, v3.scale(e, u))];
  }
  function dot(ctx, x, y, r, rgb, a = 1) {
    if (a <= 0.003 || r <= 0) return;
    ctx.fillStyle = rgba(rgb, clamp(a));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function ring(ctx, x, y, r, rgb, a = 1, w = 1.5) {
    if (a <= 0.003 || r <= 0) return;
    ctx.strokeStyle = rgba(rgb, clamp(a)); ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  function flare(ctx, x, y, r, rgb, a) {
    if (a <= 0.003) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(rgb, a)); g.addColorStop(0.3, rgba(rgb, a * 0.3)); g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // 2D intersection of segments p1p2 and p3p4 (null if they do not cross).
  function segX(p1, p2, p3, p4) {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-9) return null;
    const s = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    if (s < 0 || s > 1 || u < 0 || u > 1) return null;
    return { x: p1.x + s * (p2.x - p1.x), y: p1.y + s * (p2.y - p1.y), s, u };
  }
  // Camera depth of the 3D line (p, d) under screen point X.
  function rayDepth(cam, X, p, d) {
    const dir = v3.norm(v3.add(v3.scale(cam.f, cam.focal), v3.sub(v3.scale(cam.r, X.x - cam.cx), v3.scale(cam.u, X.y - cam.cy))));
    const [, onLine] = closest(cam.eye, dir, p, d);
    return cam.toCam(onLine)[2];
  }

  // ================================================================ DOM type
  const txt = {};
  function words(e, html) {
    // Each word sits in an overflow mask so it can rise into view.
    e.textContent = '';
    return html.split(' ').map((w, i, all) => {
      const m = document.createElement('span'); m.className = 'wm';
      const s = document.createElement('span'); s.className = 'wi'; s.innerHTML = w;
      m.appendChild(s); e.appendChild(m);
      if (i < all.length - 1) e.appendChild(document.createTextNode(' '));
      return s;
    });
  }
  function caption(html, cls = 'caption') {
    const e = el('div', 'display ' + cls);
    return { e, w: words(e, html) };
  }
  // Mono label with inline KaTeX fragments between $...$ (the mono subset has
  // no Greek or blackboard letters, and Gr must not be uppercased).
  function richMono(e, s) {
    e.innerHTML = '';
    s.split('$').forEach((part, i) => {
      const span = document.createElement('span');
      if (i % 2) { span.className = 'inl'; tex(span, part); } else span.textContent = part;
      e.appendChild(span);
    });
    return e;
  }
  function buildText() {
    txt.hudL = [
      richMono(el('div', 'mono hud'), '$\\mathrm{Gr}(2,4)$  ·  LINES IN $\\mathbb{P}^3$'),
      richMono(el('div', 'mono hud'), '$H^*(\\mathrm{Gr}(2,4))$  ·  PIERI RULE'),
    ];
    txt.hudR = ['01 / FOUR LINES', '02 / THE SURFACE', '03 / THE FOURTH LINE', '04 / THE RING']
      .map(s => richMono(el('div', 'mono hud'), s));
    txt.cap1 = caption('Four lines in space.');
    txt.cap2 = caption('<i>How many lines meet all four?</i>');
    txt.cap3 = caption('Lines meeting the first three weave a hyperboloid.');
    txt.cap4 = caption('The fourth line pierces it <i>twice.</i>');
    txt.cap5 = caption('Each condition adds a box.');
    txt.cap6 = caption('Two ways to fill the square.');
    txt.ans = caption('lines meet all four.');
    txt.labels = ['1', '2', '3', '4'].map(i => { const e = el('div', 'math linelabel'); tex(e, `\\ell_{${i}}`); return e; });
    txt.foot = richMono(el('div', 'mono foot'), 'GENERAL LINES  ·  COUNTED OVER $\\mathbb{C}$  ·  BOTH REAL HERE');
    txt.two = el('div', 'display bigtwo'); txt.two.textContent = '2';
    txt.formula = el('div', 'math formula');
    tex(txt.formula, '\\sigma_1^{\\htmlClass{exp4}{4}} \\;=\\; \\htmlClass{coef}{2}\\,\\sigma_{2,2}', true);
    txt.gloss = richMono(el('div', 'mono note'), '$\\sigma_1$ = [MEETS A GIVEN LINE]   ·   $\\sigma_{2,2}$ = [ONE LINE]');
    txt.pieri = ['1', '\\sigma_1', '\\sigma_2+\\sigma_{1,1}', '2\\,\\sigma_{2,1}', '2\\,\\sigma_{2,2}'].map(s => { const e = el('div', 'math pieri'); tex(e, s); return e; });
    txt.pieriHead = el('div', 'math pieri pierihead'); tex(txt.pieriHead, '\\sigma_1^{\\,r}\\!:');
    // End card.
    txt.title = el('div', 'display title');
    txt.titleCh = [...'Schubert Calculus'].map(ch => {
      const m = document.createElement('span'); m.className = 'wm';
      const s = document.createElement('span'); s.className = 'wi'; s.textContent = ch === ' ' ? ' ' : ch;
      m.appendChild(s); txt.title.appendChild(m); return s;
    });
    txt.sub = el('div', 'subtitle'); txt.sub.textContent = 'Enumerative geometry, computed with Young diagrams.';
    txt.cat = [1, 2, 5, 14, 42, 132].map(n => { const e = el('div', 'mono catn'); e.textContent = String(n); return e; });
    txt.catEq = el('div', 'math cateq');
    tex(txt.catEq, '\\sigma_1^{2k} = C_k\\,\\sigma_{k,k} \\ \\text{ in } \\ H^*(\\mathrm{Gr}(2,k{+}2))');
    txt.tabInk = TAB.map(tb => tb.nums.map(row => row.map(n => { const e = el('div', 'tabn'); e.textContent = n; return e; })));
  }

  // Word-by-word mask rise in, block fade out.
  function showCaption(c, t, a, b, x, y, opts = {}) {
    if (t < a - 0.01 || t > b + 0.01) return;
    const stagger = opts.stagger ?? 0.045, dur = opts.dur ?? 0.6;
    const out = seg(t, b - 0.35, b, ease.in);
    setStyle(c.e, { opacity: 1 - out, x, y: y - out * 10, blur: out * 3 });
    c.w.forEach((w, i) => {
      const p = seg(t, a + i * stagger, a + i * stagger + dur, ease.out);
      w.style.transform = `translateY(${((1 - p) * 105).toFixed(2)}%)`;
    });
  }

  // ================================================================ background
  let curT = 0;
  function drawBackground() {
    bg.fillStyle = C.bg0; bg.fillRect(0, 0, W, H);
    const gx = W * lerp(0.54, 0.5, seg(curT, 8.6, 9.6, ease.inOut)), gy = H * 0.46;
    const g = bg.createRadialGradient(gx, gy, 0, gx, gy, 1150);
    g.addColorStop(0, rgba(C.bgGlow, 0.62));
    g.addColorStop(0.5, rgba(C.bgGlow, 0.18));
    g.addColorStop(1, rgba(C.bgGlow, 0));
    bg.fillStyle = g; bg.fillRect(0, 0, W, H);
    // Dot grid (graph paper), faint.
    bg.fillStyle = 'rgba(160,185,215,0.045)';
    const gap = 48, ox = (W % gap) / 2, oy = (H % gap) / 2;
    for (let x = ox; x <= W; x += gap) for (let y = oy; y <= H; y += gap) bg.fillRect(x - 1, y - 1, 2, 2);
  }

  // ================================================================ acts I–III: lines in space
  const given = [
    [rL(A[0], -1.95), rL(A[0], 1.95)],
    [rL(A[1], -1.95), rL(A[1], 1.95)],
    [rL(A[2], -1.95), rL(A[2], 1.95)],
    [L4at(L4range[0]), L4at(L4range[1])],
  ];
  const givenDir = given.map(g => v3.sub(g[1], g[0]));
  const exp4Pos = { x: 870, y: 160 };     // measured after layout
  // Labels sit just beyond one end of each line (upper ends for l1..l3, the
  // left end for l4), pushed off to the side; they slide inward to stay in
  // the safe area and clear of each other.
  const LABEL_END = [1, 1, 1, 0];
  const segDist = (q, a, b) => {
    const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
    const u = clamp(((q.x - a.x) * vx + (q.y - a.y) * vy) / L2);
    return Math.hypot(q.x - a.x - u * vx, q.y - a.y - u * vy);
  };
  function labelAnchor(cam, g, end, placed, others) {
    let best = null, bestScore = -1;
    for (let k = 0; k <= 40; k++) {
      const f = end ? 1 - k * 0.01 : k * 0.01;
      const E = cam.project(v3.lerp(g[0], g[1], f));
      const I = cam.project(v3.lerp(g[0], g[1], end ? f - 0.08 : f + 0.08));
      let dx = E.x - I.x, dy = E.y - I.y;
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      for (const side of [1, -1]) {
        const nx = -dy * side, ny = dx * side;
        const q = { x: E.x + 18 * dx + 24 * nx, y: E.y + 18 * dy + 24 * ny };
        const inside = q.x > 150 && q.x < 1770 && q.y > 130 && q.y < 820;
        const clear = placed.every(p => Math.hypot(p.x - q.x, p.y - q.y) > 64);
        const room = Math.min(99, ...others.map(([a, b]) => segDist(q, a, b)));
        const score = (inside ? 1000 : 0) + (clear ? 500 : 0) + Math.min(room, 40) - k * 0.5;
        if (score > bestScore) { bestScore = score; best = q; }
      }
      if (bestScore >= 1500 + 30 - k * 0.5) break;
    }
    return best;
  }

  function sceneSpace(t) {
    if (t > T.rosetteOut[1] + 0.05) return;
    const cam = cameraAt(t);
    const overhead = seg(t, T.rise[0], T.rise[1], ease.inOut);
    DEPTH = [lerp(7.5, 12, overhead), lerp(13, 20, overhead)];

    const l4A = lerp(1, 0.2, seg(t, T.l4dim[0], T.l4dim[1], ease.soft)) + 0.8 * seg(t, T.l4back[0], T.l4back[1], ease.soft);
    const surfDim = lerp(1, 0.55, seg(t, T.l4back[0], T.l4back[1], ease.soft));
    const surfUp = lerp(1, 1.7, overhead);                       // brighter as it becomes a rosette
    const surfFade = 1 - seg(t, T.rosetteOut[0], T.rosetteOut[1], ease.soft);
    const surfA = surfDim * surfUp * surfFade;

    // --- Ruling B: the probe sweeps and leaves its strings behind.
    const bNow = sweepAngle(t);
    for (let i = 0; i < NB; i++) {
      const b = i / NB * 2 * Math.PI - Math.PI, start = stringT[i];
      const p = seg(t, start, start + 0.4, ease.out);
      if (p <= 0) continue;
      const fresh = Math.exp(-Math.max(0, t - start) / 0.3);
      line3D(fx, cam, lL(b, -ZR), lL(b, ZR), fresh > 0.08 ? C.ruleB : C.rule, 1.05,
        (0.30 + 0.5 * fresh) * surfA, p, 14, 0.5, true);
    }
    // --- Ruling A (the family of l1, l2, l3) joins only once the answer is in,
    // completing the doubly ruled surface for the overhead rosette.
    const ra = seg(t, T.rulA[0], T.rulA[1], ease.soft);
    if (ra > 0) {
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * 2 * Math.PI;
        line3D(fx, cam, rL(a, -ZR), rL(a, ZR), C.rule, 1.0, 0.24 * ra * surfUp * surfFade, 1, 14, 0.5, true);
      }
    }

    // --- The probe: a line meeting l1, l2, l3, with rings riding them.
    const sw = env(t, T.sweep[0] - 0.05, T.sweep[1] + 0.2, 0.25, 0.3);
    if (sw > 0) {
      line3D(fx, cam, lL(bNow, -ZR - 0.25), lL(bNow, ZR + 0.25), C.type, 2.0, 0.95 * sw, 1, 24, 0.5, false, 0.1);
      A.forEach(a => {
        const z = meetZ(a, bNow);
        const vis = 1 - seg(Math.abs(z), ZR * 0.9, ZR * 1.1);
        if (vis <= 0) return;
        const q = cam.project(rL(a, z));
        ring(fx, q.x, q.y, 7, C.type, sw * vis, 1.6);
        dot(fx, q.x, q.y, 2.2, C.type, sw * vis);
      });
      // The gap: the common perpendicular from the probe to l4. A line meeting
      // the first three generally misses the fourth.
      const gapA = env(t, T.gap[0], T.gap[1], 0.2, 0.25) * sw;
      if (gapA > 0) {
        const [g0, g1] = closest(lL(bNow, 0), [Math.sin(bNow), -Math.cos(bNow), 1], L4p, L4d);
        const q0 = cam.project(g0), q1 = cam.project(g1);
        fx.save();
        fx.setLineDash([5, 6]);
        fx.strokeStyle = rgba(C.type, 0.85 * gapA); fx.lineWidth = 1.5;
        fx.beginPath(); fx.moveTo(q0.x, q0.y); fx.lineTo(q1.x, q1.y); fx.stroke();
        fx.restore();
        [q0, q1].forEach(q => dot(fx, q.x, q.y, 2.6, C.type, gapA));
      }
      // Foreshadow: when the probe happens to cross l4, l4 blinks there.
      foreshadowT.forEach((tf, k) => {
        const f = Math.exp(-Math.abs(t - tf) / 0.09) * sw;
        if (f < 0.01) return;
        const q = cam.project(pierce[k]);
        dot(hot, q.x, q.y, 4, C.amber, 0.8 * f);
        flare(hot, q.x, q.y, 28, C.amber, 0.45 * f);
      });
    }

    // --- The four given lines (crisp, no glow), and their collapse into sparks.
    const col = seg(t, T.collapse[0], T.collapse[0] + 0.4, ease.in);    // shrink to midpoints
    const placed = [], drawn = [];
    given.forEach((g, i) => {
      const p = seg(t, T.lineIn[i], T.lineIn[i] + T.lineDur, ease.out) * (1 - col);
      const a = (i === 3 ? l4A : 1);
      const rgb = i === 3 ? C.cyan : C.ink, w = i === 3 ? 2.6 : 2.2;
      const pts = line3D(fx, cam, g[0], g[1], rgb, w, 0.95 * a, p, 32, 0.5, false, 0.12 * seg(p, 0.7, 1), true);
      drawn.push(pts && pts.length > 1 ? { pts, rgb, w, a: 0.95 * a, i } : null);
      // The pen: a bright point at the drawing tips while the line strikes in.
      const pin = seg(t, T.lineIn[i], T.lineIn[i] + T.lineDur, ease.out);
      if (pin > 0 && pin < 1) {
        const m = v3.lerp(g[0], g[1], 0.5);
        [g[0], g[1]].forEach(e => {
          const q = cam.project(v3.lerp(m, e, pin));
          dot(fx, q.x, q.y, 2.8, C.type, 0.95 * (1 - pin));
        });
      }
      const others = given.filter((_, j) => j !== i).map(h => [cam.project(h[0]), cam.project(h[1])]);
      const anchor = labelAnchor(cam, g, LABEL_END[i], placed, others);
      placed.push(anchor);
      const o = seg(t, T.lineIn[i] + 0.4, T.lineIn[i] + 0.9, ease.soft) * (i === 3 ? Math.max(l4A, 0.35) : 1) *
        (1 - seg(t, T.collapse[0] - 0.25, T.collapse[0], ease.soft));
      setStyle(txt.labels[i], { opacity: o, x: anchor.x, y: anchor.y, anchor: '-50%, -50%', color: rgba(i === 3 ? C.cyan : C.ink) });
      // Sparks hold at each midpoint, then fly into the exponent 4 of the formula.
      const ts = T.collapse[1] - 0.5 + i * 0.05, te = T.collapse[1] - 0.12 + i * 0.04;
      const sp = seg(t, ts, te, ease.inOut);
      if (col > 0.85 && sp < 1) {
        const m = cam.project(v3.lerp(g[0], g[1], 0.5));
        const cx = lerp(m.x, exp4Pos.x, 0.5) - 160 + i * 60, cy = Math.min(m.y, exp4Pos.y) - 120;
        const u = sp, x = (1 - u) ** 2 * m.x + 2 * (1 - u) * u * cx + u * u * exp4Pos.x;
        const y = (1 - u) ** 2 * m.y + 2 * (1 - u) * u * cy + u * u * exp4Pos.y;
        dot(hot, x, y, 3.2, C.amberHot, 1);
        flare(hot, x, y, 26, C.amber, 0.55);
      }
    });
    // Knot-diagram crossings: where two given lines cross on screen without
    // meeting in space, the farther one is broken around the nearer one.
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const P = drawn[i], Q = drawn[j];
      if (!P || !Q) continue;
      const X = segX(P.pts[0], P.pts[P.pts.length - 1], Q.pts[0], Q.pts[Q.pts.length - 1]);
      if (!X) continue;
      const di = rayDepth(cam, X, given[i][0], givenDir[i]);
      const dj = rayDepth(cam, X, given[j][0], givenDir[j]);
      const near = di < dj ? P : Q;
      const kz = clamp((DEPTH[1] - Math.min(di, dj)) / (DEPTH[1] - DEPTH[0]), 0.15, 1);
      const a0 = near.pts[0], a1 = near.pts[near.pts.length - 1];
      const L = Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1;
      const ux = (a1.x - a0.x) / L, uy = (a1.y - a0.y) / L;
      fx.save();
      fx.globalCompositeOperation = 'destination-out';
      fx.lineCap = 'butt';
      fx.lineWidth = 15;
      fx.beginPath(); fx.moveTo(X.x - ux * 8, X.y - uy * 8); fx.lineTo(X.x + ux * 8, X.y + uy * 8); fx.stroke();
      fx.restore();
      fx.strokeStyle = rgba(near.rgb, clamp(near.a * (0.25 + 0.75 * kz))); fx.lineWidth = near.w * (0.6 + 0.7 * kz);
      fx.beginPath(); fx.moveTo(X.x - ux * 10, X.y - uy * 10); fx.lineTo(X.x + ux * 10, X.y + uy * 10); fx.stroke();
    }

    // --- The pulse along l4 finds P and Q; the two transversals ignite.
    if (t > pulseT[0] && t < pulseT[1]) {
      const u = pulseU(t);
      for (let k = 0; k < 16; k++) {
        const uk = u - k * 0.025;
        if (uk < L4range[0]) break;
        const qk = cam.project(L4at(uk));
        dot(hot, qk.x, qk.y, 3.4 * (1 - k / 16), C.amberHot, 0.85 * (1 - k / 16));
      }
      const q = cam.project(L4at(u));
      flare(hot, q.x, q.y, 34, C.amber, 0.7);
    }
    const ansFade = 1 - seg(t, T.collapse[0] - 0.05, T.collapse[0] + 0.45, ease.in);
    T.hits.forEach((th, k) => {
      if (t < th || ansFade <= 0) return;
      const b = B[k], P = pierce[k], qP = cam.project(P);
      const dt = t - th;
      const flash = Math.exp(-dt / 0.16);
      // The probe line, stopped at P, turns into the answer.
      const ghost = 1 - seg(t, th, th + 0.35, ease.soft);
      if (ghost > 0) line3D(fx, cam, lL(b, -ZR - 0.25), lL(b, ZR + 0.25), C.type, 2.0, 0.9 * ghost, 1, 24, 0.5, false, 0.1);
      const ig = seg(t, th, th + 0.55, ease.out);
      const sP = P[2];
      const lo = lerp(sP, -ZR - 0.3, ig), hi = lerp(sP, ZR + 0.3, ig);
      line3D(hot, cam, lL(b, lo), lL(b, hi), C.amber, 2.8 + 2.2 * flash, ansFade, 1, 32);
      line3D(hot, cam, lL(b, lo), lL(b, hi), C.amberHot, 1.0, 0.85 * ansFade, 1, 32);
      // The three other meeting points pop as the ignition reaches them.
      A.forEach(a => {
        const z = meetZ(a, b);
        const tz = th + 0.55 * Math.abs(z - sP) / (ZR + 0.3);
        if (t < tz) return;
        const q = cam.project(rL(a, z));
        const pop = seg(t, tz, tz + 0.25, ease.back);
        dot(hot, q.x, q.y, 4.4 * pop, C.amber, ansFade);
        ring(hot, q.x, q.y, 4 + 16 * seg(t, tz, tz + 0.5, ease.out), C.amberHot, 0.7 * (1 - seg(t, tz, tz + 0.5)) * ansFade, 1.3);
      });
      dot(hot, qP.x, qP.y, 5.5 + 4 * flash, C.amberHot, ansFade);
      flare(hot, qP.x, qP.y, 60 + 40 * (1 - flash), C.amber, 0.8 * flash);
      ring(hot, qP.x, qP.y, 10 + 60 * (1 - Math.exp(-dt / 0.25)), C.amberHot, 0.75 * flash, 1.8);
    });
  }

  // ================================================================ act IV: the ring
  const CELL = 46;
  const NODES = {
    '': [300, 560], '1': [575, 560], '2': [850, 420], '11': [850, 700], '21': [1125, 560], '22': [1400, 560],
  };
  const SHAPES = { '': [], '1': [1], '2': [2], '11': [1, 1], '21': [2, 1], '22': [2, 2] };
  const RANK = { '': 0, '1': 1, '2': 2, '11': 2, '21': 3, '22': 4 };
  const PATHS = [['', '1', '2', '21', '22'], ['', '1', '11', '21', '22']];
  // Box added at each step of each path (row, col): the two standard Young tableaux.
  const STEPBOX = [[[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]]];
  const TAB = [
    { pos: [1680, 420], nums: [[1, 2], [3, 4]] },
    { pos: [1680, 700], nums: [[1, 3], [2, 4]] },
  ];
  // Catalan row on the end card (the 2 x 2 square flies into slot k = 2).
  const CAT = { s: 24, gapX: 190, cy: 770 };
  const catX = i => W / 2 - CAT.gapX * 2.5 + i * CAT.gapX;
  const SQUARE_FLY = [11.95, 12.50];

  function young(ctx, key, cx, cy, s, a, t, final = 0) {
    const x0 = cx - s, y0 = cy - s;
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = rgba(C.sub, 0.55 * a * (1 - final)); ctx.lineWidth = 1.2;
    ctx.strokeRect(x0, y0, 2 * s, 2 * s);
    ctx.restore();
    const r = RANK[key], tArr = RANK_T(r);
    const fresh = seg(t, tArr, tArr + 0.2, ease.out) * (1 - 0.75 * seg(t, tArr + 0.35, tArr + 0.9, ease.soft));
    const newBoxes = PATHS.map((p, k) => p[r] === key && r > 0 ? STEPBOX[k][r - 1] : null).filter(Boolean);
    SHAPES[key].forEach((len, row) => {
      for (let c = 0; c < len; c++) {
        const isNew = newBoxes.some(b => b[0] === row && b[1] === c);
        const f = isNew ? fresh : 0;
        // New boxes flash ice-white; amber is kept for the finished square.
        const fill = final > 0 ? rgba(C.amber, (0.12 + 0.2 * final) * a) : rgba(isNew ? C.ruleB : C.type, (0.07 + 0.5 * f) * a);
        ctx.fillStyle = fill;
        ctx.fillRect(x0 + c * s + 2, y0 + row * s + 2, s - 4, s - 4);
        ctx.strokeStyle = final > 0 ? rgba(C.amber, a) : rgba(C.type, (0.75 + 0.25 * f) * a);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x0 + c * s + 2, y0 + row * s + 2, s - 4, s - 4);
      }
    });
  }
  // Point on the rail of path k between two nodes (shared edges get a double rail).
  function rail(a, b, k) {
    const [x0, y0] = NODES[a], [x1, y1] = NODES[b];
    const shared = (a === '' && b === '1') || (a === '21' && b === '22');
    const off = shared ? (k === 0 ? -5 : 5) : 0;
    const sx = x0 + CELL + 16, ex = x1 - CELL - 16;
    const dx = ex - sx, dy = y1 - y0, L = Math.hypot(dx, dy);
    const nx = -dy / L * off, ny = dx / L * off;
    return u => [lerp(sx, ex, u) + nx, lerp(y0, y1, u) + ny];
  }
  let coefScale = 1;

  function sceneRing(t) {
    if (t < T.nodes[0] - 0.05 || t > SQUARE_FLY[1] + 0.02) return;
    const out = 1 - seg(t, T.out4[0], T.out4[1], ease.in);
    const done = RANK_T(4);
    Object.entries(NODES).forEach(([key, [x, y]]) => {
      const r = RANK[key];
      const tin = T.nodes[0] + r * 0.07;
      const p = seg(t, tin, tin + 0.4, ease.back);
      if (p <= 0) return;
      if (key === '22') {
        // The finished square turns amber, then flies into the Catalan row.
        const fin = seg(t, done, done + 0.3, ease.out);
        const fl = seg(t, SQUARE_FLY[0], SQUARE_FLY[1], ease.inOut);
        if (t > SQUARE_FLY[1]) return;
        const cx = lerp(x, catX(1), fl), cy = lerp(y, CAT.cy, fl) - Math.sin(Math.PI * fl) * 40;
        const sc = lerp(0.7 + 0.3 * p, CAT.s / CELL, fl);
        fx.save();
        fx.translate(cx, cy); fx.scale(sc, sc); fx.translate(-x, -y);
        young(fx, key, x, y, CELL, clamp(p), t, fin);
        fx.restore();
      } else {
        const sc = 0.7 + 0.3 * p;
        fx.save();
        fx.translate(x, y); fx.scale(sc, sc); fx.translate(-x, -y);
        young(fx, key, x, y, CELL, clamp(p) * out, t);
        fx.restore();
      }
      if (key !== '' && t > RANK_T(r) && t < T.out4[1]) {
        const ta = RANK_T(r);
        ring(fx, x, y, CELL * 1.25 + 40 * seg(t, ta, ta + 0.5, ease.out), C.type, 0.45 * (1 - seg(t, ta, ta + 0.5)) * out, 1.2);
      }
    });
    if (t > T.out4[1]) return;
    PATHS.forEach((path, k) => {
      for (let j = 0; j < 4; j++) {
        const a = path[j], b = path[j + 1], f = rail(a, b, k);
        const base = seg(t, T.nodes[0] + 0.15 + j * 0.06, T.nodes[0] + 0.5 + j * 0.06, ease.out);
        if (base > 0) {
          const [sx, sy] = f(0), [bx, by] = f(base);
          fx.strokeStyle = rgba(C.edge, 0.95 * out); fx.lineWidth = 1.2;
          fx.beginPath(); fx.moveTo(sx, sy); fx.lineTo(bx, by); fx.stroke();
        }
        const ct = seg(t, RANK_T(j), RANK_T(j + 1), ease.inOut);
        if (ct <= 0) continue;
        const [sx, sy] = f(0), [cx, cy] = f(ct);
        fx.strokeStyle = rgba(C.type, 0.7 * out); fx.lineWidth = 1.6;
        fx.beginPath(); fx.moveTo(sx, sy); fx.lineTo(cx, cy); fx.stroke();
        if (ct < 1) {
          for (let m = 0; m < 10; m++) {
            const [px, py] = f(Math.max(0, ct - m * 0.03));
            dot(fx, px, py, 3.2 * (1 - m / 10), C.type, 0.95 * (1 - m / 10) * out);
          }
        }
      }
    });
    TAB.forEach((tb, k) => {
      const [x, y] = tb.pos, s = CELL;
      const p = seg(t, T.nodes[0] + 0.3, T.nodes[0] + 0.7, ease.out) * out;
      if (p <= 0) return;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        const n = tb.nums[r][c], tn = RANK_T(n);
        const q = seg(t, tn, tn + 0.25, ease.back);
        const bx = x - s + c * s, by = y - s + r * s;
        fx.fillStyle = rgba(C.amber, (0.04 + 0.14 * clamp(q)) * out);
        fx.fillRect(bx + 2, by + 2, s - 4, s - 4);
        fx.strokeStyle = rgba(q > 0 ? C.amber : C.type, 0.75 * p); fx.lineWidth = 1.5;
        fx.strokeRect(bx + 2, by + 2, s - 4, s - 4);
        setStyle(txt.tabInk[k][r][c], { opacity: clamp(q) * out, x: bx + s / 2, y: by + s / 2 + (1 - clamp(q)) * 8, anchor: '-50%, -50%' });
      }
      const hl = seg(t, done, done + 0.35, ease.out);
      if (hl > 0) {
        const [nx, ny] = NODES['22'];
        const sx = nx + CELL + 14, sy = ny, ex = x - s - 14, ey = y;
        hot.strokeStyle = rgba(C.amber, 0.7 * out); hot.lineWidth = 1.2;
        hot.beginPath(); hot.moveTo(sx, sy); hot.lineTo(lerp(sx, ex, hl), lerp(sy, ey, hl)); hot.stroke();
      }
    });
    coefScale = 1 + 0.16 * Math.sin(Math.PI * seg(t, done, done + 0.45));
    if (t > done && t < done + 0.6) flare(hot, coefTarget.cx, coefTarget.cy, 70, C.amber, 0.5 * Math.sin(Math.PI * seg(t, done, done + 0.6)) * out);
  }

  // ================================================================ act V: title
  function sceneTitle(t) {
    if (t < 11.95) return;
    // The quadric returns behind the title, slowly turning, whole in frame.
    const back = seg(t, 12.0, 12.9, ease.soft);
    if (back > 0) {
      const az = 0.5 + 10 * D2R * (t - 12.0) - 2 * D2R * Math.max(0, t - 13.8) ** 2;
      const Rr = lerp(12.5, 11.3, seg(t, 12.0, 15, ease.soft));
      const cam = camera({ eye: [Rr * Math.cos(az) * Math.cos(0.16), Rr * Math.sin(az) * Math.cos(0.16), Rr * Math.sin(0.16)], target: [0, 0, 0.05], fov: 30, cx: W / 2, cy: 470 });
      DEPTH = [9.5, 14];
      for (let i = 0; i < 64; i++) {
        const a = i / 64 * 2 * Math.PI;
        const grow = seg(t, 12.0 + (i % 16) * 0.025, 12.8 + (i % 16) * 0.025, ease.out);
        line3D(fx, cam, rL(a, -1.9), rL(a, 1.9), C.rule, 1, 0.13 * back, grow, 12, 0.5, true);
        line3D(fx, cam, lL(a, -1.9), lL(a, 1.9), C.rule, 1, 0.10 * back, grow, 12, 0.5, true);
      }
    }
    // Title letters snap up on the impact; tracking keeps relaxing after.
    const t0 = T.title[0];
    if (t >= t0 - 0.01) {
      txt.titleCh.forEach((s, i) => {
        const p = seg(t, t0 + i * 0.012, t0 + i * 0.012 + 0.45, ease.snap);
        s.style.transform = `translateY(${((1 - p) * 110).toFixed(2)}%)`;
      });
      const track = lerp(0.035, -0.012, seg(t, t0, t0 + 1.8, ease.soft));
      setStyle(txt.title, { opacity: 1, x: W / 2, y: 290, anchor: '-50%, 0', ls: `${track}em` });
    }
    const hl = seg(t, t0 + 0.4, t0 + 0.95, ease.out);
    if (hl > 0) {
      const w = 420 * hl;
      hot.fillStyle = rgba(C.amber, 0.95);
      hot.fillRect(W / 2 - w / 2, 512, w, 2);
    }
    const sp = seg(t, t0 + 0.5, t0 + 1.05, ease.out);
    setStyle(txt.sub, { opacity: sp, x: W / 2, y: 542 + (1 - sp) * 14, anchor: '-50%, 0', blur: (1 - sp) * 4 });
    // Catalan row: 2 x k rectangles and their numbers of standard tableaux.
    const { s, cy } = CAT;
    [1, 2, 3, 4, 5, 6].forEach((k, i) => {
      const cx = catX(i), isTwo = k === 2;
      const tin = isTwo ? SQUARE_FLY[1] : t0 + 0.6 + i * 0.07;
      const p = isTwo ? (t >= SQUARE_FLY[1] ? 1 : 0) : seg(t, tin, tin + 0.4, ease.back);
      if (p <= 0) return;
      const wR = k * s, hR = 2 * s;
      fx.save();
      fx.translate(cx, cy); fx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
      for (let r = 0; r < 2; r++) for (let c = 0; c < k; c++) {
        fx.strokeStyle = rgba(isTwo ? C.amber : C.sub, clamp(p) * (isTwo ? 1 : 0.85)); fx.lineWidth = 1.4;
        fx.strokeRect(-wR / 2 + c * s + 1, -hR / 2 + r * s + 1, s - 2, s - 2);
        if (isTwo) { fx.fillStyle = rgba(C.amber, 0.32 * clamp(p)); fx.fillRect(-wR / 2 + c * s + 1, -hR / 2 + r * s + 1, s - 2, s - 2); }
      }
      fx.restore();
      // Count up to the number of standard tableaux of the 2 x k rectangle.
      const tc = catCountT(i), dc = 0.12 + 0.06 * k;
      const n = isTwo ? 2 : Math.max(1, Math.round(CATALAN[i] * ease.out(clamp((t - tc) / dc))));
      if (txt.cat[i].textContent !== String(n)) txt.cat[i].textContent = String(n);
      const landed = t >= tc + dc;
      const np = isTwo ? seg(t, SQUARE_FLY[1], SQUARE_FLY[1] + 0.3, ease.out) : clamp(p);
      setStyle(txt.cat[i], { opacity: np, x: cx, y: cy + 40, anchor: '-50%, 0', color: isTwo ? rgba(C.amber) : rgba(landed ? C.type : C.sub) });
    });
    const ep = seg(t, t0 + 0.95, t0 + 1.45, ease.out);
    setStyle(txt.catEq, { opacity: ep, x: W / 2, y: 868 + (1 - ep) * 10, anchor: '-50%, 0' });
  }
  const CATALAN = [1, 2, 5, 14, 42, 132];
  const catCountT = i => T.title[0] + 0.65 + i * 0.07;

  // ================================================================ type & HUD
  const ACTS = [0.25, 2.75, 5.70, 9.80];
  function typeLayer(t) {
    // HUD: swaps one after the other (never overprinted).
    const hudOut = 1 - seg(t, T.out4[0], T.out4[1], ease.in);
    const swap = i => {
      const a = ACTS[i], b = ACTS[i + 1] ?? 99;
      return seg(t, a + 0.02, a + 0.3, ease.soft) * (1 - seg(t, b - 0.18, b, ease.soft)) * hudOut;
    };
    const left = [seg(t, 0.25, 0.6, ease.soft) * (1 - seg(t, 9.62, 9.8, ease.soft)), seg(t, 9.82, 10.1, ease.soft) * hudOut];
    txt.hudL.forEach((e, i) => setStyle(e, { opacity: left[i], x: 120, y: 58 }));
    txt.hudR.forEach((e, i) => setStyle(e, { opacity: swap(i), x: 1800, y: 58, anchor: '-100%, 0' }));

    const CX = 120, CY1 = 880, CY2 = 950;
    showCaption(txt.cap1, t, T.cap1[0], T.cap1[1], CX, CY1);
    showCaption(txt.cap2, t, T.cap2[0], T.cap2[1], CX, CY2);
    showCaption(txt.cap3, t, T.cap3[0], T.cap3[1], CX, CY2);
    showCaption(txt.cap4, t, T.cap4[0], T.cap4[1], CX, CY2);
    showCaption(txt.cap5, t, T.cap5[0], T.cap5[1], CX, CY1);
    showCaption(txt.cap6, t, T.cap6[0], T.cap6[1], CX, CY2);
    setStyle(txt.foot, { opacity: env(t, T.foot[0], T.foot[1], 0.4, 0.35) * 0.95, x: 1800, y: 1000, anchor: '-100%, 0' });

    // The answer: a big "2" completes the question, then becomes the coefficient.
    const tin = seg(t, T.two[0], T.two[0] + 0.55, ease.out);
    const coef = txt.formula.querySelector('.coef');
    const exp4 = txt.formula.querySelector('.exp4');
    if (t > T.two[0] - 0.01 && t < T.fly[1] + 0.02) {
      // Move the glyph's own centre (not its line box) so it lands exactly on
      // the coefficient, which is the same Instrument Serif glyph. x leads and
      // y follows, so the 2 rises into its slot rather than crossing "=".
      const fx_ = seg(t, T.fly[0], T.fly[1], ease.out), fy_ = seg(t, T.fly[0], T.fly[1], ease.inOut);
      const cx = lerp(lockup.cx, coefTarget.cx, fx_), cy = lerp(lockup.cy, coefTarget.cy, fy_);
      const sc = lerp(1, coefTarget.scale, fy_);
      setStyle(txt.two, { opacity: tin * (t < T.fly[1] ? 1 : 0), x: cx - sc * glyph.cx, y: cy + (1 - tin) * 40 - sc * glyph.cy, scale: sc, blur: (1 - tin) * 12 });
    }
    showCaption(txt.ans, t, T.two[0] + 0.12, T.two[1], lockup.textX, CY2, { stagger: 0.03, dur: 0.45 });

    const fp = seg(t, T.formula[0], T.formula[1], ease.out);
    const fOut = seg(t, T.out4[0], T.out4[1], ease.in);
    if (t > T.formula[0] && t < T.out4[1]) {
      setStyle(txt.formula, { opacity: fp * (1 - fOut), x: W / 2, y: 150 + (1 - fp) * 16, anchor: '-50%, 0', blur: (1 - fp) * 5 + fOut * 4 });
      setStyle(txt.gloss, { opacity: seg(t, T.cap5[0], T.cap5[0] + 0.4) * (1 - fOut), x: W / 2, y: 318, anchor: '-50%, 0' });
      coef.style.opacity = t < T.fly[1] ? 0 : 1;
      coef.style.transform = `scale(${coefScale.toFixed(3)})`;
      const fl = Math.exp(-Math.max(0, t - T.collapse[1]) / 0.35) * (t > T.collapse[1] ? 1 : 0);
      exp4.style.color = `rgb(${lerp(C.type[0], C.amber[0], fl)},${lerp(C.type[1], C.amber[1], fl)},${lerp(C.type[2], C.amber[2], fl)})`;
    }

    // Pieri row: sigma_1^r for r = 0..4, written under each rank as the comet arrives.
    const pieriX = [300, 575, 850, 1125, 1400];
    const head = seg(t, RANK_T(0) - 0.1, RANK_T(0) + 0.3, ease.out) * (1 - fOut);
    if (t > RANK_T(0) - 0.12 && t < T.out4[1]) setStyle(txt.pieriHead, { opacity: head, x: 150, y: 812, anchor: '0, 0' });
    txt.pieri.forEach((e, r) => {
      const ta = RANK_T(r);
      const p = seg(t, ta - 0.05, ta + 0.3, ease.out) * (1 - fOut);
      if (t > ta - 0.06 && t < T.out4[1]) setStyle(e, { opacity: p, x: pieriX[r], y: 812 + (1 - p) * 10, anchor: '-50%, 0' });
    });

    // Fade to black with the score's tail.
    endFade = seg(t, T.fadeOut[0], T.fadeOut[1], ease.soft);
  }
  let endFade = 0;

  // Layout measured once fonts are ready.
  let coefTarget = { cx: 1018, cy: 210, scale: 0.3 };
  const lockup = { cx: 200, cy: 900, textX: 330 };
  const glyph = { cx: 0, cy: 0 };              // text centre of the big 2 in its own box
  const textRect = e => {
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let node, last = null;
    while ((node = walker.nextNode())) if (node.textContent.trim()) last = node;
    const r = document.createRange(); r.selectNodeContents(last);
    return r.getBoundingClientRect();
  };
  function measure() {
    setStyle(txt.formula, { opacity: 1, x: W / 2, y: 150, anchor: '-50%, 0' });
    const coef = txt.formula.querySelector('.coef'), exp4 = txt.formula.querySelector('.exp4');
    const re = exp4.getBoundingClientRect();
    setStyle(txt.two, { opacity: 1, x: 0, y: 0, scale: 1 });
    const rt = txt.two.getBoundingClientRect();
    const tt = textRect(txt.two), tc = textRect(coef);
    glyph.cx = tt.left + tt.width / 2 - rt.left;
    glyph.cy = tt.top + tt.height / 2 - rt.top;
    const bigSize = parseFloat(getComputedStyle(txt.two).fontSize);
    const coefSize = parseFloat(getComputedStyle(coef.querySelector('.mord') || coef).fontSize);
    // Same face (Instrument Serif) for both glyphs, so font-size ratio = scale.
    coefTarget = { cx: tc.left + tc.width / 2, cy: tc.top + tc.height / 2, scale: coefSize / bigSize };
    Object.assign(exp4Pos, { x: re.left + re.width / 2, y: re.top + re.height / 2 });
    // Lockup: the 2 sits in the caption column, its baseline on the caption's.
    const top = 950 + 62 * 0.78 - rt.height * 0.5 - bigSize * 0.035 + 30 - rt.height / 2;
    lockup.cx = 120 + glyph.cx;
    lockup.cy = top + glyph.cy;
    lockup.textX = 120 + rt.width + 18;
    setStyle(txt.formula, { opacity: 0 });
    setStyle(txt.two, { opacity: 0 });
  }

  // ================================================================ frame
  function seek(t) {
    curT = t;
    for (const e of document.getElementById('overlay').children) setStyle(e, { opacity: 0 });
    drawBackground();
    fx.clearRect(0, 0, W, H);
    hot.clearRect(0, 0, W, H);
    fx.lineCap = hot.lineCap = 'round';

    sceneSpace(t);
    sceneRing(t);
    sceneTitle(t);
    typeLayer(t);

    // Only the emissive layer blooms. The vignette sits under the type.
    fx.drawImage(hotC, 0, 0);
    bloom(fx, hotC, 6, 0.6);
    bloom(fx, hotC, 24, 0.45);
    bloom(fx, hotC, 56, 0.3);
    drawVignette(fx, 0.5);

    post.clearRect(0, 0, W, H);
    const fade = Math.max(1 - seg(t, 0, 0.35, ease.soft), endFade);
    if (fade > 0) { post.fillStyle = `rgba(0,0,0,${fade})`; post.fillRect(0, 0, W, H); }
    if (GRAIN > 0) drawGrain(post, t, GRAIN);
  }

  // ================================================================ boot
  async function boot() {
    await Promise.all([
      document.fonts.load('400 80px "Instrument Serif"'),
      document.fonts.load('italic 400 80px "Instrument Serif"'),
      document.fonts.load('500 20px "JetBrains Mono"'),
      document.fonts.load('400 20px "Inter"'),
      document.fonts.load('400 40px KaTeX_Main'),
      document.fonts.load('italic 400 40px KaTeX_Math'),
      document.fonts.load('400 40px KaTeX_AMS'),
    ]);
    buildText();
    await document.fonts.ready;
    measure();
    window.seek = seek;
    // Cue sheet for the score (audio.py reads these through cues.mjs).
    const cues = {
      lineIn: T.lineIn, sweep: T.sweep, foreshadow: foreshadowT, strings: stringT.filter(s => s >= T.sweep[0] && s <= T.sweep[1]).sort((a, b) => a - b),
      gap: T.gap, l4back: T.l4back, pulse: pulseT, hits: T.hits, two: T.two[0], hold: T.hold,
      rise: T.rise, collapse: T.collapse, sparks: [0, 1, 2, 3].map(i => T.collapse[1] - 0.12 + i * 0.04), fly: T.fly,
      formula: T.formula[1], rosetteOut: T.rosetteOut, nodes: T.nodes, ranks: [0, 1, 2, 3, 4].map(RANK_T),
      out4: T.out4, squareFly: SQUARE_FLY, title: T.title[0],
      catalan: CATALAN.map((_, i) => catCountT(i) + 0.12 + 0.06 * (i + 1)), fadeOut: T.fadeOut,
    };
    window.__film = { T, cues, B: B.map(b => b / D2R), pierce, coefTarget, exp4Pos, lockup };
    seek(0);
    window.__ready = true;
  }
  boot();
})();
