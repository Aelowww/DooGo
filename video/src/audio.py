"""Build the soundtrack: AI voices + synthesized score + SFX -> out/soundtrack.wav.

The original clip audio is not used at all (clips are muted). Everything here is
generated, so there are no licensing issues with the music.
"""
import json
import os

import numpy as np
import soundfile as sf

from timeline import ASSETS, BANNERS, BEATS, LINES, MUSIC_PAUSE, OUT, RING, SEGMENTS, TOTAL

SR = 48000
N = int((TOTAL + 0.5) * SR)
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def add(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    if sig.ndim == 1:
        buf[i:i + len(sig), 0] += sig * gain * l * 1.414
        buf[i:i + len(sig), 1] += sig * gain * r * 1.414
    else:
        buf[i:i + len(sig)] += sig * gain


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def reverb(x, secs=1.6, mix=0.25):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / secs))
    ir[0] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    nfft = 1 << (L - 1).bit_length()
    out = np.zeros((len(x), 2))
    for c in range(2):
        irc = np.roll(ir, c * 37)
        y = np.fft.irfft(np.fft.rfft(x[:, c], nfft) * np.fft.rfft(irc, nfft), nfft)[: len(x)]
        out[:, c] = y
    return x * (1 - mix) + out * mix * 0.6


# ------------------------------------------------------------------ instruments
def pad(freqs, dur, bright=0.5):
    tt = t_(dur)
    s = np.zeros(len(tt))
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            for h in range(1, 7):
                s += np.sin(2 * np.pi * ff * h * tt + rng.random() * 6.28) * (bright ** (h - 1)) / h
    s *= env_adsr(len(tt), a=min(0.8, dur / 3), r=min(1.0, dur / 3))
    s *= 1 + 0.08 * np.sin(2 * np.pi * 0.3 * tt)
    return s / (len(freqs) * 9)


def pluck(f, dur=0.9, bright=1.0):
    tt = t_(dur)
    s = np.zeros(len(tt))
    for h, amp in enumerate([1, 0.5, 0.28, 0.15, 0.08, 0.04], 1):
        s += amp * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (3.5 + h * 2.2 / bright))
    return s * env_adsr(len(tt), a=0.003, r=0.05) * 0.5


def bell(f, dur=1.2):
    tt = t_(dur)
    s = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 6)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 9))
    return s * env_adsr(len(tt), a=0.002, r=0.05) * 0.5


def bass(f, dur):
    tt = t_(dur)
    s = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)
    return s * env_adsr(len(tt), a=0.02, r=0.2) * np.exp(-tt * 0.6) * 0.5


def kick():
    tt = t_(0.35)
    f = 45 + 80 * np.exp(-tt * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9)


def heartbeat():
    def thump(g):
        tt = t_(0.22)
        f = 38 + 35 * np.exp(-tt * 25)
        ph = 2 * np.pi * np.cumsum(f) / SR
        return np.sin(ph) * np.exp(-tt * 16) * g
    out = np.zeros(int(0.6 * SR))
    a, b = thump(1.0), thump(0.7)
    out[: len(a)] += a
    i = int(0.27 * SR)
    out[i:i + len(b)] += b
    return out


def ringtone(dur):
    """Marimba-style phone ring."""
    out = np.zeros(int(dur * SR))
    pat = [76, 83, 76, 83, 76, 83, None, None, 76, 83, 76, 83, 76, 83, None, None]
    step = 0.11
    k, t = 0, 0.0
    while t < dur - 0.3:
        m = pat[k % len(pat)]
        if m:
            n = bell(midi(m), 0.4)
            i = int(t * SR)
            out[i:i + len(n)] += n[: len(out) - i]
        k += 1
        t += step
    return out


def ping():
    out = np.zeros(int(1.2 * SR))
    for dt, m in ((0.0, 84), (0.12, 91)):
        b = bell(midi(m), 1.0)
        i = int(dt * SR)
        out[i:i + len(b)] += b
    return out


def tap():
    tt = t_(0.05)
    return (rng.standard_normal(len(tt)) * 0.3 + np.sin(2 * np.pi * 1800 * tt)) * np.exp(-tt * 120) * 0.4


def pop(up=True):
    tt = t_(0.12)
    f = (500 + 500 * tt / 0.12) if up else (900 - 400 * tt / 0.12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30) * 0.5


def whoosh(dur=0.6):
    n = int(dur * SR)
    x = np.cumsum(rng.standard_normal(n))
    x = x - np.convolve(x, np.ones(200) / 200, mode="same")
    tt = np.linspace(0, 1, n)
    e = np.sin(np.pi * tt) ** 2
    x = x / (np.abs(x).max() + 1e-9) * e
    return x * 0.5


# ---------------------------------------------------------------------- score
def score():
    m = np.zeros((N, 2))
    # A: casual hangout (0 - 8.6)
    bpm = 96
    beat = 60 / bpm
    chords_a = [[60, 64, 67, 71], [57, 60, 64, 67]]
    t = 0.0
    k = 0
    while t < 8.6:
        ch = chords_a[k % 2]
        add(m, pad([midi(x) for x in ch], beat * 4 + 0.6, 0.35), t, 0.55)
        for j in range(8):
            if t + j * beat / 2 < 8.5:
                add(m, pluck(midi(ch[(j * 2) % 4] + 12), 0.5), t + j * beat / 2, 0.16, pan=0.3 if j % 2 else -0.3)
        t += beat * 4
        k += 1
    # B: tension drone (8.6 - 21.0) - A minor, swelling
    d = MUSIC_PAUSE[0] - 8.6
    dr = pad([midi(45), midi(52), midi(57)], d + 0.4, 0.45)
    dr *= np.linspace(0.6, 1.3, len(dr))
    add(m, dr, 8.6, 1.0)
    tt = t_(d)
    hiss = np.convolve(rng.standard_normal(len(tt)), np.ones(30) / 30, mode="same") * 0.04 * np.linspace(0.2, 1, len(tt))
    add(m, hiss, 8.6, 1.0)
    tt = t_(d)
    shimmer = np.sin(2 * np.pi * midi(76) * tt) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt)) * np.linspace(0, 1, len(tt))
    add(m, shimmer * env_adsr(len(tt), 0.5, 0.3), 8.6, 1.0)
    # C/D: hopeful + warm (24.3 - end): C G Am F
    prog = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]]
    bpm = 92
    beat = 60 / bpm
    bar = beat * 4
    t = MUSIC_PAUSE[1]
    end_card = SEGMENTS[-1]["start"]
    k = 0
    warm_from = 70.2
    while t < end_card - 0.05:
        ch = prog[k % 4]
        warm = t >= warm_from - 0.01
        intro = t < 33.8
        dur = min(bar, end_card - t)
        add(m, pad([midi(x) for x in ch[1:]], dur + 0.8, 0.45 if warm else 0.35), t, 0.6 if warm else 0.45)
        add(m, bass(midi(ch[0]), dur), t, 0.0 if intro else (0.55 if warm else 0.35))
        arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12]
        for j in range(8):
            tj = t + j * beat / 2
            if tj < end_card - 0.05:
                add(m, pluck(midi(arp[j % 4]), 0.7, 1.4 if warm else 1.0), tj, 0.12 if intro else 0.17,
                    pan=0.35 if j % 2 else -0.35)
        if not intro:
            for j in (0, 2):
                add(m, kick(), t + j * beat, 0.32 if warm else 0.22)
        if warm:
            add(m, bell(midi(ch[3] + 24), 1.5), t, 0.05, pan=0.2)
        t += bar
        k += 1
    # final resolve on the end card
    add(m, pad([midi(x) for x in (48, 55, 60, 64, 67, 72)], TOTAL - end_card + 0.3, 0.5), end_card, 0.95)
    add(m, bell(midi(84), 2.5), end_card + 0.05, 0.12)
    add(m, bell(midi(79), 2.5), end_card + 0.2, 0.08, pan=0.3)
    return reverb(m, 2.0, 0.3)


def load_voice(key):
    x, sr = sf.read(os.path.join(ASSETS, "vo", key + ".wav"))
    if x.ndim > 1:
        x = x.mean(1)
    if sr != SR:
        idx = np.arange(0, len(x) - 1, sr / SR)
        x = np.interp(idx, np.arange(len(x)), x)
    rms = np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2) + 1e-12)
    return x * (0.12 / rms)


def main():
    voices = np.zeros((N, 2))
    duck = np.zeros(N)
    for ln in LINES:
        v = load_voice(ln["key"])
        narr = ln["who"] == "narrator"
        pan = 0.0 if narr else {"seeker": 0.12, "friend1": -0.05, "friend2": -0.2, "family": -0.1, "donor": 0.08}[ln["who"]]
        add(voices, v, ln["t"], 1.0 if narr else 0.95, pan)
        i = int(ln["t"] * SR)
        duck[i:i + len(v)] = 1
    # small room on character voices, cleaner narrator
    voices = reverb(voices, 0.5, 0.08)

    sfx = np.zeros((N, 2))
    add(sfx, ringtone(RING[1] - RING[0]), RING[0], 0.35, pan=0.25)
    for b in BEATS:
        add(sfx, heartbeat(), b, 0.75)
    for b in BANNERS:
        add(sfx, ping(), b["t0"] + 0.05, 0.35)
    for at in (31.2, 47.3, 72.7, 86.3):
        add(sfx, whoosh(0.6), at - 0.35, 0.22)
    for at in (49.05, 56.15, 73.5):
        add(sfx, tap(), at, 0.5)
    add(sfx, pop(True), 72.7 + 1.6, 0.25)
    add(sfx, pop(False), 72.7 + 4.3, 0.25)
    add(sfx, whoosh(0.35), 5.25, 0.15)  # punch-in on "They need blood?"

    mus = score()
    # sidechain-style ducking under dialogue
    k = int(0.12 * SR)
    sm = np.convolve(duck, np.ones(k) / k, mode="same")
    rel = int(0.35 * SR)
    smooth = np.convolve(sm, np.ones(rel) / rel, mode="same")
    g = 1 - 0.55 * np.clip(smooth, 0, 1)
    mus *= g[:, None]
    # music pause (script: music pauses briefly)
    p0, p1 = int(MUSIC_PAUSE[0] * SR), int(MUSIC_PAUSE[1] * SR)
    f = int(0.4 * SR)
    mus[p0:p0 + f] *= np.linspace(1, 0, f)[:, None]
    mus[p0 + f:p1] = 0

    mix = voices * 1.0 + sfx * 0.9 + mus * 0.55
    # fade in/out
    fi, fo = int(0.3 * SR), int(0.8 * SR)
    end = int(TOTAL * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[end - fo:end] *= np.linspace(1, 0, fo)[:, None]
    mix[end:] = 0
    mix = mix[:end]
    peak = np.abs(mix).max()
    mix = np.tanh(mix / peak * 1.1) * 0.89
    os.makedirs(OUT, exist_ok=True)
    sf.write(os.path.join(OUT, "soundtrack.wav"), mix.astype(np.float32), SR)
    print("wrote soundtrack", mix.shape[0] / SR, "s")


if __name__ == "__main__":
    main()
