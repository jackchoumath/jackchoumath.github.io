"""Part C: step 3 (the staircase cut), step 4 (chains), step 5 (reversal), and the end."""

from common import *

P1, P2 = D["pieces"]
T1D = P1["trap"][0]                          # the trapezoid data of sigma_1
TA, TN = -1, 4                               # trapezoid columns -1..4, rows 1..4
TCOLS, TROWS = list(range(TA, TN + 1)), list(range(1, TN + 1))
NAMES = [r"(3,2)", r"(2,0)", r"(1,-1)"]


def zone_color(i, j):
    if j > i:
        return T1
    if j <= 0:
        return T3
    return NEG


def weight_y(blanks, size=34):
    (i, j), = blanks
    m = MathTex(fac(i, j), font_size=size)
    m.set_color(tcolor(i, j) if ftype(i, j) else NEG)
    return m


def chain_table(data, size=28, dx=0.44, dy=0.46, header=True, var_labels=True):
    T = ChainTable(data, TA, size=size, dx=dx, dy=dy)
    extra = VGroup()
    if header:
        for p in TCOLS:
            h = MathTex(str(p), font_size=size - 8, color=DIM)
            h.move_to(np.array([T.cells[(0, p)].get_center()[0], T.numbers.get_top()[1] + 0.28, 0]))
            extra.add(h)
    if var_labels:
        for s, v in enumerate(data["vars"]):
            extra.add(T.step_label(s, f"x_{v}", size=size - 4, color=LABEL, buff=0.15))
    T.extra = extra
    T.add(extra)
    return T


def green(T):
    return T.circ_by_color["green"]


def blue(T):
    return T.circ_by_color["blue"]


class DiagonalCut(Narrated):
    def construct(self):
        title = heading(r"Step 3: the staircase cut")
        cell = 0.5
        Bs, labs = [], []
        for k, L in enumerate(P1["lower"]):
            tiles = [r[TA - (-3):] for r in L["tiles"]]
            B = BPD(tiles, TROWS, TCOLS, cell=cell, stroke=4.5)
            B.move_to(np.array([-4.5 + 4.5 * k, 1.0, 0]))
            Bs.append(B)
            labs.append(col_labels(B.grid.squares, TCOLS, 1, side=UP, size=20, color=DIM))
        rlab = row_labels(Bs[0].grid.squares, TROWS, TA, side=LEFT, size=22)
        with self.say("On to step three. Back to the bottom piece of sigma one. It consists of exactly three bumpless"
                      " pipe dreams.") as c:
            self.play(FadeIn(title), run_time=0.5)
            self.play(*[Create(B.grid) for B in Bs], *[FadeIn(l) for l in labs], FadeIn(rlab), run_time=1.2)
            self.play(*[LaggedStart(*[Create(p) for p in B.pipe_group], lag_ratio=0.1) for B in Bs], run_time=1.8)
        dts = [dots_on(B.grid.squares, L["blanks"], scale=0.28) for B, L in zip(Bs, P1["lower"])]
        wts = [weight_y(L["blanks"]).next_to(B, DOWN, buff=0.4) for B, L in zip(Bs, P1["lower"])]
        with self.say("Each one has a single blank tile. At x equals y, they give y three minus y two, y two minus y "
                      "zero, and y one minus y negative one. The first one is negative.") as c:
            self.play(*[FadeIn(d, scale=0.5) for d in dts], run_time=0.7)
            self.play(*[TransformFromCopy(d, w) for d, w in zip(dts, wts)], run_time=1.3)
            self.play(Indicate(wts[0], color=NEG), run_time=1.0)

        fills = []
        for B in Bs:
            for (i, j), sq in B.grid.squares.items():
                fills.append(sq.animate.set_fill(zone_color(i, j), opacity=0.17))
        legend = VGroup()
        for col, txt in [(T1, r"type 1"), (T3, r"type 3"), (NEG, r"negative or $0$")]:
            sw = Square(0.3, stroke_width=1, stroke_color=GRIDC, fill_color=col, fill_opacity=0.5)
            legend.add(VGroup(sw, Tex(txt, font_size=28, color=col)).arrange(RIGHT, buff=0.15))
        legend.arrange(RIGHT, buff=0.8).move_to(np.array([0, -1.55, 0]))
        with self.say("Let's color each cell i j by the kind of form, y i minus y j, that a blank tile there would "
                      "give.") as c:
            self.play(*fills, run_time=1.4)
            self.play(FadeIn(legend), run_time=0.8)
        with self.say("To the right of the staircase, we get type one. In column zero and to its left, type three. "
                      "The bad blank sits in between.") as c:
            self.play(Indicate(dts[0], color=WHITE, scale_factor=1.8), run_time=1.2)
        stairs = [staircase(B.grid.squares, TN, color=WHITE, width=5) for B in Bs]
        with self.say("So we cut along the staircase, into a trapezoid and a triangle.") as c:
            self.play(*[Create(s) for s in stairs], run_time=1.4)
            # replace each bumpless pipe dream by its two pieces and pull them apart
            pieces = []
            for k, B in enumerate(Bs):
                tr = tile_drawing(T1D["fillings"][k]["tiles"], TROWS, TCOLS, cell, stroke=4.5)
                tri = tile_drawing(T1D["tri"][0], TROWS, TCOLS, cell, stroke=4.5)
                v = B.grid.squares[(1, TA)].get_center() - tr.squares[(1, TA)].get_center()
                tr.shift(v)
                tri.shift(v)
                for (i, j), sq in list(tr.squares.items()) + list(tri.squares.items()):
                    sq.set_fill(zone_color(i, j), opacity=0.17)
                pieces.append((tr, tri))
            self.remove(*Bs, *stairs)
            for tr, tri in pieces:
                self.add(tr, tri)
            self.bring_to_front(*dts)
            self.play(*[tri.animate.shift(0.22 * UR) for _, tri in pieces], *[FadeOut(l) for l in labs], run_time=1.2)
        tl = Tex("trapezoid", font_size=24, color=LABEL).next_to(pieces[0][0], DOWN, buff=0.12).shift(0.6 * LEFT)
        tg = Tex("triangle", font_size=24, color=LABEL).next_to(pieces[0][1], UP, buff=0.1).shift(0.25 * RIGHT)
        self.play(FadeIn(tl), FadeIn(tg), *[w.animate.shift(0.15 * DOWN) for w in wts], run_time=0.6)

        f = MathTex(r"\mathfrak S^{\downarrow}_{\sigma, w}", "=", r"\sum_{\gamma}", r"\Big(\sum_{\text{trapezoids}} \mathrm{wt}\Big)",
                    r"\Big(\sum_{\text{triangles}} \mathrm{wt}\Big)", font_size=38).move_to(np.array([0, -1.55, 0]))
        with self.say("The trapezoid and the triangle meet along a boundary, gamma. So the bottom piece is a sum over"
                      " gamma, of trapezoids times triangles.", extra=0.5) as c:
            self.play(FadeOut(legend), run_time=0.4)
            self.play(Write(f), run_time=2.0)
        with self.say("Triangle cells only give type one forms, each at most once, so that part is already positive. "
                      "Here, all three bumpless pipe dreams share the same triangle, with no blank tiles.") as c:
            self.play(Indicate(f[4], color=T1), *[Indicate(tri, color=T1, scale_factor=1.0) for _, tri in pieces], run_time=1.4)
        f2 = MathTex(r"\mathfrak S^{\downarrow}_{\sigma_1, w}", "=", r"\big[", fac(3, 2, "x"), "+", fac(2, 0, "x"), "+", fac(1, -1, "x"),
                     r"\big]", r"\cdot", "1", font_size=38).move_to(f)
        with self.say("So everything rests on the trapezoid sum: x three minus y two, plus x two minus y zero, plus x"
                      " one minus y negative one.") as c:
            self.play(FadeOut(f, shift=0.2 * UP), FadeIn(f2, shift=0.2 * UP), run_time=1.2)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.8)


class Chains(Narrated):
    def construct(self):
        title = heading(r"Step 4: trapezoids as chains")
        U = T1D["fillings"][0]["table"]["rows"][0]
        v = [-1, 1, 2, 3, 4, 0]
        demo = {"rows": [U, v], "bars": [1], "vars": [2], "circles": [[0, 2, "blue"], [0, 3, "blue"]]}
        T = ChainTable(demo, TA, size=44, dx=0.8, dy=1.0)
        T.move_to(np.array([-1.0, 0.7, 0]))
        hdr = VGroup(*[MathTex(str(p), font_size=26, color=DIM).move_to(
            np.array([T.cells[(0, p)].get_center()[0], T.cells[(1, p)].get_center()[1] + 0.6, 0])) for p in TCOLS])
        plab = Tex("positions", font_size=24, color=DIM).next_to(hdr, LEFT, buff=0.4)
        bot = VGroup(*[T.cells[(0, p)] for p in TCOLS])
        topr = VGroup(*[T.cells[(1, p)] for p in TCOLS])
        with self.say("On to step four. Sottile's increasing chains come from the Pieri rule for Schubert "
                      "polynomials.") as c:
            self.play(FadeIn(title), FadeIn(hdr), FadeIn(plab), run_time=0.8)
            self.play(FadeIn(bot), run_time=0.8)
        with self.say("A single step swaps an entry left of the bar with a larger entry to its right, going up "
                      "exactly one step in Bruhat order.") as c:
            self.play(Create(T.bars[0]), run_time=0.6)
            kl = MathTex(r"k = 1", font_size=30, color=CUT).next_to(T.bars[0], DOWN, buff=0.12)
            self.play(FadeIn(kl), run_time=0.4)
            cp = bot.copy()
            self.play(cp.animate.shift(T.dy * UP), run_time=0.8)
            a_, b_ = cp[TCOLS.index(1)], cp[TCOLS.index(4)]
            self.play(Swap(a_, b_), run_time=1.2)
            self.remove(cp)
            self.add(topr)
        with self.say("An increasing k chain is a run of such swaps, where the smaller swapped values keep "
                      "increasing.") as c:
            self.play(Indicate(VGroup(T.cells[(1, 1)], T.cells[(1, 4)]), color=HL), run_time=1.2)
        vl = T.step_label(0, "x_2", size=40, color=LABEL, buff=0.3)
        wt = MathTex(fac(2, 3, "x"), fac(2, 4, "x"), font_size=38).move_to(np.array([4.6, 0.6, 0]))
        with self.say("Values to the right of the bar that stay put get circled. With variable x i, each circled j "
                      "gives a factor x i minus y j.") as c:
            self.play(Create(T.circ), run_time=1.0)
            self.play(FadeIn(vl), run_time=0.5)
            self.play(TransformFromCopy(T.circ, wt), run_time=1.2)
        self.play(FadeOut(VGroup(T, hdr, plab, kl, vl, wt)), run_time=0.7)

        # ---- one trapezoid, read line by line
        cell = 0.62
        F0 = T1D["fillings"][0]
        B = BPD(F0["tiles"], TROWS, TCOLS, cell=cell, stroke=5)
        B.move_to(np.array([-3.9, 0.35, 0]))
        rl = row_labels(B.grid.squares, TROWS, TA, side=LEFT, size=24)
        cl = col_labels(B.grid.squares, TCOLS, 1, side=UP, size=20, color=DIM)
        dt = dots_on(B.grid.squares, F0["blanks"], scale=0.28)
        tab = chain_table(F0["table"], size=32, dx=0.55, dy=cell, header=False, var_labels=False)
        # align table row s with the line above trapezoid row TN - s
        y_line = lambda r: B.grid.squares[(r, TA)].get_top()[1]
        tab.shift(np.array([1.2 - tab.numbers.get_left()[0], y_line(TN) - tab.cells[(0, TA)].get_center()[1], 0]))
        guides = VGroup(*[DashedLine(np.array([B.grid.get_right()[0] + 0.15, y_line(TN - s), 0]),
                                     np.array([tab.numbers.get_left()[0] - 0.25, y_line(TN - s), 0]),
                                     color=GREY_D, stroke_width=2, dash_length=0.08) for s in range(4)])
        ulab = VGroup(*[MathTex(f"u_{TN - s}", font_size=28, color=LABEL).next_to(tab.cells[(s, TN)], RIGHT, buff=0.45)
                        for s in range(4)])
        with self.say("Now take a trapezoid. Above each of its rows, the positions of the pipes form a permutation, u"
                      " sub r.") as c:
            self.play(Create(B.grid), FadeIn(rl), FadeIn(cl), run_time=1.0)
            self.play(LaggedStart(*[Create(p) for p in B.pipe_group], lag_ratio=0.12), FadeIn(dt), run_time=1.6)
            for s in range(4):
                row = VGroup(*[tab.cells[(s, p)] for p in TCOLS])
                self.play(Create(guides[s]), FadeIn(row, shift=0.2 * RIGHT), FadeIn(ulab[s]), run_time=0.55)
        with self.say("Crossing one row of the trapezoid is an increasing chain. So we get a sequence of chains, from"
                      " U at the bottom to W at the top.") as c:
            self.play(LaggedStart(*[Create(b) for b in tab.bars], lag_ratio=0.3), run_time=1.4)
            Ul = MathTex("U", font_size=30, color=HL).next_to(ulab[0], RIGHT, buff=0.25)
            Wl = MathTex("W", font_size=30, color=HL).next_to(ulab[3], RIGHT, buff=0.25)
            self.play(FadeIn(Ul), FadeIn(Wl), run_time=0.6)
        vlabs = VGroup(*[MathTex(f"x_{v}", font_size=26, color=LABEL).move_to(
            np.array([B.grid.get_left()[0] - 0.75, B.grid.squares[(v, TA)].get_center()[1], 0])) for v in F0["table"]["vars"]])
        with self.say("Crossing row i comes with the variable x i. The blue circles are the same for every trapezoid.") as c:
            self.play(FadeOut(rl), FadeIn(vlabs), run_time=0.6)
            self.play(Create(blue(tab)), run_time=1.2)
        with self.say("The one green circle is the blank tile. The value two stays put in the step for x three, "
                      "giving x three minus y two.") as c:
            self.play(Create(green(tab)), run_time=0.8)
            self.play(Indicate(dt, color=WHITE, scale_factor=1.8), Indicate(green(tab), color=POS), run_time=1.2)
        eq = MathTex(r"\mathrm{wt}(D)\cdot \prod_{1 \le i < j \le 4} (x_i - y_j)", "=", r"\mathrm{wt}^4_{\mathrm{rev}(\alpha)}(u_4, \ldots, u_1)",
                     font_size=36).move_to(np.array([0, -2.05, 0]))
        with self.say("So the weight of the trapezoid, times a fixed product from the blue circles, is exactly the "
                      "weight of its chain.") as c:
            self.play(Write(eq), run_time=1.8)
        self.play(FadeOut(VGroup(B, cl, dt, tab, guides, ulab, Ul, Wl, vlabs, eq)), run_time=0.8)

        # ---- all three
        groups = []
        for k, F in enumerate(T1D["fillings"]):
            Bk = BPD(F["tiles"], TROWS, TCOLS, cell=0.36, stroke=3.5)
            Bk.move_to(np.array([-4.6 + 4.6 * k, 1.75, 0]))
            dk = dots_on(Bk.grid.squares, F["blanks"], scale=0.3)
            Tk = chain_table(F["table"], size=24, dx=0.42, dy=0.44, header=False)
            Tk.move_to(np.array([-4.6 + 4.6 * k, -0.45, 0]))
            wk = MathTex(fac(*F["blanks"][0], "x"), font_size=30).next_to(Tk, DOWN, buff=0.25)
            groups.append(VGroup(Bk, dk, Tk, wk))
        Ulab = MathTex(r"U = [-1, 1, 0, 3, 4, 2]", font_size=28, color=LABEL)
        Wlab = MathTex(r"W = [0, 1, 2, 3, 4, -1]", font_size=28, color=LABEL)
        alab = MathTex(r"\mathrm{rev}(\alpha) = (2, 1, 0)", font_size=28, color=CUT)
        info = VGroup(Ulab, Wlab, alab).arrange(RIGHT, buff=0.8).move_to(np.array([0, -2.15, 0]))
        with self.say("All three trapezoids become chains from U to W, with the bars at positions two, one, zero. And"
                      " this is a bijection.", extra=0.5) as c:
            self.play(LaggedStart(*[FadeIn(g, shift=0.15 * UP) for g in groups], lag_ratio=0.3), run_time=2.2)
            self.play(FadeIn(info), run_time=0.8)
        with self.say("The green circles still give the same three terms. Nothing has improved yet.") as c:
            self.play(*[Indicate(green(g[2]), color=POS) for g in groups], run_time=1.2)
        self.play(FadeOut(VGroup(*groups, info, title)), run_time=0.8)


class Reverse(Narrated):
    def construct(self):
        title = heading(r"Step 5: reverse the bars")
        sym = MathTex(r"C^{4}_{U, W, \mathrm{rev}(\alpha)}(x_3, x_2, x_1; y)", "=", r"C^{4}_{U, W, \alpha}(x_1, x_2, x_3; y)", font_size=42)
        sym.move_to(np.array([0, 2.2, 0]))
        sym[0].set_color(LABEL)
        cg = Tex(r"$C$ = generating function of the chains", font_size=26, color=DIM).next_to(sym, DOWN, buff=0.25)
        with self.say("On to step five. A Pieri identity of Samuel gives a hidden symmetry: permuting the bars "
                      "together with the variables doesn't change the sum.", extra=0.5) as c:
            self.play(FadeIn(title), run_time=0.5)
            self.play(Write(sym), run_time=2.0)
            self.play(FadeIn(cg), run_time=0.6)
        groups = []
        for k, Fd in enumerate(T1D["forward"]):
            Tk = chain_table(Fd, size=28, dx=0.5, dy=0.52, header=False)
            Tk.move_to(np.array([-4.5 + 4.5 * k, -0.5, 0]))
            (i, j), = Fd["factors"]
            wk = MathTex(fac(i, j, "x"), font_size=34).next_to(Tk, DOWN, buff=0.3)
            groups.append(VGroup(Tk, wk))
        al = MathTex(r"\alpha = (0, 1, 2)", font_size=30, color=CUT).next_to(cg, DOWN, buff=0.25)
        with self.say("So instead, we count chains from U to W with the bars in increasing order, zero, one, two, and"
                      " the variables x one, x two, x three.") as c:
            self.play(FadeIn(al), run_time=0.6)
            self.play(LaggedStart(*[FadeIn(g[0], shift=0.15 * UP) for g in groups], lag_ratio=0.3), run_time=2.2)
        with self.say("Again, there are three of them. Their green circles give x one minus y zero, x two minus y "
                      "two, and x three minus y negative one.") as c:
            self.play(*[Indicate(green(g[0]), color=POS) for g in groups], run_time=1.0)
            self.play(*[TransformFromCopy(green(g[0]), g[1]) for g in groups], run_time=1.2)
        self.play(FadeOut(VGroup(sym, cg, al)), *[g.animate.shift(1.6 * UP) for g in groups], run_time=0.9)

        before = MathTex(fac(3, 2, "x"), "+", fac(2, 0, "x"), "+", fac(1, -1, "x"), font_size=36)
        after = MathTex(fac(1, 0, "x"), "+", fac(2, 2, "x"), "+", fac(3, -1, "x"), font_size=36)
        eq = VGroup(before, MathTex("=", font_size=36), after).arrange(RIGHT, buff=0.25).move_to(np.array([0, -1.2, 0]))
        with self.say("The two sums are the same polynomial, just written in two different ways.") as c:
            self.play(Write(eq), run_time=2.0)
        aty = MathTex(fac(1, 0), "+", "0", "+", fac(3, -1), font_size=40)
        aty[0].set_color(T3)
        aty[4].set_color(T3)
        aty[2].set_color(DIM)
        lab = MathTex(r"x = y:", font_size=36, color=LABEL)
        row = VGroup(lab, aty).arrange(RIGHT, buff=0.35).next_to(eq, DOWN, buff=0.5).align_to(after, LEFT).shift(1.4 * LEFT)
        with self.say("But now, set x equal to y. The middle term vanishes, and the other two are type three.") as c:
            self.play(FadeIn(lab), TransformFromCopy(after, aty), run_time=1.6)
            self.play(Circumscribe(aty, color=T3), run_time=1.2)
        with self.say("And this always happens: with increasing bars, each chain gives either zero, or a product of "
                      "distinct type three forms.") as c:
            self.play(Indicate(groups[1][1], color=DIM), run_time=1.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.8)


class Assemble(Narrated):
    def construct(self):
        title = heading(r"Putting it together")
        cor = MathTex(r"j^w_{21}(y)", "=", r"\underbrace{1}_{\text{top}}", r"\cdot",
                      r"\underbrace{\big[" + fac(1, 0) + "+" + fac(3, -1) + r"\big]}_{\text{bottom}}",
                      "+", r"\underbrace{" + fac(2, 0) + r"}_{\text{top}}", r"\cdot", r"\underbrace{1}_{\text{bottom}}", font_size=40)
        cor.move_to(np.array([0, 1.6, 0]))
        s1 = Tex(r"$\sigma_1$", font_size=30, color=PIPE).next_to(VGroup(cor[2], cor[4]), UP, buff=0.3)
        s2 = Tex(r"$\sigma_2$", font_size=30, color=PIPE).next_to(VGroup(cor[6], cor[8]), UP, buff=0.3)
        with self.say("Back to our formula. The bottom piece of sigma one is now y one minus y zero, plus y three "
                      "minus y negative one.") as c:
            self.play(FadeIn(title), run_time=0.5)
            self.play(Write(cor), run_time=2.4)
            self.play(FadeIn(s1), FadeIn(s2), run_time=0.6)
        fin = MathTex(r"j^w_{21}(y)", "=", fac(1, 0), "+", fac(3, -1), "+", fac(2, 0), font_size=46)
        for k in (2, 4, 6):
            fin[k].set_color(T3)
        fin.move_to(np.array([0, -0.2, 0]))
        box = SurroundingRectangle(fin, color=POS, buff=0.2, corner_radius=0.1)
        with self.say("Every term is positive. This is the formula from the very beginning.") as c:
            self.play(FadeIn(fin, shift=0.3 * DOWN), run_time=1.2)
            self.play(Create(box), run_time=0.8)
        self.play(FadeOut(VGroup(cor, s1, s2)), VGroup(fin, box).animate.scale(0.75).move_to(np.array([0, 2.3, 0])), run_time=0.9)

        # the structure of a general term
        parts = [(r"$\omega_1$(top factor)", r"types 2 and 3", T2), (r"triangle", r"type 1", T1), (r"trapezoid chain", r"type 3", T3)]
        blocks = VGroup()
        for name, ty, col in parts:
            r = RoundedRectangle(width=3.4, height=1.3, corner_radius=0.15, stroke_color=col, stroke_width=3,
                                 fill_color=col, fill_opacity=0.12)
            t = VGroup(Tex(name, font_size=30), Tex(ty, font_size=28, color=col)).arrange(DOWN, buff=0.15).move_to(r)
            blocks.add(VGroup(r, t))
        times = [MathTex(r"\times", font_size=40) for _ in range(2)]
        row = VGroup(blocks[0], times[0], blocks[1], times[1], blocks[2]).arrange(RIGHT, buff=0.3).move_to(np.array([0, 0.25, 0]))
        with self.say("In general, every term of the formula is a product of three parts, each with distinct factors.") as c:
            self.play(LaggedStart(*[FadeIn(m, shift=0.15 * UP) for m in row], lag_ratio=0.25), run_time=2.0)
        concl = Tex(r"type 1 and type 2 forms at most once, type 3 forms at most twice", font_size=32, color=HL)
        concl.next_to(row, DOWN, buff=0.55)
        with self.say("So type one and type two forms appear at most once, and type three at most twice. That's "
                      "Anderson's positivity, now visible term by term.", extra=0.5) as c:
            self.play(Write(concl), run_time=1.6)
        self.play(FadeOut(VGroup(row, concl, fin, box)), run_time=0.8)

        steps = VGroup(*[Tex(t, font_size=32) for t in [
            r"1. cut along the horizon: $\overleftarrow{\mathfrak S}_w = \sum_\sigma \overleftarrow{\mathfrak S}_\sigma\, \mathfrak S^\downarrow_{\sigma,w}$",
            r"2. flip the top piece: both factors become bottom pieces",
            r"3. cut along the staircase: triangle (type 1) and trapezoid",
            r"4. read the trapezoid as increasing chains",
            r"5. reverse the bars: each chain gives $0$ or type 3 forms"]]).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        steps.move_to(np.array([0, 0.3, 0]))
        checks = VGroup(*[MathTex(r"\checkmark", font_size=36, color=POS).next_to(s, LEFT, buff=0.3) for s in steps])
        with self.say("To recap: the five steps we followed for this one example work for every w in S sub Z, and "
                      "every lambda.") as c:
            self.play(LaggedStart(*[FadeIn(s, shift=0.15 * RIGHT) for s in steps], lag_ratio=0.25), run_time=2.4)
            self.play(LaggedStart(*[FadeIn(k, scale=0.5) for k in checks], lag_ratio=0.15), run_time=1.0)
        self.play(FadeOut(VGroup(steps, checks, title)), run_time=0.8)


class Outro(Narrated):
    def construct(self):
        t1 = Tex(r"A positive combinatorial formula for the", font_size=44)
        t2 = Tex(r"double Edelman--Greene coefficients", font_size=58, color=PIPE)
        au = Tex(r"Jack Chen-An Chou \quad and \quad Tianyi Yu", font_size=36, color=LABEL)
        ax = Tex(r"arXiv:2512.12185", font_size=30, color=DIM)
        card = VGroup(t1, t2, au, ax).arrange(DOWN, buff=0.3).move_to(0.6 * UP)
        au.shift(0.2 * DOWN)
        ax.shift(0.2 * DOWN)
        with self.say("The details, and the general proofs, are in the paper. Thanks for watching!") as c:
            self.play(FadeIn(t1), FadeIn(t2), run_time=1.2)
            self.play(FadeIn(au), FadeIn(ax), run_time=0.8)
        self.wait(1.5)
        self.play(FadeOut(card), run_time=1.2)
        self.wait(0.5)
