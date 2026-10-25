"""Compute (and check) everything shown in the video for the running example

    w = [1, -1, 0, 3, 4, 2]  in S_[-1,4],   lambda = (2, 1),

and write sz_data.json.  Every identity used on screen is asserted here.
"""

import json

import sympy as sp

from sz import *

W_ONE = [1, -1, 0, 3, 4, 2]
LAM = (2, 1)
A, N = -3, 4          # drawing window for the whole plane / lower half-plane
TA = -1               # leftmost column shown for trapezoids and chain tables


def grid(D, rows, cols):
    return ["".join(D.get((r, c), " ") for c in cols) for r in rows]


def table(seq, labels, xs, n, a_show):
    """A chain sequence as the paper draws it: rows bottom to top, a red bar
    after position alpha, circled fixed values (blue = forced, green = other)."""
    rows = [oneline(u, a_show, n) for u in seq]
    circles, factors = [], []
    for s in range(len(labels)):
        u, v, k, i = seq[s], seq[s + 1], labels[s], xs[s]
        for t in range(k + 1, n + 1):
            if u[t] == v[t]:
                forced = i + 1 <= u[t] <= n
                circles.append([s, t, "blue" if forced else "green"])
                if not forced:
                    factors.append([i, u[t]])
    zero = any(i == j for i, j in factors)
    return {"rows": rows, "bars": labels, "vars": xs, "circles": circles,
            "factors": factors, "zero": zero}


def main():
    w = perm(-1, W_ONE)
    out = {"w": W_ONE, "w_window": [-1, 4], "lam": list(LAM), "length": length(w),
           "descents": descents(w, -1, 4)}

    # ---- the positive formula and the direct formula
    terms, info = positive_j(w, LAM, check=True)
    out["final"] = terms
    jy = j_cor39(w, LAM)
    assert sp.expand(jy - sum(prod(form(f) for f in t) for t in terms)) == 0
    direct = []
    for d in info:
        s = d["sigma"]
        up = sp.expand(omega1(lower_at_y(wl_perm(conjugate(LAM)), neg(s))))
        for g in d["low_groups"].values():
            for D in g["D"]:
                direct.append({"up": str(up), "low": blanks(D)})
    out["direct"] = direct

    # ---- the double Stanley expansion of w
    exp = []
    for mu in [(1,), (2,), (1, 1), (3,), (2, 1), (1, 1, 1), (4,), (3, 1), (2, 2), (2, 1, 1), (1, 1, 1, 1)]:
        t, _ = positive_j(w, mu, check=True)
        if t:
            exp.append({"mu": list(mu), "terms": t})
    out["expansion"] = exp

    # ---- the opening BPD: cross section sigma_1 and the (3,2) trapezoid below
    Ds = full_bpds(w, A, N)
    s1 = info[0]["sigma"]
    key = lambda s: {i: v for i, v in s.items() if i != v}
    cand = [D for D in Ds if key(horizon_sigma(D, w, A, N)) == key(s1) and (3, 2) in blanks(D)]
    cand.sort(key=lambda D: (len(blanks(D)), [-r for r, c in blanks(D)]))
    D0 = cand[0]
    out["opening"] = {"window": [A, N], "tiles": grid(D0, range(A, N + 1), range(A, N + 1)),
                      "blanks": blanks(D0)}
    out["n_full_bpds_window"] = len(Ds)

    # ---- all horizon sections that occur for w (in the window)
    sig_all = contributing_sigmas(w)
    contributing = [key(d["sigma"]) for d in info]
    out["sigmas"] = []
    for s in sig_all:
        phi = phi_of_sigma(s, A)
        low = lower_at_y(s, w)
        up = sp.expand(omega1(lower_at_y(wl_perm(conjugate(LAM)), neg(s))))
        out["sigmas"].append({"moved": sorted([i, v] for i, v in key(s).items()),
                              "phi": sorted([c, l] for c, l in phi.items() if A <= c <= N),
                              "low": str(sp.factor(low)), "up": str(sp.factor(up)),
                              "contributes": key(s) in contributing})

    # ---- per contributing sigma: lower piece, flipped upper piece, trapezoid chains
    out["pieces"] = []
    for d in info:
        s = d["sigma"]
        a, n = window_for(s, w)
        assert (a, n) == (A, N)
        piece = {"sigma_moved": sorted([i, v] for i, v in key(s).items()),
                 "phi": sorted([c, l] for c, l in phi_of_sigma(s, A).items()),
                 "neg_sigma_moved": sorted([i, v] for i, v in key(neg(s)).items()),
                 "grassmannian": all(s.get(i, i) < s.get(i + 1, i + 1) for i in range(min(s), 0)),
                 "lower": [], "flip": [], "up": d["up"], "low": d["low"]}
        for g in d["low_groups"].values():
            for D in g["D"]:
                piece["lower"].append({"tiles": grid(D, range(1, N + 1), range(A, N + 1)), "blanks": blanks(D)})
        sw = neg(s)
        fa, fn = window_for(wl_perm(conjugate(LAM)), sw)
        for g in d["up_groups"].values():
            for D in g["D"]:
                piece["flip"].append({"window": [fa, fn], "tiles": grid(D, range(1, fn + 1), range(fa, fn + 1)),
                                      "blanks": blanks(D),
                                      "flipped": [list(flip_factor(f)) for f in blanks(D)]})
        # an upper half-plane BPD of sigma for illustration (rows A..0)
        ups = upper_bpds(s, A, N)
        ups.sort(key=lambda D: (len(blanks(D)), [-r for r, c in blanks(D)]))
        piece["upper_example"] = grid(ups[0], range(A, 1), range(A, N + 1))
        piece["upper_example_blanks"] = blanks(ups[0])

        # the straight diagonal cut: which pipes cross the diagonal in cell (r, r).
        # A blank on the diagonal would give x_r - y_r, which vanishes at x = y.
        phi = phi_of_sigma(s, A)
        cells = lower_cells(A, N)
        top = {c: phi[c] for c in range(A, N + 1) if c in phi}
        gammas = []
        for g in d["low_groups"].values():
            for D in g["D"]:
                assert all(D[(r, r)] != "O" for r in range(1, N + 1))
                vert, horiz = labels_on_edges(D, cells, {r: r for r in range(1, N + 1)}, top)
                gammas.append([[vert.get((r, r)), horiz.get((r, r))] for r in range(1, N + 1)])
        assert all(gm == gammas[0] for gm in gammas), gammas
        piece["gamma_diag"] = gammas[0]          # per row r: [label on top edge, label on right edge] of (r, r)
        piece["gamma_top"] = sorted([c, l] for c, l in top.items() if c <= 0)

        # chains for the trapezoid groups of the lower piece
        piece["trap"] = []
        for g in d["low_groups"].values():
            cd = g["canon"]
            if cd is None:
                continue
            U, Wp, al = cd["U"], cd["W"], cd["alpha"]
            n_ = N
            fills = []
            for Dt in g["trap"]:
                ch = trap_chain(Dt, cd, A, n_)
                labels = al[::-1]
                xs = list(range(n_ - 1, 0, -1))
                fills.append({"tiles": grid(Dt, range(1, n_ + 1), range(TA, n_ + 1)),
                              "blanks": blanks(Dt),
                              "table": table(ch, labels, xs, n_, TA)})
                # eq. (21)
                wt = prod(x(xs[k]) - y(j) for k in range(n_ - 1) for j in fix(ch[k], ch[k + 1], labels[k], n_))
                assert sp.expand(weight(Dt) * vandermonde(n_) - wt) == 0
            fwd = []
            for wt, seq, fixes in chain_terms(U, Wp, al, [x(i) for i in range(1, n_)], A, n_):
                fwd.append(table(seq, al, list(range(1, n_)), n_, TA))
            # positive terms of Prop 4.17 agree with the reduced chain terms
            red = sorted(sorted(map(tuple, t["factors"])) for t in fwd if not t["zero"])
            assert red == sorted(g["trap_terms"]), (red, g["trap_terms"])
            piece["trap"].append({"U": oneline(U, TA, n_), "W": oneline(Wp, TA, n_), "alpha": al,
                                  "fillings": fills, "forward": fwd,
                                  "tri": [grid(Dr, range(1, n_ + 1), range(TA, n_ + 1)) for Dr in g["tri"]]})
        out["pieces"].append(piece)

    # ---- double Schur s_{(2,1)}: an upper half-plane pipedream of w_lambda
    wl = wl_perm(LAM)
    ups = upper_bpds(wl, A, 3)
    ups.sort(key=lambda D: (-len(blanks(D)) if len(blanks(D)) <= 3 else 9, [r for r, c in blanks(D)]))
    out["schur"] = {"lam": list(LAM), "window_cols": [A, 3],
                    "phi": sorted([c, l] for c, l in phi_of_sigma(wl, A).items()),
                    "tiles": grid(ups[0], range(A, 1), range(A, 4)), "blanks": blanks(ups[0]),
                    "w_lambda": oneline(wl, -2, 3)}

    with open("sz_data.json", "w") as f:
        json.dump(out, f, indent=1)
    print("final:", terms)
    print("pieces:", [(p["sigma_moved"], p["up"], p["low"], len(p["lower"])) for p in out["pieces"]])
    print("wrote sz_data.json")


if __name__ == "__main__":
    main()
