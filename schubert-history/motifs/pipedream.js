// 1993 — Pipe dreams (Billey–Jockusch–Stanley; Bergeron–Billey; Fomin–Kirillov).
// The five reduced pipe dreams of w = 1432 (verified by brute force against the
// Schubert polynomial computed by divided differences, sympy):
//   S_1432 = x1^2 x2 + x1^2 x3 + x1 x2^2 + x1 x2 x3 + x2^2 x3,
// one monomial per pipe dream (x_i for every cross in row i). The pipes are traced
// below from the cross sets, and each one is checked to exit at column w(i)
// (the top labels read the exit pipes 1 4 3 2 = w^{-1} = w).
// Rhythm (hero, 8 beats): pipes draw on in beat 0; pipe dreams flip in on beats 1-5
// (changed tiles card-flip, the crosses light and their x_i fly into the sum); then
// double time back up the list on eighths and a settle on the first pipe dream with
// the whole sum lit. Shorter slots use one pipe dream per eighth, or fixed fractions.
MOTIF('pipedream', (() => {
  const n = 4, W = [1, 4, 3, 2];
  const PDS = [
    [[1, 2], [1, 3], [2, 2]],
    [[1, 2], [1, 3], [3, 1]],
    [[1, 2], [2, 1], [2, 2]],
    [[1, 3], [2, 1], [3, 1]],
    [[2, 1], [2, 2], [3, 1]],
  ];
  // Trace the pipes of a cross set: pipe r enters row r from the west; a cross goes
  // straight, an elbow turns (W->N, S->E); the anti-diagonal half tiles are elbows.
  const trace = crosses => {
    const set = new Set(crosses.map(c => c.join()));
    const tiles = {}, lens = [], exits = [];
    for (let r = 1; r <= n; r++) {
      let i = r, j = 1, from = 'W', idx = 0;
      for (let guard = 0; guard < 4 * n; guard++) {
        const cross = i + j <= n && set.has(i + ',' + j);
        const to = cross ? (from === 'W' ? 'E' : 'N') : (from === 'W' ? 'N' : 'E');
        (tiles[i + ',' + j] = tiles[i + ',' + j] || []).push({ from, to, pipe: r, idx: idx++ });
        if (to === 'N') { if (i === 1) { exits[r - 1] = j; break; } i--; from = 'S'; } else { j++; from = 'W'; }
      }
      lens.push(idx);
    }
    return { tiles, lens, exits, set };
  };
  // Monomial of a pipe dream as factors x_i^{e_i}.
  const factors = crosses => {
    const e = Array(n + 1).fill(0); crosses.forEach(([i]) => e[i]++);
    const f = []; for (let i = 1; i <= n; i++) if (e[i]) f.push({ i, s: `x_${i}` + (e[i] > 1 ? `^${e[i]}` : '') });
    return f;
  };
  const DATA = PDS.map(c => ({ crosses: c, ...trace(c), factors: factors(c) }));
  DATA.forEach(d => { d.term = d.factors.map(f => f.s).join(''); });
  if (DATA.some(d => d.exits.join('') !== W.join('') || d.crosses.length !== 3))
    console.error('pipedream: a pipe dream does not give 1432');
  const WINV = []; W.forEach((v, i) => { WINV[v - 1] = i + 1; });
  const TILES = [];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n + 1 - i; j++) TILES.push([i, j]);

  // The beat plan (in units of p).
  const plan = env => {
    const E = env.beat / 2 / env.dur;               // one eighth note
    let flips, drawOn;
    if (16 * E <= 1.0001) {                           // hero: beats 1-5, eighths back up, settle on beat 7
      flips = [0, 1, 2, 3, 4].map(m => ({ t: (2 + 2 * m) * E, m, first: true }))
        .concat([3, 2, 1].map((m, q) => ({ t: (11 + q) * E, m })), [{ t: 14 * E, m: 0, settle: true }]);
      drawOn = [0.1 * E, 1.75 * E];
    } else if (7 * E <= 1.0001) {                     // a 4-beat slot: one per eighth, settle on beat 3
      flips = [0, 1, 2, 3, 4].map(m => ({ t: (1 + m) * E, m, first: true })).concat([{ t: 6 * E, m: 0, settle: true }]);
      drawOn = [0, 0.9 * E];
    } else {                                          // short slot: fixed fractions
      flips = [0, 1, 2, 3, 4].map(m => ({ t: 0.17 + 0.13 * m, m, first: true })).concat([{ t: 0.84, m: 0, settle: true }]);
      drawOn = [0, 0.15];
    }
    flips.forEach((f, q) => { f.gap = (q + 1 < flips.length ? flips[q + 1].t : 1) - f.t; f.prev = q ? flips[q - 1].m : f.m; });
    return { flips, drawOn };
  };

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const meas = (s, z) => U.math(ctx, s, 0, 0, z, '#000', 'left', 0);
      const { flips, drawOn } = plan(env);
      let cur = -1; flips.forEach((f, q) => { if (p >= f.t) cur = q; });
      const fl = cur >= 0 ? flips[cur] : null;
      const shownM = fl ? fl.m : 0, D = DATA[shownM];

      // ---- layout, in units of the tile size s
      const Z = 100, FZ = 0.42;                       // polynomial font = 0.42 s
      const u = v => v / Z * FZ;                      // measured width -> s units
      const wS = u(meas('\\S_{1432}', Z)), wEq = u(Math.max(meas('=', Z), meas('+', Z)));
      const wT = Math.max(...DATA.map(d => u(meas(d.term, Z)))), g = 0.3 * FZ;
      const labL = 0.5, labT = 0.55, gapGP = 0.85;
      const totW = labL + n + gapGP + wS + g + wEq + g + wT, totH = labT + n;
      const s = Math.min(box.w * 0.92 / totW, box.h * 0.86 / totH);
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      // (optically centred: the faint last tile below the 4th pipe counts for little)
      const gx = cx - totW * s / 2 + labL * s, gy = cy - totH * s / 2 + (labT + 0.1) * s;
      const fz = FZ * s, lh = 1.32 * fz;
      const xS = gx + (n + gapGP) * s, xEq = xS + (wS + g) * s, xT = xEq + (wEq + g) * s;
      const yLine = m => gy + 2.1 * s + (m - 2) * lh + 0.32 * fz;
      const drift = 1 + 0.025 * ease.soft(clamp((p - 0.1) / 0.9));
      ctx.save(); hot.save();
      for (const c of [ctx, hot]) { c.translate(cx, cy); c.scale(drift, drift); c.translate(-cx, -cy); }

      // ---- the staircase of tiles
      const lw = Math.max(1.5, s * 0.045);
      TILES.forEach(([i, j], q) => {
        const a = U.stagger(p, q, TILES.length, 0, drawOn[1] * 0.8, 0.5);
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = Math.max(1, s * 0.012);
        ctx.strokeRect(gx + (j - 1) * s, gy + (i - 1) * s, s, s); ctx.restore();
      });

      // ---- tiles: flip (scaleX) when a flip changes them; cross tiles of the shown
      // pipe dream are lit, carry their variable x_i, and pulse on the beat.
      const hf = Math.min(0.055 / env.dur, 0.3 * Math.min(...flips.map(f => f.gap)));
      let near = null;
      flips.forEach(f => { if (Math.abs(p - f.t) < hf && f.m !== f.prev) near = f; });
      const popDur = fl ? Math.min(0.14 / env.dur, 0.6 * fl.gap) : 1;
      const pop = fl ? seg(p, fl.t, fl.t + popDur) : 0;
      const cols = [C.ink, C.cyan, C.violet, C.dim];
      const pipeQ = r => seg(p, lerp(drawOn[0], drawOn[1], (r - 1) * 0.1), lerp(drawOn[0], drawOn[1], 0.7 + (r - 1) * 0.1), ease.inOut);
      const lit = new Set(fl ? D.crosses.map(c => c.join()) : []);
      const labSz = 0.27 * s;
      TILES.forEach(([i, j]) => {
        const key = i + ',' + j, x = gx + (j - 1) * s, y = gy + (i - 1) * s;
        let sx = 1;
        if (near) {
          const was = DATA[near.prev].set.has(key), is = DATA[near.m].set.has(key);
          if (was !== is) sx = Math.max(0.03, Math.abs(Math.cos(Math.PI * (p - near.t + hf) / (2 * hf))));
        }
        ctx.save(); hot.save();
        for (const c of [ctx, hot]) { c.translate(x + s / 2, 0); c.scale(sx, 1); c.translate(-(x + s / 2), 0); }
        const on = lit.has(key);
        if (on) {
          const b = ease.back(pop), sc = lerp(0.55, 1, b) * (1 + 0.05 * k), h = s * 0.44 * sc;
          ctx.fillStyle = rgba(C.amber, 0.13 * pop); ctx.fillRect(x + s / 2 - h, y + s / 2 - h, 2 * h, 2 * h);
          ctx.strokeStyle = rgba(C.amber, 0.95 * pop); ctx.lineWidth = Math.max(1.5, s * 0.022);
          ctx.strokeRect(x + s / 2 - h, y + s / 2 - h, 2 * h, 2 * h);
          hot.strokeStyle = rgba(C.amber, (0.45 + 0.2 * k) * pop); hot.lineWidth = Math.max(1.5, s * 0.024);
          hot.strokeRect(x + s / 2 - h, y + s / 2 - h, 2 * h, 2 * h);
        }
        // pipe segments through this tile
        (D.tiles[key] || []).forEach(sg => {
          const f = clamp(pipeQ(sg.pipe) * D.lens[sg.pipe - 1] - sg.idx);
          if (f <= 0) return;
          ctx.strokeStyle = rgba(cols[sg.pipe - 1], 1); ctx.lineWidth = lw; ctx.lineCap = 'round';
          ctx.beginPath();
          if (sg.from === 'W' && sg.to === 'E') { ctx.moveTo(x, y + s / 2); ctx.lineTo(x + f * s, y + s / 2); }
          else if (sg.from === 'S' && sg.to === 'N') { ctx.moveTo(x + s / 2, y + s); ctx.lineTo(x + s / 2, y + s - f * s); }
          else if (sg.from === 'W') ctx.arc(x, y, s / 2, Math.PI / 2, Math.PI / 2 - f * Math.PI / 2, true);
          else ctx.arc(x + s, y + s, s / 2, Math.PI, Math.PI + f * Math.PI / 2);
          ctx.stroke(); ctx.lineCap = 'butt';
        });
        if (on) U.math(ctx, `x_${i}`, x + s * 0.6, y + s * 0.36, labSz, rgba(C.amberHot, 1), 'left', clamp(pop * 2));
        ctx.restore(); hot.restore();
      });

      // ---- labels: pipe r enters row r (left); the top row names the pipe exiting
      // each column: 1 4 3 2, i.e. w.
      const lz = Math.round(0.3 * s);
      for (let r = 1; r <= n; r++) {
        const a = seg(p, 0, drawOn[1] * 0.6, ease.out);
        U.text(ctx, String(r), gx - 0.3 * s, gy + (r - 0.5) * s + lz * 0.36, `${lz}px ${F.main}`, rgba(cols[r - 1], 0.95), 'center', 'alphabetic', a);
        const pj = WINV[r - 1];                        // pipe exiting column r
        const at = clamp((pipeQ(pj) - 0.9) * 10);
        U.text(ctx, String(pj), gx + (r - 0.5) * s, gy - 0.2 * s, `${lz}px ${F.main}`, rgba(cols[pj - 1], 0.95), 'center', 'alphabetic', at);
      }

      // ---- the Schubert polynomial, aligned on "=" / "+"
      const ha = seg(p, drawOn[0], drawOn[1], ease.out);
      U.math(ctx, '\\S_{1432}', xS, yLine(0), fz, rgba(C.ink, 1), 'left', ha);
      U.math(ctx, '=', xEq + (wEq * s - u(meas('=', Z)) * s) / 2, yLine(0), fz, rgba(C.ink, 1), 'left', ha);
      const settle = fl && fl.settle ? seg(p, fl.t, Math.min(1, fl.t + 0.5 * fl.gap)) : 0;
      DATA.forEach((d, m) => {
        const f0 = flips.find(f => f.first && f.m === m);
        const a = seg(p, f0.t + 0.62 * f0.gap, f0.t + 0.8 * f0.gap, ease.out);
        if (a <= 0) return;
        const y = yLine(m) + (1 - a) * fz * 0.15;
        const isCur = fl && fl.m === m && !fl.settle;
        const amb = fl && fl.settle ? 1 : isCur ? 1 : 0;
        const col = amb ? rgba(C.amber, 1) : rgba(C.ink, 0.95);
        if (m > 0) U.math(ctx, '+', xEq + (wEq * s - u(meas('+', Z)) * s) / 2, y, fz, amb ? rgba(C.amber, 0.9) : rgba(C.ink, 0.8), 'left', a);
        const zz = fz * (isCur ? 1 + 0.03 * k : 1);
        U.math(ctx, d.term, xT, y, zz, col, 'left', a);
        const ga = fl && fl.settle ? 0.22 * (1 - settle) + 0.08 : isCur ? 0.2 + 0.05 * k : 0;
        if (ga > 0.01) U.math(hot, d.term, xT, y, zz, rgba(C.amber, ga), 'left', a);
      });

      // ---- first pass: the crosses' variables fly into their slot of the sum.
      if (fl && fl.first) {
        const fu = seg(p, fl.t + 0.06 * fl.gap, fl.t + 0.7 * fl.gap, ease.inOut);
        const fa = 1 - seg(p, fl.t + 0.66 * fl.gap, fl.t + 0.78 * fl.gap);
        if (fu > 0 && fa > 0) {
          const offs = {}; let acc = '';
          D.factors.forEach(f => { offs[f.i] = acc ? meas(acc, fz) : 0; acc += f.s; });
          D.crosses.forEach(([i, j], q) => {
            const x0 = gx + (j - 1) * s + s * 0.6, y0 = gy + (i - 1) * s + s * 0.36;
            const x1 = xT + offs[i], y1 = yLine(fl.m);
            // Line 0 is approached from above; the others along their own line, under
            // the header and through the (still empty) "+" slot, never across a landed term.
            const mx = fl.m ? xS : (x0 + x1) / 2, my = fl.m ? y1 : Math.min(y0, y1) - s * (0.45 + 0.2 * q);
            const v = 1 - fu, X = v * v * x0 + 2 * v * fu * mx + fu * fu * x1, Y = v * v * y0 + 2 * v * fu * my + fu * fu * y1;
            const z = lerp(labSz, fz, fu);
            U.math(ctx, `x_${i}`, X, Y, z, rgba(C.amber, 1), 'left', fa);
            U.math(hot, `x_${i}`, X, Y, z, rgba(C.amber, 0.45), 'left', fa);
          });
        }
      }
      ctx.restore(); hot.restore();
    },
  };
})());
