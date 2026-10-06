"""Original stand-in score for the Schubert calculus timeline (32 s, 128 BPM, D minor).

Cinematic-electronic hybrid: ostinato strings and toms (intro), a build with a
snare roll and riser, an explosive sidechained drop, and a final impact. Writes
the audio and an exact beat/hit map (beats.json) that the film locks to.

    python3 score.py            -> out/music32.wav, beats32.json, beats32.js   (the 32-second cut)
"""
import json
import os

import numpy as np
import scipy.signal as sg
from scipy.ndimage import maximum_filter1d

SR = 48000
BPM = 128
BEAT = 60 / BPM
BAR = 4 * BEAT
NBARS = 17
DUR = 32.0
N = int(DUR * SR)
HERE = os.path.dirname(os.path.abspath(__file__))
RNG = np.random.default_rng(7)


def secs(d):
    return np.arange(int(round(d * SR))) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def noise(d, seed=None):
    r = np.random.default_rng(seed) if seed is not None else RNG
    return r.standard_normal(int(round(d * SR)))


def sos(kind, f, order=2):
    if kind == 'bp':
        return sg.butter(order, [f[0], f[1]], btype='bandpass', fs=SR, output='sos')
    return sg.butter(order, f, btype=kind, fs=SR, output='sos')


def filt(x, kind, f, order=2):
    return sg.sosfilt(sos(kind, f, order), x, axis=0)


def sweep_lp(x, cut, block=256, order=2):
    """Time-varying low-pass: coefficients updated every block, state carried."""
    cut = np.broadcast_to(np.asarray(cut, float), (len(x),))
    y = np.empty_like(x)
    zi = None
    for i in range(0, len(x), block):
        c = float(np.clip(cut[i], 30, 0.45 * SR))
        s = sos('lowpass', c, order)
        if zi is None:
            zi = np.zeros((s.shape[0], 2))
        y[i:i + block], zi = sg.sosfilt(s, x[i:i + block], zi=zi)
    return y


def saw(freq, n, phase0=None):
    """PolyBLEP band-limited sawtooth."""
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = f / SR
    ph = ((RNG.random() if phase0 is None else phase0) + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m1 = ph < dt
    t1 = ph[m1] / dt[m1]
    y[m1] -= t1 + t1 - t1 * t1 - 1
    m2 = ph > 1 - dt
    t2 = (ph[m2] - 1) / dt[m2]
    y[m2] -= t2 * t2 + t2 + t2 + 1
    return y


def square(freq, n, phase0=None):
    p = RNG.random() if phase0 is None else phase0
    return 0.5 * (saw(freq, n, p) - saw(freq, n, (p + 0.5) % 1.0))


def adsr(n, a, d, s, r, hold=None):
    t = np.arange(n) / SR
    T = n / SR
    hold = T - r if hold is None else hold
    env = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > hold
    env[rel] *= np.exp(-(t[rel] - hold) / max(r / 4, 1e-4))
    return env


def pan(x, p):
    th = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, t, snd, gain=1.0, p=0.0):
        if snd.ndim == 1:
            snd = pan(snd, p)
        i = int(round(t * SR))
        if i >= N:
            return
        k = min(len(snd), int(0.006 * SR))
        snd = snd.copy()
        snd[-k:] *= np.linspace(1, 0, k)[:, None]
        j = min(N, i + len(snd))
        self.x[i:j] += gain * snd[:j - i]


# ------------------------------------------------------------------ drums
def kick(heavy=1.0):
    t = secs(0.5)
    f = 46 + 130 * np.exp(-t / 0.026) + 25 * np.exp(-t / 0.11)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - np.exp(-t / 0.0012)) * np.exp(-t / (0.26 + 0.1 * heavy))
    click = filt(noise(0.5), 'highpass', 2500) * np.exp(-t / 0.003) * 0.35
    return np.tanh((1.8 + heavy) * (body + click)) / np.tanh(1.8 + heavy)


def clap(seed=None):
    t = secs(0.45)
    n = noise(0.45, seed)
    env = np.zeros_like(t)
    for ti in (0.0, 0.010, 0.021):
        env += np.where(t >= ti, np.exp(-(t - ti) / 0.007), 0)
    env += 0.55 * np.where(t >= 0.021, np.exp(-(t - 0.021) / 0.11), 0)
    snap = filt(n * env, 'bp', (900, 5200))
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.06) * 0.35
    return snap * 1.6 + body


def hat(open_=False, seed=None):
    d = 0.35 if open_ else 0.08
    t = secs(d)
    x = filt(noise(d, seed), 'highpass', 7200, 4)
    metal = sum(square(f, len(t), 0.0) for f in (317, 461, 549, 812, 1021)) * 0.08
    x = x + filt(metal, 'highpass', 6000, 2)
    return x * np.exp(-t / (0.16 if open_ else 0.022))


def tom(f0):
    t = secs(0.6)
    f = f0 * (1 + 0.7 * np.exp(-t / 0.04))
    b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28)
    c = filt(noise(0.6), 'bp', (800, 4000)) * np.exp(-t / 0.01) * 0.3
    return np.tanh(1.6 * (b + c))


def crash(d=2.6, seed=0):
    t = secs(d)
    L = filt(noise(d, seed), 'highpass', 3200, 2) * np.exp(-t / 0.95)
    R = filt(noise(d, seed + 1), 'highpass', 3200, 2) * np.exp(-t / 0.95)
    shimmer = filt(noise(d, seed + 2), 'bp', (7500, 11000)) * np.exp(-t / 0.5) * 0.6
    att = 1 - np.exp(-t / 0.002)
    return np.stack([(L + shimmer) * att, (R + shimmer) * att], axis=1) * 0.6


def impact(d=3.2):
    t = secs(d)
    f = 27 + 30 * np.exp(-t / 0.35)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.1) * (1 - np.exp(-t / 0.002))
    thud = filt(noise(d), 'lowpass', 1800) * np.exp(-t / 0.18) * 0.8
    return np.tanh(2.2 * (sub + thud)) / np.tanh(2.2)


def riser(d):
    n = int(d * SR)
    t = np.arange(n) / SR
    u = t / d
    nz = noise(d)
    out = np.zeros(n)
    centers = 350 * (9000 / 350) ** (u ** 1.3)
    for i in range(0, n, 512):
        c = centers[i]
        out[i:i + 512] = filt(nz[i:i + 512 + 2048], 'bp', (c * 0.7, min(c * 1.45, 0.45 * SR)))[:len(out[i:i + 512])]
    tone = saw(mtof(50) * 2 ** (2 * u ** 1.6), n) * 0.18
    tone = sweep_lp(tone, 600 + 7000 * u ** 2)
    return (out * 1.2 + tone) * u ** 2.2


def reverse_cymbal(d):
    c = crash(d + 0.6, seed=40)[::-1]
    return c[-int(d * SR):] * np.linspace(0.2, 1, int(d * SR))[:, None] ** 2


# ------------------------------------------------------------------ instruments
def supersaw(midi, d, voices=7, spread=0.22, cutoff=3500, a=0.005, dcy=0.25, s=0.85, r=0.12, width=0.8):
    n = int(d * SR)
    out = np.zeros((n, 2))
    for v in range(voices):
        det = (v - (voices - 1) / 2) / ((voices - 1) / 2) if voices > 1 else 0
        f = mtof(midi) * 2 ** (det * spread / 12)
        x = saw(f, n)
        out += pan(x, det * width)
    out /= voices ** 0.6
    env = adsr(n, a, dcy, s, r)
    out = filt(out, 'lowpass', cutoff, 2) * env[:, None]
    return out


def pluck(midi, d=0.22, bright=6000):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = 0.6 * saw(mtof(midi), n) + 0.4 * square(mtof(midi), n)
    x = sweep_lp(x, 500 + bright * np.exp(-t / 0.07), block=128)
    return x * np.exp(-t / 0.11) * (1 - np.exp(-t / 0.002))


def string_stac(midi, d=0.2):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = sum(saw(mtof(midi) * 2 ** (c / 1200), n) for c in (-9, 0, 9)) / 3
    x = filt(x, 'lowpass', 2600, 2)
    return x * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.09)


def bass(midi, d, cutoff=420):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = 0.7 * saw(mtof(midi), n) + 0.6 * np.sin(2 * np.pi * mtof(midi) * t)
    x = sweep_lp(x, cutoff + 1400 * np.exp(-t / 0.05), block=128)
    return np.tanh(1.5 * x * adsr(n, 0.003, 0.15, 0.8, 0.04))


def lead(midi, d):
    n = int(d * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    f = mtof(midi) * vib
    x = 0.45 * saw(f * 2 ** (8 / 1200), n) + 0.45 * saw(f * 2 ** (-8 / 1200), n) + 0.3 * square(f / 2, n)
    x = filt(x, 'lowpass', 5200, 2)
    return x * adsr(n, 0.006, 0.18, 0.75, 0.06)


# ------------------------------------------------------------------ arrangement
CHORDS = [  # D minor: i - VI - III - VII
    {'name': 'Dm', 'voicing': [62, 65, 69, 74], 'root': 38, 'arp': [50, 57, 62, 65, 69, 65, 62, 57]},
    {'name': 'Bb', 'voicing': [62, 65, 70, 74], 'root': 34, 'arp': [46, 53, 58, 62, 65, 62, 58, 53]},
    {'name': 'F', 'voicing': [60, 65, 69, 72], 'root': 41, 'arp': [53, 57, 60, 65, 69, 65, 60, 57]},
    {'name': 'C', 'voicing': [60, 64, 67, 72], 'root': 36, 'arp': [48, 55, 60, 64, 67, 64, 60, 55]},
]
HOOK = [  # 8th-note grid per bar (None = rest), over Dm Bb F C
    [69, None, 74, None, 77, 76, None, 74],
    [74, None, 72, None, 70, None, 72, 74],
    [72, None, 69, None, 72, 74, None, 77],
    [76, None, 74, None, 72, None, 67, None],
]

INTRO, BUILD, DROP, FINAL = 0, 4, 8, 16          # section start bars


def bar_t(b, beat=0.0):
    return b * BAR + beat * BEAT


def compose():
    drums, music, fx = Bus(), Bus(), Bus()
    send = Bus()                                   # reverb send
    ev = {'kicks': [], 'claps': [], 'crashes': [], 'impacts': [], 'toms': [], 'rolls': [], 'risers': [], 'gaps': [], 'hook': [], 'stabs': []}
    K = kick()
    for b in range(NBARS):
        ch = CHORDS[b % 4]
        t0 = bar_t(b)
        # ------------------------------------------------ drums
        if b < 2:                                  # intro: half-time toms and booms
            for beat in (0, 2):
                drums.add(bar_t(b, beat), K, 0.85)
                ev['kicks'].append(bar_t(b, beat))
            for beat, f in ((1.5, 110), (2.5, 92), (3.0, 80), (3.5, 70)):
                drums.add(bar_t(b, beat), tom(f), 0.42, -0.3 + 0.2 * beat)
                ev['toms'].append(bar_t(b, beat))
        elif b < DROP or b == FINAL:
            if b < FINAL:
                last_beat_gap = b == DROP - 1
                for beat in range(4):
                    if last_beat_gap and beat == 3:
                        continue
                    drums.add(bar_t(b, beat), K, 0.9)
                    ev['kicks'].append(bar_t(b, beat))
                for beat in (1, 3):
                    if last_beat_gap and beat == 3:
                        continue
                    drums.add(bar_t(b, beat), clap(), 0.5, 0.05)
                    ev['claps'].append(bar_t(b, beat))
                hats = 8 if b < BUILD else 16
                for k in range(hats):
                    if last_beat_gap and k * 4 / hats >= 3:
                        continue
                    drums.add(bar_t(b, k * 4 / hats), hat(), 0.16 if k % 2 else 0.22, 0.3)
        else:                                      # the drop
            stop = b == FINAL - 1
            for beat in range(4):
                if stop and beat == 3:
                    continue
                drums.add(bar_t(b, beat), kick(1.3), 1.0)
                ev['kicks'].append(bar_t(b, beat))
            for beat in (1, 3):
                if stop and beat == 3:
                    continue
                drums.add(bar_t(b, beat), clap(), 0.62, 0.05)
                drums.add(bar_t(b, beat), clap(), 0.25, -0.4)
                ev['claps'].append(bar_t(b, beat))
            for k in range(16):
                if stop and k >= 12:
                    continue
                drums.add(bar_t(b, k / 4), hat(), 0.09 if k % 2 else 0.14, 0.35)
            for k in range(4):
                if stop and k == 3:
                    continue
                drums.add(bar_t(b, k + 0.5), hat(True), 0.15, -0.25)
            if b in (DROP, DROP + 4):
                drums.add(t0, crash(), 0.7)
                ev['crashes'].append(t0)
            if b == DROP + 3:                       # 16th fill into the second half
                for k in range(4):
                    drums.add(bar_t(b, 3 + k / 4), clap(), 0.3 + 0.08 * k, 0.1)
                ev['rolls'].append([bar_t(b, 3), bar_t(b, 4)])
        # ------------------------------------------------ build: snare roll and riser
        if b == BUILD + 2:
            ev['risers'].append([t0, bar_t(DROP) - BEAT])
            fx.add(t0, riser(2 * BAR - BEAT), 0.5)
            ev['rolls'].append([t0, bar_t(DROP) - BEAT])
        if b in (BUILD + 2, BUILD + 3):
            steps = [(k / 2) for k in range(8)] if b == BUILD + 2 else [k / 4 for k in range(8)] + [2 + k / 8 for k in range(8)]
            for i, st in enumerate(steps):
                g = 0.18 + 0.4 * ((b - BUILD - 2) * 4 + st) / 7
                drums.add(bar_t(b, st), clap(), min(g, 0.55), 0.0)
        if b == DROP - 1:
            ev['gaps'].append([bar_t(b, 3), bar_t(DROP)])
            fx.add(bar_t(b, 3) - 0.0, reverse_cymbal(BEAT), 0.7)
        # ------------------------------------------------ music
        if b < BUILD:                               # ostinato strings and a soft pad
            for k in range(16):
                m = ch['arp'][k % 8]
                music.add(bar_t(b, k / 4), string_stac(m), 0.16, -0.4 + 0.8 * (k % 2))
            for m in ch['voicing']:
                music.add(t0, supersaw(m - 12, BAR, cutoff=900 + 300 * b, a=0.25, r=0.4, s=1.0), 0.07)
            for k in range(8):
                music.add(bar_t(b, k / 2), bass(ch['root'], BEAT / 2 * 0.9), 0.32)
        elif b < DROP:                              # build: brighter strings, filter rising
            for k in range(16):
                m = ch['arp'][k % 8] + (12 if b >= BUILD + 2 and k % 4 == 2 else 0)
                music.add(bar_t(b, k / 4), string_stac(m), 0.19, -0.4 + 0.8 * (k % 2))
            for m in ch['voicing']:
                music.add(t0, supersaw(m - 12, BAR if b < DROP - 1 else 3 * BEAT, cutoff=1400 + 900 * (b - BUILD), a=0.05, r=0.2, s=1.0), 0.08)
            for k in range(8):
                if b == DROP - 1 and k >= 6:
                    continue
                music.add(bar_t(b, k / 2), bass(ch['root'] + (12 if k % 2 else 0), BEAT / 2 * 0.9, 520), 0.32)
        elif b < FINAL:                              # drop: supersaw chords, pluck arp, hook, bass
            stop = b == FINAL - 1
            length = 3 * BEAT if stop else BAR
            for m in ch['voicing']:
                music.add(t0, supersaw(m, length, cutoff=5200, a=0.004, dcy=0.3, s=0.8, r=0.08, width=0.9), 0.12)
                music.add(t0, supersaw(m - 12, length, cutoff=2500, a=0.004, s=0.9), 0.06)
            ev['stabs'].append(t0)
            for k in range(16):
                if stop and k >= 12:
                    continue
                m = ch['arp'][k % 8] + 12
                music.add(bar_t(b, k / 4), pluck(m), 0.11, -0.5 + (k % 4) / 3)
            for k in range(8):
                if stop and k >= 6:
                    continue
                n = HOOK[b % 4][k]
                if n is None:
                    continue
                d = BEAT / 2 * (2 if k + 1 < 8 and HOOK[b % 4][k + 1] is None else 1) * 0.95
                music.add(bar_t(b, k / 2), lead(n, d), 0.2, 0.0)
                if b >= DROP + 4:
                    music.add(bar_t(b, k / 2), lead(n + 12, d), 0.07, 0.15)
                ev['hook'].append(bar_t(b, k / 2))
            for k in range(8):
                if stop and k >= 6:
                    continue
                m = ch['root'] + (12 if k in (3, 7) else 0)
                music.add(bar_t(b, k / 2), bass(m, BEAT / 2 * 0.92, 380), 0.4)
        else:                                        # final hit: chord stab and ring-out
            drums.add(t0, kick(1.6), 1.0)
            ev['kicks'].append(t0)
            fx.add(t0, impact(), 0.9)
            ev['impacts'].append(t0)
            drums.add(t0, crash(3.0, seed=11), 0.85)
            ev['crashes'].append(t0)
            for m in [62, 65, 69, 74, 76]:
                music.add(t0, supersaw(m, 2.2, cutoff=4200, a=0.003, dcy=0.6, s=0.35, r=1.2), 0.11)
                music.add(t0, supersaw(m - 12, 2.2, cutoff=2000, a=0.003, dcy=0.8, s=0.4, r=1.2), 0.06)
            music.add(t0, bass(26, 1.6, 300), 0.5)
    # Drop downbeat: impact + crash
    fx.add(bar_t(DROP), impact(), 0.75)
    ev['impacts'].insert(0, bar_t(DROP))
    # Intro boom on the very first beat
    fx.add(0.0, impact(2.0), 0.55)
    ev['impacts'].insert(0, 0.0)

    # Sidechain: duck the music under every kick.
    t = np.arange(N) / SR
    duck = np.ones(N)
    for tk in ev['kicks']:
        i = int(tk * SR)
        seg_ = t[i:i + int(0.35 * SR)] - tk
        depth = 0.7 if tk >= bar_t(DROP) else 0.45
        duck[i:i + len(seg_)] = np.minimum(duck[i:i + len(seg_)], 1 - depth * np.exp(-seg_ / 0.11) * np.clip(seg_ / 0.004, 0, 1) - 0.0)
    music.x *= duck[:, None]

    # Reverb send (music + fx + a touch of claps).
    from audio_lib import reverb
    wet_in = 0.35 * music.x + 0.5 * fx.x + 0.15 * drums.x
    wet_in = filt(wet_in, 'highpass', 220)
    wet = reverb(wet_in, seconds=2.6, decay=1.8, mix=1.0) * 0.45
    mix = drums.x * 1.0 + music.x + fx.x + wet

    # Section dynamics before the limiter, so the drop really explodes:
    # intro quieter, build ramps up, drop at full level, final hit full.
    t = np.arange(N) / SR
    shape = np.interp(t, [0, bar_t(BUILD) - 0.01, bar_t(BUILD), bar_t(DROP) - BEAT, bar_t(DROP) - 0.002, bar_t(DROP), DUR],
                      [0.42, 0.48, 0.5, 0.66, 0.66, 1.0, 1.0])
    mix *= shape[:, None]
    # Master: gentle air roll-off and sub cleanup.
    mix = filt(mix, 'highpass', 25)
    mix = filt(mix, 'lowpass', 15500, 2)
    return mix, ev


def limiter(x, ceiling=0.88, look=0.003, release=0.09):
    pk = maximum_filter1d(np.max(np.abs(x), axis=1), size=2 * int(look * SR) + 1)
    g = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    a = np.exp(-1 / (release * SR))
    smooth = sg.lfilter([1 - a], [1, -a], g)
    g = np.minimum(g, smooth)
    y = x * g[:, None]
    return np.tanh(y / ceiling * 0.98) * ceiling


def lufs(x):
    import pyloudnorm as pyln
    return pyln.Meter(SR).integrated_loudness(x)


def write_wav(path, x):
    import soundfile as sf
    sf.write(path, x, SR, subtype='PCM_24')


if __name__ == '__main__':
    mix, ev = compose()
    # Normalise into the limiter until the integrated loudness reaches the target.
    gain, target = 1.0 / np.max(np.abs(mix)), -11.0
    for _ in range(4):
        out = limiter(mix * gain)
        gain *= 10 ** ((target - lufs(out)) / 20)
    out = limiter(mix * gain)
    # Gentle fades at the very start/end.
    f = int(0.004 * SR)
    out[:f] *= np.linspace(0, 1, f)[:, None]
    tail = int(0.4 * SR)
    out[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    write_wav(os.path.join(HERE, 'out', 'music32.wav'), out)
    beats = {
        'source': 'stand-in score (score.py)', 'bpm': BPM, 'beat': BEAT, 'duration': DUR,
        'beats': [round(k * BEAT, 6) for k in range(NBARS * 4 + 1)],
        'downbeats': [round(b * BAR, 6) for b in range(NBARS + 1)],
        'sections': {'intro': 0.0, 'build': bar_t(BUILD), 'drop': bar_t(DROP), 'final': bar_t(FINAL), 'end': DUR},
        **{k: (sorted(set(round(v, 6) for v in vals)) if vals and not isinstance(vals[0], list) else vals) for k, vals in ev.items()},
    }
    with open(os.path.join(HERE, 'beats32.json'), 'w') as fh:
        json.dump(beats, fh, indent=1)
    with open(os.path.join(HERE, 'beats32.js'), 'w') as fh:
        fh.write('// Generated by score.py (or resync.py): the beat/hit map the film locks to.\nwindow.BEATS = ' + json.dumps(beats) + ';\n')
    print('LUFS', round(lufs(out), 2), 'peak dBFS', round(20 * np.log10(np.max(np.abs(out))), 2))
