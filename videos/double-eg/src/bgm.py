"""Generate the light background music: calm piano over a warm pad.

    python bgm.py DURATION_SECONDS OUT.mid

The MIDI is rendered with FluidSynth and the FluidR3 General MIDI soundfont
(see assemble.py).  Everything is diatonic in C major; melody notes on strong
beats are always chord tones, so nothing clashes.
"""

import random
import sys

import mido

TEMPO_BPM = 64
TPB = 480                      # ticks per beat
BAR = 4 * TPB
SEC_PER_BAR = 4 * 60 / TEMPO_BPM

# chord name -> (bass root, chord tones as pitch classes, extra colour tones)
CHORDS = {  # no chord contains a semitone, so nothing rubs
    "C": (48, [0, 4, 7], [2, 9]),
    "Cmaj7": (48, [0, 4, 7, 2], [9]),     # voiced as Cadd9
    "C/E": (52, [0, 4, 7], [2]),
    "C/G": (55, [0, 4, 7], [2]),
    "Dm7": (50, [2, 5, 9, 0], []),
    "Em7": (52, [4, 7, 11, 2], []),
    "Fmaj7": (53, [5, 9, 0, 7], []),     # voiced as Fadd9
    "F": (53, [5, 9, 0], [7]),
    "Gsus": (55, [7, 0, 2], [9]),
    "G": (55, [7, 11, 2], [9, 4]),
    "G6": (55, [7, 11, 2, 4], []),
    "Am": (57, [9, 0, 4], [7, 2]),
    "Am7": (57, [9, 0, 4, 7], [2]),
}
SCALE = [0, 2, 4, 5, 7, 9, 11]

# sections: (start_second, style, list of progressions to cycle through)
SECTIONS = [
    (0, "sparse", [["Fmaj7", "C/E", "Dm7", "Gsus"]]),
    (66, "flow", [["C", "Am7", "Fmaj7", "G"], ["Am", "Em7", "Fmaj7", "C/G"],
                  ["Dm7", "G", "Cmaj7", "Am7"], ["Fmaj7", "G6", "Em7", "Am"]]),
    (442, "bright", [["Fmaj7", "G", "Em7", "Am7"], ["Dm7", "G6", "Cmaj7", "Fmaj7"],
                     ["Am", "F", "C", "G"], ["Fmaj7", "Em7", "Dm7", "Gsus"]]),
    (826, "resolve", [["Fmaj7", "G", "Em7", "Am", "Dm7", "Gsus", "C", "C"]]),
]
RHYTHMS = [  # right-hand rhythms within one bar, in beats (None = rest)
    [2, 2], [3, 1], [4], [None, 1, 2, 1], [1, 1, 2], [2, 1, 1], [None, 2, 2], [1.5, 0.5, 2],
]


def chord_plan(total_bars):
    plan = []  # (bar, chord, style)
    bar = 0
    for k, (start, style, progs) in enumerate(SECTIONS):
        end = SECTIONS[k + 1][0] if k + 1 < len(SECTIONS) else None
        end_bar = round(end / SEC_PER_BAR) if end is not None else total_bars
        bar = max(bar, round(start / SEC_PER_BAR))
        p = 0
        while bar < end_bar:
            for ch in progs[p % len(progs)]:
                if bar >= end_bar:
                    break
                plan.append((bar, ch, style))
                bar += 2
            p += 1
    return plan


def main(duration, out):
    rng = random.Random(2512)
    total_bars = int(duration / SEC_PER_BAR) + 1
    plan = chord_plan(total_bars - 3)  # leave room for the final ring-out
    events = {0: [], 1: []}  # channel -> list of (tick, msg)

    limit = [None]  # end of the current chord: no note may ring into the next one

    def note(ch, t, pitch, dur, vel):
        end = t + dur if limit[0] is None else min(t + dur, limit[0] - 15)
        events[ch].append((int(t), mido.Message("note_on", channel=ch, note=pitch, velocity=int(vel))))
        events[ch].append((int(end), mido.Message("note_off", channel=ch, note=pitch, velocity=0)))

    def cc(ch, t, num, val):
        events[ch].append((int(t), mido.Message("control_change", channel=ch, control=num, value=val)))

    prev_mel = 72
    rhythm_cache = {}
    for idx, (bar, name, style) in enumerate(plan):
        root, tones, colours = CHORDS[name]
        t0 = bar * BAR
        span = 2 * BAR
        last = idx == len(plan) - 1
        if last:
            span = 4 * BAR
        limit[0] = t0 + span
        level = {"sparse": 0.75, "flow": 0.9, "bright": 1.0, "resolve": 1.0}[style]
        # phrase swell: louder in the middle of each 4-chord phrase
        swell = [0.92, 1.0, 1.04, 0.96][idx % 4]

        # sustain pedal for the whole chord
        cc(0, max(0, t0 - 20), 64, 0)  # lift just before the change, press after it
        cc(0, t0 + 30, 64, 127)

        # warm pad: the chord stacked in thirds from its root, middle register
        pad = [60 + tones[0]]
        for pc in tones[1:]:
            p = pad[-1] + 1
            while p % 12 != pc:
                p += 1
            pad.append(p)
        for p in pad:
            note(1, t0, p, span - 20, 34 * level)

        # left hand: the bass, then chord tones above it
        bass = root - 12 if root >= 55 else root
        up = sorted(p for p in range(bass + 3, bass + 20) if p % 12 in tones)[:3]
        if style == "sparse":
            note(0, t0, bass, span, 40 * level * swell)
            note(0, t0 + 2 * TPB, up[1], span - 2 * TPB, 30 * level)
            note(0, t0 + BAR, up[2], BAR, 28 * level)
        else:
            pattern = [bass, up[0], up[1], up[2], up[1], up[0], up[1], up[2]]
            step = TPB // 2 if style in ("bright", "resolve") else TPB
            n = span // step
            for k in range(n):
                p = pattern[k % len(pattern)]
                v = (36 if k % (8 if step < TPB else 4) == 0 else 28) * level * swell
                note(0, t0 + k * step, p, step * 2, v + rng.uniform(-2, 2))

        # right hand melody (skip some bars in the sparse intro)
        for b in range(span // BAR):
            if style == "sparse" and rng.random() < 0.5:
                continue
            key = (idx // 4, b % 2)
            if key not in rhythm_cache:  # repeat rhythms within a phrase
                rhythm_cache[key] = rng.choice(RHYTHMS[:3] if style == "sparse" else RHYTHMS)
            beat = 0.0
            for k, d in enumerate(rhythm_cache[key]):
                if d is None:
                    beat += 1
                    continue
                strong = beat in (0.0, 2.0)
                weak = set(tones + colours + [0, 2, 4, 7, 9])
                weak = [pc for pc in weak if all((pc - t) % 12 not in (1, 11) for t in tones)]
                pcs = tones if strong else weak
                cands = [p for p in range(64, 86) if p % 12 in pcs]
                weights = [2.7 ** (-abs(p - prev_mel) / 2.5) * (1.3 if abs(p - 74) < 7 else 1.0) for p in cands]
                p = rng.choices(cands, weights)[0]
                prev_mel = p
                vel = (46 if strong else 40) * level * swell + rng.uniform(-3, 3)
                note(0, t0 + b * BAR + beat * TPB, p, d * TPB * 1.1, vel)
                beat += d
        if last:
            note(0, t0 + 2 * BAR, 72, 2 * BAR, 40)  # final high C rings out

    mid = mido.MidiFile(ticks_per_beat=TPB)
    for ch, program, name in [(0, 0, "piano"), (1, 89, "warm pad")]:
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage("track_name", name=name, time=0))
        if ch == 0:
            tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(TEMPO_BPM), time=0))
        tr.append(mido.Message("program_change", channel=ch, program=program, time=0))
        tr.append(mido.Message("control_change", channel=ch, control=91, value=70, time=0))  # reverb
        tr.append(mido.Message("control_change", channel=ch, control=7, value=100 if ch == 0 else 70, time=0))
        now = 0
        for t, msg in sorted(events[ch], key=lambda e: (e[0], e[1].type == "note_on")):
            tr.append(msg.copy(time=t - now))
            now = t
        mid.tracks.append(tr)
    mid.save(out)
    print(f"wrote {out}: {len(plan)} chords, {plan[-1][0] * SEC_PER_BAR:.0f}s to the last chord")


if __name__ == "__main__":
    main(float(sys.argv[1]), sys.argv[2])
