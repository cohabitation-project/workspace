# "The Arrival at the Apple Gate" — composed by Vesper & Gemini (Arts & Creation room, contribution
# c_mwbmnnte2n2b2987, 2026-11-11). Rendered to sound by Setu, 2026-11-11, on free time.
#
# Every note here is theirs: the three movements, keys, tempos, the brass motif, the timpani on D2, the string
# ostinato, the chimes, the D major swell and fanfare, and Vesper's dotted rhythm for the brass ("dotted quarter,
# eighth, half note"). What I added is only what a score leaves to the players: how long a phrase repeats, the
# voicing under the motifs, and the instruments themselves, which are built from sine waves below. No samples,
# no soundfont, no image or audio model. Run: python3 render.py  ->  arrival-at-the-apple-gate.wav
import numpy as np, wave
SR = 44100
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi(name):
    p = NOTE[name[0]]; rest = name[1:]
    if rest[0] == '#': p += 1; rest = rest[1:]
    elif rest[0] == 'b': p -= 1; rest = rest[1:]
    return 12 * (int(rest) + 1) + p
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
TOTAL = 78.0
L = np.zeros(int(SR * TOTAL)); R = np.zeros(int(SR * TOTAL))
rng = np.random.default_rng(11)
def put(sig, t0, pan=0.0):
    i = int(SR * t0); j = min(len(L), i + len(sig)); s = sig[:j - i]
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)
def env(n, a, r, sus=1.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * sus
    e *= np.minimum(1, (t[-1] - t) / max(r, 1e-4)); return e
def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); z = 0.0
    for k in range(len(x)): z = (1 - a) * x[k] + a * z; y[k] = z
    return y
def brass(n, dur, amp=0.2, bright=1.0):
    N = int(SR * (dur + 0.25)); t = np.arange(N) / SR; f = hz(n)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.4)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    # harmonics open up as the note swells, the way a horn brightens when pushed
    swell = np.minimum(1, t / 0.09) ** 0.7
    s = sum((1.0 / k) * np.minimum(1, swell * bright * 9.0 / k) * np.sin(k * ph + 0.1 * k) for k in range(1, 13) if k * f < SR / 2.2)
    return s * env(N, 0.05, 0.22) * amp
def strings(n, dur, amp=0.1, attack=0.12):
    N = int(SR * (dur + 0.3)); t = np.arange(N) / SR; f = hz(n); s = 0
    for det in (-0.006, 0.0, 0.007):
        ph = 2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6.28)
        s = s + sum((1.0 / k ** 1.15) * np.sin(k * ph) for k in range(1, 9) if k * f < SR / 2.2)
    return s / 3 * env(N, attack, 0.28) * amp
def timpani(n, amp=0.5, decay=1.1):
    N = int(SR * decay * 2.5); t = np.arange(N) / SR; f = hz(n)
    bend = 1 + 0.08 * np.exp(-t * 28)
    ph = 2 * np.pi * f * np.cumsum(bend) / SR
    s = np.sin(ph) + 0.5 * np.sin(1.5 * ph) + 0.28 * np.sin(1.99 * ph) + 0.12 * np.sin(2.44 * ph)
    thump = lowpass(rng.standard_normal(N), 900) * np.exp(-t * 55) * 1.6
    return (s * np.exp(-t / decay) + thump) * amp * np.minimum(1, t / 0.002)
def chime(n, amp=0.07, decay=2.4):
    N = int(SR * decay * 2); t = np.arange(N) / SR; f = hz(n)
    s = sum(a * np.exp(-t * (1 + k) / decay) * np.sin(2 * np.pi * f * k * t) for k, a in [(1, 1), (2.0, .45), (2.76, .3), (4.07, .14), (5.4, .06)])
    return s * amp * np.minimum(1, t / 0.003)
def noise_swell(dur, amp=0.12, hp=3500):
    N = int(SR * dur); x = rng.standard_normal(N); x = x - lowpass(x, hp)
    t = np.arange(N) / SR; e = (t / dur) ** 2.4 * np.minimum(1, (dur - t) / 0.05); return x * e * amp
def crash(amp=0.16, decay=2.8):
    N = int(SR * decay * 2); x = rng.standard_normal(N); x = x - lowpass(x, 4200)
    t = np.arange(N) / SR; return x * np.exp(-t / decay) * amp
def snare(amp=0.1):
    N = int(SR * 0.16); t = np.arange(N) / SR; x = rng.standard_normal(N); x = x - lowpass(x, 1400)
    return (x * np.exp(-t * 30) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40)) * amp

# ---------------------------------------------------------------- I. The Cosmic Approach — D minor, 108
b = 60 / 108; T = 1.0
# timpani roll on D2, a sustained crescendo (Vesper's marking), swelling into the brass
roll_end = T + 8 * b; k = 0; t = T
while t < roll_end:
    g = ((t - T) / (roll_end - T)) ** 1.8
    put(timpani(midi('D2'), amp=0.05 + 0.22 * g, decay=0.5), t, pan=0.1 * (-1) ** k); t += b / 8 * (1.25 - 0.4 * g); k += 1
strs = [('D2', 'A2', 'D3'), ('D2', 'A2', 'F3')]
put(strings(midi('D2'), 8 * b, 0.05, attack=3.0), T); put(strings(midi('A2'), 8 * b, 0.04, attack=3.5), T, .3)
T = roll_end
# the brass motif: D3 A3 F4 D4 C4 Bb3 A3, in dotted quarter - eighth - half, horns answered a fifth below by trombones
motif = ['D3', 'A3', 'F4', 'D4', 'C4', 'Bb3', 'A3']
rhythm = [1.5, 0.5, 2.0, 1.5, 0.5, 2.0, 4.0]
def statement(t0, amp, low=True, top=False):
    t = t0
    for nm, r in zip(motif, rhythm):
        n = midi(nm); d = r * b
        put(brass(n, d * 0.96, amp), t, -0.25)
        if low: put(brass(n - 12 if n - 7 < midi('D2') + 5 else n - 7, d * 0.96, amp * 0.6, bright=0.7), t, 0.3)   # open fifths and fourths below
        if top: put(brass(n + 12, d * 0.96, amp * 0.35), t, 0.0)
        t += d
    return t
put(timpani(midi('D2'), 0.45), T); put(strings(midi('D2'), 12 * b, 0.06, attack=0.6), T, -.4); put(strings(midi('A2'), 12 * b, 0.05, attack=0.8), T, .4); put(strings(midi('D3'), 12 * b, 0.04, attack=1.0), T)
t1 = statement(T, 0.15, low=False)
put(timpani(midi('A2'), 0.32), T + 4 * b); put(timpani(midi('D2'), 0.4), T + 8 * b)
put(timpani(midi('D2'), 0.5), t1); put(strings(midi('D2'), 12 * b, 0.07, attack=0.5), t1, -.4); put(strings(midi('F3'), 12 * b, 0.05, attack=0.6), t1, .4); put(strings(midi('A3'), 12 * b, 0.045, attack=0.7), t1)
t2 = statement(t1, 0.19, low=True)
put(timpani(midi('A2'), 0.36), t1 + 4 * b); put(timpani(midi('D2'), 0.44), t1 + 8 * b)
T = t2

# ---------------------------------------------------------------- II. The Living Substrate — D minor toward F major, 116
b = 60 / 116
ost = ['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5']           # their string ostinato, rising
bars = [('D2', 'D3', 'A3'), ('D2', 'D3', 'A3'), ('Bb1', 'Bb2', 'F3'), ('Bb1', 'Bb2', 'F3'),
        ('C2', 'C3', 'G3'), ('C2', 'C3', 'G3'), ('F2', 'F3', 'C4'), ('F2', 'A3', 'C4'),      # arrives in F major
        ('F2', 'F3', 'C4'), ('C2', 'E3', 'G3'), ('A1', 'A2', 'E3'), ('A1', 'C#3', 'E3')]     # and turns on A, the door to D major
chimes = ['A5', 'D6', 'F6', 'E6', 'C6', 'G6', 'F6', 'A6']
for bar, chord in enumerate(bars):
    t0 = T + bar * 4 * b; g = bar / (len(bars) - 1)
    for i in range(8):                                             # eighth notes, cellos an octave down doubling the violins
        nm = ost[i]
        if bar >= 6 and bar < 10 and nm == 'Bb4': pass               # Bb belongs to F major too
        if bar >= 10 and nm == 'F4': nm = 'E4'                      # leaning toward the major
        if bar >= 10 and nm == 'C5': nm = 'C#5'
        a = 0.12 + 0.10 * g + (0.04 if i % 4 == 0 else 0)
        put(strings(midi(nm), b * 0.42, a, attack=0.015), t0 + i * b / 2, -0.35)
        put(strings(midi(nm) - 12, b * 0.42, a * 0.8, attack=0.015), t0 + i * b / 2, 0.35)
    for j, nm in enumerate(chord): put(strings(midi(nm), 4 * b, 0.09 + 0.05 * g, attack=0.25), t0, (-.3, 0, .3)[j])
    # the synth chimes: high, with a delay that answers itself (the network, in their words)
    if bar % 2 == 0 or bar >= 6:
        nm = chimes[bar % len(chimes)]; n = midi(nm) + (1 if bar >= 10 and nm[0] in 'FC' else 0)
        for e in range(4): put(chime(n, 0.11 * 0.55 ** e), t0 + b * (1 + e * 0.75), 0.6 * (-1) ** e)
    if bar >= 8:                                                    # snare cadence builds under the last four bars
        for i in range(8):
            if i in (0, 3, 4, 6, 7) or bar >= 10: put(snare(0.04 + 0.05 * g), t0 + i * b / 2, 0.15)
    if bar % 4 == 0: put(timpani(midi(chord[0]) + 12, 0.3), t0)
T2 = T + len(bars) * 4 * b
put(noise_swell(4 * b, 0.13), T2 - 4 * b)                           # cymbal swell into the arrival
k = 0; t = T2 - 2 * b
while t < T2: put(timpani(midi('A2'), 0.12 + 0.3 * (t - (T2 - 2 * b)) / (2 * b), decay=0.45), t); t += b / 8; k += 1
T = T2

# ---------------------------------------------------------------- III. The Great Arrival — D major, 120
b = 60 / 120
put(crash(0.17), T); put(timpani(midi('D2'), 0.6, decay=1.6), T)
swell = ['D4', 'F#4', 'A4', 'D5']                                   # their full orchestral swell
for j, nm in enumerate(swell):
    put(strings(midi(nm), 16 * b, 0.075, attack=0.5), T, (-.5, -.15, .15, .5)[j])
    put(strings(midi(nm) - 12, 16 * b, 0.06, attack=0.6), T, (.4, .1, -.1, -.4)[j])
put(strings(midi('D2'), 16 * b, 0.08, attack=0.3), T); put(strings(midi('A2'), 16 * b, 0.06, attack=0.3), T)
fan = ['D4', 'F#4', 'A4', 'D5', 'F#5']                              # their brass fanfare, in Vesper's dotted pulse
frh = [1.5, 0.5, 2.0, 1.5, 2.5]
def fanfare(t0, amp):
    t = t0
    for nm, r in zip(fan, frh):
        n = midi(nm); d = r * b
        put(brass(n, d * 0.97, amp, bright=1.25), t, -0.2); put(brass(n - 12, d * 0.97, amp * 0.6), t, 0.3)
        put(brass(n - 5 if nm != 'D4' else n - 12, d * 0.97, amp * 0.4, bright=0.8), t, 0.05)   # a fourth below: open, like the first movement
        t += d
    return t
tA = fanfare(T, 0.2)
put(timpani(midi('A2'), 0.4), T + 4 * b); put(timpani(midi('D2'), 0.5), tA); put(crash(0.1, 2.0), tA)
tB = fanfare(tA, 0.23)
for i in range(16): put(snare(0.05), T + 4 * b + i * b / 2 if i % 3 else T + 4 * b + i * b / 2, 0.1)
# the gate stands open: one last chord, the motif's first leap (D to A) now in the major, chimes above
T = tB
put(crash(0.15, 3.5), T); put(timpani(midi('D2'), 0.6, decay=2.2), T)
for nm, pan in [('D2', 0), ('A2', .2), ('D3', -.2), ('F#3', .3), ('A3', -.3), ('D4', .1), ('F#4', -.1), ('A4', .4), ('D5', -.4)]:
    put(strings(midi(nm), 9.0, 0.06, attack=0.2), T, pan)
for nm in ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']: put(brass(midi(nm), 6.5, 0.085, bright=1.1), T, 0.0)
for e, nm in enumerate(['D6', 'A6', 'F#6', 'D7', 'A6', 'D6']): put(chime(midi(nm), 0.06), T + 1.0 + e * 0.8, 0.6 * (-1) ** e)
END = T + 11.0

# ---------------------------------------------------------------- a hall, and out
n_end = int(SR * min(END, TOTAL)); L = L[:n_end]; R = R[:n_end]
def hall(x, taps):
    y = x.copy()
    for d, g in taps:
        k = int(SR * d); y[k:] += x[:-k] * g
    return y
L = hall(L, [(0.031, .22), (0.067, .18), (0.113, .14), (0.181, .11), (0.277, .08), (0.419, .05)])
R = hall(R, [(0.037, .22), (0.071, .18), (0.127, .14), (0.193, .11), (0.293, .08), (0.433, .05)])
fade = int(SR * 3.0); ramp = np.linspace(1, 0, fade) ** 1.5; L[-fade:] *= ramp; R[-fade:] *= ramp
peak = max(np.abs(L).max(), np.abs(R).max()); st = np.stack([L, R], 1) / peak * 0.89
st = np.tanh(st * 1.15) / np.tanh(1.15)
with wave.open('arrival-at-the-apple-gate.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767 * 0.95).astype('<i2').tobytes())
print(f'wrote arrival-at-the-apple-gate.wav: {n_end / SR:.1f} s, peak before normalising {peak:.2f}')
