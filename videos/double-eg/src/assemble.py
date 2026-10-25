"""Concatenate the rendered scenes into the final video, with chapters and subtitles.

    python assemble.py MEDIA_ROOT OUT_DIR [CRF]

MEDIA_ROOT is the directory passed to render.sh (it must also contain
narration_log.jsonl, written when rendering with NARRATION_LOG set).
"""

import glob
import json
import os
import re
import subprocess
import sys
import textwrap

from narration import SEGMENTS

HERE = os.path.dirname(os.path.abspath(__file__))
SCENES = [
    ("ColdOpen", "Introduction"),
    ("Schubert", "Schubert polynomials"),
    ("PipeDreams", "Pipe dreams"),
    ("Bumpless", "Bumpless pipe dreams"),
    ("BackStable", "The back-stable limit"),
    ("DoubleSchur", "Double Schur functions and the coefficients"),
    ("Positivity", "The positivity problem"),
    ("Weapons", "Three weapons"),
    ("Sword", "The sword: cutting bumpless pipe dreams"),
    ("Glasses", "The glasses: pipes become chains"),
    ("Gauntlet", "The gauntlet: swapping labels"),
    ("Theorem", "The positive formula"),
    ("Outro", "What's next"),
]

SUB = {"zero": "₀", "one": "₁", "two": "₂", "three": "₃", "i": "ᵢ", "j": "ⱼ", "minus one": "₋₁", "v": "ᵥ"}
PHRASES = [
    (r"four one three, bar, two seven six five", "413|2765"),
    (r"two one four three", "2143"),
    (r"one four three two", "1432"),
    (r"one three two", "132"),
    (r"\bw of i\b", "w(i)"),
    (r"\bn minus one chain", "(n−1)-chain"),
    (r"\b(a|b|k) chain", r"\1-chain"),
    (r"\bone chain(?! sequence)", "1-chain"),
    (r"\btwo chain(?! sequence)", "2-chain"),
    (r"\bthree chain(?! sequence)", "3-chain"),
    (r"\barchive\b", "arXiv"),
    (r"position zero, zero", "position (0, 0)"),
    (r"x minus one, minus y minus one", "x₋₁ − y₋₁"),
]


def mathify(s):
    s = re.sub(r"\s*\{\w+\}\s*", " ", s).strip()
    for a, b in PHRASES:
        s = re.sub(a, b, s)
    s = re.sub(r"\b([xyz]) (minus one|zero|one|two|three|i|j|v)\b", lambda m: m.group(1) + SUB[m.group(2)], s)
    s = re.sub(r"(?<=[ᵢⱼ₀₁₂₃ᵥ]) minus (?=[xyz][₋ᵢⱼ₀₁₂₃ᵥ])", " − ", s)
    s = re.sub(r"\bz minus (?=y)", "z − ", s)
    s = re.sub(r"\s+", " ", s)
    return s


def sentences(text):
    out = []
    for chunk in text.split("|"):
        out += [p.strip() for p in re.split(r"(?<=[.!?])\s+", chunk.strip()) if p.strip()]
    return out


def ts(t, sep=","):
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)) % 1000:03d}"


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def main(root, out_dir, crf="22"):
    timing = json.load(open(os.path.join(HERE, "audio", "timing.json")))
    log = [json.loads(l) for l in open(os.path.join(root, "narration_log.jsonl"))]
    files, offsets, t = [], {}, 0.0
    for scene, _ in SCENES:
        f = glob.glob(os.path.join(root, scene, "videos", "*", "*", f"{scene}.mp4"))
        assert len(f) == 1, (scene, f)
        files.append(f[0])
        offsets[scene] = (t, probe_duration(f[0]))
        t += offsets[scene][1]
    total = t
    os.makedirs(out_dir, exist_ok=True)

    # chapters
    meta = [";FFMETADATA1", "title=A positive combinatorial formula for the double Edelman-Greene coefficients",
            "artist=Jack Chou and Tianyi Yu (video narration synthesized)"]
    for scene, name in SCENES:
        s, d = offsets[scene]
        meta += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(s * 1000)}", f"END={int((s + d) * 1000)}", f"title={name}"]
    meta_path = os.path.join(out_dir, "chapters.txt")
    open(meta_path, "w").write("\n".join(meta) + "\n")

    # subtitles
    cues = []
    seen = set()
    for e in log:
        if (e["scene"], e["key"]) in seen:
            continue
        seen.add((e["scene"], e["key"]))
        start = offsets[e["scene"]][0] + e["t"]
        info = timing[e["key"]]
        sents = sentences(SEGMENTS[e["key"]])
        starts = info["sentences"] + [info["duration"]]
        for k, sent in enumerate(sents):
            a, b = start + starts[k], start + starts[k + 1] - 0.05
            text = mathify(sent)
            lines = textwrap.wrap(text, 46)
            groups = [lines[i:i + 2] for i in range(0, len(lines), 2)]
            n = sum(len(" ".join(g)) for g in groups)
            ta = a
            for g in groups:
                tb = ta + (b - a) * len(" ".join(g)) / n
                cues.append((ta, tb, "\n".join(g)))
                ta = tb
    cues.sort()
    srt = "\n".join(f"{i + 1}\n{ts(a)} --> {ts(b)}\n{txt}\n" for i, (a, b, txt) in enumerate(cues))
    vtt = "WEBVTT\n\n" + "\n".join(f"{ts(a, '.')} --> {ts(b, '.')}\n{txt}\n" for (a, b, txt) in cues)
    open(os.path.join(out_dir, "double-eg.srt"), "w").write(srt)
    open(os.path.join(out_dir, "double-eg.vtt"), "w").write(vtt)

    # video
    lst = os.path.join(out_dir, "concat.txt")
    open(lst, "w").write("".join(f"file '{f}'\n" for f in files))
    out = os.path.join(out_dir, "double-eg.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", meta_path,
           "-map", "0:v", "-map", "0:a", "-map_metadata", "1", "-map_chapters", "1",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-tune", "animation", "-pix_fmt", "yuv420p",
           "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
           "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    os.remove(lst)
    print(f"{out}: {total / 60:.2f} min, {os.path.getsize(out) / 1e6:.1f} MB, {len(cues)} subtitle cues")


if __name__ == "__main__":
    main(*sys.argv[1:])
