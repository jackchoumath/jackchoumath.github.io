"""Check that every v.until(...) refers to a sentence/marker that exists."""
import json, re, sys
T = json.load(open("audio/timing.json"))
bad = 0
for fn in sys.argv[1:]:
    key = None
    for n, line in enumerate(open(fn), 1):
        m = re.search(r'self\.voice\("(\w+)"\)', line)
        if m:
            key = m.group(1)
            if key not in T:
                print(f"{fn}:{n}: unknown segment {key}"); bad += 1
        for ref in re.findall(r'(?:until|left|at)\("(\w+)"', line):
            info = T.get(key, {})
            ok = (ref.startswith("s") and ref[1:].isdigit() and int(ref[1:]) < len(info.get("sentences", []))) \
                 or ref in info.get("markers", {})
            if not ok:
                print(f"{fn}:{n}: [{key}] bad reference {ref!r} (sentences={len(info.get('sentences', []))}, markers={list(info.get('markers', {}))})")
                bad += 1
print("lint:", "OK" if not bad else f"{bad} problems")
