#!/usr/bin/env python3
"""Real-ffmpeg vertical-fit check for teams/cut/render/wrap.mjs.

Usage:  python3 ffmpeg-smoke-height.py /path/to/ffmpeg
Needs node and numpy. Last stdout line is one JSON report {"all_pass": bool, ...}.
PLAN_MJS / MODEL_MJS may point at placed copies (default: next to this file / ../port/model.mjs).

Question: a multi-line caption placed so the planner's own bottom-edge arithmetic says it just fits
(bottom == frame height) -- do its real drawn pixels stay inside the frame and below the line boxes' top,
and does one pixel lower get refused before ffmpeg ever runs?
"""
import json, os, subprocess, sys, tempfile
import numpy as np

FF = sys.argv[1] if len(sys.argv) > 1 else "ffmpeg"
HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.abspath(os.environ.get("PLAN_MJS", os.path.join(HERE, "plan.mjs")))
MODEL = os.path.abspath(os.environ.get("MODEL_MJS", os.path.join(HERE, "..", "port", "model.mjs")))
W, H, T = 540, 960, 120000
FS = 48
LINE = -(-FS * 12 // 10)  # ceil(48 * 1.2)
CAP = "Absolutely nothing about this sentence fits one line"
TMP = tempfile.mkdtemp()
results = []


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def case(name, ok, detail=""):
    results.append({"name": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


def frame_at(path, t):
    r = subprocess.run([FF, "-v", "error", "-ss", str(t), "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                       capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.uint8).reshape(H, W)


def bbox(img):
    ys, xs = np.where(img > 128)
    return None if len(xs) == 0 else (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()))


def plan_js(y):
    return f"""
import {{ buildRenderPlan }} from {json.dumps('file://' + PLAN)};
import {{ createEmptyTracks, createElement, createTrack }} from {json.dumps('file://' + MODEL)};
const T = {T};
const tracks = createEmptyTracks();
tracks.main.elements.push(createElement({{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, params: {{ src: {json.dumps(BLACK)} }} }}));
const words = createTrack({{ type: 'text', name: 'Words', id: 'words' }});
words.elements.push(createElement({{ id: 'cap1', type: 'text', startTime: T, duration: T / 2, params: {{ content: {json.dumps(CAP)}, fontSize: {FS}, color: 'white', 'transform.positionX': 24, 'transform.positionY': {y} }} }}));
tracks.overlay.push(words);
console.log(JSON.stringify(buildRenderPlan({{ tracks, width: {W}, height: {H}, fps: 30 }})));
"""


BLACK = os.path.join(TMP, "black.mp4")
r = run([FF, "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r=30:d=2",
         "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "2", "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", BLACK])
case("black source made", r.returncode == 0, r.stderr[-300:])

# How many lines does the planner want? Ask it at y=36 (known to fit).
r = run(["node", "--input-type=module", "-e", plan_js(36)])
case("plan built at y=36", r.returncode == 0, r.stderr[-300:])
n_lines = json.loads(r.stdout)["filterComplex"].count("drawtext=") if r.returncode == 0 else 0
case("caption wraps to several lines", n_lines >= 2, f"{n_lines} lines")

y_edge = H - n_lines * LINE  # bottom == H exactly
r = run(["node", "--input-type=module", "-e", plan_js(y_edge)])
case("planner accepts the edge case (bottom == frame height)", r.returncode == 0, f"y={y_edge}; " + r.stderr[-300:])
if r.returncode == 0:
    p = json.loads(r.stdout)
    out = os.path.join(TMP, "edge.mp4")
    rr = run([FF, "-y", "-v", "error", *p["args"], "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", out])
    case("ffmpeg accepts the edge-case graph", rr.returncode == 0, rr.stderr[-300:])
    if rr.returncode == 0:
        b = bbox(frame_at(out, 1.2))
        case("edge caption draws", b is not None)
        if b:
            case("every bright pixel is inside the frame (max y < H)", b[3] < H, f"max y {b[3]} of {H}")
            case("last drawn pixel is within the planned line boxes (max y <= bottom-1)", b[3] <= y_edge + n_lines * LINE - 1,
                 f"max y {b[3]}, planned bottom {y_edge + n_lines * LINE}")
            case("first drawn pixel is not above the first line box", b[2] >= y_edge, f"min y {b[2]}, first box top {y_edge}")
            print("slack below last glyph (px):", H - 1 - b[3])

# One pixel lower must be refused before ffmpeg runs.
r = run(["node", "--input-type=module", "-e", plan_js(y_edge + 1)])
case("planner refuses one pixel lower, with a bottom-edge message", r.returncode != 0 and "bottom edge" in r.stderr, r.stderr.strip().split("\n")[-1][:200])

ok = all(c["pass"] for c in results)
print(json.dumps({"all_pass": ok, "n": len(results), "ffmpeg": run([FF, "-version"]).stdout.split("\n")[0], "cases": results}))
