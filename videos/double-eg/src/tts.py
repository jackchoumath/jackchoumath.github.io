"""Synthesize the narration with Pocket TTS (Kyutai), run through sherpa-onnx.

    python tts.py POCKET_DIR WHISPER_DIR    # writes audio/<key>.wav and audio/timing.json

POCKET_DIR is sherpa-onnx-pocket-tts-int8-2026-01-26 and WHISPER_DIR is
sherpa-onnx-whisper-small.en, both from the sherpa-onnx releases on GitHub
(tts-models and asr-models).  The voice is cloned from the model's bundled
reference clip test_wavs/bria.wav.

The spoken lines are the strings passed to `self.say(...)` in scenes_*.py.
Pocket TTS is a language-model TTS: very natural, but it can garble isolated
letters and long runs of formulas.  So single letters are spelled out the way
they are said, sentences full of formulas are read a phrase at a time, and every
piece is transcribed with Whisper and regenerated until it says what it should.
"""

import ast
import glob
import hashlib
import json
import os
import re
import sys

import numpy as np
import sherpa_onnx
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "audio")
REFERENCE = "bria"
REFERENCE_SECONDS = 21.4       # three whole sentences; a clip that stops mid-word makes
                               # the model start some lines with a stray word
SR = 24000
TARGET_RMS_DB = -20.0          # loudness of the voiced parts of every line
PAUSE = {",": 0.16, ":": 0.3, ".": 0.36, "?": 0.42, "!": 0.36}
TRIES = 10
TAKES = 3                      # good takes of each phrase to compare; the most typical one is kept
GOOD_ENOUGH = 0.08             # word error rate at which a take is accepted
LONGEST_GAP = 0.5              # seconds of silence inside a phrase that make a take unnatural

# how letters and names are written for the model (only the TTS input changes):
# single-letter variables as capitals, which it reads as letters in a natural tone
LETTERS = "wxyijsurknz"
WORDS = {"Sottile's": "Sotteel's", "Edelman-Greene": "Edelman Greene",
         "Lam, Lee and Shimozono": "Lam Lee and Shimozono"}
UNSPELLABLE = ("Sotteel's",)   # Whisper cannot spell these, so they match any word
LETTER_NAMES = {"why": "y", "ex": "x", "eye": "i", "jay": "j", "ess": "s", "kay": "k", "zee": "z"}
CONTRACTIONS = {"here's": "here is", "there's": "there is", "that's": "that is", "it's": "it is", "let's": "let us",
                "we'll": "we will", "doesn't": "does not", "can't": "can not", "don't": "do not"}
NUMS = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six",
        "7": "seven", "8": "eight", "9": "nine"}


def line_key(text):
    return hashlib.sha1(text.encode()).hexdigest()[:12]


def spoken_lines():
    """Every string the scenes pass to say(), directly or through a list of lines."""
    lines = []
    for path in sorted(glob.glob(os.path.join(HERE, "scenes_*.py"))):
        tree = ast.parse(open(path).read())
        lists = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign) and isinstance(node.value, ast.List) and len(node.targets) == 1 \
                    and isinstance(node.targets[0], ast.Name):
                lists[node.targets[0].id] = [e.value for e in node.value.elts if isinstance(e, ast.Constant)]
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                 and n.func.attr == "say"]
        for call in sorted(calls, key=lambda n: n.lineno):
            arg = call.args[0]
            if isinstance(arg, ast.Constant):
                lines.append(arg.value)
            elif isinstance(arg, ast.Subscript) and isinstance(arg.value, ast.Name):
                lines += lists[arg.value.id]
            else:
                raise ValueError(f"{path}:{call.lineno}: say() needs a string or a list of strings")
    return list(dict.fromkeys(lines))


def respell(text):
    for a, b in WORDS.items():
        text = text.replace(a, b)
    return re.sub(r"(?<![\w'-])([a-z])(?![\w'-])", lambda m: m.group(1).upper() if m.group(1) in LETTERS
                  else m.group(1), text)


def pieces(text):
    """Split a line into (piece, pause after it).  Sentences with formulas are read
    one comma-separated phrase at a time; very long sentences are split too."""
    out = []
    for sent in re.split(r"(?<=[.!?:])\s+", text.strip()):
        if sent.count(" minus ") >= 2 or len(sent) > 170:
            parts, buf = [], ""
            shortest = 14 if " minus " in sent else 40
            for p in re.split(r"(?<=,)\s+", sent):
                buf = f"{buf} {p}".strip()
                if len(buf) >= shortest:
                    parts.append(buf)
                    buf = ""
            if buf:
                if parts:
                    parts[-1] += " " + buf
                else:
                    parts.append(buf)
        else:
            parts = [sent]
        out += [(p, PAUSE.get(p[-1], 0.2)) for p in parts]
    return out


def words(text):
    """Normalized words for comparing what was meant with what Whisper heard."""
    t = text.lower().replace("−", " minus ").replace("–", " ").replace("’", "'")
    for a, b in CONTRACTIONS.items():
        t = t.replace(a, b)
    t = re.sub(r"(?<![a-z0-9])-(?=\d)", " minus ", t)
    t = re.sub(r"\d", lambda m: f" {NUMS[m.group(0)]} ", t)
    t = t.replace("-", " ").replace("'s", "s").replace("greene", "green").replace("shur", "schur")
    t = re.sub(r"\b(piri|peri|pierre)\b", "pieri", t)    # Whisper's spellings of Pieri
    t = t.replace("non negative", "nonnegative").replace("double you", "w").replace("double u", "w")
    out = []
    for w in re.findall(r"[a-z']+", t):
        if re.fullmatch(r"[a-z]sub", w):
            out += [w[0], "sub"]
        elif w in LETTER_NAMES:
            out.append(LETTER_NAMES[w])
        elif len(w) == 2 and all(c in LETTERS for c in w) and w not in ("us", "is", "in"):
            out += list(w)                       # Whisper writes "x i" as "xi"
        else:
            out.append(w)
    return out


def check(said, heard):
    """Word error rate, counting a wrong first or last word as a failure (that is
    where a clipped or invented word shows up)."""
    for name in UNSPELLABLE:
        said = said.replace(name, "ANYWORD")
    ref, hyp = words(said), words(heard)
    e = wer(ref, hyp)
    if not hyp or ref[0] not in (hyp[0], "anyword") or ref[-1] not in (hyp[-1], "anyword"):
        e += 1.0
    return e


def wer(ref, hyp):
    d = list(range(len(hyp) + 1))
    for i, a in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, b in enumerate(hyp, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (a != b and a != "anyword"))
    return d[-1] / max(1, len(ref))


def trim(audio):
    """Cut silence at both ends, and the click the model makes at the very start of
    its output (a burst in the first few frames, then a gap, then the speech)."""
    frame = SR // 100
    n = len(audio) // frame
    rms = np.sqrt(np.mean(audio[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    loud = rms > 0.03 * rms.max()
    first = int(np.argmax(loud))
    if first <= 3:
        for k in range(first + 1, min(first + 8, n - 4)):
            if not loud[k: k + 4].any():
                first = k + 4 + int(np.argmax(loud[k + 4:]))
                break
    last = n - 1 - int(np.argmax(loud[::-1]))
    return audio[max(0, first - 3) * frame: min(len(audio), (last + 5) * frame)]


def longest_gap(audio):
    frame = SR // 100
    n = len(audio) // frame
    rms = np.sqrt(np.mean(audio[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    quiet = rms < 0.04 * rms.max()
    longest = run = 0
    for q in quiet:
        run = run + 1 if q else 0
        longest = max(longest, run)
    return longest / 100


def prosody(audio):
    """Pitch (semitones around the median) and loudness contours on a common time
    axis, and the duration: what distinguishes one take's delivery from another's."""
    hop, win = SR // 100, SR // 25
    n = (len(audio) - win) // hop
    frames = np.lib.stride_tricks.sliding_window_view(audio, win)[::hop][:n] * np.hanning(win)
    ac = np.fft.irfft(np.abs(np.fft.rfft(frames, 2 * win, axis=1)) ** 2, axis=1)[:, :win]
    lo, hi = SR // 400, SR // 70
    lag = lo + np.argmax(ac[:, lo:hi], axis=1)
    db = 10 * np.log10(ac[:, 0] / win + 1e-10)
    voiced = (ac[np.arange(n), lag] > 0.4 * ac[:, 0]) & (db > db.max() - 30)
    t, grid = np.linspace(0, 1, n), np.linspace(0, 1, 40)
    st = 12 * np.log2(SR / lag)
    pitch = np.interp(grid, t[voiced], st[voiced] - np.median(st[voiced])) if voiced.sum() > 5 else np.zeros(40)
    return pitch, np.interp(grid, t, db - db.max()), len(audio) / SR


def most_typical(takes):
    """The take whose delivery is closest to the others': an odd stress or pause
    in one take makes it the outlier."""
    feats = [prosody(a) for a in takes]
    dist = lambda f, g: (np.mean(np.abs(f[0] - g[0])) + 0.15 * np.mean(np.abs(f[1] - g[1]))
                         + 8 * abs(np.log(f[2] / g[2])))
    return takes[int(np.argmin([sum(dist(f, g) for g in feats) for f in feats]))]


def level(audio):
    frame = SR // 100
    n = len(audio) // frame
    rms = np.sqrt(np.mean(audio[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    voiced = rms[rms > 0.1 * rms.max()]
    audio = audio * (10 ** (TARGET_RMS_DB / 20) / np.sqrt(np.mean(voiced ** 2)))
    peak = np.abs(audio).max()
    if peak > 0.95:
        audio *= 0.95 / peak
    fade = int(0.01 * SR)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    return audio.astype(np.float32)


def main(pocket_dir, whisper_dir):
    P, Wd = pocket_dir, whisper_dir
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        pocket=sherpa_onnx.OfflineTtsPocketModelConfig(
            lm_flow=f"{P}/lm_flow.int8.onnx", lm_main=f"{P}/lm_main.int8.onnx", encoder=f"{P}/encoder.onnx",
            decoder=f"{P}/decoder.int8.onnx", text_conditioner=f"{P}/text_conditioner.onnx",
            vocab_json=f"{P}/vocab.json", token_scores_json=f"{P}/token_scores.json"),
        num_threads=4, provider="cpu")))
    asr = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=f"{Wd}/small.en-encoder.int8.onnx", decoder=f"{Wd}/small.en-decoder.int8.onnx",
        tokens=f"{Wd}/small.en-tokens.txt", language="en", task="transcribe", num_threads=4)
    ref, ref_sr = sf.read(f"{P}/test_wavs/{REFERENCE}.wav", dtype="float32")
    ref = ref[: int(REFERENCE_SECONDS * ref_sr)]
    gen = sherpa_onnx.GenerationConfig()
    gen.reference_audio, gen.reference_sample_rate, gen.num_steps = ref, ref_sr, 5

    def hear(audio):
        # with no silence around it, Whisper tends to invent a leading "and"
        pad = np.zeros(SR // 2, dtype=np.float32)
        audio = np.concatenate([pad, audio, pad])
        t = np.arange(0, len(audio) / SR, 1 / 16000)
        s = asr.create_stream()
        s.accept_waveform(16000, np.interp(t, np.arange(len(audio)) / SR, audio).astype(np.float32))
        asr.decode_stream(s)
        return s.result.text.strip()

    os.makedirs(OUT, exist_ok=True)
    meta_path = os.path.join(OUT, "timing.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    lines = spoken_lines()
    doubtful = []
    for line in lines:
        key = line_key(line)
        sig = hashlib.sha1(json.dumps([line, REFERENCE, REFERENCE_SECONDS, PAUSE, LETTERS, WORDS, TARGET_RMS_DB,
                                         TAKES]).encode()).hexdigest()
        wav = os.path.join(OUT, f"{key}.wav")
        if meta.get(key, {}).get("sig") == sig and os.path.exists(wav):
            continue
        chunks = []
        todo = pieces(line)
        while todo:
            text, pause = todo.pop(0)
            said = respell(text)
            said = said[0].upper() + said[1:]    # a lowercase start reads as "and ..."
            best, good = None, []
            for attempt in range(TRIES):
                a = trim(np.array(tts.generate(said, gen).samples, dtype=np.float32))
                heard = hear(a)
                e = check(said, heard)
                if best is None or e < best[0]:
                    best = (e, a, heard)
                if e <= GOOD_ENOUGH and longest_gap(a) <= LONGEST_GAP:
                    good.append(a)
                    if len(good) == TAKES:
                        break
            if good:
                best = (0.0, most_typical(good), "")
            elif re.search(r",\s", text[:-1]):
                # read it in two halves instead (e.g. repetitive phrasing makes the model stutter)
                parts = re.split(r"(?<=,)\s+", text)
                h = len(parts) // 2
                todo[:0] = [(" ".join(parts[:h]), PAUSE[","]), (" ".join(parts[h:]), pause)]
                continue
            else:
                doubtful.append((round(best[0], 2), said, best[2]))
            chunks += [best[1], np.zeros(int(pause * SR), dtype=np.float32)]
        audio = level(np.concatenate(chunks[:-1]))
        sf.write(wav, audio, SR)
        meta[key] = {"sig": sig, "duration": round(len(audio) / SR, 3)}
        print(f"{key}  {meta[key]['duration']:5.2f}s  {line[:70]}", flush=True)
        json.dump(meta, open(meta_path, "w"), indent=1)
    keys = {line_key(l) for l in lines}
    meta = {k: v for k, v in meta.items() if k in keys}
    json.dump(meta, open(meta_path, "w"), indent=1)
    total = sum(v["duration"] for v in meta.values())
    print(f"{len(meta)} lines, {total / 60:.1f} min of speech")
    for e, said, heard in doubtful:
        print(f"check by ear ({e}): wanted {said!r}, heard {heard!r}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
