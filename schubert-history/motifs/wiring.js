// 1984/87 — Reduced words (Stanley; Edelman–Greene).
// Wiring diagrams of all 16 reduced words of w_0 = 4321 in S_4 flick past, each
// paired with its Edelman–Greene recording tableau Q, a standard Young tableau of
// the staircase (3,2,1); a counter rolls 1 -> 16 = #SYT(3,2,1) = 6!/(5·3·3) (Stanley).
// The order is mostly single braid/commutation moves (two jumps, in the fast part).
// The current word is written under the crossing slots; the count 16 lands on beat 3
// of a 4-beat card, then the six crossings of the last word light left to right.
// Both facts are recomputed below: every word multiplies out to 4321 and the 16
// Q tableaux are distinct of shape (3,2,1) (checked against a python brute force).
MOTIF('wiring', (() => {
  const WORDS = ['121321', '123121', '123212', '132312', '132132', '312132', '312312', '212321',
    '213231', '213213', '231213', '231231', '321232', '321323', '323123', '232123'].map(s => [...s].map(Number));
  // Edelman–Greene insertion; returns the recording tableau Q.
  const egQ = word => {
    const P = [], Q = [];
    word.forEach((a, t) => {
      let x = a, r = 0;
      for (;;) {
        if (r === P.length) { P.push([x]); Q.push([t + 1]); break; }
        const row = P[r], j = row.findIndex(y => y > x);
        if (j < 0) { row.push(x); Q[r].push(t + 1); break; }
        const y = row[j];
        if (y === x + 1 && row.includes(x)) x = x + 1; else { row[j] = x; x = y; }
        r++;
      }
    });
    return Q;
  };
  const QS = WORDS.map(egQ);
  // In a reduced word of w_0 every pair of wires crosses exactly once, so a word is
  // determined by the slot x_ij where wires i < j cross. Morphing between words
  // interpolates these x_ij: a commutation move slides two crossings past each
  // other, and a braid move aba -> bab collapses its triangle through a triple point.
  const crossX = word => {
    const at = [1, 2, 3, 4], X = {};                 // at[level - 1] = wire label
    word.forEach((a, t) => {
      const i = at[a - 1], j = at[a];
      X[Math.min(i, j) * 10 + Math.max(i, j)] = t + 0.5;
      at[a - 1] = j; at[a] = i;
    });
    return X;
  };
  const XS = WORDS.map(crossX);
  const perm = w => { const p = [1, 2, 3, 4]; w.forEach(i => { [p[i - 1], p[i]] = [p[i], p[i - 1]]; }); return p.join(''); };
  if (WORDS.some(w => perm(w) !== '4321') || new Set(QS.map(q => JSON.stringify(q))).size !== 16 ||
      QS.some(q => q.map(r => r.length).join() !== '3,2,1') || XS.some(X => Object.keys(X).length !== 6))
    console.error('wiring: bad reduced words');

  // Level (1 = top) of wire l at x = X (slot units), given crossing positions xs:
  // 1 + #wires above it, each crossing smoothed over a window of half-width hw.
  const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const levelAt = (l, X, xs, hw) => {
    let lev = l;
    for (let j = 1; j <= 4; j++) {
      if (j === l) continue;
      const s = smooth((X - xs[Math.min(j, l) * 10 + Math.max(j, l)] + hw) / (2 * hw));
      lev += j < l ? -s : s;
    }
    return lev;
  };

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      // Word schedule: accelerating flicks, word i fully in place at tau[i]; the last
      // word (and the count 16) lands on beat 3 of a 4-beat card.
      const a0 = 0.14, a1 = 0.74, N = WORDS.length;
      const tau = WORDS.map((_, i) => a0 + (a1 - a0) * Math.pow(i / (N - 1), 0.62));
      let cur = 0; for (let i = 1; i < N; i++) if (p >= tau[i - 1]) cur = i;
      // cur = word being morphed into (or held); u = morph progress from cur-1.
      const span = cur ? tau[cur] - tau[cur - 1] : 1;
      const u = cur ? ease.inOut(clamp((p - tau[cur] + span * 0.5) / (span * 0.5))) : 1;   // morph in the 2nd half
      const shown = u >= 0.5 || cur === 0 ? cur : cur - 1;   // word / tableau / counter index

      // Layout: wiring diagram on top with its word underneath, Q tableau + counter below.
      const dx = box.w * 0.86 / 7, g = Math.min(dx * 0.75, box.h * 0.88 / 6.58), cs = g * 0.86;
      const totalH = 4 * g + 3 * cs;
      const x0 = box.x + box.w / 2 - 3 * dx, y0 = box.y + (box.h - totalH) / 2;
      const xL = x0 - 0.5 * dx, xR = x0 + 6.5 * dx;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.3) / 0.7));
      const lw = Math.max(1.5, g * 0.034);
      ctx.save(); hot.save();
      for (const c of [ctx, hot]) { c.translate(cx, cy); c.scale(drift, drift); c.translate(-cx, -cy); }

      // ---- wires (draw on left -> right during the build)
      const reveal = seg(p, 0.0, 0.14, ease.out);
      const cols = [C.ink, C.cyan, C.violet, C.dim];
      const XA = XS[Math.max(0, cur - 1)], XB = XS[cur], hw = 0.4, xs = {};
      for (const key in XB) xs[key] = lerp(XA[key], XB[key], u);
      const yOf = lev => y0 + (lev - 1) * g;
      for (let l = 1; l <= 4; l++) {
        ctx.save(); ctx.strokeStyle = rgba(cols[l - 1], 0.95); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        const n = 140, xEnd = lerp(xL, xR, reveal);
        for (let i = 0; i <= n; i++) {
          const x = lerp(xL, xR, i / n);
          if (x > xEnd) break;
          const X = (x - x0) / dx;
          const lev = levelAt(l, X, xs, hw);
          i ? ctx.lineTo(x, yOf(lev)) : ctx.moveTo(x, yOf(lev));
        }
        ctx.stroke(); ctx.restore();
        // end labels: wire l enters at level l and leaves at level 5 - l (w_0 reverses)
        const fz = `${Math.round(g * 0.32)}px ${F.main}`;
        U.text(ctx, String(l), xL - g * 0.3, yOf(l) + g * 0.11, fz, rgba(C.dim, reveal), 'center');
        U.text(ctx, String(l), xR + g * 0.3, yOf(5 - l) + g * 0.11, fz, rgba(C.dim, seg(p, 0.1, 0.18)), 'center');
      }

      // ---- read-out after the count lands: the six crossings of the final word light
      // left to right (one letter each), each leaving a short afterglow.
      const RO = [0.78, 0.97];
      const roAt = t => lerp(RO[0], RO[1], t / 5);
      const W = WORDS[shown];
      if (shown === N - 1 && p > RO[0] - 0.01) {
        W.forEach((a, t) => {
          const q = p - roAt(t);
          if (q < 0) return;
          const on = Math.exp(-q / 0.05), r = g * 0.2 * (1 + 0.25 * on);
          const x = x0 + (t + 0.5) * dx, y = yOf(a + 0.5);
          U.ring(ctx, x, y, r, rgba(C.amber, 0.35 + 0.6 * on), lw * 0.8);
          if (on > 0.05) U.ring(hot, x, y, r, rgba(C.amber, 0.7 * on), lw);
        });
      }

      // ---- the reduced word, one letter under each crossing slot
      const wz = Math.round(g * 0.34), wy = y0 + 3 * g + 0.62 * g;
      const wa = seg(p, 0.08, 0.18, ease.out);
      W.forEach((a, t) => {
        const lit = shown === N - 1 && p >= roAt(t) ? Math.exp(-(p - roAt(t)) / 0.05) : 0;
        const done = shown === N - 1 && p >= roAt(t);
        const col = done ? rgba(C.amber, 0.75 + 0.25 * lit) : rgba(C.ink, 0.7);
        U.text(ctx, String(a), x0 + (t + 0.5) * dx, wy, `${Math.round(wz * (1 + 0.2 * lit))}px ${F.main}`, col, 'center', 'alphabetic', wa);
      });

      // ---- Q tableau of shape (3,2,1) and the counter
      const fs = cs * 1.9;
      ctx.font = `${Math.round(fs)}px ${F.main}`;
      const numW = ctx.measureText('16').width;
      const rowW = 3 * cs + cs * 0.8 + numW;
      const tx = cx - rowW / 2, ty = y0 + 4 * g;
      const Q = QS[shown];
      const flash = cur > 0 ? Math.sin(Math.PI * clamp(u)) : 0;
      [3, 2, 1].forEach((len, r) => {
        for (let c = 0; c < len; c++) {
          const q = U.stagger(p, r + c, 3, 0.05, 0.2, 0.5);
          if (q <= 0) continue;
          const sc = U.pop(q), px = tx + c * cs + cs / 2, py = ty + r * cs + cs / 2, h = (cs / 2 - Math.max(2, cs * 0.03)) * sc;
          ctx.save(); ctx.globalAlpha = clamp(q * 2);
          ctx.fillStyle = rgba(C.ink, 0.05 + 0.08 * flash); ctx.fillRect(px - h, py - h, 2 * h, 2 * h);
          ctx.strokeStyle = rgba(C.ink, 0.92); ctx.lineWidth = Math.max(1.2, lw * 0.7); ctx.strokeRect(px - h, py - h, 2 * h, 2 * h);
          U.text(ctx, String(Q[r][c]), px, py + cs * 0.04, `${Math.round(cs * 0.5 * sc)}px ${F.main}`, rgba(C.ink, 1), 'center', 'middle');
          ctx.restore();
        }
      });
      // counter
      const done = seg(p, a1, a1 + 0.06), nx = tx + 3 * cs + cs * 0.8 + numW / 2, ny = ty + 1.15 * cs;
      const cnt = String(shown + 1), ca = seg(p, 0.08, 0.18, ease.out);
      const pop = done > 0 ? 1 + 0.14 * Math.sin(Math.PI * done) + 0.03 * k : 1;
      const font = `${Math.round(fs * pop)}px ${F.main}`;
      const col = done > 0 ? rgba(C.amber, 1) : rgba(C.ink, 0.9);
      U.text(ctx, cnt, nx, ny + fs * 0.05, font, col, 'center', 'middle', ca);
      if (done > 0) U.text(hot, cnt, nx, ny + fs * 0.05, font, rgba(C.amber, 0.2 + 0.1 * k), 'center', 'middle', 1);
      // What the counter counts: reduced words of 4321 (= standard tableaux of the staircase).
      U.text(ctx, '#Red(4321)', nx, ty + 2.72 * cs, `${Math.round(cs * 0.42)}px ${F.main}`, rgba(C.ink, 0.75), 'center', 'alphabetic', ca);
      ctx.restore(); hot.restore();
    },
  };
})());
