"""Join the rendered scenes into the final video, with narration, music and chapters.

    python assemble.py MEDIA_ROOT OUT_DIR [CRF]

MEDIA_ROOT is the directory passed to render.sh.  The captions are part of the
picture.  The narration is the scenes' own audio (see tts.py); the background
music from bgm.py is rendered with FluidSynth, kept well below the voice and
ducked a little more while someone is speaking.  Without narration the music
alone is the soundtrack.
"""

import glob
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOUNDFONT = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
SCENES = [
    ("Hook", "Introduction"),
    ("Setup", "Our permutation and its pipedreams"),
    ("Coefficients", "Double Schur functions and the coefficients"),
    ("Problem", "The positivity problem"),
    ("HorizonCut", "Step 1: the horizon cut"),
    ("Flip", "Step 2: flip the top piece"),
    ("DiagonalCut", "Step 3: the staircase cut"),
    ("Chains", "Step 4: trapezoids as chains"),
    ("Reverse", "Step 5: reverse the bars"),
    ("Assemble", "Putting it together"),
    ("Outro", "The paper"),
]
# the music changes character where these scenes begin
MUSIC_SECTIONS = ["Setup", "HorizonCut", "Assemble"]
VOICE_LUFS = -16.0       # narration
MUSIC_LUFS = -30.0       # music under narration (before ducking)
MUSIC_ONLY_LUFS = -22.0  # music when there is no narration


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def has_audio(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout
    return bool(out.strip())


def loudness(path):
    """Integrated loudness in LUFS."""
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True, check=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])


def main(root, out_dir, crf="22"):
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
            "artist=Jack Chen-An Chou and Tianyi Yu"]
    for scene, name in SCENES:
        s, d = offsets[scene]
        meta += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(s * 1000)}", f"END={int((s + d) * 1000)}", f"title={name}"]
    meta_path = os.path.join(root, "chapters.txt")
    open(meta_path, "w").write("\n".join(meta) + "\n")

    # music
    mid, wav = os.path.join(root, "bgm.mid"), os.path.join(root, "bgm.wav")
    starts = [f"{offsets[s][0]:.2f}" for s in MUSIC_SECTIONS]
    subprocess.run([sys.executable, os.path.join(HERE, "bgm.py"), f"{total:.2f}", mid, *starts], check=True)
    subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.5", "-r", "48000", "-F", wav, SOUNDFONT, mid], check=True)

    # narration: each scene's audio, padded to the exact length of its video
    voiced = [has_audio(f) for f in files]
    assert all(voiced) or not any(voiced), "some scenes have narration and some do not"
    voice = None
    if all(voiced):
        voice = os.path.join(root, "voice.wav")
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        for f in files:
            cmd += ["-i", f]
        parts = [f"[{k}:a]aresample=48000,apad=whole_dur={offsets[s][1]:.6f},atrim=0:{offsets[s][1]:.6f}[a{k}]"
                 for k, (s, _) in enumerate(SCENES)]
        graph = ";".join(parts) + ";" + "".join(f"[a{k}]" for k in range(len(files))) + f"concat=n={len(files)}:v=0:a=1[a]"
        subprocess.run(cmd + ["-filter_complex", graph, "-map", "[a]", "-ac", "2", voice], check=True)

    out = os.path.join(out_dir, "double-eg.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for f in files:
        cmd += ["-i", f]
    n = len(files)
    music = (f"[{n}:a]aresample=48000,atrim=0:{total:.3f},afade=t=in:d=3,afade=t=out:st={total - 6:.3f}:d=6,"
             f"volume={(MUSIC_LUFS if voice else MUSIC_ONLY_LUFS) - loudness(wav):.2f}dB")
    graph = "".join(f"[{k}:v]" for k in range(n)) + f"concat=n={n}:v=1:a=0[v];"
    if voice:
        cmd += ["-i", wav, "-i", voice, "-i", meta_path]
        graph += (f"{music}[mu];[{n + 1}:a]aresample=48000,volume={VOICE_LUFS - loudness(voice):.2f}dB,"
                  f"asplit=2[vo][sc];"
                  f"[mu][sc]sidechaincompress=threshold=0.05:ratio=2:attack=80:release=1000[duck];"
                  f"[vo][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9:level=disabled[a]")
        meta_in = n + 2
    else:
        cmd += ["-i", wav, "-i", meta_path]
        graph += f"{music}[a]"
        meta_in = n + 1
    cmd += ["-filter_complex", graph, "-map", "[v]", "-map", "[a]",
            "-map_metadata", str(meta_in), "-map_chapters", str(meta_in),
            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-tune", "animation", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-t", f"{total:.3f}", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(f"{out}: {total / 60:.2f} min, {os.path.getsize(out) / 1e6:.1f} MB")


if __name__ == "__main__":
    main(*sys.argv[1:])
