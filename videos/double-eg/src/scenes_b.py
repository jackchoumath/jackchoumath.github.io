"""Part B: double Schur functions, the positivity problem, the weapons, the sword."""

from common import *
import combinatorics as C


def schur_top(S, rows, cols):
    """A BPD piece above the cut: pipes enter at columns S, row r exits r."""
    tops = C.bpds(rows, cols, {s: rows[0] + k for k, s in enumerate(sorted(S))}, {r: r for r in rows})
    g = max(tops, key=lambda g: (sum(1 for t in g.values() if t == "j"), sum(i for (i, j), t in g.items() if t == "O")))
    return ["".join(g[(i, j)] for j in cols) for i in rows]


def fade_upper_left(b, i0, j0, k=0.22):
    for (i, j), sq in b.grid.squares.items():
        d = max(0, max(i0 - i, j0 - j))
        sq.set_stroke(opacity=max(0.1, 1 - k * d))
    for c, p in b.pipes.items():
        d = max(0, j0 - c)
        p.set_stroke(opacity=max(0.15, 1 - k * d))


def lattice_path(steps, start, s, color=HL):
    """steps: list of 'U'/'R'.  Returns (path, points)."""
    pts = [np.array(start, dtype=float)]
    for st in steps:
        pts.append(pts[-1] + (np.array([0, s, 0]) if st == "U" else np.array([s, 0, 0])))
    p = VMobject(stroke_color=color, stroke_width=6)
    p.set_points_as_corners(pts)
    return p, pts


def young(lam, s, color=HL, opacity=0.45):
    g = VGroup()
    for r, n in enumerate(lam):
        for c in range(n):
            sq = Square(s, stroke_color=WHITE, stroke_width=2, fill_color=color, fill_opacity=opacity)
            sq.move_to(np.array([(c + 0.5) * s, -(r + 0.5) * s, 0]))
            g.add(sq)
    return g


class DoubleSchur(Narrated):
    def construct(self):
        rows, cols = list(range(-4, 1)), list(range(-4, 4))
        S = [-4, -3, -2, 0, 2]
        tiles = schur_top(S, rows, cols)
        b = BPD(tiles, rows, cols, cell=0.72, entries=S, stub=0.3)
        b.move_to(2.2 * LEFT + 0.55 * UP)
        fade_upper_left(b, -2, -2)
        rl = b.row_labels([str(r) for r in rows], size=26)
        line_y = b.grid.squares[(0, -4)].get_bottom()[1]
        x0 = b.grid.squares[(0, -4)].get_left()[0] - 0.4
        x1 = b.grid.squares[(0, 3)].get_right()[0] + 0.4
        cut = DashedLine(np.array([x0, line_y, 0]), np.array([x1, line_y, 0]), color=WHITE, stroke_width=3)
        cl = VGroup(*[MathTex(str(c), font_size=24, color=LABEL).move_to(
            np.array([b.grid.squares[(0, c)].get_center()[0], line_y - 1.05, 0])) for c in cols])
        title = VGroup(Tex("Double Schur functions", font_size=40, color=PIPE),
                       MathTex(r"s_\lambda(x;y)", font_size=40, color=PIPE),
                       Tex("[Molev]", font_size=30, color=LABEL)).arrange(RIGHT, buff=0.3).to_corner(UL, buff=0.5)

        with self.voice("d1") as v:
            self.play(FadeIn(title), run_time=1.0)
            self.play(Create(b.grid), FadeIn(rl), run_time=1.6)
            self.play(LaggedStart(*[Create(p) for p in b.pipe_group], lag_ratio=0.25), run_time=2.4)
            v.until("s1")
            self.play(Create(cut), run_time=1.0)
            lab = MathTex(r"\text{between row } 0 \text{ and row } 1", font_size=28, color=LABEL)
            lab.next_to(cut, RIGHT, buff=0.2).shift(0.0 * UP)
            self.play(FadeIn(lab), run_time=0.6)

        s = 0.5
        with self.voice("d2") as v:
            v.until("look")
            self.play(FadeOut(lab), FadeIn(cl), run_time=0.6)
            marks = VGroup()
            steps = []
            for c in cols:
                p = np.array([b.grid.squares[(0, c)].get_center()[0], line_y - 0.62, 0])
                if c in S:
                    m = Arrow(p + 0.22 * DOWN, p + 0.22 * UP, buff=0, color=HL, stroke_width=5,
                              max_tip_length_to_length_ratio=0.35)
                    steps.append("U")
                else:
                    m = Arrow(p + 0.22 * LEFT, p + 0.22 * RIGHT, buff=0, color=GREY_B, stroke_width=5,
                              max_tip_length_to_length_ratio=0.35)
                    steps.append("R")
                marks.add(m)
            v.until("up")
            self.play(LaggedStart(*[GrowArrow(m) for m, st in zip(marks, steps) if st == "U"], lag_ratio=0.15),
                      run_time=1.4)
            v.until("right")
            self.play(LaggedStart(*[GrowArrow(m) for m, st in zip(marks, steps) if st == "R"], lag_ratio=0.15),
                      run_time=1.0)
            v.until("s3")
            start = np.array([3.6, -2.3, 0])
            path, pts = lattice_path(steps, start, s)
            pre = DashedLine(start + 1.2 * DOWN, start, color=HL, stroke_width=4)
            post = DashedLine(pts[-1], pts[-1] + 1.0 * RIGHT, color=HL, stroke_width=4)
            self.play(Create(pre), run_time=0.5)
            self.play(Create(path), run_time=2.2)
            self.play(Create(post), run_time=0.5)
            v.until("young")
            top = pts[-1][1]
            ydiag = young([2, 1], s).shift(np.array([start[0], top, 0]))
            self.play(LaggedStart(*[FadeIn(q, scale=0.6) for q in ydiag], lag_ratio=0.3), run_time=1.2)
            lam = MathTex(r"\lambda = (2,1)", font_size=40, color=HL).next_to(ydiag, UP, buff=0.4).shift(0.4 * RIGHT)
            self.play(Write(lam), run_time=0.8)

        diagram = VGroup(b, rl, cut, cl, marks, pre, path, post, ydiag, lam)
        with self.voice("d3") as v:
            self.play(diagram.animate.scale(0.5).to_corner(UR, buff=0.4).shift(0.6 * DOWN), FadeOut(title), run_time=1.4)
            v.until("expand")
            eq = MathTex(r"\overleftarrow{\mathfrak{S}}_w", "=", r"\sum_\lambda", r"a^w_\lambda(x;y)", r"\,s_\lambda(x;y)",
                         font_size=58).move_to(0.6 * DOWN + 1.0 * LEFT)
            self.play(Write(eq), run_time=2.0)
            b1 = Brace(eq[3], DOWN, buff=0.15)
            b1t = Tex("polynomials", font_size=30, color=LABEL).next_to(b1, DOWN, buff=0.12)
            b2 = Brace(eq[4], DOWN, buff=0.15)
            b2t = Tex("double Schur", font_size=30, color=PIPE).next_to(b2, DOWN, buff=0.12)
            self.play(GrowFromCenter(b2), FadeIn(b2t), run_time=0.8)
            self.play(GrowFromCenter(b1), FadeIn(b1t), run_time=0.8)

        with self.voice("d4") as v:
            sub = MathTex(r"x_i \mapsto y_i", font_size=44, color=YELLOW).next_to(eq, UP, buff=0.6)
            self.play(FadeIn(sub, shift=0.2 * DOWN), run_time=0.8)
            v.until("left")
            jdef = MathTex(r"j^w_\lambda(y)", ":=", r"a^w_\lambda(y;y)", font_size=60).move_to(2.6 * DOWN + 1.0 * LEFT)
            self.play(FadeOut(VGroup(b1, b1t, b2, b2t)), TransformFromCopy(eq[3], jdef[2]), run_time=1.2)
            self.play(Write(jdef[:2]), run_time=0.8)
            v.until("name")
            name = Tex("double Edelman--Greene coefficients", font_size=40, color=PIPE).next_to(jdef, DOWN, buff=0.35)
            self.play(Write(name), run_time=1.5)

        with self.voice("d5") as v:
            self.play(FadeOut(VGroup(eq, sub, diagram)), VGroup(jdef, name).animate.to_edge(UP, buff=0.8), run_time=1.2)
            zero = MathTex(r"y = 0:", r"\quad j^w_\lambda(0)", "=", r"\#\{\text{Edelman--Greene tableaux}\}", r"\in \mathbb{Z}_{\ge 0}",
                           font_size=44).move_to(0.2 * DOWN)
            self.play(Write(zero[:4]), run_time=2.2)
            self.play(Write(zero[4]), run_time=0.8)
            v.until("s2")
            q = MathTex(r"j^w_\lambda(y)", r"\in \;?", font_size=56, color=YELLOW).next_to(zero, DOWN, buff=1.0)
            self.play(Write(q), run_time=1.2)
        self.play(FadeOut(VGroup(jdef, name, zero, q)), run_time=0.8)


class Positivity(Narrated):
    def construct(self):
        thm_t = Tex(r"\textbf{Theorem} [Lam--Lee--Shimozono]", font_size=38, color=PIPE)
        thm = MathTex(r"j^w_\lambda(y) \in \mathbb{Z}_{\ge 0}", r"\big[\, y_i - y_j \;:\; i \prec j \,\big]", font_size=56)
        box = VGroup(thm_t, thm).arrange(DOWN, buff=0.35)
        frame = SurroundingRectangle(box, buff=0.35, color=PIPE, corner_radius=0.15)
        G = VGroup(box, frame).to_edge(UP, buff=0.5)
        with self.voice("t1") as v:
            self.play(FadeIn(thm_t), run_time=0.8)
            self.play(Write(thm), Create(frame), run_time=2.4)
            v.until("s1")
            self.play(Indicate(thm[1], color=YELLOW), run_time=1.5)

        nums = list(range(-3, 6))
        line = NumberLine(x_range=[-3.5, 5.5, 1], length=11, include_numbers=False, include_tip=False,
                          color=GREY_B).move_to(1.0 * DOWN)
        labels = {n: MathTex(str(n), font_size=44).move_to(line.n2p(n) + 0.5 * UP) for n in nums}
        dots = {n: Dot(line.n2p(n), radius=0.07, color=WHITE) for n in nums}
        with self.voice("t2") as v:
            self.play(Create(line), LaggedStart(*[FadeIn(labels[n]) for n in nums], lag_ratio=0.08),
                      LaggedStart(*[FadeIn(dots[n]) for n in nums], lag_ratio=0.08), run_time=2.0)
            v.until("pull")
            order = [1, 2, 3, 4, 5, "dots", -3, -2, -1, 0]
            xs = np.linspace(-5.6, 5.6, len(order))
            target = {n: xs[k] for k, n in enumerate(order) if n != "dots"}
            y0 = 1.0 * DOWN + 0.5 * UP
            pos = [n for n in nums if n > 0]
            neg = [n for n in nums if n <= 0]
            self.play(FadeOut(line), *[FadeOut(dots[n]) for n in nums], run_time=0.6)
            self.play(*[labels[n].animate.move_to(np.array([target[n], y0[1] + 0.9, 0])).set_color(POS) for n in pos],
                      *[labels[n].animate.move_to(np.array([target[n], y0[1] - 0.9, 0])) for n in neg], run_time=1.6)
            v.until("first")
            self.play(*[labels[n].animate.move_to(np.array([target[n], y0[1], 0])) for n in pos], run_time=1.2)
            dd = MathTex(r"\cdots", font_size=44).move_to(np.array([xs[5], y0[1], 0]))
            v.until("rest")
            self.play(FadeIn(dd), *[labels[n].animate.move_to(np.array([target[n], y0[1], 0])) for n in neg], run_time=1.4)
            precs = VGroup(*[MathTex(r"\prec", font_size=40, color=GREY_B).move_to(np.array([(xs[k] + xs[k + 1]) / 2, y0[1], 0]))
                             for k in range(len(order) - 1)])
            self.play(LaggedStart(*[FadeIn(p) for p in precs], lag_ratio=0.08), run_time=1.2)

        def arc_arrow(a, b, color, up=True):
            pa, pb = labels[a].get_top() + 0.1 * UP, labels[b].get_top() + 0.1 * UP
            if not up:
                pa, pb = labels[a].get_bottom() + 0.1 * DOWN, labels[b].get_bottom() + 0.1 * DOWN
            return CurvedArrow(pa, pb, angle=(-TAU / 5 if up else TAU / 5) * (1 if target[a] < target[b] else -1),
                               color=color, stroke_width=5)

        with self.voice("t3") as v:
            ex1 = MathTex(fac(1, 3), font_size=48, color=POS)
            ex2 = MathTex(fac(3, 0), font_size=48, color=POS)
            ex3 = MathTex(fac(2, 1), font_size=48, color=NEG)
            exs = VGroup(ex1, ex2, ex3).arrange(RIGHT, buff=1.4).to_edge(DOWN, buff=0.9)
            a1 = arc_arrow(1, 3, POS)
            self.play(Write(ex1), Create(a1), run_time=1.4)
            v.until("s1")
            a2 = arc_arrow(3, 0, POS)
            self.play(Write(ex2), Create(a2), run_time=1.4)
            v.until("s2")
            a3 = arc_arrow(2, 1, NEG, up=False)
            self.play(Write(ex3), Create(a3), run_time=1.4)

        with self.voice("t4") as v:
            self.play(FadeOut(VGroup(a1, a2, a3, exs)), run_time=0.6)
            terms = [[tuple(p) for p in t] for t in DATA["cold_1432"]]
            parts = []
            for k, t in enumerate(terms):
                if k:
                    parts.append("+")
                for (i, j) in t:
                    parts.append(fac(i, j))
            rows3 = []
            for r in range(3):
                ts = terms[2 * r: 2 * r + 2]
                ps = (["+"] if r else []) + [fac(i, j) for (i, j) in ts[0]] + ["+"] + [fac(i, j) for (i, j) in ts[1]]
                mm = MathTex(*ps, font_size=32)
                q = 1 if r else 0
                for t in ts:
                    for (i, j) in t:
                        mm[q].set_color(fac_color(i, j))
                        q += 1
                    q += 1
                rows3.append(mm)
            m = VGroup(*rows3).arrange(DOWN, buff=0.18, aligned_edge=RIGHT)
            lhs = MathTex(r"j^{1432}_{\square}(y)", "=", font_size=40)
            res = MathTex("=", fac(1, 3), fac(3, 0), font_size=46)
            res[1].set_color(POS)
            res[2].set_color(POS)
            m.move_to(1.75 * DOWN + 0.8 * RIGHT)
            lhs.next_to(rows3[0], LEFT, buff=0.3)
            res.next_to(m, DOWN, buff=0.25)
            self.play(FadeIn(lhs), FadeIn(m), run_time=1.4)
            v.until("s2")
            self.play(Write(res), run_time=1.4)

        with self.voice("t5") as v:
            self.play(FadeOut(VGroup(lhs, m, res, dd, precs, *labels.values())), run_time=0.8)
            proof = Tex(r"Their proof: \emph{geometry}", font_size=42, color=LABEL).move_to(0.5 * DOWN)
            self.play(FadeIn(proof, shift=0.2 * UP), run_time=0.8)
            v.until("s1")
            ask = Tex(r"Problem: find a \emph{combinatorial} proof,\\ a formula with every term positive.",
                      font_size=44, color=YELLOW).next_to(proof, DOWN, buff=0.6)
            self.play(Write(ask), run_time=2.4)
        self.play(FadeOut(VGroup(G, proof, ask)), run_time=0.8)


class Weapons(Narrated):
    def construct(self):
        sword = image("sword.png", 2.4)
        glasses = image("glasses.png", 2.0)
        gauntlet = image("gauntlet.png", 2.4)
        row = Group(sword, glasses, gauntlet).arrange(RIGHT, buff=0.9).move_to(0.4 * UP)
        caps = VGroup(Tex("Sword", font_size=40), Tex("Glasses", font_size=40), Tex("Gauntlet", font_size=40))
        who = VGroup(Tex("Lam--Lee--Shimozono", font_size=30, color=LABEL), Tex("Lenart--Sottile", font_size=30, color=LABEL),
                     Tex("Samuel", font_size=30, color=LABEL))
        base = row.get_bottom()[1] - 0.45
        for c, w, im in zip(caps, who, row):
            c.move_to(np.array([im.get_center()[0], base, 0]))
            w.next_to(c, DOWN, buff=0.15)
        with self.voice("w1") as v:
            for k, (im, c, w) in enumerate(zip(row, caps, who)):
                v.until(f"s{k + 1}")
                self.play(FadeIn(im, shift=0.3 * UP), FadeIn(c), run_time=1.0)
                self.play(FadeIn(w), run_time=0.6)
        self.play(FadeOut(Group(row, caps, who)), run_time=0.8)


def extend(tiles, idx, e):
    new = list(range(idx[0] - e, idx[0])) + list(idx)
    out = []
    for r in new[:e]:
        out.append("".join("|" if c < r else ("r" if c == r else "-") for c in new))
    for line in tiles:
        out.append("|" * e + line)
    return out, new


class Sword(Narrated):
    def sweep(self, start, end, angle, run_time=1.2):
        sw = image("sword.png", 1.6)
        sw.rotate(angle)
        sw.move_to(start)
        self.add(sw)
        self.play(sw.animate.move_to(end), run_time=run_time, rate_func=rate_functions.ease_in_out_sine)
        self.play(FadeOut(sw), run_time=0.3)

    def construct(self):
        title = Tex("The sword", font_size=40, color=PIPE).to_corner(UL, buff=0.5)
        sword = image("sword.png", 2.6).move_to(0.6 * UP)
        power = Tex(r"Super power: \emph{cut bumpless pipe dreams}", font_size=40).next_to(sword, DOWN, buff=0.5)
        with self.voice("x1") as v:
            self.play(FadeIn(sword, shift=0.3 * UP), FadeIn(title), run_time=1.0)
            self.play(Write(power), run_time=1.6)

        idx = DATA["window_2143"]
        full = DATA["full_2143"][2][0]
        tiles, big = extend(full, idx, 3)
        perm = {r: (r if r <= 0 else [2, 1, 4, 3][r - 1]) for r in big}
        top_rows = [r for r in big if r <= 0]
        bot_rows = [r for r in big if r >= 1]
        S_all = [c for c in big if c <= -3] + [-2, -1, 1]
        cell = 0.5
        top = BPD(tiles[:len(top_rows)], top_rows, big, cell=cell, entries=S_all)
        bot = BPD(tiles[len(top_rows):], bot_rows, big, cell=cell)
        # place them so they line up
        bot.move_to(ORIGIN)
        top.next_to(bot, UP, buff=0)
        diag = VGroup(top, bot).move_to(0.3 * DOWN + 1.2 * LEFT)
        fade_upper_left(top, -2, -2, k=0.25)
        for (i, j), sq in bot.grid.squares.items():
            if j < -2:
                sq.set_stroke(opacity=max(0.1, 1 - 0.25 * (-2 - j)))
        for c, p in bot.pipes.items():
            if c < -2:
                p.set_stroke(opacity=max(0.15, 1 - 0.25 * (-2 - c)))
        rl = VGroup(top.row_labels([str(perm[r]) for r in top_rows], size=24),
                    bot.row_labels([str(perm[r]) for r in bot_rows], size=24))
        ttl = MathTex(r"\overleftarrow{\mathfrak{S}}_{2143}", font_size=44).next_to(diag, UP, buff=0.3)
        with self.voice("x2") as v:
            self.play(FadeOut(power), sword.animate.scale(0.45).to_corner(UR, buff=0.4), run_time=1.0)
            self.play(FadeIn(diag), FadeIn(rl), FadeIn(ttl), run_time=1.5)
            v.until("s1")
            y_cut = bot.grid.squares[(1, 1)].get_top()[1]
            xl = diag.get_left()[0] - 0.5
            xr = diag.get_right()[0] + 0.5
            self.sweep(np.array([xl - 0.8, y_cut, 0]), np.array([xr + 0.5, y_cut, 0]), -35 * DEGREES)
            cutline = Line(np.array([xl, y_cut, 0]), np.array([xr, y_cut, 0]), color=NEG, stroke_width=4)
            self.play(Create(cutline), run_time=0.6)
            self.play(VGroup(top, rl[0], ttl).animate.shift(0.5 * UP), VGroup(bot, rl[1]).animate.shift(0.25 * DOWN),
                      FadeOut(cutline), run_time=1.0)

        with self.voice("x3") as v:
            sl = MathTex(r"s_\lambda(x;y)", font_size=44, color=PIPE).next_to(top, RIGHT, buff=1.0)
            self.play(FadeIn(sl, shift=0.2 * LEFT), run_time=0.8)
            v.until("s1")
            marks = VGroup()
            ybase = top.grid.squares[(0, -2)].get_bottom()[1] - 0.12
            for c in big:
                x = top.grid.squares[(0, c)].get_center()[0]
                col = HL if c in S_all else GREY_B
                marks.add(Dot(np.array([x, ybase, 0]), radius=0.06, color=col))
            self.play(LaggedStart(*[FadeIn(m, scale=0.5) for m in marks], lag_ratio=0.05), run_time=1.0)
            box = young([1], 0.45).next_to(sl, DOWN, buff=0.5)
            lam = MathTex(r"\lambda = \square", font_size=40, color=HL).next_to(box, DOWN, buff=0.25)
            self.play(FadeIn(box, scale=0.6), Write(lam), run_time=1.0)

        with self.voice("x4") as v:
            a_eq = MathTex(r"a^w_\lambda(x;y) = \sum_{\text{rectangles}} \;\prod_{\text{empty } (i,j)} (x_i - y_j)",
                           font_size=38).to_edge(DOWN, buff=0.35)
            self.play(FadeOut(marks), Indicate(bot.grid, color=WHITE, scale_factor=1.02), run_time=1.0)
            v.until("s1")
            self.play(Write(a_eq), run_time=2.0)
            v.until("s2")
            j_eq = MathTex(r"j^w_\lambda(y) = \sum_{\text{rectangles}} \;\prod_{\text{empty } (i,j)} (y_i - y_j)",
                           font_size=38).move_to(a_eq)
            self.play(TransformMatchingShapes(a_eq, j_eq), run_time=1.4)
            dots = bot.empty_dots()
            self.play(FadeIn(dots, scale=0.5), run_time=0.6)
            wl = MathTex(fac(2, 1), font_size=36).next_to(bot, RIGHT, buff=0.9)
            self.play(TransformFromCopy(dots, wl), run_time=1.0)

        # ---- the four rectangles
        rcols = idx
        rects = [CuttableRect(t, [1, 2, 3, 4], rcols, cell=0.36) for t in DATA["rect_2143"]]
        order = [0, 1, 2, 3]
        weights = [((3, 3),), ((1, 2),), ((2, 1),), ((1, 0),)]
        rowg = VGroup(*[rects[k] for k in order]).arrange(RIGHT, buff=0.75).move_to(0.9 * UP)
        wtex = []
        for k, r in zip(order, rowg):
            (i, j), = weights[k]
            t = MathTex(fac(i, j), font_size=36, color=fac_color(i, j)).next_to(r, DOWN, buff=0.35)
            wtex.append(t)
        dots4 = [r.empty_dots() for r in rowg]
        with self.voice("x5") as v:
            self.play(FadeOut(VGroup(top, rl, ttl, sl, box, lam, wl, dots, j_eq)), ReplacementTransform(bot, rowg[2]),
                      run_time=1.4)
            self.play(LaggedStart(*[FadeIn(rowg[k]) for k in [0, 1, 3]], lag_ratio=0.25), run_time=1.4)
            self.play(*[FadeIn(d, scale=0.5) for d in dots4], run_time=0.6)
            v.until("s1")
            zero = MathTex("=0", font_size=36, color=DIM).next_to(wtex[0], RIGHT, buff=0.1)
            self.play(FadeIn(wtex[0]), FadeIn(zero), run_time=1.0)
            for key, k in [("r2", 1), ("r3", 2), ("r4", 3)]:
                v.until(key)
                self.play(TransformFromCopy(dots4[k], wtex[k]), run_time=0.8)

        with self.voice("x6") as v:
            total = MathTex(r"j^{2143}_{\square}(y)", "=", fac(1, 2), "+", fac(2, 1), "+", fac(1, 0), "=", fac(1, 0),
                            font_size=42).to_edge(DOWN, buff=0.7)
            total[2].set_color(POS)
            total[4].set_color(NEG)
            total[6].set_color(POS)
            total[8].set_color(POS)
            self.play(Write(total[:7]), run_time=2.0)
            self.play(Write(total[7:]), run_time=1.0)
            v.until("s1")
            self.play(Circumscribe(total[8], color=POS), run_time=1.0)
            v.until("s2")
            s1 = Line(total[2].get_left(), total[2].get_right(), color=YELLOW, stroke_width=4)
            s2 = Line(total[4].get_left(), total[4].get_right(), color=YELLOW, stroke_width=4)
            self.play(Indicate(total[4], color=NEG), run_time=0.8)
            self.play(Create(s1), Create(s2), run_time=0.8)

        # ---- colour the regions of one rectangle
        R = CuttableRect(DATA["rect_2143"][2], [1, 2, 3, 4], rcols, cell=0.8).move_to(0.3 * UP + 2.2 * LEFT)
        zones = VGroup()
        for (i, j) in R.tile:
            if i == j:
                col = DIM
            elif j > i or j <= 0:
                col = POS
            else:
                col = NEG
            if (i, j) in R.squares:
                zones.add(R.squares[(i, j)].copy().set_stroke(width=0).set_fill(col, 0.32))
            else:
                c = R.cell_center(i, j)
                h = 0.4
                zones.add(Square(0.8, stroke_width=0, fill_color=col, fill_opacity=0.32).move_to(c))
        rlab = R.row_labels if hasattr(R, "row_labels") else None
        colnums = VGroup(*[MathTex(str(j), font_size=26, color=LABEL).move_to(R.cell_center(4, j) + 0.62 * DOWN)
                           for j in rcols])
        rownums = VGroup(*[MathTex(str(i), font_size=26, color=LABEL).move_to(R.cell_center(i, rcols[0]) + 0.62 * LEFT)
                           for i in [1, 2, 3, 4]])
        with self.voice("x7") as v:
            self.play(FadeOut(VGroup(rowg, *wtex, zero, *dots4, total, s1, s2)), run_time=0.8)
            self.play(FadeIn(R), FadeIn(colnums), FadeIn(rownums), run_time=1.0)
            v.until("s1")
            legend = VGroup(
                MathTex(r"j > i:", r"\;(y_i - y_j) \text{ positive}", font_size=34),
                MathTex(r"j \le 0:", r"\;(y_i - y_j) \text{ positive}", font_size=34),
                MathTex(r"0 < j < i:", r"\;(y_i - y_j) \text{ negative}", font_size=34),
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.35).next_to(R, RIGHT, buff=0.8)
            legend[0].set_color(POS)
            legend[1].set_color(POS)
            legend[2].set_color(NEG)
            gz_tri = VGroup(*[z for z, (i, j) in zip(zones, R.tile) if j > i])
            gz_left = VGroup(*[z for z, (i, j) in zip(zones, R.tile) if j <= 0 and j < i])
            rz = VGroup(*[z for z, (i, j) in zip(zones, R.tile) if 0 < j < i])
            dz = VGroup(*[z for z, (i, j) in zip(zones, R.tile) if i == j])
            v.until("s2")
            self.play(FadeIn(gz_tri), FadeIn(legend[0]), run_time=1.0)
            v.until("s3")
            self.play(FadeIn(gz_left), FadeIn(legend[1]), run_time=1.0)
            v.until("s4")
            self.play(FadeIn(rz), FadeIn(dz), FadeIn(legend[2]), run_time=1.0)
            self.play(Indicate(rz, color=NEG, scale_factor=1.0), run_time=1.0)

        with self.voice("x8") as v:
            self.play(FadeOut(VGroup(zones, legend)), run_time=0.6)
            a = R.corner(1, 1, UL) + 0.6 * UL
            b2 = R.corner(4, 4, DR) + 0.6 * DR
            self.sweep(a + 0.6 * UL, b2 + 0.4 * DR, -80 * DEGREES, run_time=1.0)
            dline = Line(R.corner(1, 1, UL), R.corner(4, 4, DR), color=NEG, stroke_width=4)
            self.play(Create(dline), run_time=0.5)
            self.play(R.left_part.animate.shift(0.5 * LEFT + 0.35 * DOWN), R.right_part.animate.shift(0.5 * RIGHT + 0.35 * UP),
                      FadeOut(dline), FadeOut(colnums), FadeOut(rownums), run_time=1.2)
            v.until("s1")
            tl = Tex("trapezoid", font_size=34, color=LABEL).next_to(R.left_part, DOWN, buff=0.3)
            tr = Tex("triangle", font_size=34, color=LABEL).next_to(R.right_part, UP, buff=0.3)
            self.play(FadeIn(tl), FadeIn(tr), run_time=0.8)
            v.until("s2")
            form = MathTex(r"j^w_\lambda(y) = \sum_{\delta}\;", r"\big[\,\text{trapezoid}\,\big]", r"\times",
                           r"\big[\,\text{triangle}\,\big]", font_size=42).to_edge(DOWN, buff=0.6)
            self.play(Write(form), run_time=2.0)

        with self.voice("x9") as v:
            ok = MathTex(r"\checkmark \text{ positive}", font_size=36, color=POS).next_to(tr, RIGHT, buff=0.3)
            self.play(FadeIn(ok), form[3].animate.set_color(POS), run_time=0.8)
            v.until("s1")
            self.play(form[1].animate.set_color(NEG), Indicate(R.left_part, color=NEG, scale_factor=1.03), run_time=1.0)
            v.until("s2")
            t3 = CuttableRect(DATA["rect_2143"][2], [1, 2, 3, 4], rcols, cell=0.5)
            t4 = CuttableRect(DATA["rect_2143"][3], [1, 2, 3, 4], rcols, cell=0.5)
            for t in (t3, t4):
                t.remove(t.right_part)
            pair = VGroup(t3, t4).arrange(RIGHT, buff=1.6).move_to(0.6 * UP)
            d3, d4 = t3.empty_dots(), t4.empty_dots()
            plus = MathTex("+", font_size=48).move_to(pair.get_center())
            self.play(FadeOut(VGroup(R, tl, tr, ok)), FadeIn(pair), FadeIn(plus), FadeIn(d3), FadeIn(d4), run_time=1.2)
            w3 = MathTex(fac(2, 1), font_size=40, color=NEG).next_to(t3, DOWN, buff=0.35)
            w4 = MathTex(fac(1, 0), font_size=40, color=POS).next_to(t4, DOWN, buff=0.35)
            self.play(TransformFromCopy(d3, w3), TransformFromCopy(d4, w4), run_time=1.0)
            v.until("s3")
            res = MathTex("=", fac(2, 0), font_size=46).next_to(VGroup(w3, w4), DOWN, buff=0.4)
            res[1].set_color(POS)
            self.play(Write(res), run_time=1.0)
            self.play(Circumscribe(res[1], color=POS), run_time=1.0)

        with self.voice("x10") as v:
            q1 = Tex(r"Why is every trapezoid sum positive?", font_size=42, color=YELLOW)
            q2 = Tex(r"Can we see it \emph{term by term}?", font_size=42, color=YELLOW)
            qs = VGroup(q1, q2).arrange(DOWN, buff=0.3).move_to(form)
            self.play(FadeOut(form), Write(q1), run_time=1.4)
            v.until("s1")
            self.play(Write(q2), run_time=1.2)
        self.play(FadeOut(Group(pair, plus, d3, d4, w3, w4, res, qs, sword, title)), run_time=0.8)
