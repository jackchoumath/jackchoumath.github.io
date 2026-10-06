// Hilbert's 15th problem (ICM Paris, 1900): "rigorous foundation of Schubert's
// enumerative calculus".  A typographic seal: a big amber "15" inside a ring of small
// text.  It slams in (scale 1.6 -> 1 with a damped overshoot and a small twist), a shock
// ring and a burst of ticks fly out on impact, then the text ring keeps slowly turning.
MOTIF('hilbert', {
  draw(ctx, hot, p, k, env, box) {
    const { C, F, U, rgba, clamp, lerp, ease } = env;
    const TXT = "RIGOROUS FOUNDATION OF SCHUBERT’S ENUMERATIVE CALCULUS · ";
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const m = Math.min(box.w, box.h), R = m * 0.305;         // outer ring radius (x1.6 still fits)
    const maxR = m / 2 - 6;                                  // stay inside the box

    // --- slam: accelerate in, hit at P_HIT, damped overshoot ----------------------
    const P_HIT = 0.12;
    const q = clamp(p / P_HIT), dt = Math.max(0, p - P_HIT);
    let sc = p < P_HIT ? lerp(1.6, 1, ease.in(q)) : 1 - 0.07 * Math.sin(dt * 38) * Math.exp(-dt * 16);
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
    ring(R, 3, 0.95);
    ring(R * 0.955, 1.5, 0.75);
    ring(rt - capH / 2 - gap, 1.5, 0.75);
    ring(rt - capH / 2 - gap - R * 0.045, 2.2, 0.9);

    ctx.fillStyle = rgba(C.ink, 0.92); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let s = 0;
    chars.forEach((ch, i) => {
      const th = -Math.PI / 2 + spin + (s + adv[i] / 2) / rt;
      s += adv[i] + track;
      if (ch === ' ') return;
      ctx.save(); ctx.rotate(th + Math.PI / 2); ctx.fillText(ch, 0, -rt + capH * 0.04); ctx.restore();
    });

    // --- the "15" --------------------------------------------------------------------
    const nz = R * 1.0;
    const nfont = `900 ${nz}px ${F.display}`;
    U.text(ctx, '15', 0, nz * 0.355, nfont, rgba(C.amber, 1), 'center', 'alphabetic');
    const flash = Math.exp(-dt * 22) * (p >= P_HIT ? 1 : 0);
    U.text(hot, '15', 0, nz * 0.355, nfont, rgba(C.amber, alpha * (0.32 + 0.1 * k + 0.5 * flash)), 'center', 'alphabetic');
    ctx.globalAlpha = 1;
    ctx.restore(); hot.restore();

    // --- impact: shock rings + burst of ticks (unscaled, clamped to the box) --------
    if (p >= P_HIT) {
      [0, 0.045].forEach((delay, j) => {
        const u = clamp((dt - delay) / 0.3);
        if (u <= 0 || u >= 1) return;
        const r = lerp(R * 1.02, maxR, ease.out(u)), a = (1 - u) * (j ? 0.6 : 1);
        U.ring(ctx, cx, cy, r, rgba(C.amber, 0.55 * a), lerp(3, 1, u));
        U.ring(hot, cx, cy, r, rgba(C.amber, 0.8 * a), lerp(4, 1.5, u));
      });
      const u = clamp(dt / 0.2);
      if (u < 1) {
        const n = 20, r0 = lerp(R * 1.05, R * 1.16, ease.out(u)), r1 = Math.min(maxR, lerp(R * 1.12, R * 1.34, ease.out(u)));
        ctx.strokeStyle = rgba(C.ink, 0.85 * (1 - u)); ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.08;
          ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        }
        ctx.stroke();
      }
    }
  },
});
