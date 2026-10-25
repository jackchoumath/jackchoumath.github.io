"""Generate (and double-check) every diagram shown in the video -> diagrams.json."""

import itertools
import json
from functools import reduce

import sympy as sp

import combinatorics as C
from combinatorics import y


def grid_rows(g, rows, cols):
    """Grid dict -> list of strings, one per row (top to bottom)."""
    return ["".join(g.get((i, j), " ") for j in cols) for i in rows]


def lam_of(S):
    s = sorted(S, reverse=True)
    return tuple(v for v in (s[k] + k for k in range(len(s))) if v > 0)


def rectangles(w, m, S):
    n = len(w)
    cols = list(range(-m + 1, n + 1))
    top = {s: -m + 1 + k for k, s in enumerate(sorted(S))}
    return C.bpds(range(1, n + 1), cols, {c: c for c in cols},
                  {i + 1: w[i] for i in range(n)}, top_out=top)


def full_bpds(w, m):
    """BPDs of 1^m x w on the window [-m+1, n]."""
    n = len(w)
    idx = list(range(-m + 1, n + 1))
    perm = {r: (r if r <= 0 else w[r - 1]) for r in idx}
    return C.bpds(idx, idx, {c: c for c in idx}, perm)


def empties(g):
    return sorted([i, j] for (i, j), t in g.items() if t == "O")


def chain_table(path, labels):
    """path: permutations from bottom to top; labels[(k, r)] for each step.
    Returns rows top->bottom with bar positions and highlight colours."""
    steps = []
    for s, (k, r) in enumerate(labels):
        u, v = path[s], path[s + 1]
        hl = []
        for p in range(k, len(u)):
            if u[p] == v[p]:
                hl.append([p, "green" if r < u[p] <= 4 else "yellow"])
        steps.append({"k": k, "r": r, "highlights": hl})
    return {"perms": [list(p) for p in path], "steps": steps}


def main():
    out = {}

    # --- pipe dreams and BPDs of small permutations -----------------------
    for w in [(1, 3, 2), (2, 1, 4, 3)]:
        name = "".join(map(str, w))
        out[f"pd_{name}"] = [sorted([list(c) for c in d]) for d in C.pipe_dreams(w)]
        n = len(w)
        out[f"bpd_{name}"] = [grid_rows(g, range(1, n + 1), range(1, n + 1))
                              for g in C.bpds_of_perm(w)]

    # --- back stable growth of 132 ----------------------------------------
    out["backstable_132"] = {}
    for m in range(0, 4):
        gs = full_bpds((1, 3, 2), m)
        idx = list(range(-m + 1, 4))
        # sort by the position of the empty tile, bottom-right first
        gs.sort(key=lambda g: -empties(g)[0][0])
        out["backstable_132"][m] = [grid_rows(g, idx, idx) for g in gs]
        for g in gs:
            (i, j), = [tuple(e) for e in empties(g)]
            assert i == j

    # --- cold open: w = 1432, lambda = (1) --------------------------------
    rs = rectangles((1, 4, 3, 2), 3, (-2, -1, 1))
    out["cold_1432"] = [empties(g) for g in rs]
    tot = sp.factor(sp.expand(sum(C.bpd_weight(g, xvar=y) for g in rs)))
    assert sp.expand(tot - (y(1) - y(3)) * (y(3) - y(0))) == 0

    # --- worked example: w = 2143, lambda = (1) ---------------------------
    m, w = 3, (2, 1, 4, 3)
    idx = list(range(-m + 1, 5))
    rs = rectangles(w, m, (-2, -1, 1))
    assert len(rs) == 4
    tot = sp.expand(sum(C.bpd_weight(g, xvar=y) for g in rs))
    assert sp.expand(tot - (y(1) - y(0))) == 0
    out["rect_2143"] = [grid_rows(g, range(1, 5), idx) for g in rs]
    # full BPDs (top part included) whose bottom is each rectangle
    fulls = full_bpds(w, m)
    out["full_2143"] = []
    for g in rs:
        match = [f for f in fulls if all(f[c] == t for c, t in g.items())]
        # prefer the top part with the empty tile lowest (closest to the cut)
        match.sort(key=lambda f: [-e[0] for e in empties(f) if e[0] <= 0])
        out["full_2143"].append([grid_rows(f, idx, idx) for f in match])
    out["window_2143"] = idx

    # --- double Schur examples: top parts for lambda=(1) and (2,1) --------
    out["schur"] = {}
    for S in [(-2, -1, 1), (-2, 0, 2)]:
        lam = lam_of(S)
        cols = list(range(-2, 4))
        # the pipe crossing the cut at the k-th smallest column exits row -2+k
        tops = C.bpds(range(-2, 1), cols,
                      {s: -2 + k for k, s in enumerate(sorted(S))},
                      {r: r for r in range(-2, 1)})
        out["schur"]["".join(map(str, lam))] = {
            "S": list(S), "cols": cols,
            "grids": [grid_rows(g, range(-2, 1), cols) for g in tops]}

    # --- the trapezoid example from the talk ------------------------------
    traps = C.bpds(range(1, 5), range(-1, 5), {c: c for c in range(-1, 5)}, {},
                   top_out={0: -1}, region=lambda i, j: j < i,
                   diag_rows={1: {1}, 2: {0}, 3: {3}, 4: {2, 4}})
    traps.sort(key=lambda g: -empties(g)[0][0])  # (3,2), (2,0), (1,-1)
    out["trap"] = {
        "cols": list(range(-1, 5)),
        "grids": [grid_rows(g, range(1, 5), range(-1, 5)) for g in traps],
        "empties": [empties(g) for g in traps],
    }
    u, wt = (-1, 1, 0, 3, 4, 2), (0, 1, 2, 3, 4, -1)
    vand = reduce(lambda a, b: a * b,
                  [y(i) - y(j) for i in range(1, 5) for j in range(i + 1, 5)])
    lab_glasses = [(4, 3), (3, 2), (2, 1)]
    lab_gauntlet = [(2, 1), (3, 2), (4, 3)]
    glasses = C.chain_sum(u, wt, [(k, y(r)) for k, r in lab_glasses])
    gauntlet = C.chain_sum(u, wt, [(k, y(r)) for k, r in lab_gauntlet])

    def term(t):
        return str(sp.factor(sp.cancel(t / vand)))

    # order glasses chains to match the trapezoid order (y3-y2, y2-y0, y1-y-1)
    want = [y(3) - y(2), y(2) - y(0), y(1) - y(-1)]
    gl_sorted = []
    for target in want:
        for t, p in glasses:
            if sp.expand(sp.cancel(t / vand) - target) == 0:
                gl_sorted.append(chain_table(p, lab_glasses) | {"weight": term(t)})
    want2 = [y(3) - y(-1), sp.Integer(0), y(1) - y(0)]
    ga_sorted = []
    for target in want2:
        for t, p in gauntlet:
            if sp.expand(sp.cancel(t / vand) - target) == 0:
                ga_sorted.append(chain_table(p, lab_gauntlet) | {"weight": term(t)})
    assert len(gl_sorted) == 3 and len(ga_sorted) == 3
    out["chains_glasses"] = gl_sorted
    out["chains_gauntlet"] = ga_sorted

    # --- chains for 132 (Lenart-Sottile order and reversed) ---------------
    out["chains_132_ls"] = [[list(q) for q in p] for _, p in
                            C.chain_sum((1, 3, 2), (3, 2, 1), [(1, sp.Symbol("x_1")), (2, sp.Symbol("x_2"))])]
    out["chains_132_yu"] = [[list(q) for q in p] for _, p in
                            C.chain_sum((1, 3, 2), (3, 2, 1), [(2, sp.Symbol("x_2")), (1, sp.Symbol("x_1"))])]

    # --- the increasing 3-chain example -----------------------------------
    chains = dict(C.k_chains((4, 1, 3, 2, 7, 6, 5), 3))
    assert (7, 2, 3, 1, 6, 4, 5) in chains
    out["kchain_example"] = {
        "steps": [list(s) for s in chains[(7, 2, 3, 1, 6, 4, 5)]],
    }
    w1 = (6, 2, 3, 1, 7, 4, 5)
    assert w1 in chains
    assert sp.expand(C.chain_step_weight((4, 1, 3, 2, 7, 6, 5), w1, 3, sp.Symbol("x_3"))
                     - (sp.Symbol("x_3") - y(7)) * (sp.Symbol("x_3") - y(5))) == 0

    with open("diagrams.json", "w") as f:
        json.dump(out, f, indent=1)
    print("wrote diagrams.json with keys:", ", ".join(out))


if __name__ == "__main__":
    main()
