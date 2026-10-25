"""Shared pieces: captioned scenes, colours, pipedream drawing and chain tables."""

import hashlib
import json
import os
import re
from contextlib import contextmanager

import numpy as np
from manim import *


HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, "sz_data.json")))

PIPE = "#58C4DD"
POS = "#83C167"
NEG = "#FC6255"
HL = "#FFD84D"
GRIDC = "#4A4A4A"
DIM = "#8A8A8A"
LABEL = "#B9B9B9"
CUT = "#FF6B6B"
FORCED = "#7FA7E8"
CAPC = "#E8E8E8"
T1, T2, T3 = "#83C167", "#C9A0DC", "#F4B860"   # colours of the three types

config.background_color = "#0B0B0D"
CAP_Y = -3.32            # centre of the caption band
CONTENT_BOTTOM = -2.55   # nothing else goes below this line
LOG = os.environ.get("CAPTION_LOG")

# narration: audio/<key>.wav for each caption, made by tts.py (absent = captions only)
AUDIO = os.path.join(HERE, "audio")
TIMING = json.load(open(os.path.join(AUDIO, "timing.json"))) if os.path.exists(os.path.join(AUDIO, "timing.json")) else None
VOICE_PAD = 0.6          # pause after each spoken line


def caption_key(text):
    return hashlib.sha1(text.encode()).hexdigest()[:12]


def idx(i):
    return f"{{{i}}}" if i >= 0 else f"{{-{-i}}}"


def fac(i, j, a="y", b="y"):
    return rf"({a}_{idx(i)}-{b}_{idx(j)})"


def prec_key(i):
    return (0, i) if i > 0 else (1, i)


def ftype(i, j):
    if 0 < i < j:
        return 1
    if i < j <= 0:
        return 2
    if j <= 0 < i:
        return 3
    return None


def fcolor(i, j):
    if i == j:
        return DIM
    return POS if prec_key(i) < prec_key(j) else NEG


def tcolor(i, j):
    return {1: T1, 2: T2, 3: T3}.get(ftype(i, j), NEG)


def plain_len(text):
    t = re.sub(r"\\[a-zA-Z]+", "x", text)
    t = re.sub(r"[{}$^_\\]", "", t)
    return len(t)


def reading_time(text):
    return max(3.2, 1.4 + 0.062 * plain_len(text))


class Captioned(Scene):
    """`with self.cap("...") as c:` shows a caption in the bottom band, speaks its
    line from narration.py if the audio exists, and keeps it up for at least its
    reading time and until the line has been spoken.  `c.until(t)` waits until t
    seconds into it."""

    _cap = None

    def cap(self, text, extra=0.0, size=33, hold=None):
        scene = self
        dur = (hold if hold is not None else reading_time(text)) + extra
        voice = None
        if TIMING is not None:
            key = caption_key(text)
            assert key in TIMING, f"no narration for caption (update narration.py, run tts.py): {text}"
            voice = os.path.join(AUDIO, f"{key}.wav")
            dur = max(dur, TIMING[key]["duration"] + VOICE_PAD + extra)

        class Tr:
            def __init__(self):
                self.start = scene.renderer.time
                self.duration = dur

            def now(self):
                return scene.renderer.time - self.start

            def until(self, t):
                if isinstance(t, float) and 0 < t <= 1.0 and t != 1.0:
                    t = t * dur
                if t - self.now() > 1e-3:
                    scene.wait(t - self.now())

        @contextmanager
        def cm():
            m = Tex(text, font_size=size, color=CAPC)
            if m.width > 12.8:
                m.scale_to_fit_width(12.8)
            m.move_to(np.array([0, CAP_Y, 0]))
            if voice:
                scene.add_sound(voice)
            if scene._cap is not None:
                scene.play(FadeOut(scene._cap, run_time=0.3), FadeIn(m, run_time=0.3))
            else:
                scene.play(FadeIn(m), run_time=0.4)
            scene._cap = m
            tr = Tr()
            if LOG:
                with open(LOG, "a") as f:
                    f.write(json.dumps({"scene": type(scene).__name__, "t": round(scene.renderer.time, 3),
                                        "text": text}) + "\n")
            yield tr
            rest = dur - tr.now()
            if rest > 0.02:
                scene.wait(rest)

        return cm()

    def remove(self, *mobjects):
        # Animating a temporary group splits its members out of their old parents,
        # so remove whole families or the old parent's pieces would stay on screen.
        return super().remove(*[m for mob in mobjects for m in mob.get_family()])

    def clear_caption(self, run_time=0.4):
        if self._cap is not None:
            self.play(FadeOut(self._cap), run_time=run_time)
            self._cap = None


# ------------------------------------------------------------------ grids and pipedreams
def arc_pts(center, r, a0, a1, n=10):
    th = np.linspace(a0, a1, n)
    return [center + r * np.array([np.cos(t), np.sin(t), 0]) for t in th]


class Grid(VGroup):
    """A grid of square cells.  rows/cols are index lists (rows top to bottom)."""

    def __init__(self, rows, cols, cell=0.5, cells=None, color=GRIDC, width=1.5, **kw):
        super().__init__(**kw)
        self.rows, self.cols, self.s = list(rows), list(cols), cell
        cells = set(cells) if cells is not None else {(i, j) for i in rows for j in cols}
        self.squares = {}
        for (i, j) in sorted(cells):
            self.squares[(i, j)] = Square(cell, stroke_color=color, stroke_width=width).move_to(self.center_of(i, j))
        self.add(*self.squares.values())

    def center_of(self, i, j):
        return np.array([self.cols.index(j) * self.s, -self.rows.index(i) * self.s, 0.0])


class BPD(VGroup):
    """Bumpless pipedream.  `tiles` is a list of strings (top row first) over the
    given row and column indices, using the characters O + - | r j (space = no cell).
    Pipes are traced upwards from the bottom of the columns in `entries` (default:
    all) and stored in `pipes`, keyed by that column."""

    def __init__(self, tiles, rows, cols, cell=0.5, entries=None, stroke=5, corner=0.45,
                 colors=None, stub=0.0, **kw):
        super().__init__(**kw)
        self.rows, self.cols, self.s = list(rows), list(cols), cell
        self.tile = {}
        for r, line in zip(self.rows, tiles):
            for c, ch in zip(self.cols, line):
                if ch != " ":
                    self.tile[(r, c)] = ch
        self.grid = Grid(self.rows, self.cols, cell, cells=list(self.tile))
        self.add(self.grid)
        self.pipes = {}
        for c in (self.cols if entries is None else entries):
            pts = self._trace(self.rows[-1], c, corner, stub)
            if pts is None or len(pts) < 2:
                continue
            p = VMobject(stroke_color=PIPE if colors is None else colors.get(c, PIPE), stroke_width=stroke)
            p.set_points_as_corners(pts)
            self.pipes[c] = p
        self.pipe_group = VGroup(*self.pipes.values())
        self.add(self.pipe_group)

    def _trace(self, i, j, corner, stub):
        h = self.s / 2
        rc = corner * h
        if (i, j) not in self.tile:
            return None
        pts = [self.grid.center_of(i, j) + np.array([0, -h - stub, 0])]
        going_up = True
        while i is not None and j is not None and (i, j) in self.tile:
            t, cen = self.tile[(i, j)], self.grid.center_of(i, j)
            if going_up and t in "|+":
                pts.append(cen + np.array([0, h, 0]))
                i = self._next(self.rows, i, -1)
            elif going_up and t == "r":
                pts.append(cen + np.array([0, -rc, 0]))
                pts += arc_pts(cen + np.array([rc, -rc, 0]), rc, np.pi, np.pi / 2)
                pts.append(cen + np.array([h, 0, 0]))
                going_up, j = False, self._next(self.cols, j, 1)
            elif not going_up and t in "-+":
                pts.append(cen + np.array([h, 0, 0]))
                j = self._next(self.cols, j, 1)
            elif not going_up and t == "j":
                pts.append(cen + np.array([-rc, 0, 0]))
                pts += arc_pts(cen + np.array([-rc, rc, 0]), rc, -np.pi / 2, 0)
                pts.append(cen + np.array([0, h, 0]))
                going_up, i = True, self._next(self.rows, i, -1)
            else:
                break
        return pts

    @staticmethod
    def _next(seq, x, step):
        k = seq.index(x) + step
        return seq[k] if 0 <= k < len(seq) else None


def heading(text, size=36):
    return Tex(text, font_size=size, color=PIPE).to_corner(UL, buff=0.45)


# ------------------------------------------------------------------ drawing
def bpd_from_rows(rows_str, row_idx, col_idx, cell, entries=None, stub=0.0, colors=None):
    return BPD(rows_str, list(row_idx), list(col_idx), cell=cell, entries=entries, stub=stub, colors=colors)


def tile_drawing(rows_str, row_idx, col_idx, cell, color=PIPE, stroke=5, corner=0.45):
    """Draw a tiling tile by tile (works for any region shape)."""
    h, rc = cell / 2, corner * cell / 2
    grid = VGroup()
    pipes = VGroup()
    squares = {}
    B, T, L, R, O = (np.array(v) for v in [(0, -h, 0), (0, h, 0), (-h, 0, 0), (h, 0, 0), (0, 0, 0)])

    def poly(pts, c0):
        p = VMobject(stroke_color=color, stroke_width=stroke)
        p.set_points_as_corners([c0 + q for q in pts])
        return p

    for r, line in zip(row_idx, rows_str):
        for c, ch in zip(col_idx, line):
            if ch == " ":
                continue
            cen = np.array([col_idx.index(c) * cell, -row_idx.index(r) * cell, 0.0])
            sq = Square(cell, stroke_color=GRIDC, stroke_width=1.5).move_to(cen)
            squares[(r, c)] = sq
            grid.add(sq)
            if ch in "|+":
                pipes.add(poly([B, T], cen))
            if ch in "-+":
                pipes.add(poly([L, R], cen))
            if ch == "r":
                k = np.array([rc, -rc, 0])
                pipes.add(poly([B, np.array([0, -rc, 0])] + arc_pts(k, rc, np.pi, 0.5 * np.pi, 10) + [R], cen))
            if ch == "j":
                k = np.array([-rc, rc, 0])
                pipes.add(poly([L, np.array([-rc, 0, 0])] + arc_pts(k, rc, -0.5 * np.pi, 0, 10) + [T], cen))
    g = VGroup(grid, pipes)
    g.squares, g.grid, g.pipes = squares, grid, pipes
    return g


def dots_on(squares, cells, color=HL, scale=0.3):
    out = VGroup()
    for c in cells:
        c = tuple(c)
        if c in squares:
            sq = squares[c]
            out.add(Dot(sq.get_center(), radius=scale * sq.width, color=color))
    return out


def staircase(squares, n, color=POS, width=5):
    """The staircase between cells j <= i and j > i, for rows 1..n."""
    pts = []
    for r in range(1, n + 1):
        sq = squares[(r, r)]
        if r == 1:
            pts.append(sq.get_corner(UR))
        pts.append(sq.get_corner(DR))
        if r < n:
            nxt = squares[(r + 1, r + 1)]
            pts.append(nxt.get_corner(UR))
    m = VMobject(stroke_color=color, stroke_width=width)
    m.set_points_as_corners(pts)
    return m


def row_labels(squares, rows, col, side=RIGHT, size=24, buff=0.16, color=LABEL, text=None):
    g = VGroup()
    for r in rows:
        if (r, col) in squares:
            t = MathTex(str(r if text is None else text[r]), font_size=size, color=color)
            t.next_to(squares[(r, col)], side, buff=buff)
            g.add(t)
    return g


def col_labels(squares, cols, row, side=DOWN, size=24, buff=0.14, color=LABEL, text=None):
    g = VGroup()
    for c in cols:
        if (row, c) in squares:
            t = MathTex(str(c if text is None else text[c]), font_size=size, color=color)
            t.next_to(squares[(row, c)], side, buff=buff)
            g.add(t)
    return g


class ChainTable(VGroup):
    """A chain sequence as in the paper: one-line notations from bottom to top,
    a red bar after position alpha for each step, circled fixed values."""

    def __init__(self, data, a, size=30, dx=0.44, dy=0.5, circles=True, **kw):
        super().__init__(**kw)
        rows = data["rows"]                     # bottom first
        m = len(rows)
        self.cells = {}
        nums = VGroup()
        for r, line in enumerate(rows):
            yy = r * dy
            for k, v in enumerate(line):
                t = MathTex(str(v), font_size=size)
                t.move_to(np.array([k * dx + (-0.05 if v < 0 else 0), yy, 0]))
                self.cells[(r, a + k)] = t
                nums.add(t)
        self.numbers = nums
        self.add(nums)
        self.bars = VGroup()
        for s, k in enumerate(data["bars"]):
            xk = (k - a + 0.5) * dx
            bar = Line(np.array([xk, s * dy - 0.22, 0]), np.array([xk, (s + 1) * dy + 0.22, 0]),
                       color=CUT, stroke_width=3)
            self.bars.add(bar)
        self.add(self.bars)
        self.circ = VGroup()
        self.circ_by_color = {"blue": VGroup(), "green": VGroup()}
        for s, t, colr in data["circles"]:
            e = Ellipse(width=0.36, height=dy + 0.4, stroke_width=2.5,
                        color=FORCED if colr == "blue" else POS)
            e.move_to(np.array([(t - a) * dx, (s + 0.5) * dy, 0]))
            self.circ.add(e)
            self.circ_by_color[colr].add(e)
        if circles:
            self.add(self.circ)
        self.dy, self.dx, self.a, self.m = dy, dx, a, m

    def step_label(self, s, text, size=26, color=HL, buff=0.3):
        right = self.numbers.get_right()[0] + buff
        return MathTex(text, font_size=size, color=color).move_to(
            np.array([right + 0.25, self.numbers.get_bottom()[1] + 0.2 + (s + 0.5) * self.dy, 0]))


def tile_icon(ch, s=0.7, color=PIPE):
    sq = Square(s, stroke_color=GRIDC, stroke_width=2)
    h, rc = s / 2, 0.45 * s / 2
    g = VGroup(sq)
    if ch in "|+":
        g.add(Line(np.array([0, -h, 0]), np.array([0, h, 0]), stroke_color=color, stroke_width=5))
    if ch in "-+":
        g.add(Line(np.array([-h, 0, 0]), np.array([h, 0, 0]), stroke_color=color, stroke_width=5))
    if ch == "r":
        g.add(VMobject(stroke_color=color, stroke_width=5).set_points_as_corners(
            [np.array([0, -h, 0]), np.array([0, -rc, 0])] + arc_pts(np.array([rc, -rc, 0]), rc, np.pi, np.pi / 2, 16)
            + [np.array([h, 0, 0])]))
    if ch == "j":
        g.add(VMobject(stroke_color=color, stroke_width=5).set_points_as_corners(
            [np.array([-h, 0, 0]), np.array([-rc, 0, 0])] + arc_pts(np.array([-rc, rc, 0]), rc, -np.pi / 2, 0, 16)
            + [np.array([0, h, 0])]))
    return g


def power_tex(factors, size=36):
    """Product of forms with repeated factors written as powers; returns MathTex
    with one submobject per distinct factor."""
    seen = []
    for f in factors:
        f = tuple(f)
        if f not in [g for g, _ in seen]:
            seen.append((f, factors.count(list(f)) + factors.count(f)))
    parts = []
    for (i, j), k in seen:
        parts.append(fac(i, j) + (f"^{{{k}}}" if k > 1 else ""))
    if not parts:
        parts = ["1"]
    m = MathTex(*parts, font_size=size)
    for sub, ((i, j), _) in zip(m, seen):
        sub.set_color(tcolor(i, j))
    return m
