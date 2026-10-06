// 1994–96 — Fomin–Stanley, "Schubert polynomials and the nilCoxeter algebra";
// Fomin–Kirillov, "The Yang–Baxter equation, symmetric functions, and Schubert polynomials".
//
// NilCoxeter algebra: u_1, ..., u_{n-1} with u_i^2 = 0, u_i u_j = u_j u_i (|i-j| >= 2),
// u_i u_{i+1} u_i = u_{i+1} u_i u_{i+1}; u_w = u_{a_1}...u_{a_l} for a reduced word of
// w = s_{a_1}...s_{a_l} (and 0 for a non-reduced word). Fomin–Stanley: with
// h_j(x) = 1 + x u_j and A_i(x) = h_{n-1}(x) h_{n-2}(x) ... h_i(x),
//     A_1(x_1) A_2(x_2) ... A_{n-1}(x_{n-1}) = sum_w S_w(x) u_w.
// For n = 3 (the picture):
//     (1 + x1 u2)(1 + x1 u1)(1 + x2 u2)
//       = 1 + x1 u1 + (x1 + x2) u2 + x1^2 u2u1 + x1x2 u1u2 + x1^2x2 u2u1u2,
// i.e. S_123 = 1, S_213 = x1, S_132 = x1+x2, S_312 = x1^2, S_231 = x1x2, S_321 = x1^2x2.
// Checked with python (sympy): the product, expanded in the nilCoxeter algebra, equals the
// divided-difference Schubert polynomials for n = 3, 4, 5, and of the six orders of the
// three factors only this one works. The expansion is recomputed below as a self-check.
//
// Picture: the product's three factors are three "gates" (columns) on three strands; a
// term of the expansion picks 1 or x u_j in each factor, i.e. crosses strands j, j+1 at
// that column or not. The 2^3 = 8 choices pop in on sixteenth notes: x1u2 and x2u2 land
// in the same u2 term (coefficient x1 + x2); the double crossing u2u2 dies (u2^2 = 0, a
// red 0 -- nilpotent, not the identity); the last term u2u1u2 = u_{w0} lands in amber and
// slides through the Yang–Baxter triple point to u1u2u1 and back.
MOTIF('nilcoxeter', (() => {
  const GATES = [[1, 2], [1, 1], [2, 2]];               // factor c = (1 + x_a u_j): [a, j]
  // Final terms, one per permutation of S_3 (one-line w = s_{a_1} ... s_{a_l}).
  const SLOTS = [
    { w: '123', coef: ['1'], polys: [[0, 0]] },
    { w: '213', coef: ['x_1'], polys: [[1, 0]] },
    { w: '132', coef: ['(', 'x_1', '+', 'x_2', ')'], polys: [[1, 0], [0, 1]] },
    { w: '312', coef: ['x_1^2'], polys: [[2, 0]] },
    { w: '231', coef: ['x_1x_2'], polys: [[1, 1]] },
    { w: '321', coef: ['x_1^2x_2'], polys: [[2, 1]] },
  ];
  // The 8 choices (subsets of factors, 0-based), the slot they land in and when (p).
  const EVENTS = [
    { sub: [], slot: 0, t: 0.035 },
    { sub: [1], slot: 1, t: 0.0625 },
    { sub: [0], slot: 2, t: 0.125 },
    { sub: [2], slot: 2, t: 0.1875 },                  // merges: (x1 + x2) u2
    { sub: [0, 1], slot: 3, t: 0.25 },
    { sub: [0, 2], slot: 5, t: 0.3125, dead: true },   // x1 x2 u2 u2 = 0
    { sub: [1, 2], slot: 4, t: 0.375 },
    { sub: [0, 1, 2], slot: 5, t: 0.5, top: true },    // x1^2 x2 u_{w0}
  ];

  // ---- self-check: expand the product in the nilCoxeter algebra
  const sArr = (w, i) => { const v = w.slice(); [v[i - 1], v[i]] = [v[i], v[i - 1]]; return v; }; // w s_i
  const inv = w => { let n = 0; for (let a = 0; a < w.length; a++) for (let b = a + 1; b < w.length; b++) if (w[a] > w[b]) n++; return n; };
  // Crossings of a choice: the strands (by start level) that cross at each chosen column.
  const crossings = sub => {
    const at = [1, 2, 3], X = {};
    sub.forEach(c => {
      const j = GATES[c][1], a = at[j - 1], b = at[j], key = Math.min(a, b) * 10 + Math.max(a, b);
      (X[key] = X[key] || []).push(c);
      at[j - 1] = b; at[j] = a;
    });
    return X;
  };
  (function check() {
    const got = {};
    EVENTS.forEach(e => {
      let w = [1, 2, 3], alive = true;
      e.sub.forEach(c => { const v = sArr(w, GATES[c][1]); if (inv(v) !== inv(w) + 1) alive = false; w = v; });
      const mono = [0, 0]; e.sub.forEach(c => { mono[GATES[c][0] - 1]++; });
      if (!alive) { if (!e.dead) console.error('nilcoxeter: unexpected zero term'); return; }
      if (e.dead) console.error('nilcoxeter: dead term is not zero');
      const key = w.join('');
      if (key !== SLOTS[e.slot].w) console.error('nilcoxeter: term in wrong slot', key);
      (got[key] = got[key] || []).push(mono.join());
    });
    SLOTS.forEach(s => {
      const a = (got[s.w] || []).sort().join('|'), b = s.polys.map(m => m.join()).sort().join('|');
      if (a !== b) console.error('nilcoxeter: coefficient mismatch for', s.w, a, b);
    });
  })();

  const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

      // ---------------------------------------------------------------- sizes (units of fz)
      const PS = 0.80, QS = 0.76, LS = 0.36;              // product, coefficient, label sizes
      const DW = 3.3, GS = 0.58;                           // diagram width, strand spacing
      const ROW0 = 1.62, PITCH = 1.78;                     // product baseline -> row centres
      const mw = (s, sz) => U.math(ctx, s, -99999, -99999, sz, 'rgba(0,0,0,0)');
      const pieceGap = (a, b) => (a === '+' || b === '+' ? 0.2 : 0.02);
      const piecesW = (arr, sz) => arr.reduce((acc, s, i) => acc + mw(s, sz) + (i ? pieceGap(arr[i - 1], s) * sz : 0), 0);
      const FACT = GATES.map(([a, j]) => ['(', '1', '+', `x_${a}u_${j}`, ')']);
      // measure at size 100
      const prodW = FACT.reduce((acc, f) => acc + piecesW(f, PS * 100), 0) / 100 + 0.1;
      const coefW = SLOTS.map(s => piecesW(s.coef, QS * 100) / 100);
      const signW = mw('=', QS * 100) / 100, plusW = mw('+', QS * 100) / 100;
      const CG = 0.32, SG = 0.3;                           // coef->diagram gap, sign gaps
      const leadW = [Math.max(signW + SG + coefW[0], plusW + SG + coefW[2], plusW + SG + coefW[4]),
        Math.max(plusW + SG + coefW[1], plusW + SG + coefW[3], plusW + SG + coefW[5])];
      const termsW = leadW[0] + CG + DW + SG + leadW[1] + CG + DW;
      const Wc = Math.max(prodW, termsW);
      const topY = -0.62 * PS, botY = ROW0 + 2 * PITCH + GS + 0.08;
      const Hc = botY - topY;
      const fz = Math.min(box.w * 0.9 / Wc, box.h * 0.82 / Hc);
      const lw = clamp(fz * 0.038, 1, 3.2);
      // origin: content centred in the box
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const oy = cy - (Hc * fz) / 2 - topY * fz;           // product baseline
      const tx0 = cx - termsW * fz / 2;                     // left of the terms block
      const colX = [tx0 + leadW[0] * fz, tx0 + (leadW[0] + CG + DW + SG + leadW[1]) * fz];   // right edges of coefficient columns
      const rowY = r => oy + (ROW0 + r * PITCH) * fz;
      const slotPos = i => ({ r: Math.floor(i / 2), c: i % 2 });
      // diagram origin for slot i (left end, middle strand)
      const diagX = i => colX[i % 2] + CG * fz;

      const drift = 1 + 0.025 * ease.soft(clamp((p - 0.3) / 0.7));
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      // ---------------------------------------------------------------- event state
      const popOf = t => clamp((p - t) / 0.07);
      const flashOf = (t, len = 0.07) => (p >= t ? Math.exp(-(p - t) / len) * (p - t < 0.25 ? 1 : 0) : 0);
      // which factors' x u summands are lit (cyan) right now
      const lit = [0, 0, 0];
      EVENTS.forEach(e => { const f = flashOf(e.t, 0.05); e.sub.forEach(c => { lit[c] = Math.max(lit[c], f); }); });
      // keep-alive: u2 crossing slides back to column 0 (x1) at beat 3
      const slideBack = ease.inOut(seg(p, 0.75, 0.85));
      const slideFwd = ease.inOut(seg(p, EVENTS[3].t, EVENTS[3].t + 0.06));
      const u2col = lerp(lerp(0, 2, slideFwd), 0, slideBack);
      const x2lit = Math.max(flashOf(EVENTS[3].t, 0.06), 0);
      const x1lit = Math.sin(Math.PI * seg(p, 0.75, 0.93)) * (p > 0.75 ? 1 : 0);
      lit[0] = Math.max(lit[0], 0.85 * x1lit);
      // top term: braid 212 -> 121 -> 212
      const yb = ease.inOut(seg(p, 0.54, 0.67)) - ease.inOut(seg(p, 0.84, 0.97));
      const topOn = p >= EVENTS[7].t;
      if (topOn) { const f = Math.exp(-(p - 0.5) / 0.08) * 0.9; for (let c = 0; c < 3; c++) lit[c] = Math.max(lit[c], f); }
      if (yb > 0.02 && yb < 0.98) for (let c = 0; c < 3; c++) lit[c] = Math.max(lit[c], 0.35 * Math.sin(Math.PI * yb));

      // ---------------------------------------------------------------- product line
      const ink = C.ink, cyan = C.cyan;
      {
        const sz = PS * fz;
        let x = cx - (prodW - 0.1) * fz / 2;
        FACT.forEach((f, c) => {
          const q = ease.out(clamp((p - c * 0.018) / 0.06));
          const dy = (1 - q) * sz * 0.35;
          f.forEach((s, i) => {
            if (i) x += pieceGap(f[i - 1], s) * sz;
            const w = mw(s, sz);
            const isXU = i === 3, L = isXU ? lit[c] : 0;
            const col = isXU ? mix(ink, cyan, clamp(L * 1.2)) : (s === '(' || s === ')' ? C.dim : ink);
            U.math(ctx, s, x, oy + dy, sz, rgba(col, s === '+' ? 0.8 : 0.96), 'left', q);
            if (isXU && L > 0.03) {
              // underline bar marking the chosen summand
              ctx.save(); ctx.globalAlpha = q * L; ctx.fillStyle = rgba(cyan, 0.95);
              ctx.fillRect(x, oy + sz * 0.42, w, Math.max(1.5, lw * 0.9)); ctx.restore();
              hot.save(); hot.globalAlpha = q * L * 0.5; hot.fillStyle = rgba(cyan, 1);
              hot.fillRect(x, oy + sz * 0.42, w, Math.max(1.5, lw * 0.9)); hot.restore();
            }
            x += w;
          });
        });
      }

      // ---------------------------------------------------------------- strands
      const gS = GS * fz, dW = DW * fz, hw = 0.13 * dW;
      const colAt = c => dW * (0.2 + 0.3 * c);
      // X: { pairKey: [column positions] } ; level of strand l at local x
      const levelAt = (l, x, X) => {
        let lev = l;
        for (const key in X) {
          const a = Math.floor(key / 10), b = key % 10;
          if (a !== l && b !== l) continue;
          let sw = 0;
          X[key].forEach((c, m) => { sw += (m % 2 ? -1 : 1) * smooth((x - colAt(c) + hw) / (2 * hw)); });
          lev += a === l ? sw : -sw;
        }
        return lev;
      };
      // Draw a 3-strand diagram with its left end at (x0, ym) (ym = middle strand).
      const diagram = (g, x0, ym, X, o) => {
        const { q = 1, color, alpha = 1, width = lw, sy = 1, dots = true, only = null } = o;
        if (q <= 0 || alpha <= 0.002) return;
        g.save(); g.globalAlpha *= alpha; g.strokeStyle = color; g.lineWidth = width;
        g.lineJoin = 'round'; g.lineCap = 'round';
        const N = 64, xe = dW * q;
        for (let l = 1; l <= 3; l++) {
          if (only && !only.includes(l)) continue;
          g.beginPath();
          for (let i = 0; i <= N; i++) {
            const x = Math.min(xe, dW * i / N);
            const y = ym + (levelAt(l, x, X) - 2) * gS * sy;
            i ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y);
            if (x >= xe) break;
          }
          g.stroke();
        }
        if (dots) {
          g.fillStyle = color;
          for (let l = 1; l <= 3; l++) {
            const r = Math.max(1.2, width * 1.1);
            U.dot(g, x0, ym + (l - 2) * gS * sy, r, color);
            if (q >= 1) U.dot(g, x0 + dW, ym + (levelAt(l, dW, X) - 2) * gS * sy, r, color);
          }
        }
        g.restore();
      };

      // faint gate guides: the three columns = the three factors of the product
      const guides = (x0, ym, a) => {
        if (a <= 0.01) return;
        ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = Math.max(1, lw * 0.6);
        ctx.setLineDash([Math.max(2, gS * 0.1), Math.max(2, gS * 0.12)]);
        for (let c = 0; c < 3; c++) {
          ctx.beginPath(); ctx.moveTo(x0 + colAt(c), ym - gS * 1.3); ctx.lineTo(x0 + colAt(c), ym + gS * 1.3); ctx.stroke();
        }
        ctx.restore();
      };

      // ---------------------------------------------------------------- signs
      const sz = QS * fz;
      const slotStart = SLOTS.map((_, i) => Math.min(...EVENTS.filter(e => e.slot === i).map(e => e.t)));
      const mergeM = ease.inOut(seg(p, EVENTS[3].t, EVENTS[3].t + 0.035));
      const curCoefW = i => (i === 2 ? lerp(mw('x_1', sz), coefW[2] * fz, mergeM) : coefW[i] * fz);
      // each term's sign floats just left of its coefficient (the diagrams stay on a grid)
      SLOTS.forEach((_, i) => {
        const a = ease.out(popOf(slotStart[i])), xr = diagX(i) - CG * fz;
        if (a <= 0) return;
        U.math(ctx, i === 0 ? '=' : '+', xr - curCoefW(i) - SG * fz, rowY(slotPos(i).r) + sz * 0.27, sz, rgba(ink, 0.7), 'right', a);
      });

      // ---------------------------------------------------------------- terms
      const drawCoef = (g, pieces, xr, y, colors, alpha, scale = 1) => {
        // right-aligned at xr, baseline y; colors[i] per piece
        const s = sz * scale, tot = piecesW(pieces, s);
        let x = xr - tot;
        pieces.forEach((pc, i) => {
          if (i) x += pieceGap(pieces[i - 1], pc) * s;
          U.math(g, pc, x, y, s, colors[i], 'left', alpha);
          x += mw(pc, s);
        });
      };
      const lab = SLOTS.map((_, i) => ease.out(seg(p, 0.56 + 0.025 * i, 0.66 + 0.025 * i)));
      SLOTS.forEach((S, i) => {
        const { r } = slotPos(i), ym = rowY(r), xd = diagX(i), xr = xd - CG * fz;
        const evs = EVENTS.filter(e => e.slot === i && !e.dead);
        const first = evs[0], q = popOf(first.t);
        if (q <= 0) return;
        const top = !!first.top, sc = U.pop(q) * (top ? 1 + 0.035 * k : 1);
        const fresh = Math.exp(-(p - first.t) / 0.06);
        // crossings
        let X;
        if (i === 2) X = { 23: [u2col] };
        else if (top) {
          // u2u1u2 (cols 0,1,2: 23,13,12) <-> u1u2u1 (12,13,23): Yang–Baxter slide
          X = { 12: [lerp(2, 0, yb)], 13: [1], 23: [lerp(0, 2, yb)] };
        } else X = crossings(first.sub);
        const base = top ? C.amber : ink;
        const wc = mix(base, cyan, top ? 0 : 0.6 * fresh);
        // pop: scale about the term's centre
        const pcx = (xr - coefW[i] * fz * 0.5 + xd + dW) / 2;
        for (const g of [ctx, hot]) { g.save(); g.translate(pcx, ym); g.scale(sc, sc); g.translate(-pcx, -ym); }
        guides(xd, ym, clamp(q * 2.5));
        diagram(ctx, xd, ym, X, { q: ease.out(clamp(q * 1.6)), color: rgba(wc, top ? 1 : 0.92), alpha: clamp(q * 2.5) });
        if (top) diagram(hot, xd, ym, X, { q: ease.out(clamp(q * 1.6)), color: rgba(C.amber, 0.5 + 0.2 * k), alpha: 1, dots: false });
        // coefficient
        let cols = S.coef.map(() => rgba(top ? C.amber : mix(ink, cyan, 0.7 * fresh), 1));
        let pieces = S.coef, xr2 = xr;
        if (i === 2) {
          // x1 alone until x2 arrives, then (x1 + x2); x1/x2 light with the sliding crossing
          const t3 = EVENTS[3].t;
          const m1 = ease.inOut(seg(p, t3, t3 + 0.035)), m2 = ease.out(seg(p, t3 + 0.015, t3 + 0.065));
          const c1 = mix(ink, cyan, clamp(0.9 * x1lit + 0.7 * fresh)), c2 = mix(ink, cyan, clamp(x2lit));
          const fullW = piecesW(S.coef, sz), aloneW = mw('x_1', sz);
          // x1 slides left from its solo position into the bracket, then (, + x2, ) arrive
          const xFull = xr - fullW + mw('(', sz) + pieceGap('(', 'x_1') * sz;
          U.math(ctx, 'x_1', lerp(xr - aloneW, xFull, m1), ym + sz * 0.27, sz, rgba(c1, 1), 'left', 1);
          if (m2 > 0) {
            let x = xr - fullW;
            S.coef.forEach((pc, j) => {
              if (j) x += pieceGap(S.coef[j - 1], pc) * sz;
              if (j !== 1) {
                const dx = j === 3 ? (1 - m2) * sz * 0.6 : 0, dy = j === 3 ? 0 : 0;
                U.math(ctx, pc, x + dx, ym + sz * 0.27 + dy, sz, rgba(j === 3 ? c2 : j === 2 ? ink : C.dim, j === 2 ? 0.8 : 1), 'left', m2);
              }
              x += mw(pc, sz);
            });
          }
        } else {
          drawCoef(ctx, pieces, xr2, ym + sz * 0.27, cols, 1);
          if (top) drawCoef(hot, pieces, xr2, ym + sz * 0.27, pieces.map(() => rgba(C.amber, 0.2 + 0.08 * k)), 1);
        }
        for (const g of [ctx, hot]) g.restore();
        // Schubert polynomial label above the coefficient
        if (lab[i] > 0) {
          const ls = LS * fz, wcoef = coefW[i] * fz;
          U.math(ctx, `\\S_{${S.w}}`, xr - wcoef / 2, ym - 0.72 * fz - (1 - lab[i]) * ls * 0.4, ls,
            rgba(top ? C.amber : C.dim, top ? 0.9 : 1), 'center', lab[i]);
        }
      });

      // ---------------------------------------------------------------- the dead term u2 u2 = 0
      {
        const e = EVENTS[5], i = e.slot, ym = rowY(slotPos(i).r), xd = diagX(i), xr = xd - CG * fz;
        const q = popOf(e.t), red = seg(p, e.t + 0.06, e.t + 0.1), die = ease.in(seg(p, e.t + 0.1, e.t + 0.14));
        if (q > 0 && die < 1) {
          const sc = U.pop(q), syc = 1 - die;
          const col = mix(mix(ink, cyan, 0.6 * Math.exp(-(p - e.t) / 0.06)), C.red, red);
          const pcx = (xr - coefW[i] * fz * 0.5 + xd + dW) / 2;
          ctx.save(); ctx.translate(pcx, ym); ctx.scale(sc, sc * syc); ctx.translate(-pcx, -ym);
          guides(xd, ym, clamp(q * 2.5) * (1 - die));
          diagram(ctx, xd, ym, crossings(e.sub), { q: ease.out(clamp(q * 1.6)), color: rgba(col, 0.92), alpha: clamp(q * 2.5) * (1 - die) });
          drawCoef(ctx, ['x_1x_2'], xr, ym + sz * 0.27, [rgba(col, 1)], 1 - die);
          ctx.restore();
          if (red > 0) {
            // the two u2 crossings flash
            hot.save(); hot.globalAlpha = 0.5 * red * (1 - die);
            hot.translate(pcx, ym); hot.scale(sc, sc * syc); hot.translate(-pcx, -ym);
            diagram(hot, xd, ym, crossings(e.sub), { color: rgba(C.red, 1), dots: false, only: [2, 3], width: lw * 1.3 });
            hot.restore();
          }
        }
        // the red zero
        const z = seg(p, e.t + 0.12, e.t + 0.16), zf = 1 - seg(p, 0.47, 0.5);
        if (z > 0 && zf > 0) {
          const zs = sz * 1.15 * U.pop(z);
          const zx = (xr + xd + dW) / 2 - fz * 0.4;
          U.math(ctx, '0', zx, ym + zs * 0.35, zs, rgba(C.red, 1), 'center', zf * clamp(z * 2));
          U.math(hot, '0', zx, ym + zs * 0.35, zs, rgba(C.red, 0.22), 'center', zf * clamp(z * 2));
        }
      }
      ctx.restore(); hot.restore();
    },
  };
})());
