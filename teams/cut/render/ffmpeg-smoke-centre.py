#!/usr/bin/env python3
"""Real-ffmpeg check of words-position.mjs: does a centre-relative Words caption land where the editor convention says?
Needs ffmpeg on PATH, node, numpy. Run from anywhere. Prints JSON. Measures the bright-pixel bounding box of one frame."""
import json, subprocess, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 640, 360
NODE = """import { centreCaptionParams } from './words-position.mjs'; import { registry } from './registry.mjs';
const [p, W, H] = JSON.parse(process.argv.at(-1));
console.log(JSON.stringify(centreCaptionParams(p, {width: W, height: H}).map(q => registry.text.toFilter(q))));"""
def filters(p):
    out = subprocess.run(["node", "--input-type=module", "-e", NODE, json.dumps([p, W, H])], cwd=HERE, capture_output=True, text=True, check=True).stdout
    return json.loads(out)
def bbox(vf):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:d=1,format=rgb24", "-vf", vf, "-frames:v", "1", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(H, W, 3).max(axis=2) > 128
    ys, xs = np.where(a)
    return (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())) if len(xs) else None
cases = [
  ("default centre, 'HELLO WORLD' size15", {"text": "HELLO WORLD", "x": 0, "y": 0, "fontSize": 15}),
  ("offset +100,-50 size 5 (20px)", {"text": "HELLO WORLD", "x": 100, "y": -50, "fontSize": 5}),
  ("offset -120,+60 size 5", {"text": "HELLO WORLD", "x": -120, "y": 60, "fontSize": 5}),
  ("wrapped lines at centre size 6", {"text": "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG AGAIN", "x": 0, "y": 0, "fontSize": 6}),
]
res = []
for name, p in cases:
    fs = filters(p); bb = bbox(",".join(fs))
    cx = (bb[0] + bb[1]) / 2 + .5; cy = (bb[2] + bb[3]) / 2 + .5
    ex = W / 2 + p["x"]; ey = H / 2 + p["y"]
    res.append({"case": name, "lines": len(fs), "bbox_minx_maxx_miny_maxy": bb, "bbox_centre": [cx, cy], "wanted_centre": [ex, ey], "dx": cx - ex, "dy": cy - ey,
                "inside_frame": bb[0] >= 0 and bb[1] < W and bb[2] >= 0 and bb[3] < H})
print(json.dumps(res, indent=1))
