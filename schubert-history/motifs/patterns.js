// 1990 — Lakshmibai–Sandhya: the Schubert variety X_w in Fl(n) is smooth iff
// w avoids the patterns 3412 and 4231.
// Drawn as permutation plots: column i (position) carries a dot at height w(i).
//   w = 42531 contains 4231 exactly once (positions 1,2,4,5 -> values 4,2,3,1)
//     and avoids 3412, so X_w is singular;
//   v = 43521 (swap the middle two of that occurrence: values 2 <-> 3 at
//     positions 2 and 4) avoids both 3412 and 4231, so X_v is smooth.
// (Brute force over all 4-subsets, here and in python; l(w) = 7, l(v) = 8.)
// Independent check: the Bruhat-interval rank generating function of [e, w] is
// 1,4,9,14,15,11,5,1 (not palindromic: singular, Carrell-Peterson) and of
// [e, v] is 1,4,9,14,16,14,9,4,1 (palindromic: smooth).
// Story (4-beat slot): "X_w smooth?"; the 4231 template flies out of its badge
// and stretches onto the four dots it matches (beat 2) -> "X_w singular"; the
// two middle dots trade heights, digits roll (beat 3) -> "X_v smooth" + check;
// then a quiet scan over the smooth permutation and a beat-4 pulse.
MOTIF('patterns', (() => {
  const W = [4, 2, 5, 3, 1], n = W.length;
  const P3412 = [3, 4, 1, 2], P4231 = [4, 2, 3, 1];
  const std = a => a.map(x => a.filter(y => y <= x).length);
  const occ = (w, pat) => {
    const out = [], m = w.length;
    for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) for (let c = b + 1; c < m; c++) for (let d = c + 1; d < m; d++) {
      const s = std([w[a], w[b], w[c], w[d]]);
      if (s.every((x, i) => x === pat[i])) out.push([a, b, c, d]);
    }
    return out;
  };
  const O = occ(W, P4231)[0];                              // 0-indexed positions [0,1,3,4]
  const V = W.slice(); [V[O[1]], V[O[2]]] = [V[O[2]], V[O[1]]];   // 4 3 5 2 1
  const VALS = O.map(i => W[i]).sort((a, b) => a - b);   // values the occurrence uses, ascending
  const MOVED = [O[1], O[2]];
  if (occ(W, P4231).length !== 1 || occ(W, P3412).length || occ(V, P4231).length || occ(V, P3412).length) {
    console.error('patterns: example is not as claimed');
  }

  // Layout in units of the lattice spacing s. Wide boxes: badges flank the grid,
  // verdict above, one-line notation below. Narrow boxes: badges in a row at the bottom.
  function layout(box) {
    const sA = Math.min(box.w * 0.96 / 9.5, box.h * 0.95 / 6.15);
    const sB = Math.min(box.w * 0.96 / 6.6, box.h * 0.95 / 8.9);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    if (sA >= sB) {
      const s = sA, gy = cy + 0.06 * s, sb = 0.4 * s;
      return {
        s, sb, gx: cx, gy, wide: true,
        badges: [{ x: cx - 3.85 * s, y: gy - 0.18 * s }, { x: cx + 3.85 * s, y: gy - 0.18 * s }],
        vy: gy - 2.74 * s,                   // verdict baseline
        dy: gy + 2.92 * s,                   // one-line notation baseline
      };
    }
    // Stacked (finale-wall tiles): verdict on top as in the wide layout, the badges as a
    // legend row under the notation, so the film's year tag (top left) never meets them.
    const s = sB, sb = 0.4 * s, top = cy - 4.2 * s, vy = top + 0.36 * s, gy = vy + 2.74 * s, dy = gy + 2.92 * s;
    return {
      s, sb, gx: cx, gy, wide: false,
      badges: [{ x: cx - 1.35 * s, y: dy + 1.1 * s }, { x: cx + 1.35 * s, y: dy + 1.1 * s }],
      vy, dy,
    };
  }

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const L = layout(box), { s, sb, gx, gy } = L;
      const u = s / 104;                                   // 1 at the full stage
      const lw = Math.max(1.1, 2.4 * Math.min(1, u)), lwThin = Math.max(0.8, 1.5 * Math.min(1, u));
      const X = i => gx + (i - (n - 1) / 2) * s;           // i: 0-indexed position
      const Y = v => gy - (v - (n + 1) / 2) * s;           // v: value 1..n (up)
      const ext = 0.42 * s;
      const drift = 1 + 0.025 * ease.soft(clamp((p - 0.3) / 0.7));
      const cxB = box.x + box.w / 2, cyB = box.y + box.h / 2;
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cxB, cyB); g.scale(drift, drift); g.translate(-cxB, -cyB); }
      ctx.lineJoin = hot.lineJoin = 'round';

      // ---- timeline (beats of a 4-beat slot at p = 0, .25, .5, .75)
      const FLY = [0.12, 0.25];           // template flies from its badge, lands on beat 2
      const hit = seg(p, 0.25, 0.3, ease.out);             // impact flash
      const red = seg(p, 0.24, 0.255) * (1 - seg(p, 0.42, 0.5));   // singular state
      const MORPH = [0.4, 0.5];           // the two middle dots trade heights, landing on beat 3
      const mq = ease.inOut(seg(p, MORPH[0], MORPH[1]));
      const smooth = seg(p, 0.48, 0.56, ease.out);
      const check = seg(p, 0.5, 0.6, ease.out);
      const flipQ = seg(p, 0.42, 0.5, ease.inOut);

      // ---- lattice of the big plot
      const la = seg(p, 0, 0.1, ease.out);
      ctx.save(); ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = lwThin; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const q = clamp(la * 1.6 - i * 0.12);
        if (q <= 0) continue;
        const x = X(i), y = Y(i + 1), y0 = Y(n) - ext, y1 = Y(1) + ext, x0 = X(0) - ext, x1 = X(n - 1) + ext;
        ctx.moveTo(x, y0); ctx.lineTo(x, lerp(y0, y1, q));
        ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, q), y);
      }
      ctx.stroke(); ctx.restore();

      // ---- badges: the two forbidden patterns
      const BAD = [P3412, P4231];
      const act = seg(p, FLY[0] - 0.02, FLY[0] + 0.03) * (1 - seg(p, 0.42, 0.48));   // 4231 badge armed
      const bfs = Math.max(9, Math.round(0.3 * s));
      BAD.forEach((pat, bi) => {
        const b = L.badges[bi], q = U.stagger(p, bi, 2, 0.03, 0.17, 0.6);
        if (q <= 0) return;
        const on = bi === 1 ? act : 0, sc = U.pop(q) * (1 + 0.05 * on * k + 0.03 * seg(p, 0.6, 0.7) * k);
        const BX = j => (j - 1.5) * sb, BY = v => -(v - 2.5) * sb;
        const half = 2 * sb, e = 0.42 * sb;
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(q * 1.5);
        // chip frame
        ctx.strokeStyle = on > 0.01 ? rgba(C.red, 0.35 + 0.5 * on) : rgba(C.dim, 0.45); ctx.lineWidth = lwThin;
        ctx.beginPath(); ctx.roundRect(-half, -half, 2 * half, 2 * half, 0.22 * sb); ctx.stroke();
        ctx.strokeStyle = rgba(C.faint, 1); ctx.lineWidth = lwThin * 0.9; ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          ctx.moveTo(BX(j), BY(4) - e); ctx.lineTo(BX(j), BY(1) + e);
          ctx.moveTo(BX(0) - e, BY(j + 1)); ctx.lineTo(BX(3) + e, BY(j + 1));
        }
        ctx.stroke();
        ctx.strokeStyle = on > 0.01 ? rgba(C.red, 0.5 + 0.4 * on) : rgba(C.dim, 0.7); ctx.lineWidth = lwThin;
        ctx.beginPath(); pat.forEach((v, j) => (j ? ctx.lineTo(BX(j), BY(v)) : ctx.moveTo(BX(j), BY(v)))); ctx.stroke();
        pat.forEach((v, j) => U.dot(ctx, BX(j), BY(v), 0.17 * sb, on > 0.5 ? rgba(C.red, 1) : rgba(C.ink, 0.95)));
        U.text(ctx, pat.join(''), 0, half + 0.18 * s + bfs * 0.72, `${bfs}px ${F.main}`, on > 0.5 ? rgba(C.red, 1) : rgba(C.ink, 0.8), 'center');
        ctx.restore();
        if (on > 0.01) {
          hot.save(); hot.translate(b.x, b.y); hot.scale(sc, sc);
          hot.strokeStyle = rgba(C.red, 0.35 * on); hot.lineWidth = lwThin;
          hot.beginPath(); hot.roundRect(-half, -half, 2 * half, 2 * half, 0.22 * sb); hot.stroke();
          hot.restore();
        }
      });

      // ---- the 4231 template: badge sub-lattice -> stretched onto the occurrence
      const fq = ease.inOut(seg(p, FLY[0], FLY[1]));
      const tA = seg(p, FLY[0], FLY[0] + 0.03) * (1 - seg(p, 0.4, 0.47));
      if (tA > 0.01) {
        const b = L.badges[1];
        const tx = j => lerp(b.x + (j - 1.5) * sb, X(O[j]), fq);
        const ty = r => lerp(b.y - (r - 1.5) * sb, Y(VALS[r]), fq);   // r: 0..3 (pattern value r+1)
        const te = lerp(0.42 * sb, ext, fq) * (1 + 0.15 * seg(p, 0.4, 0.47));
        const pathT = g => {
          g.beginPath();
          for (let j = 0; j < 4; j++) {
            g.moveTo(tx(j), ty(3) - te); g.lineTo(tx(j), ty(0) + te);
            g.moveTo(tx(0) - te, ty(j)); g.lineTo(tx(3) + te, ty(j));
          }
        };
        ctx.save(); ctx.strokeStyle = rgba(C.red, 0.75 * tA); ctx.lineWidth = lwThin * 1.2; pathT(ctx); ctx.stroke(); ctx.restore();
        hot.save(); hot.strokeStyle = rgba(C.red, (0.18 + 0.3 * (1 - hit) * seg(p, 0.22, 0.25)) * tA); hot.lineWidth = lwThin * 1.2; pathT(hot); hot.stroke(); hot.restore();
        // the template's own four markers ride along until they land on the dots
        if (fq < 1) {
          P4231.forEach((v, j) => U.ring(ctx, tx(j), ty(v - 1), lerp(0.17 * sb, 0.13 * s, fq) * 1.6, rgba(C.red, 0.9 * tA), lwThin * 1.2));
        }
      }

      // ---- current dot positions
      const yOf = i => {
        if (!MOVED.includes(i)) return Y(W[i]);
        return lerp(Y(W[i]), Y(V[i]), mq);
      };
      const inOcc = i => O.includes(i);

      // ---- polyline through the occurrence (pattern shape), red; it follows the morph and fades
      const plq = seg(p, 0.25, 0.34, ease.out), plFade = 1 - seg(p, 0.5, 0.6);
      if (plq > 0 && plFade > 0) {
        const pts = O.map(i => [X(i), yOf(i)]);
        const col = mq > 0 ? rgba(C.dim, 0.6 * mq * plFade) : rgba(C.red, 0.85);
        if (mq > 0) { ctx.save(); ctx.strokeStyle = rgba(C.red, 0.85 * (1 - mq)); ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((q, j) => (j ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.stroke(); ctx.restore(); }
        const tot = pts.length - 1, upto = plq * tot;
        const pl = g => {
          g.beginPath(); g.moveTo(...pts[0]);
          for (let j = 1; j <= tot; j++) {
            const f = clamp(upto - (j - 1));
            if (f <= 0) break;
            g.lineTo(lerp(pts[j - 1][0], pts[j][0], f), lerp(pts[j - 1][1], pts[j][1], f));
          }
        };
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; pl(ctx); ctx.stroke(); ctx.restore();
        if (red > 0.01) { hot.save(); hot.strokeStyle = rgba(C.red, 0.4 * red); hot.lineWidth = lw; pl(hot); hot.stroke(); hot.restore(); }
      }

      // ---- scan over the smooth permutation (keeps the last beats alive): a cyan line with a
      // trailing band sweeps the lattice, left edge to right edge, ringing each dot it
      // passes; it stays inside the lattice (clipped) and fades out at the right edge.
      const scan = seg(p, 0.6, 0.95, ease.inOut);
      const sx0 = X(0) - ext, sx1 = X(n - 1) + ext;
      const scanX = lerp(sx0, sx1, scan);
      const scanA = seg(p, 0.6, 0.65) * (1 - seg(p, 0.86, 0.95));
      if (scanA > 0.01) {
        ctx.save(); ctx.beginPath(); ctx.rect(sx0, Y(n) - ext, sx1 - sx0, Y(1) - Y(n) + 2 * ext); ctx.clip();
        const gr = ctx.createLinearGradient(scanX - 0.6 * s, 0, scanX, 0);
        gr.addColorStop(0, rgba(C.cyan, 0)); gr.addColorStop(1, rgba(C.cyan, 0.07 * scanA));
        ctx.fillStyle = gr; ctx.fillRect(scanX - 0.6 * s, Y(n) - ext, 0.6 * s, Y(1) - Y(n) + 2 * ext);
        ctx.restore();
        U.line(ctx, scanX, Y(n) - ext, scanX, Y(1) + ext, rgba(C.cyan, 0.55 * scanA), lwThin);
      }

      // ---- dots
      const rd = 0.13 * s;
      for (let i = 0; i < n; i++) {
        const q = U.stagger(p, i, n, 0.02, 0.17, 0.5);
        if (q <= 0) continue;
        const x = X(i), y = yOf(i), occ4 = inOcc(i);
        const r = rd * U.pop(q) * (1 + (occ4 ? 0.08 * red * k : 0) + 0.05 * smooth * k);
        const moving = MOVED.includes(i) ? Math.sin(Math.PI * mq) : 0;
        const pass = scanA * clamp(1 - Math.abs(scanX - x) / (0.45 * s));
        const dimOther = !occ4 ? 1 - 0.45 * red : 1;
        U.dot(ctx, x, y, r, occ4 && red > 0.5 ? rgba(C.red, 1) : rgba(C.ink, dimOther));
        if (occ4) {
          const iq = seg(p, 0.25, 0.37);
          if (iq > 0 && iq < 1) U.ring(ctx, x, y, r * (1.6 + 2.2 * ease.out(iq)), rgba(C.red, 0.85 * (1 - iq)), lwThin * 1.2);
        }
        if (occ4 && red > 0.01) {
          U.ring(ctx, x, y, r * (1.9 + 0.5 * (1 - hit)), rgba(C.red, red * (0.55 + 0.45 * (1 - hit))), lwThin * 1.2);
          U.dot(hot, x, y, r * 1.15, rgba(C.red, 0.55 * red * (0.7 + 0.3 * k)));
        }
        if (moving > 0.01) U.dot(hot, x, y, r * 1.1, rgba(C.amber, 0.45 * moving));
        // landing ripple on beat 3 for the two dots that moved
        if (MOVED.includes(i)) {
          const rq = seg(p, 0.5, 0.64);
          if (rq > 0 && rq < 1) U.ring(ctx, x, y, r * (1.4 + 1.8 * ease.out(rq)), rgba(C.amber, 0.8 * (1 - rq)), lwThin * 1.2);
        }
        if (pass > 0.01) U.ring(ctx, x, y, r * 1.9, rgba(C.cyan, 0.8 * pass), lwThin);
      }

      // ---- one-line notation under the columns
      const fd = Math.max(9, Math.round(0.44 * s));
      for (let i = 0; i < n; i++) {
        const q = U.stagger(p, i, n, 0.04, 0.2, 0.5);
        if (q <= 0) continue;
        const x = X(i), y = L.dy;
        const col = (inOcc(i) && red > 0.5) ? rgba(C.red, 1) : rgba(C.ink, 0.95);
        if (MOVED.includes(i) && mq > 0) {
          // Odometer: a window one digit tall; the old digit rolls fully out the way its
          // dot moves while the new one rolls in, then the new digit cools amber -> ink.
          const dir = Math.sign(V[i] - W[i]), T = 0.92 * fd;
          const cool = seg(p, MORPH[1], MORPH[1] + 0.16, ease.out);
          const inCol = rgba(C.amber.map((a, j) => Math.round(lerp(a, C.ink[j], cool))), 0.95);
          ctx.save(); ctx.beginPath(); ctx.rect(x - 0.45 * s, y - 0.86 * fd, 0.9 * s, 1.04 * fd); ctx.clip();
          if (mq < 1) U.text(ctx, String(W[i]), x, y - dir * mq * T, `${fd}px ${F.main}`, col, 'center', 'alphabetic', q * (1 - 0.5 * mq));
          U.text(ctx, String(V[i]), x, y + dir * (1 - mq) * T, `${fd}px ${F.main}`, inCol, 'center', 'alphabetic', q * (0.5 + 0.5 * mq));
          ctx.restore();
        } else {
          U.text(ctx, String(W[i]), x, y, `${fd}px ${F.main}`, col, 'center', 'alphabetic', q);
        }
      }
      const lq = seg(p, 0.04, 0.16, ease.out);
      if (lq > 0) {
        const lx = X(0) - 0.5 * s;
        U.math(ctx, 'w\\,=', lx, L.dy, fd, rgba(C.dim, 1), 'right', lq * (1 - mq));
        if (mq > 0) U.math(ctx, 'v\\,=', lx, L.dy, fd, rgba(C.dim, 1), 'right', lq * mq);
      }

      // ---- verdict: X_w smooth?  ->  X_w singular (beat 2)  ->  X_v smooth ✓ (beat 3), card flips
      const fv = Math.max(10, Math.round(0.46 * s));
      const vIn = U.pop(seg(p, 0.07, 0.17));
      if (vIn > 0) {
        const f1 = seg(p, 0.235, 0.29, ease.inOut);
        const state = flipQ >= 0.5 ? 2 : f1 >= 0.5 ? 1 : 0;
        const sy = Math.max(0.03, Math.abs(Math.cos(Math.PI * (flipQ > 0 ? flipQ : f1))));
        const sym = state === 2 ? 'X_{v}' : 'X_{w}', word = ['smooth?', 'singular', 'smooth'][state];
        const wf = `${fv}px ${F.main}`;
        const ws = U.math(ctx, sym, -9999, -9999, fv, 'rgba(0,0,0,0)', 'left', 0);
        ctx.font = wf; const ww = ctx.measureText(word).width;
        const gap = 0.32 * fv, ck = state === 2 ? 0.62 * fv + gap : 0;
        const tot = ws + gap + ww + ck, x0 = gx - tot / 2, base = L.vy;
        const mid = base - 0.3 * fv;
        const pulse = 1 + 0.03 * k * (state === 2 ? smooth : state === 1 ? red : 0);
        for (const g of [ctx, hot]) {
          g.save(); g.translate(gx, mid); g.scale(vIn * pulse, vIn * sy * pulse); g.translate(-gx, -mid);
        }
        U.math(ctx, sym, x0, base, fv, rgba(C.ink, 0.95), 'left');
        const wc = [C.dim, C.red, C.amber][state];
        U.text(ctx, word, x0 + ws + gap, base, wf, rgba(wc, 1), 'left');
        if (state) U.text(hot, word, x0 + ws + gap, base, wf, rgba(wc, state === 2 ? 0.22 * smooth : 0.2 * red), 'left');
        if (state === 2 && check > 0) {
          const h = 0.62 * fv, cx0 = x0 + ws + gap + ww + gap, cyc = base - 0.36 * fv;
          const P = [[cx0, cyc], [cx0 + 0.36 * h, cyc + 0.34 * h], [cx0 + h, cyc - 0.5 * h]];
          const l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
          const d = check * (l1 + l2);
          for (const [g, a] of [[ctx, 1], [hot, 0.55 * (0.8 + 0.2 * k)]]) {
            g.save(); g.strokeStyle = rgba(C.amber, a); g.lineWidth = Math.max(1.5, 0.075 * fv); g.lineCap = 'round'; g.beginPath(); g.moveTo(...P[0]);
            if (d <= l1) g.lineTo(lerp(P[0][0], P[1][0], d / l1), lerp(P[0][1], P[1][1], d / l1));
            else { g.lineTo(...P[1]); const f = (d - l1) / l2; g.lineTo(lerp(P[1][0], P[2][0], f), lerp(P[1][1], P[2][1], f)); }
            g.stroke(); g.restore();
          }
        }
        ctx.restore(); hot.restore();
      }
      ctx.restore(); hot.restore();
    },
  };
})());
