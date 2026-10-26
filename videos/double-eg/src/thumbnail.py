"""The thumbnail: a trapezoid bumpless pipe dream, with the paper's title above the diagonal cut.

    manim -s -r 1920,1080 thumbnail.py Thumbnail      # then copy the PNG to ../thumbnail.png

The trapezoid is the part on and below the diagonal of the bottom piece (rows 1..6,
columns -2..6) of a bumpless pipe dream of w = [5, 4, -1, 0, 6, -2, 3, 1, 2] on
positions -2..6; every diagonal tile carries a pipe, so it cuts straight.
"""

from common import *

ROWS, COLS = list(range(1, 7)), list(range(-2, 7))
TILES = ["OOrjr-++-", "OrjrjO||r", "r+-+--+++", "||rjOr+++", "|||r-++++", "||||r++++"]


def zone(i, j):
    if j == i:
        return DIM
    return T3 if j <= 0 else NEG


class Thumbnail(Scene):
    def construct(self):
        cell = 1.15
        T = cut_drawing(TILES, ROWS, COLS, cell, "lower", stroke=14)
        for (i, j), sq in T.squares.items():
            sq.set_fill(zone(i, j), opacity=0.24).set_stroke(GRIDC, width=2.5)
        for sh in T.halves.values():
            sh.set_fill(DIM, opacity=0.24).set_stroke(GRIDC, width=2.5)
        glow = T.pipes.copy().set_stroke(PIPE, width=30, opacity=0.12)
        T.shift(np.array([-6.75, -3.65, 0]) - T.get_corner(DL))
        glow.move_to(T.pipes)
        dots = VGroup(*[Dot(T.cells[(i, j)].get_center(), radius=0.28 * cell, color=HL)
                        for (i, j) in T.cells if TILES[ROWS.index(i)][COLS.index(j)] == "O"])
        cut = diagonal_line(T.cells, 6, color=WHITE, width=7, overhang=0.35)

        # the title fills the empty triangle above the cut, each line starting just past it
        lines = [Tex(r"A ", r"positive", r" combinatorial", font_size=76), Tex(r"formula for the double", font_size=76),
                 Tex(r"Edelman--Greene", font_size=76), Tex(r"coefficients", font_size=76)]
        lines[0][1].set_color(POS)
        corner = T.cells[(1, 1)].get_corner(UL)            # the cut is the line x + y = corner_x + corner_y
        top = 3.55
        for k, t in enumerate(lines):
            t.align_to(np.array([0, top - 1.03 * k, 0]), UP)
            yb = t.get_bottom()[1]
            t.align_to(np.array([corner[0] + corner[1] - yb + 0.45, 0, 0]), LEFT)
        self.add(glow, T, dots, cut, *lines)
