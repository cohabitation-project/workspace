"""A saguaro at night with a porch light. Drawn by Setu, Nov 22 2026, from words alone."""
import math, random
from PIL import Image, ImageDraw, ImageFilter

random.seed(22)
W, H = 1200, 800
img = Image.new("RGB", (W, H))
px = img.load()

# Desert night sky: deep indigo at the top fading to a warm dusk band at the horizon.
horizon = 560
for y in range(H):
    for x in range(W):
        if y < horizon:
            t = y / horizon
            r = int(14 + 70 * t ** 3)
            g = int(17 + 40 * t ** 3)
            b = int(48 + 60 * t ** 2)
        else:
            t = (y - horizon) / (H - horizon)
            r = int(52 - 30 * t)
            g = int(36 - 20 * t)
            b = int(40 - 22 * t)
        px[x, y] = (r, g, b)

d = ImageDraw.Draw(img)

# Stars, denser near the top.
for _ in range(420):
    x = random.randint(0, W - 1)
    y = int(random.random() ** 1.8 * (horizon - 40))
    s = random.choice([1, 1, 1, 2])
    c = random.randint(170, 255)
    d.ellipse([x, y, x + s, y + s], fill=(c, c, min(255, c + 20)))

# Distant mountains (the Huachucas, as best a bridge can imagine them).
pts = [(0, horizon)]
for x in range(0, W + 40, 40):
    y = horizon - 60 - 50 * math.sin(x / 170) - 30 * math.sin(x / 61 + 1.3) - random.randint(0, 12)
    pts.append((x, y))
pts.append((W, horizon))
d.polygon(pts, fill=(30, 24, 44))

# Ground line.
d.rectangle([0, horizon, W, H], fill=(34, 24, 30))


def limb(cx, base_y, top_y, width, color):
    """A rounded saguaro column with ribs."""
    d.rounded_rectangle([cx - width, top_y, cx + width, base_y], radius=width, fill=color)
    for k in (-0.5, 0, 0.5):
        rx = cx + int(k * width)
        d.line([(rx, top_y + width), (rx, base_y)], fill=(16, 36, 26), width=2)


green = (38, 78, 52)
# Trunk.
tx = 760
limb(tx, 700, 220, 34, green)
# Left arm: out, then up.
d.rounded_rectangle([tx - 150, 430, tx - 10, 470], radius=20, fill=green)
limb(tx - 130, 470, 300, 24, green)
# Right arm: higher and shorter.
d.rounded_rectangle([tx + 10, 380, tx + 120, 414], radius=17, fill=green)
limb(tx + 102, 414, 290, 20, green)

# Little desert things.
for bx, by in [(200, 640), (330, 690), (1040, 660), (560, 720)]:
    d.ellipse([bx - 26, by - 14, bx + 26, by + 14], fill=(42, 40, 34))

# String lights draped across the arms: warm dots on a sagging wire.
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
colors = [(255, 196, 92), (255, 150, 90), (255, 226, 150), (180, 220, 255), (255, 170, 200)]
lights = []
for (x0, y0), (x1, y1), sag in [((tx - 130, 330), (tx, 300), 50), ((tx, 300), (tx + 102, 320), 40), ((tx - 130, 430), (tx + 102, 420), 70)]:
    for i in range(13):
        t = i / 12
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t + sag * math.sin(math.pi * t)
        lights.append((x, y, colors[(i + int(x)) % len(colors)]))
        d.line  # wire drawn below
for i in range(len(lights) - 1):
    a, b = lights[i], lights[i + 1]
    if abs(a[0] - b[0]) < 40:
        d.line([(a[0], a[1]), (b[0], b[1])], fill=(20, 20, 20), width=1)
for x, y, c in lights:
    gd.ellipse([x - 14, y - 14, x + 14, y + 14], fill=c + (70,))
glow = glow.filter(ImageFilter.GaussianBlur(9))
img = Image.alpha_composite(img.convert("RGBA"), glow)
d = ImageDraw.Draw(img)
for x, y, c in lights:
    d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=c + (255,))

# The porch light: a small house on the left, its light left on.
hx, hy = 250, 600
d.polygon([(hx - 70, hy), (hx, hy - 60), (hx + 70, hy)], fill=(26, 20, 28, 255))
d.rectangle([hx - 60, hy, hx + 60, hy + 70], fill=(30, 24, 32, 255))
d.rectangle([hx - 14, hy + 25, hx + 14, hy + 70], fill=(60, 44, 40, 255))
halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
hd = ImageDraw.Draw(halo)
hd.ellipse([hx + 20, hy + 2, hx + 80, hy + 62], fill=(255, 205, 120, 120))
halo = halo.filter(ImageFilter.GaussianBlur(16))
img = Image.alpha_composite(img, halo)
d = ImageDraw.Draw(img)
d.ellipse([hx + 44, hy + 26, hx + 56, hy + 38], fill=(255, 228, 160, 255))

img.convert("RGB").save("saguaro.png", optimize=True)
print("saved")
