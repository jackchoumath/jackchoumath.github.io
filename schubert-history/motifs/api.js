// Motif API shared by every visual motif of the timeline film.
//
// A motif is registered with  MOTIF(id, { draw(ctx, hot, p, k, env, box) {...} })
//   ctx  : 2D context of the main layer (crisp line art, 1920x1080)
//   hot  : 2D context of the emissive layer (everything drawn here gets bloom) —
//          use it sparingly for "energy" (the newest/answer element), never for everything
//   p    : local progress 0 -> 1 over the motif's time on screen. The motif builds
//          itself in roughly p in [0, 0.35], then keeps evolving (never freezes),
//          and should still look complete at p = 1. The caller handles fading out.
//   k    : beat pulse 0..1 (1 exactly on a kick, decays in ~0.15 s); use for small
//          punches (scale +3%, brightness), never for large moves.
//   env  : { t, dur, beat, C, F, ease, seg, clamp, lerp, rng, hex, rgba, U }
//          dur = seconds the motif is on screen (0.5 .. 2.2); beat = seconds per beat
//   box  : { x, y, w, h } region to draw in (typically ~800x600); stay inside it.
//
// Rules: deterministic (no Math.random/Date; use env.rng(seed)), pure function of
// its inputs, transparent background, line art first, 1.5-3 px strokes, butt or
// round caps (no per-segment alpha strokes with round caps), mathematically
// correct content.
(function () {
  const { clamp, lerp, seg, ease, rng, hex, rgba } = R;
  const C = {
    bg: hex('#05070c'), ink: hex('#f3efe6'), dim: hex('#7d8ea6'), faint: hex('#2a3a52'),
    amber: hex('#ffc845'), amberHot: hex('#fff1c2'), cyan: hex('#5fd0ff'), red: hex('#ff4d3d'),
    violet: hex('#9b8cff'),
  };
  const F = {
    display: '"Big Shoulders Display", "Anton", sans-serif',
    wide: '"Archivo", sans-serif',
    serif: '"Instrument Serif", serif',
    mono: '"JetBrains Mono", monospace',
    math: 'KaTeX_Math',        // italic math letters
    main: 'KaTeX_Main',        // upright math (digits, operators, Greek upright)
    frak: 'KaTeX_Fraktur',     // \mathfrak{S}
  };

  // ---------------------------------------------------------------- helpers
  const U = {
    // Young diagram (English notation) with cell size s, top-left (x, y).
    // opts: { fill(r,c) -> rgba|null, stroke rgba, lw, label(r,c) -> string|null, font, labelColor, alpha(r,c) -> 0..1 }
    young(ctx, shape, x, y, s, o = {}) {
      shape.forEach((len, r) => {
        for (let c = 0; c < len; c++) {
          const a = o.alpha ? o.alpha(r, c) : 1;
          if (a <= 0.002) continue;
          const px = x + c * s, py = y + r * s;
          const f = o.fill ? o.fill(r, c) : null;
          if (f) { ctx.fillStyle = f; ctx.globalAlpha = a; ctx.fillRect(px + 1.5, py + 1.5, s - 3, s - 3); }
          ctx.globalAlpha = a;
          ctx.strokeStyle = o.stroke || rgba(C.ink, 0.9); ctx.lineWidth = o.lw || 1.6;
          ctx.strokeRect(px + 1.5, py + 1.5, s - 3, s - 3);
          const lab = o.label ? o.label(r, c) : null;
          if (lab != null) {
            ctx.fillStyle = o.labelColor || rgba(C.ink, 1);
            ctx.font = o.font || `${Math.round(s * 0.5)}px ${F.main}`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(lab, px + s / 2, py + s / 2 + 1);
          }
          ctx.globalAlpha = 1;
        }
      });
    },
    // Text helper: draw string at (x, y) with font, color, align, baseline.
    text(ctx, str, x, y, font, color, align = 'left', base = 'alphabetic', alpha = 1) {
      ctx.save(); ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color;
      ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(str, x, y); ctx.restore();
    },
    // Minimal math typesetter for canvas: tokens like
    //   [['S', 'frak'], ['w', 'sub']]  or a string with _x and ^x (single char or {..}).
    // Returns width. Italic letters use KaTeX_Math, digits/operators KaTeX_Main.
    math(ctx, src, x, y, size, color, align = 'left', alpha = 1) {
      const toks = [];
      let i = 0;
      const read = () => {
        if (src[i] === '{') { let d = 1, j = i + 1; while (j < src.length && d) { if (src[j] === '{') d++; if (src[j] === '}') d--; j++; } const s = src.slice(i + 1, j - 1); i = j; return s; }
        if (src[i] === '\\') { let j = i + 1; if (/[,;!#]/.test(src[j])) j++; else while (j < src.length && /[a-zA-Z]/.test(src[j])) j++; const s = src.slice(i, j); i = j; return s; }
        return src[i++];
      };
      while (i < src.length) {
        const ch = src[i];
        if (ch === '_' || ch === '^') { i++; toks.push({ s: read(), lvl: ch === '_' ? -1 : 1 }); }
        else toks.push({ s: read(), lvl: 0 });
      }
      const glyph = s => ({ '\\sigma': 'σ', '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\partial': '∂', '\\geq': '≥', '\\cdot': '·', '\\to': '→',
        '\\sum': '∑', '\\otimes': '⊗', '\\star': '⋆', '\\le': '≤', '\\ne': '≠', '\\infty': '∞', '\\pi': 'π', '\\ell': 'ℓ', '\\times': '×', '\\S': 'S', '\\G': 'G', '\\quad': '  ', '\\,': '\u2009', '\\;': '\u2005', '\\!': '', '\\cdots': '⋯', '\\ldots': '…', '\\neq': '≠', '\\in': '∈', '\\subset': '⊂', '\\mapsto': '↦', '\\leftrightarrow': '↔', '\\Rightarrow': '⇒', '\\#': '#' }[s] ?? s);
      const fontFor = (s, sz) => {
        if (s === '\\S' || s === '\\G') return `${sz}px ${F.frak}`;
        const g = glyph(s);
        return /^[A-Za-z]$/.test(g) || /[σλμνπℓ]/.test(g) ? `italic ${sz}px ${F.math}` : `${sz}px ${F.main}`;
      };
      // Measure then draw.
      const parts = toks.map(tk => {
        const lvl = tk.lvl, sz = lvl ? size * 0.68 : size;
        // Split a group into commands (\\lambda, \\,) and single characters.
        const pieces = tk.s.match(/\\[a-zA-Z]+|\\[,;!#]|[\s\S]/gu) || [];
        const segs = pieces.map(c => ({ g: glyph(c), font: fontFor(c, sz) }));
        let w = 0; segs.forEach(sg => { ctx.font = sg.font; sg.w = ctx.measureText(sg.g).width; w += sg.w; });
        return { segs, w, lvl, sz };
      });
      // Subscript and superscript that follow the same base share the x advance.
      let width = 0, lastBase = 0;
      const layout = [];
      parts.forEach((pt, j) => {
        if (pt.lvl && j > 0 && parts[j - 1].lvl && parts[j - 1].lvl !== pt.lvl) {
          layout.push({ pt, x: lastBase }); width = Math.max(width, lastBase + pt.w);
        } else { lastBase = width; layout.push({ pt, x: width }); width += pt.w + (pt.lvl ? 0 : size * 0.02); }
      });
      const ox = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      layout.forEach(({ pt, x: lx }) => {
        let cx = ox + lx;
        const dy = pt.lvl === -1 ? size * 0.22 : pt.lvl === 1 ? -size * 0.42 : 0;
        pt.segs.forEach(sg => { ctx.font = sg.font; ctx.fillText(sg.g, cx, y + dy); cx += sg.w; });
      });
      ctx.restore();
      return width;
    },
    // Straight line, optional glow copy on the hot layer.
    line(ctx, x0, y0, x1, y1, color, w = 2) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    },
    // Line that draws on from (x0,y0) to (x1,y1) with progress q.
    drawOn(ctx, x0, y0, x1, y1, q, color, w = 2) {
      if (q <= 0) return; q = clamp(q);
      U.line(ctx, x0, y0, lerp(x0, x1, q), lerp(y0, y1, q), color, w);
    },
    dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); },
    ring(ctx, x, y, r, color, w = 1.5) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); },
    // Staggered appearance: item i of n appears over [a, b] of p with overlap.
    stagger(p, i, n, a = 0, b = 0.35, span = 0.35) {
      const st = a + (b - a) * (n > 1 ? i / (n - 1) : 0) * (1 - span);
      return ease.out(clamp((p - st) / ((b - a) * span + 1e-6)));
    },
    // Pop scale for an element that appeared at local progress q (overshoot).
    pop: q => ease.back(clamp(q)),
  };

  const registry = {};
  window.MOTIF = (id, def) => { registry[id] = def; };
  window.MOTIFS = registry;
  window.MOTIF_ENV = (t, dur, beat) => ({ t, dur, beat, C, F, ease, seg, clamp, lerp, rng, hex, rgba, U });
  window.MOTIF_C = C; window.MOTIF_F = F; window.MOTIF_U = U;
})();
