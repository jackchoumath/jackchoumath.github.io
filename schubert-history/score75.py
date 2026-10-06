"""Original score for the 75-second cut (128 BPM, D minor, 40 bars = 160 beats = 75.0 s).

Same instruments as score.py, arranged for a longer film with two climaxes:

  bars  0- 3  INTRO     half-time booms, toms that the 1879 lines land on, pad
  bars  4-11  VERSE     four-on-the-floor, string ostinato, bass; a soft pluck hook from bar 8
  bars 12-15  BUILD     16th hats, rising filter, snare roll + riser, one beat of silence
  bars 16-23  DROP A    supersaw chords, pluck arp, hook, sidechained bass (Dm Bb F C)
  bars 24-27  BREAK     half-time, keys and pad over Gm Bb C A, then a roll + riser + gap
  bars 28-35  DROP B    the drop again, bigger: offbeat stabs, octave-doubled hook
  bars 36-37  RUN       Bb C, climbing hook, clap fill, then a one-beat stop
  bars 38-39  FINAL     impact, ring-out, two heartbeat booms

    python3 score75.py   -> out/music75.wav, beats.json, beats.js
"""
import json
import os

import numpy as np

from score import (SR, BPM, BEAT, BAR, CHORDS, HOOK, secs, mtof, noise, filt, sweep_lp, saw, adsr, pan,
                   kick, clap, hat, tom, crash, impact, riser, reverse_cymbal, supersaw, pluck,
                   string_stac, bass, lead, limiter, lufs, write_wav)

NBARS = 40
DUR = NBARS * BAR            # 75.0 s
N = int(round(DUR * SR))
HERE = os.path.dirname(os.path.abspath(__file__))
SEC = dict(intro=0, verse=4, build=12, drop=16, brk=24, drop2=28, run=36, final=38)

BREAK_CHORDS = [
    {'name': 'Gm', 'voicing': [62, 67, 70, 74], 'root': 31, 'arp': [43, 50, 55, 58, 62, 58, 55, 50]},
    CHORDS[1],                                                     # Bb
    CHORDS[3],                                                     # C
    {'name': 'A', 'voicing': [61, 64, 69, 73], 'root': 33, 'arp': [45, 52, 57, 61, 64, 61, 57, 52]},
]
RUN_CHORDS = [CHORDS[1], CHORDS[3]]                                # Bb C -> (stop) -> Dm
RUN_HOOK = [[70, 74, 77, 74, 70, 74, 77, 79], [72, 76, 79, 76, 79, 81, None, None]]


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


def bt(b, beat=0.0):
    return b * BAR + beat * BEAT


def keys(midi, d=1.2):
    """Soft electric-piano-ish tone for the break."""
    n = int(d * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.25) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.1)
    return x * (1 - np.exp(-t / 0.003)) * np.exp(-t / 0.7)


def boom(d=1.6):
    t = secs(d)
    f = 34 + 40 * np.exp(-t / 0.08)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5) * (1 - np.exp(-t / 0.002))
    return np.tanh(2.0 * x) / np.tanh(2.0)


def compose():
    drums, music, fx = Bus(), Bus(), Bus()
    ev = {k: [] for k in ('kicks', 'claps', 'crashes', 'impacts', 'toms', 'rolls', 'risers', 'gaps', 'hook', 'stabs', 'booms')}
    K, KH = kick(), kick(1.3)

    def add_kick(t, k=K, g=0.9):
        drums.add(t, k, g)
        ev['kicks'].append(t)

    def add_clap(t, g=0.5, double=False):
        drums.add(t, clap(), g, 0.05)
        if double:
            drums.add(t, clap(), g * 0.4, -0.4)
        ev['claps'].append(t)

    for b in range(NBARS):
        t0 = bt(b)
        # ============================================================ INTRO
        if b < SEC['verse']:
            ch = CHORDS[b % 4]
            for beat in (0, 2):
                add_kick(bt(b, beat), K, 0.8)
            toms = [(2, 104), (3, 86)] if b < 3 else [(2, 104), (3, 92), (3.25, 84), (3.5, 76), (3.75, 70)]
            for beat, f in toms:
                drums.add(bt(b, beat), tom(f), 0.45, -0.3 + 0.2 * beat)
                ev['toms'].append(bt(b, beat))
            if b >= 1:
                for k in range(16):
                    music.add(bt(b, k / 4), string_stac(ch['arp'][k % 8]), 0.10 + 0.03 * b, -0.4 + 0.8 * (k % 2))
            for m in ch['voicing']:
                music.add(t0, supersaw(m - 12, BAR, cutoff=700 + 250 * b, a=0.3, r=0.4, s=1.0), 0.07)
            music.add(t0, bass(ch['root'], BAR * 0.95, 260), 0.22)
            if b == 3:
                for k in range(8):
                    drums.add(bt(b, k / 2), hat(), 0.12, 0.3)
        # ============================================================ VERSE + BUILD
        elif b < SEC['drop']:
            ch = CHORDS[b % 4]
            build = b >= SEC['build']
            gap_bar = b == SEC['drop'] - 1
            for beat in range(4):
                if gap_bar and beat == 3:
                    continue
                add_kick(bt(b, beat), K, 0.85)
            for beat in (1, 3):
                if gap_bar and beat == 3:
                    continue
                add_clap(bt(b, beat), 0.45)
            hats = 16 if build else 8
            for k in range(hats):
                if gap_bar and k * 4 / hats >= 3:
                    continue
                off = (k % 2 == 1) if hats == 8 else True
                drums.add(bt(b, k * 4 / hats), hat(open_=(hats == 8 and k % 2 == 1)), (0.13 if off else 0.08) if hats == 8 else (0.08 if k % 2 else 0.12), 0.3)
            for k in range(16):
                if gap_bar and k >= 12:
                    continue
                m = ch['arp'][k % 8] + (12 if build and k % 4 == 2 else 0)
                music.add(bt(b, k / 4), string_stac(m), 0.17 + (0.03 if build else 0), -0.4 + 0.8 * (k % 2))
            for m in ch['voicing']:
                length = BAR if not gap_bar else 3 * BEAT
                cut = 1100 + 120 * (b - SEC['verse']) + (900 * (b - SEC['build']) if build else 0)
                music.add(t0, supersaw(m - 12, length, cutoff=cut, a=0.08, r=0.2, s=1.0), 0.08)
            for k in range(8):
                if gap_bar and k >= 6:
                    continue
                music.add(bt(b, k / 2), bass(ch['root'] + (12 if k % 2 else 0), BEAT / 2 * 0.9, 480), 0.3)
            if 8 <= b < SEC['build']:                      # foreshadow the hook, soft and filtered
                for k in range(8):
                    n = HOOK[b % 4][k]
                    if n is not None:
                        music.add(bt(b, k / 2), pluck(n, 0.3, bright=2500), 0.10, 0.2)
            if b == SEC['build'] + 2:                      # snare roll + riser, then the gap
                ev['risers'].append([t0, bt(SEC['drop']) - BEAT])
                fx.add(t0, riser(2 * BAR - BEAT), 0.5)
                ev['rolls'].append([t0, bt(SEC['drop']) - BEAT])
            if b in (SEC['build'] + 2, SEC['build'] + 3):
                steps = [k / 2 for k in range(8)] if b == SEC['build'] + 2 else [k / 4 for k in range(8)] + [2 + k / 8 for k in range(8)]
                for st in steps:
                    g = 0.18 + 0.4 * ((b - SEC['build'] - 2) * 4 + st) / 7
                    drums.add(bt(b, st), clap(), min(g, 0.55), 0.0)
            if gap_bar:
                ev['gaps'].append([bt(b, 3), bt(SEC['drop'])])
                fx.add(bt(b, 3), reverse_cymbal(BEAT), 0.7)
        # ============================================================ DROPS
        elif SEC['drop'] <= b < SEC['brk'] or SEC['drop2'] <= b < SEC['run']:
            second = b >= SEC['drop2']
            d0 = SEC['drop2'] if second else SEC['drop']
            ch = CHORDS[(b - d0) % 4]
            for beat in range(4):
                add_kick(bt(b, beat), KH, 1.0)
            for beat in (1, 3):
                add_clap(bt(b, beat), 0.62, double=True)
            for k in range(16):
                drums.add(bt(b, k / 4), hat(), 0.09 if k % 2 else 0.14, 0.35)
            for k in range(4):
                drums.add(bt(b, k + 0.5), hat(True), 0.15, -0.25)
            if b in (d0, d0 + 4):
                drums.add(t0, crash(), 0.7)
                ev['crashes'].append(t0)
            if b == d0 + 3:                                 # 16th fill into the second half
                for k in range(4):
                    drums.add(bt(b, 3 + k / 4), clap(), 0.3 + 0.08 * k, 0.1)
                ev['rolls'].append([bt(b, 3), bt(b, 4)])
            for m in ch['voicing']:
                music.add(t0, supersaw(m, BAR, cutoff=5200, a=0.004, dcy=0.3, s=0.8, r=0.08, width=0.9), 0.12)
                music.add(t0, supersaw(m - 12, BAR, cutoff=2500, a=0.004, s=0.9), 0.06)
            ev['stabs'].append(t0)
            if second:                                      # offbeat chord stabs
                for k in range(4):
                    for m in ch['voicing'][1:]:
                        music.add(bt(b, k + 0.5), supersaw(m + 12, BEAT * 0.35, cutoff=6500, a=0.002, dcy=0.08, s=0.2, r=0.05), 0.05)
            for k in range(16):
                m = ch['arp'][k % 8] + 12
                music.add(bt(b, k / 4), pluck(m), 0.11, -0.5 + (k % 4) / 3)
            for k in range(8):
                n = HOOK[(b - d0) % 4][k]
                if n is None:
                    continue
                d = BEAT / 2 * (2 if k + 1 < 8 and HOOK[(b - d0) % 4][k + 1] is None else 1) * 0.95
                music.add(bt(b, k / 2), lead(n, d), 0.2, 0.0)
                if second or b >= d0 + 4:
                    music.add(bt(b, k / 2), lead(n + 12, d), 0.09 if second else 0.07, 0.15)
                ev['hook'].append(bt(b, k / 2))
            for k in range(8):
                m = ch['root'] + (12 if k in (3, 7) else 0)
                music.add(bt(b, k / 2), bass(m, BEAT / 2 * 0.92, 380), 0.4)
        # ============================================================ BREAK
        elif b < SEC['drop2']:
            ch = BREAK_CHORDS[b - SEC['brk']]
            gap_bar = b == SEC['drop2'] - 1
            rising = b >= SEC['brk'] + 2
            add_kick(t0, K, 0.75)                           # half-time: kick on 1, clap on 3
            if not rising:
                add_clap(bt(b, 2), 0.5)
                for k in range(4):
                    drums.add(bt(b, k + 0.5), hat(True), 0.09, -0.2)
            else:
                add_kick(bt(b, 2), K, 0.7)
            for k in range(16):                             # quiet 16th hats keep the pulse alive
                if gap_bar and k >= 12:
                    continue
                drums.add(bt(b, k / 4), hat(), 0.04 if k % 2 else 0.06, 0.3)
            for k in range(8):                              # filtered pluck arp, opening up into the riser
                if gap_bar and k >= 6:
                    continue
                bright = 2200 + 1600 * (b - SEC['brk']) + 300 * k
                music.add(bt(b, k / 2), pluck(ch['arp'][k % 8] + 12, 0.3, bright=bright), 0.15, -0.4 + 0.8 * (k % 2))
            for m in ch['voicing']:
                length = BAR if not gap_bar else 3 * BEAT
                music.add(t0, supersaw(m - 12, length, cutoff=1100 + 700 * (b - SEC['brk']), a=0.2, r=0.3, s=1.0), 0.12)
            for k, m in enumerate(ch['arp'][:8]):
                if gap_bar and k >= 6:
                    continue
                music.add(bt(b, k / 2), keys(m + 12, 1.1), 0.16, -0.3 + 0.6 * (k % 2))
            music.add(t0, bass(ch['root'], (BAR if not gap_bar else 3 * BEAT) * 0.95, 300), 0.3)
            if not rising:                                  # the hook, half speed, on keys
                for k in (0, 2, 4, 6):
                    n = HOOK[(b - SEC['brk']) % 4][k]
                    if n is not None:
                        music.add(bt(b, k / 2), keys(n, 1.4), 0.13, 0.15)
            if b == SEC['brk'] + 2:
                ev['risers'].append([t0, bt(SEC['drop2']) - BEAT])
                fx.add(t0, riser(2 * BAR - BEAT), 0.5)
                ev['rolls'].append([t0, bt(SEC['drop2']) - BEAT])
            if rising:
                steps = [k / 2 for k in range(8)] if b == SEC['brk'] + 2 else [k / 4 for k in range(8)] + [2 + k / 8 for k in range(8)]
                for st in steps:
                    g = 0.18 + 0.4 * ((b - SEC['brk'] - 2) * 4 + st) / 7
                    drums.add(bt(b, st), clap(), min(g, 0.55), 0.0)
            if gap_bar:
                ev['gaps'].append([bt(b, 3), bt(SEC['drop2'])])
                fx.add(bt(b, 3), reverse_cymbal(BEAT), 0.7)
        # ============================================================ RUN
        elif b < SEC['final']:
            ch = RUN_CHORDS[b - SEC['run']]
            stop_bar = b == SEC['final'] - 1
            for beat in range(4):
                if stop_bar and beat == 3:
                    continue
                add_kick(bt(b, beat), KH, 1.0)
            for beat in (1, 3):
                if stop_bar and beat == 3:
                    continue
                add_clap(bt(b, beat), 0.62, double=True)
            for k in range(16):
                if stop_bar and k >= 12:
                    continue
                drums.add(bt(b, k / 4), hat(), 0.1 if k % 2 else 0.15, 0.35)
            if b == SEC['run']:
                drums.add(t0, crash(), 0.6)
                ev['crashes'].append(t0)
            if stop_bar:                                    # 8th -> 16th clap fill into the stop
                for st in [0, 0.5, 1, 1.5] + [2 + k / 4 for k in range(4)]:
                    drums.add(bt(b, st), clap(), 0.3 + 0.1 * st, 0.0)
                ev['rolls'].append([bt(b, 2), bt(b, 3)])
            length = BAR if not stop_bar else 3 * BEAT
            for m in ch['voicing']:
                music.add(t0, supersaw(m, length, cutoff=5600, a=0.004, dcy=0.3, s=0.85, r=0.06, width=0.9), 0.13)
                music.add(t0, supersaw(m - 12, length, cutoff=2600, a=0.004, s=0.9), 0.06)
            ev['stabs'].append(t0)
            for k in range(16):
                if stop_bar and k >= 12:
                    continue
                music.add(bt(b, k / 4), pluck(ch['arp'][k % 8] + 12), 0.12, -0.5 + (k % 4) / 3)
            for k in range(8):
                n = RUN_HOOK[b - SEC['run']][k]
                if n is None:
                    continue
                music.add(bt(b, k / 2), lead(n, BEAT / 2 * 0.95), 0.2, 0.0)
                music.add(bt(b, k / 2), lead(n + 12, BEAT / 2 * 0.95), 0.08, 0.15)
                ev['hook'].append(bt(b, k / 2))
            for k in range(8):
                if stop_bar and k >= 6:
                    continue
                music.add(bt(b, k / 2), bass(ch['root'] + (12 if k in (3, 7) else 0), BEAT / 2 * 0.92, 380), 0.4)
            if stop_bar:
                ev['gaps'].append([bt(b, 3), bt(SEC['final'])])
                fx.add(bt(b, 3), reverse_cymbal(BEAT), 0.45)
        # ============================================================ FINAL
        elif b == SEC['final']:
            add_kick(t0, kick(1.6), 1.0)
            fx.add(t0, impact(), 0.9)
            ev['impacts'].append(t0)
            drums.add(t0, crash(3.4, seed=11), 0.85)
            ev['crashes'].append(t0)
            for m in [62, 65, 69, 74, 76]:
                music.add(t0, supersaw(m, 3.4, cutoff=4200, a=0.003, dcy=0.8, s=0.35, r=1.6), 0.11)
                music.add(t0, supersaw(m - 12, 3.4, cutoff=2000, a=0.003, dcy=1.0, s=0.4, r=1.6), 0.06)
            music.add(t0, bass(26, 2.2, 300), 0.5)
            for beat in (2, 4):                             # two heartbeat booms under the verdict
                fx.add(bt(b, beat), boom(), 0.45)
                ev['booms'].append(bt(b, beat))
    # Section impacts: the very first beat and both drops.
    fx.add(0.0, impact(2.0), 0.55)
    for b in (SEC['drop'], SEC['drop2']):
        fx.add(bt(b), impact(), 0.75)
    ev['impacts'] = sorted([0.0, bt(SEC['drop']), bt(SEC['drop2'])] + ev['impacts'])

    # Sidechain: duck the music under every kick (harder in the drops).
    t = np.arange(N) / SR
    duck = np.ones(N)
    hard = lambda tk: bt(SEC['drop']) <= tk < bt(SEC['brk']) or tk >= bt(SEC['drop2'])
    for tk in ev['kicks']:
        i = int(tk * SR)
        s = t[i:i + int(0.35 * SR)] - tk
        depth = 0.7 if hard(tk) else 0.45
        duck[i:i + len(s)] = np.minimum(duck[i:i + len(s)], 1 - depth * np.exp(-s / 0.11) * np.clip(s / 0.004, 0, 1))
    music.x *= duck[:, None]

    from audio_lib import reverb
    wet_in = filt(0.35 * music.x + 0.5 * fx.x + 0.15 * drums.x, 'highpass', 220)
    wet = reverb(wet_in, seconds=2.6, decay=1.8, mix=1.0) * 0.45
    mix = drums.x + music.x + fx.x + wet

    # Section dynamics before the limiter: two real explosions.
    pts = [(0, 0.42), (bt(SEC['verse']) - 0.01, 0.46), (bt(SEC['verse']), 0.52), (bt(SEC['build']), 0.56),
           (bt(SEC['drop']) - BEAT, 0.68), (bt(SEC['drop']) - 0.002, 0.68), (bt(SEC['drop']), 1.0),
           (bt(SEC['brk']) - 0.002, 1.0), (bt(SEC['brk']), 0.7), (bt(SEC['brk'] + 2), 0.7),
           (bt(SEC['drop2']) - BEAT, 0.74), (bt(SEC['drop2']) - 0.002, 0.74), (bt(SEC['drop2']), 1.0), (DUR, 1.0)]
    shape = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    mix *= shape[:, None]
    mix = filt(mix, 'highpass', 25)
    mix = filt(mix, 'lowpass', 15500, 2)
    return mix, ev


if __name__ == '__main__':
    mix, ev = compose()
    gain, target = 1.0 / np.max(np.abs(mix)), -11.0
    for _ in range(4):
        out = limiter(mix * gain)
        gain *= 10 ** ((target - lufs(out)) / 20)
    out = limiter(mix * gain)
    f = int(0.004 * SR)
    out[:f] *= np.linspace(0, 1, f)[:, None]
    tail = int(0.6 * SR)
    out[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    write_wav(os.path.join(HERE, 'out', 'music75.wav'), out)
    beats = {
        'source': 'original score (score75.py)', 'bpm': BPM, 'beat': BEAT, 'duration': DUR,
        'beats': [round(k * BEAT, 6) for k in range(NBARS * 4 + 1)],
        'downbeats': [round(b * BAR, 6) for b in range(NBARS + 1)],
        'sections': {**{k: bt(v) for k, v in SEC.items()}, 'end': DUR},
        **{k: (sorted(set(round(v, 6) for v in vals)) if vals and not isinstance(vals[0], list) else vals) for k, vals in ev.items()},
    }
    with open(os.path.join(HERE, 'beats.json'), 'w') as fh:
        json.dump(beats, fh, indent=1)
    with open(os.path.join(HERE, 'beats.js'), 'w') as fh:
        fh.write('// Generated by score75.py: the beat/hit map the film locks to.\nwindow.BEATS = ' + json.dumps(beats) + ';\n')
    print('LUFS', round(lufs(out), 2), 'peak dBFS', round(20 * np.log10(np.max(np.abs(out))), 2))
