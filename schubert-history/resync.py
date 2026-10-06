"""Re-sync the film to a real recording (e.g. "Wordless" by HOYO-MiX, 1:35-2:07).

    python3 resync.py path/to/song.(mp3|m4a|wav) [--start 95] [--dur 32] [--out beats.js]

1. Trims [start, start + dur] from the song, fades the edges and loudness-normalises
   it to out/music.wav (the film's soundtrack).
2. Fits an exact constant-tempo beat grid (period and phase) to the onset envelope,
   picks the downbeat phase from the kick band, the drop (largest energy step) and
   the final hit, and detects kicks, snares, crashes and impacts by band.
3. Writes beats.js / beats.json: the film's design beats (128-BPM grid, drop on
   design beat 32, final on 64) are remapped onto the song's beats, so every
   entry starts on a real beat and the 1982 drop / final title land on the
   song's own drop and last hit.

Then render with:  node render.mjs --blur 4 --audio out/music.wav --out out/schubert-history.mp4
"""
import argparse
import json
import os
import subprocess

import librosa
import numpy as np
import scipy.signal as sg

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = {'beats': 68, 'drop': 32, 'final': 64, 'build': 16}


def load_clip(path, start, dur, out_wav):
    tmp = os.path.join(HERE, 'out', 'clip-raw.wav')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', str(dur), '-i', path,
                    '-af', f'afade=t=in:d=0.01,afade=t=out:st={dur - 0.35}:d=0.35', '-ar', '48000', '-ac', '2', tmp], check=True)
    # Two-pass linear loudness normalisation to -14 LUFS / -1 dBTP.
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    af = (f"loudnorm=I=-14:TP=-1.0:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', out_wav], check=True)
    return out_wav


def band_env(y, sr, lo, hi, hop):
    sos = sg.butter(4, [lo, min(hi, sr / 2 * 0.95)], btype='bandpass', fs=sr, output='sos')
    yb = sg.sosfilt(sos, y)
    return librosa.onset.onset_strength(y=yb, sr=sr, hop_length=hop)


def fit_grid(env, fr, dur, bpm_hint=None):
    """Constant-tempo grid maximising onset strength at the beats."""
    tempo = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=env, sr=fr * 512, hop_length=512))[0]) if bpm_hint is None else bpm_hint
    cands = [tempo * m for m in (0.5, 1, 2)]
    tempo = min((c for c in cands if 95 <= c <= 170), key=lambda c: abs(c - 128), default=tempo)
    t_env = np.arange(len(env)) / fr
    best = (-1, None, None)
    for P in np.linspace(60 / tempo * 0.97, 60 / tempo * 1.03, 161):
        for ph in np.linspace(0, P, 96, endpoint=False):
            ts = np.arange(ph, dur, P)
            sc = np.interp(ts, t_env, env).sum() / len(ts)
            if sc > best[0]:
                best = (sc, P, ph)
    _, P, ph = best
    # Fine phase refinement.
    for ph2 in np.linspace(ph - P / 96, ph + P / 96, 41):
        ts = np.arange(ph2 % P, dur, P)
        sc = np.interp(ts, t_env, env).sum() / len(ts)
        if sc > best[0]:
            best = (sc, P, ph2 % P)
    return best[1], best[2]


def _attack_curve(y, sr):
    """Rise of a 4 ms RMS envelope (linear energy, so quiet sounds do not dominate)."""
    win, hop = int(0.004 * sr), int(0.001 * sr)
    e = np.sqrt(np.convolve(y ** 2, np.ones(win) / win, mode='same')[::hop])
    d = np.maximum(0, np.diff(e, prepend=e[0]))
    return np.convolve(d, np.ones(3) / 3, mode='same'), np.arange(len(d)) * hop / sr


def attack_offset(y, sr, ph, P, dur, lo=-0.07, hi=0.02):
    d, t = _attack_curve(y, sr)
    ts = np.arange(ph, dur, P)
    deltas = np.arange(lo, hi, 0.001)
    score = [np.interp(ts + dl, t, d).sum() for dl in deltas]
    return float(deltas[int(np.argmax(score))])


def refine_times(y, sr, times, lo=-0.07, hi=0.02):
    d, t = _attack_curve(y, sr)
    out = []
    for x in times:
        m = (t >= x + lo) & (t <= x + hi)
        out.append(float(t[m][np.argmax(d[m])]) if m.any() else x)
    return out


def peaks(env, fr, thresh_q, min_gap):
    h = np.quantile(env, thresh_q)
    idx, _ = sg.find_peaks(env, height=h, distance=max(1, int(min_gap * fr)))
    return list(idx / fr)


def analyse(wav, dur):
    sr, hop = 22050, 512
    y, _ = librosa.load(wav, sr=sr, mono=True)
    fr = sr / hop
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.median)
    P, ph = fit_grid(env, fr, dur)
    # Onset envelopes lag the true attack by a few tens of ms: re-align the grid to
    # the steepest rise of a 2 ms-resolution energy envelope (sample accurate).
    off = attack_offset(y, sr, ph, P, dur)
    ph = ph + off
    k0 = int(np.ceil((-0.06 - ph) / P))        # first grid line at or after -60 ms
    beats = [ph + k * P for k in range(k0, int((dur - ph) / P) + 1)]
    beats[0] = max(0.0, beats[0])
    print(f'  grid: period {P:.5f} s, attack correction {off * 1000:+.0f} ms, first beat {beats[0]:.3f} s')
    low = band_env(y, sr, 35, 160, hop)
    mid = band_env(y, sr, 900, 5000, hop)
    high = band_env(y, sr, 6000, 11000, hop)
    t_env = np.arange(len(low)) / fr
    at = lambda e, ts: np.interp(ts, t_env, e)
    # Downbeat phase: where the kick band is strongest every 4 beats.
    phase = int(np.argmax([at(low, beats[m::4]).mean() for m in range(4)]))
    downbeats = beats[phase::4]
    # Drop: downbeat in the middle 30-75% with the largest energy step (2 bars after vs before).
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    rmsdb = 20 * np.log10(rms + 1e-6)
    t_r = np.arange(len(rms)) / fr
    bar = 4 * P

    def mean_db(a, b):
        m = (t_r >= a) & (t_r < b)
        return rmsdb[m].mean() if m.any() else -120
    cand = [d for d in downbeats if 0.3 * dur <= d <= 0.75 * dur]
    drop = max(cand, key=lambda d: mean_db(d, d + 2 * bar) - mean_db(d - 2 * bar, d)) if cand else downbeats[len(downbeats) // 2]
    # Final hit: strongest broadband onset on a downbeat in the last 4.5 s, at least 1.4 s before the end.
    late = [d for d in downbeats if dur - 4.5 <= d <= dur - 1.4]
    final = max(late, key=lambda d: at(env, [d])[0]) if late else downbeats[-2]
    grid = np.array(beats)
    on_grid = lambda ts, sub: [x for x in ts if np.min(np.abs((x - grid[:, None]) - np.arange(sub) * P / sub)) < 0.06]
    kicks = on_grid(refine_times(y, sr, peaks(low, fr, 0.80, P * 0.4)), 1)    # kicks sit on beats
    claps = on_grid(refine_times(y, sr, peaks(mid, fr, 0.85, P * 0.4)), 2)    # snares on beats or half-beats
    crashes = refine_times(y, sr, peaks(high, fr, 0.985, bar * 0.9))
    impacts = [0.0, round(drop, 4), round(final, 4)]
    return dict(P=P, beats=beats, downbeats=downbeats, drop=drop, final=final, kicks=kicks, claps=claps, crashes=crashes, impacts=impacts)


def remap(an, dur):
    """Design beat b (128-BPM design, drop on 32, final on 64) -> time on the song's grid."""
    beats = np.array(an['beats'])
    idx = lambda t: int(np.argmin(np.abs(beats - t)))
    i_drop, i_final = idx(an['drop']), idx(an['final'])
    i0 = 0
    anchors_d = [0, DESIGN['drop'], DESIGN['final']]
    anchors_s = [i0, i_drop, i_final]
    tail = (i_final - i_drop) / (DESIGN['final'] - DESIGN['drop'])
    out = []
    for b in range(DESIGN['beats'] + 1):
        if b <= DESIGN['final']:
            s = np.interp(b, anchors_d, anchors_s)
        else:
            s = i_final + (b - DESIGN['final']) * tail
        s = int(round(s))
        t = beats[s] if s < len(beats) else beats[-1] + (s - len(beats) + 1) * an['P']
        out.append(round(float(t), 6))
    # Monotone (strictly increasing) after rounding.
    for k in range(1, len(out)):
        if out[k] <= out[k - 1]:
            out[k] = out[k - 1] + 0.01
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('song')
    ap.add_argument('--start', type=float, default=95.0)
    ap.add_argument('--dur', type=float, default=32.0)
    ap.add_argument('--out', default=os.path.join(HERE, 'beats.js'))
    ap.add_argument('--wav', default=os.path.join(HERE, 'out', 'music.wav'))
    a = ap.parse_args()
    wav = load_clip(a.song, a.start, a.dur, a.wav)
    an = analyse(wav, a.dur)
    design_beats = remap(an, a.dur)
    bt = lambda b: float(np.interp(b, np.arange(len(design_beats)), design_beats))
    gap = [bt(DESIGN['drop'] - 1), bt(DESIGN['drop'])]
    first = [x for x in an['kicks'] + an['claps'] if 0.4 < x < bt(8) - 0.5]
    toms = []
    for x in sorted(first):                    # the intro's first six hits, at least 0.18 s apart
        if not toms or x - toms[-1] >= 0.18:
            toms.append(x)
    toms = toms[:6]
    beats = {
        'source': f'resync.py: {os.path.basename(a.song)} [{a.start:.2f}, {a.start + a.dur:.2f}]',
        'bpm': round(60 / an['P'], 3), 'beat': an['P'], 'duration': a.dur,
        'beats': design_beats, 'downbeats': [round(x, 6) for x in an['downbeats']],
        'sections': {'intro': 0.0, 'build': bt(DESIGN['build']), 'drop': bt(DESIGN['drop']), 'final': bt(DESIGN['final']), 'end': a.dur},
        'kicks': [round(x, 4) for x in an['kicks']], 'claps': [round(x, 4) for x in an['claps']],
        'crashes': [round(x, 4) for x in an['crashes']], 'impacts': [0.0, bt(DESIGN['drop']), bt(DESIGN['final'])],
        'toms': [round(x, 4) for x in toms], 'rolls': [[bt(DESIGN['drop'] - 4), bt(DESIGN['drop'] - 1)]],
        'risers': [[bt(DESIGN['drop'] - 8), bt(DESIGN['drop'] - 1)]], 'gaps': [gap],
    }
    with open(a.out, 'w') as fh:
        fh.write('// Generated by resync.py: the beat/hit map the film locks to.\nwindow.BEATS = ' + json.dumps(beats) + ';\n')
    with open(os.path.splitext(a.out)[0] + '.json', 'w') as fh:
        json.dump(beats, fh, indent=1)
    print(f"tempo {60 / an['P']:.2f} BPM, first beat {an['beats'][0]:.3f} s, drop {an['drop']:.2f} s, final {an['final']:.2f} s, "
          f"{len(an['kicks'])} kicks, {len(an['claps'])} snares, {len(an['crashes'])} crashes -> {a.out}")


if __name__ == '__main__':
    main()
