"""Part C: the glasses, the gauntlet, the theorem, the outro."""

from common import *


def perm_row(p, size=46, dx=0.55, bar=None, color=WHITE):
    ents = VGroup(*[MathTex(str(v), font_size=size, color=color) for v in p])
    for k, e in enumerate(ents):
        e.move_to(np.array([k * dx, 0, 0]))
    g = VGroup(ents)
    g.ents = ents
    if bar is not None:
        x = (bar - 0.5) * dx
        b = Line(np.array([x, 0.32, 0]), np.array([x, -0.32, 0]), color=NEG, stroke_width=4)
        g.add(b)
        g.bar = b
    return g


def plain_steps(perms, ks):
    steps = []
    for s, k in enumerate(ks):
        u, v = perms[s], perms[s + 1]
        steps.append({"k": k, "r": 0, "highlights": [[p, "yellow"] for p in range(k, len(u)) if u[p] == v[p]]})
    return steps


def step_labels(table, labels, size=28, color=HL):
    """Put the chain labels (one per step) to the right of a ChainTable."""
    g = VGroup()
    m = len(table.bars)
    right = table.numbers.get_right()[0] + 0.35
    for s, lab in enumerate(labels):
        bar = table.bars[s]
        t = MathTex(lab, font_size=size, color=color).move_to(np.array([right, bar.get_center()[1], 0]))
        g.add(t)
    return g


def trapezoid(tiles, cell=0.42):
    rows, cols = [1, 2, 3, 4], list(range(-1, 5))
    b = BPD(tiles, rows, cols, cell=cell, region="trap")
    h = cell / 2
    halves = VGroup()
    for i in rows:
        c = b.c(i, i)
        halves.add(Polygon(c + np.array([-h, h, 0]), c + np.array([h, -h, 0]), c + np.array([-h, -h, 0]),
                           stroke_color=GRIDC, stroke_width=1.5))
    tl = b.c(1, -1) + np.array([-h, h, 0])
    tr = b.c(1, 1) + np.array([-h, h, 0])
    br = b.c(4, 4) + np.array([h, -h, 0])
    bl = b.c(4, -1) + np.array([-h, -h, 0])
    outline = Polygon(tl, tr, br, bl, stroke_color=WHITE, stroke_width=3)
    g = VGroup(halves, b, outline)
    g.bpd = b
    return g


class Glasses(Narrated):
    def construct(self):
        title = Tex("The glasses", font_size=40, color=PIPE).to_corner(UL, buff=0.5)
        glasses = image("glasses.png", 2.2).move_to(0.7 * UP)
        power = Tex(r"Super power: \emph{pipes} $\longrightarrow$ \emph{chains}", font_size=42).next_to(glasses, DOWN, buff=0.5)
        with self.voice("g1") as v:
            self.play(FadeIn(glasses, shift=0.3 * UP), FadeIn(title), run_time=1.0)
            self.play(Write(power), run_time=1.6)

        # ---------------------------------------------------- Bruhat order
        with self.voice("g2") as v:
            self.play(FadeOut(power), glasses.animate.scale(0.4).to_corner(UR, buff=0.4), run_time=1.0)
            v.until("s1")
            a = perm_row([2, 1, 3]).move_to(5.2 * LEFT + 1.0 * UP)
            b = perm_row([3, 1, 2]).move_to(2.3 * LEFT + 1.0 * UP)
            ar1 = Arrow(a.get_right(), b.get_left(), buff=0.25, color=GREY_B, stroke_width=4)
            ok = MathTex(r"\checkmark", color=POS, font_size=52).next_to(b, RIGHT, buff=0.35)
            self.play(FadeIn(a), run_time=0.5)
            self.play(GrowArrow(ar1), TransformFromCopy(a, b), run_time=0.9)
            self.play(Indicate(a.ents[1], color=YELLOW), FadeIn(ok), run_time=0.9)
            c = perm_row([1, 2, 3]).move_to(5.2 * LEFT + 1.0 * DOWN)
            d = perm_row([3, 2, 1]).move_to(2.3 * LEFT + 1.0 * DOWN)
            ar2 = Arrow(c.get_right(), d.get_left(), buff=0.25, color=GREY_B, stroke_width=4)
            no = MathTex(r"\times", color=NEG, font_size=56).next_to(d, RIGHT, buff=0.35)
            self.play(FadeIn(c), run_time=0.5)
            self.play(GrowArrow(ar2), TransformFromCopy(c, d), run_time=0.9)
            self.play(Indicate(c.ents[1], color=NEG), FadeIn(no), run_time=0.9)
            v.until("s2")
            pos = {"123": 2.6 * DOWN, "213": 1.0 * DOWN + 1.5 * LEFT, "132": 1.0 * DOWN + 1.5 * RIGHT,
                   "231": 0.6 * UP + 1.5 * LEFT, "312": 0.6 * UP + 1.5 * RIGHT, "321": 2.2 * UP}
            shift = 3.0 * RIGHT + 0.2 * DOWN
            nodes = {k: MathTex(k, font_size=40).move_to(p + shift) for k, p in pos.items()}
            edges = [("123", "213"), ("123", "132"), ("213", "231"), ("213", "312"), ("132", "231"),
                     ("132", "312"), ("231", "321"), ("312", "321")]
            lines = VGroup(*[Line(nodes[x].get_top(), nodes[y].get_bottom(), buff=0.12, color=GREY_B, stroke_width=3)
                             for x, y in edges])
            self.play(LaggedStart(*[FadeIn(n) for n in nodes.values()], lag_ratio=0.1), Create(lines), run_time=2.0)

        # ---------------------------------------------------- k-chains
        dx = 0.62
        rows = [[4, 1, 3, 2, 7, 6, 5], [4, 2, 3, 1, 7, 6, 5], [6, 2, 3, 1, 7, 4, 5], [7, 2, 3, 1, 6, 4, 5]]
        swaps = [(1, 3), (0, 5), (0, 4)]  # 0-indexed positions
        with self.voice("g3") as v:
            self.play(FadeOut(VGroup(a, b, c, d, ar1, ar2, ok, no, lines, *nodes.values())), run_time=0.8)
            r0 = perm_row(rows[0], dx=dx, bar=3).move_to(3.0 * LEFT + 2.4 * DOWN)
            self.play(FadeIn(r0.ents), run_time=0.6)
            self.play(Create(r0.bar), run_time=0.6)
            kk = MathTex("k = 3", font_size=36, color=NEG).next_to(r0.bar, DOWN, buff=0.25)
            self.play(FadeIn(kk), run_time=0.5)
            v.until("s1")
            defs = VGroup(
                Tex(r"increasing $k$-chain:", font_size=38, color=PIPE),
                Tex(r"$\bullet$ each step swaps across the bar", font_size=34),
                Tex(r"$\bullet$ each step goes up in Bruhat order", font_size=34),
                Tex(r"$\bullet$ the smaller swapped numbers increase", font_size=34),
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.25).move_to(3.4 * RIGHT + 1.2 * UP)
            self.play(FadeIn(defs[0]), run_time=0.6)
            for dd in defs[1:]:
                self.play(FadeIn(dd, shift=0.1 * RIGHT), run_time=0.8)

        with self.voice("g4") as v:
            cur = r0
            built = [r0]
            smalls = []
            for s, key in enumerate(["sw1", "sw2", "sw3"]):
                v.until(key)
                nxt = perm_row(rows[s], dx=dx, bar=3).move_to(cur.get_center())
                self.add(nxt)
                self.play(nxt.animate.shift(1.1 * UP), run_time=0.5)
                p, q = swaps[s]
                small = nxt.ents[p] if rows[s][p] < rows[s][q] else nxt.ents[q]
                self.play(small.animate.set_color(YELLOW), run_time=0.3)
                self.play(Swap(nxt.ents[p], nxt.ents[q]), run_time=0.8)
                smalls.append(rows[s][min(p, q, key=lambda z: rows[s][z])])
                built.append(nxt)
                cur = nxt
            v.until("small")
            lst = MathTex("1", "<", "4", "<", "6", font_size=48, color=YELLOW).next_to(defs, DOWN, buff=0.7)
            self.play(Write(lst), run_time=1.0)

        with self.voice("g5") as v:
            self.play(FadeOut(VGroup(defs, lst)), built[3].animate.set_opacity(0.25), run_time=0.8)
            v.until("s1")
            # fixed entries right of the bar between rows[0] and rows[2]
            hl = VGroup()
            for p in range(3, 7):
                if rows[0][p] == rows[2][p]:
                    x = built[0].ents[p].get_center()[0]
                    y0 = built[0].ents[p].get_center()[1]
                    y1 = built[2].ents[p].get_center()[1]
                    rr = RoundedRectangle(corner_radius=0.15, width=0.45, height=y1 - y0 + 0.65, fill_color=HL,
                                          fill_opacity=0.45, stroke_width=0).move_to(np.array([x, (y0 + y1) / 2, 0]))
                    rr.set_z_index(-1)
                    hl.add(rr)
            self.play(FadeIn(hl), run_time=0.9)
            v.until("s2")
            wt = MathTex(r"\mathrm{wt}\big(u \xrightarrow[z]{3} w\big)", "=", "(z - y_7)", "(z - y_5)", font_size=46)
            wt.move_to(3.2 * RIGHT + 0.8 * UP)
            uw = MathTex(r"u = 4132765,\quad w = 6231745", font_size=34, color=LABEL).next_to(wt, DOWN, buff=0.35)
            self.play(Write(wt[0]), FadeIn(uw), run_time=1.2)
            self.play(Write(wt[1:]), run_time=1.4)

        # ---------------------------------------------- Lenart-Sottile
        with self.voice("g6") as v:
            self.play(FadeOut(VGroup(*built, kk, hl, wt, uw)), run_time=0.8)
            th_t = Tex(r"\textbf{Theorem} [Lenart--Sottile]", font_size=36, color=PIPE)
            th = MathTex(r"\text{pipe dreams of } u", r"\;\longleftrightarrow\;",
                         r"u \xrightarrow[x_1]{1} \cdot \xrightarrow[x_2]{2} \cdots \xrightarrow[x_{n-1}]{n-1} w_0", font_size=44)
            th2 = MathTex(r"\mathrm{wt}(D) = \mathrm{wt}(\text{chains})", font_size=40)
            G = VGroup(th_t, th, th2).arrange(DOWN, buff=0.35).to_edge(UP, buff=0.9)
            self.play(FadeIn(th_t), Write(th), run_time=2.4)
            v.until("s1")
            self.play(Write(th2), run_time=1.2)

        def chain_block(perms, ks, labels, dx_=0.5):
            T = ChainTable(perms, plain_steps(perms, ks), size=36, dx=dx_, dy=0.55)
            L = step_labels(T, labels, size=30)
            return VGroup(T, L)

        with self.voice("g7") as v:
            pds = [PipeDream(3, d, cell=0.62) for d in DATA["pd_132"]]
            ls = DATA["chains_132_ls"]
            # match: cross (1,2) <-> chain through 312
            cA = [c for c in ls if c[1] == [3, 1, 2]][0]
            cB = [c for c in ls if c[1] == [3, 2, 1]][0]
            blocks = [chain_block(cA, [1, 2], ["x_1", "x_2"]), chain_block(cB, [1, 2], ["x_1", "x_2"])]
            ws = [MathTex(fac(1, 2, "x"), font_size=40), MathTex(fac(2, 1, "x"), font_size=40)]
            rowsg = []
            for P, B_, W in zip(pds, blocks, ws):
                arrow = MathTex(r"\longleftrightarrow", font_size=44)
                r = VGroup(P, arrow, B_, W).arrange(RIGHT, buff=0.55)
                rowsg.append(r)
            VGroup(*rowsg).arrange(DOWN, buff=0.45).next_to(G, DOWN, buff=0.45)
            self.play(FadeIn(rowsg[0][:3]), FadeIn(rowsg[1][:3]), run_time=1.6)
            cds = [P.cross_dots() for P in pds]
            v.until("w1")
            self.play(FadeIn(cds[0]), FadeIn(rowsg[0][3]), run_time=0.9)
            v.until("w2")
            self.play(FadeIn(cds[1]), FadeIn(rowsg[1][3]), run_time=0.9)

        with self.voice("g8") as v:
            self.play(FadeOut(VGroup(*rowsg, *cds)), run_time=0.6)
            th_t2 = Tex(r"\textbf{Theorem} [Yu]", font_size=36, color=PIPE)
            thb = MathTex(r"\text{bumpless pipe dreams of } u", r"\;\longleftrightarrow\;",
                          r"u \xrightarrow[x_{n-1}]{n-1} \cdots \xrightarrow[x_2]{2} \cdot \xrightarrow[x_1]{1} w_0", font_size=44)
            G2 = VGroup(th_t2, thb, th2.copy()).arrange(DOWN, buff=0.35).to_edge(UP, buff=0.9)
            self.play(ReplacementTransform(G, G2), run_time=1.5)
            yu = DATA["chains_132_yu"]
            cA = [c for c in yu if c[1] == [1, 3, 2]][0]
            cB = [c for c in yu if c[1] == [2, 3, 1]][0]
            bp = [BPD(t, [1, 2, 3], [1, 2, 3], cell=0.55) for t in DATA["bpd_132"]]
            blocks = [chain_block(cA, [2, 1], ["x_2", "x_1"]), chain_block(cB, [2, 1], ["x_2", "x_1"])]
            ws = [MathTex(fac(2, 2, "x"), font_size=40), MathTex(fac(1, 1, "x"), font_size=40)]
            rows2 = []
            for P, B_, W in zip(bp, blocks, ws):
                r = VGroup(P, MathTex(r"\longleftrightarrow", font_size=44), B_, W).arrange(RIGHT, buff=0.55)
                rows2.append(r)
            VGroup(*rows2).arrange(DOWN, buff=0.45).next_to(G2, DOWN, buff=0.45)
            self.play(FadeIn(rows2[0][:3]), FadeIn(rows2[1][:3]), run_time=1.4)
            v.until("w1")
            self.play(FadeIn(bp[0].empty_dots()), FadeIn(rows2[0][3]), run_time=0.8)
            v.until("w2")
            self.play(FadeIn(bp[1].empty_dots()), FadeIn(rows2[1][3]), run_time=0.8)

        # ------------------------------------------------- trapezoids
        traps = [trapezoid(t) for t in DATA["trap"]["grids"]]
        tw = [((3, 2),), ((2, 0),), ((1, -1),)]
        with self.voice("g9") as v:
            others = [m for m in self.mobjects if m is not title and m is not glasses]
            self.play(*[FadeOut(m) for m in others], run_time=0.8)
            col_x = [-4.5, 0.0, 4.5]
            for T, x in zip(traps, col_x):
                T.move_to(np.array([x, 2.05, 0]))
            self.play(LaggedStart(*[FadeIn(T) for T in traps], lag_ratio=0.3), run_time=1.8)
            dots = [T.bpd.empty_dots() for T in traps]
            self.play(*[FadeIn(d, scale=0.5) for d in dots], run_time=0.6)
            wts = []
            for T, ((i, j),) in zip(traps, tw):
                w_ = MathTex(fac(i, j), font_size=40, color=fac_color(i, j)).next_to(T, DOWN, buff=0.22)
                wts.append(w_)
            for key, k in [("t1", 0), ("t2", 1), ("t3", 2)]:
                v.until(key)
                self.play(TransformFromCopy(dots[k], wts[k]), run_time=0.7)
            v.until("s3")
            self.play(Indicate(wts[0], color=NEG, scale_factor=1.2), run_time=1.0)

        self.tables = []
        with self.voice("g10") as v:
            blocks = []
            for k, c in enumerate(DATA["chains_glasses"]):
                T = ChainTable(c["perms"], c["steps"], size=32, dx=0.4, dy=0.44)
                L = step_labels(T, ["y_3", "y_2", "y_1"], size=28)
                B_ = VGroup(T, L).next_to(wts[k], DOWN, buff=0.3)
                blocks.append(B_)
            self.play(LaggedStart(*[FadeIn(B_[0].numbers) for B_ in blocks], lag_ratio=0.2), run_time=1.4)
            self.play(*[Create(B_[0].bars) for B_ in blocks], *[FadeIn(B_[1]) for B_ in blocks], run_time=1.0)
            v.until("s1")
            yel = [h for B_ in blocks for h in B_[0].hls if h.kind == "yellow"]
            grn = [h for B_ in blocks for h in B_[0].hls if h.kind == "green"]
            self.play(*[FadeIn(h) for h in yel], *[Indicate(d, color=HL) for d in dots], run_time=1.2)
            v.until("s2")
            self.play(*[FadeIn(h) for h in grn], run_time=1.0)
            form = MathTex(r"\mathrm{wt}(D) = \frac{\mathrm{wt}(\text{chains})}{\prod_{1\le i<j\le 4}(y_i - y_j)}", font_size=34)
            form.to_edge(DOWN, buff=0.3)
            self.play(Write(form), run_time=1.5)
        self.play(FadeOut(Group(*traps, *dots, *wts, *blocks, form, glasses, title)), run_time=0.8)


class Gauntlet(Narrated):
    def construct(self):
        title = Tex("The gauntlet", font_size=40, color=PIPE).to_corner(UL, buff=0.5)
        g = image("gauntlet.png", 2.6).move_to(0.7 * UP)
        power = Tex(r"Super power: \emph{swap labels in chains}", font_size=42).next_to(g, DOWN, buff=0.5)
        with self.voice("h1") as v:
            self.play(FadeIn(g, shift=0.3 * UP), FadeIn(title), run_time=1.0)
            self.play(Write(power), run_time=1.6)

        with self.voice("h2") as v:
            self.play(FadeOut(power), g.animate.scale(0.4).to_corner(UR, buff=0.35), run_time=1.0)
            pt = Tex(r"\textbf{Proposition} [Samuel]", font_size=38, color=PIPE).move_to(2.2 * UP)
            lhs = MathTex(r"\sum \mathrm{wt}\Big(u", r"\xrightarrow[z_a]{\;a\;}", r"\cdot", r"\xrightarrow[z_b]{\;b\;}", r"w\Big)", font_size=50)
            rhs = MathTex(r"\sum \mathrm{wt}\Big(u", r"\xrightarrow[z_b]{\;b\;}", r"\cdot", r"\xrightarrow[z_a]{\;a\;}", r"w\Big)", font_size=50)
            eq = MathTex("=", font_size=50)
            row = VGroup(lhs, eq, rhs).arrange(RIGHT, buff=0.35).move_to(0.6 * UP)
            self.play(FadeIn(pt), Write(lhs), run_time=1.8)
            self.play(FadeIn(eq), *[TransformFromCopy(lhs[k], rhs[k]) for k in (0, 2, 4)],
                      TransformFromCopy(lhs[1], rhs[3], path_arc=-PI / 2),
                      TransformFromCopy(lhs[3], rhs[1], path_arc=-PI / 2), run_time=1.8)
            v.until("s1")
            note = Tex(r"$\Rightarrow$ the labels can be reordered freely", font_size=38, color=YELLOW).next_to(row, DOWN, buff=0.7)
            self.play(Write(note), run_time=1.6)

        with self.voice("h3") as v:
            self.play(FadeOut(VGroup(pt, row, note)), run_time=0.8)
            l1 = MathTex(r"\text{pipe dreams:}\quad", r"\sum \mathrm{wt}\big(u \xrightarrow[x_1]{1} \cdot \xrightarrow[x_2]{2} \cdots \xrightarrow[x_{n-1}]{n-1} w_0\big)", font_size=40)
            l2 = MathTex(r"\text{bumpless:}\quad", r"\sum \mathrm{wt}\big(u \xrightarrow[x_{n-1}]{n-1} \cdots \xrightarrow[x_2]{2} \cdot \xrightarrow[x_1]{1} w_0\big)", font_size=40)
            VGroup(l1, l2).arrange(DOWN, buff=0.6, aligned_edge=RIGHT).move_to(0.9 * UP)
            self.play(Write(l1), run_time=1.6)
            v.until("s1")
            self.play(Write(l2), run_time=1.6)
            eqs = MathTex(r"\mathfrak{S}_{132}:\quad", fac(1, 2, "x"), "+", fac(2, 1, "x"), "=", fac(2, 2, "x"), "+", fac(1, 1, "x"),
                          font_size=42).next_to(VGroup(l1, l2), DOWN, buff=0.8)
            v.until("s2")
            self.play(Write(eqs), run_time=1.8)

        glasses_data = DATA["chains_glasses"]
        gaunt_data = DATA["chains_gauntlet"]
        col_x = [-4.5, 0.0, 4.5]

        def block(c, labels, x):
            T = ChainTable(c["perms"], c["steps"], size=34, dx=0.42, dy=0.5)
            L = step_labels(T, labels, size=30)
            B_ = VGroup(T, L).move_to(np.array([x, 0.6, 0]))
            return B_

        with self.voice("h4") as v:
            self.play(FadeOut(VGroup(l1, l2, eqs)), run_time=0.6)
            gb = [block(c, ["y_3", "y_2", "y_1"], x) for c, x in zip(glasses_data, col_x)]
            gw = [MathTex(fac(i, j), font_size=40, color=fac_color(i, j)).next_to(B_, DOWN, buff=0.4)
                  for B_, (i, j) in zip(gb, [(3, 2), (2, 0), (1, -1)])]
            self.play(*[FadeIn(B_) for B_ in gb], *[FadeIn(w_) for w_ in gw], run_time=1.2)
            v.until(0.4 * v.duration)
            # reverse the label columns
            anims = []
            for B_ in gb:
                L = B_[1]
                anims += [L[0].animate.move_to(L[2].get_center()), L[2].animate.move_to(L[0].get_center())]
            self.play(*anims, path_arc=PI / 2, run_time=1.4)

        with self.voice("h5") as v:
            nb = [block(c, ["y_1", "y_2", "y_3"], x) for c, x in zip(gaunt_data, col_x)]
            nw = [MathTex(fac(i, j), font_size=40, color=fac_color(i, j)).next_to(B_, DOWN, buff=0.4)
                  for B_, (i, j) in zip(nb, [(3, -1), (2, 2), (1, 0)])]
            nw[1] = MathTex(fac(2, 2), "=0", font_size=40, color=DIM).move_to(nw[1])
            self.play(*[FadeOut(w_) for w_ in gw], *[ReplacementTransform(a_, b_) for a_, b_ in zip(gb, nb)], run_time=1.6)
            for key, k in [("t1", 0), ("t2", 1), ("t3", 2)]:
                v.until(key)
                self.play(FadeIn(nw[k], shift=0.2 * UP), run_time=0.7)
            v.until("s2")
            old = MathTex(fac(3, 2), "+", fac(2, 0), "+", fac(1, -1), font_size=38)
            new = MathTex("=", fac(3, -1), "+", "0", "+", fac(1, 0), font_size=38)
            for idx_, (i, j) in zip([0, 2, 4], [(3, 2), (2, 0), (1, -1)]):
                old[idx_].set_color(fac_color(i, j))
            new[1].set_color(POS)
            new[5].set_color(POS)
            new[3].set_color(DIM)
            VGroup(old, new).arrange(RIGHT, buff=0.3).to_edge(DOWN, buff=0.6)
            self.play(FadeIn(old), run_time=0.8)
            self.play(Write(new), run_time=1.2)
            self.play(Circumscribe(new[1:], color=POS), run_time=1.2)
        self.play(FadeOut(Group(*nb, *nw, old, new, g, title)), run_time=0.8)


class Theorem(Narrated):
    def construct(self):
        with self.voice("m1") as v:
            pt = Tex(r"\textbf{Proposition} [Chou--Yu]", font_size=38, color=PIPE)
            p1 = Tex(r"For $u, w$ coming from a trapezoid,", font_size=38)
            p2 = MathTex(r"\frac{\mathrm{wt}\big(u \xrightarrow[y_1]{\alpha_1} \cdots \xrightarrow[y_m]{\alpha_m} w\big)}{\prod_{i<j}(y_i - y_j)}",
                         r"\;\text{ is either } 0 \text{ or }\;", r"\prod (y_{>0} - y_{\le 0}).", font_size=42)
            box = VGroup(pt, p1, p2).arrange(DOWN, buff=0.35)
            fr = SurroundingRectangle(box, buff=0.35, color=PIPE, corner_radius=0.15)
            G = VGroup(box, fr).move_to(0.6 * UP)
            self.play(FadeIn(pt), Create(fr), run_time=1.0)
            self.play(Write(p1), run_time=1.2)
            self.play(Write(p2), run_time=2.6)
            v.until("s2")
            pos = Tex("positive!", font_size=44, color=POS).next_to(fr, DOWN, buff=0.4)
            self.play(p2[2].animate.set_color(POS), FadeIn(pos, shift=0.2 * UP), run_time=1.0)

        icons = [image("sword.png", 0.9), image("glasses.png", 0.65), image("gauntlet.png", 0.9)]
        with self.voice("m2") as v:
            self.play(FadeOut(VGroup(G, pos)), run_time=0.8)
            l0 = MathTex(r"j^w_\lambda(y)", font_size=44).move_to(5.3 * LEFT + 2.4 * UP)
            l1 = MathTex(r"= \sum_\delta \big[\,\text{trapezoid}\,\big] \times \big[\,\text{triangle}\,\big]", font_size=40)
            l2 = MathTex(r"= \sum_\delta \sum \frac{\mathrm{wt}\big(u \xrightarrow[y_m]{\alpha_m} \cdots \xrightarrow[y_1]{\alpha_1} w\big)}{\prod_{i<j}(y_i-y_j)} \times \big[\,\text{triangle}\,\big]", font_size=40)
            l3 = MathTex(r"= \sum_\delta \sum \frac{\mathrm{wt}\big(u \xrightarrow[y_1]{\alpha_1} \cdots \xrightarrow[y_m]{\alpha_m} w\big)}{\prod_{i<j}(y_i-y_j)} \times \big[\,\text{triangle}\,\big]", font_size=40)
            lines = VGroup(l1, l2, l3).arrange(DOWN, aligned_edge=LEFT, buff=0.45).move_to(0.7 * RIGHT + 0.2 * UP)
            l0.next_to(l1, LEFT, buff=0.25)
            for ic, ln in zip(icons, lines):
                ic.next_to(ln, LEFT, buff=0.35).shift(0.0 * UP)
                ic.set_x(-5.6)
            self.play(Write(l0), run_time=0.8)
            v.until("s1")
            self.play(FadeIn(icons[0]), Write(l1), run_time=1.8)
            v.until("s2")
            self.play(FadeIn(icons[1]), Write(l2), run_time=2.0)
            v.until("s3")
            self.play(FadeIn(icons[2]), Write(l3), run_time=2.0)
            v.until("s4")
            ep = Tex(r"Each term is positive!", font_size=46, color=POS).to_edge(DOWN, buff=0.5)
            self.play(Write(ep), Circumscribe(l3, color=POS), run_time=1.8)

        with self.voice("m3") as v:
            self.play(FadeOut(Group(l0, lines, *icons, ep)), run_time=0.8)
            tt = Tex(r"\textbf{Theorem} [Chou--Yu]", font_size=40, color=PIPE)
            t1 = Tex(r"A positive combinatorial formula for every $j^w_\lambda(y)$,", font_size=40)
            t2 = Tex(r"proving $j^w_\lambda(y) \in \mathbb{Z}_{\ge 0}[\,y_i - y_j : i \prec j\,]$ combinatorially.", font_size=40)
            box = VGroup(tt, t1, t2).arrange(DOWN, buff=0.3)
            fr = SurroundingRectangle(box, buff=0.35, color=PIPE, corner_radius=0.15)
            G = VGroup(box, fr).move_to(0.8 * UP)
            self.play(FadeIn(tt), Create(fr), Write(t1), run_time=2.0)
            self.play(Write(t2), run_time=2.0)
            v.until("s1")
            extra = Tex(r"Also works for $w \in S_{\mathbb{Z}}$ $\;\Rightarrow\;$ a combinatorial proof of Anderson's positivity.",
                        font_size=34, color=LABEL).next_to(fr, DOWN, buff=0.6)
            self.play(FadeIn(extra, shift=0.2 * UP), run_time=1.2)
        self.play(FadeOut(VGroup(G, extra)), run_time=0.8)


class Outro(Narrated):
    def construct(self):
        with self.voice("o1") as v:
            t = Tex("What's next?", font_size=48, color=PIPE).to_edge(UP, buff=0.8)
            items = VGroup(
                Tex(r"$\bullet$ A $K$-theory version", font_size=40),
                Tex(r"$\bullet$ Triple Edelman--Greene coefficients $j^w_\lambda(y;z)$", font_size=40),
                Tex(r"$\bullet$ Schubert structure constants?", font_size=40),
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.5).move_to(0.2 * DOWN)
            self.play(Write(t), run_time=1.0)
            v.until("s1")
            self.play(FadeIn(items[0], shift=0.2 * RIGHT), run_time=0.8)
            v.until("s2")
            self.play(FadeIn(items[1], shift=0.2 * RIGHT), run_time=0.8)
            v.until("s3")
            self.play(FadeIn(items[2], shift=0.2 * RIGHT), run_time=0.8)

        with self.voice("o2") as v:
            self.play(FadeOut(VGroup(t, items)), run_time=0.8)
            t1 = Tex(r"A positive combinatorial formula for the", font_size=44)
            t2 = Tex(r"double Edelman--Greene coefficients", font_size=58, color=PIPE)
            au = Tex(r"Jack Chou \quad and \quad Tianyi Yu", font_size=38, color=LABEL)
            ax = Tex(r"arXiv:2512.12185", font_size=34, color=YELLOW)
            card = VGroup(t1, t2, au, ax).arrange(DOWN, buff=0.32).move_to(0.9 * UP)
            icons = Group(image("sword.png", 1.1), image("glasses.png", 0.85), image("gauntlet.png", 1.1)).arrange(RIGHT, buff=1.0)
            icons.next_to(card, DOWN, buff=0.7)
            self.play(FadeIn(card), run_time=1.2)
            self.play(LaggedStart(*[FadeIn(i, shift=0.2 * UP) for i in icons], lag_ratio=0.3), run_time=1.5)
            v.until("s1")
            thanks = Tex("Thanks for watching!", font_size=44).to_edge(DOWN, buff=0.5)
            self.play(Write(thanks), run_time=1.2)
        self.wait(2.5)
        self.play(FadeOut(Group(card, icons, thanks)), run_time=1.5)
        self.wait(0.5)
