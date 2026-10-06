// Schubert Calculus, 1879 to Today — the 75-second cut.
// Every frame is a pure function of t, locked to window.BEATS (score75.py).
// Layout: the mathematical object owns the centre stage; the year, headline and
// citations sit in a lower third; a thin top bar carries the timeline rail.
(function () {
  const { W, H, clamp, lerp, seg, ease, rng, v3, camera, hex, rgba, makeCanvas, bloom, drawGrain } = R;
  const BM = window.BEATS, ENTRIES = window.ENTRIES, FIN = window.FINALE;
  const C = MOTIF_C, F = MOTIF_F, U = MOTIF_U;
  const GRAIN = new URLSearchParams(location.search).has('nograin') ? 0 : 0.05;
  const easeQ = ease.bezier(0.22, 1, 0.36, 1);         // quick, confident arrivals
  const easeIn = ease.bezier(0.55, 0, 1, 0.45);

  // ================================================================ timing
  const BT = BM.beats, BEAT = BM.beat;
  function bt(b) {
    const n = BT.length - 1;
    if (b <= 0) return BT[0] + b * BEAT;
    if (b >= n) return BT[n] + (b - n) * BEAT;
    const i = Math.floor(b);
    return lerp(BT[i], BT[i + 1], b - i);
  }
  // Cuts snap to 60 fps frame boundaries (at most 8 ms off the beat), so with the renderer's
  // shutter opening at the frame time every frame belongs to exactly one shot.
  const snap = x => Math.round(x * 60) / 60;
  // Beat hits snap to frames too, or a hit inside a frame's shutter double-exposes its punch and shake.
  for (const k of ['kicks', 'claps', 'hook', 'toms', 'booms', 'stabs']) if (BM[k]) BM[k] = BM[k].map(snap);
  const S = BM.sections;
  const DROP = snap(S.drop), BRK = snap(S.brk), DROP2 = snap(S.drop2), RUN = snap(S.run), FINAL = snap(S.final), END = S.end;
  const GAPS = (BM.gaps || []).map(g => g.map(snap));
  const STOP = GAPS.find(g => Math.abs(g[1] - FINAL) < 0.02) || [snap(FINAL - BEAT), FINAL];
  const LIGHTS = GAPS.filter(g => g !== STOP);           // the silent beat before each drop
  const pulse = (list, t, tau, lead = 0) => {
    let v = 0;
    for (const x of list || []) {
      const d = t - x + lead;
      if (d >= 0 && d < tau * 7) v = Math.max(v, Math.exp(-d / tau));
    }
    return v;
  };
  ENTRIES.forEach((e, i) => { e.i = i; e.t0 = snap(bt(e.b)); e.t1 = snap(bt(e.b + e.len)); e.kind = e.kind || (e.len <= 1 ? 'flash' : 'card'); });
  const entryAt = t => { let cur = null; for (const e of ENTRIES) if (t >= e.t0 && t < e.t1) cur = e; return cur; };
  const lastEntryBefore = t => { let cur = null; for (const e of ENTRIES) if (e.t0 <= t) cur = e; return cur; };
  // Interstitials: the music's builds between two entries ('turn' before 1982, 'count' before 2003).
  const INTER = ENTRIES.filter(e => e.inter).map(e => {
    const prev = ENTRIES[e.i - 1], light = LIGHTS.find(g => Math.abs(g[1] - e.t0) < 0.02);
    return { kind: e.inter, t0: prev.t1, t1: light ? light[0] : e.t0, from: prev, to: e };
  });
  const interAt = t => INTER.find(I => t >= I.t0 && t < I.t1);
  const lightAt = t => LIGHTS.find(g => t >= g[0] && t < g[1]);
  const inDrop = t => (t >= DROP && t < BRK) || (t >= DROP2 && t < STOP[0]);
  const section = t => (t >= FINAL ? 'final' : t >= STOP[0] ? 'stop' : t >= RUN ? 'run' : t >= DROP2 ? 'drop2'
    : t >= BRK ? 'brk' : t >= DROP ? 'drop' : t >= S.build ? 'build' : t >= S.verse ? 'verse' : 'intro');
  // Background scroll: integral of a per-section speed, so it never jumps.
  const SPEED = { intro: 0, verse: 60, build: 170, drop: 420, brk: 110, drop2: 460, run: 620, stop: 0, final: 40 };
  const MARKS = [0, S.verse, S.build, DROP, BRK, DROP2, RUN, STOP[0], FINAL, END];
  const scrollAt = t => {
    let s = 0;
    for (let i = 0; i + 1 < MARKS.length; i++) {
      const a = MARKS[i], b = MARKS[i + 1];
      if (t <= a) break;
      s += SPEED[section(a + 1e-6)] * (Math.min(t, b) - a);
    }
    return s;
  };

  // Era colours: warm sepia, burning amber, cool blue, and red for the open problem.
  const ERA = {
    classical: { glow: [44, 34, 22], acc: hex('#e9d2a2') },
    revolution: { glow: [52, 34, 10], acc: C.amber },
    modern: { glow: [12, 36, 66], acc: C.cyan },
    frontier: { glow: [64, 14, 18], acc: C.red },
  };
  const mixc = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));

  // ================================================================ layout
  const STAGE = { x: 330, y: 125, w: 1260, h: 670 };       // cards
  const HERO = { x: 250, y: 110, w: 1420, h: 700 };        // heroes
  const BAND = [96, 812];                                   // motifs draw only between these y
  const CX = 960, CY = 460;                                 // optical centre of the stage
  const LT = { yearX: 118, base: 954, size: 96, barX: 338, x0: 368, headY: 870, citeY: 914, w: 1434, barTop: 832, barBot: 1014 };

  // ================================================================ layers
  const out = document.getElementById('out').getContext('2d');
  const sceneC = makeCanvas(), scene = sceneC.getContext('2d');
  const hotC = makeCanvas(), hot = hotC.getContext('2d');
  const motC = makeCanvas(), mot = motC.getContext('2d');           // motif layer (gets entrance transforms)
  const motHotC = makeCanvas(), motHot = motHotC.getContext('2d');  // the motif's glow, same transforms
  const tmpC = makeCanvas(), tmp = tmpC.getContext('2d');
  const uiC = makeCanvas(), ui = uiC.getContext('2d');             // lower third + top bar: steady chrome

  // ================================================================ text helpers
  function fitFont(ctx, str, weight, family, size, maxW, stretch = 'normal') {
    let s = size;
    for (let i = 0; i < 12; i++) {
      ctx.font = `${weight} ${s}px ${family}`;
      ctx.fontStretch = stretch;
      if (ctx.measureText(str).width <= maxW) break;
      s *= 0.92;
    }
    return s;
  }
  // Keep the headline size; step Archivo's width axis down before shrinking.
  const STRETCH = ['expanded', 'semi-expanded', 'normal', 'semi-condensed', 'condensed'];
  function fitHeadline(ctx, str, size, maxW) {
    for (const st of STRETCH) {
      ctx.font = `900 ${size}px ${F.wide}`; ctx.fontStretch = st;
      if (ctx.measureText(str).width <= maxW) return { size, stretch: st };
    }
    return { size: fitFont(ctx, str, 900, F.wide, size, maxW, 'condensed'), stretch: 'condensed' };
  }
  function wrap(ctx, str, maxW, maxLines = 2) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const keep = lines.slice(0, maxLines);
      // Cut at a word boundary, never inside a word.
      const ws = keep[maxLines - 1].split(' ');
      let last = keep[maxLines - 1] + '…';
      while (ctx.measureText(last).width > maxW && ws.length > 1) { ws.pop(); last = ws.join(' ').replace(/[\s,:;–-]+$/, '') + '…'; }
      keep[maxLines - 1] = last;
      return keep;
    }
    if (lines.length === 2) {
      const a = lines[0].split(' '), b = lines[1].split(' ');
      while (a.length > 1 && ctx.measureText([a[a.length - 1], ...b].join(' ')).width <= ctx.measureText(a.slice(0, -1).join(' ')).width) b.unshift(a.pop());
      return [a.join(' '), b.join(' ')];
    }
    return lines;
  }
  // Kinetic headline: letters rise through a mask with a stagger.
  function kinetic(ctx, str, x, y, size, color, q, opts = {}) {
    const stagger = opts.stagger ?? 0.06, track = opts.track ?? 0;
    ctx.save();
    ctx.font = opts.font; ctx.fontStretch = opts.stretch || 'normal';
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const chars = [...str];
    let cx = x;
    const total = chars.length;
    chars.forEach((ch, i) => {
      const w = ctx.measureText(ch).width;
      const local = clamp((q - stagger * i / Math.max(1, total - 1)) / Math.max(0.0001, 1 - stagger));
      const e = easeQ(local);
      if (e > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(cx - 4, y - size * 1.05, w + track + 8, size * 1.32); ctx.clip();
        ctx.globalAlpha = clamp(e * 1.4);
        ctx.fillText(ch, cx, y + (1 - e) * size * 1.0);
        ctx.restore();
      }
      cx += w + track;
    });
    ctx.restore();
    return cx - x;
  }
  // Odometer: a real-valued year whose digits roll like a mechanical counter.
  function odometer(ctx, v, x, y, size, color, opts = {}) {
    ctx.save();
    ctx.font = `900 ${size}px ${F.display}`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    const cw = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width)) * 0.98;
    const top = y - size * 0.80, bot = y + size * 0.06;
    // Proportional cells (a '1' is half as wide as a '0'); a rolling digit blends the two widths.
    const adv = n => ctx.measureText(String(n)).width;
    let px = x + 2;
    for (let k = 0; k < 4; k++) {
      const place = 10 ** (3 - k);
      const d = Math.floor(v / place) % 10;
      const lower = v - Math.floor(v / place) * place;
      const frac = place === 1 ? v - Math.floor(v) : clamp(lower - (place - 1));
      const wk = lerp(adv(d), adv((d + 1) % 10), clamp(frac)) + size * 0.012;
      const cx = px + wk / 2; px += wk;
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - cw / 2 - 2, top, cw + 4, bot - top); ctx.clip();
      const step = size * 0.88;
      const blur = (opts.speed ? 1 : 0) * 4 * Math.sin(Math.PI * clamp(frac));
      ctx.fillStyle = color;
      if (blur > 0.6) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.fillText(String(d), cx, y - frac * step);
      ctx.fillText(String((d + 1) % 10), cx, y - frac * step + step);
      ctx.restore();
    }
    ctx.restore();
    return px - x;
  }

  // ================================================================ state per frame
  // The digits start rolling LEAD seconds early so the new year has landed on the beat frame.
  const LEAD = 0.083;
  function yearValue(t) {
    // Interstitials creep towards the next year, freezing a hair short of it in the silent beat.
    for (const I of INTER) if (t >= I.t0 && t + LEAD < I.to.t0) {
      const n = I.to.year - I.from.year;
      let v = I.from.year;
      for (let j = 1; j < n; j++) { const tb = snap(I.t1 - (n - j) * BEAT); v += seg(t, tb - LEAD, tb, easeQ); }
      return v;
    }
    const e = lastEntryBefore(t + LEAD);
    if (!e) return ENTRIES[0].year;
    const I = INTER.find(x => x.to === e);
    const from = I ? e.year - 1 : e.i > 0 ? ENTRIES[e.i - 1].year : e.year;
    return lerp(from, e.year, seg(t, e.t0 - LEAD, e.t0, easeQ));   // fully landed on the beat frame
  }

  // ================================================================ background
  function drawBackground(ctx, t, era, kick, sec) {
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
    // A spotlight on the stage: the object is the brightest thing in the frame.
    const breathe = sec === 'brk' ? 0.08 * Math.sin(t * Math.PI / (2 * BEAT)) : 0;
    const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 1000);
    const a = 0.55 + 0.18 * kick + breathe;
    const glow = era.glow.map(Math.round);
    g.addColorStop(0, rgba(glow, a));
    g.addColorStop(0.5, rgba(glow, a * 0.3));
    g.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Scrolling dot grid: speed tracks the energy of the music.
    const scroll = scrollAt(t) % 48;
    ctx.fillStyle = `rgba(170,190,220,${0.04 + 0.03 * kick})`;
    for (let x = -scroll; x <= W; x += 48) for (let y = 12; y <= H; y += 48) ctx.fillRect(x, y, 2, 2);
    // Calm ground for the lower third.
    const lg = ctx.createLinearGradient(0, 790, 0, H);
    lg.addColorStop(0, 'rgba(3,4,7,0)'); lg.addColorStop(0.35, 'rgba(3,4,7,0.55)'); lg.addColorStop(1, 'rgba(3,4,7,0.8)');
    ctx.fillStyle = lg; ctx.fillRect(0, 790, W, H - 790);
  }

  // Top bar: title, index, and a rail 1879 -> today with the playhead at the odometer value.
  const RX0 = 680, RX1 = 1240, RY = 58;
  const railX = y => RX0 + (clamp(y, 1879, 2026) - 1879) / (2026 - 1879) * (RX1 - RX0);
  function drawTopBar(ctx, t, v, acc, kick, hook, idx) {
    ctx.save();
    U.text(ctx, 'COMBINATORIAL SCHUBERT CALCULUS', 118, 64, `600 15px ${F.mono}`, rgba(C.dim, 0.9));
    U.text(ctx, `${String(idx).padStart(2, '0')} / ${ENTRIES.length}`, 1802, 64, `600 15px ${F.mono}`, rgba(C.dim, 0.9), 'right');
    U.text(ctx, '1879', RX0 - 16, 63, `500 13px ${F.mono}`, rgba(C.dim, 0.75), 'right');
    U.text(ctx, 'TODAY', RX1 + 16, 63, `500 13px ${F.mono}`, rgba(C.dim, 0.75), 'left');
    ctx.strokeStyle = rgba(C.dim, 0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RX0, RY); ctx.lineTo(RX1, RY); ctx.stroke();
    for (let y = 1880; y <= 2020; y += 20) { const x = railX(y); ctx.beginPath(); ctx.moveTo(x, RY - 5); ctx.lineTo(x, RY); ctx.stroke(); }
    const px = railX(v);
    ctx.strokeStyle = rgba(acc, 0.9); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(RX0, RY); ctx.lineTo(px, RY); ctx.stroke();
    ENTRIES.forEach(e => {
      if (e.t0 > t) return;
      const x = railX(e.year), fresh = Math.exp(-(t - e.t0) / 0.35);
      U.dot(ctx, x, RY, 2.4 + 2.5 * fresh, rgba(C.ink, 0.85));
      if (fresh > 0.02) { U.dot(ctx, x, RY, 3 + 10 * fresh, rgba(acc, 0.25 * fresh)); U.dot(ctx, x, RY, 2 + 4 * fresh, rgba(acc, 0.8 * fresh)); }
    });
    U.dot(ctx, px, RY, 9 + 3 * kick + 4 * hook, rgba(acc, 0.22));
    U.dot(ctx, px, RY, 4 + 2 * kick + 2 * hook, rgba(acc, 1));
    ctx.restore();
  }

  // The year: small now, bottom left, still rolling like a counter.
  function drawYear(t, v, e, acc, rolling) {
    const slam = e && e.t0 > 0 ? seg(t - e.t0, 0, 0.12, easeQ) : 1;
    const sc = lerp(1.16, 1, slam);
    ui.save();
    ui.translate(LT.yearX, LT.base); ui.scale(sc, sc); ui.translate(-LT.yearX, -LT.base);
    if (slam < 1) {
      ui.save(); ui.globalAlpha = 0.4 * (1 - slam);
      odometer(ui, v, LT.yearX + 10 * (1 - slam), LT.base - 4 * (1 - slam), LT.size, rgba(acc, 1));
      ui.restore();
    }
    odometer(ui, v, LT.yearX, LT.base, LT.size, rgba(C.ink, 0.96), { speed: rolling ? 1 : 0 });
    ui.restore();
  }

  // ================================================================ particles
  function burst(ctx, t, t0, seed, cx, cy, n, colors, power = 1) {
    const age = t - t0;
    if (age < 0 || age > 1.3 || t < 1 / 120) return;
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      // Fast and short-lived: the debris clears the frame within half a second.
      const ang = r() * Math.PI * 2, sp = (1100 + r() * 2600) * power;
      const drag = 3.2;
      const dist = 60 + sp * (1 - Math.exp(-drag * age)) / drag;
      const x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist;
      const sz = 5 + r() * 18, rot = (r() - 0.5) * 8 * age;
      const life = clamp(1 - age / (0.3 + r() * 0.4));
      if (life <= 0) continue;
      const col = colors[Math.floor(r() * colors.length)];
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.strokeStyle = rgba(col, life); ctx.lineWidth = 1.6;
      if (r() < 0.35) { ctx.fillStyle = rgba(col, 0.6 * life); ctx.fillRect(-sz / 2, -sz / 2, sz, sz); }
      ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }
  function speedLines(ctx, t, amount, seed, dir = -1, color = C.ink) {
    if (amount <= 0.01) return;
    const r = rng(seed);
    for (let i = 0; i < 46; i++) {
      const y = r() * H, len = 120 + r() * 520, sp = 1800 + r() * 2600;
      const x = ((r() * W * 2 + dir * t * sp) % (W * 2) + W * 2) % (W * 2) - W * 0.5;
      ctx.strokeStyle = rgba(color, (0.05 + r() * 0.12) * amount); ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * len * amount, y); ctx.stroke();
    }
  }
  // A field of outlines rushing at the camera: squares for the turn, triangles before the puzzles.
  function tunnel(ctx, t, t0, q, shape, r16, seed) {
    const r = rng(seed);
    // Keep the rush on the stage, clear of the lower third.
    for (const g of [ctx, hot]) { g.save(); g.beginPath(); g.rect(0, BAND[0], W, BAND[1] + 10 - BAND[0]); g.clip(); }
    for (let i = 0; i < 140; i++) {
      const z0 = r(), ang = r() * Math.PI * 2, rad = 0.2 + r() * 1.1, amber = r() < 0.4, spin = (r() - 0.5) * 2;
      const z = ((z0 - (t - t0) * (0.6 + 5 * q * q)) % 1 + 1) % 1;
      const s = 1 / (0.08 + z * 1.2);
      const x = CX + Math.cos(ang) * rad * 300 * s, y = CY + Math.sin(ang) * rad * 190 * s;
      const sz = 10 * s;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const a = clamp(0.15 + 0.85 * (1 - z)) * (0.5 + 0.5 * q) * (0.7 + 0.3 * r16);
      const col = rgba(amber ? C.amber : C.ink, a), lw = 1.5 + 2.5 * (1 - z);
      const path = g => {
        g.beginPath();
        if (shape === 'tri') {
          const rot = spin * (t - t0) * 2;
          for (let k = 0; k < 3; k++) { const th = rot - Math.PI / 2 + k * 2 * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(th) * sz * 0.6, y + Math.sin(th) * sz * 0.6); }
          g.closePath();
        } else g.rect(x - sz / 2, y - sz / 2, sz, sz);
      };
      ctx.strokeStyle = col; ctx.lineWidth = lw; path(ctx); ctx.stroke();
      if (z < 0.2) { hot.strokeStyle = rgba(amber ? C.amber : C.ink, 0.5 * a); hot.lineWidth = 3; path(hot); hot.stroke(); }
    }
    ctx.restore(); hot.restore();
  }

  // ================================================================ built-in hero motifs
  // 1879: four lines in space and the two lines meeting all of them (lines slam in on the toms).
  const D2R = Math.PI / 180;
  const rL = (a, s) => [Math.cos(a) - s * Math.sin(a), Math.sin(a) + s * Math.cos(a), s];
  const lL = (b, s) => [Math.cos(b) + s * Math.sin(b), Math.sin(b) - s * Math.cos(b), s];
  const A3 = [-50, 5, 55].map(d => d * D2R);
  const L4p = [0.25, -1.3, 0.7], L4q = [0.22, 1.25, -0.65];
  const L4d = v3.sub(L4q, L4p);
  const L4u = (() => {
    const p = L4p, d = L4d;
    const qa = d[0] ** 2 + d[1] ** 2 - d[2] ** 2, qb = 2 * (p[0] * d[0] + p[1] * d[1] - p[2] * d[2]), qc = p[0] ** 2 + p[1] ** 2 - p[2] ** 2 - 1;
    const r = Math.sqrt(qb * qb - 4 * qa * qc);
    return [(-qb - r) / (2 * qa), (-qb + r) / (2 * qa)];
  })();
  const PIERCE = L4u.map(u => v3.add(L4p, v3.scale(L4d, u)));
  const TRANS = PIERCE.map(([x, y, z]) => Math.atan2(z * x + y, x - z * y));
  const meetZ = (a, b) => Math.tan((b - a) / 2);
  function linesHero(ctx, hot, t, e, box) {
    const toms = (BM.toms || []).filter(x => x >= e.t0 && x < e.t1);
    const hitT = toms.length >= 7 ? toms : [0.7, 1.17, 1.41, 1.64, 2.58, 3.05, 3.28, 3.52].map(x => e.t0 + x);
    const kz = box.w / 1000;                       // >1 on the stage, small in the finale wall
    const lw = clamp(kz, 0.5, 1.15);
    // The camera steps around the lines on the kicks, and drifts.
    let step = 0;
    (BM.kicks || []).forEach(kt => { if (kt > e.t0 && kt < e.t1) step += seg(t, kt, kt + 0.3, easeQ); });
    const az = (-42 + 3 * Math.min(step, 7) + 6 * seg(t, e.t0, e.t1)) * D2R;
    const R0 = 10.5, el = 12 * D2R;
    const cam = camera({ eye: [R0 * Math.cos(el) * Math.cos(az), R0 * Math.cos(el) * Math.sin(az), R0 * Math.sin(el)], target: [0.5, 0, 0],
      fov: 2 * Math.atan(Math.tan(15 * D2R) / Math.min(kz, box.h / 700)) / D2R, cx: box.x + box.w / 2, cy: box.y + box.h / 2 });
    const given = [[rL(A3[0], -2), rL(A3[0], 2)], [rL(A3[1], -2), rL(A3[1], 2)], [rL(A3[2], -2), rL(A3[2], 2)],
      [v3.add(L4p, v3.scale(L4d, -0.5)), v3.add(L4p, v3.scale(L4d, 1.5))]];
    given.forEach((g, i) => {
      const th = hitT[i];
      if (t < th) return;
      const q = seg(t, th, th + 0.16, easeQ);
      const m = v3.lerp(g[0], g[1], 0.5);
      const a = cam.project(v3.lerp(m, g[0], q)), b = cam.project(v3.lerp(m, g[1], q));
      ctx.strokeStyle = rgba(i === 3 ? C.cyan : C.ink, 0.95); ctx.lineWidth = 3 * lw;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // Each line is named as it lands.
      if (kz > 0.6) {
        const lp = cam.project(v3.lerp(m, g[1], 0.62 * q));
        U.math(ctx, `\\ell_${i + 1}`, lp.x + 18, lp.y - 14, 34, rgba(i === 3 ? C.cyan : C.ink, 0.85 * clamp(q * 1.5)), 'left');
      }
      const fl = Math.exp(-(t - th) / 0.12);
      if (fl > 0.02) { hot.strokeStyle = rgba(C.ink, 0.8 * fl); hot.lineWidth = 6 * lw; hot.beginPath(); hot.moveTo(a.x, a.y); hot.lineTo(b.x, b.y); hot.stroke(); }
    });
    // The fill toms after '= 2' make the meeting points pulse.
    const fillPop = hitT.slice(7).reduce((m, x) => Math.max(m, t >= x ? Math.exp(-(t - x) / 0.1) : 0), 0);
    // The two answers ignite on the next toms.
    [0, 1].forEach(k => {
      const th = hitT[4 + k];
      if (t < th) return;
      const q = seg(t, th, th + 0.22, easeQ);
      const b = TRANS[k], s0 = PIERCE[k][2];
      const a = cam.project(lL(b, lerp(s0, -2.1, q))), c = cam.project(lL(b, lerp(s0, 2.1, q)));
      hot.strokeStyle = rgba(C.amber, 1); hot.lineWidth = (4 + 4 * Math.exp(-(t - th) / 0.12)) * lw;
      hot.beginPath(); hot.moveTo(a.x, a.y); hot.lineTo(c.x, c.y); hot.stroke();
      [PIERCE[k], ...A3.map(a3 => rL(a3, meetZ(a3, b)))].forEach((P, j) => {
        const pp = cam.project(P);
        U.dot(hot, pp.x, pp.y, (j === 0 ? 7 : 5) * lw * (1 + 1.2 * fillPop), rgba(C.amberHot, q));
      });
    });
    // Cold open: the question fills the stage until the first line slams through it.
    if (kz > 0.6 && t < hitT[0] + 0.2) {
      const inq = seg(t, e.t0 - 0.45, e.t0, easeQ), outq = seg(t, hitT[0] - 0.02, hitT[0] + 0.16, easeIn);
      const z = lerp(1.0, 1.25, outq), a = inq * (1 - outq);
      if (a > 0.003) {
        const ccx = box.x + box.w / 2, ccy = box.y + box.h / 2;
        ctx.save(); ctx.translate(ccx, ccy); ctx.scale(z, z);
        ['HOW MANY LINES MEET', 'FOUR GENERAL LINES?'].forEach((ln, k) => {
          const HQ = fitHeadline(ctx, 'HOW MANY LINES MEET', 76, box.w * 0.8);
          kinetic(ctx, ln, -(() => { ctx.font = `900 ${HQ.size}px ${F.wide}`; ctx.fontStretch = HQ.stretch; return ctx.measureText(ln).width; })() / 2,
            (k - 0.5) * HQ.size * 1.15 + HQ.size * 0.35, HQ.size, rgba(k ? C.amber : C.ink, a), clamp(inq * 1.2 - k * 0.15), { font: `900 ${HQ.size}px ${F.wide}`, stretch: HQ.stretch, stagger: 0.45 });
        });
        ctx.restore();
      }
    }
    // The question lands on the downbeat after the fourth line and reads into the answer.
    const fs2 = Math.min(120, box.h * 0.16);
    const ax = box.x + box.w - fs2 * 0.58, ay = box.y + box.h - fs2 * 0.33;
    const qd = (BM.downbeats || []).find(d => d > hitT[3] + 0.05);
    if (kz > 0.6 && qd != null) {
      const qa = seg(t, qd, qd + 0.15);
      // A dark halo keeps it readable where the lines cross it.
      // Two lines in the empty right side of the stage, right-aligned with the answer below.
      ctx.save(); ctx.font = `600 28px ${F.mono}`; ctx.textAlign = 'right'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(5,7,12,${0.9 * qa})`; ctx.lineWidth = 9; ctx.fillStyle = rgba(C.ink, 0.88 * qa);
      ['HOW MANY LINES MEET', 'FOUR GENERAL LINES?'].forEach((ln, k) => { ctx.strokeText(ln, ax, box.y + 206 + k * 38); ctx.fillText(ln, ax, box.y + 206 + k * 38); });
      ctx.restore();
    }
    // '= 2' slams on tom 7; tom 8 kicks it once more.
    const two = hitT[6] ?? hitT[5] + 0.18;
    if (t > two) {
      const pop8 = hitT[7] != null && t >= hitT[7] ? Math.exp(-(t - hitT[7]) / 0.1) : 0;
      const q = seg(t, two, two + 0.12, easeQ), z = lerp(1.6, 1, q) * (1 + 0.15 * pop8);
      for (const g of [ctx, hot]) {
        g.save(); g.translate(ax, ay); g.scale(z, z);
        U.text(g, '= 2', 0, 0, `900 ${Math.round(fs2)}px ${F.display}`, rgba(C.amber, g === hot ? 0.25 : clamp(q * 2)), 'right');
        g.restore();
      }
    }
  }

  // 1982: the Schubert polynomials of S3, generated from the top by divided differences.
  const S3 = [
    { w: '321', p: 'x_1^2x_2', x: 0.5, y: 0.1 },
    { w: '231', p: 'x_1x_2', x: 0.22, y: 0.4 }, { w: '312', p: 'x_1^2', x: 0.78, y: 0.4 },
    { w: '213', p: 'x_1', x: 0.22, y: 0.7 }, { w: '132', p: 'x_1+x_2', x: 0.78, y: 0.7 },
    { w: '123', p: '1', x: 0.5, y: 0.97 },
  ];
  const S3E = [[0, 1, '\\partial_1'], [0, 2, '\\partial_2'], [1, 3, '\\partial_2'], [2, 4, '\\partial_1'], [3, 5, '\\partial_1'], [4, 5, '\\partial_2']];
  // Laid out for an 860x780 box; on the wide hero stage it spreads out at full size,
  // other boxes get a uniformly scaled, centred copy.
  function schubpolyHero(ctx, hot, t, e, box) {
    if (box.w >= 1000 && box.h >= 600) {
      const iw = Math.min(box.w, 1.75 * box.h);
      return schubpolyHeroCore(ctx, hot, t, e, { x: box.x + (box.w - iw) / 2, y: box.y, w: iw, h: box.h });
    }
    const k = Math.min(box.w / 860, box.h / 780);
    if (Math.abs(k - 1) < 1e-3 && Math.abs(box.w - 860) < 1) return schubpolyHeroCore(ctx, hot, t, e, box);
    for (const g of [ctx, hot]) { g.save(); g.translate(box.x + (box.w - 860 * k) / 2, box.y + (box.h - 780 * k) / 2); g.scale(k, k); }
    schubpolyHeroCore(ctx, hot, t, e, { x: 0, y: 0, w: 860, h: 780 });
    ctx.restore(); hot.restore();
  }
  function schubpolyHeroCore(ctx, hot, t, e, box) {
    const rank = [0, 1, 1, 2, 2, 3];
    const pos = S3.map(n => ({ x: box.x + n.x * box.w, y: box.y + 60 + n.y * (box.h - 120) }));
    // Giant fraktur S behind.
    const gs = 1 + 0.04 * Math.sin(t * 3);
    ctx.save(); ctx.globalAlpha = 0.10 * seg(t, e.t0, e.t0 + 0.2);
    U.math(ctx, '\\S', box.x + box.w / 2, box.y + box.h * 0.82, 760 * gs, rgba(C.amber, 1), 'center');
    ctx.restore();
    S3E.forEach(([a, b, lab]) => {
      const tq = e.t0 + 0.06 + rank[a] * BEAT * 0.5;
      const q = seg(t, tq, tq + 0.18, easeQ);
      if (q <= 0) return;
      const A = pos[a], Bp = pos[b];
      const x1 = lerp(A.x, Bp.x, 0.16), y1 = lerp(A.y, Bp.y, 0.16) + 26, x2 = lerp(A.x, Bp.x, 0.84), y2 = lerp(A.y, Bp.y, 0.84) - 30;
      ctx.strokeStyle = rgba(C.dim, 0.8); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, q), lerp(y1, y2, q)); ctx.stroke();
      if (q > 0.6) {
        // Off to the outside of the edge, perpendicular to it, so no line strikes through the label.
        const L = Math.hypot(x2 - x1, y2 - y1), nx = (y2 - y1) / L, ny = -(x2 - x1) / L, sg = Bp.x < A.x ? -1 : 1;
        const vert = Math.abs(x2 - x1) < 1;
        const lx = vert ? (x1 + x2) / 2 + (A.x < box.x + box.w / 2 ? -34 : 34) : (x1 + x2) / 2 - sg * 30 * nx;
        const ly = vert ? (y1 + y2) / 2 + 8 : (y1 + y2) / 2 + 10 - sg * 30 * ny;
        U.math(ctx, lab, lx, ly, 30, rgba(C.dim, 1), 'center', (q - 0.6) / 0.4);
      }
    });
    // After the cascade, a wave of sparks runs down the arrows on every beat:
    // the divided differences keep firing, and each node flashes as the wave lands.
    const kickP = pulse(BM.kicks, t, 0.1);
    const settle = e.t0 + 1.5 * BEAT + 0.25;
    const wave = t > settle ? ((t - settle) / BEAT % 1) * 3.2 : -1;
    const nodeHit = i => (wave >= 0 && rank[i] > 0 ? Math.exp(-Math.max(0, wave - rank[i]) * 3) * (wave >= rank[i] ? 1 : 0) : 0);
    if (wave >= 0) S3E.forEach(([a, b]) => {
      const f = wave - rank[a];
      if (f < 0 || f > 1) return;
      const A = pos[a], Bp = pos[b];
      const x1 = lerp(A.x, Bp.x, 0.16), y1 = lerp(A.y, Bp.y, 0.16) + 26, x2 = lerp(A.x, Bp.x, 0.84), y2 = lerp(A.y, Bp.y, 0.84) - 30;
      const q = easeQ(f), px = lerp(x1, x2, q), py = lerp(y1, y2, q);
      hot.strokeStyle = rgba(C.amber, 0.9); hot.lineWidth = 3;
      hot.beginPath(); hot.moveTo(lerp(x1, x2, Math.max(0, q - 0.25)), lerp(y1, y2, Math.max(0, q - 0.25))); hot.lineTo(px, py); hot.stroke();
      U.dot(hot, px, py, 6, rgba(C.amberHot, 1));
    });
    S3.forEach((n, i) => {
      const tq = e.t0 + rank[i] * BEAT * 0.5;
      const q = seg(t, tq, tq + 0.2, ease.back) * (1 + 0.05 * kickP + 0.08 * nodeHit(i));
      if (q <= 0) return;
      const { x, y } = pos[i];
      const hit = nodeHit(i);
      if (hit > 0.02) { hot.save(); hot.translate(x, y); hot.scale(q, q); U.math(hot, n.p, 0, 52, 54, rgba(C.amber, 0.45 * hit), 'center'); hot.restore(); }
      ctx.save(); ctx.translate(x, y); ctx.scale(q, q);
      U.math(ctx, `\\S_{${n.w}}`, 0, n.p.includes('^') ? -24 : -6, 34, rgba(C.dim, 1), 'center');
      const big = box.w >= 1000 ? (i === 0 ? 72 : 62) : (i === 0 ? 62 : 54);
      U.math(ctx, n.p, 0, 52, big, rgba(i === 0 ? C.amber : C.ink, 1), 'center');
      ctx.restore();
      if (i === 0) { hot.save(); hot.translate(x, y); hot.scale(q, q); U.math(hot, n.p, 0, 52, big, rgba(C.amber, 0.3), 'center'); hot.restore(); }
    });
  }

  // ================================================================ entry rendering
  function drawMotif(g, gh, t, e, p, kick, local, dur, box) {
    if (e.motif === 'lines4') linesHero(g, gh, t, e, box);
    else if (e.motif === 'schubpoly') schubpolyHero(g, gh, t, e, box);
    else if (MOTIFS[e.motif]) MOTIFS[e.motif].draw(g, gh, p, kick, MOTIF_ENV(local, dur, BEAT), box);
    else U.text(g, `[${e.motif}]`, box.x + box.w / 2, box.y + box.h / 2, `30px ${F.mono}`, rgba(C.dim, 1), 'center');
  }
  function drawEntry(t, e, kick, acc, hook, sec, stageZ = 0) {
    const local = t - e.t0, dur = e.t1 - e.t0, p = clamp(local / dur);
    const hero = e.kind === 'hero', flash = e.kind === 'flash';
    const box = hero ? HERO : STAGE;
    mot.clearRect(0, 0, W, H); motHot.clearRect(0, 0, W, H);
    for (const g of [mot, motHot]) { g.save(); g.beginPath(); g.rect(0, BAND[0], W, BAND[1] - BAND[0]); g.clip(); }
    // The motif clock runs ahead on the cut and catches up with real time by the next beat,
    // so the object is already on stage when the hit lands (beat-locked events do not move).
    const PRE = 0.14, mLocal = local + PRE * (1 - clamp(local / BEAT)), mp = clamp(mLocal / dur);
    try { drawMotif(mot, motHot, t, e, mp, kick, mLocal, dur, box); }
    catch (err) { U.text(mot, `[${e.motif}]`, box.x + box.w / 2, box.y + box.h / 2, `30px ${F.mono}`, rgba(C.red, 1), 'center'); }
    mot.restore(); motHot.restore();
    // Soft top edge: lines running off-stage fade out instead of ending on a matte line.
    for (const g of [mot, motHot]) {
      g.save(); g.globalCompositeOperation = 'destination-in';
      const fg = g.createLinearGradient(0, BAND[0], 0, BAND[0] + 60);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, '#000');
      g.fillStyle = fg; g.fillRect(0, 0, W, H); g.restore();
    }
    // Entrance, by section: slides in the verse, whips in the drops, soft zooms in the break.
    // Already well under way on the beat frame, so the cut lands on the hit.
    const inQ = seg(local, -0.06, flash ? 0.06 : 0.12, easeQ);
    const dir = e.i % 2 ? 1 : -1;
    const style = sec === 'drop' || sec === 'drop2' || sec === 'run' ? 'whip' : sec === 'brk' ? 'zoom' : 'slide';
    // Every fourth card rises vertically; cards that land on a crash punch through the lens.
    const vert = e.i % 4 === 1 && style !== 'zoom';
    const onCrash = !hero && (BM.crashes || []).some(c => Math.abs(snap(c) - e.t0) < 0.01);
    const amp = (style === 'whip' ? 240 : style === 'slide' ? 110 : 0) * (1 - inQ) * dir;
    const ox = vert ? 0 : amp, oy = vert ? amp * 0.65 : 0;
    const sc = (onCrash ? lerp(1.45, 1, inQ) : style === 'whip' ? lerp(1.09, 1, inQ) : style === 'zoom' ? lerp(0.9, 1, inQ) : lerp(1.03, 1, inQ)) * (1 + stageZ);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    for (const [g, src] of [[scene, motC], [hot, motHotC]]) {
      g.save(); g.globalAlpha = clamp(inQ * 2);
      g.translate(cx + ox, cy + oy); g.scale(sc, sc); g.translate(-cx, -cy);
      g.drawImage(src, 0, 0);
      // Ignite: the new visual blooms on the hit.
      if (g === hot && local < 0.15) { g.globalAlpha = 0.32 * Math.exp(-local / 0.04); g.drawImage(motC, 0, 0); }
      g.restore();
    }
    drawLowerThird(e, e.motif === 'lines4' ? t - ((BM.toms || [])[0] ?? e.t0) : local, acc, hook, hero, flash);
    return { box, p };
  }

  function drawLowerThird(e, local, acc, hook, hero, flash) {
    const nameQ = seg(local, -0.06, flash ? 0.10 : 0.2);
    const name = e.name.toUpperCase();
    const HL = fitHeadline(ui, name, hero ? 56 : 50, LT.w);
    kinetic(ui, name, LT.x0, LT.headY, HL.size, rgba(C.ink, 1), nameQ, { font: `900 ${HL.size}px ${F.wide}`, stretch: HL.stretch, stagger: 0.5 });
    // Accent bar between the year and the text grows up from the baseline; it kicks on the melody.
    const ul = seg(local, -0.05, 0.2, easeQ), bh = LT.barBot - LT.barTop;
    ui.fillStyle = rgba(acc, 0.95); ui.fillRect(LT.barX, LT.barBot - bh * ul, 4 + 2 * hook, bh * ul);
    // Citations: one wide column, or two side by side.
    const n = e.cites.length, gapC = 44, colW = n > 1 ? (LT.w - gapC) / 2 : LT.w;
    e.cites.forEach((c, j) => {
      const x = LT.x0 + j * (colW + gapC), y = LT.citeY;
      const c0 = flash ? 0.02 + j * 0.04 : 0.08 + j * 0.07;
      const cq = seg(local, c0, c0 + (flash ? 0.10 : 0.22), easeQ);
      if (cq <= 0) return;
      ui.save();
      ui.beginPath(); ui.rect(x - 4, y - 28, (colW + 12) * cq, 150); ui.clip();
      // Authors (mono caps, accent), shrunk only if they would overflow the column.
      let as = 21;
      ui.letterSpacing = '1.5px';
      for (; as > 15; as -= 1) { ui.font = `600 ${as}px ${F.mono}`; if (ui.measureText(c[0].toUpperCase()).width <= colW) break; }
      ui.fillStyle = rgba(acc, 0.95);
      ui.fillText(c[0].toUpperCase(), x, y);
      ui.letterSpacing = '0px';
      // Title (serif italic, up to two balanced lines).
      ui.font = `italic 31px ${F.serif}`;
      const lines = wrap(ui, c[1], colW, 2);
      ui.fillStyle = rgba(C.ink, 0.95);
      lines.forEach((ln, k) => ui.fillText(ln, x, y + 34 + k * 33));
      // Venue, then the year in bold accent.
      const vy = y + 34 + (lines.length - 1) * 33 + 31;
      const cut = c[2].lastIndexOf(' · ');
      const venue = cut >= 0 ? c[2].slice(0, cut + 3) : c[2] + ' ', yr = cut >= 0 ? c[2].slice(cut + 3) : '';
      ui.font = `500 21px ${F.mono}`;
      ui.fillStyle = rgba(C.ink, 0.82);
      ui.fillText(venue, x, vy);
      const vw = ui.measureText(venue).width;
      ui.font = `700 21px ${F.mono}`;
      ui.fillStyle = rgba(acc, 1);
      ui.fillText(yr, x + vw, vy);
      ui.restore();
    });
  }

  // ================================================================ interstitials
  function rollPulse(t) {
    const roll = (BM.rolls || []).find(([a, b]) => t >= a && t < b && b - a > BEAT * 1.5);
    if (!roll) return 1;
    const ph = (((t - roll[0]) % (BEAT / 4)) + BEAT / 4) % (BEAT / 4);
    return Math.exp(-ph / 0.035);
  }
  // Big centred words that slam in one per beat, ending on the beat before the silence.
  function slamWords(t, words, beats, y, size, colors) {
    const HL = fitHeadline(scene, words.join(' '), size, 1560);
    scene.font = `900 ${HL.size}px ${F.wide}`; scene.fontStretch = HL.stretch;
    const sp = scene.measureText(' ').width;
    const widths = words.map(w => scene.measureText(w).width);
    let wx = CX - (widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1)) / 2;
    words.forEach((w, k) => {
      const tw = beats[k], wq = seg(t, tw, tw + 0.1, easeQ);
      if (wq > 0) {
        for (const g of [scene, hot]) {
          if (g === hot && t - tw > 0.5) continue;
          g.save(); g.font = `900 ${HL.size}px ${F.wide}`; g.fontStretch = HL.stretch;
          g.translate(wx + widths[k] / 2, y); const z = lerp(1.3, 1, wq); g.scale(z, z);
          g.textAlign = 'center';
          g.fillStyle = g === hot ? rgba(colors[k], 0.7 * Math.exp(-(t - tw) / 0.1)) : rgba(colors[k], clamp(wq * 2));
          g.fillText(w, 0, 0); g.restore();
        }
      }
      wx += widths[k] + sp;
    });
  }
  function caption(t, I, text) {
    U.text(ui, text, LT.x0, LT.headY + 8, `italic 40px ${F.serif}`, rgba(C.ink, 0.9 * seg(t, I.t0 + 0.15, I.t0 + 0.45)));
    const ul = seg(t, I.t0, I.t0 + 0.25, easeQ), bh = LT.barBot - LT.barTop;
    ui.fillStyle = rgba(C.dim, 0.7); ui.fillRect(LT.barX, LT.barBot - bh * ul, 3, bh * ul);
  }
  // Before 1982: the counter accelerates, a tunnel of boxes rushes past, the words slam in.
  function turnScene(t, I) {
    const q = seg(t, I.t0, I.t1);
    const zq = seg(t, I.t0, I.t0 + 4 * BEAT, easeIn);
    if (zq < 1) {
      const fe = I.from, fd = fe.t1 - fe.t0;
      mot.clearRect(0, 0, W, H); motHot.clearRect(0, 0, W, H);
      try { drawMotif(mot, motHot, t, fe, 1, 0, fd, fd, fe.kind === 'hero' ? HERO : STAGE); } catch (err) { /* keep going */ }
      scene.save(); scene.beginPath(); scene.rect(0, BAND[0], W, BAND[1] - BAND[0]); scene.clip();
      scene.globalAlpha = (1 - zq) ** 1.5;
      const z = lerp(1.044, 3, zq); scene.translate(CX, CY); scene.scale(z, z); scene.translate(-CX, -CY);
      scene.drawImage(motC, 0, 0); scene.restore();
    }
    tunnel(scene, t, I.t0, q, 'box', rollPulse(t), 77);
    slamWords(t, ['THE', 'COMBINATORIAL', 'TURN'], [I.t1 - 3 * BEAT, I.t1 - 2 * BEAT, I.t1 - BEAT].map(snap), CY + 40, 128, [C.ink, C.ink, C.amber]);
    caption(t, I, 'Algebra becomes combinatorics: tableaux, words, diagrams.');
  }
  // Before 2003: every coefficient is positive by geometry. But what does it count?
  const COUNT_WORDS = ['TABLEAUX', 'HONEYCOMBS'];
  function countScene(t, I) {
    const q = seg(t, I.t0, I.t1);
    tunnel(scene, t, I.t0, q, 'tri', rollPulse(t), 31);
    const fq = seg(t, I.t0, I.t0 + 0.2, easeQ);
    const size = 150;
    // c^nu_{lambda mu} = #[slot]   (the slot cycles faster and faster, then freezes on a red '?')
    const lhs = 'c^{\\nu}_{\\lambda\\mu}\\,=\\,\\#';
    const wl = U.math(scene, lhs, 0, 0, size, 'rgba(0,0,0,0)', 'left', 0);
    const QT = snap(I.t1 - BEAT), qmark = t >= QT;
    const tf = Math.floor(t * 60 + 1e-6) / 60;                       // one word per frame, never two
    const sub = Math.floor(Math.max(0, tf - I.t0) / (BEAT / 4));
    const ticks = sub < 4 ? Math.floor(sub / 2) : sub - 2;          // eighths, then sixteenths
    const word = qmark ? '?' : COUNT_WORDS[ticks % COUNT_WORDS.length];
    scene.font = `900 112px ${F.wide}`; scene.fontStretch = 'semi-condensed';
    const wMax = Math.max(...COUNT_WORDS.map(w => scene.measureText(w).width));
    const ww = lerp(wMax, 90, seg(t, QT, QT + 0.12, easeQ));
    const GAPW = 44, x0 = CX - (wl + GAPW + ww) / 2, y = CY + 50;
    scene.save(); scene.translate(CX, y); scene.scale(lerp(0.92, 1, fq), lerp(0.92, 1, fq)); scene.translate(-CX, -y);
    U.math(scene, lhs, x0, y, size, rgba(C.ink, 1), 'left', fq);
    const flick = Math.exp(-(((t - I.t0) % (BEAT / 4)) + BEAT / 4) % (BEAT / 4) / 0.04);
    if (qmark) {
      const z = lerp(1.4, 1, seg(t, QT, QT + 0.1, easeQ));
      for (const g of [scene, hot]) {
        g.save(); g.translate(x0 + wl + GAPW + 45, y); g.scale(z, z);
        U.text(g, '?', 0, 0, `900 ${size}px ${F.display}`, rgba(C.red, g === hot ? 0.3 : 1), 'center');
        g.restore();
      }
    } else {
      scene.font = `900 112px ${F.wide}`; scene.fontStretch = 'semi-condensed';
      scene.fillStyle = rgba(C.amber, (0.55 + 0.45 * flick) * fq);
      scene.textAlign = 'left'; scene.fillText(word, x0 + wl + GAPW, y);
    }
    scene.restore();
    caption(t, I, 'Positive by geometry. Counted by tableaux, by honeycombs, and next by…');
  }
  // The silent beat before each drop: a line of light; before the puzzles, it draws a triangle.
  function lightScene(t, g, idx) {
    const q = seg(t, g[0], g[1]);
    scene.fillStyle = 'rgba(0,0,0,0.82)'; scene.fillRect(0, 0, W, H);
    if (idx === 0) {
      const w = 40 + 1500 * easeIn(q);
      hot.fillStyle = rgba(C.amber, 0.9); hot.fillRect(W / 2 - w / 2, H / 2 - 1.5, w, 3);
      scene.fillStyle = rgba(C.amberHot, 1); scene.fillRect(W / 2 - w / 2, H / 2 - 1, w, 2);
    } else {
      // Same centre and size as the puzzle hero's opening outline, so the light hands straight over to it.
      const R0 = 255, pts = [0, 1, 2].map(k => [CX + R0 * Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 3), CY + R0 * Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 3)]);
      const total = easeIn(clamp(q / 0.85)) * 3;
      for (const [g2, col, lw] of [[hot, rgba(C.cyan, 0.9), 4], [scene, rgba(C.ink, 1), 2]]) {
        g2.strokeStyle = col; g2.lineWidth = lw; g2.beginPath(); g2.moveTo(...pts[0]);
        for (let k = 0; k < 3; k++) {
          const f = clamp(total - k);
          if (f <= 0) break;
          const A = pts[k], B = pts[(k + 1) % 3];
          g2.lineTo(lerp(A[0], B[0], f), lerp(A[1], B[1], f));
        }
        g2.stroke();
      }
    }
  }
  function stopScene(t) {
    const q = seg(t, STOP[0], STOP[1]);
    scene.fillStyle = 'rgba(3,4,7,0.86)'; scene.fillRect(0, 0, W, H);
    const s = lerp(1.35, 1, easeQ(seg(q, 0, 0.12))) * (1 + 0.05 * q);
    for (const g of [scene, hot]) {
      g.save(); g.translate(W / 2, H / 2 + 40); g.scale(s, s);
      U.text(g, '?', 0, 120, `900 380px ${F.display}`, rgba(C.red, g === hot ? 0.3 : 1), 'center');
      g.restore();
    }
    U.text(scene, 'AND NOW?', W / 2, 872, `600 40px ${F.mono}`, rgba(C.ink, 0.9 * seg(q, 0.08, 0.25)), 'center');
  }

  // ================================================================ finale
  // The wall of history: every motif of the film, tiled behind the title, and one red '?' tile.
  const wallC = makeCanvas(), wall = wallC.getContext('2d');
  const wallHotC = makeCanvas(), wallHot = wallHotC.getContext('2d');
  function drawWall(t, local, boom) {
    const n = ENTRIES.length + 1, rows = 4, cols = Math.ceil(n / rows), gw = W / cols, gh = H / rows;
    wall.clearRect(0, 0, W, H); wallHot.clearRect(0, 0, W, H);
    wall.lineCap = wallHot.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const cx = (c + 0.5) * gw, cy = (r + 0.5) * gh;
      const d = Math.hypot((c - (cols - 1) / 2) / cols, (r - (rows - 1) / 2) / rows);
      const q = seg(local, d * 0.35, d * 0.35 + 0.3, ease.back);
      if (q <= 0) continue;
      const bw = gw * 0.84, bh = gh * 0.8;
      const box = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
      const ly = r === rows - 1 ? box.y + box.h - 6 : box.y + 22;
      wall.save(); wallHot.save();
      for (const g of [wall, wallHot]) {
        g.translate(cx, cy); g.scale(q, q); g.translate(-cx, -cy);
        g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip();   // nothing spills into a neighbour
      }
      if (i < ENTRIES.length) {
        const e = ENTRIES[i];
        const fake = Object.assign({}, e, { t0: t - 20, t1: t - 12.5 });
        try { drawMotif(wall, wallHot, t, fake, 1, 0, e.t1 - e.t0, e.t1 - e.t0, box); } catch (err) { /* a broken motif must not break the finale */ }
        U.text(wall, String(e.year), box.x + 6, ly, `800 22px ${F.display}`, rgba(C.ink, 0.9));
      } else {
        // The last tile is the open problem.
        const z = 1 + 0.12 * boom;
        for (const g of [wall, wallHot]) {
          g.save(); g.translate(cx, cy + bh * 0.18); g.scale(z, z);
          U.text(g, '?', 0, 0, `900 ${Math.round(bh * 0.62)}px ${F.display}`, rgba(C.red, g === wallHot ? 0.35 : 1), 'center');
          g.restore();
        }
        U.text(wall, 'NEXT', box.x + 6, ly, `800 22px ${F.display}`, rgba(C.red, 0.9));
      }
      wall.restore(); wallHot.restore();
    }
    // Slow pull-back after the hit.
    const z = lerp(1.08, 1.0, seg(local, 0, 3, ease.soft));
    scene.save();
    scene.translate(W / 2, H / 2); scene.scale(z, z); scene.translate(-W / 2, -H / 2);
    scene.globalAlpha = 0.36; scene.drawImage(wallC, 0, 0);
    scene.globalAlpha = 0.24; scene.drawImage(wallHotC, 0, 0);
    scene.restore();
    // Darken the centre band so the title reads.
    const g = scene.createLinearGradient(0, 270, 0, 930);
    g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(0.15, 'rgba(5,7,12,0.86)'); g.addColorStop(0.85, 'rgba(5,7,12,0.86)'); g.addColorStop(1, 'rgba(5,7,12,0)');
    scene.fillStyle = g; scene.fillRect(0, 270, W, 660);
  }

  function finalScene(t, boom) {
    const local = t - FINAL;
    drawWall(t, local, boom);
    // The title group pushes in slowly after the hit.
    const tz = 1 + 0.035 * seg(local, 0, END - FINAL, ease.soft);
    for (const g of [scene, hot]) { g.save(); g.translate(W / 2, 470); g.scale(tz, tz); g.translate(-W / 2, -470); }
    const q = seg(local, 0, 0.26, easeQ);
    const title = FIN.title.toUpperCase();
    const TL = fitHeadline(scene, title, 150, 1640);
    scene.font = `900 ${TL.size}px ${F.wide}`; scene.fontStretch = TL.stretch;
    const tw = scene.measureText(title).width;
    kinetic(scene, title, W / 2 - tw / 2, 430, TL.size, rgba(C.ink, 1), q, { font: `900 ${TL.size}px ${F.wide}`, stretch: TL.stretch, stagger: 0.35 });
    const bar = seg(local, 0.1, 0.4, easeQ);
    hot.fillStyle = rgba(C.amber, 1); hot.fillRect(W / 2 - 260 * bar, 470, 520 * bar, 4);
    scene.fillStyle = rgba(C.amberHot, 1); scene.fillRect(W / 2 - 260 * bar, 471, 520 * bar, 2);
    U.text(scene, `${FIN.span.toUpperCase()}  ·  ${ENTRIES.length} MILESTONES`, W / 2, 528, `600 26px ${F.mono}`, rgba(C.ink, 0.9 * seg(local, 0.15, 0.4)), 'center');
    scene.restore(); hot.restore();

    // The frontier lands on the next beat: the question and the product it is about.
    const qb = snap(FINAL + BEAT);
    const fq = seg(t, qb - 0.04, qb + 0.12, easeQ);
    if (fq > 0) {
      const y = 626 + (1 - fq) * 20;
      U.text(scene, FIN.question, W / 2, y, `italic 42px ${F.serif}`, rgba(C.ink, 0.95 * fq), 'center');
      const [fa, fc, fb] = FIN.formula;
      const fs = 76, w1 = U.math(scene, fa, 0, 0, fs, 'rgba(0,0,0,0)', 'left', 0), w2 = U.math(scene, fc, 0, 0, fs, 'rgba(0,0,0,0)', 'left', 0),
        w3 = U.math(scene, fb, 0, 0, fs, 'rgba(0,0,0,0)', 'left', 0);
      const x = W / 2 - (w1 + w2 + w3) / 2, fy = y + 104;
      const cz = 1 + 0.12 * boom, ccx = x + w1 + w2 / 2, ccy = fy - fs * 0.3;
      U.math(scene, fa, x, fy, fs, rgba(C.ink, 0.9), 'left', fq);
      for (const g of [scene, hot]) {
        g.save(); g.translate(ccx, ccy); g.scale(cz, cz); g.translate(-ccx, -ccy);
        U.math(g, fc, x + w1, fy, fs, rgba(C.red, g === hot ? 0.5 : 1), 'left', fq);
        g.restore();
      }
      U.math(scene, fb, x + w1 + w2, fy, fs, rgba(C.ink, 0.9), 'left', fq);
    }
    // The verdict stamps on the first heartbeat.
    const sb = (BM.booms && BM.booms[0]) || snap(FINAL + 2 * BEAT), sq = seg(t, sb, sb + 0.14, ease.back);
    if (t >= sb) {
      for (const g of [scene, hot]) {
        g.save(); g.translate(W / 2, 862); const z = lerp(1.5, 1, sq) * (1 + 0.06 * boom); g.scale(z, z);
        g.font = `900 64px ${F.wide}`; g.fontStretch = 'expanded'; g.letterSpacing = '4px';
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillStyle = g === hot ? rgba(C.red, 0.6 * (1 - 0.6 * sq)) : rgba(C.red, clamp(sq * 3));
        g.fillText(FIN.status.toUpperCase(), 0, 0);
        g.letterSpacing = '0px'; g.restore();
      }
    }
  }

  // ================================================================ frame
  const RUN0 = ENTRIES.findIndex(x => x.t0 >= RUN - 0.01);
  // Heroes that do not already land on an impact get a hit of their own (the 1993 RC-graphs).
  const HERO_HITS = ENTRIES.filter(x => x.kind === 'hero' && !(BM.impacts || []).some(i => Math.abs(snap(i) - x.t0) < 0.01)).map(x => x.t0);
  function seek(t) {
    const sec = section(t);
    const drop = inDrop(t);
    const kick = pulse(BM.kicks, t, drop ? 0.1 : 0.12);
    const clap = pulse(BM.claps, t, 0.08);
    // The opening boom hits on frame 1: frame 0 is the poster frame (the cold-open question).
    const impact = pulse((BM.impacts || []).map(x => x || 1 / 60), t, 0.16);
    const crash = pulse(BM.crashes, t, 0.2);
    const heroHit = pulse(HERO_HITS, t, 0.1);
    const tom = pulse(BM.toms, t, 0.09);
    const boom = pulse(BM.booms, t, 0.14);
    const hook = drop ? pulse(BM.hook, t, 0.07) : 0;
    const rollOn = (BM.rolls || []).some(([a, b]) => t >= a && t < b);

    const e = entryAt(t), I = interAt(t), light = lightAt(t);
    const eraName = sec === 'stop' || sec === 'final' ? 'frontier' : e ? e.era : I ? I.to.era : 'revolution';
    const era = ERA[eraName];
    const prevEra = e && e.i > 0 ? ERA[ENTRIES[e.i - 1].era] : era;
    const blendQ = e ? seg(t, e.t0, e.t0 + 0.25) : 1;
    const eraMix = { glow: mixc(prevEra.glow, era.glow, blendQ), acc: mixc(prevEra.acc, era.acc, blendQ) };
    const acc = eraMix.acc;

    hot.clearRect(0, 0, W, H); ui.clearRect(0, 0, W, H);
    drawBackground(scene, t, eraMix, kick, sec);
    // Stage camera: a slow push-in through every entry and a jump-zoom at its half; the cut resets it.
    const mid = e && e.len >= 4 ? snap(bt(e.b + e.len / 2)) : Infinity;
    const jump = t >= mid ? 0.022 + 0.014 * Math.exp(-(t - mid) / 0.06) : 0;
    const push = e ? 0.022 * ease.soft(seg(t, e.t0, e.t1)) : 0;
    const run = e && RUN0 >= 0 && e.i >= RUN0 ? e.i - RUN0 + 1 : 0;
    speedLines(scene, t, (I ? seg(t, I.t0, I.t1) * 0.9 : 0) + (drop ? 0.3 * kick : 0) + 0.12 * run, 5, run && e.i % 2 ? 1 : -1);

    const v = yearValue(t);
    if (light) lightScene(t, light, LIGHTS.indexOf(light));
    else if (sec === 'stop') stopScene(t);
    else if (sec === 'final') finalScene(t, boom);
    else if (e) drawEntry(t, e, kick, acc, hook, sec, push + jump);
    else if (I) (I.kind === 'count' ? countScene : turnScene)(t, I);

    if (!light && sec !== 'stop' && sec !== 'final') {
      drawYear(t, v, e, acc, true);                   // digits blur only while they roll
      const idx = e ? e.i + 1 : lastEntryBefore(t) ? lastEntryBefore(t).i + 1 : 0;
      drawTopBar(ui, t, v, acc, kick, hook, idx);
    }

    // Downbeat shockwaves in the drops: a thin ring from the stage centre on every bar.
    if (drop) (BM.downbeats || []).forEach(d => {
      const age = t - d;
      if (age < 0 || age > 0.6 || !inDrop(d)) return;
      const q = age / 0.6;
      U.ring(hot, CX, CY, 70 + 760 * easeQ(q), rgba(acc, (sec === 'drop' ? 0.32 : 0.45) * (1 - q)), 2);
    });
    // Explosions on impacts and crashes (kept off the lower third until the finale).
    hot.save();
    if (t < FINAL) { hot.beginPath(); hot.rect(0, 0, W, BAND[1] + 20); hot.clip(); }
    (BM.impacts || []).forEach((ti, j) => burst(hot, t, ti || 1 / 60, 900 + j, CX, ti >= FINAL ? 470 : CY, ti === 0 ? 50 : 110, [C.amber, C.ink, C.amberHot], ti >= FINAL ? 1.3 : 1));
    (BM.crashes || []).forEach((ti, j) => { if (!(BM.impacts || []).some(x => Math.abs(x - ti) < 0.01)) burst(hot, t, ti, 700 + j, CX, CY, 80, ti >= DROP2 ? [C.cyan, C.ink] : [C.amber, C.ink], 0.9); });
    HERO_HITS.forEach((ti, j) => burst(hot, t, ti, 500 + j, CX, CY, 70, [C.amber, C.ink], 0.8));
    hot.restore();

    // ---------------------------------------------------------------- composite
    scene.drawImage(hotC, 0, 0);
    bloom(scene, hotC, 6, 0.6);
    bloom(scene, hotC, 26, 0.45 + 0.25 * hook + (sec === 'brk' ? 0.1 * Math.sin(t * Math.PI / (2 * BEAT)) : 0));
    bloom(scene, hotC, 64, 0.3);

    // Camera: punches on kicks, shakes on hits, chromatic split on the big ones.
    // Drop B and the run hit harder than drop A.
    const kp = sec === 'drop2' || sec === 'run' ? 0.026 : drop ? 0.02 : sec === 'brk' ? 0.006 : sec === 'intro' ? 0.008 : 0.011;
    let punch = kp * kick + 0.05 * impact + 0.04 * crash + 0.01 * tom + 0.03 * heroHit;
    // Snare rolls into the drops: a sixteenth-note buzz that grows towards the silent beat.
    const longRoll = (BM.rolls || []).find(([a, b]) => b - a > BEAT * 1.5 && t >= a && t < b);
    if (longRoll) punch += 0.006 * seg(t, longRoll[0], longRoll[1]) * rollPulse(t);
    // One-beat fills suck the frame in; the next crash snaps it back out.
    const fill = (BM.rolls || []).find(([a, b]) => b - a <= BEAT + 0.01 && t >= a && t < b);
    const suck = fill ? seg(t, fill[0], fill[1], easeIn) : 0;
    // The final run steps the frame in, one notch per cut, then inhales into the stop.
    let runZ = 0.008 * run;
    const last = ENTRIES[ENTRIES.length - 1];
    if (run && e === last) runZ -= 0.07 * seg(t, last.t0, STOP[0], easeIn);
    const sr = rng(Math.round(t * 60) * 13 + 5);   // all blur sub-samples of a frame share one shake
    const shakeA = 2.5 * clap * (drop ? 1 : 0.4) + 20 * impact + 10 * crash + 6 * tom + (rollOn ? 2 : 0) + 3 * boom;
    const sx = (sr() - 0.5) * 2 * shakeA, sy = (sr() - 0.5) * 2 * shakeA;
    const split = 14 * impact + 9 * crash + 7 * heroHit + (drop ? 2.5 * kick : 0) + 0.8 * run * kick;
    // Camera rock: each bar of the drops tilts the frame the other way and springs back.
    let rock = 0;
    if (drop) (BM.downbeats || []).forEach((d, j) => {
      const age = t - d;
      if (inDrop(d) && age >= 0 && age < 0.9) rock = (j % 2 ? 1 : -1) * 0.007 * Math.exp(-age / 0.22) * Math.cos(age * 14);
    });
    const zoom = 1 + punch + runZ - 0.05 * suck;
    out.save();
    out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
    out.translate(W / 2 + sx, H / 2 + sy); out.rotate(rock); out.scale(zoom, zoom); out.translate(-W / 2, -H / 2);
    if (split > 0.6) {
      // Isolate channels and offset red and blue.
      const chans = [['rgb(255,0,0)', -split, 0], ['rgb(0,255,0)', 0, 0], ['rgb(0,0,255)', split, 0]];
      out.globalCompositeOperation = 'lighter';
      chans.forEach(([col, dx, dy]) => {
        tmp.globalCompositeOperation = 'source-over'; tmp.drawImage(sceneC, 0, 0);
        tmp.globalCompositeOperation = 'multiply'; tmp.fillStyle = col; tmp.fillRect(0, 0, W, H);
        out.drawImage(tmpC, dx, dy);
      });
      tmp.globalCompositeOperation = 'source-over';
    } else {
      out.drawImage(sceneC, 0, 0);
    }
    out.restore();
    // Glitch slices: only over the interstitials' snare rolls, ramping up, never over the lower third.
    if (rollOn && I && !e) {
      const gq = seg(t, I.t0, I.t1, easeIn);
      const gr = rng(Math.floor(t * 30 + 0.25) * 7 + 3);
      for (let i = 0; i < 6; i++) {
        if (gr() > 0.15 + 0.6 * gq) continue;
        const y = 100 + gr() * 640, h = 8 + gr() * 50, dx = (gr() - 0.5) * 80;
        out.drawImage(out.canvas, 0, y, W, h, dx, y, W, h);
      }
    }
    // The chrome (year, lower third, top bar) sits above the camera: it only breathes with the zoom.
    const uz = 1 + 0.3 * (zoom - 1);
    out.save(); out.translate(W / 2, H / 2); out.scale(uz, uz); out.translate(-W / 2, -H / 2); out.drawImage(uiC, 0, 0); out.restore();
    // Flashes (none on the very first frame: it is the poster frame).
    const flash = 0.85 * pulse((BM.impacts || []).filter(x => x > 0), t, 0.055) + 0.28 * pulse(BM.crashes, t, 0.05) + 0.2 * pulse(HERO_HITS, t, 0.05) + (drop ? 0.06 * clap : 0.025 * clap);
    if (flash > 0.003) { out.fillStyle = `rgba(255,248,235,${clamp(flash)})`; out.fillRect(0, 0, W, H); }
    // Vignette, fade out, grain.
    const vg = out.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    out.fillStyle = vg; out.fillRect(0, 0, W, H);
    const fade = seg(t, END - 0.6, END);
    if (fade > 0) { out.fillStyle = `rgba(0,0,0,${fade})`; out.fillRect(0, 0, W, H); }
    if (GRAIN > 0) drawGrain(out, t, GRAIN);
  }

  // ================================================================ boot
  async function boot() {
    const fonts = ['900 100px "Big Shoulders Display"', '100px Anton', '900 100px Archivo', 'italic 100px "Instrument Serif"', '100px "Instrument Serif"',
      '500 40px "JetBrains Mono"', '600 40px "JetBrains Mono"', '40px KaTeX_Main', 'italic 40px KaTeX_Math', '40px KaTeX_Fraktur', '40px KaTeX_AMS', '40px KaTeX_Size1', '600 40px Inter'];
    await Promise.all(fonts.map(f => document.fonts.load(f)));
    // Load every motif referenced by the timeline.
    const ids = [...new Set(ENTRIES.map(e => e.motif))].filter(id => id !== 'lines4' && id !== 'schubpoly');
    await Promise.all(ids.map(id => new Promise(res => {
      const s = document.createElement('script'); s.src = `motifs/${id}.js`; s.onload = res; s.onerror = res; document.body.appendChild(s);
    })));
    scene.lineCap = hot.lineCap = mot.lineCap = motHot.lineCap = 'butt';
    window.seek = seek;
    window.__film = { entries: ENTRIES.map(e => ({ year: e.year, name: e.name, t0: e.t0, t1: e.t1 })), DROP, DROP2, FINAL, STOP, END, INTER: INTER.map(I => [I.kind, I.t0, I.t1]) };
    seek(0);
    window.__ready = true;
  }
  boot();
})();
