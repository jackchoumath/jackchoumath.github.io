"""Procedural sound design for the Schubert calculus reel (15.0 s, 48 kHz).

Cue times come from the film itself (out/cues.json, written by cues.mjs), so
picture and score cannot drift apart.

    node cues.mjs && python3 audio.py out/score.wav
"""
import json
import os
import sys

import numpy as np

import audio_lib as A
from audio_lib import SR

DUR = 15.0
HERE = os.path.dirname(os.path.abspath(__file__))


def hz(note):
    """Note name like 'D4', 'F#5' -> frequency."""
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    name, octv = note[:-1], int(note[-1])
    midi = 12 * (octv + 1) + names[name]
    return 440.0 * 2 ** ((midi - 69) / 12)


def ks_pluck(freq, dur=1.4, damp=0.9965, bright=0.55, seed=0):
    """Karplus-Strong plucked string."""
    n = int(dur * SR)
    N = max(2, int(round(SR / freq)))
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    y[:N] = A.onepole_lp(rng.uniform(-1, 1, N), 2000 + 6000 * bright)
    for i in range(N, n):
        y[i] = damp * 0.5 * (y[i - N] + y[i - N - 1])
    y *= np.minimum(1, A.secs(dur) / 0.002)
    return y - np.mean(y)


def marimba(freq, dur=0.9):
    t = A.secs(dur)
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.35)
    x += 0.35 * np.sin(2 * np.pi * freq * 4.0 * t) * np.exp(-t / 0.06)
    x += 0.12 * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t / 0.02)
    return x * np.minimum(1, t / 0.0015)


def swish(dur, f0, f1, q=1.4, seed=0, gain_curve=2.0):
    x = A.svf(A.noise(dur, seed), np.geomspace(f0, f1, int(dur * SR)), q=q, mode='bp')
    return x * np.sin(np.linspace(0, np.pi, len(x))) ** gain_curve


def build(cue):
    dry = A.Bus(DUR)   # subs, clicks: no reverb
    wet = A.Bus(DUR)   # tonal: through the reverb
    hits = cue['hits']

    # ------------------------------------------------ bed: D minor(add9) -> D major -> Dadd9
    two = cue['two']
    pad1 = A.pad([hz('D2'), hz('A2'), hz('D3'), hz('F3'), hz('E4')], two + 0.02, attack=1.4, release=0.12, bright=900, seed=1)
    pad1 = A.onepole_lp(pad1, np.linspace(380, 1100, len(pad1)))
    pad2 = A.pad([hz('D2'), hz('A2'), hz('D3'), hz('F#3'), hz('A3'), hz('F#4'), hz('E4')], cue['title'] - two + 0.6, attack=0.06, release=0.7, bright=1500, seed=2)
    pad2 = A.onepole_lp(pad2, np.linspace(1100, 2200, len(pad2)))
    pad3 = A.pad([hz('D2'), hz('A2'), hz('D3'), hz('F#3'), hz('E4'), hz('A4')], DUR - cue['title'], attack=0.08, release=1.4, bright=2200, seed=3)
    pad3 = A.onepole_lp(pad3, 2600)
    wet.place(0.0, A.stereo(pad1 * 0.9, 0), 0.30)
    wet.place(two, A.stereo(pad2, 0), 0.40)
    wet.place(cue['title'] + 0.06, A.stereo(pad3, 0), 0.24)

    # ------------------------------------------------ act I: sub swell, four glass pings
    swell = A.sine(36, 1.4) * np.minimum(1, A.secs(1.4) / 0.5) * np.exp(-np.maximum(0, A.secs(1.4) - 0.5) / 0.5)
    dry.place(0.0, A.stereo(swell, 0), 0.22)
    for i, (n, pan) in enumerate(zip(['D5', 'F5', 'A5', 'C6'], [-0.35, 0.25, 0.45, -0.1])):
        t0 = cue['lineIn'][i]
        wet.place(t0, A.fm_bell(hz(n), 4.0, ratio=3.5, index=1.6, decay=0.8, seed=i), 0.15, pan)
        wet.place(t0, swish(0.35, 1800, 7000, seed=20 + i), 0.06, pan)
    breath = A.svf(A.noise(0.9, 30), 2100, q=0.8, mode='bp') * np.sin(np.linspace(0, np.pi, int(0.9 * SR))) ** 2
    wet.place(0.95, breath, 0.05, 0.1)

    # ------------------------------------------------ act II: the probe weaves the surface
    s0, s1 = cue['sweep']
    tt = A.secs(s1 - s0 + 0.4)
    # Airy scan whose brightness follows the probe's speed (ease in-out).
    speed = np.clip(np.sin(np.pi * np.clip(tt / (s1 - s0), 0, 1)), 0, 1)
    scan = A.svf(A.noise(len(tt) / SR, 40), 600 + 2600 * speed, q=1.6, mode='bp') * speed ** 1.5
    wet.place(s0, A.stereo(scan, 0), 0.16)
    # One glass note per string the probe lays down: an ascending D-major pentatonic run.
    gl = ['D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7']
    swept = [t for t in cue['strings'] if t < s1 - 0.4]
    for k, t0 in enumerate(swept):
        frac = k / max(1, len(swept) - 1)
        wet.place(t0, A.fm_bell(hz(gl[min(len(gl) - 1, int(frac * len(gl)))]), 0.5, ratio=3.0, index=0.9, decay=0.16, bright_decay=0.05), 0.12, -0.6 + 1.2 * frac)
        dry.place(t0, A.tick(4200, 0.03, seed=50 + k), 0.03, -0.6 + 1.2 * frac)
    # The surface closes: a soft shimmer of plucked strings.
    for k in range(10):
        t0 = s1 - 0.15 + k * 0.045
        wet.place(t0, ks_pluck(hz(['D6', 'G6', 'A6', 'E6', 'C7'][k % 5]), 0.9, damp=0.994, bright=0.3, seed=k), 0.09, -0.4 + 0.08 * k)
    # The gap: a faint beating pair while the probe visibly misses l4.
    g0, g1 = cue['gap']
    beat = (A.sine(110, g1 - g0) + A.sine(113, g1 - g0)) * np.sin(np.linspace(0, np.pi, int(round((g1 - g0) * SR)))) ** 2
    wet.place(g0, A.stereo(beat, 0), 0.09)
    # Foreshadow: the probe brushes l4 twice; two faint glass pings.
    for t0, n, pan in zip(cue['foreshadow'], ['A4', 'E5'], [-0.45, 0.45]):
        wet.place(t0, A.fm_bell(hz(n), 1.2, ratio=1.4, index=1.5, decay=0.4), 0.10, pan)
    # Tension drone from the sweep to the hits, cut just before the first hit.
    d0, d1 = s0 - 0.35, hits[0] - 0.12
    drone = A.pad([hz('D2'), hz('A2'), hz('D3')], d1 - d0, attack=1.1, release=0.02, bright=1800, seed=7)
    drone = A.onepole_lp(drone, np.geomspace(250, 2400, len(drone)))
    drone[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))
    dry.place(d0, A.stereo(drone, 0), 0.6)

    # ------------------------------------------------ act III: the fourth line, two hits, the 2
    r0 = cue['l4back'][0] - 0.4
    wet.place(r0, A.stereo(A.riser(hits[0] - 0.12 - r0, 300, 2400, seed=60), 0.0), 0.12)
    p0, p1 = cue['pulse']
    zf = np.linspace(500, 1500, int((p1 - p0) * SR))
    wet.place(p0, A.stereo(A.sine(zf, p1 - p0) * np.sin(np.linspace(0, np.pi, len(zf))) ** 2, 0), 0.035)
    for i, (t0, note, pan) in enumerate(zip(hits, ['A4', 'E5'], [-0.45, 0.45])):
        dry.place(t0, A.sub_hit(hz('A1'), 1.6, drop=1.3, decay=0.28, click=0.4, seed=70 + i), 0.5, pan * 0.3)
        wet.place(t0, A.fm_bell(hz(note), 3.0, ratio=1.4, index=3.0, decay=1.2, bright_decay=0.2), 0.20, pan)
        crack = A.onepole_lp(A.noise(0.05, 80 + i), 5000) * np.exp(-A.secs(0.05) / 0.008)
        dry.place(t0, crack, 0.25, pan)
    # The numeral: boom + bell cluster, pad turns major, then the double strike.
    dry.place(two, A.stereo(A.sub_hit(hz('D2') / 2, 3.5, drop=0.5, decay=0.75, click=0.1, seed=90), 0), 0.62)
    dry.place(two, A.stereo(marimba(hz('D3'), 1.8) * 0.8, 0), 0.30)
    for j, (n, d) in enumerate(zip(['D4', 'F#4', 'A4', 'E5'], [0, 0.012, 0.024, 0.036])):
        wet.place(two + d, A.fm_bell(hz(n), 5.0, ratio=2.0, index=1.6, decay=1.5, bright_decay=0.3), 0.16, [-0.3, -0.1, 0.1, 0.3][j])
    wet.place(two + 0.12, A.fm_bell(hz('A4'), 2.6, ratio=2.0, index=1.4, decay=1.2, bright_decay=0.25), 0.09, 0.25)
    dry.place(two + 0.12, A.stereo(A.sub_hit(hz('D2'), 1.4, drop=0.4, decay=0.3, click=0.08, seed=91), 0), 0.15)

    # ------------------------------------------------ act IV: overhead rise, collapse, the ring
    a0, a1 = cue['rise']
    wet.place(a0, A.stereo(A.whoosh(a1 - a0 + 0.2, 250, 5200, q=1.0, seed=100, curve=1.4, peak=0.75), 0), 0.28)
    f0, f1 = cue['fly']
    wet.place(f0, A.stereo(swish(f1 - f0, 900, 3800, q=1.6, seed=105, gain_curve=1.2), 0.1), 0.10)
    for i, ta in enumerate(cue['sparks']):
        wet.place(ta, A.fm_bell(hz(['D6', 'F#6', 'A6', 'D7'][i]), 0.6, ratio=3.0, index=0.6, decay=0.18), 0.06, -0.2 + 0.13 * i)
    for d, f in [(0.0, 3000), (0.045, 3400)]:
        dry.place(cue['formula'] + d, A.tick(f, 0.05, seed=110), 0.12, 0.0)
    wet.place(cue['formula'], A.fm_bell(hz('F#6'), 1.6, ratio=3.0, index=1.2, decay=0.6), 0.06, 0.1)
    wet.place(cue['formula'], A.fm_bell(hz('D5'), 1.2, ratio=2.0, index=0.8, decay=0.4), 0.08, 0.0)
    o0, o1 = cue['rosetteOut']
    wet.place(o0, A.stereo(A.whoosh(o1 - o0, 6000, 500, q=1.2, seed=101, curve=0.8, peak=0.85), 0), 0.14)
    thup = A.sine(np.linspace(140, 90, int(0.12 * SR)), 0.12) * np.exp(-A.secs(0.12) / 0.03)
    dry.place(cue['nodes'][0], A.stereo(thup, 0), 0.45)
    # Comet arrivals: D5, E5, the F#5 + A5 dyad where the paths split, B5, D6 at the square.
    ranks = cue['ranks']
    arrivals = [('D5',), ('E5',), ('F#5', 'A5'), ('B5',), ('D6', 'A5')]
    for r, notes in enumerate(arrivals):
        for j, n in enumerate(notes):
            pan = 0 if len(notes) == 1 else (-0.35 if j == 0 else 0.35)
            wet.place(ranks[r], marimba(hz(n), 1.8), 0.24, pan + ([300, 575, 850, 1125, 1400][r] - 960) / 960 * 0.8)
    wet.place(ranks[4], A.fm_bell(hz('D7'), 1.8, ratio=2.01, index=0.6, decay=0.7), 0.05, 0.2)
    wet.place(ranks[4] + 0.12, marimba(hz('A5')), 0.10, 0.3)

    # ------------------------------------------------ act V: title
    q0, q1 = cue['out4']
    rev = A.svf(A.noise(q1 - q0 + 0.12, 120), np.linspace(1500, 9000, int((q1 - q0 + 0.12) * SR)), q=0.7, mode='hp')
    rev = A.onepole_lp(rev, 11000) * np.linspace(0, 1, len(rev)) ** 3
    wet.place(q0, A.stereo(rev, 0), 0.20)
    sq0, sq1 = cue['squareFly']
    wet.place(sq0, A.stereo(swish(sq1 - sq0, 700, 2600, q=1.8, seed=125, gain_curve=1.5), -0.2), 0.08)
    impact = cue['title'] + 0.08
    dry.place(impact, A.stereo(A.sub_hit(hz('D2') / 2, 3.5, drop=0.6, decay=0.9, click=0.15, seed=130), 0), 0.6)
    dry.place(impact, A.stereo(marimba(hz('D3'), 1.8) * 0.8, 0), 0.26)
    for j, n in enumerate(['D5', 'A5', 'E6']):
        wet.place(impact + 0.01 * j, A.fm_bell(hz(n), 3.5, ratio=2.0, index=1.4, decay=1.8, bright_decay=0.35), 0.10, [-0.25, 0.25, 0][j])
    wet.place(impact + 0.45, A.fm_bell(2350, 1.0, ratio=1.5, index=0.5, decay=0.4), 0.025, 0.0)
    for i, (t0, n) in enumerate(zip(cue['catalan'], ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7'])):
        wet.place(t0, A.fm_bell(hz(n), 1.2, ratio=3.0, index=0.8, decay=0.35), 0.05, -0.5 + 0.2 * i)
    # A tiny double strike as the film fades.
    for d, n in [(0.0, 'D6'), (0.12, 'A6')]:
        wet.place(cue['fadeOut'][0] - 0.22 + d, A.fm_bell(hz(n), 1.0, ratio=2.0, index=0.6, decay=0.45), 0.045, 0.0)

    wet_in = A.highpass2(wet.buf, 180)
    ret = A.reverb(wet_in, seconds=3.0, decay=2.0, mix=1.0)
    t = A.secs(DUR)
    h = hits[0]
    duck = np.interp(t, [h - 0.16, h - 0.10, h - 0.005, h + 0.1], [1, 0.22, 0.22, 1])
    wet_mix = 0.68 * wet.buf + 0.32 * ret
    wet_mix *= duck[:, None]
    mix = wet_mix + dry.buf
    fade = np.ones(len(mix))
    a = int(14.2 * SR)
    fade[a:] = np.linspace(1, 0, len(mix) - a) ** 1.5
    mix *= fade[:, None]
    return A.master(mix, ceiling_db=-2.6, drive=1.05)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', 'score.wav')
    with open(os.path.join(HERE, 'out', 'cues.json')) as f:
        cue = json.load(f)
    A.write_wav(out, build(cue))
    print('wrote', out)
