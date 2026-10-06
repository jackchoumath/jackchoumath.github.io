// Schubert Calculus, 1879 to Today — a 32 s beat-synced timeline film.
// Every frame is a pure function of t. All timing comes from window.BEATS
// (the music's beat/hit map), so re-syncing to another track only changes beats.js.
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
  const S = BM.sections;
  const DROP = S.drop, FINAL = S.final, END = S.end;
  const GAP = (BM.gaps && BM.gaps[0]) || [DROP - BEAT, DROP];
  const STOP = [FINAL - BEAT, FINAL];
  const pulse = (list, t, tau, lead = 0) => {
    let v = 0;
    for (const x of list || []) {
      const d = t - x + lead;
      if (d >= 0 && d < tau * 7) v = Math.max(v, Math.exp(-d / tau));
    }
    return v;
  };
  ENTRIES.forEach((e, i) => { e.i = i; e.t0 = bt(e.b); e.t1 = bt(e.b + e.len); e.kind = e.kind || (e.len <= 1 ? 'flash' : 'card'); });
  const entryAt = t => { let cur = null; for (const e of ENTRIES) if (t >= e.t0 && t < e.t1) cur = e; return cur; };
  const lastEntryBefore = t => { let cur = null; for (const e of ENTRIES) if (e.t0 <= t) cur = e; return cur; };

  // Era colours: the background warms, burns amber, cools to blue, and ends red.
  const ERA = {
    classical: { glow: [44, 34, 22], acc: hex('#e9d2a2') },
    revolution: { glow: [52, 34, 10], acc: C.amber },
    modern: { glow: [12, 36, 66], acc: C.cyan },
    frontier: { glow: [64, 14, 18], acc: C.red },
  };
  const mixc = (a, b, q) => a.map((v, i) => lerp(v, b[i], q));

  // ================================================================ layers
  const out = document.getElementById('out').getContext('2d');
  const sceneC = makeCanvas(), scene = sceneC.getContext('2d');
  const hotC = makeCanvas(), hot = hotC.getContext('2d');
  const motC = makeCanvas(), mot = motC.getContext('2d');      // motif layer (gets entrance transforms)
  const tmpC = makeCanvas(), tmp = tmpC.getContext('2d');

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
      let last = keep[maxLines - 1] + '…';
      while (ctx.measureText(last).width > maxW && last.length > 4) last = last.slice(0, -2) + '…';
      keep[maxLines - 1] = last;
      return keep;
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
    for (let k = 0; k < 4; k++) {
      const place = 10 ** (3 - k);
      const d = Math.floor(v / place) % 10;
      const lower = v - Math.floor(v / place) * place;
      const frac = place === 1 ? v - Math.floor(v) : clamp(lower - (place - 1));
      const cx = x + cw * (k + 0.5);
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - cw / 2 - 2, top, cw + 4, bot - top); ctx.clip();
      const step = size * 0.88;
      // Only a digit that is mid-roll gets motion blur.
      const blur = (opts.speed ? 1 : 0) * 7 * Math.sin(Math.PI * clamp(frac));
      ctx.fillStyle = color;
      if (blur > 0.6) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.fillText(String(d), cx, y - frac * step);
      ctx.fillText(String((d + 1) % 10), cx, y - frac * step + step);
      ctx.restore();
    }
    ctx.restore();
    return cw * 4;
  }

  // ================================================================ state per frame
  function yearValue(t) {
    // Holds at each milestone; rolls quickly to the next one on its downbeat.
    const e = lastEntryBefore(t);
    if (!e) return 1879;
    const prev = e.i > 0 ? ENTRIES[e.i - 1].year : 1879;
    // Build: after jeu de taquin the counter accelerates towards 1982, freezing a hair short in the gap.
    const jdt = ENTRIES.find(x => x.motif === 'jdt');
    if (jdt && t >= jdt.t1 && t < DROP) {
      const q = seg(t, jdt.t1, GAP[0], easeIn);
      return lerp(jdt.year, 1981.965, q);
    }
    const dur = Math.min(0.2, (e.t1 - e.t0) * 0.35);
    const q = seg(t, e.t0, e.t0 + dur, easeQ);
    // The drop continues from where the build froze the counter.
    const from = jdt && e.t0 >= DROP && ENTRIES[e.i - 1] === jdt ? 1981.965 : prev;
    return lerp(from, e.year, q);
  }

  // ================================================================ background
  function drawBackground(ctx, t, era, energy, kick) {
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H);
    const gx = W * 0.62, gy = H * 0.44;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 1250);
    const a = 0.5 + 0.18 * kick;
    g.addColorStop(0, rgba(era.glow.map(Math.round), a));
    g.addColorStop(0.55, rgba(era.glow.map(Math.round), a * 0.25));
    g.addColorStop(1, rgba(era.glow.map(Math.round), 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Scrolling dot grid: speed tracks the energy of the music.
    const scroll = (t * 40 + energy.scroll) % 48;
    ctx.fillStyle = `rgba(170,190,220,${0.045 + 0.03 * kick})`;
    for (let x = -scroll; x <= W; x += 48) for (let y = 12; y <= H; y += 48) ctx.fillRect(x, y, 2, 2);
  }

  // Bottom rail: 1879 -> 2026, playhead at the odometer value.
  const RX0 = 140, RX1 = 1780, RY = 1004;
  const railX = y => RX0 + (y - 1879) / (2026 - 1879) * (RX1 - RX0);
  function drawRail(ctx, t, v, acc, kick) {
    ctx.save();
    ctx.strokeStyle = rgba(C.dim, 0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RX0, RY); ctx.lineTo(RX1, RY); ctx.stroke();
    for (let y = 1880; y <= 2020; y += 10) {
      const x = railX(y), big = y % 20 === 0 && y !== 1880 || y === 1880;
      ctx.beginPath(); ctx.moveTo(x, RY - (big ? 9 : 5)); ctx.lineTo(x, RY); ctx.stroke();
      if (big) U.text(ctx, String(y), x, RY + 24, `500 13px ${F.mono}`, rgba(C.dim, 0.7), 'center');
    }
    const px = railX(clamp(v, 1879, 2026));
    ctx.strokeStyle = rgba(acc, 0.9); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(RX0, RY); ctx.lineTo(px, RY); ctx.stroke();
    ENTRIES.forEach(e => {
      if (e.t0 > t) return;
      const x = railX(e.year);
      const fresh = Math.exp(-(t - e.t0) / 0.35);
      U.dot(ctx, x, RY, 3.2 + 3 * fresh, rgba(C.ink, 0.85));
      if (fresh > 0.02) U.dot(hot, x, RY, 4 + 10 * fresh, rgba(acc, 0.7 * fresh));
    });
    U.dot(hot, px, RY, 5 + 2 * kick, rgba(acc, 1));
    ctx.strokeStyle = rgba(acc, 0.8); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, RY - 16); ctx.lineTo(px, RY + 6); ctx.stroke();
    ctx.restore();
  }

  // ================================================================ particles
  function burst(ctx, t, t0, seed, cx, cy, n, colors, power = 1) {
    const age = t - t0;
    if (age < 0 || age > 1.3) return;
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const ang = r() * Math.PI * 2, sp = (300 + r() * 1300) * power;
      const drag = 2.6;
      const dist = sp * (1 - Math.exp(-drag * age)) / drag;
      const x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist;
      const sz = 5 + r() * 18, rot = (r() - 0.5) * 8 * age;
      const life = clamp(1 - age / (0.7 + r() * 0.6));
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
    const hitT = toms.length >= 6 ? toms : [0.7, 1.17, 1.41, 1.64, 2.58, 3.05].map(x => e.t0 + x);
    const az = (-34 + 14 * seg(t, e.t0, e.t1, ease.soft)) * D2R;
    const R0 = 10.5, el = 12 * D2R;
    const cam = camera({ eye: [R0 * Math.cos(el) * Math.cos(az), R0 * Math.cos(el) * Math.sin(az), R0 * Math.sin(el)], target: [0.5, 0, 0], fov: 30,
      cx: box.x + box.w / 2, cy: box.y + box.h / 2 });
    const given = [[rL(A3[0], -2), rL(A3[0], 2)], [rL(A3[1], -2), rL(A3[1], 2)], [rL(A3[2], -2), rL(A3[2], 2)],
      [v3.add(L4p, v3.scale(L4d, -0.5)), v3.add(L4p, v3.scale(L4d, 1.5))]];
    given.forEach((g, i) => {
      const th = hitT[i];
      if (t < th) return;
      const q = seg(t, th, th + 0.16, easeQ);
      const m = v3.lerp(g[0], g[1], 0.5);
      const a = cam.project(v3.lerp(m, g[0], q)), b = cam.project(v3.lerp(m, g[1], q));
      ctx.strokeStyle = rgba(i === 3 ? C.cyan : C.ink, 0.95); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const fl = Math.exp(-(t - th) / 0.12);
      if (fl > 0.02) { hot.strokeStyle = rgba(C.ink, 0.8 * fl); hot.lineWidth = 6; hot.beginPath(); hot.moveTo(a.x, a.y); hot.lineTo(b.x, b.y); hot.stroke(); }
    });
    // The two answers ignite on the next toms.
    [0, 1].forEach(k => {
      const th = hitT[4 + k];
      if (t < th) return;
      const q = seg(t, th, th + 0.22, easeQ);
      const b = TRANS[k], s0 = PIERCE[k][2];
      const a = cam.project(lL(b, lerp(s0, -2.1, q))), c = cam.project(lL(b, lerp(s0, 2.1, q)));
      hot.strokeStyle = rgba(C.amber, 1); hot.lineWidth = 4 + 4 * Math.exp(-(t - th) / 0.12);
      hot.beginPath(); hot.moveTo(a.x, a.y); hot.lineTo(c.x, c.y); hot.stroke();
      [PIERCE[k], ...A3.map(a3 => rL(a3, meetZ(a3, b)))].forEach((P, j) => {
        const pp = cam.project(P);
        U.dot(hot, pp.x, pp.y, j === 0 ? 7 : 5, rgba(C.amberHot, q));
      });
    });
    const two = hitT[5] + 0.18;
    if (t > two) {
      const q = seg(t, two, two + 0.25, ease.back);
      ctx.save(); ctx.translate(box.x + box.w - 70, box.y + box.h - 40); ctx.scale(q, q);
      U.text(ctx, '= 2', 0, 0, `900 120px ${F.display}`, rgba(C.amber, 1), 'right');
      U.text(hot, '= 2', 0, 0, `900 120px ${F.display}`, rgba(C.amber, 0.6), 'right');
      ctx.restore();
    }
  }

  // 1982: the Schubert polynomials of S3, generated from the top by divided differences.
  const S3 = [
    { w: '321', p: 'x_1^2x_2', x: 0.55, y: 0.1 },
    { w: '231', p: 'x_1x_2', x: 0.3, y: 0.4 }, { w: '312', p: 'x_1^2', x: 0.8, y: 0.4 },
    { w: '213', p: 'x_1', x: 0.3, y: 0.7 }, { w: '132', p: 'x_1+x_2', x: 0.8, y: 0.7 },
    { w: '123', p: '1', x: 0.55, y: 0.97 },
  ];
  const S3E = [[0, 1, '\\partial_1'], [0, 2, '\\partial_2'], [1, 3, '\\partial_2'], [2, 4, '\\partial_1'], [3, 5, '\\partial_1'], [4, 5, '\\partial_2']];
  function schubpolyHero(ctx, hot, t, e, box) {
    const p = seg(t, e.t0, e.t1);
    const rank = [0, 1, 1, 2, 2, 3];
    const pos = S3.map(n => ({ x: box.x + n.x * box.w, y: box.y + 60 + n.y * (box.h - 120) }));
    // Giant fraktur S behind.
    const gs = 1 + 0.04 * Math.sin(t * 3);
    ctx.save(); ctx.globalAlpha = 0.10 * seg(t, e.t0, e.t0 + 0.2);
    U.math(ctx, '\\S', box.x + box.w / 2, box.y + box.h * 0.82, 760 * gs, rgba(C.amber, 1), 'center');
    ctx.restore();
    S3E.forEach(([a, b, lab], j) => {
      const tq = e.t0 + 0.06 + rank[a] * BEAT * 0.5;
      const q = seg(t, tq, tq + 0.18, easeQ);
      if (q <= 0) return;
      const A = pos[a], Bp = pos[b];
      const x1 = lerp(A.x, Bp.x, 0.16), y1 = lerp(A.y, Bp.y, 0.16) + 26, x2 = lerp(A.x, Bp.x, 0.84), y2 = lerp(A.y, Bp.y, 0.84) - 30;
      ctx.strokeStyle = rgba(C.dim, 0.8); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, q), lerp(y1, y2, q)); ctx.stroke();
      if (q > 0.6) U.math(ctx, lab, (x1 + x2) / 2 + (Bp.x < A.x ? -34 : 34), (y1 + y2) / 2 + 8, 30, rgba(C.dim, 1), 'center', (q - 0.6) / 0.4);
    });
    S3.forEach((n, i) => {
      const tq = e.t0 + rank[i] * BEAT * 0.5;
      const q = seg(t, tq, tq + 0.2, ease.back);
      if (q <= 0) return;
      const { x, y } = pos[i];
      ctx.save(); ctx.translate(x, y); ctx.scale(q, q);
      U.math(ctx, `\\S_{${n.w}}`, 0, -6, 34, rgba(C.dim, 1), 'center');
      const big = i === 0 ? 62 : 54;
      U.math(ctx, n.p, 0, 52, big, rgba(i === 0 ? C.amber : C.ink, 1), 'center');
      ctx.restore();
      if (i === 0) { hot.save(); hot.translate(x, y); hot.scale(q, q); U.math(hot, n.p, 0, 52, big, rgba(C.amber, 0.55), 'center'); hot.restore(); }
    });
    void p;
  }

  // ================================================================ entry rendering
  function drawEntry(t, e, kick, acc) {
    const local = t - e.t0, dur = e.t1 - e.t0, p = clamp(local / dur);
    const hero = e.kind === 'hero', flash = e.kind === 'flash';
    // Hero visuals clear the big year digits (they end near x = 965); the 1879 lines may cross them.
    const box = e.motif === 'lines4' ? { x: 820, y: 110, w: 1000, h: 760 }
      : hero ? { x: 980, y: 100, w: 860, h: 780 } : { x: 950, y: 130, w: 860, h: 650 };
    // Motif layer, with a whip-in entrance from the right.
    mot.clearRect(0, 0, W, H);
    const inQ = seg(local, 0, flash ? 0.09 : 0.14, easeQ);
    const dir = e.i % 2 ? 1 : -1;
    mot.save();
    if (e.motif === 'lines4') linesHero(mot, hot, t, e, box);
    else if (e.motif === 'schubpoly') schubpolyHero(mot, hot, t, e, box);
    else if (MOTIFS[e.motif]) {
      try { MOTIFS[e.motif].draw(mot, hot, p, kick, MOTIF_ENV(local, dur, BEAT), box); }
      catch (err) { U.text(mot, `[${e.motif}]`, box.x + box.w / 2, box.y + box.h / 2, `30px ${F.mono}`, rgba(C.red, 1), 'center'); }
    } else {
      U.text(mot, `[${e.motif}]`, box.x + box.w / 2, box.y + box.h / 2, `30px ${F.mono}`, rgba(C.dim, 1), 'center');
    }
    mot.restore();
    scene.save();
    const ox = (1 - inQ) * 180 * dir, sc = lerp(1.08, 1, inQ);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    scene.globalAlpha = clamp(inQ * 2);
    scene.translate(cx + ox, cy); scene.scale(sc, sc); scene.translate(-cx, -cy);
    scene.drawImage(motC, 0, 0);
    scene.restore();

    // Headline and citations.
    const x0 = 120;
    const nameQ = seg(local, flash ? 0.02 : 0.04, (flash ? 0.02 : 0.04) + (flash ? 0.14 : 0.24));
    const name = e.name.toUpperCase();
    const maxW = (hero ? 700 : 860);
    const nSize = fitFont(scene, name, 900, F.wide, hero ? 76 : 64, maxW, 'expanded');
    kinetic(scene, name, x0, 702, nSize, rgba(C.ink, 1), nameQ, { font: `900 ${nSize}px ${F.wide}`, stretch: 'expanded', stagger: 0.5 });
    // Accent underline wipes in.
    const ul = seg(local, 0.05, 0.3, easeQ);
    scene.fillStyle = rgba(acc, 0.95); scene.fillRect(x0, 724, 120 * ul, 5);
    let y = 772;
    e.cites.forEach((c, j) => {
      const cq = seg(local, 0.1 + j * 0.08, 0.1 + j * 0.08 + (flash ? 0.12 : 0.22), easeQ);
      if (cq <= 0) return;
      scene.save();
      scene.beginPath(); scene.rect(x0 - 4, y - 30, (maxW + 20) * cq, 200); scene.clip();
      const small = j > 0;
      scene.font = `600 ${small ? 16 : 18}px ${F.mono}`; scene.letterSpacing = '2px';
      scene.fillStyle = rgba(acc, small ? 0.75 : 0.95);
      scene.fillText(c[0].toUpperCase(), x0, y);
      scene.letterSpacing = '0px';
      scene.font = `italic ${small ? 25 : 31}px ${F.serif}`;
      const lines = wrap(scene, c[1], maxW, small ? 1 : 2);
      scene.fillStyle = rgba(C.ink, small ? 0.75 : 0.95);
      lines.forEach((ln, k) => scene.fillText(ln, x0, y + (small ? 30 : 36) + k * (small ? 28 : 34)));
      const vy = y + (small ? 30 : 36) + lines.length * (small ? 28 : 34) - 4;
      scene.font = `500 ${small ? 14 : 15}px ${F.mono}`;
      scene.fillStyle = rgba(C.dim, small ? 0.8 : 0.95);
      scene.fillText(c[2], x0, vy);
      scene.restore();
      y = vy + 30;
    });
    return { box, p };
  }

  // ================================================================ special scenes
  function buildScene(t, energy) {
    // After jeu de taquin: the counter accelerates towards 1982, a tunnel of boxes rushes past.
    const jdt = ENTRIES.find(x => x.motif === 'jdt');
    const t0 = jdt ? jdt.t1 : GAP[0] - 3 * BEAT;
    const q = seg(t, t0, GAP[0]);
    const r = rng(77);
    const cx = 1300, cy = 470;
    for (let i = 0; i < 70; i++) {
      const z0 = r(), ang = r() * Math.PI * 2, rad = 0.2 + r() * 1.1;
      const z = ((z0 - (t - t0) * (0.6 + 2.6 * q * q)) % 1 + 1) % 1;
      const s = 1 / (0.08 + z * 1.2);
      const x = cx + Math.cos(ang) * rad * 260 * s, y = cy + Math.sin(ang) * rad * 180 * s;
      const sz = 10 * s;
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;
      scene.strokeStyle = rgba(r() < 0.25 ? C.amber : C.ink, clamp(0.08 + 0.5 * (1 - z)) * (0.4 + 0.6 * q));
      scene.lineWidth = 1.5;
      scene.strokeRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    const words = 'THE COMBINATORIAL TURN';
    const n = Math.floor(q * (words.length + 4));
    const shown = words.slice(0, Math.min(words.length, n));
    const size = fitFont(scene, words, 900, F.wide, 68, 860, 'expanded');
    scene.font = `900 ${size}px ${F.wide}`; scene.fontStretch = 'expanded';
    scene.fillStyle = rgba(C.ink, 0.95);
    scene.fillText(shown, 120, 702);
    if (n < words.length && Math.floor(t * 24) % 2 === 0) { scene.fillStyle = rgba(C.amber, 1); scene.fillRect(120 + scene.measureText(shown).width + 6, 650, 28, 56); }
    U.text(scene, 'Algebra becomes combinatorics: tableaux, words, diagrams.', 120, 772, `italic 31px ${F.serif}`, rgba(C.ink, 0.85 * seg(t, t0 + 0.3, t0 + 0.6)));
    void energy;
  }

  function gapScene(t) {
    // One beat of silence before the drop: everything holds its breath.
    const q = seg(t, GAP[0], GAP[1]);
    scene.fillStyle = `rgba(0,0,0,${0.82})`; scene.fillRect(0, 0, W, H);
    const w = 40 + 1500 * easeIn(q);
    hot.fillStyle = rgba(C.amber, 0.9); hot.fillRect(W / 2 - w / 2, H / 2 - 1.5, w, 3);
    scene.fillStyle = rgba(C.amberHot, 1); scene.fillRect(W / 2 - w / 2, H / 2 - 1, w, 2);
  }

  function stopScene(t) {
    const q = seg(t, STOP[0], STOP[1]);
    scene.fillStyle = 'rgba(3,4,7,0.86)'; scene.fillRect(0, 0, W, H);
    const s = ease.back(clamp(q * 3));
    scene.save(); scene.translate(W / 2, H / 2 + 40); scene.scale(s, s);
    U.text(scene, '?', 0, 120, `900 380px ${F.display}`, rgba(C.red, 1), 'center');
    U.text(hot, '?', 0, 120, `900 380px ${F.display}`, rgba(C.red, 0.7), 'center');
    scene.restore();
    U.text(scene, 'AND NOW?', W / 2, 870, `600 22px ${F.mono}`, rgba(C.ink, 0.8 * seg(q, 0.25, 0.6)), 'center');
  }

  // The wall of history: every motif of the film, tiled behind the title.
  const wallC = makeCanvas(), wall = wallC.getContext('2d');
  const wallHotC = makeCanvas(), wallHot = wallHotC.getContext('2d');
  function drawWall(t, local) {
    const cols = 7, rows = 4, gw = W / cols, gh = H / rows;
    wall.clearRect(0, 0, W, H); wallHot.clearRect(0, 0, W, H);
    wall.lineCap = wallHot.lineCap = 'butt';
    ENTRIES.forEach((e, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const cx = (c + 0.5) * gw, cy = (r + 0.5) * gh;
      const d = Math.hypot((c - (cols - 1) / 2) / cols, (r - (rows - 1) / 2) / rows);
      const q = seg(local, d * 0.35, d * 0.35 + 0.3, ease.back);
      if (q <= 0) return;
      const bw = gw * 0.82, bh = gh * 0.78;
      const box = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
      wall.save(); wallHot.save();
      wall.translate(cx, cy); wall.scale(q, q); wall.translate(-cx, -cy);
      wallHot.translate(cx, cy); wallHot.scale(q, q); wallHot.translate(-cx, -cy);
      const fake = { t0: t - 20, t1: t - 15 };
      try {
        if (e.motif === 'lines4') linesHero(wall, wallHot, t, Object.assign({}, e, fake), box);
        else if (e.motif === 'schubpoly') schubpolyHero(wall, wallHot, t, Object.assign({}, e, fake), box);
        else if (MOTIFS[e.motif]) MOTIFS[e.motif].draw(wall, wallHot, 1, 0, MOTIF_ENV(e.t1 - e.t0, e.t1 - e.t0, BEAT), box);
      } catch (err) { /* a broken motif must not break the finale */ }
      U.text(wall, String(e.year), box.x + 6, box.y + 22, `800 22px ${F.display}`, rgba(C.ink, 0.9));
      wall.restore(); wallHot.restore();
    });
    // Slow pull-back after the hit.
    const z = lerp(1.08, 1.0, seg(local, 0, 2, ease.soft));
    scene.save();
    scene.translate(W / 2, H / 2); scene.scale(z, z); scene.translate(-W / 2, -H / 2);
    scene.globalAlpha = 0.34; scene.drawImage(wallC, 0, 0);
    scene.globalAlpha = 0.22; scene.drawImage(wallHotC, 0, 0);
    scene.restore();
    // Darken the centre band so the title reads.
    const g = scene.createLinearGradient(0, 260, 0, 860);
    g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(0.25, 'rgba(5,7,12,0.82)'); g.addColorStop(0.75, 'rgba(5,7,12,0.82)'); g.addColorStop(1, 'rgba(5,7,12,0)');
    scene.fillStyle = g; scene.fillRect(0, 260, W, 600);
  }

  function finalScene(t) {
    const local = t - FINAL;
    drawWall(t, local);
    const q = seg(local, 0, 0.35, easeQ);
    // Title.
    const title = FIN.title.toUpperCase();
    const size = fitFont(scene, title, 900, F.wide, 150, 1640, 'expanded');
    const tw = (() => { scene.font = `900 ${size}px ${F.wide}`; scene.fontStretch = 'expanded'; return scene.measureText(title).width; })();
    kinetic(scene, title, W / 2 - tw / 2, 470, size, rgba(C.ink, 1), q, { font: `900 ${size}px ${F.wide}`, stretch: 'expanded', stagger: 0.35 });
    const bar = seg(local, 0.15, 0.5, easeQ);
    hot.fillStyle = rgba(C.amber, 1); hot.fillRect(W / 2 - 260 * bar, 512, 520 * bar, 4);
    scene.fillStyle = rgba(C.amberHot, 1); scene.fillRect(W / 2 - 260 * bar, 513, 520 * bar, 2);
    U.text(scene, FIN.span.toUpperCase(), W / 2, 580, `600 26px ${F.mono}`, rgba(C.ink, 0.9 * seg(local, 0.2, 0.5)), 'center');
    // The frontier.
    const fq = seg(local, 0.45, 0.85, easeQ);
    if (fq > 0) {
      scene.save(); scene.globalAlpha = fq;
      const y = 720 + (1 - fq) * 20;
      const w1 = (() => { scene.font = `italic 40px ${F.serif}`; return scene.measureText(FIN.question + ' ').width; })();
      const total = w1 + 110;
      const x = W / 2 - total / 2;
      U.text(scene, FIN.question + ' ', x, y, `italic 40px ${F.serif}`, rgba(C.ink, 0.95));
      U.math(scene, FIN.formula, x + w1 + 4, y, 44, rgba(C.red, 1));
      U.text(scene, FIN.status.toUpperCase(), W / 2, y + 62, `700 22px ${F.mono}`, rgba(C.red, 0.95), 'center');
      scene.restore();
    }
  }

  // ================================================================ frame
  function seek(t) {
    // Events and pulses from the beat map.
    const inDrop = t >= DROP && t < STOP[0];
    const kick = pulse(BM.kicks, t, inDrop ? 0.1 : 0.12);
    const clap = pulse(BM.claps, t, 0.08);
    const impact = pulse(BM.impacts, t, 0.16);
    const crash = pulse(BM.crashes, t, 0.2);
    const tom = pulse(BM.toms, t, 0.09);
    const rollOn = (BM.rolls || []).some(([a, b]) => t >= a && t < b);
    const energy = { scroll: t < S.build ? 0 : t < DROP ? (t - S.build) * 160 : (t - DROP) * 420 + 1200 };

    const e = entryAt(t);
    const eraName = t >= STOP[0] ? 'frontier' : e ? e.era : (t >= DROP ? 'revolution' : 'revolution');
    const era = ERA[eraName];
    // Smoothly blend era colours at changes.
    const prev = e && e.i > 0 ? ERA[ENTRIES[e.i - 1].era] : era;
    const blendQ = e ? seg(t, e.t0, e.t0 + 0.25) : 1;
    const eraMix = { glow: mixc(prev.glow, era.glow, blendQ), acc: mixc(prev.acc, era.acc, blendQ) };
    const acc = eraMix.acc;

    hot.clearRect(0, 0, W, H);
    drawBackground(scene, t, eraMix, energy, kick);
    speedLines(scene, t, (t > S.build && t < GAP[0] ? seg(t, S.build, GAP[0]) : 0) * 0.9 + (inDrop ? 0.35 * kick : 0), 5);

    const v = yearValue(t);
    const isFinal = t >= FINAL;
    // Year odometer (the spine of the film).
    if (!isFinal && !(t >= GAP[0] && t < DROP) && !(t >= STOP[0])) {
      const hero = e && e.kind === 'hero';
      const size = hero ? 430 : 360;
      const slam = e ? seg(t - e.t0, 0, 0.12, easeQ) : 1;
      const sc = e ? lerp(1.12, 1, slam) : 1;
      scene.save();
      scene.translate(110, 600); scene.scale(sc, sc); scene.translate(-110, -600);
      // Echo outline copies trail the slam.
      if (slam < 1) {
        scene.save(); scene.globalAlpha = 0.35 * (1 - slam);
        odometer(scene, v, 110 + 26 * (1 - slam), 600 - 10 * (1 - slam), size, rgba(acc, 1));
        scene.restore();
      }
      odometer(scene, v, 110, 600, size, rgba(C.ink, 0.96), { speed: e ? (t - e.t0 < 0.2 ? 400 : 0) : 0 });
      scene.restore();
    }

    if (t >= GAP[0] && t < DROP) {
      gapScene(t);
    } else if (t >= STOP[0] && t < FINAL) {
      stopScene(t);
    } else if (isFinal) {
      finalScene(t);
    } else if (e) {
      drawEntry(t, e, kick, acc);
    } else {
      buildScene(t, energy);
    }

    if (!isFinal) drawRail(scene, t, v, acc, kick);
    // HUD.
    if (!isFinal && !(t >= GAP[0] && t < DROP)) {
      U.text(scene, 'COMBINATORIAL SCHUBERT CALCULUS', 120, 70, `600 15px ${F.mono}`, rgba(C.dim, 0.9));
      const idx = e ? e.i + 1 : (lastEntryBefore(t) ? lastEntryBefore(t).i + 1 : 0);
      U.text(scene, `${String(idx).padStart(2, '0')} / ${ENTRIES.length}`, 1800, 70, `600 15px ${F.mono}`, rgba(C.dim, 0.9), 'right');
    }

    // Downbeat shockwaves in the drop: a thin ring from the motif on every bar.
    if (inDrop) {
      (BM.downbeats || []).forEach(d => {
        const age = t - d;
        if (age < 0 || age > 0.6 || d < DROP) return;
        const q = age / 0.6;
        U.ring(hot, 1380, 455, 60 + 700 * easeQ(q), rgba(acc, 0.35 * (1 - q)), 2);
      });
    }
    // Explosions on impacts and crashes.
    (BM.impacts || []).forEach((ti, j) => burst(hot, t, ti, 900 + j, ti >= FINAL ? W / 2 : 1300, ti >= FINAL ? 470 : 480, ti === 0 ? 50 : 110, [C.amber, C.ink, C.amberHot], ti >= FINAL ? 1.3 : 1));
    (BM.crashes || []).forEach((ti, j) => { if (!(BM.impacts || []).some(x => Math.abs(x - ti) < 0.01)) burst(hot, t, ti, 700 + j, 1300, 480, 80, [C.cyan, C.ink], 0.9); });

    // ---------------------------------------------------------------- composite
    scene.drawImage(hotC, 0, 0);
    bloom(scene, hotC, 6, 0.6);
    bloom(scene, hotC, 26, 0.45);
    bloom(scene, hotC, 64, 0.3);

    // Camera: zoom punches on kicks, shakes on hits, chromatic split on the big ones.
    const punch = (inDrop ? 0.022 : 0.012) * kick + 0.05 * impact + 0.02 * crash + 0.01 * tom;
    const sr = rng(Math.floor(t * 60) * 13 + 5);
    const shakeA = 2.5 * clap * (inDrop ? 1 : 0.4) + 20 * impact + 10 * crash + 6 * tom + (rollOn ? 2 : 0);
    const sx = (sr() - 0.5) * 2 * shakeA, sy = (sr() - 0.5) * 2 * shakeA;
    const split = 14 * impact + 9 * crash + (inDrop ? 2.5 * kick : 0);
    out.save();
    out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
    out.translate(W / 2 + sx, H / 2 + sy); out.scale(1 + punch, 1 + punch); out.translate(-W / 2, -H / 2);
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
    // Glitch slices during rolls and fills.
    if (rollOn && t > S.build) {
      const gr = rng(Math.floor(t * 30) * 7 + 3);
      for (let i = 0; i < 6; i++) {
        if (gr() > 0.5) continue;
        const y = gr() * H, h = 8 + gr() * 50, dx = (gr() - 0.5) * 80;
        out.drawImage(out.canvas, 0, y, W, h, dx, y, W, h);
      }
    }
    // Flashes.
    const flash = 0.85 * pulse(BM.impacts, t, 0.09) * (t < 0.05 ? 0 : 1) + 0.28 * pulse(BM.crashes, t, 0.07) + (inDrop ? 0.06 * clap : 0.025 * clap);
    if (flash > 0.003) { out.fillStyle = `rgba(255,248,235,${clamp(flash)})`; out.fillRect(0, 0, W, H); }
    // Vignette, fade in/out, grain.
    const vg = out.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    out.fillStyle = vg; out.fillRect(0, 0, W, H);
    const fade = Math.max(1 - seg(t, 0, 0.06), seg(t, END - 0.45, END));
    if (fade > 0) { out.fillStyle = `rgba(0,0,0,${fade})`; out.fillRect(0, 0, W, H); }
    if (GRAIN > 0) drawGrain(out, t, GRAIN);
  }

  // ================================================================ boot
  async function boot() {
    const fonts = ['900 100px "Big Shoulders Display"', '100px Anton', '900 100px Archivo', 'italic 100px "Instrument Serif"', '100px "Instrument Serif"',
      '500 40px "JetBrains Mono"', '600 40px "JetBrains Mono"', '40px KaTeX_Main', 'italic 40px KaTeX_Math', '40px KaTeX_Fraktur', '40px KaTeX_AMS', '600 40px Inter'];
    await Promise.all(fonts.map(f => document.fonts.load(f)));
    // Load every motif referenced by the timeline.
    const ids = [...new Set(ENTRIES.map(e => e.motif))].filter(id => id !== 'lines4' && id !== 'schubpoly');
    await Promise.all(ids.map(id => new Promise(res => {
      const s = document.createElement('script'); s.src = `motifs/${id}.js`; s.onload = res; s.onerror = res; document.body.appendChild(s);
    })));
    scene.lineCap = hot.lineCap = mot.lineCap = 'butt';
    window.seek = seek;
    window.__film = { entries: ENTRIES.map(e => ({ year: e.year, name: e.name, t0: e.t0, t1: e.t1 })), DROP, FINAL, GAP, STOP };
    seek(0);
    window.__ready = true;
  }
  boot();
})();
