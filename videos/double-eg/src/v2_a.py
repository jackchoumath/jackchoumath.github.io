"""Part A: hook, the permutation and its pipedreams, the coefficients, the problem."""

from common2 import *

W = dict(zip(range(-1, 5), D["w"]))            # w on [-1, 4]
Wf = lambda i: W.get(i, i)
Winv = {v: k for k, v in W.items()}
WinvF = lambda c: Winv.get(c, c)


def direct_sum(size=46):
    parts = [fac(3, 2), "+", fac(2, 0), "+", fac(1, -1), "+", fac(2, 0)]
    return MathTex(*parts, font_size=size)


def positive_sum(size=46):
    parts = [fac(1, 0), "+", fac(3, -1), "+", fac(2, 0)]
    m = MathTex(*parts, font_size=size)
    for k in (0, 2, 4):
        m[k].set_color(POS)
    return m


def order_line(y0=0.0, size=40, width=11.4):
    order = [1, 2, 3, 4, 5, None, -3, -2, -1, 0]
    xs = np.linspace(-width / 2, width / 2, len(order))
    g = VGroup()
    pos = {}
    for k, v in enumerate(order):
        t = MathTex(r"\cdots" if v is None else str(v), font_size=size)
        t.move_to(np.array([xs[k], y0, 0]))
        if v is not None:
            pos[v] = t
        g.add(t)
    precs = VGroup(*[MathTex(r"\prec", font_size=size - 6, color=GREY_B).move_to(
        np.array([(xs[k] + xs[k + 1]) / 2, y0, 0])) for k in range(len(order) - 1)])
    return g, precs, pos


class Hook(Captioned):
    def construct(self):
        s = direct_sum().move_to(1.2 * UP)
        with self.cap(r"Here is a sum of four simple polynomials.") as c:
            self.play(Write(s), run_time=2.2)
        line, precs, pos = order_line(y0=-0.9, size=36)
        with self.cap(r"Call $y_i - y_j$ \emph{positive} when $i$ comes before $j$ in this order: "
                      r"$1 \prec 2 \prec 3 \prec \cdots \prec -2 \prec -1 \prec 0$.", extra=1.5) as c:
            self.play(LaggedStart(*[FadeIn(m) for m in line], lag_ratio=0.08), run_time=1.6)
            self.play(LaggedStart(*[FadeIn(p) for p in precs], lag_ratio=0.06), run_time=1.0)
        with self.cap(r"Three of the terms are positive. But $y_3 - y_2$ is negative, since $2 \prec 3$.") as c:
            self.play(s[2].animate.set_color(POS), s[4].animate.set_color(POS), s[6].animate.set_color(POS), run_time=1.0)
            arr = CurvedArrow(pos[3].get_top() + 0.1 * UP, pos[2].get_top() + 0.1 * UP, angle=TAU / 5, color=NEG)
            self.play(s[0].animate.set_color(NEG), Create(arr), run_time=1.0)
        p = positive_sum().move_to(0.0 * UP)
        eq = MathTex("=", font_size=46).next_to(p, LEFT, buff=0.3)
        with self.cap(r"Yet the very same polynomial is $(y_1-y_0) + (y_3-y_{-1}) + (y_2-y_0)$: every term positive.") as c:
            self.play(FadeOut(VGroup(line, precs, arr)), run_time=0.6)
            grp = VGroup(eq, p)
            grp.next_to(s, DOWN, buff=0.7)
            self.play(FadeIn(eq), TransformFromCopy(s, p), run_time=1.8)
            self.play(Circumscribe(p, color=POS, time_width=0.5), run_time=1.3)
        with self.cap(r"This is a \emph{double Edelman--Greene coefficient}. Finding such positive "
                      r"formulas in general was an open problem.") as c:
            lab = MathTex(r"j^{w}_{(2,1)}(y)", "=", font_size=46).next_to(s, LEFT, buff=0.3)
            dx = -VGroup(lab, s).get_center()[0]
            lab.shift(dx * RIGHT)
            self.play(VGroup(s, eq, p).animate.shift(dx * RIGHT), FadeIn(lab, shift=0.2 * RIGHT), run_time=1.0)
        with self.cap(r"We will work through this one example from start to finish, following a recent paper.") as c:
            self.play(FadeOut(VGroup(s, p, eq, lab)), run_time=0.8)
            t1 = Tex(r"A positive combinatorial formula for the", font_size=48)
            t2 = Tex(r"double Edelman--Greene coefficients", font_size=62, color=PIPE)
            au = Tex(r"Jack Chen-An Chou \quad and \quad Tianyi Yu", font_size=38, color=LABEL)
            ax = Tex(r"arXiv:2512.12185", font_size=30, color=DIM)
            title = VGroup(t1, t2, au, ax).arrange(DOWN, buff=0.3).move_to(0.5 * UP)
            au.shift(0.25 * DOWN)
            ax.shift(0.25 * DOWN)
            self.play(Write(t1), run_time=1.2)
            self.play(Write(t2), run_time=1.4)
            self.play(FadeIn(au), FadeIn(ax), run_time=0.8)
        self.clear_caption()
        self.wait(0.8)
        self.play(FadeOut(title), run_time=0.8)


class Setup(Captioned):
    def construct(self):
        title = heading(r"Our example")
        xs = {i: 1.15 * i - 1.0 for i in range(-3, 6)}
        dots = VGroup(*[Dot(np.array([xs[i], -0.2, 0]), radius=0.05, color=GREY_B) for i in xs])
        nums = VGroup(*[MathTex(str(i), font_size=38).move_to(np.array([xs[i], -1.15, 0])) for i in xs])
        axis = Line(np.array([xs[-3] - 0.7, -0.2, 0]), np.array([xs[5] + 0.7, -0.2, 0]), color=GREY_D)
        with self.cap(r"Our permutation lives in $S_{\mathbb Z}$: bijections of the integers that move only finitely many of them.") as c:
            self.play(FadeIn(title), Create(axis), FadeIn(dots), FadeIn(nums), run_time=1.6)
        arrows = VGroup()
        for i in [-1, 0, 1, 2, 3, 4]:
            j = Wf(i)
            ang = -TAU / 4 if j > i else TAU / 4
            if abs(j - i) > 1:
                ang *= 0.75
            yy = -0.36 if j > i else -0.04
            arrows.add(CurvedArrow(np.array([xs[i], yy, 0]), np.array([xs[j], yy, 0]), angle=-ang if j > i else ang,
                                   color=PIPE if i <= 1 else HL, stroke_width=4, tip_length=0.18))
        with self.cap(r"Our $w$ sends $-1 \mapsto 1 \mapsto 0 \mapsto -1$ and $2 \mapsto 3 \mapsto 4 \mapsto 2$; every other integer stays put.") as c:
            self.play(LaggedStart(*[Create(a) for a in arrows[:3]], lag_ratio=0.3), run_time=1.6)
            self.play(LaggedStart(*[Create(a) for a in arrows[3:]], lag_ratio=0.3), run_time=1.6)
        one = MathTex(r"w = [\,1,\ -1,\ 0,\ 3,\ 4,\ 2\,]", font_size=50).move_to(2.1 * UP)
        sub = Tex(r"(one-line notation on positions $-1, 0, 1, 2, 3, 4$)", font_size=28, color=LABEL).next_to(one, DOWN, buff=0.2)
        with self.cap(r"In one-line notation, $w = [1, -1, 0, 3, 4, 2]$. It moves negative numbers too, so it is not in any $S_n$.") as c:
            self.play(Write(one), FadeIn(sub), run_time=1.6)
        self.play(FadeOut(VGroup(axis, dots, nums, arrows)), VGroup(one, sub).animate.scale(0.7).to_corner(UR, buff=0.45),
                  run_time=1.0)

        # ---- the bumpless pipedream
        win = list(range(-3, 5))
        B = bpd_from_rows(D["opening"]["tiles"], win, win, cell=0.6)
        B.move_to(0.55 * UP + 1.2 * LEFT)
        for (i, j), sq in B.grid.squares.items():
            d = max(0, max(-1 - i, -1 - j))
            sq.set_stroke(opacity=max(0.15, 1 - 0.3 * d))
        for key, p in B.pipes.items():
            d = max(0, -1 - key)
            p.set_stroke(opacity=max(0.2, 1 - 0.3 * d))
        rl = VGroup(*[MathTex(str(r), font_size=24, color=LABEL).next_to(B.grid.squares[(r, 4)], RIGHT, buff=0.18) for r in win])
        cl = VGroup(*[MathTex(str(WinvF(c)), font_size=24, color=PIPE).next_to(B.grid.squares[(4, c)], DOWN, buff=0.15) for c in win])
        ctop = VGroup(*[MathTex(str(c), font_size=22, color=DIM).next_to(B.grid.squares[(-3, c)], UP, buff=0.12) for c in win])
        with self.cap(r"We draw $w$ as a \emph{bumpless pipedream} on the plane. Here is one, near the origin.") as c:
            self.play(Create(B.grid), run_time=1.2)
            self.play(LaggedStart(*[Create(B.pipes[k]) for k in sorted(B.pipes)], lag_ratio=0.15), run_time=2.4)
            self.play(FadeIn(rl), FadeIn(ctop), run_time=0.6)
        with self.cap(r"Pipe $i$ enters from the right of row $i$ and leaves through the bottom of column $w(i)$.") as c:
            self.play(FadeIn(cl), run_time=0.6)
            for lab in (0, -1):
                k = Wf(lab)
                p = B.pipes[k]
                self.play(p.animate.set_stroke(color=HL, width=7), Indicate(rl[win.index(lab)], color=HL),
                          Indicate(cl[win.index(k)], color=HL), run_time=1.0)
                self.play(p.animate.set_stroke(color=PIPE, width=5), run_time=0.4)
        icons = VGroup(*[tile_icon(ch, 0.62) for ch in "O+-|rj"]).arrange_in_grid(3, 2, buff=0.25)
        icons.move_to(4.6 * RIGHT + 1.0 * UP)
        with self.cap(r"Only these six tiles are allowed, and two pipes may cross at most once.") as c:
            self.play(LaggedStart(*[FadeIn(i, scale=0.8) for i in icons], lag_ratio=0.12), run_time=1.2)
        dts = dots_on(B.grid.squares, D["opening"]["blanks"])
        wt = MathTex(fac(-1, -1, "x"), fac(-1, 0, "x"), fac(0, -1, "x"), fac(3, 2, "x"), font_size=30)
        wlab = MathTex(r"\mathrm{wt}(D) =", font_size=30)
        VGroup(wlab, wt).arrange(DOWN, buff=0.2).move_to(np.array([4.6, -0.75, 0]))
        with self.cap(r"Each blank tile in row $i$ and column $j$ contributes the factor $x_i - y_j$.") as c:
            self.play(Indicate(icons[0], color=HL), run_time=0.8)
            self.play(FadeIn(dts, scale=0.5), run_time=0.6)
            self.play(FadeIn(wlab), TransformFromCopy(dts, wt), run_time=1.4)
        with self.cap(r"Far to the upper left every pipedream looks alike, but blank tiles can sit arbitrarily high: there are infinitely many.") as c:
            arr = Arrow(B.grid.squares[(-2, -2)].get_center(), B.grid.squares[(-2, -2)].get_center() + 0.95 * UL, color=HL, stroke_width=5,
                        buff=0, max_tip_length_to_length_ratio=0.3)
            inf = MathTex(r"\infty", font_size=48, color=HL).next_to(arr.get_end(), UL, buff=0.05)
            self.play(GrowArrow(arr), FadeIn(inf), run_time=1.0)
        f = MathTex(r"\overleftarrow{\mathfrak S}_w(x;y) = \sum_{D} \mathrm{wt}(D)", font_size=40).move_to(np.array([4.6, 1.0, 0]))
        with self.cap(r"Their total weight is the \emph{back stable double Schubert function} $\overleftarrow{\mathfrak S}_w(x;y)$ of Lam, Lee and Shimozono.") as c:
            self.play(FadeOut(icons), Write(f), run_time=1.6)
        self.clear_caption()
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.8)


class Coefficients(Captioned):
    def construct(self):
        title = heading(r"Double Schur functions")
        rows, cols = list(range(-3, 1)), list(range(-3, 4))
        phi = dict((c, l) for c, l in D["schur"]["phi"])
        S = [c for c in cols if c in phi]
        B = bpd_from_rows(D["schur"]["tiles"], rows, cols, cell=0.62, entries=S, stub=0.32)
        B.move_to(1.8 * LEFT + 1.05 * UP)
        for (i, j), sq in B.grid.squares.items():
            d = max(0, max(-2 - i, -2 - j))
            sq.set_stroke(opacity=max(0.2, 1 - 0.35 * d))
        rl = VGroup(*[MathTex(str(r), font_size=24, color=LABEL).next_to(B.grid.squares[(r, 3)], RIGHT, buff=0.16) for r in rows])
        y_cut = B.grid.squares[(0, -3)].get_bottom()[1]
        x0, x1 = B.grid.get_left()[0] - 0.3, B.grid.get_right()[0] + 0.3
        hor = DashedLine(np.array([x0, y_cut, 0]), np.array([x1, y_cut, 0]), color=WHITE, stroke_width=3)
        with self.cap(r"When a permutation's only descent is at $0$, its pipedreams never cross and stay above row $0$.") as c:
            self.play(FadeIn(title), Create(B.grid), FadeIn(rl), run_time=1.2)
            self.play(LaggedStart(*[Create(p) for p in B.pipe_group], lag_ratio=0.2), Create(hor), run_time=2.0)
        marks, steps = VGroup(), []
        for cc in cols:
            p = np.array([B.grid.squares[(0, cc)].get_center()[0], y_cut - 0.6, 0])
            if cc in S:
                m = Arrow(p + 0.2 * DOWN, p + 0.2 * UP, buff=0, color=HL, stroke_width=5, max_tip_length_to_length_ratio=0.35)
                steps.append("U")
            else:
                m = Arrow(p + 0.2 * LEFT, p + 0.2 * RIGHT, buff=0, color=GREY_B, stroke_width=5, max_tip_length_to_length_ratio=0.35)
                steps.append("R")
            marks.add(m)
        s0 = 0.5
        start = np.array([3.4, -1.9, 0])
        pts = [start]
        for st in steps:
            pts.append(pts[-1] + (np.array([0, s0, 0]) if st == "U" else np.array([s0, 0, 0])))
        path = VMobject(stroke_color=HL, stroke_width=6).set_points_as_corners(pts)
        top = pts[-1][1]
        boxes = VGroup(*[Square(s0, stroke_color=WHITE, stroke_width=2, fill_color=HL, fill_opacity=0.45).move_to(
            np.array([start[0] + (cc + 0.5) * s0, top - (rr + 0.5) * s0, 0])) for rr, n_ in enumerate([2, 1]) for cc in range(n_)])
        lam = MathTex(r"\lambda = (2,1)", font_size=40, color=HL).next_to(boxes, UP, buff=0.35).shift(0.3 * RIGHT)
        with self.cap(r"Such permutations match partitions: where pipes cross the horizon, step up; where none does, step right.") as c:
            self.play(LaggedStart(*[GrowArrow(m) for m in marks], lag_ratio=0.1), run_time=1.4)
            self.play(Create(path), run_time=1.6)
            self.play(LaggedStart(*[FadeIn(b, scale=0.6) for b in boxes], lag_ratio=0.3), Write(lam), run_time=1.2)
        sl = MathTex(r"s_\lambda(x\|y) := \overleftarrow{\mathfrak S}_{w_\lambda}(x;y)", font_size=40).move_to(3.6 * RIGHT + 2.5 * UP)
        with self.cap(r"Their functions are Molev's \emph{double Schur functions} $s_\lambda(x\|y)$, and they form a basis.") as c:
            self.play(Write(sl), run_time=1.4)
        pic = VGroup(B, rl, hor, marks, path, boxes, lam)
        eq1 = MathTex(r"\overleftarrow{\mathfrak S}_w", "=", r"\sum_\lambda", r"a^w_\lambda(x;y)", r"\,s_\lambda(x\|y)", font_size=50)
        eq2 = MathTex(r"j^w_\lambda(y)", ":=", r"a^w_\lambda(y;y)", font_size=50)
        eqs = VGroup(eq1, eq2).arrange(DOWN, buff=0.55).move_to(0.6 * UP)
        with self.cap(r"So every $\overleftarrow{\mathfrak S}_w$ expands in this basis. Setting $x = y$ in the coefficients gives the "
                      r"\emph{double Edelman--Greene coefficients} $j^w_\lambda(y)$.", extra=1.0) as c:
            self.play(FadeOut(pic), FadeOut(sl), FadeOut(title), run_time=0.8)
            self.play(Write(eq1), run_time=1.6)
            self.play(Write(eq2), run_time=1.2)
        # the whole expansion for our w
        lines = []
        for e in D["expansion"]:
            mu = e["mu"]
            parts = []
            for k, t in enumerate(e["terms"]):
                pm = power_tex(t, size=32)
                parts.append(pm)
            lab = MathTex(r"s_{" + "".join(map(str, mu)) + "}", font_size=32)
            row = VGroup(lab, MathTex(":", font_size=32))
            for k, pm in enumerate(parts):
                if k:
                    row.add(MathTex("+", font_size=32))
                row.add(pm)
            row.arrange(RIGHT, buff=0.15)
            lines.append((tuple(mu), row))
        col1 = VGroup(*[r for _, r in lines[:4]]).arrange(DOWN, aligned_edge=LEFT, buff=0.32)
        col2 = VGroup(*[r for _, r in lines[4:]]).arrange(DOWN, aligned_edge=LEFT, buff=0.32)
        table = VGroup(col1, col2).arrange(RIGHT, buff=0.8, aligned_edge=UP).move_to(0.2 * DOWN)
        head = MathTex(r"F_w(x\|y) = \sum_\lambda j^w_\lambda(y)\, s_\lambda(x\|y)\quad\text{for } w=[1,-1,0,3,4,2]:",
                       font_size=36).next_to(table, UP, buff=0.5)
        with self.cap(r"For our $w$, here they all are. (Colours mark three kinds of positive factors; more on that next.)") as c:
            self.play(FadeOut(eqs), run_time=0.6)
            self.play(Write(head), run_time=1.2)
            self.play(LaggedStart(*[FadeIn(r, shift=0.15 * RIGHT) for _, r in lines], lag_ratio=0.15), run_time=2.4)
        target = dict(lines)[(2, 1)]
        with self.cap(r"We will explain the coefficient of $s_{21}$: $j^w_{(2,1)}(y) = (y_1-y_0)+(y_3-y_{-1})+(y_2-y_0)$.") as c:
            box = SurroundingRectangle(target, color=HL, buff=0.12, corner_radius=0.08)
            self.play(Create(box), *[r.animate.set_opacity(0.35) for _, r in lines if r is not target], run_time=1.2)
        self.clear_caption()
        self.play(FadeOut(VGroup(head, table, box)), run_time=0.8)


class Problem(Captioned):
    def construct(self):
        title = heading(r"The positivity problem")
        thm_t = Tex(r"\textbf{Theorem} (Lam--Lee--Shimozono)", font_size=36, color=PIPE)
        thm = MathTex(r"j^w_\lambda(y) \in \mathbb{Z}_{\ge 0}\big[\, y_i - y_j \;:\; i \prec j \,\big]", font_size=50)
        box = VGroup(thm_t, thm).arrange(DOWN, buff=0.3)
        fr = SurroundingRectangle(box, buff=0.3, color=PIPE, corner_radius=0.12)
        G = VGroup(box, fr).move_to(2.3 * UP)
        with self.cap(r"Lam, Lee and Shimozono proved that every $j^w_\lambda(y)$ is a nonnegative combination of products of positive forms.") as c:
            self.play(FadeIn(title), FadeIn(thm_t), Write(thm), Create(fr), run_time=2.2)
        rows = [
            (r"\text{Type 1:}", r"0 < i < j", fac(1, 3), T1),
            (r"\text{Type 2:}", r"i < j \le 0", fac(-1, 0), T2),
            (r"\text{Type 3:}", r"j \le 0 < i", fac(2, 0), T3),
        ]
        tab = VGroup()
        for name, cond, ex, col in rows:
            r = VGroup(MathTex(name, font_size=38, color=col), MathTex(cond, font_size=38),
                       MathTex(r"\text{e.g. }" + ex, font_size=38, color=col))
            tab.add(r)
        for r in tab:
            r[0].move_to(np.array([-4.3, 0, 0]))
            r[1].move_to(np.array([-1.3, 0, 0]))
            r[2].move_to(np.array([2.6, 0, 0]))
        tab.arrange(DOWN, buff=0.3).move_to(0.45 * UP)
        for r in tab:
            r[0].set_x(-4.3)
            r[1].set_x(-1.3)
            r[2].set_x(2.6)
        with self.cap(r"Anderson refined this. Positive forms $y_i - y_j$ come in three types:") as c:
            self.play(LaggedStart(*[FadeIn(r, shift=0.15 * RIGHT) for r in tab], lag_ratio=0.35), run_time=2.0)
        rule = Tex(r"each term: types 1, 2 at most once; type 3 at most twice", font_size=32, color=LABEL).next_to(tab, DOWN, buff=0.4)
        ex = MathTex(r"\text{e.g. the coefficient of } s_1:\quad", fac(1, 0) + "^2", fac(3, 0), font_size=34)
        ex[1].set_color(T3)
        ex[2].set_color(T3)
        ex.next_to(rule, DOWN, buff=0.3)
        with self.cap(r"In each term, a type 1 or type 2 factor appears at most once, and a type 3 factor at most twice.") as c:
            self.play(FadeIn(rule), run_time=0.8)
            self.play(FadeIn(ex), run_time=0.8)
        with self.cap(r"Both proofs are geometric. The problem: find a formula where this positivity is visible term by term.") as c:
            q = Tex(r"Give a combinatorial formula for $j^w_\lambda(y)$ with this positivity.", font_size=38, color=YELLOW)
            q.move_to(np.array([0, -1.3, 0]))
            self.play(FadeOut(VGroup(rule, ex)), run_time=0.5)
            self.play(Write(q), run_time=1.6)
        with self.cap(r"The paper solves it in five steps. We will follow them on our $w$ and $\lambda = (2,1)$.") as c:
            steps = VGroup(*[Tex(t, font_size=32) for t in [
                r"1. cut along the horizon", r"2. flip the top piece", r"3. cut along the staircase",
                r"4. read the trapezoid as chains", r"5. reverse the bars"]]).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
            steps.move_to(0.4 * DOWN)
            self.play(FadeOut(VGroup(G, tab, q)), run_time=0.6)
            self.play(LaggedStart(*[FadeIn(s, shift=0.15 * RIGHT) for s in steps], lag_ratio=0.25), run_time=2.0)
        self.clear_caption()
        self.play(FadeOut(VGroup(steps, title)), run_time=0.8)
