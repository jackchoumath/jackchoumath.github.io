// Example motif: a Young diagram whose boxes pop in, newest box glowing.
MOTIF('example', {
  draw(ctx, hot, p, k, env, box) {
    const { C, U, rgba, clamp, ease } = env;
    const shape = [4, 3, 1];
    const s = Math.min(box.w / 6, box.h / 4.5) * (1 + 0.03 * k);
    const x0 = box.x + box.w / 2 - 2 * s, y0 = box.y + box.h / 2 - 1.5 * s;
    const cells = []; shape.forEach((n, r) => { for (let c = 0; c < n; c++) cells.push([r, c]); });
    cells.forEach(([r, c], i) => {
      const q = U.stagger(p, i, cells.length, 0, 0.5);
      if (q <= 0) return;
      const sc = U.pop(q), cx = x0 + c * s + s / 2, cy = y0 + r * s + s / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      U.young(ctx, [1], x0 + c * s, y0 + r * s, s, { stroke: rgba(C.ink, 0.95), lw: 2 });
      ctx.restore();
      if (i === cells.length - 1) { hot.fillStyle = rgba(C.amber, 0.8 * q); hot.fillRect(x0 + c * s + 4, y0 + r * s + 4, s - 8, s - 8); }
    });
    U.math(ctx, '\\S_{w}', box.x + box.w / 2, box.y + box.h - 30, 64, rgba(C.ink, 1), 'center', clamp(p * 3));
  },
});
