"""Verify the four-lines configuration on the hyperboloid x^2 + y^2 - z^2 = 1.

Rulings:  r_a(s) = (cos a - s sin a, sin a + s cos a, s)
          l_b(s) = (cos b + s sin b, sin b - s cos b, s)
L1..L3 are r-lines; L4 is an arbitrary line through two given points. The
script finds where L4 pierces the surface, the l-line (transversal) through
each piercing point, and checks every transversal meets all four lines.

    python3 geometry.py a1 a2 a3  px py pz  qx qy qz      (angles in degrees)
"""
import math
import sys


def r_line(a, s):
    return (math.cos(a) - s * math.sin(a), math.sin(a) + s * math.cos(a), s)


def l_line(b, s):
    return (math.cos(b) + s * math.sin(b), math.sin(b) - s * math.cos(b), s)


def l_angle_through(x, y, z):
    d = 1 + z * z
    return math.atan2((z * x + y) / d, (x - z * y) / d)


def meet_height(a, b):
    """Height where r_a meets l_b: tan((b - a) / 2)."""
    return math.tan((b - a) / 2)


def line_line_distance(p1, d1, p2, d2):
    n = (d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0])
    nn = math.sqrt(sum(c * c for c in n))
    w = tuple(p2[i] - p1[i] for i in range(3))
    if nn < 1e-12:
        return float('nan')
    return abs(sum(w[i] * n[i] for i in range(3))) / nn


def main(argv):
    a1, a2, a3 = (math.radians(float(v)) for v in argv[:3])
    P0 = tuple(float(v) for v in argv[3:6])
    P1 = tuple(float(v) for v in argv[6:9])
    d = tuple(P1[i] - P0[i] for i in range(3))
    # (P0 + t d) on surface: A t^2 + B t + C = 0
    A = d[0] ** 2 + d[1] ** 2 - d[2] ** 2
    B = 2 * (P0[0] * d[0] + P0[1] * d[1] - P0[2] * d[2])
    C = P0[0] ** 2 + P0[1] ** 2 - P0[2] ** 2 - 1
    disc = B * B - 4 * A * C
    print(f"L4 quadratic: A={A:.4f} B={B:.4f} C={C:.4f} disc={disc:.4f}")
    if disc <= 0:
        print("L4 does not pierce the hyperboloid in two real points")
        return
    ts = [(-B - math.sqrt(disc)) / (2 * A), (-B + math.sqrt(disc)) / (2 * A)]
    rs = [a1, a2, a3]
    for k, t in enumerate(ts):
        X = tuple(P0[i] + t * d[i] for i in range(3))
        b = l_angle_through(*X)
        chk = l_line(b, X[2])
        print(f"\nT{k + 1}: pierce point {tuple(round(c, 4) for c in X)} at t={t:.4f};"
              f" transversal l_b with b={math.degrees(b):.3f} deg (residual {max(abs(chk[i]-X[i]) for i in range(3)):.2e})")
        bd = (math.sin(b), -math.cos(b), 1.0)
        bp = l_line(b, 0)
        for j, a in enumerate(rs):
            z = meet_height(a, b)
            p = r_line(a, z)
            q = l_line(b, z)
            dist = line_line_distance(r_line(a, 0), (-math.sin(a), math.cos(a), 1.0), bp, bd)
            print(f"   meets L{j + 1} at z={z:+.4f}  point {tuple(round(c, 4) for c in p)}  gap {max(abs(p[i]-q[i]) for i in range(3)):.1e}  dist {dist:.1e}")
        dist4 = line_line_distance(P0, d, bp, bd)
        print(f"   meets L4 at {tuple(round(c, 4) for c in X)}  dist {dist4:.1e}")


if __name__ == '__main__':
    main(sys.argv[1:])
