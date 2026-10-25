"""Shared drawing helpers and the narration-synced Scene base class."""

import json
import os
from contextlib import contextmanager

import numpy as np
from manim import *

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "diagrams.json")))
TIMING = json.load(open(os.path.join(HERE, "audio", "timing.json")))
ASSETS = os.path.join(HERE, "assets")

# ------------------------------------------------------------------ palette
PIPE = "#58C4DD"
POS = "#83C167"
NEG = "#FC6255"
HL = "#FFD84D"
GRIDC = "#4A4A4A"
DIM = "#8A8A8A"
LABEL = "#B9B9B9"
CHAIN = "#E07A5F"
PIPE_COLORS = ["#58C4DD", "#FF8C69", "#9CDCEB", "#C9A0DC", "#83C167", "#F4D35E", "#F28EB0"]

config.background_color = "#0B0B0D"


def prec_key(i):
    """The order 1 < 2 < 3 < ... < -2 < -1 < 0."""
    return (0, i) if i > 0 else (1, i)


def positive(i, j):
    return prec_key(i) < prec_key(j)


def idx(i):
    return f"{{{i}}}" if i >= 0 else f"{{-{-i}}}"


def fac(i, j, a="y", b="y"):
    return rf"({a}_{idx(i)}-{b}_{idx(j)})"


def fac_color(i, j):
    if i == j:
        return DIM
    return POS if positive(i, j) else NEG


# ------------------------------------------------------- narrated scenes
class Narrated(Scene):
    """`with self.voice("key") as v:` plays audio <key>.wav and, on exit, waits
    until it is over.  Inside, `v.until("marker")` or `v.until(seconds)` waits
    until that moment of the clip, and `v.left()` is the time remaining."""

    def voice(self, key, pad=0.35):
        scene = self
        info = TIMING[key]

        class Tracker:
            duration = info["duration"]

            def __init__(self):
                self.start = scene.renderer.time

            def now(self):
                return scene.renderer.time - self.start

            def at(self, what):
                if isinstance(what, str):
                    if what.startswith("s") and what[1:].isdigit():
                        return info["sentences"][int(what[1:])]
                    return info["markers"][what]
                return what

            def until(self, what, min_wait=0.0):
                t = self.at(what) - self.now()
                if t > 1e-3:
                    scene.wait(t)
                elif min_wait:
                    scene.wait(min_wait)

            def left(self, what=None):
                end = self.duration if what is None else self.at(what)
                return max(0.2, end - self.now())

        @contextmanager
        def cm():
            self.add_sound(os.path.join(HERE, "audio", f"{key}.wav"))
            log = os.environ.get("NARRATION_LOG")
            if log:  # record when each clip starts, for subtitles and chapters
                with open(log, "a") as f:
                    f.write(json.dumps({"scene": type(self).__name__, "key": key,
                                        "t": round(self.renderer.time, 3)}) + "\n")
            tr = Tracker()
            yield tr
            rest = tr.duration - tr.now() + pad
            if rest > 0.02:
                self.wait(rest)

        return cm()


# ------------------------------------------------------------- text helpers
def title_text(s, size=44):
    return Tex(s, font_size=size)


def caption(s, size=30, color=LABEL):
    return Tex(s, font_size=size, color=color)


def underline_title(s, size=44):
    t = Tex(s, font_size=size)
    line = Line(t.get_corner(DL), t.get_corner(DR), stroke_width=2, color=GREY_B).shift(0.12 * DOWN)
    return VGroup(t, line)


def product_tex(pairs, a="y", b="y", size=36):
    """Product of factors, each a separate submobject, coloured by sign."""
    if not pairs:
        m = MathTex("1", font_size=size)
        return m
    parts = [fac(i, j, a, b) for i, j in pairs]
    m = MathTex(*parts, font_size=size)
    return m


def color_product(m, pairs):
    for sub, (i, j) in zip(m, pairs):
        sub.set_color(fac_color(i, j))
    return m


def image(name, height):
    im = ImageMobject(os.path.join(ASSETS, name))
    im.height = height
    return im


# ------------------------------------------------------------------- grids
def arc_pts(center, r, a0, a1, n=10):
    th = np.linspace(a0, a1, n)
    return [center + r * np.array([np.cos(t), np.sin(t), 0]) for t in th]


class Grid(VGroup):
    """A grid of square cells.  rows/cols are index lists (rows top to bottom)."""

    def __init__(self, rows, cols, cell=0.5, cells=None, color=GRIDC, width=1.5, **kw):
        super().__init__(**kw)
        self.rows, self.cols, self.s = list(rows), list(cols), cell
        self.cell_set = set(cells) if cells is not None else {(i, j) for i in rows for j in cols}
        self.squares = {}
        for (i, j) in sorted(self.cell_set):
            sq = Square(cell, stroke_color=color, stroke_width=width).move_to(self.center_of(i, j))
            self.squares[(i, j)] = sq
        self.lines = VGroup(*self.squares.values())
        self.add(self.lines)

    def center_of(self, i, j):
        r = self.rows.index(i) if i in self.rows else (i - self.rows[0])
        c = self.cols.index(j) if j in self.cols else (j - self.cols[0])
        return np.array([c * self.s, -r * self.s, 0.0])

    def cell_center(self, i, j):
        """Current (after moves/scales) centre of a cell."""
        return self._map(self.center_of(i, j))

    def _map(self, p):
        # the grid keeps a reference square at (rows[0], cols[0]) to recover transforms
        ref = self.squares.get((self.rows[0], self.cols[0]))
        if ref is None:
            ref = next(iter(self.squares.values()))
            key = next(iter(self.squares))
        else:
            key = (self.rows[0], self.cols[0])
        scale = ref.width / self.s
        return ref.get_center() + scale * (p - self.center_of(*key))


class BPD(VGroup):
    """Bumpless pipe dream.  `tiles` is a list of strings (top row first) over the
    given row and column indices.  Pipes enter from below at `entries` (default:
    every column) and are traced into continuous paths."""

    def __init__(self, tiles, rows, cols, cell=0.5, entries=None, pipe_color=PIPE,
                 stroke=5, grid_color=GRIDC, labels=None, region=None, corner=0.45,
                 colors=None, stub=0.0, show_grid=True, **kw):
        super().__init__(**kw)
        self.rows, self.cols, self.s = list(rows), list(cols), cell
        self.tile = {}
        for r, line in zip(self.rows, tiles):
            for c, ch in zip(self.cols, line):
                if ch != " ":
                    self.tile[(r, c)] = ch
        self.region = region
        cells = list(self.tile.keys())
        self.grid = Grid(self.rows, self.cols, cell, cells=cells, color=grid_color)
        if show_grid:
            self.add(self.grid)
        self.pipes = {}
        entries = self.cols if entries is None else entries
        bottom = self.rows[-1]
        for k, c in enumerate(entries):
            pts = self._trace(bottom, c, corner, stub)
            if pts is None:
                continue
            col = pipe_color if colors is None else colors.get(c, pipe_color)
            p = VMobject(stroke_color=col, stroke_width=stroke)
            p.set_points_as_corners(pts)
            self.pipes[c] = p
        self.pipe_group = VGroup(*self.pipes.values())
        self.add(self.pipe_group)
        self.empty_cells = [k for k, t in self.tile.items() if t == "O"]

    def c(self, i, j):
        return self.grid.center_of(i, j)

    def _trace(self, i, j, corner, stub):
        s, h = self.s, self.s / 2
        rc = corner * h
        if (i, j) not in self.tile and not self._is_diag(i, j):
            return None
        pts = [self.c(i, j) + np.array([0, -h - stub, 0])]
        d = "U"
        while True:
            if self._is_diag(i, j):
                pts.append(self.c(i, j))
                return pts
            if (i, j) not in self.tile:
                return pts
            t, cen = self.tile[(i, j)], self.c(i, j)
            if d == "U":
                if t in "|+":
                    pts.append(cen + np.array([0, h, 0]))
                    i = self._up(i)
                elif t == "r":
                    pts.append(cen + np.array([0, -rc, 0]))
                    pts += arc_pts(cen + np.array([rc, -rc, 0]), rc, np.pi, np.pi / 2)
                    pts.append(cen + np.array([h, 0, 0]))
                    d, j = "R", self._right(j)
                else:
                    return pts
            else:
                if t in "-+":
                    pts.append(cen + np.array([h, 0, 0]))
                    j = self._right(j)
                elif t == "j":
                    pts.append(cen + np.array([-rc, 0, 0]))
                    pts += arc_pts(cen + np.array([-rc, rc, 0]), rc, -np.pi / 2, 0)
                    pts.append(cen + np.array([0, h, 0]))
                    d, i = "U", self._up(i)
                else:
                    return pts
            if i is None or j is None:
                return pts

    def _is_diag(self, i, j):
        return self.region == "trap" and i == j and i in self.rows

    def _up(self, i):
        k = self.rows.index(i)
        return self.rows[k - 1] if k > 0 else None

    def _right(self, j):
        k = self.cols.index(j)
        return self.cols[k + 1] if k + 1 < len(self.cols) else None

    def cell_center(self, i, j):
        return self.grid.cell_center(i, j)

    def empty_dots(self, color=HL, scale=0.32, opacity=0.9):
        return VGroup(*[Dot(self.cell_center(i, j), radius=scale * self.grid.squares[(i, j)].width,
                            color=color, fill_opacity=opacity)
                        for (i, j) in self.empty_cells])

    def shade(self, cells, color, opacity=0.35):
        return VGroup(*[self.grid.squares[c].copy().set_stroke(width=0).set_fill(color, opacity)
                        for c in cells if c in self.grid.squares])

    def row_labels(self, labels, side=RIGHT, size=24, color=LABEL, buff=0.18):
        g = VGroup()
        for i, lab in zip(self.rows, labels):
            if lab is None:
                continue
            ref = self.grid.squares.get((i, self.cols[-1] if side is RIGHT else self.cols[0]))
            if ref is None:
                continue
            t = MathTex(str(lab), font_size=size, color=color)
            t.next_to(ref, side, buff=buff)
            g.add(t)
        return g

    def col_labels(self, labels, side=DOWN, size=24, color=LABEL, buff=0.15):
        g = VGroup()
        for j, lab in zip(self.cols, labels):
            if lab is None:
                continue
            ref = self.grid.squares.get((self.rows[-1] if side is DOWN else self.rows[0], j))
            if ref is None:
                continue
            t = MathTex(str(lab), font_size=size, color=color)
            t.next_to(ref, side, buff=buff)
            g.add(t)
        return g


class PipeDream(VGroup):
    """Classical pipe dream for w in S_n: staircase, crosses at `crosses`."""

    def __init__(self, n, crosses, cell=0.55, stroke=5, pipe_color=PIPE, colors=None, **kw):
        super().__init__(**kw)
        self.n, self.s = n, cell
        self.crosses = set(map(tuple, crosses))
        cells = [(i, j) for i in range(1, n + 1) for j in range(1, n + 1) if i + j <= n + 1]
        self.grid = Grid(range(1, n + 1), range(1, n + 1), cell, cells=[c for c in cells if c[0] + c[1] <= n])
        self.add(self.grid)
        self.pipes = {}
        for r in range(1, n + 1):
            pts, col = self._trace(r)
            p = VMobject(stroke_color=(pipe_color if colors is None else colors[r - 1]), stroke_width=stroke)
            p.set_points_as_corners(pts)
            self.pipes[r] = p
        self.pipe_group = VGroup(*self.pipes.values())
        self.add(self.pipe_group)

    def c(self, i, j):
        return self.grid.center_of(i, j)

    def _trace(self, r):
        h = self.s / 2
        i, j, d = r, 1, "R"
        pts = [self.c(i, j) + np.array([-h, 0, 0])]
        while i >= 1:
            cen = self.c(i, j)
            if i + j == self.n + 1:  # half tile: elbow up
                pts += arc_pts(cen + np.array([-h, h, 0]), h, -np.pi / 2, 0)
                i -= 1
                d = "U"
                continue
            if (i, j) in self.crosses:
                if d == "R":
                    pts.append(cen + np.array([h, 0, 0]))
                    j += 1
                else:
                    pts.append(cen + np.array([0, h, 0]))
                    i -= 1
            else:
                if d == "R":
                    pts += arc_pts(cen + np.array([-h, h, 0]), h, -np.pi / 2, 0)
                    d, i = "U", i - 1
                else:
                    pts += arc_pts(cen + np.array([h, -h, 0]), h, np.pi, np.pi / 2)
                    d, j = "R", j + 1
        return pts, j

    def cell_center(self, i, j):
        return self.grid.cell_center(i, j)

    def _scale(self):
        return self.grid.squares[(1, 1)].width / self.s

    def left_labels(self, labels, size=30, color=LABEL, buff=0.22):
        sc = self._scale()
        return VGroup(*[MathTex(str(x), font_size=size, color=color).move_to(
            self.cell_center(i, 1) + LEFT * (sc * self.s / 2 + buff)) for i, x in zip(range(1, self.n + 1), labels)])

    def top_labels(self, labels, size=30, color=LABEL, buff=0.22):
        sc = self._scale()
        return VGroup(*[MathTex(str(x), font_size=size, color=color).move_to(
            self.cell_center(1, j) + UP * (sc * self.s / 2 + buff)) for j, x in zip(range(1, self.n + 1), labels)])

    def cross_dots(self, color=HL, opacity=0.85):
        return VGroup(*[Dot(self.cell_center(i, j), radius=0.3 * self.grid.squares[(1, 1)].width,
                            color=color, fill_opacity=opacity).set_z_index(-1)
                        for (i, j) in sorted(self.crosses)])


# ------------------------------------------------------------- chain tables
class ChainTable(VGroup):
    """Rows of permutations (top = end of the chain sequence) with red bars and
    highlighted fixed entries.  `data` is an entry of chains_glasses etc."""

    def __init__(self, perms, steps, size=30, dx=0.42, dy=0.5, show_highlights=True, **kw):
        super().__init__(**kw)
        rows = list(reversed(perms))  # top row first
        self.entries = []
        n = len(rows[0])
        for r, perm in enumerate(rows):
            line = []
            for p, v in enumerate(perm):
                t = MathTex(str(v), font_size=size)
                t.move_to(np.array([p * dx + (-0.06 if v < 0 else 0), -r * dy, 0]))
                line.append(t)
            self.entries.append(line)
        self.numbers = VGroup(*[t for line in self.entries for t in line])
        self.add(self.numbers)
        self.bars = VGroup()
        self.hls = VGroup()
        m = len(steps)
        for s, st in enumerate(steps):
            # step s goes from bottom-row index (m - s) to (m - s - 1)
            lo, hi = m - s, m - s - 1
            x = (st["k"] - 0.5) * dx
            bar = Line(np.array([x, -hi * dy + 0.22, 0]), np.array([x, -lo * dy - 0.22, 0]),
                       color=NEG, stroke_width=3)
            self.bars.add(bar)
            for p, colr in st["highlights"]:
                rr = RoundedRectangle(corner_radius=0.12, width=0.34, height=dy + 0.36,
                                      stroke_width=0, fill_opacity=0.55,
                                      fill_color=POS if colr == "green" else HL)
                rr.move_to(np.array([p * dx, -(lo + hi) / 2 * dy, 0]))
                rr.set_z_index(-1)
                rr.kind = colr
                self.hls.add(rr)
        self.add(self.bars)
        if show_highlights:
            self.add(self.hls)


def chain_arrow_tex(labels, start="u", end="w", size=34):
    """u -k1/z1-> ... -> w as MathTex."""
    s = start
    for k, z in labels:
        s += rf"\xrightarrow[{z}]{{{k}}}"
    s += end
    return MathTex(s, font_size=size)


# ----------------------------------------------- per-tile pipes (for cutting)
def tile_pieces(tiles, rows, cols, cell, corner=0.45, color=PIPE, stroke=5):
    """Pipes drawn tile by tile.  Returns {(i, j): {"ll": VGroup, "ur": VGroup}}
    where for cells on the diagonal i == j the pipe pieces are split at the
    cell centre into the lower-left and upper-right halves (off the diagonal
    everything is put in "ll")."""
    h, rc = cell / 2, corner * cell / 2
    out = {}
    B, T, L, R, O = (np.array(v) for v in [(0, -h, 0), (0, h, 0), (-h, 0, 0), (h, 0, 0), (0, 0, 0)])

    def poly(pts, c0):
        p = VMobject(stroke_color=color, stroke_width=stroke)
        p.set_points_as_corners([c0 + q for q in pts])
        return p

    for r, line in zip(rows, tiles):
        for c, ch in zip(cols, line):
            if ch in " O":
                continue
            cen = np.array([cols.index(c) * cell, -rows.index(r) * cell, 0.0])
            ll, ur = [], []
            if ch in "|+":
                ll.append([B, O]); ur.append([O, T])
            if ch in "-+":
                ll.append([L, O]); ur.append([O, R])
            if ch == "r":
                k = np.array([rc, -rc, 0])
                ll.append([B, np.array([0, -rc, 0])] + arc_pts(k, rc, np.pi, 0.75 * np.pi, 6))
                ur.append(arc_pts(k, rc, 0.75 * np.pi, 0.5 * np.pi, 6) + [R])
            if ch == "j":
                k = np.array([-rc, rc, 0])
                ll.append([L, np.array([-rc, 0, 0])] + arc_pts(k, rc, -0.5 * np.pi, -0.25 * np.pi, 6))
                ur.append(arc_pts(k, rc, -0.25 * np.pi, 0, 6) + [T])
            gl = VGroup(*[poly(p, cen) for p in ll])
            gu = VGroup(*[poly(p, cen) for p in ur])
            if r != c:
                gl.add(*gu)
                gu = VGroup()
            out[(r, c)] = {"ll": gl, "ur": gu}
    return out


class CuttableRect(VGroup):
    """Rectangle part of a BPD (rows 1..n) drawn tile by tile so that it can be
    split along the diagonal into a trapezoid and a triangle."""

    def __init__(self, tiles, rows, cols, cell=0.5, **kw):
        super().__init__(**kw)
        self.rows, self.cols, self.s = list(rows), list(cols), cell
        self.tile = {(r, c): ch for r, line in zip(rows, tiles) for c, ch in zip(cols, line)}
        pieces = tile_pieces(tiles, self.rows, self.cols, cell)
        h = cell / 2
        self.trap, self.tri = VGroup(), VGroup()
        self.trap_grid, self.tri_grid = VGroup(), VGroup()
        self.squares = {}
        for (r, c) in self.tile:
            cen = self.center_of(r, c)
            if r == c:
                a = Polygon(cen + np.array([-h, h, 0]), cen + np.array([h, -h, 0]), cen + np.array([-h, -h, 0]),
                            stroke_color=GRIDC, stroke_width=1.5)
                b = Polygon(cen + np.array([-h, h, 0]), cen + np.array([h, h, 0]), cen + np.array([h, -h, 0]),
                            stroke_color=GRIDC, stroke_width=1.5)
                self.trap_grid.add(a)
                self.tri_grid.add(b)
            else:
                sq = Square(cell, stroke_color=GRIDC, stroke_width=1.5).move_to(cen)
                (self.trap_grid if c < r else self.tri_grid).add(sq)
                self.squares[(r, c)] = sq
            if (r, c) in pieces:
                p = pieces[(r, c)]
                if r == c:
                    self.trap.add(p["ll"])
                    self.tri.add(p["ur"])
                elif c < r:
                    self.trap.add(p["ll"])
                else:
                    self.tri.add(p["ll"])
        self.left_part = VGroup(self.trap_grid, self.trap)
        self.right_part = VGroup(self.tri_grid, self.tri)
        self.add(self.left_part, self.right_part)
        self.empty_cells = [k for k, t in self.tile.items() if t == "O"]

    def center_of(self, i, j):
        return np.array([self.cols.index(j) * self.s, -self.rows.index(i) * self.s, 0.0])

    def cell_center(self, i, j):
        ref = self.trap_grid[0] if len(self.trap_grid) else self.tri_grid[0]
        # recover the current affine map from two fixed reference points
        a0 = self.center_of(self.rows[-1], self.cols[0])
        sq = self._sq(self.rows[-1], self.cols[0])
        scale = sq.width / self.s
        return sq.get_center() + scale * (self.center_of(i, j) - a0)

    def _sq(self, i, j):
        return self.squares[(i, j)]

    def corner(self, i, j, which):
        """Corner of cell (i, j): which in {UL, UR, DL, DR}."""
        sq = self._sq(self.rows[-1], self.cols[0])
        scale = sq.width / self.s
        p = self.cell_center(i, j)
        return p + scale * self.s / 2 * which

    def empty_dots(self, color=HL, scale=0.3):
        sq = self._sq(self.rows[-1], self.cols[0])
        return VGroup(*[Dot(self.cell_center(i, j), radius=scale * sq.width, color=color)
                        for (i, j) in self.empty_cells])
