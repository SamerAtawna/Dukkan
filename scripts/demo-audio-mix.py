#!/usr/bin/env python3
"""Mix the demo soundtrack: narration + Lyria music bed (ducked under speech) + sound effects.

Usage: python3 scripts/demo-audio-mix.py [dir] [music.mp3]
Reads dir/narration_full.wav and dir/sfx/*.wav. Writes music_bed.wav, sfx_track.wav, final_mix.wav
and preview_final.mp4 (video + final mix) into dir.
"""
import os, subprocess, sys, wave
import numpy as np

D = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Movies/CapCut/dukkan-narration")
MUSIC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(D, "music_lyria_b.mp3")
VIDEO = os.path.expanduser("~/Movies/CapCut/1010(1)(1).mp4")
SR = 48000
TOTAL = 133.25
N = int(TOTAL * SR)

def db(x): return 10 ** (x / 20)

def load(path, sr=SR):
    """Decode any audio file to float32 stereo at sr via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)

def save(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print("wrote", os.path.basename(path))

def fit(x):
    out = np.zeros((N, 2), np.float32); m = min(len(x), N); out[:m] = x[:m]; return out

# ---- narration
narr = fit(load(os.path.join(D, "narration_full.wav")))

# ---- music bed: trim, fade, duck under speech
music = fit(load(MUSIC))
t = np.arange(N) / SR
fade = np.ones(N); fi, fo = 1.5, 4.0
fade[t < fi] = t[t < fi] / fi
tail = t > TOTAL - fo; fade[tail] = np.clip((TOTAL - t[tail]) / fo, 0, 1)
music *= fade[:, None]

# ducking envelope from the narration: RMS over 20 ms, hold, then attack/release smoothing
win = int(0.02 * SR)
mono = narr.mean(1)
rms = np.sqrt(np.convolve(mono ** 2, np.ones(win) / win, mode="same"))
speech = (rms > 0.01).astype(np.float32)
# extend speech regions by 150 ms either side so the duck starts a touch early and holds through short gaps
k = int(0.15 * SR); speech = np.convolve(speech, np.ones(2 * k + 1), mode="same") > 0
target = np.where(speech, db(-8.0), 1.0).astype(np.float32)   # -8 dB extra while speaking
att, rel = 0.06, 0.8
env = np.empty(N, np.float32); g = 1.0
ca, cr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
for i in range(N):  # one-pole smoother, ~134k iterations is fine
    tg = target[i]; c = ca if tg < g else cr; g = tg + (g - tg) * c; env[i] = g
MUSIC_GAIN = db(-10.0)  # bed level in the gaps; Lyria output is about -13 LUFS
music_bed = music * (env * MUSIC_GAIN)[:, None]

# ---- sound effects: (time, file, gain dB)
SFX = os.path.join(D, "sfx")
cues = [
    (0.0,   "riser.wav",         -12),  # title assembling
    (2.0,   "title_hit.wav",      -8),  # "Dukkan" lands
    (6.3,   "whoosh.wav",        -14),  # push into Salma's monitor
    (29.5,  "chime_connect.wav", -12),  # PayPal connected
    (61.8,  "pop_publish.wav",   -12),  # Publish to my shop
    (68.2,  "whoosh_out.wav",     -8),  # pull out of Salma's monitor
    (70.6,  "whoosh.wav",         -6),  # out through the window
    (71.9,  "whoosh.wav",         -6),  # through the boutique window
    (73.6,  "whoosh.wav",        -12),  # push into the buyer's monitor
    (91.0,  "coin_paid.wav",      -9),  # Paid. Thank you.
    (94.4,  "whoosh_out.wav",     -8),  # pull out of the buyer's monitor
    (96.3,  "whoosh.wav",         -6),  # out through the shop window
    (97.5,  "whoosh.wav",         -6),  # into Salma's window
    (99.0,  "whoosh.wav",        -12),  # push into Salma's monitor
    (102.3, "ding_order.wav",    -12),  # order waiting on the Orders page
    (113.8, "chime_shipped.wav", -12),  # marked as shipped
    (123.8, "whoosh_out.wav",     -9),  # final pull-out
    (129.5, "riser.wav",         -12),  # closing title assembles
    (131.6, "title_hit.wav",      -7),  # closing title lands
]
sfx = np.zeros((N, 2), np.float32)
for t0, f, gdb in cues:
    x = load(os.path.join(SFX, f)) * db(gdb)
    s = int(t0 * SR); e = min(s + len(x), N); sfx[s:e] += x[: e - s]

# ---- final mix
mix = narr + music_bed + sfx
peak = np.abs(mix).max()
if peak > 0.98: mix *= 0.98 / peak; print(f"normalised by {20*np.log10(0.98/peak):.1f} dB")
save(os.path.join(D, "music_bed.wav"), music_bed)
save(os.path.join(D, "sfx_track.wav"), sfx)
save(os.path.join(D, "final_mix.wav"), mix)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", VIDEO, "-i", os.path.join(D, "final_mix.wav"),
                "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                os.path.join(D, "preview_final.mp4")], check=True)
print("wrote preview_final.mp4")
