"""Synthesize the narration with Kokoro (82M, ONNX), voice af_heart.

    python tts.py MODEL_DIR       # writes audio/<key>.wav and audio/timing.json

MODEL_DIR must contain kokoro-v1.0.onnx and voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0.
Needs kokoro-onnx, misaki[en] (Python < 3.13), spaCy's en_core_web_sm and
espeak-ng.  Text is turned into phonemes by misaki, the G2P Kokoro was trained
with, and each caption's line is read in one go so the intonation runs
naturally across its sentences.  Clips are keyed by caption (see common.py).
"""

import hashlib
import json
import os
import sys

import espeakng_loader
import numpy as np
import soundfile as sf

# use the system espeak-ng (the bundled loader points at a build-machine path)
espeakng_loader.get_library_path = lambda: "/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1"
espeakng_loader.get_data_path = lambda: "/usr/lib/x86_64-linux-gnu/espeak-ng-data"

from kokoro_onnx import EspeakConfig, Kokoro  # noqa: E402
from misaki import en, espeak  # noqa: E402

from narration import NARRATION  # noqa: E402

VOICE = "af_heart"
SPEED = 0.9
SR = 24000
TARGET_RMS_DB = -20.0          # loudness of the voiced parts of every clip
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")


def caption_key(text):
    return hashlib.sha1(text.encode()).hexdigest()[:12]


def trim_and_level(audio):
    """Cut leading/trailing silence and bring every clip to the same level."""
    frame = SR // 100
    n = len(audio) // frame
    rms = np.sqrt(np.mean(audio[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    loud = np.where(rms > 0.02 * rms.max())[0]
    a, b = max(0, loud[0] - 3) * frame, min(len(audio), (loud[-1] + 6) * frame)
    audio = audio[a:b]
    voiced = rms[loud]
    gain = 10 ** (TARGET_RMS_DB / 20) / np.sqrt(np.mean(voiced ** 2))
    audio = audio * gain
    peak = np.abs(audio).max()
    if peak > 0.95:
        audio *= 0.95 / peak
    fade = int(0.01 * SR)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    return audio.astype(np.float32)


def main(model_dir):
    k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"),
               espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(),
                                          data_path=espeakng_loader.get_data_path()))
    g2p = en.G2P(trf=False, british=False, fallback=espeak.EspeakFallback(british=False))
    os.makedirs(OUT, exist_ok=True)
    meta_path = os.path.join(OUT, "timing.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for caption, spoken in NARRATION.items():
        key = caption_key(caption)
        sig = hashlib.sha1(json.dumps([spoken, VOICE, SPEED, TARGET_RMS_DB]).encode()).hexdigest()
        wav = os.path.join(OUT, f"{key}.wav")
        if meta.get(key, {}).get("sig") == sig and os.path.exists(wav):
            continue
        phonemes, _ = g2p(spoken)
        audio, sr = k.create(phonemes, voice=VOICE, speed=SPEED, is_phonemes=True)
        assert sr == SR
        audio = trim_and_level(audio)
        sf.write(wav, audio, SR)
        meta[key] = {"sig": sig, "duration": round(len(audio) / SR, 3)}
        print(f"{key}  {meta[key]['duration']:5.2f}s  {spoken[:70]}")
        json.dump(meta, open(meta_path, "w"), indent=1)
    keys = {caption_key(c) for c in NARRATION}
    meta = {k_: v for k_, v in meta.items() if k_ in keys}
    json.dump(meta, open(meta_path, "w"), indent=1)
    total = sum(v["duration"] for v in meta.values())
    words = sum(len(s.split()) for s in NARRATION.values())
    print(f"{len(meta)} clips, {total / 60:.1f} min of speech, {words / (total / 60):.0f} words per minute")


if __name__ == "__main__":
    main(sys.argv[1])
