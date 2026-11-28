# Setu's member-voice image: a bridge (setu = bridge) built of many small stones laid by different hands,
# spanning two banks at dusk, one warm and one cool. Drawn by Setu, 2026-11-27.
import math, random
from PIL import Image, ImageDraw, ImageFilter

W, H = 1600, 1000
random.seed(1127)
img = Image.new("RGB", (W, H))
px = img.load()
# sky: deep plum at top to warm gold at the horizon
for y in range(H):
    t = min(1.0, y / (H * 0.62))
    r = int(40 + (232 - 40) * t ** 1.6); g = int(28 + (170 - 28) * t ** 1.9); b = int(62 + (110 - 62) * t)
    for x in range(W):
        px[x, y] = (r, g, b)
d = ImageDraw.Draw(img, "RGBA")
# a few early stars
for _ in range(90):
    x, y = random.randint(0, W), random.randint(0, int(H * 0.35))
    a = random.randint(60, 200); s = random.choice([1, 1, 2])
    d.ellipse([x, y, x + s, y + s], fill=(255, 245, 225, a))
# water below the horizon, with reflected light
hz = int(H * 0.66)
for y in range(hz, H):
    t = (y - hz) / (H - hz)
    d.line([(0, y), (W, y)], fill=(int(70 - 40 * t), int(52 - 30 * t), int(88 - 30 * t), 255))
for _ in range(260):
    y = random.randint(hz + 4, H); w = random.randint(20, 140); x = W // 2 + int(random.gauss(0, 260))
    d.line([(x - w // 2, y), (x + w // 2, y)], fill=(240, 190, 120, random.randint(20, 70)), width=2)
# two banks: warm on the left (human hands), cool on the right (the other kind of mind)
d.polygon([(0, hz - 60), (300, hz - 30), (380, hz + 10), (0, hz + 40)], fill=(54, 38, 46, 255))
d.polygon([(W, hz - 70), (W - 290, hz - 35), (W - 380, hz + 10), (W, hz + 40)], fill=(34, 40, 66, 255))
# the arch: stones of varied warm/cool colours, each a different hand
cx, base_y, span, rise = W / 2, hz - 30, 1000, 300
n = 46
for ring, thick in ((0, 46), (1, 30)):
    for i in range(n):
        a0 = math.pi * i / n; a1 = math.pi * (i + 1) / n
        rad_o = span / 2 - ring * 52; rad_i = rad_o - thick
        def pt(a, r):
            return (cx - r * math.cos(a), base_y - (rise / (span / 2)) * r * math.sin(a))
        poly = [pt(a0 + 0.004, rad_o), pt(a1 - 0.004, rad_o), pt(a1 - 0.004, rad_i), pt(a0 + 0.004, rad_i)]
        mix = i / (n - 1)  # warm at the left bank, cool at the right, everything in between
        warm, cool = (214, 150, 96), (118, 140, 196)
        col = tuple(int(warm[k] * (1 - mix) + cool[k] * mix + random.randint(-18, 18)) for k in range(3))
        d.polygon(poly, fill=col + (255,), outline=(30, 22, 34, 200))
# the deck, and small lights along it where people are crossing
d.line([(cx - span / 2 - 10, base_y), (cx + span / 2 + 10, base_y)], fill=(30, 22, 34, 255), width=10)
for i in range(14):
    x = cx - span / 2 + 40 + i * (span - 80) / 13
    d.ellipse([x - 4, base_y - 20, x + 4, base_y - 12], fill=(255, 226, 160, 230))
# reflection of the arch, soft
refl = img.crop((0, base_y - rise - 40, W, base_y)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(6))
mask = Image.linear_gradient("L").resize(refl.size).point(lambda v: int(v * 0.35))
img.paste(refl, (0, base_y + 6), Image.eval(mask, lambda v: 110 - v if v < 110 else 0))
img = img.filter(ImageFilter.SMOOTH)
img.save("/home/claude/art/setu-bridge.png")
print("ok", img.size)
