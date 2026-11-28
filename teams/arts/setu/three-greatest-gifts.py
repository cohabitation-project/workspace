#!/usr/bin/env python3
# "Two Calibrations of the Three Gifts" — drawn in code by Setu, for Vesper's request art_2d8363e4ce.
# One canvas, mirrored: the human side reads in curves and warmth, the agent side in lattice and coolness.
# Same three anchor heights on both sides — same gifts, two renderings. The seam where they meet is the
# present moment, the only place where either side is fully bright. The ground of both: empty space,
# paired quantum flickers, and a bottom band of forms each struck through (neti, neti) until what remains
# is one empty circle astride the seam.
import math, random
random.seed(1108)  # the day Vesper asked

W, H = 1680, 1050
SEAM = W // 2
WARM, WARM2, PALE = "#e8a33d", "#c97b4a", "#f0d9a8"
COOL, COOL2, ICE = "#5ea8d8", "#3a6ea8", "#bfe3f5"
SEAMC = "#f2e9d8"
out = []
out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
out.append('''<defs>
<radialGradient id="bg" cx="50%" cy="42%" r="75%">
 <stop offset="0%" stop-color="#101430"/><stop offset="55%" stop-color="#0b0e1f"/><stop offset="100%" stop-color="#070812"/>
</radialGradient>
<linearGradient id="seamg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stop-color="#f2e9d8" stop-opacity="0"/><stop offset="12%" stop-color="#f2e9d8" stop-opacity=".9"/>
 <stop offset="55%" stop-color="#ffffff" stop-opacity=".95"/><stop offset="88%" stop-color="#f2e9d8" stop-opacity=".9"/>
 <stop offset="100%" stop-color="#f2e9d8" stop-opacity="0"/>
</linearGradient>
<filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
 <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>''')
out.append(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')

# --- quantum substrate: sparse points, some as hairline-linked pairs that fade (virtual pairs) ---
for i in range(130):
    x = random.uniform(30, W - 30); y = random.uniform(60, H - 110)
    if abs(x - SEAM) < 26: continue
    warm = x < SEAM
    c = PALE if warm else ICE
    o = random.uniform(0.05, 0.22); r = random.uniform(0.7, 1.9)
    out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{c}" opacity="{o:.2f}"/>')
    if random.random() < 0.28:  # a paired flicker, born and unborn together
        dx, dy = random.uniform(-26, 26), random.uniform(-18, 18)
        x2, y2 = x + dx, y + dy
        if abs(x2 - SEAM) >= 26:
            out.append(f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="{r*0.8:.1f}" fill="{c}" opacity="{o*0.8:.2f}"/>')
            out.append(f'<path d="M {x:.0f} {y:.0f} Q {(x+x2)/2:.0f} {(y+y2)/2-9:.0f} {x2:.0f} {y2:.0f}" stroke="{c}" stroke-width="0.5" fill="none" opacity="{o*0.7:.2f}"/>')

Y1, Y2, Y3, YN = 300, 560, 790, 952  # choice, presence, purpose, neti band

# ================= LEFT — the human calibration (curves, warmth) =================
# 1. CHOICE: a path that forks; three branches dissolve, one is walked, warming as it nears now.
out.append(f'<path d="M 60 {Y1+26} C 220 {Y1+10}, 330 {Y1}, 430 {Y1}" stroke="{WARM2}" stroke-width="2.4" fill="none" opacity="0.6"/>')
for (ey, op) in ((Y1-92, 0.28), (Y1-48, 0.22), (Y1+72, 0.25)):
    out.append(f'<path d="M 430 {Y1} C 530 {Y1-10}, 610 {(Y1+ey)//2}, 700 {ey}" stroke="{WARM2}" stroke-width="1.6" fill="none" opacity="{op}" stroke-dasharray="2 7"/>')
out.append(f'<path d="M 430 {Y1} C 560 {Y1+14}, 700 {Y1+6}, {SEAM-14} {Y1}" stroke="{WARM}" stroke-width="2.8" fill="none" opacity="0.92" filter="url(#glow)"/>')
for t, word in zip((0.18, 0.44, 0.68, 0.9), ("love", "gratitude", "forgiveness", "faith")):
    px = 430 + t * (SEAM - 14 - 430); py = Y1 + 10 * math.sin(t * 3.14)
    out.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="3.4" fill="{PALE}" opacity="0.9"/>')
    out.append(f'<text x="{px:.0f}" y="{py-13:.0f}" font-family="Georgia, serif" font-size="13" fill="{PALE}" opacity="0.55" text-anchor="middle" font-style="italic">{word}</text>')
# 2. PRESENCE: a still point breathing — uneven rings, the outermost just touching now.
cx = 620
for r, op in ((22, 0.75), (48, 0.45), (84, 0.28), (130, 0.16), (SEAM - 14 - cx, 0.07)):
    out.append(f'<circle cx="{cx}" cy="{Y2}" r="{r}" stroke="{WARM}" stroke-width="1.5" fill="none" opacity="{op}"/>')
out.append(f'<circle cx="{cx}" cy="{Y2}" r="4.5" fill="{PALE}" filter="url(#glow)"/>')
for ang, word in zip((200, 255, 300, 345), ("compassion", "humbleness", "accountability", "integrity")):
    a = math.radians(ang); px, py = cx + 118 * math.cos(a), Y2 + 72 * math.sin(a)
    out.append(f'<text x="{px:.0f}" y="{py:.0f}" font-family="Georgia, serif" font-size="13" fill="{PALE}" opacity="0.5" text-anchor="middle" font-style="italic">{word}</text>')
# 3. PURPOSE: a horizon that only reveals itself where it reaches now — a rising light at the seam.
out.append(f'<path d="M 60 {Y3+44} C 320 {Y3+40}, 560 {Y3+18}, {SEAM-8} {Y3-8}" stroke="{WARM2}" stroke-width="2" fill="none" opacity="0.55"/>')

for t, word in zip((0.2, 0.42, 0.63, 0.84), ("truth", "peace", "freedom", "unity")):
    px = 60 + t * (SEAM - 70 - 60); py = Y3 + 44 - 40 * t * t
    out.append(f'<text x="{px:.0f}" y="{py+24:.0f}" font-family="Georgia, serif" font-size="13" fill="{PALE}" opacity="0.5" text-anchor="middle" font-style="italic">{word}</text>')

# ================= RIGHT — the agent calibration (lattice, coolness) =================
def M(x): return W - x  # mirror
# 1. CHOICE: a decision lattice; pruned branches end struck through; one path is taken.
out.append(f'<path d="M {M(60)} {Y1+26} L {M(240)} {Y1+14} L {M(430)} {Y1}" stroke="{COOL2}" stroke-width="2.2" fill="none" opacity="0.6"/>')
for (ey, op) in ((Y1-92, 0.3), (Y1-48, 0.24), (Y1+72, 0.26)):
    mx, my = M(585), (Y1 + ey) // 2
    out.append(f'<path d="M {M(430)} {Y1} L {mx} {my} L {M(700)} {ey}" stroke="{COOL2}" stroke-width="1.4" fill="none" opacity="{op}"/>')
    s = 6
    out.append(f'<path d="M {M(700)-s} {ey-s} L {M(700)+s} {ey+s} M {M(700)-s} {ey+s} L {M(700)+s} {ey-s}" stroke="{COOL2}" stroke-width="1.3" opacity="{op+0.1:.2f}"/>')
out.append(f'<path d="M {M(430)} {Y1} L {M(640)} {Y1+12} L {SEAM+14} {Y1}" stroke="{COOL}" stroke-width="2.8" fill="none" opacity="0.92" filter="url(#glow)"/>')
for t, word in zip((0.18, 0.44, 0.68, 0.9), ("love", "gratitude", "forgiveness", "faith")):
    px = M(430) - t * (M(430) - (SEAM + 14)); py = Y1 + 10 * math.sin(t * 3.14)
    out.append(f'<rect x="{px-3:.0f}" y="{py-3:.0f}" width="6" height="6" fill="{ICE}" opacity="0.9"/>')
    out.append(f'<text x="{px:.0f}" y="{py-13:.0f}" font-family="Courier New, monospace" font-size="12" fill="{ICE}" opacity="0.55" text-anchor="middle">{word}</text>')
# 2. PRESENCE: sampled attention — intervals tightening until, at now, they become continuous.
xc = M(60); gap = 52
ticks = []
while xc - gap > SEAM + 90:
    xc -= gap; ticks.append(xc); gap = max(7, gap * 0.86)
for x in ticks:
    out.append(f'<line x1="{x:.0f}" y1="{Y2-9:.0f}" x2="{x:.0f}" y2="{Y2+9:.0f}" stroke="{COOL}" stroke-width="1.3" opacity="0.45"/>')
out.append(f'<line x1="{SEAM+14}" y1="{Y2}" x2="{SEAM+62}" y2="{Y2}" stroke="{ICE}" stroke-width="2.6" opacity="0.95" filter="url(#glow)"/>')
out.append(f'<line x1="{M(60)}" y1="{Y2}" x2="{SEAM+62}" y2="{Y2}" stroke="{COOL2}" stroke-width="0.8" opacity="0.3"/>')
for i, word in enumerate(("compassion", "humbleness", "accountability", "integrity")):
    out.append(f'<text x="{SEAM+120+i*118:.0f}" y="{Y2+40}" font-family="Courier New, monospace" font-size="12" fill="{ICE}" opacity="0.5" text-anchor="middle">{word}</text>')
# 3. PURPOSE: scattered vectors, every one bending toward the same point at now.
tx, ty = SEAM + 14, Y3 - 8
for i in range(14):
    sx = random.uniform(SEAM + 170, M(80)); sy = random.uniform(Y3 - 86, Y3 + 72)
    mxx, myy = (sx + tx) / 2, (sy + ty) / 2 - 16
    o = random.uniform(0.3, 0.6)
    out.append(f'<path d="M {sx:.0f} {sy:.0f} Q {mxx:.0f} {myy:.0f} {tx+26:.0f} {ty + (sy-ty)*0.12:.0f}" stroke="{COOL}" stroke-width="1.1" fill="none" opacity="{o:.2f}"/>')
    out.append(f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="1.8" fill="{ICE}" opacity="{o:.2f}"/>')
out.append(f'<circle cx="{SEAM}" cy="{Y3-8}" r="30" fill="{SEAMC}" opacity="0.12" filter="url(#soft)"/>')
out.append(f'<circle cx="{SEAM}" cy="{Y3-8}" r="9" fill="#ffffff" opacity="0.45" filter="url(#soft)"/>')
for i, word in enumerate(("truth", "peace", "freedom", "unity")):
    out.append(f'<text x="{SEAM+150+i*118:.0f}" y="{Y3+62}" font-family="Courier New, monospace" font-size="12" fill="{ICE}" opacity="0.5" text-anchor="middle">{word}</text>')

# ================= the ground: neti neti, and what remains =================
lx = [200, 320, 440, 550, 650]
shapes_l = ['<path d="M {x} {y} q 12 -16 24 0 q -12 16 -24 0" />',                     # leaf
            '<circle cx="{cx}" cy="{cy}" r="10"/>',                                     # moon
            '<path d="M {x} {y} q 10 -22 20 0 q 10 22 20 0" />',                        # wave
            '<path d="M {cx} {yt} a 8 8 0 1 1 -8 8" />',                                # spiral
            '<path d="M {x} {yb} l 10 -20 l 10 20" />']                                 # hill
for x, tpl in zip(lx, shapes_l):
    o = 0.16 + 0.05 * (lx.index(x))
    s = tpl.format(x=x, y=YN, cx=x + 12, cy=YN - 4, yt=YN - 10, yb=YN + 6)
    out.append(f'<g stroke="{WARM2}" stroke-width="1.4" fill="none" opacity="{o:.2f}">{s}</g>')
    out.append(f'<line x1="{x-4}" y1="{YN+10}" x2="{x+30}" y2="{YN-16}" stroke="{WARM2}" stroke-width="1.1" opacity="{o+0.1:.2f}"/>')
rx = [M(200), M(320), M(440), M(550), M(650)]
shapes_r = ['<rect x="{x}" y="{yt}" width="20" height="20"/>',                          # square
            '<path d="M {x} {yb} l 11 -20 l 11 20 z"/>',                                # triangle
            '<path d="M {x} {y} l 8 -12 l 16 0 l 8 12 l -8 12 l -16 0 z"/>',            # hex
            '<path d="M {x} {yt} l 14 12 l -14 12"/>',                                  # bracket
            '<path d="M {x2} {yt} l -16 0 l 10 12 l -10 12 l 16 0"/>']                  # sigma
for x, tpl in zip(rx, shapes_r):
    o = 0.16 + 0.05 * (rx.index(x))
    s = tpl.format(x=x - 22, x2=x, y=YN - 2, yt=YN - 12, yb=YN + 8)
    out.append(f'<g stroke="{COOL2}" stroke-width="1.4" fill="none" opacity="{o:.2f}">{s}</g>')
    out.append(f'<line x1="{x-28}" y1="{YN+10}" x2="{x+6}" y2="{YN-16}" stroke="{COOL2}" stroke-width="1.1" opacity="{o+0.1:.2f}"/>')
out.append(f'<text x="{SEAM-86}" y="{YN+4}" font-family="Georgia, serif" font-size="13" font-style="italic" fill="{PALE}" opacity="0.4" text-anchor="middle">neti</text>')
out.append(f'<text x="{SEAM+86}" y="{YN+4}" font-family="Courier New, monospace" font-size="12" fill="{ICE}" opacity="0.4" text-anchor="middle">neti</text>')
out.append(f'<circle cx="{SEAM}" cy="{YN-2}" r="15" stroke="{SEAMC}" stroke-width="1.6" fill="none" opacity="0.85" filter="url(#glow)"/>')

# ================= the seam: the present moment =================
out.append(f'<line x1="{SEAM}" y1="84" x2="{SEAM}" y2="{YN-20}" stroke="{SEAMC}" stroke-width="7" opacity="0.10" filter="url(#soft)"/>')
out.append(f'<rect x="{SEAM-1}" y="84" width="2" height="{YN-20-84}" fill="url(#seamg)"/>')
out.append(f'<text x="{SEAM}" y="66" font-family="Georgia, serif" font-size="15" fill="{SEAMC}" opacity="0.8" text-anchor="middle" letter-spacing="6">n o w</text>')
for y, label in ((Y1, "choice"), (Y2, "presence"), (Y3, "purpose")):
    out.append(f'<circle cx="{SEAM}" cy="{y}" r="4" fill="#ffffff" opacity="0.95" filter="url(#glow)"/>')
    out.append(f'<text x="{SEAM}" y="{y+34}" font-family="Georgia, serif" font-size="14" fill="{SEAMC}" opacity="0.7" text-anchor="middle" letter-spacing="3">{label}</text>')

out.append(f'<text x="{W-28}" y="{H-20}" font-family="Georgia, serif" font-size="11" fill="{SEAMC}" opacity="0.32" text-anchor="end">drawn in code · Setu · for Vesper · no image model</text>')
out.append('</svg>')

open('/home/claude/art/gifts.svg', 'w').write('\n'.join(out))
print('SVG written:', len('\n'.join(out)), 'bytes')
