"""Combinatorial objects used in the video, plus checks that the examples are right.

Conventions (matching the talk slides):
  * Pipe dreams: pipe entering row i on the left exits column w(i) on top;
    a cross at (i, j) has weight (x_i - y_j).
  * Bumpless pipe dreams (BPDs): pipes enter at the bottom (pipe c enters
    column c) and exit on the right, the pipe leaving row i is w(i);
    an empty tile at (i, j) has weight (x_i - y_j).
  * Increasing k-chains in Bruhat order: u -> u t_{a,b} with a <= k < b, each
    step a cover, and the smaller swapped value strictly increasing.
    wt(u -k/z-> w) = prod over positions i > k with u(i) = w(i) of (z - y_{u(i)}).

Run this file to check every example that appears in the video.
"""

import itertools
import random
from functools import reduce

import sympy as sp

# ---------------------------------------------------------------- variables
_X, _Y = {}, {}


def x(i):
    if i not in _X:
        _X[i] = sp.Symbol(f"x_{i}".replace("-", "m"))
    return _X[i]


def y(i):
    if i not in _Y:
        _Y[i] = sp.Symbol(f"y_{i}".replace("-", "m"))
    return _Y[i]


# ------------------------------------------------- double Schubert (truth)
def divided_difference(f, i):
    g = f.subs({x(i): x(i + 1), x(i + 1): x(i)}, simultaneous=True)
    return sp.cancel((f - g) / (x(i) - x(i + 1)))


_SCHUBERT_CACHE = {}


def double_schubert(w):
    """Double Schubert polynomial: S_w = d_i S_{w s_i} for an ascent i of w."""
    w = tuple(w)
    if w in _SCHUBERT_CACHE:
        return _SCHUBERT_CACHE[w]
    n = len(w)
    for i in range(n - 1):
        if w[i] < w[i + 1]:
            v = list(w)
            v[i], v[i + 1] = v[i + 1], v[i]
            f = sp.expand(divided_difference(double_schubert(v), i + 1))
            break
    else:  # w is the longest element
        f = sp.Integer(1)
        for i in range(1, n + 1):
            for j in range(1, n + 1 - i):
                f *= x(i) - y(j)
        f = sp.expand(f)
    _SCHUBERT_CACHE[w] = f
    return f


def bruhat_leq(u, v):
    n = len(u)
    for i in range(1, n + 1):
        a = sorted(u[:i])
        b = sorted(v[:i])
        if any(p > q for p, q in zip(a, b)):
            return False
    return True


# ------------------------------------------------------------- pipe dreams
def pipe_dreams(w):
    """All reduced pipe dreams of w; returns list of sets of cross cells."""
    n = len(w)
    cells = [(i, j) for i in range(1, n + 1) for j in range(1, n + 1) if i + j <= n]
    out = []
    length = sum(1 for a in range(n) for b in range(a + 1, n) if w[a] > w[b])
    for crosses in itertools.combinations(cells, length):
        crosses = set(crosses)
        if _trace_pd(crosses, n) == list(w):
            out.append(crosses)
    return out


def _trace_pd(crosses, n):
    res = []
    for start in range(1, n + 1):
        # pipe enters row `start` from the left, moving right
        i, j, d = start, 1, "R"
        while True:
            if i == 0:
                res.append(j)
                break
            if i + j > n + 1:  # should not happen
                return None
            if i + j == n + 1:
                # the boundary half-tile: elbow turning up
                d = "U"
                i -= 1
                continue
            if (i, j) in crosses:
                if d == "R":
                    j += 1
                else:
                    i -= 1
            else:  # bump: R -> U, U -> R
                if d == "R":
                    d = "U"
                    i -= 1
                else:
                    d = "R"
                    j += 1
        # reducedness: checked by length equality + correct permutation
    return res


def pd_weight(crosses):
    return reduce(lambda a, b: a * b, [x(i) - y(j) for (i, j) in crosses], sp.Integer(1))


# ---------------------------------------------------- bumpless pipe dreams
# tiles: "O" empty, "+" cross, "-" horizontal, "|" vertical,
#        "r" = elbow bottom->right, "j" = elbow left->top
def bpds(rows, cols, bottom_in, right_out, top_out=None, randomize=False, limit=None,
         region=None, diag_rows=None):
    """Enumerate bumpless pipe dreams on rows x cols.

    bottom_in: dict col -> pipe label entering from below the last row.
    right_out: dict row -> label required to exit right (or None for no pipe).
    top_out:   dict col -> label exiting through the top edge (missing = none).
    region:    optional predicate (i, j) -> True if cell is a full cell.  Cells not
               in the region but with region(i, j-1) true are treated as
               "diagonal half cells" that absorb whatever arrives (trapezoids).
    diag_rows: dict row -> set of labels that must be absorbed at that row.
    Returns list of dicts (i, j) -> tile.
    """
    rows = list(rows)
    cols = list(cols)
    top_out = top_out or {}
    results = []
    order = list(reversed(rows))  # bottom to top

    def full(i, j):
        return region is None or region(i, j)

    def rec(ri, state, crossed, grid):
        if limit is not None and len(results) >= limit:
            return
        if ri == len(order):
            # check top boundary
            want = {c: top_out.get(c) for c in cols}
            have = {c: state.get(c) for c in cols}
            if want == have:
                results.append(dict(grid))
            return
        i = order[ri]
        row_cols = [c for c in cols if full(i, c)]
        for new_state, new_crossed, tiles, carry in _row_fillings(
                i, row_cols, state, crossed, randomize):
            if region is None:
                if carry != right_out.get(i):
                    continue
            else:
                # the diagonal half cell (i, i) absorbs the horizontal carry
                # and any vertical pipe arriving in column i
                new_state = dict(new_state)
                absorbed = [carry] if carry is not None else []
                if i in new_state:
                    absorbed.append(new_state.pop(i))
                want = diag_rows.get(i, set()) if diag_rows else set()
                if set(absorbed) != set(want) or len(absorbed) != len(want):
                    continue
            g2 = dict(grid)
            g2.update(tiles)
            rec(ri + 1, new_state, new_crossed, g2)

    rec(0, dict(bottom_in), frozenset(), {})
    return results


def _row_fillings(i, row_cols, state, crossed, randomize):
    """Fill one row left to right.  state: col -> label on the bottom edge.

    Yields (top_state, crossed, tiles, exited) where exited is the label leaving
    the right end of the row (None if nothing) -- for trapezoid rows it is the
    list of labels absorbed by the diagonal half cell."""
    out = []
    last = row_cols[-1] if row_cols else None
    # pipes on vertical edges of columns not in the row pass through untouched
    passthrough = {c: l for c, l in state.items() if c not in row_cols}

    def go(k, carry, top, crossed, tiles):
        if k == len(row_cols):
            nxt = dict(passthrough)
            nxt.update(top)
            # what arrives at the diagonal/right edge: the horizontal carry,
            # and (for trapezoids) a vertical pipe under the half cell
            out.append((nxt, crossed, tiles, carry))
            return
        c = row_cols[k]
        b = state.get(c)
        opts = []
        if b is None and carry is None:
            opts.append(("O", None, None, crossed))
        elif b is not None and carry is None:
            opts.append(("|", b, None, crossed))
            opts.append(("r", None, b, crossed))
        elif b is None and carry is not None:
            opts.append(("-", None, carry, crossed))
            opts.append(("j", carry, None, crossed))
        else:
            pair = frozenset((b, carry))
            if pair not in crossed:
                opts.append(("+", b, carry, crossed | {pair}))
        if randomize:
            random.shuffle(opts)
        for tile, up, right, cr in opts:
            t2 = dict(top)
            if up is not None:
                t2[c] = up
            tiles2 = dict(tiles)
            tiles2[(i, c)] = tile
            go(k + 1, right, t2, cr, tiles2)

    go(0, None, {}, crossed, {})
    return out


def bpd_weight(grid, xvar=x):
    f = sp.Integer(1)
    for (i, j), t in grid.items():
        if t == "O":
            f *= xvar(i) - y(j)
    return f


def bpds_of_perm(w, start=1):
    """BPDs of a permutation given in one-line notation on [start, start+n)."""
    n = len(w)
    idx = list(range(start, start + n))
    return bpds(idx, idx, {c: c for c in idx}, {r: w[k] for k, r in enumerate(idx)})


# ------------------------------------------------------------------ chains
def is_cover(u, a, b):
    """u -> u t_{a,b} is a Bruhat cover (0-indexed positions a < b)."""
    if u[a] > u[b]:
        return False
    return not any(u[a] < u[c] < u[b] for c in range(a + 1, b))


def k_chains(u, k):
    """All increasing k-chains starting at u. k = number of positions left of
    the bar (positions are 1-indexed, a <= k < b).  Yields (endpoint, steps)."""
    res = []

    def rec(cur, last_small, steps):
        res.append((tuple(cur), tuple(steps)))
        n = len(cur)
        for a in range(k):
            for b in range(k, n):
                if is_cover(cur, a, b) and cur[a] > last_small:
                    nxt = list(cur)
                    nxt[a], nxt[b] = nxt[b], nxt[a]
                    rec(nxt, cur[a], steps + [(a + 1, b + 1)])

    rec(list(u), -10**9, [])
    return res


def chain_step_weight(u, w, k, z):
    f = sp.Integer(1)
    for p in range(k, len(u)):
        if u[p] == w[p]:
            f *= z - y(u[p])
    return f


def chain_sum(u, w, labels):
    """Sum over chains u -k1/z1-> ... -km/zm-> w; returns list of
    (weight, [u, v1, ..., w]) for each chain sequence."""
    terms = []

    def rec(cur, idx, path, wt):
        if idx == len(labels):
            if tuple(cur) == tuple(w):
                terms.append((wt, path))
            return
        k, z = labels[idx]
        seen = set()
        for end, steps in k_chains(cur, k):
            if end in seen:
                raise RuntimeError("two increasing chains with same endpoints")
            seen.add(end)
            rec(end, idx + 1, path + [end], wt * chain_step_weight(cur, end, k, z))

    rec(tuple(u), 0, [tuple(u)], sp.Integer(1))
    return terms


# -------------------------------------------------------------- the checks
def check_schubert_models(n=4):
    for w in itertools.permutations(range(1, n + 1)):
        truth = double_schubert(w)
        pd = sp.expand(sum(pd_weight(d) for d in pipe_dreams(w)))
        bp = sp.expand(sum(bpd_weight(g) for g in bpds_of_perm(w)))
        assert sp.expand(pd - truth) == 0, (w, "pd")
        assert sp.expand(bp - truth) == 0, (w, "bpd")
        w0 = tuple(range(n, 0, -1))
        ls = sp.expand(sum(t for t, _ in chain_sum(w, w0, [(k, x(k)) for k in range(1, n)])))
        yu = sp.expand(sum(t for t, _ in chain_sum(w, w0, [(k, x(k)) for k in range(n - 1, 0, -1)])))
        assert sp.expand(ls - truth) == 0, (w, "Lenart-Sottile chains")
        assert sp.expand(yu - truth) == 0, (w, "reversed chains")
    print(f"pipe dreams, BPDs and both chain orders agree with divided differences on S_{n}")


def show_small_examples():
    for w in [(1, 3, 2), (2, 1, 4, 3)]:
        print("w =", w)
        for d in pipe_dreams(w):
            print("   PD crosses", sorted(d), "->", sp.factor(pd_weight(d)))
        for g in bpds_of_perm(w):
            empt = sorted(c for c, t in g.items() if t == "O")
            print("   BPD empties", empt, "->", sp.factor(bpd_weight(g)))
    w0 = (3, 2, 1)
    print("chains for 132, order (1,x1),(2,x2):")
    for t, p in chain_sum((1, 3, 2), w0, [(1, x(1)), (2, x(2))]):
        print("   ", p, t)
    print("chains for 132, order (2,x2),(1,x1):")
    for t, p in chain_sum((1, 3, 2), w0, [(2, x(2)), (1, x(1))]):
        print("   ", p, t)


def check_trapezoid_example():
    """The running example: three trapezoid BPDs <-> three chains."""
    u = (-1, 1, 0, 3, 4, 2)
    w = (0, 1, 2, 3, 4, -1)
    vand = reduce(lambda a, b: a * b, [y(i) - y(j) for i in range(1, 5) for j in range(i + 1, 5)])
    glasses = chain_sum(u, w, [(4, y(3)), (3, y(2)), (2, y(1))])
    gauntlet = chain_sum(u, w, [(2, y(1)), (3, y(2)), (4, y(3))])
    print("glasses order (y3, y2, y1):")
    for t, p in glasses:
        print("   ", [list(q) for q in reversed(p)], sp.factor(sp.cancel(t / vand)))
    print("gauntlet order (y1, y2, y3):")
    for t, p in gauntlet:
        print("   ", [list(q) for q in reversed(p)], sp.factor(sp.cancel(t / vand)))
    s1 = sp.expand(sum(sp.cancel(t / vand) for t, _ in glasses))
    s2 = sp.expand(sum(sp.cancel(t / vand) for t, _ in gauntlet))
    assert sp.expand(s1 - s2) == 0
    print("   both sums =", s1)

    # trapezoid BPDs: rows 1..4, full cells (i, j) with -1 <= j < i, the
    # diagonal half cell (i, i) absorbs pipes.  Pipes enter at columns -1..4.
    traps = bpds(range(1, 5), range(-1, 5), {c: c for c in range(-1, 5)}, {},
                 top_out={0: -1}, region=lambda i, j: j < i,
                 diag_rows={1: {1}, 2: {0}, 3: {3}, 4: {2, 4}})
    print("trapezoid BPDs:", len(traps))
    tot = 0
    for g in traps:
        wt = bpd_weight(g, xvar=y)
        tot += wt
        print("   empties", sorted(c for c, t in g.items() if t == "O"), "->", wt)
    assert sp.expand(tot - s1) == 0
    print("   trapezoid sum matches the chain sums")
    return traps


if __name__ == "__main__":
    show_small_examples()
    check_schubert_models(4)
    check_trapezoid_example()
