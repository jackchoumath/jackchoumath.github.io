// Littlewood-Richardson rule: c^nu_{lambda mu} = number of LR tableaux of skew
// shape nu/lambda and content mu (rows weakly increase, columns strictly
// increase, reverse reading word -- right to left, top to bottom -- is a
// lattice word). Here nu = (4,3,2), lambda = (2,1), mu = (3,2,1); the tableaux
// are enumerated below (brute force) and there are exactly two:
//     . . 1 1        . . 1 1
//     . 1 2          . 2 2
//     2 3            1 3          so c^{432}_{21,321} = 2
// (cross-checked independently by expanding s_21 * s_321 in 5 variables).
MOTIF('lr', (() => {
  const NU = [4, 3, 2], LAM = [2, 1], MU = [3, 2, 1];
  // Skew cells in reverse reading order (right to left, top to bottom).
  const CELLS = [];
  NU.forEach((len, r) => { for (let c = len - 1; c >= (LAM[r] || 0); c--) CELLS.push([r, c]); });
  // All LR tableaux: assign letters to CELLS (reading order) keeping the word a
  // lattice word with content MU, then check row/column conditions.
  const TABS = [];
  (function rec(i, word, cnt) {
    if (i === CELLS.length) {
      const T = {}; CELLS.forEach(([r, c], j) => { T[r + ',' + c] = word[j]; });
      const ok = CELLS.every(([r, c]) => {
        const v = T[r + ',' + c], right = T[r + ',' + (c + 1)], below = T[(r + 1) + ',' + c];
        return (right === undefined || right >= v) && (below === undefined || below > v);
      });
      if (ok) TABS.push(T);
      return;
    }
    for (let a = 1; a <= MU.length; a++) {
      if (cnt[a] >= MU[a - 1] || (a > 1 && cnt[a] + 1 > cnt[a - 1])) continue;
      cnt[a]++; rec(i + 1, [...word, a], cnt); cnt[a]--;
    }
  })(0, [], MU.map(() => 0).concat(0, 0));
  const COUNT = TABS.length; // = 2

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      const s = Math.min(box.w / 6.6, box.h / 5.6) * (1 + 0.025 * k);
      const lab = seg(p, 0.3, 0.42, ease.out);
      const drift = 1 + 0.03 * ease.soft(clamp((p - 0.35) / 0.65));
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const x0 = cx - 2 * s, y0 = cy - 1.5 * s - 0.55 * s * lab;
      ctx.save(); hot.save();
      for (const g of [ctx, hot]) { g.translate(cx, cy); g.scale(drift, drift); g.translate(-cx, -cy); }

      // Outline of nu, lambda filled grey.
      let idx = 0; const nCells = NU.reduce((a, b) => a + b, 0);
      NU.forEach((len, r) => {
        for (let c = 0; c < len; c++, idx++) {
          const q = U.stagger(p, idx, nCells, 0, 0.14, 0.5);
          if (q <= 0) continue;
          const inLam = c < (LAM[r] || 0), sc = U.pop(q);
          const px = x0 + c * s + s / 2, py = y0 + r * s + s / 2, h = (s - 4) / 2 * sc;
          ctx.save(); ctx.globalAlpha = clamp(q * 2);
          if (inLam) { ctx.fillStyle = rgba(C.dim, 0.42); ctx.fillRect(px - h, py - h, 2 * h, 2 * h); }
          ctx.strokeStyle = inLam ? rgba(C.dim, 0.9) : rgba(C.ink, 0.95); ctx.lineWidth = inLam ? 1.6 : 2.2;
          ctx.strokeRect(px - h, py - h, 2 * h, 2 * h);
          ctx.restore();
        }
      });

      // Which tableau is showing: T0 fills in reading order, then flips to T1, ...
      const flipStart = 0.44, flipLen = 0.16;
      const fl = j => seg(p, flipStart + (j - 1) * flipLen, flipStart + (j - 1) * flipLen + flipLen * 0.8, ease.inOut);
      let cur = 0;
      for (let j = 1; j < COUNT; j++) if (fl(j) >= 0.5) cur = j;
      const fs = Math.round(s * 0.56);
      const qs = CELLS.map((_, i) => U.stagger(p, i, CELLS.length, 0.1, 0.36, 0.35));
      const newest = qs.reduce((m, q, i) => (q > 0 ? i : m), -1);
      const fillDone = seg(p, 0.36, 0.44);
      const sweep = seg(p, 0.66, 0.98) * (CELLS.length + 1.5) - 1;   // reading-word sweep
      CELLS.forEach(([r, c], i) => {
        const q = qs[i];
        if (q <= 0) return;
        const key = r + ',' + c, px = x0 + c * s + s / 2, py = y0 + r * s + s / 2;
        // Flip state: the cell turns over (scaleY) if its letter changes.
        let sy = 1, flash = 0, changed = false;
        for (let j = 1; j < COUNT; j++) {
          if (TABS[j][key] !== TABS[j - 1][key]) {
            const f = fl(j);
            if (f > 0 && f < 1) sy = Math.max(0.04, Math.abs(Math.cos(f * Math.PI)));
            flash = Math.max(flash, clamp(1 - Math.abs(f - 0.5) * 2.2));
            if (j === cur && f >= 0.5) changed = true;
          }
        }
        const fresh = i === newest ? 1 - fillDone : 0;
        const amb = fresh > 0.5 || changed;
        const v = TABS[cur][key], sc = U.pop(q);
        ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc * sy);
        U.text(ctx, String(v), 0, fs * 0.36, `${fs}px ${F.main}`, amb ? rgba(C.amber, 1) : rgba(C.ink, 1), 'center', 'alphabetic', clamp(q * 2));
        ctx.restore();
        const sw = clamp(1 - Math.abs(sweep - i) * 0.9);
        const ha = Math.max(fresh * 0.6, flash * 0.6, changed ? 0.3 : 0);
        if (ha > 0.02) {
          hot.save(); hot.translate(px, py); hot.scale(sc, sc * sy);
          U.text(hot, String(v), 0, fs * 0.36, `${fs}px ${F.main}`, rgba(C.amber, 1), 'center', 'alphabetic', ha);
          hot.restore();
        }
        const ba = Math.max(flash, changed ? 0.45 : 0, sw * 0.5);
        if (ba > 0.02) {
          const h = (s - 4) / 2;
          for (const g of [ctx, hot]) {
            g.save(); g.globalAlpha = ba * (g === hot ? 0.6 : 0.9); g.strokeStyle = rgba(C.amber, 1); g.lineWidth = 2.2;
            g.strokeRect(px - h, py - h * sy, 2 * h, 2 * h * sy); g.restore();
          }
        }
      });

      // c^nu_{lambda mu} = (number of tableaux seen so far)
      if (lab > 0.01) {
        const n = cur + 1, bump = n === COUNT ? U.pop(seg(p, flipStart + (COUNT - 2) * flipLen + flipLen * 0.4, flipStart + (COUNT - 2) * flipLen + flipLen * 0.9)) : 1;
        const ly = y0 + 3 * s + s * 1.05, sz = Math.round(s * 0.66);
        ctx.save(); ctx.globalAlpha = lab; ctx.translate(0, (1 - lab) * s * 0.3);
        const wl = U.math(ctx, 'c^{ν}_{λμ} = ', -9999, ly, sz, rgba(C.ink, 0), 'left');
        ctx.font = `${sz}px ${F.main}`; const wn = ctx.measureText(String(n)).width;
        const lx = cx - (wl + wn) / 2;
        U.math(ctx, 'c^{ν}_{λμ} = ', lx, ly, sz, rgba(C.ink, 0.95), 'left');
        const nx = lx + wl + wn / 2, ny = ly - sz * 0.35;
        for (const g of (n === COUNT ? [ctx, hot] : [ctx])) {
          g.save(); g.translate(nx, ny); g.scale(lerp(1, bump, 1), lerp(1, bump, 1));
          U.text(g, String(n), 0, sz * 0.35, `${sz}px ${F.main}`, n === COUNT ? rgba(C.amber, g === hot ? 0.6 : 1) : rgba(C.ink, 0.95), 'center');
          g.restore();
        }
        ctx.restore();
      }
      ctx.restore(); hot.restore();
    },
  };
})());
