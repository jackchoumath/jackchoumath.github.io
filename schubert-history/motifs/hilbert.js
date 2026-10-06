// Hilbert's 15th problem (ICM Paris, 1900): "rigorous foundation of Schubert's
// enumerative calculus".  A typographic seal: a big amber "15" inside a ring of small
// text.  It slams in (scale 1.3 -> 1 with a damped overshoot and a small twist) and a
// shock ring flies out.  On impact a dial of 23 ticks -- one per problem of Hilbert's
// list -- springs out around the seal and spins the other way until the 15th tick
// (longer, amber) locks under the index mark at twelve o'clock on beat two; it then
// pulses on the beats while the text ring keeps slowly turning.
MOTIF('hilbert', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease } = env;
    const TXT = "RIGOROUS FOUNDATION OF SCHUBERT’S ENUMERATIVE CALCULUS · ";
    const NPROB = 23, MINE = 15;                             // Hilbert's list: 23 problems
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const m = Math.min(box.w, box.h), R = m * 0.355;         // outer ring of the seal
    const maxR = m / 2 - 3;                                  // stay inside the box
    const lw = Math.max(1.2, Math.min(3, m * 0.0045));

    // --- slam: accelerate in, hit at P_HIT, damped overshoot ----------------------
    const P_HIT = 0.12;
    const q = clamp(p / P_HIT), dt = Math.max(0, p - P_HIT);
    let sc = p < P_HIT ? lerp(1.3, 1, ease.in(q)) : 1 - 0.07 * Math.sin(dt * 38) * Math.exp(-dt * 16);
    if (p >= P_HIT) sc *= 1 + 0.02 * k;
    const alpha = clamp(q * 2.5);
    const twist = p < P_HIT ? -0.22 * (1 - ease.in(q)) : 0;
    const spin = twist + 0.55 * p + 0.25 * ease.out(clamp(dt / 0.25)); // ring keeps turning

    ctx.save(); hot.save();
    [ctx, hot].forEach(g => { g.translate(cx, cy); g.scale(sc, sc); });
    ctx.globalAlpha = alpha;

    // --- text ring: font sized so the phrase wraps the circle once ------------------
    const rt = R * 0.86;                                     // text centre radius
    const circ = 2 * Math.PI * rt, chars = [...TXT];
    const font = z => `700 ${z}px ${F.wide}`;
    ctx.font = font(100);
    const w100 = chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0);
    const fz = 100 * circ * 0.84 / w100, capH = fz * 0.72; // 16% of the loop is tracking
    ctx.font = font(fz);
    const adv = chars.map(ch => ctx.measureText(ch).width);
    const track = (circ - adv.reduce((a, b) => a + b, 0)) / chars.length;

    // --- rings (spaced around the text band) ------------------------------------------
    const gap = R * 0.955 - (rt + capH / 2);
    const ring = (r, w, a) => U.ring(ctx, 0, 0, r, rgba(C.ink, a), w);
    ring(R, lw * 1.25, 0.95);
    ring(R * 0.955, lw * 0.6, 0.75);
    ring(rt - capH / 2 - gap, lw * 0.6, 0.75);
    ring(rt - capH / 2 - gap - R * 0.045, lw * 0.9, 0.9);

    ctx.fillStyle = rgba(C.ink, 0.92); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let s = 0;
    chars.forEach((ch, i) => {
      const th = -Math.PI / 2 + spin + (s + adv[i] / 2) / rt;
      s += adv[i] + track;
      if (ch === ' ') return;
      ctx.save(); ctx.rotate(th + Math.PI / 2); ctx.fillText(ch, 0, -rt + capH * 0.04); ctx.restore();
    });

    // --- the "15" --------------------------------------------------------------------
    const lock = p >= 0.5 ? Math.exp(-(p - 0.5) * 7) : 0;    // the dial locks on beat two
    const nz = R * 1.0, nsc = 1 + 0.035 * k + 0.05 * lock;
    const nfont = `900 ${nz}px ${F.display}`;
    const flash = Math.exp(-dt * 22) * (p >= P_HIT ? 1 : 0);
    ctx.save(); ctx.scale(nsc, nsc);
    U.text(ctx, '15', 0, nz * 0.355, nfont, rgba(C.amber, 1), 'center', 'alphabetic');
    ctx.restore();
    // hot copy of the big glyph stays <= 0.25 (stronger clips the bloom to lemon)
    hot.save(); hot.scale(nsc, nsc);
    U.text(hot, '15', 0, nz * 0.355, nfont, rgba(C.amber, alpha * Math.min(0.25, 0.1 + 0.06 * k + 0.12 * flash + 0.08 * lock)), 'center', 'alphabetic');
    hot.restore();
    ctx.globalAlpha = 1;
    ctx.restore(); hot.restore();

    // --- impact: shock rings (unscaled, clamped to the box) -------------------------
    if (p >= P_HIT) {
      [0, 0.045].forEach((delay, j) => {
        const u = clamp((dt - delay) / 0.3);
        if (u <= 0 || u >= 1) return;
        const r = lerp(R * 1.02, maxR, ease.out(u)), a = (1 - u) * (j ? 0.6 : 1);
        U.ring(ctx, cx, cy, r, rgba(C.amber, 0.55 * a), lerp(lw * 1.2, lw * 0.6, u));
        U.ring(hot, cx, cy, r, rgba(C.amber, 0.8 * a), lerp(lw * 1.6, lw * 0.6, u));
      });
    }

    // --- the dial of 23 problems ------------------------------------------------------
    // Springs out from the seal on impact, spins the other way and locks with tick 15
    // at twelve o'clock (p = 0.5) with a small click.
    const dq = ease.out(clamp(dt / 0.14));
    if (dq > 0) {
      const lq = clamp((p - P_HIT) / (0.5 - P_HIT));
      let phi = -2.3 * (1 - ease.inOut(lq));                  // radians, -> 0 at the lock
      if (p > 0.5) phi += 0.05 * Math.sin((p - 0.5) * 45) * Math.exp(-(p - 0.5) * 16); // the click
      const r0 = lerp(R * 1.0, R * 1.075, dq), r1 = lerp(R * 1.02, R * 1.16, dq);
      ctx.save(); ctx.globalAlpha = dq; ctx.lineCap = 'butt';
      for (let i = 1; i <= NPROB; i++) {
        const a = -Math.PI / 2 + phi + (i - MINE) * 2 * Math.PI / NPROB;
        const co = Math.cos(a), si = Math.sin(a);
        if (i === MINE) {
          const r2 = lerp(R * 1.02, R * 1.25, dq), w = lw * 2.2 * (1 + 0.25 * k);
          for (const g of [ctx, hot]) {
            g.save(); g.lineCap = 'butt'; g.strokeStyle = rgba(C.amber, g === hot ? (0.5 + 0.3 * k + 0.2 * lock) * dq : 1); g.lineWidth = w;
            g.beginPath(); g.moveTo(cx + co * r0, cy + si * r0); g.lineTo(cx + co * r2, cy + si * r2); g.stroke(); g.restore();
          }
        } else {
          ctx.strokeStyle = rgba(C.ink, 0.7); ctx.lineWidth = lw * 1.1;
          ctx.beginPath(); ctx.moveTo(cx + co * r0, cy + si * r0); ctx.lineTo(cx + co * r1, cy + si * r1); ctx.stroke();
        }
      }
      ctx.restore();
      // index mark at twelve o'clock: a small notch the 15th tick locks under
      const ia = ease.out(clamp((p - 0.22) / 0.12));
      if (ia > 0) {
        const ty = cy - Math.min(maxR - R * 0.005, R * 1.36), h = R * 0.07, hw = R * 0.045;
        const on = lock > 0.02;
        ctx.save(); ctx.globalAlpha = ia; ctx.fillStyle = on ? rgba(C.amber, 1) : rgba(C.ink, 0.85);
        ctx.beginPath(); ctx.moveTo(cx - hw, ty); ctx.lineTo(cx + hw, ty); ctx.lineTo(cx, ty + h); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (on) {
          hot.save(); hot.globalAlpha = 0.6 * lock; hot.fillStyle = rgba(C.amber, 1);
          hot.beginPath(); hot.moveTo(cx - hw, ty); hot.lineTo(cx + hw, ty); hot.lineTo(cx, ty + h); hot.closePath(); hot.fill();
          hot.restore();
        }
      }
    }
  },
});
