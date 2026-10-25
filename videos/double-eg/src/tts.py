"""Synthesize the narration with Kokoro (82M, ONNX).

Voice: a blend of 70% zf_xiaobei (Mandarin female speaker) and 30% af_nicole
(soft American female speaker), reading English.

    python tts.py MODEL_DIR       # writes audio/<key>.wav + audio/timing.json

MODEL_DIR must contain kokoro-v1.0.onnx and voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Each segment is synthesized sentence by sentence so that we know when every
sentence starts.  A marker such as {pd2} inside the text is not spoken; its
time is estimated from its phoneme position within the sentence, and the
animation code can wait for it.
"""

import hashlib
import json
import os
import re
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import EspeakConfig, Kokoro

from narration import PRONUNCIATION, SEGMENTS

VOICE_MIX = {"zf_xiaobei": 0.7, "af_nicole": 0.3}
SPEED = 0.95
PAUSE = {".": 0.42, "!": 0.45, "?": 0.48, ":": 0.3, ",": 0.18, ";": 0.25}
SR = 24000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")


def to_phonemes(k, text):
    pattern = r"\b(" + "|".join(map(re.escape, PRONUNCIATION)) + r")\b"
    out = []
    for part in re.split(pattern, text):
        if part in PRONUNCIATION:
            out.append(PRONUNCIATION[part])
        elif part.strip():
            out.append(k.tokenizer.phonemize(part, "en-us"))
    return " ".join(out)


def sentences(text):
    """Split into sentences (and at explicit '|'), keeping markers attached."""
    pieces = []
    for chunk in text.split("|"):
        for s in re.split(r"(?<=[.!?])\s+", chunk.strip()):
            if s.strip():
                pieces.append(s.strip())
    return pieces


def main(model_dir):
    espeak = EspeakConfig(lib_path="/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1",
                          data_path="/usr/lib/x86_64-linux-gnu/espeak-ng-data")
    k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"),
               os.path.join(model_dir, "voices-v1.0.bin"), espeak_config=espeak)
    style = sum(w * k.get_voice_style(v) for v, w in VOICE_MIX.items())
    os.makedirs(OUT, exist_ok=True)
    meta_path = os.path.join(OUT, "timing.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for key, text in SEGMENTS.items():
        sig = hashlib.sha1(json.dumps([text, VOICE_MIX, SPEED, PAUSE, PRONUNCIATION]).encode()).hexdigest()
        wav = os.path.join(OUT, f"{key}.wav")
        if meta.get(key, {}).get("sig") == sig and os.path.exists(wav):
            continue
        chunks, starts, markers, t = [], [], {}, 0.0
        for s in sentences(text):
            spoken = re.sub(r"\s*\{\w+\}\s*", " ", s).strip()
            ph = to_phonemes(k, spoken)
            audio, _ = k.create(ph, voice=style, speed=SPEED, is_phonemes=True)
            d = len(audio) / SR
            for m in re.finditer(r"\{(\w+)\}", s):
                prefix = re.sub(r"\s*\{\w+\}\s*", " ", s[:m.start()]).strip()
                frac = len(to_phonemes(k, prefix)) / max(1, len(ph)) if prefix else 0.0
                markers[m.group(1)] = round(t + frac * d, 3)
            starts.append(round(t, 3))
            chunks.append(audio)
            gap = PAUSE.get(spoken[-1], 0.1)
            chunks.append(np.zeros(int(gap * SR), dtype=np.float32))
            t += d + gap
        audio = np.concatenate(chunks[:-1])
        audio = audio / max(1e-6, np.abs(audio).max()) * 0.85
        sf.write(wav, audio, SR)
        meta[key] = {"sig": sig, "duration": round(len(audio) / SR, 3),
                     "sentences": starts, "markers": markers}
        print(f"{key:4s} {meta[key]['duration']:6.2f}s  {markers if markers else ''}")
        json.dump(meta, open(meta_path, "w"), indent=1)
    total = sum(meta[k_]["duration"] for k_ in SEGMENTS)
    print(f"total narration: {total / 60:.1f} min")


if __name__ == "__main__":
    main(sys.argv[1])
