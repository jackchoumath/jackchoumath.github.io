// Shared engine for the Schubert calculus reel: timing, easing, 3D projection,
// canvas helpers, a DOM text layer and post effects. Everything is a pure
// function of time so any frame can be rendered in any order.
(function () {
  const W = 1920, H = 1080;

  // ---------------------------------------------------------------- timing
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const invlerp = (a, b, x) => clamp((x - a) / (b - a));
  const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

  // cubic-bezier(x1, y1, x2, y2) solver (Newton + bisection fallback).
  function bezier(x1, y1, x2, y2) {
    const A = (a1, a2) => 1 - 3 * a2 + 3 * a1, B = (a1, a2) => 3 * a2 - 6 * a1, C = a1 => 3 * a1;
    const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
    const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
    function tForX(x) {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        const cx = calc(t, x1, x2) - x;
        t -= cx / s;
      }
      if (t < 0 || t > 1 || Math.abs(calc(t, x1, x2) - x) > 1e-5) {
        let lo = 0, hi = 1; t = x;
        for (let i = 0; i < 40; i++) {
          const cx = calc(t, x1, x2);
          if (Math.abs(cx - x) < 1e-7) break;
          if (cx < x) lo = t; else hi = t;
          t = (lo + hi) / 2;
        }
      }
      return t;
    }
    return x => (x <= 0 ? 0 : x >= 1 ? 1 : calc(tForX(x), y1, y2));
  }

  const ease = {
    linear: x => x,
    // Named curves used across the film.
    out: bezier(0.16, 1, 0.3, 1),          // expo-ish out: confident arrivals
    inOut: bezier(0.65, 0, 0.35, 1),       // symmetric, for camera and morphs
    in: bezier(0.7, 0, 0.84, 0),           // exits
    soft: bezier(0.33, 0, 0.2, 1),         // gentle drift
    snap: bezier(0.2, 0.9, 0.1, 1),        // UI-like snap
    back: bezier(0.34, 1.4, 0.64, 1),      // small overshoot
    bezier,
  };

  // Progress of t through [a, b] with an easing curve.
  const seg = (t, a, b, e = ease.linear) => e(invlerp(a, b, t));
  // Fade in over [a, a+fi], hold, fade out over [b-fo, b].
  const env = (t, a, b, fi = 0.3, fo = 0.3, e = ease.soft) =>
    Math.min(seg(t, a, a + fi, e), 1 - seg(t, b - fo, b, e));

  // Deterministic PRNG.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // ---------------------------------------------------------------- 3D
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
    rotZ: (p, th) => [p[0] * Math.cos(th) - p[1] * Math.sin(th), p[0] * Math.sin(th) + p[1] * Math.cos(th), p[2]],
  };

  // A pinhole camera. World is z-up. fov is vertical, in degrees.
  function camera({ eye, target = [0, 0, 0], up = [0, 0, 1], fov = 35, cx = W / 2, cy = H / 2, roll = 0 }) {
    const f = v3.norm(v3.sub(target, eye));
    let r = v3.norm(v3.cross(f, up));
    let u = v3.cross(r, f);
    if (roll) {
      const c = Math.cos(roll), s = Math.sin(roll);
      [r, u] = [v3.add(v3.scale(r, c), v3.scale(u, s)), v3.sub(v3.scale(u, c), v3.scale(r, s))];
    }
    const focal = (H / 2) / Math.tan((fov * Math.PI / 180) / 2);
    const near = 0.05;
    const toCam = p => { const d = v3.sub(p, eye); return [v3.dot(d, r), v3.dot(d, u), v3.dot(d, f)]; };
    const project = p => {
      const c = toCam(p);
      const z = Math.max(c[2], 1e-4);
      return { x: cx + focal * c[0] / z, y: cy - focal * c[1] / z, z: c[2], s: focal / z };
    };
    return { eye, target, r, u, f, focal, near, toCam, project };
  }

  // ---------------------------------------------------------------- canvas
  function makeCanvas(w = W, h = H) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // Polyline from a 3D segment, clipped against the near plane, with per-vertex
  // projected data (x, y, depth z, perspective scale s, parameter u in [0,1]).
  function projectSegment(cam, a, b, n = 24) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = v3.lerp(a, b, u);
      const c = cam.toCam(p);
      if (c[2] <= cam.near) continue;
      const q = cam.project(p);
      q.u = u; q.w = p;
      pts.push(q);
    }
    return pts;
  }

  // Stroke a projected polyline piecewise so width/alpha can follow depth.
  // style(q, u) -> {w, a} ; colour is an [r,g,b] array.
  function strokeVarying(ctx, pts, rgb, style) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i], q = pts[i + 1];
      const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2, s: (p.s + q.s) / 2, u: (p.u + q.u) / 2 };
      const st = style(m);
      if (st.a <= 0.002 || st.w <= 0) continue;
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(st.a)})`;
      ctx.lineWidth = st.w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }

  const hex = h => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgba = (rgb, a = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  // Film grain: a few pre-baked noise tiles, picked per frame.
  const grainTiles = [];
  function buildGrain(count = 6, size = 256, amp = 1) {
    for (let k = 0; k < count; k++) {
      const c = makeCanvas(size, size), g = c.getContext('2d');
      const img = g.createImageData(size, size), r = rng(1234 + k * 977);
      for (let i = 0; i < size * size; i++) {
        // Approximately gaussian: sum of uniforms.
        const v = (r() + r() + r() - 1.5) * 2 * amp;
        const c8 = clamp(128 + v * 90, 0, 255);
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = c8;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainTiles.push(c);
    }
  }
  function drawGrain(ctx, t, alpha = 0.06, fps = 60, mode = 'overlay') {
    if (!grainTiles.length) buildGrain();
    const k = Math.floor(t * fps + 1e-6);
    const tile = grainTiles[((k % grainTiles.length) + grainTiles.length) % grainTiles.length];
    const r = rng(k * 31 + 7);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = mode;
    const pat = ctx.createPattern(tile, 'repeat');
    const ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }

  function drawVignette(ctx, strength = 0.55, rgb = [0, 0, 0]) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, rgba(rgb, 0));
    g.addColorStop(1, rgba(rgb, strength));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Bloom: blurred additive copy of a source canvas onto ctx. Wide radii are
  // blurred at reduced resolution (identical look, a fraction of the cost on
  // a software rasteriser) and upscaled with bilinear filtering.
  const bloomBufs = {};
  function bloom(ctx, src, radius = 14, amount = 0.8) {
    const down = radius >= 16 ? 4 : radius >= 6 ? 2 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = amount;
    if (down === 1) {
      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(src, 0, 0);
    } else {
      const w = Math.ceil(W / down), h = Math.ceil(H / down);
      const key = down;
      if (!bloomBufs[key]) bloomBufs[key] = [makeCanvas(w, h), makeCanvas(w, h)];
      const [a, b] = bloomBufs[key];
      const ga = a.getContext('2d'), gb = b.getContext('2d');
      ga.clearRect(0, 0, w, h);
      ga.imageSmoothingQuality = 'high';
      ga.drawImage(src, 0, 0, w, h);
      gb.clearRect(0, 0, w, h);
      gb.filter = `blur(${(radius / down).toFixed(2)}px)`;
      gb.drawImage(a, 0, 0);
      gb.filter = 'none';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(b, 0, 0, W, H);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- DOM text
  // Creates absolutely positioned elements inside #overlay. Each element is
  // repositioned every frame by the scenes (opacity/transform/clip).
  const overlay = () => document.getElementById('overlay');
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    overlay().appendChild(e);
    return e;
  }
  // Split a text into per-character spans (keeps spaces) for kinetic type.
  function splitChars(e, text) {
    e.textContent = '';
    const spans = [];
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch === ' ' ? ' ' : ch;
      e.appendChild(s);
      spans.push(s);
    }
    return spans;
  }
  function tex(e, src, display = false) {
    window.katex.render(src, e, { displayMode: display, throwOnError: true, trust: true, strict: false, output: 'html' });
    return e;
  }
  function setStyle(e, o) {
    const s = e.style;
    if (o.opacity !== undefined) {
      const v = clamp(o.opacity);
      s.opacity = v;
      s.visibility = v <= 0.001 ? 'hidden' : 'visible';
    }
    if (o.x !== undefined || o.y !== undefined || o.scale !== undefined || o.rot !== undefined) {
      s.transform = `translate(${(o.x ?? 0).toFixed(2)}px, ${(o.y ?? 0).toFixed(2)}px)` +
        (o.anchor ? ` translate(${o.anchor})` : '') +
        (o.rot ? ` rotate(${o.rot}deg)` : '') +
        (o.scale !== undefined ? ` scale(${o.scale})` : '');
    }
    if (o.blur !== undefined) s.filter = o.blur > 0.01 ? `blur(${o.blur.toFixed(2)}px)` : 'none';
    if (o.clip !== undefined) s.clipPath = o.clip;
    if (o.color !== undefined) s.color = o.color;
    if (o.ls !== undefined) s.letterSpacing = o.ls;
  }

  window.R = {
    W, H, clamp, lerp, invlerp, mix, ease, seg, env, rng, v3, camera, makeCanvas,
    projectSegment, strokeVarying, hex, rgba, drawGrain, drawVignette, bloom,
    el, splitChars, tex, setStyle,
  };
})();
