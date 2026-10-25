"""Part B: step 1 (the horizon cut) and step 2 (flipping the top piece)."""

from common import *

W = dict(zip(range(-1, 5), D["w"]))
Wf = lambda i: W.get(i, i)
WIN = list(range(-3, 5))
P1, P2 = D["pieces"]


def fade_upper_left(B, k=-1, rate=0.3, floor=0.15):
    """Fade cells and pipes towards the upper left, where nothing happens."""
    for (i, j), sq in B.grid.squares.items():
        d = max(0, max(k - i, k - j))
        sq.set_stroke(opacity=max(floor, 1 - rate * d))
    for key, p in B.pipes.items():
        d = max(0, k - key)
        p.set_stroke(opacity=max(floor + 0.05, 1 - rate * d))
    return B


def align_to(piece, ref, key):
    piece.shift(ref.grid.squares[key].get_center() - piece.grid.squares[key].get_center())
    return piece


def one_line(moved, lo, hi):
    m = dict(moved)
    return [m.get(i, i) for i in range(lo, hi + 1)]


def perm_tex(name, vals, size=40):
    return MathTex(name + r" = [\," + r",\ ".join(map(str, vals)) + r"\,]", font_size=size)


def cross_section(phi, cols, x_of, y, size=30, color=HL):
    """The labels of the pipes crossing a horizontal line, one per column."""
    phi = dict((c, l) for c, l in phi)
    g = VGroup()
    for c in cols:
        if c in phi:
            t = MathTex(str(phi[c]), font_size=size, color=color)
        else:
            t = MathTex(r"\cdot", font_size=size, color=DIM)
        g.add(t.move_to(np.array([x_of(c), y, 0])))
    return g


def fill_positive(phi, cols):
    """The empty columns of a horizon section, each with the positive label it gets
    (1, 2, 3, ... from left to right)."""
    taken = {c for c, _ in phi}
    return {c: k + 1 for k, c in enumerate(c for c in cols if c not in taken)}


def one_line_row(name, vals, size=34, dx=0.66, header=True):
    """name = [ ..., v_-3, ..., v_4, ... ] with the positions -3..4 written above."""
    head = MathTex(name + r" = [\ \cdots", font_size=size)
    cells = VGroup(*[MathTex(str(v), font_size=size) for v in vals])
    for k, c in enumerate(cells):
        c.move_to(np.array([k * dx, 0, 0]))
    head.next_to(cells, LEFT, buff=0.25)
    tail = MathTex(r"\cdots\ ]", font_size=size).next_to(cells, RIGHT, buff=0.25)
    g = VGroup(head, cells, tail)
    if header:
        top = cells.get_top()[1] + 0.28
        g.add(VGroup(*[MathTex(str(p), font_size=size - 14, color=DIM).move_to(np.array([c.get_x(), top, 0]))
                       for p, c in zip(WIN, cells)]))
    g.cells = cells
    return g


class HorizonCut(Narrated):
    def construct(self):
        title = heading(r"Step 1: the horizon cut")
        cell = 0.52
        B = BPD(D["opening"]["tiles"], WIN, WIN, cell=cell, stroke=5)
        B.move_to(3.6 * LEFT + 0.35 * UP)
        fade_upper_left(B)
        rl = VGroup(*[MathTex(str(r), font_size=22, color=LABEL).next_to(B.grid.squares[(r, 4)], RIGHT, buff=0.15)
                      for r in WIN])
        ct = VGroup(*[MathTex(str(c), font_size=20, color=DIM).next_to(B.grid.squares[(-3, c)], UP, buff=0.1)
                      for c in WIN])
        y_cut = B.grid.squares[(0, -3)].get_bottom()[1]
        x0, x1 = B.grid.get_left()[0] - 0.35, B.grid.get_right()[0] + 0.55
        hor = Line(np.array([x0, y_cut, 0]), np.array([x1, y_cut, 0]), color=CUT, stroke_width=4)
        with self.say("Now for step one. Cut each bumpless pipe dream of w along the horizon: the line between row "
                      "zero and row one.") as c:
            self.play(FadeIn(title), FadeIn(B), FadeIn(rl), FadeIn(ct), run_time=1.2)
            self.play(Create(hor), run_time=1.0)

        # pipes 0 and -1 are the ones that matter near the cut
        p0, pm1 = B.pipes[Wf(0)], B.pipes[Wf(-1)]
        with self.say("Pipes zero and negative one cross it in columns zero and one. Pipes negative two, negative "
                      "three, and so on, go straight down their own columns.") as c:
            for p in (p0, pm1):
                self.play(p.animate.set_stroke(color=HL, width=7), run_time=0.8)
            self.play(Indicate(B.pipes[-2], color=HL, scale_factor=1.0), Indicate(B.pipes[-3], color=HL, scale_factor=1.0), run_time=1.2)

        # split into the two pieces
        top = BPD(D["opening"]["tiles"][:4], WIN[:4], WIN, cell=cell, stroke=5, entries=[-3, -2, 0, 1])
        bot = BPD(D["opening"]["tiles"][4:], WIN[4:], WIN, cell=cell, stroke=5)
        align_to(top, B, (-3, -3))
        align_to(bot, B, (1, -3))
        fade_upper_left(top)
        fade_upper_left(bot)
        for p in (top.pipes[0], top.pipes[1], bot.pipes[Wf(0)], bot.pipes[Wf(-1)]):
            p.set_stroke(color=HL, width=7)
        self.remove(B)
        self.add(top, bot)
        rl_top, rl_bot = VGroup(*rl[:4]), VGroup(*rl[4:])
        gap = 0.45
        x_of = lambda col: B.grid.squares[(0, col)].get_center()[0]
        sec = cross_section(P1["phi"], WIN, x_of, y_cut, size=28)
        with self.say("Cut there, and every bumpless pipe dream falls apart into a top piece and a bottom piece.") as c:
            self.play(VGroup(top, rl_top, ct).animate.shift(gap * UP), VGroup(bot, rl_bot).animate.shift(gap * DOWN),
                      FadeOut(hor), run_time=1.4)
            self.play(LaggedStart(*[FadeIn(s, shift=0.1 * DOWN) for s in sec], lag_ratio=0.08), run_time=1.2)

        fill = fill_positive(P1["phi"], WIN)
        pos_labels = {c: MathTex(str(k), font_size=28, color=PIPE).move_to(sec[WIN.index(c)]) for c, k in fill.items()}
        with self.say("The cut defines a permutation, sigma. Each pipe with label at most zero goes to the column "
                      "where it crosses.") as c:
            self.play(Indicate(sec[WIN.index(1)], color=WHITE), Indicate(sec[WIN.index(0)], color=WHITE), run_time=1.4)
        with self.say("The positive numbers one, two, three, and so on fill the empty columns, in order.") as c:
            self.play(LaggedStart(*[ReplacementTransform(sec[WIN.index(col)], pos_labels[col]) for col in sorted(fill)],
                                  lag_ratio=0.35), run_time=2.0)
        for col, lab in pos_labels.items():
            sec.submobjects[WIN.index(col)] = lab
        s1vals = one_line(P1["sigma_moved"], WIN[0], WIN[-1])
        G1 = one_line_row(r"\sigma_1", s1vals, size=34).move_to(np.array([3.1, 2.0, 0]))
        with self.say("Reading off where each pipe goes, sigma one swaps negative one and one, and fixes everything "
                      "else. Here is its one-line notation.", extra=0.5) as c:
            self.play(Indicate(sec[WIN.index(1)], color=WHITE, scale_factor=1.5),
                      Indicate(sec[WIN.index(-1)], color=WHITE, scale_factor=1.5), run_time=1.2)
            self.play(FadeIn(G1[3]), Write(G1[0]), Write(G1[2]), TransformFromCopy(sec, G1[1]), run_time=1.8)
        sm = MathTex(r"\sigma_1 \in S_- :\ \text{all descents} \le 0", font_size=32).next_to(G1, DOWN, buff=0.4)
        with self.say("All its descents are at most zero. We write S minus for the set of such permutations.") as c:
            self.play(FadeIn(sm, shift=0.1 * UP), run_time=1.0)

        lt = MathTex(r"\text{top pieces: }", r"\overleftarrow{\mathfrak S}_{\sigma}", font_size=34)
        lb = MathTex(r"\text{bottom pieces: }", r"\mathfrak S^{\downarrow}_{\sigma, w}", font_size=34)
        lt.next_to(G1, DOWN, buff=0.5).align_to(G1, LEFT)
        lb.move_to(np.array([3.0, bot.get_center()[1], 0])).align_to(G1, LEFT)
        with self.say("The top pieces are exactly the bumpless pipe dreams of sigma, so together they give the back "
                      "stable Schubert function of sigma.") as c:
            self.play(FadeOut(sm), FadeIn(lt[0]), run_time=0.7)
            self.play(Write(lt[1]), Indicate(top.grid, color=PIPE, scale_factor=1.0), run_time=1.3)
        with self.say("The bottom pieces run from sigma at the top to w at the bottom. Together they give the lower "
                      "Schubert polynomial of sigma and w.") as c:
            self.play(FadeIn(lb[0]), run_time=0.7)
            self.play(Write(lb[1]), Indicate(bot.grid, color=PIPE, scale_factor=1.0), run_time=1.3)

        f = MathTex(r"\overleftarrow{\mathfrak S}_w", "=", r"\sum_{\sigma \in S_-}", r"\overleftarrow{\mathfrak S}_{\sigma}",
                    r"\cdot", r"\mathfrak S^{\downarrow}_{\sigma, w}", font_size=44)
        f.move_to(np.array([3.4, 0.35, 0]))
        with self.say("Every bumpless pipe dream of w splits in exactly one way. So the back stable Schubert function"
                      " of w is a sum over sigma, of top times bottom.") as c:
            self.play(FadeOut(VGroup(G1)), lt.animate.shift(0.8 * UP), lb.animate.shift(0.4 * DOWN), run_time=0.8)
            self.play(Write(f[:3]), run_time=1.0)
            self.play(TransformFromCopy(lt[1], f[3]), FadeIn(f[4]), TransformFromCopy(lb[1], f[5]), run_time=1.4)
            fr = SurroundingRectangle(f, color=PIPE, buff=0.18, corner_radius=0.1)
            self.play(Create(fr), run_time=0.8)

        jf = MathTex(r"j^w_\lambda", "=", r"\sum_{\sigma}", r"j^{\sigma}_\lambda", r"\cdot", r"\mathfrak S^{\downarrow}_{\sigma, w}(y;y)",
                     font_size=40).next_to(f, DOWN, buff=0.75)
        with self.say("The bottom piece only involves x one, x two, and so on, so it's part of the coefficient. The "
                      "top piece still needs to be expanded in double Schur functions.", extra=1.0) as c:
            self.play(FadeOut(VGroup(lt, lb)), run_time=0.5)
            self.play(Indicate(f[5], color=HL), run_time=1.0)
            self.play(Write(jf), run_time=1.8)
            self.play(Indicate(jf[3], color=HL), run_time=1.0)
        self.play(FadeOut(VGroup(top, bot, rl, ct, sec, f, fr)), jf.animate.to_edge(UP, buff=1.0), run_time=1.0)

        # ---- all horizon sections of w
        cs = 0.44
        order = [2, 3, 0, 1, 4]                      # sigma_1, sigma_2 first
        names = [r"\sigma_1", r"\sigma_2", r"\sigma_3", r"\sigma_4", r"\sigma_5"]
        strips = VGroup()
        y0 = 1.05
        hdr = VGroup(*[MathTex(str(col), font_size=20, color=DIM).move_to(np.array([-5.2 + cs * k, y0 + 0.42, 0]))
                       for k, col in enumerate(WIN)])
        for r, k in enumerate(order):
            s = D["sigmas"][k]
            yy = y0 - r * 0.62
            boxes = VGroup(*[Square(cs, stroke_color=GRIDC, stroke_width=1.5).move_to(np.array([-5.2 + cs * q, yy, 0]))
                             for q in range(len(WIN))])
            x_of_col = lambda col: -5.2 + cs * WIN.index(col)
            labs = cross_section(s["phi"], WIN, x_of_col, yy, size=24)
            for col, k_ in fill_positive(s["phi"], WIN).items():
                labs.submobjects[WIN.index(col)] = MathTex(str(k_), font_size=24, color=PIPE).move_to(
                    np.array([x_of_col(col), yy, 0]))
            nm = MathTex(names[r], font_size=32).next_to(boxes, LEFT, buff=0.3)
            ol = MathTex(r"= [\,\cdots,\ " + r",\ ".join(map(str, one_line(s["moved"], WIN[0], WIN[-1])))
                         + r",\ \cdots\,]", font_size=28)
            ol.next_to(boxes, RIGHT, buff=0.35)
            pos = VGroup()
            strips.add(VGroup(nm, boxes, labs, ol, pos))
        ol_hdr = Tex(r"one-line notation on positions $-3, \ldots, 4$", font_size=22, color=DIM)
        ol_hdr.next_to(strips[0][3], UP, buff=0.22).align_to(strips[0][3], LEFT)
        hdr.add(ol_hdr)
        with self.say("For our w, exactly five permutations sigma show up as horizon cuts.") as c:
            self.play(FadeIn(hdr), run_time=0.5)
            self.play(LaggedStart(*[FadeIn(s, shift=0.15 * RIGHT) for s in strips], lag_ratio=0.25), run_time=2.4)
        with self.say("For lambda equal to two one, only sigma one and sigma two matter. The top pieces of the other "
                      "three contain no s two one, so their coefficient is zero.") as c:
            zero = VGroup(*[MathTex(r"j^{\sigma}_{21} = 0", font_size=28, color=DIM).next_to(strips[r], RIGHT, buff=0.4)
                            for r in (2, 3, 4)])
            self.play(*[strips[r].animate.fade(0.7) for r in (2, 3, 4)], FadeIn(zero), run_time=1.2)
            self.play(*[Indicate(strips[r][0], color=HL) for r in (0, 1)], run_time=1.0)
        self.play(FadeOut(VGroup(jf, hdr, strips, zero)), FadeOut(title), run_time=0.8)


def flip_bpd(F, cell=0.44):
    fa, fn = F["window"]
    rows, cols = list(range(1, fn + 1)), list(range(fa, fn + 1))
    B = BPD(F["tiles"], rows, cols, cell=cell, stroke=4.5)
    return B, rows, cols


class Flip(Narrated):
    def construct(self):
        title = heading(r"Step 2: flip the top piece")
        rows, cols = list(range(-3, 1)), WIN
        phi = [c for c, _ in P1["phi"]]
        U = BPD(P1["upper_example"], rows, cols, cell=0.52, stroke=5, entries=phi)
        U.move_to(3.4 * LEFT + 0.9 * UP)
        fade_upper_left(U)
        y_cut = U.grid.squares[(0, -3)].get_bottom()[1]
        hor = Line(np.array([U.grid.get_left()[0] - 0.3, y_cut, 0]), np.array([U.grid.get_right()[0] + 0.3, y_cut, 0]),
                   color=CUT, stroke_width=4)
        sec = cross_section(P1["phi"], cols, lambda col: U.grid.squares[(0, col)].get_center()[0], y_cut - 0.3, size=26)
        cross = Circle(radius=0.3, color=HL, stroke_width=4).move_to(U.grid.squares[(0, 1)])
        need = MathTex(r"\overleftarrow{\mathfrak S}_{\sigma_1}", r"=", r"\cdots", r"+", r"j^{\sigma_1}_{21}", r"\,s_{21}", r"+", r"\cdots",
                       font_size=42).move_to(np.array([3.2, 1.0, 0]))
        need[4].set_color(HL)
        with self.say("On to step two. Here's a top piece of sigma one. Its pipes can cross, so it mixes many double "
                      "Schur functions together.") as c:
            self.play(FadeIn(title), FadeIn(U), Create(hor), FadeIn(sec), run_time=1.4)
            self.play(Create(cross), run_time=0.8)
        with self.say("We need the coefficient of s two one in it.") as c:
            self.play(Write(need), run_time=1.6)

        # the reflection i -> 1 - i of the integer line: sigma_1 above, its image below
        xs = lambda i: 1.15 * (i - 0.5)
        yt, yb = 1.75, -0.35
        top_n = {i: MathTex(str(i), font_size=38).move_to(np.array([xs(i), yt, 0])) for i in range(-2, 4)}
        bot_n = {i: MathTex(str(i), font_size=38).move_to(np.array([xs(i), yb, 0])) for i in range(-2, 4)}
        mirror = DashedLine(np.array([0, yt + 0.9, 0]), np.array([0, yb - 0.3, 0]), color=GREY_D)
        half = MathTex(r"\tfrac12", font_size=26, color=GREY_B).next_to(mirror, UP, buff=0.08)

        def swap_arrows(a, b, y, color):
            pa, pb = np.array([xs(a), y + 0.3, 0]), np.array([xs(b), y + 0.3, 0])
            return VGroup(CurvedArrow(pa, pb, angle=-TAU / 5, color=color, stroke_width=4, tip_length=0.16),
                          CurvedArrow(pb, pa, angle=-TAU / 5, color=color, stroke_width=4, tip_length=0.16))
        arr1 = swap_arrows(-1, 1, yt, PIPE)
        lab1 = MathTex(r"\sigma_1", font_size=34, color=PIPE).next_to(VGroup(*top_n.values()), LEFT, buff=0.5)
        with self.say("Lam, Lee and Shimozono found a symmetry: reflect the integers, sending i to one minus i.") as c:
            self.play(FadeOut(VGroup(U, hor, sec, cross)), need.animate.scale(0.8).to_corner(UR, buff=0.5), run_time=0.9)
            self.play(LaggedStart(*[FadeIn(m) for m in top_n.values()], lag_ratio=0.1), Create(mirror), FadeIn(half), run_time=1.2)
            self.play(Create(arr1), FadeIn(lab1), run_time=1.0)
            self.play(*[TransformFromCopy(top_n[i], bot_n[1 - i], path_arc=-PI / 2.5) for i in top_n if -2 <= 1 - i <= 3],
                      run_time=2.0)
        arr2 = swap_arrows(0, 2, yb, HL)
        lab2 = MathTex(r"\neg\sigma_1", font_size=34, color=HL).next_to(VGroup(*bot_n.values()), LEFT, buff=0.5)
        with self.say("This turns sigma into not sigma, where not sigma of i is one minus sigma of one minus i. Here,"
                      " sigma one swaps negative one and one, so not sigma one swaps two and zero.") as c:
            self.play(TransformFromCopy(arr1, arr2, path_arc=-PI / 2), TransformFromCopy(lab1, lab2), run_time=1.8)
        nums = VGroup(*top_n.values(), *bot_n.values())
        arr1 = VGroup(arr1, arr2)
        lab1 = VGroup(lab1, lab2)
        n1 = MathTex(r"\neg\sigma_1 = [\,2,\ 1,\ 0\,]", font_size=36).move_to(np.array([-3.6, -1.45, 0]))
        n1s = Tex(r"(positions $0, 1, 2$): descents at $0, 1 \ge 0$", font_size=26, color=LABEL).next_to(n1, DOWN, buff=0.15)
        with self.say("Now its descents are all at least zero.") as c:
            self.play(FadeIn(n1), FadeIn(n1s), run_time=1.0)
        # conjugate partition and omega_1
        s0 = 0.36
        yd = VGroup(*[Square(s0, stroke_color=WHITE, stroke_width=2, fill_color=HL, fill_opacity=0.45).move_to(
            np.array([(c_ + 0.5) * s0, -(r_ + 0.5) * s0, 0])) for r_, n_ in enumerate([2, 1]) for c_ in range(n_)])
        yd.move_to(np.array([1.4, -1.45, 0]))
        lamc = MathTex(r"\lambda' = \lambda = (2,1)", font_size=32).next_to(yd, RIGHT, buff=0.3)
        om = MathTex(r"\omega_1 :\ y_i \mapsto -y_{1-i}", font_size=34).move_to(np.array([3.3, -2.0, 0]))
        with self.say("Partitions get transposed, so lambda goes to lambda prime, and our two one is its own "
                      "transpose. The variables change by omega one, which sends y i to negative y sub one minus i.") as c:
            self.play(FadeIn(yd), run_time=0.6)
            self.play(Rotate(yd, PI, axis=np.array([1, -1, 0]), about_point=yd[0].get_corner(UL)), run_time=1.2)
            self.play(FadeIn(lamc), run_time=0.6)
            self.play(Write(om), run_time=1.0)
        sym = MathTex(r"j^{\sigma}_{\lambda}", "=", r"\omega_1\big(", r"j^{\neg\sigma}_{\lambda'}", r"\big)", font_size=46)
        sym.move_to(np.array([0, -1.6, 0]))
        with self.say("So the coefficient we want equals a coefficient for not sigma, after this substitution.") as c:
            self.play(FadeOut(VGroup(n1, n1s, yd, lamc)), om.animate.move_to(np.array([3.6, -2.15, 0])).scale(0.85), run_time=0.7)
            self.play(Write(sym), run_time=1.4)
        self.play(FadeOut(VGroup(nums, mirror, half, arr1, lab1)), sym.animate.move_to(np.array([-3.4, 2.0, 0])).scale(0.85),
                  om.animate.move_to(np.array([-3.4, 1.2, 0])), run_time=0.9)

        # why the flip helps
        lem = MathTex(r"\mathrm{Des}(v) \subset \mathbb Z_{\ge 0}", r"\ \Longrightarrow\ ", r"j^{v}_{\mu} = \mathfrak S^{\downarrow}_{w_\mu, v}(y;y)",
                      font_size=40).move_to(np.array([1.6, 0.1, 0]))
        with self.say("Why does this help? When all descents are at least zero, the pipes in the top pieces can never"
                      " cross.") as c:
            self.play(Write(lem[0]), run_time=1.2)
        with self.say("So each top piece is just a double Schur function, s mu, and its coefficient is a single "
                      "bottom piece.") as c:
            self.play(Write(lem[1:]), run_time=1.6)
        cor = MathTex(r"j^w_\lambda(y)", "=", r"\sum_{\sigma\in S_-}", r"\omega_1\Big(\mathfrak S^{\downarrow}_{w_{\lambda'}, \neg\sigma}(y;y)\Big)",
                      r"\cdot", r"\mathfrak S^{\downarrow}_{\sigma, w}(y;y)", font_size=42)
        cor.move_to(np.array([0, -1.45, 0]))
        cfr = SurroundingRectangle(cor, color=PIPE, buff=0.2, corner_radius=0.1)
        with self.say("Putting it together: both factors are bottom pieces, that is, lower Schubert polynomials.") as c:
            self.play(Write(cor), run_time=2.2)
            self.play(Create(cfr), run_time=0.8)
        self.play(FadeOut(VGroup(lem, sym, om, need)), VGroup(cor, cfr).animate.scale(0.8).to_edge(UP, buff=0.95), run_time=1.0)

        # the two flipped problems
        out = []
        for k, (P, nm) in enumerate([(P1, r"\sigma_1"), (P2, r"\sigma_2")]):
            F = P["flip"][0]
            Bf, rws, cls = flip_bpd(F, cell=0.42)
            Bf.move_to(np.array([-3.4 + 6.8 * k, -0.15, 0]))
            ent = VGroup(*[MathTex(str(l), font_size=20, color=HL).next_to(Bf.grid.squares[(1, col)], UP, buff=0.08)
                           for col, l in D["schur"]["phi"] if col in cls])
            top = MathTex(r"w_{21}", font_size=26, color=HL).next_to(Bf.grid, UP, buff=0.42)
            botl = MathTex(r"\neg" + nm, font_size=26, color=PIPE).next_to(Bf.grid, DOWN, buff=0.15)
            dts = dots_on(Bf.grid.squares, F["blanks"])
            if F["blanks"]:
                (i, j), = F["blanks"]
                (p, q), = F["flipped"]
                wt = MathTex(fac(i, j), r"\ \xrightarrow{\ \omega_1\ }\ ", fac(p, q), font_size=34)
                wt[0].set_color(tcolor(i, j))
                wt[2].set_color(tcolor(p, q))
            else:
                wt = MathTex(r"\text{no blank tiles} \ \Rightarrow\ 1", font_size=32)
            wt.next_to(botl, DOWN, buff=0.3)
            out.append((Bf, ent, top, botl, dts, wt))
        caps = ["For sigma one, there's a single bumpless pipe dream from w two one at the top to not sigma one at "
                "the bottom, with no blank tiles. So its top factor is one.",
                "For sigma two, there's again one bumpless pipe dream, with a single blank tile, in row one and "
                "column negative one. That gives y one minus y negative one, which omega one turns into y two minus y"
                " zero."]
        for k, (Bf, ent, top, botl, dts, wt) in enumerate(out):
            with self.say(caps[k], extra=0.5) as c:
                self.play(Create(Bf.grid), FadeIn(ent), FadeIn(top), FadeIn(botl), run_time=1.0)
                self.play(LaggedStart(*[Create(p) for p in Bf.pipe_group], lag_ratio=0.1), run_time=1.6)
                if len(dts):
                    self.play(FadeIn(dts, scale=0.5), run_time=0.5)
                    self.play(FadeIn(wt[0]), run_time=0.6)
                    self.play(Write(wt[1]), TransformFromCopy(wt[0], wt[2]), run_time=1.2)
                else:
                    self.play(FadeIn(wt), run_time=0.8)

        # omega_1 and the types
        ex = VGroup()
        for (i, j) in [(1, 3), (1, -1)]:
            p, q = 1 - j, 1 - i
            m = MathTex(fac(i, j), r"\ \mapsto\ ", fac(p, q), font_size=34)
            m[0].set_color(tcolor(i, j))
            m[2].set_color(tcolor(p, q))
            tl = Tex(f"type {ftype(i, j)} $\\mapsto$ type {ftype(p, q)}", font_size=28, color=LABEL)
            ex.add(VGroup(m, tl).arrange(RIGHT, buff=0.4))
        ex.arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to(np.array([0, -1.95, 0]))
        with self.say("In general, omega one turns type one forms into type two, and keeps type three. So top factors"
                      " only ever use types two and three.") as c:
            self.play(*[FadeOut(o[5]) for o in out], run_time=0.5)
            self.play(LaggedStart(*[FadeIn(e, shift=0.1 * UP) for e in ex], lag_ratio=0.4), run_time=1.6)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.8)

        # the direct formula: this is where the four terms came from
        title2 = heading(r"Where we stand")

        def row(name, topf, bot, y):
            n = MathTex(name, font_size=40).move_to(np.array([-5.4, y, 0]))
            topf.move_to(np.array([-3.6, y, 0]))
            d = MathTex(r"\cdot", font_size=40).move_to(np.array([-2.5, y, 0]))
            bot.next_to(d, RIGHT, buff=0.3)
            return VGroup(n, topf, d, bot)
        bot1 = MathTex(r"\big[", fac(3, 2), "+", fac(2, 0), "+", fac(1, -1), r"\big]", font_size=40)
        bot1[1].set_color(NEG)
        bot1[3].set_color(T3)
        bot1[5].set_color(T3)
        top2 = MathTex(fac(2, 0), font_size=40, color=T3)
        rows_ = VGroup(row(r"\sigma_1:", MathTex("1", font_size=40), bot1, 0.9),
                       row(r"\sigma_2:", top2, MathTex("1", font_size=40), -0.2))
        hdr = VGroup(Tex("top factor", font_size=26, color=LABEL).move_to(np.array([-3.6, 1.75, 0])),
                     Tex(r"bottom piece of $\sigma$", font_size=26, color=LABEL).next_to(rows_[0][3], UP, buff=0.5))
        hdr[1].set_y(1.75)
        with self.say("If we use the weights of the bottom pieces directly, we get exactly the four terms from the "
                      "start.") as c:
            self.play(FadeIn(title2), FadeIn(hdr), run_time=0.6)
            self.play(Write(rows_[0]), run_time=1.6)
            self.play(Write(rows_[1]), run_time=1.0)
        msg = Tex(r"Left to do: rewrite the bottom piece of $\sigma_1$ positively.", font_size=36, color=HL).move_to(1.5 * DOWN)
        with self.say("The culprit is y three minus y two, in the bottom piece of sigma one. The next three steps "
                      "rewrite bottom pieces positively.") as c:
            self.play(Circumscribe(bot1[1], color=NEG), run_time=1.2)
            self.play(FadeIn(msg), run_time=0.8)
        self.play(FadeOut(VGroup(title2, rows_, hdr, msg)), run_time=0.8)
