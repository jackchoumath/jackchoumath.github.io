"""The Chou--Yu construction for w in S_Z, following arXiv:2512.12185.

Conventions are the paper's:
  * Permutations of S_[a,n] are dicts {position: value}; elsewhere they fix.
  * A bumpless pipedream (BPD) is a tiling of a region by
        "O" blank, "+" cross, "-" horizontal, "|" vertical,
        "r" (elbow joining right and bottom), "j" (elbow joining left and top).
    Pipes travel from the top/right boundary to the bottom/left boundary.
    A labeling is valid if at every cross the vertical pipe has the smaller label.
  * Boundary conditions are dicts N[c], E[r], S[c], W[r] of pipe labels.
  * wt(D) = prod over blank (i, j) of (x_i - y_j).
"""

from functools import reduce
from itertools import permutations

import sympy as sp

_X, _Y = {}, {}


def x(i):
    return _X.setdefault(i, sp.Symbol(f"x_{i}".replace("-", "m")))


def y(i):
    return _Y.setdefault(i, sp.Symbol(f"y_{i}".replace("-", "m")))


def prod(it):
    return reduce(lambda a, b: a * b, it, sp.Integer(1))


# --------------------------------------------------------------- permutations
def perm(a, oneline):
    return {a + k: v for k, v in enumerate(oneline)}


def oneline(p, a, n):
    return [p.get(i, i) for i in range(a, n + 1)]


def inverse(p):
    return {v: k for k, v in p.items()}


def neg(p):
    """The automorphism s_i -> s_{-i}:  (neg p)(i) = 1 - p(1 - i)."""
    return {1 - i: 1 - v for i, v in p.items()}


def support(p):
    moved = [i for i, v in p.items() if i != v]
    return (min(moved), max(moved)) if moved else (1, 0)


def descents(p, a, n):
    q = lambda i: p.get(i, i)
    return [i for i in range(a - 1, n + 1) if q(i) > q(i + 1)]


def length(p):
    ks = sorted(p)
    return sum(1 for i in ks for j in ks if i < j and p[i] > p[j])


def w_lambda(lam, a):
    """0-Grassmannian permutation of a partition, as a permutation of [a, ...]."""
    lam = list(lam)
    vals = {i: i + (lam[-i] if -i < len(lam) else 0) for i in range(a, 1)}
    used = set(vals.values())
    rest = iter(v for v in range(a, a + 10 * (len(lam) + 5)) if v not in used)
    hi = max(list(used) + [0])
    out = dict(vals)
    i = 1
    while i <= hi or i <= 0:
        out[i] = next(rest)
        i += 1
    while True:  # extend until it is a permutation of a window
        dom, img = set(out), set(out.values())
        if dom == img:
            return out
        out[i] = next(rest)
        i += 1


def conjugate(lam):
    lam = [p for p in lam if p > 0]
    return tuple(sum(1 for p in lam if p >= k) for k in range(1, (lam[0] if lam else 0) + 1))


def partition_of(sigma, a):
    """lambda for a 0-Grassmannian sigma (lambda_k = sigma(1-k) - (1-k))."""
    lam = [sigma.get(1 - k, 1 - k) - (1 - k) for k in range(1, 1 - a + 1)]
    return tuple(v for v in lam if v > 0)


def omega1(f):
    """x_i -> -x_{1-i}, y_i -> -y_{1-i}.  (The paper prints the map without the
    signs; the signs are needed for Prop. 2.6, e.g. for w = s_1, and they make
    Lemma 2.8 hold on the nose: (y_i - y_j) -> (y_{1-j} - y_{1-i}).)"""
    syms = f.free_symbols
    sub = {}
    for s in syms:
        name = str(s)
        var, idx = name.split("_")
        i = -int(idx[1:]) if idx.startswith("m") else int(idx)
        sub[s] = -x(1 - i) if var == "x" else -y(1 - i)
    return f.xreplace(sub)


def at_x_eq_y(f):
    return f.xreplace({s: y(int(str(s)[2:].replace("m", "-"))) for s in f.free_symbols if str(s).startswith("x_")})


# --------------------------------------------------------------- BPDs on regions
def bpds(cells, N=None, E=None, S=None, W=None, limit=None):
    """All BPDs of a finite region `cells` (rows: intervals) with the boundary
    condition (N, E, S, W).  Returns list of dicts (r, c) -> tile."""
    N, E, S, W = N or {}, E or {}, S or {}, W or {}
    cells = set(cells)
    rows = sorted({r for r, _ in cells}, reverse=True)  # bottom first
    out = []

    def row_fill(r, state):
        cols = sorted(c for (rr, c) in cells if rr == r)
        res = []

        def go(k, carry, new_state, tiles):
            if k == len(cols):
                if carry == E.get(r):
                    res.append((new_state, tiles))
                return
            c = cols[k]
            b = state.get(c) if (r + 1, c) in cells else S.get(c)
            if k == 0:  # rows are intervals: the left boundary of the row
                carry = W.get(r)
            opts = []
            if b is None and carry is None:
                opts.append(("O", None, None))
            elif b is not None and carry is None:
                opts += [("|", b, None), ("r", None, b)]
            elif b is None:
                opts += [("-", None, carry), ("j", carry, None)]
            elif b < carry:  # valid labeling at a cross
                opts.append(("+", b, carry))
            for t, up, right in opts:
                ns = dict(new_state)
                if (r - 1, c) in cells:
                    ns[c] = up
                elif up != N.get(c):
                    continue
                go(k + 1, right, ns, {**tiles, (r, c): t})

        go(0, None, {}, {})
        return res

    def rec(i, state, grid):
        if limit is not None and len(out) >= limit:
            return
        if i == len(rows):
            out.append(grid)
            return
        for ns, tiles in row_fill(rows[i], state):
            rec(i + 1, ns, {**grid, **tiles})

    rec(0, {}, {})
    return out


def weight(D):
    return prod(x(i) - y(j) for (i, j), t in D.items() if t == "O")


def blanks(D):
    return sorted((i, j) for (i, j), t in D.items() if t == "O")


def trace(D, cells, start, d):
    """Follow a pipe in the paper's direction from a boundary edge.
    start=(r, c); d = 'D' (entering from the top) or 'L' (from the right).
    Returns ('S', column) or ('W', row)."""
    r, c = start
    while (r, c) in cells:
        t = D[(r, c)]
        if d == "D":
            if t in "|+":
                r += 1
            elif t == "j":
                d, c = "L", c - 1
            else:
                raise ValueError("pipe entering from the top of %s" % t)
        else:
            if t in "-+":
                c -= 1
            elif t == "r":
                d, r = "D", r + 1
            else:
                raise ValueError("pipe entering from the right of %s" % t)
    return ("S", c) if d == "D" else ("W", r)


# --------------------------------------------------------------- the big picture
def full_cells(a, n):
    return {(r, c) for r in range(a, n + 1) for c in range(a, n + 1)}


def full_bpds(w, a, n, limit=None):
    """BPDs of w in S_[a,n] on the square [a,n]^2 (labels: pipe i enters row i,
    exits column w(i))."""
    winv = inverse(w)
    return bpds(full_cells(a, n), E={r: r for r in range(a, n + 1)},
                S={c: winv.get(c, c) for c in range(a, n + 1)}, limit=limit)


def sigma_of_phi(phi, a, n):
    """sigma in S_- from a horizon section phi (column -> label <= 0); labels
    below a are fixed points.  Returned as a permutation of a window [a, N]."""
    s = {lab: c for c, lab in phi.items()}
    for i in range(a, 1):
        s.setdefault(i, i)
    used = set(s.values())
    N = max([n] + list(used))
    rest = [c for c in range(a, N + 1) if c not in used]
    for k, c in enumerate(rest):
        s[k + 1] = c
    return s


def horizon_sigma(D, w, a, n):
    """The sigma of a full BPD (window [a,n]^2) from its cross section under row 0."""
    cells = full_cells(a, n)
    vert, _ = labels_on_edges(D, cells, {r: r for r in range(a, n + 1)}, {})
    phi = {c: vert[(1, c)] for c in range(a, n + 1) if (1, c) in vert}
    return sigma_of_phi(phi, a, n)


def phi_of_sigma(sigma, a=None):
    """Horizon section of sigma: column sigma(i) carries pipe i, for i <= 0.
    Labels in [a, 0] missing from the dict are fixed points."""
    lo = min(list(sigma) + [0]) if a is None else a
    return {sigma.get(i, i): i for i in range(lo, 1)}


def lower_cells(a, n):
    return {(r, c) for r in range(1, n + 1) for c in range(a, n + 1)}


def lower_bpds(sigma, w, a, n):
    """LBPD(sigma, w) restricted to rows [1,n], columns [a,n]."""
    winv = inverse(w)
    phi = phi_of_sigma(sigma, a)
    N = {c: phi[c] for c in range(a, n + 1) if c in phi}
    return bpds(lower_cells(a, n), N=N, E={r: r for r in range(1, n + 1)},
                S={c: winv.get(c, c) for c in range(a, n + 1)})


def upper_bpds(sigma, a, n):
    phi = phi_of_sigma(sigma, a)
    cells = {(r, c) for r in range(a, 1) for c in range(a, n + 1)}
    return bpds(cells, E={r: r for r in range(a, 1)}, S={c: phi.get(c) for c in range(a, n + 1)})


def window_for(*ps):
    lo = min([0] + [min(p) for p in ps if p] + [support(p)[0] for p in ps if p])
    hi = max([1] + [max(p) for p in ps if p])
    return lo, hi


def lower_poly(sigma, w):
    a, n = window_for(sigma, w)
    return sp.expand(sum(weight(D) for D in lower_bpds(sigma, w, a, n))), (a, n)


# --------------------------------------------------------------- diagonal cut
def trap_cells(a, n):
    return {(r, c) for r in range(1, n + 1) for c in range(a, r + 1)}


def tri_cells(n):
    return {(r, c) for r in range(1, n + 1) for c in range(r + 1, n + 1)}


def labels_on_edges(D, cells, E_labels, N_labels):
    """Return the label of the pipe on every edge: vert[(r,c)] = label on the
    TOP edge of (r,c); horiz[(r,c)] = label on the RIGHT edge of (r,c)."""
    vert, horiz = {}, {}
    starts = [((r, max(c for (rr, c) in cells if rr == r)), "L", lab) for r, lab in E_labels.items()]
    starts += [((min(r for (r, cc) in cells if cc == c), c), "D", lab) for c, lab in N_labels.items()]
    for (r, c), d, lab in starts:
        if d == "L":
            horiz[(r, c)] = lab
        else:
            vert[(r, c)] = lab
        while (r, c) in cells:
            t = D[(r, c)]
            if d == "D":
                if t in "|+":
                    r += 1
                    vert[(r, c)] = lab
                elif t == "j":
                    d, c = "L", c - 1
                    horiz[(r, c)] = lab
            else:
                if t in "-+":
                    c -= 1
                    horiz[(r, c)] = lab
                elif t == "r":
                    d, r = "D", r + 1
                    vert[(r, c)] = lab
    return vert, horiz


def diagonal_cut(D, sigma, w, a, n):
    """Split a lower BPD into (trapezoid tiles, triangle tiles, gamma, theta)."""
    cells = lower_cells(a, n)
    phi = phi_of_sigma(sigma, a)
    N = {c: phi[c] for c in range(a, n + 1) if c in phi}
    vert, horiz = labels_on_edges(D, cells, {r: r for r in range(1, n + 1)}, N)
    trap = {k: t for k, t in D.items() if k[1] <= k[0]}
    tri = {k: t for k, t in D.items() if k[1] > k[0]}
    winv = inverse(w)
    gN = {c: N[c] for c in range(a, 2) if c in N}
    gN.update({r: vert[(r, r)] for r in range(2, n + 1) if (r, r) in vert})
    gE = {r: horiz[(r, r)] for r in range(1, n) if (r, r) in horiz}
    gE[n] = n
    gS = {c: winv.get(c, c) for c in range(a, n + 1)}
    gamma = (gN, gE, gS)
    theta = ({c: N[c] for c in range(2, n + 1) if c in N}, {r: r for r in range(1, n)},
             {r: gN[r] for r in range(2, n + 1) if r in gN}, {r: gE[r] for r in range(1, n) if r in gE})
    return trap, tri, gamma, theta


def trap_fillings(gamma, a, n):
    gN, gE, gS = gamma
    return bpds(trap_cells(a, n), N=gN, E=gE, S=gS)


def tri_fillings(theta, n):
    tN, tE, tS, tW = theta
    return bpds(tri_cells(n), N=tN, E=tE, S=tS, W=tW)


def canonical_data(gamma, a, n, D_trap=None):
    """U, W, alpha of Definition 4.9 (after the move of (20) for rows whose
    diagonal cell has no pipe from the top).  Returns None in the vanishing
    case.  Also returns the transformed boundary and p."""
    gN, gE, gS = dict(gamma[0]), dict(gamma[1]), dict(gamma[2])
    for r in range(1, n + 1):
        if gN.get(r) is None and gE.get(r) is None:
            return None  # the diagonal cell is blank: vanishes at x = y
    moved = []
    for r in range(1, n + 1):
        if gN.get(r) is None:
            gN[r] = gE.pop(r)
            moved.append(r)
    # canonical labels: walk columns a..n, inserting row r's right entry after column r
    order = []
    for c in range(a, n + 1):
        if c in gN:
            order.append(("N", c))
        if 1 <= c <= n and gE.get(c) is not None:
            order.append(("E", c))
    assert len(order) == n - a + 1, (order, a, n)
    lab = {pt: a + k for k, pt in enumerate(order)}
    p = {c: lab[("N", c)] for c in range(1, n + 1)}
    alpha = [p[i + 1] - 1 for i in range(1, n)]
    # U(label) = exit column: pipes keep their original labels in gamma, so map
    old_to_new = {}
    for (kind, k), new in lab.items():
        old = gN[k] if kind == "N" else gE[k]
        old_to_new[old] = new
    U = {old_to_new[old]: c for c, old in gS.items()}
    # W: iota_1(W) agrees with gamma_N^{-1} on [a, p_1], decreasing on (p_1, 1]
    p1 = p[1]
    gNinv = {lab[("N", c)]: c for c in range(a, 2) if ("N", c) in lab}
    iota = {i: gNinv[i] for i in range(a, p1 + 1)}
    rest = sorted(set(range(a, 2)) - set(iota.values()), reverse=True)
    for k, i in enumerate(range(p1 + 1, 2)):
        iota[i] = rest[k]
    Wp = {}
    big = {p[j]: j for j in range(2, n + 1)}
    vals = iter(iota[i] for i in range(a, 2))
    for pos in range(a, n + 1):
        Wp[pos] = big[pos] if pos in big else next(vals)
    return {"U": U, "W": Wp, "alpha": alpha, "p": p, "moved": moved, "labels": lab}


# --------------------------------------------------------------- chains
def is_cover(u, i, j):
    if u[i] > u[j]:
        return False
    return not any(u[i] < u[t] < u[j] for t in range(i + 1, j))


def k_chains(u, k, a, n):
    """All increasing k-chains from u (positions a..n); yields (end, steps)."""
    res = []

    def rec(cur, last, steps):
        res.append((dict(cur), tuple(steps)))
        for i in range(a, k + 1):
            for j in range(k + 1, n + 1):
                if is_cover(cur, i, j) and cur[i] > last:
                    nxt = dict(cur)
                    nxt[i], nxt[j] = nxt[j], nxt[i]
                    rec(nxt, cur[i], steps + [(i, j)])

    rec(dict(u), -10**9, [])
    return res


def fix(u, v, k, n):
    return [u[t] for t in range(k + 1, n + 1) if u[t] == v[t]]


def chain_terms(U, W, alpha, zs, a, n):
    """C(U, W, alpha) with variables zs; returns list of (weight, sequence, fixes)."""
    out = []

    def rec(idx, cur, seq, fixes):
        if idx == len(alpha):
            if cur == W:
                wt = prod(zs[i] - y(j) for i, fx in enumerate(fixes) for j in fx)
                out.append((wt, seq, fixes))
            return
        seen = set()
        for end, steps in k_chains(cur, alpha[idx], a, n):
            key = tuple(sorted(end.items()))
            if key in seen:
                raise RuntimeError("two increasing chains between the same permutations")
            seen.add(key)
            rec(idx + 1, end, seq + [end], fixes + [fix(cur, end, alpha[idx], n)])

    rec(0, dict(U), [dict(U)], [])
    return out


def vandermonde(n):
    return prod(x(i) - y(j) for i in range(1, n + 1) for j in range(i + 1, n + 1))


def form_type(i, j):
    if 0 < i < j:
        return 1
    if i < j <= 0:
        return 2
    if j <= 0 < i:
        return 3
    return None  # not of the form i < j in the order


def reduced_terms(U, W, alpha, a, n):
    """Terms of Prop 4.17 at x = y: list of factor lists [(i, j), ...] (zero terms dropped)."""
    terms = []
    for wt, seq, fixes in chain_terms(U, W, alpha, [x(i) for i in range(1, n)], a, n):
        fs = [(i + 1, j) for i, fx in enumerate(fixes) for j in fx if j <= i + 1]
        if any(i == j for i, j in fs):
            continue
        terms.append(sorted(fs))
    return terms


# --------------------------------------------------------------- Corollary 3.9
def wl_perm(lam):
    a = -max(1, len([p for p in lam if p > 0]))
    return w_lambda(lam, a)


def contributing_sigmas(w, margin=2):
    """sigma in S_- that occur as horizon sections of BPDs of w."""
    lo, hi = support(w)
    a, n = min(lo, 0) - margin, max(hi, 1)
    found = {}
    for D in full_bpds(w, a, n):
        s = horizon_sigma(D, w, a, n)
        key = tuple(sorted((i, v) for i, v in s.items() if i != v))
        found[key] = s
    return list(found.values())


def lower_at_y(sigma, w):
    f, _ = lower_poly(sigma, w)
    return sp.expand(at_x_eq_y(f))


def j_cor39(w, lam, sigmas=None, detail=False):
    sigmas = contributing_sigmas(w) if sigmas is None else sigmas
    lamc = conjugate(lam)
    total, parts = sp.Integer(0), []
    for s in sigmas:
        low = lower_at_y(s, w)
        if low == 0:
            continue
        up = sp.expand(omega1(lower_at_y(wl_perm(lamc), neg(s))))
        if up == 0:
            continue
        parts.append((s, up, low))
        total += up * low
    total = sp.expand(total)
    return (total, parts) if detail else total


# --------------------------------------------------------------- the positive formula
def flip_factor(f):
    """omega_1 on a form (y_i - y_j): gives (y_{1-j} - y_{1-i})."""
    i, j = f
    return (1 - j, 1 - i)


def form(f):
    return y(f[0]) - y(f[1])


def positive_lower(sigma, w, check=True):
    """Positive formula for S_down_{sigma,w}(y;y) via the diagonal cut and chains.
    Returns (terms, groups): terms = list of factor lists; groups = per gamma data."""
    a, n = window_for(sigma, w)
    Ds = lower_bpds(sigma, w, a, n)
    groups = {}
    for D in Ds:
        trap, tri, gamma, theta = diagonal_cut(D, sigma, w, a, n)
        key = tuple(tuple(sorted(m.items())) for m in gamma)
        g = groups.setdefault(key, {"gamma": gamma, "theta": theta, "D": [], "trap": [], "tri": []})
        g["D"].append(D)
    terms = []
    for key, g in groups.items():
        T = trap_fillings(g["gamma"], a, n)
        R = tri_fillings(g["theta"], n)
        g["trap"], g["tri"] = T, R
        if check:  # Prop 3.11: the D's with this gamma are exactly T x R
            assert len(T) * len(R) == len(g["D"]), (len(T), len(R), len(g["D"]))
        tri_terms = []
        for Dt in R:
            fs = blanks(Dt)
            assert all(form_type(i, j) == 1 for i, j in fs)
            tri_terms.append(fs)
        g["tri_terms"] = tri_terms
        cd = canonical_data(g["gamma"], a, n)
        g["canon"] = cd
        if cd is None:  # a blank diagonal cell: every term vanishes at x = y
            g["trap_terms"] = []
            assert all(at_x_eq_y(weight(Dt)) == 0 for Dt in T)
            continue
        U, Wp, al = cd["U"], cd["W"], cd["alpha"]
        tt = reduced_terms(U, Wp, al, a, n)
        for fs in tt:
            assert all(form_type(i, j) == 3 for i, j in fs) and len(set(fs)) == len(fs)
        g["trap_terms"] = tt
        if check:
            lhs = sp.expand(sum(weight(Dt) for Dt in T) * vandermonde(n))
            rhs = sp.expand(sum(t for t, *_ in chain_terms(U, Wp, al, [x(i) for i in range(1, n)], a, n)))
            rhs2 = sp.expand(sum(t for t, *_ in chain_terms(U, Wp, al[::-1], [x(i) for i in range(n - 1, 0, -1)], a, n)))
            assert sp.expand(lhs - rhs) == 0 and sp.expand(lhs - rhs2) == 0, "Cor 4.12 fails"
            t_y = sp.expand(sum(at_x_eq_y(weight(Dt)) for Dt in T))
            assert sp.expand(t_y - sum(prod(form(f) for f in fs) for fs in tt)) == 0
        for A in tt:
            for B in tri_terms:
                terms.append(sorted(A + B))
    return terms, groups, (a, n)


def positive_j(w, lam, check=True):
    """The Chou-Yu positive formula for j^w_lambda(y): list of factor lists."""
    lamc = conjugate(lam)
    out, info = [], []
    for s in contributing_sigmas(w):
        low_terms, low_groups, _ = positive_lower(s, w, check)
        if not low_terms:
            continue
        up_terms, up_groups, _ = positive_lower(wl_perm(lamc), neg(s), check)
        if not up_terms:
            continue
        flipped = [sorted(flip_factor(f) for f in t) for t in up_terms]
        info.append({"sigma": s, "up": flipped, "low": low_terms, "up_groups": up_groups, "low_groups": low_groups})
        for A in flipped:
            for B in low_terms:
                out.append(sorted(A + B))
    if check:
        direct = j_cor39(w, lam)
        total = sp.expand(sum(prod(form(f) for f in t) for t in out))
        assert sp.expand(total - direct) == 0, ("positive formula != Cor 3.9", total, direct)
        for t in out:  # Anderson's refined positivity
            types = [form_type(*f) for f in t]
            assert None not in types
            for k in (1, 2):
                fs = [f for f, ty in zip(t, types) if ty == k]
                assert len(fs) == len(set(fs))
            fs = [f for f, ty in zip(t, types) if ty == 3]
            assert all(fs.count(f) <= 2 for f in fs)
    return out, info


# --------------------------------------------------------------- Definition 4.8: chain(D)
def trap_chain(Dt, cd, a, n):
    """chain(D) = (u_n, ..., u_1) for a trapezoid BPD with canonical data cd
    (after the move (20)).  Returns [u_n, ..., u_1] (bottom of the table first)."""
    cells = trap_cells(a, n)
    lab = cd["labels"]
    # canonical boundary labels
    N = {k: v for (kind, k), v in lab.items() if kind == "N"}
    E = {k: v for (kind, k), v in lab.items() if kind == "E"}
    D = dict(Dt)
    for r in cd["moved"]:  # the move (20): the row-r entry becomes a column-r entry
        D[(r, r)] = {"r": "|", "-": "j"}[D[(r, r)]]
    vert, _ = labels_on_edges(D, cells, E, N)
    p = cd["p"]
    us = {}
    for r in range(1, n + 1):
        phi = {c: vert.get((r, c)) for c in range(a, r + 1)}
        phinv = {l: c for c, l in phi.items() if l is not None}
        iota = {}
        for lbl in range(a, p[r] + 1):
            iota[lbl] = phinv[lbl]
        rest = sorted(set(range(a, r + 1)) - set(iota.values()), reverse=True)
        for k, pos in enumerate(range(p[r] + 1, r + 1)):
            iota[pos] = rest[k]
        u = {}
        forced = {p[j]: j for j in range(r + 1, n + 1)}
        vals = iter(iota[i] for i in range(a, r + 1))
        for pos in range(a, n + 1):
            u[pos] = forced[pos] if pos in forced else next(vals)
        us[r] = u
    return [us[r] for r in range(n, 0, -1)]
