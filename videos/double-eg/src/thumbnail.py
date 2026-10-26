"""The thumbnail: a trapezoid bumpless pipe dream and the title.

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
        cell = 0.72
        T = cut_drawing(TILES, ROWS, COLS, cell, "lower", stroke=11)
        for (i, j), sq in T.squares.items():
            sq.set_fill(zone(i, j), opacity=0.24).set_stroke(GRIDC, width=2)
        for sh in T.halves.values():
            sh.set_fill(DIM, opacity=0.24).set_stroke(GRIDC, width=2)
        glow = T.pipes.copy().set_stroke(PIPE, width=22, opacity=0.12)
        T.move_to(np.array([-3.55, -0.45, 0]))
        glow.move_to(T.pipes)
        dots = VGroup(*[Dot(T.cells[(i, j)].get_center(), radius=0.15 * cell * 2, color=HL)
                        for (i, j) in T.cells if TILES[ROWS.index(i)][COLS.index(j)] == "O"])
        cut = diagonal_line(T.cells, 6, color=WHITE, width=6, overhang=0.3)

        title = VGroup(Tex("Double", font_size=84), Tex("Edelman--Greene", font_size=84),
                       Tex("coefficients", font_size=84)).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        sub = Tex("a positive formula", font_size=66, color=POS)
        text = VGroup(title, sub).arrange(DOWN, aligned_edge=LEFT, buff=0.45)
        text.move_to(np.array([0, 0.55, 0])).align_to(np.array([0.55, 0, 0]), LEFT)
        self.add(glow, T, dots, cut, text)
