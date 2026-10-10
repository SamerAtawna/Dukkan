#!/usr/bin/env python3
"""Generate the demo narration with Gemini TTS, one clip per segment of docs/narration.md,
plus a full-length track with each clip placed at its timestamp.

Usage: GEMINI_API_KEY=... python3 scripts/narration-tts.py [out_dir] [voice] [model]
"""
import base64, io, json, os, re, sys, urllib.error, urllib.request, wave

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Movies/CapCut/dukkan-narration")
VOICE = sys.argv[2] if len(sys.argv) > 2 else "Charon"
MODEL = sys.argv[3] if len(sys.argv) > 3 else "gemini-3.8-flash-tts"
TOTAL = 133.25
KEY = os.environ.get("GEMINI_API_KEY") or sys.exit("Set GEMINI_API_KEY in the environment first.")
# No style prefix: gemini-3.8-flash-tts reads any instruction text aloud and rejects systemInstruction.
STYLE = ""

md = open(os.path.join(os.path.dirname(__file__), "..", "docs", "narration.md")).read()
block = md.split("```")[1]
segs = []
for m in re.finditer(r"\[(\d+):(\d+) ([^\]]+)\]\n(.+?)(?=\n\n\[|\n*$)", block, re.S):
    t = int(m[1]) * 60 + int(m[2])
    segs.append({"t": t, "label": m[3], "text": " ".join(m[4].split())})
assert segs, "no segments parsed"

os.makedirs(OUT, exist_ok=True)

def tts(text):
    body = {
        "contents": [{"parts": [{"text": STYLE + text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), method="POST",
        headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")
        sys.exit(f"Gemini API error {e.code}: {msg[:400]}\n(Is GEMINI_API_KEY the real key, not a placeholder?)")
    part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
    raw = base64.b64decode(part["data"])
    if part["mimeType"].startswith("audio/wav") or raw[:4] == b"RIFF":
        with wave.open(io.BytesIO(raw)) as w:
            assert w.getnchannels() == 1 and w.getsampwidth() == 2, part["mimeType"]
            return w.readframes(w.getnframes()), w.getframerate()
    rate = int(re.search(r"rate=(\d+)", part["mimeType"]).group(1))  # raw L16 PCM
    return raw, rate

rate = None
clips = []
for i, s in enumerate(segs):
    name = f"{i+1:02d}_{s['t']//60}m{s['t']%60:02d}s.wav"
    path = os.path.join(OUT, name)
    if os.path.exists(path) and not os.environ.get("REGEN"):
        with wave.open(path) as w:
            pcm, rate = w.readframes(w.getnframes()), w.getframerate()
    else:
        pcm, rate = tts(s["text"])
        with wave.open(path, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    slot = (segs[i + 1]["t"] if i + 1 < len(segs) else TOTAL) - s["t"]
    dur = len(pcm) / 2 / rate
    flag = "OVER" if dur > slot else "ok"
    print(f"{name}  {dur:5.1f}s / slot {slot:4.0f}s  {flag}  {s['label']}")
    clips.append((s["t"], pcm))

# Full-length track: each clip at its start time, pushed later only if the previous clip is still playing.
GAP = 0.25
track = bytearray(int(TOTAL * rate) * 2)
cursor = 0.0
for (t, pcm), s in zip(clips, segs):
    start = max(t, cursor)
    if start - t > 0.05:
        print(f"  shifted {s['label']!r} from {t}s to {start:.1f}s to avoid overlap")
    off = int(start * rate) * 2
    end = min(off + len(pcm), len(track))
    track[off:end] = pcm[: end - off]
    cursor = start + len(pcm) / 2 / rate + GAP
if cursor - GAP > TOTAL:
    print(f"  WARNING: narration ends at {cursor - GAP:.1f}s, video ends at {TOTAL}s")
full = os.path.join(OUT, "narration_full.wav")
with wave.open(full, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(bytes(track))
print("full track:", full)
