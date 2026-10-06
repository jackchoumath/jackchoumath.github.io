"""Small procedural sound-design toolkit (numpy only) for the reel.

Every generator returns a stereo float array of shape (n, 2) at SR; `place`
mixes a sound into the master bus at a time in seconds.
"""
import numpy as np

SR = 48000


def secs(n):
    return np.arange(int(round(n * SR))) / SR


def stereo(x, pan=0.0):
    """Equal-power pan, pan in [-1, 1]."""
    th = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def adsr(n, a=0.005, d=0.1, s=0.0, r=0.2, total=None):
    t = secs(total if total is not None else n)
    env = np.zeros_like(t)
    T = t[-1] if len(t) else 0
    rel_start = max(T - r, a + d)
    env = np.where(t < a, t / max(a, 1e-6), 0)
    dec = (t >= a) & (t < a + d)
    env = np.where(dec, 1 - (1 - s) * (t - a) / max(d, 1e-6), env)
    sus = (t >= a + d) & (t < rel_start)
    env = np.where(sus, s, env)
    rel = t >= rel_start
    env = np.where(rel, s * np.clip(1 - (t - rel_start) / max(r, 1e-6), 0, 1), env)
    return env


def exp_env(dur, attack=0.004, decay=0.5):
    t = secs(dur)
    return np.minimum(t / attack, 1.0) * np.exp(-t / decay)


def onepole_lp(x, cutoff):
    """One-pole low-pass; cutoff may be an array (time-varying)."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape[:1])
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = np.zeros(x.shape[1:]) if x.ndim > 1 else 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def svf(x, cutoff, q=0.7, mode='lp'):
    """Topology-preserving (trapezoidal) state-variable filter, stable up to
    Nyquist, with time-varying cutoff (mono)."""
    fc = np.clip(np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape), 10, 0.42 * SR)
    g = np.tan(np.pi * fc / SR)
    k = 1.0 / q
    a1 = 1.0 / (1.0 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    ic1 = ic2 = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        v3 = x[i] - ic2
        v1 = a1[i] * ic1 + a2[i] * v3
        v2 = ic2 + a2[i] * ic1 + a3[i] * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v2 if mode == 'lp' else v1 if mode == 'bp' else x[i] - k * v1 - v2
    return out


def noise(dur, seed=0):
    return np.random.default_rng(seed).standard_normal(int(round(dur * SR)))


def sine(freq, dur, phase=0.0):
    t = secs(dur)
    if np.ndim(freq) == 0:
        return np.sin(2 * np.pi * freq * t + phase)
    ph = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(ph + phase)


def fm_bell(freq, dur=2.5, ratio=3.5, index=2.2, decay=0.9, bright_decay=0.25, seed=0):
    """Two-operator FM bell/glass ping."""
    t = secs(dur)
    idx = index * np.exp(-t / bright_decay)
    mod = np.sin(2 * np.pi * freq * ratio * t)
    car = np.sin(2 * np.pi * freq * t + idx * mod)
    # A quiet inharmonic partial for shimmer.
    shimmer = 0.18 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t / (decay * 0.35))
    return (car + shimmer) * exp_env(dur, 0.002, decay)


def sub_hit(freq=48, dur=1.6, drop=2.2, decay=0.45, click=0.25, seed=1, drive=2.6):
    """Pitched sub impact; the drive adds odd harmonics so it reads on small speakers."""
    t = secs(dur)
    f = freq * (1 + drop * np.exp(-t / 0.035))
    body = sine(f, dur) * exp_env(dur, 0.002, decay)
    c = noise(dur, seed) * np.exp(-t / 0.006) * click
    c = onepole_lp(c, 3500)
    return np.tanh(drive * (body + c)) / np.tanh(drive)


def whoosh(dur=1.0, f0=300, f1=4000, q=1.2, seed=2, curve=2.0, peak=0.6):
    """Band-passed noise sweep with a swelling envelope peaking at `peak`."""
    t = secs(dur) / dur
    sweep = f0 * (f1 / f0) ** (t ** curve)
    x = svf(noise(dur, seed), sweep, q=q, mode='bp')
    env = np.where(t < peak, (t / peak) ** 2, np.exp(-(t - peak) / (1 - peak) * 4))
    return x * env


def riser(dur=2.0, f0=200, f1=2400, seed=3):
    t = secs(dur) / dur
    tone = 0.0
    for k, det in enumerate([0.0, 0.004, -0.006]):
        fr = f0 * (f1 / f0) ** (t ** 1.6) * (1 + det)
        tone = tone + sine(fr, dur, phase=k)
    air = svf(noise(dur, seed), f0 * 4 * (f1 / f0) ** t, q=0.9, mode='bp')
    env = t ** 2.2
    return (0.25 * tone / 3 + 0.8 * air) * env


def tick(freq=2400, dur=0.08, seed=4):
    t = secs(dur)
    return (np.sin(2 * np.pi * freq * t) * 0.6 + noise(dur, seed) * 0.4) * np.exp(-t / 0.012)


def pad(freqs, dur, attack=1.5, release=2.0, detune=0.003, bright=1200, seed=5):
    """Soft detuned saw-ish pad from additive partials, low-passed."""
    t = secs(dur)
    rng = np.random.default_rng(seed)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = rng.uniform(0, 2 * np.pi)
            for h in range(1, 7):
                if f * h > bright * 2:
                    break
                out += np.sin(2 * np.pi * f * (1 + d) * h * t + ph * h) / (h ** 1.6)
    env = np.minimum(t / attack, 1) * np.minimum((t[-1] - t) / release, 1)
    return out * np.clip(env, 0, 1) / (len(freqs) * 3)


def highpass2(x, cutoff):
    """Second-order high-pass (two cascaded TPT stages, per channel)."""
    if x.ndim == 1:
        return svf(x, cutoff, q=0.707, mode='hp')
    return np.stack([svf(x[:, c], cutoff, q=0.707, mode='hp') for c in range(x.shape[1])], axis=1)


def reverb(x, sr=SR, seconds=2.8, decay=1.6, mix=0.25, seed=9, predelay=0.025):
    """Convolution reverb with a synthetic stereo impulse response (FFT)."""
    n = int(seconds * sr)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / sr
    ir = rng.standard_normal((n, 2)) * np.exp(-t / (decay / 6.9))[:, None]
    # Darken the tail over time.
    ir[:, 0] = onepole_lp(ir[:, 0], 6000)
    ir[:, 1] = onepole_lp(ir[:, 1], 5600)
    pd = int(predelay * sr)
    ir = np.vstack([np.zeros((pd, 2)), ir])
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    m = len(x) + len(ir) - 1
    size = 1 << (m - 1).bit_length()
    X = np.fft.rfft(x, size, axis=0)
    wet = np.stack([np.fft.irfft(X[:, c] * np.fft.rfft(ir[:, c], size), size)[:len(x)] for c in range(2)], axis=1)
    return (1 - mix) * x + mix * wet


class Bus:
    def __init__(self, dur):
        self.buf = np.zeros((int(round(dur * SR)), 2))

    def place(self, t, snd, gain=1.0, pan=0.0):
        if snd.ndim == 1:
            snd = stereo(snd, pan)
        # Short cosine tail fade so no sound ends on a click.
        n = min(len(snd) // 8, int(0.015 * SR))
        if n > 1:
            snd = snd.copy()
            snd[-n:] *= (np.cos(np.linspace(0, np.pi / 2, n)) ** 2)[:, None]
        i = int(round(t * SR))
        if i >= len(self.buf):
            return
        j = min(len(self.buf), i + len(snd))
        lo = max(0, -i)
        self.buf[max(i, 0):j] += gain * snd[lo:j - i]


def master(x, ceiling_db=-1.0, drive=1.15):
    """Gentle saturation, normalisation to a peak ceiling and short fades."""
    x = np.tanh(drive * x) / np.tanh(drive)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 10 ** (ceiling_db / 20)
    f = int(0.004 * SR)
    x[:f] *= np.linspace(0, 1, f)[:, None]
    x[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
    return x


def write_wav(path, x):
    import wave
    pcm = np.clip(x, -1, 1)
    pcm = (pcm * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
