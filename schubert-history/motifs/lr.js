// Littlewood-Richardson rule: c^nu_{lambda mu} = number of LR tableaux of skew
// shape nu/lambda and content mu (rows weakly increase, columns strictly
// increase, reverse reading word -- right to left, top to bottom -- is a
// lattice word). Here nu = (4,3,2), lambda = (2,1), mu = (3,2,1); the tableaux
// are enumerated below (brute force) and there are exactly two:
//     . . 1 1        . . 1 1
//     . 1 2          . 2 2
//     2 3            1 3          so c^{432}_{21,321} = 2
// (cross-checked independently by expanding s_21 * s_321 in 5 variables).
// Both tableaux stand side by side: the skew shapes pop in, the first fills in
// reading order and the count reads "c >= 1" on beat one; the second fills (the
// two letters where it differs stay amber) and "= 2" lands on beat two. Then a cyan
// reading cursor runs through both tableaux in step: their reverse reading words
// 112132 and 112231 are both lattice words.
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
  const W = NU[0], H = NU.length;
  const LABEL = `c^{${NU.join('')}}_{${LAM.join('')},${MU.join('')}}`;

  return {
    draw(ctx, hot, p, k, env, box) {
      const { C, F, U, rgba, clamp, lerp, ease, seg } = env;
      // Timeline (1.875 s card: beats at 0.25, 0.5, 0.75).
      const FILL = [0.08, 0.3], STEP = 0.032;           // tableau j's letter i lands at FILL[j] + i * STEP
      const COUNT_AT = [0.25, 0.5];                      // the count after tableau j: beat one, beat two
      const SW0 = 0.56, SWD = 0.065;                     // reading cursor: cell i at SW0 + i * SWD

      // Layout: COUNT tableaux side by side (gap g), the count underneath.
      const g = 1.1, fzU = 0.62, vgU = 0.62;
      const wU = COUNT * W + (COUNT - 1) * g, hU = H + vgU + fzU * 1.25;
      const s = Math.min(box.w * 0.92 / wU, box.h * 0.86 / hU) * (1 + 0.012 * ease.soft(p));
      const cx = box.x + box.w / 2, top = box.y + box.h / 2 - hU * s / 2;
      const lw = Math.max(1.4, Math.min(2.8, s * 0.02)), ins = Math.max(1.5, s * 0.03);
      const fs = Math.round(s * 0.56);
      const X0 = j => cx - wU * s / 2 + j * (W + g) * s;

      for (let j = 0; j < COUNT; j++) {
        const x0 = X0(j), y0 = top, T = TABS[j], prev = j > 0 ? TABS[j - 1] : null;
        // Outline of nu, lambda filled grey.
        let idx = 0; const nCells = NU.reduce((a, b) => a + b, 0);
        NU.forEach((len, r) => {
          for (let c = 0; c < len; c++, idx++) {
            const q = U.stagger(p, idx, nCells, 0.03 * j, 0.1 + 0.03 * j, 0.5);
            if (q <= 0) continue;
            const inLam = c < (LAM[r] || 0), sc = U.pop(q);
            const px = x0 + c * s + s / 2, py = y0 + r * s + s / 2, h = (s - 2 * ins) / 2 * sc;
            ctx.save(); ctx.globalAlpha = clamp(q * 2);
            if (inLam) { ctx.fillStyle = rgba(C.dim, 0.42); ctx.fillRect(px - h, py - h, 2 * h, 2 * h); }
            ctx.strokeStyle = inLam ? rgba(C.dim, 0.9) : rgba(C.ink, 0.95); ctx.lineWidth = inLam ? lw * 0.75 : lw;
            ctx.strokeRect(px - h, py - h, 2 * h, 2 * h);
            ctx.restore();
          }
        });
        // Letters in reading order; the reading cursor runs over them after the count.
        CELLS.forEach(([r, c], i) => {
          const tl = FILL[j] + i * STEP, q = clamp((p - tl + 0.03) / 0.045);
          if (q <= 0) return;
          const key = r + ',' + c, v = T[key], differs = prev && prev[key] !== v;
          const fresh = Math.exp(-Math.max(0, p - tl) * 12);  // newest letter glows, then settles
          const sw = Math.max(0, 1 - Math.abs(p - (SW0 + i * SWD)) / (SWD * 0.9));
          const amb = differs ? 1 : fresh;
          const px = x0 + c * s + s / 2, py = y0 + r * s + s / 2;
          const sc = lerp(1.5, 1, ease.back(q)) * (1 + 0.12 * sw);
          const colr = rgba(C.ink.map((u, m) => Math.round(lerp(u, C.amber[m], clamp(amb)))), 1);
          ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
          U.text(ctx, String(v), 0, fs * 0.36, `${fs}px ${F.main}`, colr, 'center', 'alphabetic', clamp(q * 2));
          ctx.restore();
          const ha = Math.max(differs ? 0.22 : 0, 0.5 * fresh);
          if (ha > 0.02) {
            hot.save(); hot.translate(px, py); hot.scale(sc, sc);
            U.text(hot, String(v), 0, fs * 0.36, `${fs}px ${F.main}`, rgba(C.amber, 1), 'center', 'alphabetic', ha * clamp(q * 2));
            hot.restore();
          }
          // amber frame while a letter lands (longer for the letters where T2 differs);
          // the reading cursor afterwards is a cyan frame, line art only
          const h = (s - 2 * ins) / 2;
          const ba = (differs ? Math.max(0, 1 - Math.max(0, p - tl) / 0.12) : fresh) * clamp(q * 2);
          if (ba > 0.02) for (const gg of [ctx, hot]) {
            gg.save(); gg.globalAlpha = ba * (gg === hot ? 0.55 : 0.95); gg.strokeStyle = rgba(C.amber, 1); gg.lineWidth = lw;
            gg.strokeRect(px - h, py - h, 2 * h, 2 * h); gg.restore();
          }
          if (sw > 0.02) {
            ctx.save(); ctx.globalAlpha = sw; ctx.strokeStyle = rgba(C.cyan, 0.95); ctx.lineWidth = lw * 1.2;
            ctx.strokeRect(px - h, py - h, 2 * h, 2 * h); ctx.restore();
          }
        });
      }

      // Running count, true at every frame: "c >= 1" after the first tableau, "c = 2"
      // when the second lands.
      const la = seg(p, COUNT_AT[0] - 0.05, COUNT_AT[0], ease.out);
      if (la > 0.01) {
        let n = 1;
        COUNT_AT.forEach((t, j) => { if (p >= t) n = j + 1; });
        const done = n === COUNT;
        const pop = done ? Math.exp(-(p - COUNT_AT[COUNT - 1]) * 9) : Math.exp(-Math.max(0, p - COUNT_AT[0]) * 9);
        const sz = s * fzU, ly = top + (H + vgU) * s + sz * 0.62;
        ctx.save(); ctx.globalAlpha = la; ctx.translate(0, (1 - la) * s * 0.3);
        const wl = U.math(ctx, LABEL, -9999, ly, sz, rgba(C.ink, 0), 'left');
        ctx.font = `${sz}px ${F.main}`;
        const gap = sz * 0.3, wr = ctx.measureText('=').width, wn = ctx.measureText(String(COUNT)).width;
        const lx = cx - (wl + gap + wr + gap + wn) / 2, rx = lx + wl + gap + wr / 2;
        U.math(ctx, LABEL, lx, ly, sz, rgba(C.ink, 0.95), 'left');
        U.text(ctx, done ? '=' : '≥', rx, ly, `${sz}px ${F.main}`, rgba(C.ink, 0.95), 'center');
        const nx = lx + wl + 2 * gap + wr + wn / 2, ny = ly - sz * 0.35, z = 1 + 0.3 * pop + 0.05 * k * (done ? 1 : 0);
        for (const gg of (done ? [ctx, hot] : [ctx])) {
          gg.save(); gg.translate(nx, ny); gg.scale(z, z);
          U.text(gg, String(n), 0, sz * 0.35, `${sz}px ${F.main}`, done ? rgba(C.amber, gg === hot ? 0.25 + 0.3 * pop : 1) : rgba(C.ink, 0.95), 'center');
          gg.restore();
        }
        ctx.restore();
      }
    },
  };
})());
