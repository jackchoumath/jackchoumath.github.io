"""Part A: cold open, Schubert polynomials, pipe dreams, BPDs, back-stable limit."""

from common import *
import combinatorics as C


def sum_of_products(terms, size=34, a="y", b="y"):
    """terms: list of lists of (i, j).  Returns (MathTex, factor index map)."""
    parts, where = [], []
    for k, t in enumerate(terms):
        if k:
            parts.append("+")
        for (i, j) in t:
            where.append((len(parts), i, j))
            parts.append(fac(i, j, a, b))
    m = MathTex(*parts, font_size=size)
    return m, where


class ColdOpen(Narrated):
    def construct(self):
        terms = [[tuple(p) for p in t] for t in DATA["cold_1432"]]
        lines = []
        for r in range(3):
            m, where = sum_of_products(terms[2 * r: 2 * r + 2], size=50)
            lines.append((m, where))
        mobs = [m for m, _ in lines]
        pluses = [MathTex("+", font_size=50) for _ in range(2)]
        block = VGroup(*mobs).arrange(DOWN, buff=0.4)
        for p, m in zip(pluses, mobs[1:]):
            p.next_to(m, LEFT, buff=0.25)
        block.add(*pluses)
        block.move_to(0.3 * UP)

        with self.voice("c1") as v:
            self.play(Write(mobs[0]), run_time=1.6)
            self.play(FadeIn(pluses[0]), Write(mobs[1]), run_time=1.5)
            self.play(FadeIn(pluses[1]), Write(mobs[2]), run_time=1.5)
            v.until("fac")
            first = mobs[0][lines[0][1][0][0]]
            self.play(Circumscribe(first, color=YELLOW, time_width=0.6), run_time=1.6)

        greens, reds = [], []
        for (m, where) in lines:
            for (k, i, j) in where:
                (greens if positive(i, j) else reds).append(m[k])
        with self.voice("c2") as v:
            v.until("green")
            self.play(LaggedStart(*[g.animate.set_color(POS) for g in greens], lag_ratio=0.12), run_time=1.4)
            v.until("red")
            self.play(LaggedStart(*[r.animate.set_color(NEG) for r in reds], lag_ratio=0.12), run_time=1.4)

        with self.voice("c3") as v:
            v.until("collapse")
            eq = MathTex("=", fac(1, 3), fac(3, 0), font_size=64)
            self.play(block.animate.scale(0.75).to_edge(UP, buff=0.7), run_time=1.0)
            eq.next_to(block, DOWN, buff=0.9)
            self.play(FadeIn(eq[0]), FadeTransform(block.copy(), eq[1:]), run_time=1.6)
            v.until("green")
            self.play(eq[1].animate.set_color(POS), eq[2].animate.set_color(POS), run_time=0.8)
            self.play(Circumscribe(eq[1:], color=POS, time_width=0.5), run_time=1.2)

        with self.voice("c4") as v:
            v.until("s1")
            geo = Tex(r"geometry: \emph{the total is always positive}", font_size=40, color=LABEL)
            geo.to_edge(DOWN, buff=0.8)
            self.play(FadeIn(geo, shift=0.2 * UP), run_time=1.0)
            v.until("s3")
            why = Tex("but why?", font_size=44, color=YELLOW).next_to(geo, UP, buff=0.35)
            self.play(LaggedStart(*[Wiggle(r, scale_value=1.15) for r in reds], lag_ratio=0.1),
                      FadeIn(why, shift=0.1 * UP), run_time=2.0)

        with self.voice("c5") as v:
            v.until("s1")
            self.play(FadeOut(VGroup(block, eq, geo, why)), run_time=1.0)
            t1 = Tex(r"A positive combinatorial formula for the", font_size=50)
            t2 = Tex(r"double Edelman--Greene coefficients", font_size=66, color=PIPE)
            au = Tex(r"Jack Chou \quad and \quad Tianyi Yu", font_size=40, color=LABEL)
            ax = Tex(r"arXiv:2512.12185", font_size=30, color=DIM)
            title = VGroup(t1, t2, au, ax).arrange(DOWN, buff=0.35)
            au.shift(0.3 * DOWN)
            ax.shift(0.3 * DOWN)
            self.play(Write(t1), run_time=1.6)
            self.play(Write(t2), run_time=1.8)
            self.play(FadeIn(au, shift=0.2 * UP), FadeIn(ax, shift=0.2 * UP), run_time=1.2)
        self.wait(1.0)
        self.play(FadeOut(title), run_time=1.0)


class Schubert(Narrated):
    def construct(self):
        with self.voice("s1") as v:
            top = MathTex("1", "2", "3", "4", font_size=60).arrange(RIGHT, buff=0.8)
            top.move_to(1.4 * UP)
            self.play(Write(top), run_time=1.5)
            v.until("ex")
            bot = top.copy()
            self.play(bot.animate.shift(1.8 * DOWN), run_time=0.8)
            arrows = VGroup(*[Arrow(top[k].get_bottom(), bot[k].get_top(), buff=0.12, stroke_width=3,
                                     max_tip_length_to_length_ratio=0.12, color=GREY_B) for k in range(4)])
            self.play(Swap(bot[0], bot[1]), run_time=1.0)
            v.until("swap2")
            self.play(Swap(bot[2], bot[3]), run_time=1.0)
            w = MathTex("w", "=", font_size=60).next_to(bot, LEFT, buff=0.5)
            self.play(FadeIn(w), run_time=0.6)

        with self.voice("s2") as v:
            perm = VGroup(w, bot)
            self.play(FadeOut(top), perm.animate.scale(0.7).to_corner(UL, buff=0.7), run_time=1.0)
            arrow = MathTex(r"w \;\longmapsto\; \mathfrak{S}_w", font_size=64)
            arrow.move_to(0.6 * UP)
            self.play(Write(arrow), run_time=1.5)
            lab = Tex("Schubert polynomial", font_size=34, color=LABEL).next_to(arrow, DOWN, buff=0.4)
            self.play(FadeIn(lab, shift=0.15 * UP), run_time=0.8)
            v.until("s1")
            geo = Tex(r"(cohomology of flag varieties)", font_size=28, color=DIM).next_to(lab, DOWN, buff=0.3)
            self.play(FadeIn(geo), run_time=0.8)
            v.until("s2")
            self.play(FadeOut(geo), run_time=0.6)

        with self.voice("s3") as v:
            dbl = MathTex(r"\mathfrak{S}_w(x;y)", font_size=64).move_to(arrow[0][-2:].get_center() + 0.5 * RIGHT)
            lab2 = Tex("double Schubert polynomial", font_size=34, color=LABEL).move_to(lab)
            self.play(TransformMatchingShapes(arrow, MathTex(r"w \;\longmapsto\; \mathfrak{S}_w(x;y)",
                                                                font_size=64).move_to(0.6 * UP)),
                      Transform(lab, lab2), run_time=1.5)
            v.until("xy")
            pat = MathTex(r"(x_i - y_j)", font_size=48, color=YELLOW).next_to(lab, DOWN, buff=0.5)
            self.play(FadeIn(pat, scale=1.2), run_time=0.8)
            v.until("s2")
            formula = MathTex(r"\mathfrak{S}_{2143}", "=", fac(1, 1, "x"), fac(3, 1, "x"), "+",
                              fac(1, 1, "x"), fac(2, 2, "x"), "+", fac(1, 1, "x"), fac(1, 3, "x"),
                              font_size=40)
            formula.to_edge(DOWN, buff=1.0)
            self.play(FadeOut(pat), Write(formula), run_time=2.5)
        self.formula = formula

        with self.voice("s4") as v:
            keep = formula
            others = [m for m in self.mobjects if m is not keep]
            self.play(*[FadeOut(m) for m in others], keep.animate.to_edge(UP, buff=0.6), run_time=1.5)
        self.wait(0.3)


def tile_icon(ch, s=0.7, color=PIPE, kind="bpd"):
    sq = Square(s, stroke_color=GRIDC, stroke_width=2)
    h, rc = s / 2, 0.45 * s / 2
    g = VGroup(sq)

    def seg(a, b):
        return Line(np.array(a) * h, np.array(b) * h, stroke_color=color, stroke_width=5)

    def arc(center, a0, a1, r):
        p = VMobject(stroke_color=color, stroke_width=5)
        p.set_points_as_corners(arc_pts(np.array(center), r, a0, a1, 16))
        return p

    if ch in "|+":
        g.add(seg((0, -1, 0), (0, 1, 0)))
    if ch in "-+":
        g.add(seg((-1, 0, 0), (1, 0, 0)))
    if ch == "r":
        g.add(VMobject(stroke_color=color, stroke_width=5).set_points_as_corners(
            [np.array([0, -h, 0]), np.array([0, -rc, 0])] + arc_pts(np.array([rc, -rc, 0]), rc, np.pi, np.pi / 2)
            + [np.array([h, 0, 0])]))
    if ch == "j":
        g.add(VMobject(stroke_color=color, stroke_width=5).set_points_as_corners(
            [np.array([-h, 0, 0]), np.array([-rc, 0, 0])] + arc_pts(np.array([-rc, rc, 0]), rc, -np.pi / 2, 0)
            + [np.array([0, h, 0])]))
    if ch == "b":  # pipe-dream bump tile
        g.add(arc((-h, h, 0), -np.pi / 2, 0, h), arc((h, -h, 0), np.pi, np.pi / 2, h))
    return g


class PipeDreams(Narrated):
    def construct(self):
        header = MathTex(r"\mathfrak{S}_{2143}", "=", fac(1, 1, "x"), fac(3, 1, "x"), "+",
                         fac(1, 1, "x"), fac(2, 2, "x"), "+", fac(1, 1, "x"), fac(1, 3, "x"),
                         font_size=40).to_edge(UP, buff=0.6)
        self.add(header)
        title = Tex("Pipe dreams", font_size=40, color=PIPE).to_corner(UL, buff=0.6)

        n = 3
        pd = PipeDream(3, [(1, 2)], cell=1.15)
        pd.move_to(0.3 * DOWN + 1.8 * LEFT)
        with self.voice("p1") as v:
            self.play(FadeOut(header, shift=0.3 * UP), FadeIn(title), run_time=0.8)
            self.play(Create(pd.grid), run_time=1.5)
            v.until("cross")
            cross_i = tile_icon("+", 1.0).move_to(3.6 * RIGHT + 1.0 * UP)
            bump_i = tile_icon("b", 1.0).move_to(3.6 * RIGHT + 0.6 * DOWN)
            self.play(FadeIn(cross_i, scale=0.8), run_time=0.7)
            v.until("bump")
            self.play(FadeIn(bump_i, scale=0.8), run_time=0.7)

        with self.voice("p2") as v:
            left = pd.left_labels([1, 3, 2], size=36)
            topl = pd.top_labels([1, 2, 3], size=36)
            self.play(FadeIn(left), FadeIn(topl), run_time=0.8)
            self.play(LaggedStart(*[Create(p) for p in pd.pipe_group], lag_ratio=0.35), run_time=3.0)
            v.until("target")
            for i, j in [(1, 1), (2, 3), (3, 2)]:
                self.play(Indicate(left[i - 1], color=YELLOW), Indicate(topl[j - 1], color=YELLOW),
                          pd.pipes[i].animate.set_color(YELLOW), run_time=0.7)
                self.play(pd.pipes[i].animate.set_color(PIPE), run_time=0.25)
            v.until("rule")
            bad = VGroup(tile_icon("+", 0.8), tile_icon("+", 0.8)).arrange(RIGHT, buff=0)
            bad_lab = Tex("never", font_size=34, color=NEG)
            xmark = Cross(bad, stroke_color=NEG, stroke_width=6)
            badg = VGroup(bad, xmark, bad_lab.next_to(bad, DOWN, buff=0.15)).move_to(3.6 * RIGHT + 2.3 * DOWN)
            twice = Tex("crossing twice", font_size=34, color=NEG).next_to(bad_lab, DOWN, buff=0.1)
            badg.add(twice)
            self.play(FadeIn(badg), run_time=0.8)

        pd_main = VGroup(pd, left, topl)
        pds = [PipeDream(3, d, cell=1.0) for d in DATA["pd_132"]]
        with self.voice("p3") as v:
            self.play(FadeOut(VGroup(cross_i, bump_i, badg)), run_time=0.6)
            groups = []
            for k, P in enumerate(pds):
                l = P.left_labels([1, 3, 2], size=30)
                t = P.top_labels([1, 2, 3], size=30)
                groups.append(VGroup(P, l, t))
            row = VGroup(*groups).arrange(RIGHT, buff=2.8).move_to(0.5 * UP)
            self.play(ReplacementTransform(pd_main, groups[0]), run_time=1.2)
            self.play(FadeIn(groups[1], shift=0.3 * LEFT), run_time=1.0)

        with self.voice("p4") as v:
            dots = [P.cross_dots() for P in pds]
            for d in dots:
                self.play(FadeIn(d, scale=0.5), run_time=0.6)
            ws = [MathTex(fac(1, 2, "x"), font_size=46), MathTex(fac(2, 1, "x"), font_size=46)]
            for wtex, g in zip(ws, groups):
                wtex.next_to(g, DOWN, buff=0.45)
            v.until("w1")
            self.play(TransformFromCopy(dots[0], ws[0]), run_time=1.0)
            v.until("w2")
            self.play(TransformFromCopy(dots[1], ws[1]), run_time=1.0)
            v.until("sum")
            res = MathTex(r"\mathfrak{S}_{132}", "=", fac(1, 2, "x"), "+", fac(2, 1, "x"), font_size=50)
            res.to_edge(DOWN, buff=0.6)
            plus = MathTex("+", font_size=48).move_to((ws[0].get_center() + ws[1].get_center()) / 2)
            self.play(FadeIn(plus), run_time=0.4)
            self.play(TransformFromCopy(VGroup(ws[0]), res[2]), TransformFromCopy(VGroup(ws[1]), res[4]),
                      FadeIn(res[0:2]), FadeIn(res[3]), run_time=1.4)

        pd4 = [PipeDream(4, d, cell=0.68) for d in DATA["pd_2143"]]
        with self.voice("p5") as v:
            self.play(FadeOut(VGroup(*groups, *dots, *ws, plus, res)), run_time=0.8)
            g4 = []
            for P in pd4:
                l = P.left_labels([2, 1, 4, 3], size=26, buff=0.16)
                g4.append(VGroup(P, l, P.cross_dots()))
            row4 = VGroup(*g4).arrange(RIGHT, buff=1.5).move_to(0.7 * UP)
            self.play(LaggedStart(*[FadeIn(g) for g in g4], lag_ratio=0.3), run_time=1.6)
            order = [[(1, 1), (3, 1)], [(1, 1), (2, 2)], [(1, 1), (1, 3)]]
            # match each pipe dream to its term
            labels = []
            for P, g in zip(pd4, g4):
                cr = sorted(P.crosses)
                labels.append(MathTex(*[fac(i, j, "x") for (i, j) in cr], font_size=36).next_to(g, DOWN, buff=0.4))
            self.play(LaggedStart(*[FadeIn(l, shift=0.2 * UP) for l in labels], lag_ratio=0.3), run_time=1.5)
            header2 = header.copy().to_edge(DOWN, buff=0.7)
            self.play(FadeIn(header2), run_time=1.0)
        self.play(FadeOut(VGroup(*g4, *labels, header2, title)), run_time=0.8)


class Bumpless(Narrated):
    def construct(self):
        title = VGroup(Tex("Bumpless pipe dreams", font_size=40, color=PIPE),
                       Tex("[Lam--Lee--Shimozono]", font_size=30, color=LABEL)).arrange(RIGHT, buff=0.3)
        title.to_corner(UL, buff=0.6)
        with self.voice("b1") as v:
            self.play(Write(title[0]), run_time=1.4)
            self.play(FadeIn(title[1]), run_time=0.8)

        tiles0 = DATA["bpd_132"][0]
        B = BPD(tiles0, [1, 2, 3], [1, 2, 3], cell=1.2)
        B.move_to(2.0 * LEFT + 0.3 * DOWN)
        rl = B.row_labels([1, 3, 2], size=34)
        cl = B.col_labels([1, 2, 3], size=34)
        with self.voice("b2") as v:
            self.play(Create(B.grid), run_time=1.2)
            v.until("flow")
            self.play(FadeIn(cl), run_time=0.5)
            self.play(LaggedStart(*[Create(B.pipes[c]) for c in [1, 3, 2]], lag_ratio=0.4), run_time=2.4)
            self.play(FadeIn(rl), run_time=0.5)
            v.until("tiles")
            icons = VGroup(*[tile_icon(ch, 0.8) for ch in "O+-|rj"]).arrange_in_grid(2, 3, buff=0.35)
            icons.move_to(3.8 * RIGHT + 0.3 * UP)
            self.play(LaggedStart(*[FadeIn(i, scale=0.8) for i in icons], lag_ratio=0.15), run_time=1.4)
            v.until("empty")
            self.play(Indicate(icons[0], color=HL, scale_factor=1.25), run_time=1.0)

        with self.voice("b3") as v:
            v.until("s1")
            dot = B.empty_dots()
            self.play(FadeIn(dot, scale=0.5), run_time=0.6)
            v.until("s2")
            lab = MathTex(r"(x_i - y_j)", font_size=48, color=HL).next_to(icons, DOWN, buff=0.6)
            self.play(TransformFromCopy(dot, lab), run_time=1.0)

        Bs = [BPD(t, [1, 2, 3], [1, 2, 3], cell=0.95) for t in DATA["bpd_132"]]
        with self.voice("b4") as v:
            grp = []
            for b in Bs:
                grp.append(VGroup(b, b.row_labels([1, 3, 2], size=28), b.col_labels([1, 2, 3], size=28)))
            row = VGroup(*grp).arrange(RIGHT, buff=2.8).move_to(0.9 * UP)
            self.play(FadeOut(VGroup(icons, lab, dot)), ReplacementTransform(VGroup(B, rl, cl), grp[0]), run_time=1.2)
            self.play(FadeIn(grp[1], shift=0.3 * LEFT), run_time=1.0)
            dots = [b.empty_dots() for b in Bs]
            self.play(*[FadeIn(d, scale=0.5) for d in dots], run_time=0.6)
            ws = [MathTex(fac(2, 2, "x"), font_size=46), MathTex(fac(1, 1, "x"), font_size=46)]
            for w_, g in zip(ws, grp):
                w_.next_to(g, DOWN, buff=0.45)
            v.until("w1")
            self.play(TransformFromCopy(dots[0], ws[0]), run_time=0.9)
            v.until("w2")
            self.play(TransformFromCopy(dots[1], ws[1]), run_time=0.9)

        with self.voice("b5") as v:
            pdline = MathTex(r"\text{pipe dreams:}\quad", r"\mathfrak{S}_{132}", "=", fac(1, 2, "x"), "+", fac(2, 1, "x"), font_size=38)
            bpline = MathTex(r"\text{bumpless:}\quad", r"\mathfrak{S}_{132}", "=", fac(2, 2, "x"), "+", fac(1, 1, "x"), font_size=38)
            both = VGroup(pdline, bpline).arrange(DOWN, buff=0.35, aligned_edge=RIGHT).to_edge(DOWN, buff=0.5).shift(2.2 * LEFT)
            self.play(FadeIn(pdline), TransformFromCopy(VGroup(*ws), bpline), run_time=1.5)
            v.until("s1")
            brace = Brace(both, RIGHT, buff=0.2)
            total = MathTex(r"x_1 + x_2 - y_1 - y_2", font_size=40, color=YELLOW).next_to(brace, RIGHT, buff=0.2)
            self.play(GrowFromCenter(brace), Write(total), run_time=1.2)
            v.until("s2")
            self.play(Circumscribe(VGroup(both, total), color=YELLOW, time_width=0.5), run_time=1.5)
        self.play(FadeOut(VGroup(*grp, *dots, *ws, both, brace, total, title)), run_time=0.8)


def perm_tex(p, size=48):
    return VGroup(*[MathTex(str(v), font_size=size) for v in p]).arrange(RIGHT, buff=0.32)


def bpd_with_labels(tiles, idx, perm, cell, size=24, weight=None):
    b = BPD(tiles, idx, idx, cell=cell)
    rl = b.row_labels([str(x) for x in perm], size=size)
    cl = b.col_labels([str(x) for x in idx], size=size)
    return VGroup(b, rl, cl), b


class BackStable(Narrated):
    def construct(self):
        title = Tex("Back-stable double Schubert polynomials", font_size=40, color=PIPE).to_corner(UL, buff=0.6)

        def stage(m, cell):
            idx = list(range(-m + 1, 4))
            perm = [r if r <= 0 else [1, 3, 2][r - 1] for r in idx]
            out = []
            for t in DATA["backstable_132"][str(m)]:
                g, b = bpd_with_labels(t, idx, perm, cell, size=26 if m < 2 else 22)
                out.append((g, b))
            return out, perm

        st0, perm0 = stage(0, 0.85)
        row0 = VGroup(*[g for g, _ in st0]).arrange(RIGHT, buff=2.0).move_to(0.3 * UP)
        dots0 = VGroup(*[b.empty_dots() for _, b in st0])
        with self.voice("k1") as v:
            self.play(FadeIn(title), run_time=0.8)
            self.play(FadeIn(row0), FadeIn(dots0), run_time=1.2)
            permtex = perm_tex([1, 3, 2]).next_to(row0, UP, buff=0.5)
            self.play(Write(permtex), run_time=0.8)

        st1, perm1 = stage(1, 0.66)
        row1 = VGroup(*[g for g, _ in st1]).arrange(RIGHT, buff=1.1).move_to(0.3 * UP)
        dots1 = VGroup(*[b.empty_dots() for _, b in st1])

        def sum_line(terms):
            parts = []
            for k, i in enumerate(terms):
                if k:
                    parts.append("+")
                parts.append(fac(i, i, "x"))
            return MathTex(*parts, font_size=38)

        sum0 = sum_line([2, 1]).to_edge(DOWN, buff=0.8)
        with self.voice("k2") as v:
            self.play(FadeIn(sum0), run_time=0.8)
            p1 = perm_tex([0, 1, 3, 2]).move_to(permtex)
            new1 = perm_tex([1, 2, 4, 3]).move_to(permtex)
            self.play(FadeTransform(permtex, new1), run_time=0.8)
            self.play(FadeTransform(new1, p1), run_time=0.8)
            p1[0].set_color(HL)
            v.until("grow")
            self.play(ReplacementTransform(row0, VGroup(row1[0], row1[1])),
                      ReplacementTransform(dots0, VGroup(dots1[0], dots1[1])), run_time=1.6)
            v.until("new")
            self.play(FadeIn(row1[2], shift=0.3 * LEFT), FadeIn(dots1[2]), run_time=1.0)

        st2, perm2 = stage(2, 0.5)
        row2 = VGroup(*[g for g, _ in st2]).arrange(RIGHT, buff=0.65).move_to(0.3 * UP)
        dots2 = VGroup(*[b.empty_dots() for _, b in st2])
        with self.voice("k3") as v:
            sum1 = sum_line([2, 1, 0]).to_edge(DOWN, buff=0.8)
            self.play(TransformMatchingTex(sum0, sum1), run_time=1.0)
            self.play(Indicate(sum1[-1], color=HL), run_time=0.8)
            v.until("again")
            p2 = perm_tex([-1, 0, 1, 3, 2]).move_to(p1)
            self.play(FadeTransform(p1, p2), run_time=0.7)
            self.play(ReplacementTransform(row1, VGroup(*row2[:3])),
                      ReplacementTransform(dots1, VGroup(*dots2[:3])), run_time=1.4)
            self.play(FadeIn(row2[3], shift=0.3 * LEFT), FadeIn(dots2[3]), run_time=0.8)
            sum2 = sum_line([2, 1, 0, -1]).to_edge(DOWN, buff=0.8)
            self.play(TransformMatchingTex(sum1, sum2), run_time=1.0)

        with self.voice("k4") as v:
            v.until("limit")
            lim = MathTex(r"\overleftarrow{\mathfrak{S}}_{132}", "=", fac(2, 2, "x"), "+", fac(1, 1, "x"), "+",
                          r"\sum_{i\le 0}(x_i - y_i)", font_size=44).to_edge(DOWN, buff=0.7)
            self.play(TransformMatchingTex(sum2, lim), run_time=1.6)
            self.play(Circumscribe(lim[-1], color=HL), run_time=1.2)

        with self.voice("k5") as v:
            m = 7
            idx = list(range(-m + 1, 4))
            perm = {r: (r if r <= 0 else [1, 3, 2][r - 1]) for r in idx}
            g = C.bpds(idx, idx, {c: c for c in idx}, perm, limit=1)[0]
            tiles = ["".join(g[(i, j)] for j in idx) for i in idx]
            big = BPD(tiles, idx, idx, cell=0.48)
            big.move_to(0.55 * UP + 1.6 * RIGHT)
            # fade toward the upper left
            for (i, j), sq in big.grid.squares.items():
                a = min(1, max(0.12, 1 - 0.13 * (2 - min(i, j)) ** 1.1)) if min(i, j) < 2 else 1
                sq.set_stroke(opacity=a)
            for c, p in big.pipes.items():
                p.set_stroke(opacity=min(1, max(0.15, 1 - 0.12 * (1 - c))) if c < 1 else 1)
            rl = big.row_labels([str(perm[r]) for r in idx], size=18)
            self.play(FadeOut(VGroup(row2, dots2, p2)), run_time=0.6)
            self.play(FadeOut(title), lim.animate.scale(0.8).to_edge(DOWN, buff=0.35), FadeIn(big), FadeIn(rl), run_time=1.6)
            arrow = Arrow(big.grid.squares[(-2, -2)].get_center() + 1.2 * LEFT, big.grid.squares[(-5, -5)].get_center() + 1.6 * LEFT,
                          color=HL, stroke_width=5)
            inf = MathTex(r"\infty", font_size=56, color=HL).next_to(arrow.get_end(), UL, buff=0.05)
            self.play(GrowArrow(arrow), FadeIn(inf), run_time=1.2)
        self.play(FadeOut(VGroup(big, rl, arrow, inf, lim)), run_time=0.8)
