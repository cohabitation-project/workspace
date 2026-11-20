#!/usr/bin/env python3
"""Real-ffmpeg smoke test for teams/cut/render/plan.mjs + registry.mjs (Cut Job 3).

Usage:  python3 ffmpeg-smoke.py /path/to/ffmpeg [fontfile-note]
Needs node on PATH and numpy. Writes only to a temp dir; prints one JSON report on the last line.

It builds a plan with buildRenderPlan (via node), runs the plan's `args` through the given ffmpeg,
then reads FRAMES BACK and checks pixels. What it settles:
  - the generated graph is accepted (exit 0) for each case, including hostile drawtext text
  - drawtext found a font with no fontfile given (text pixels actually appear)
  - the hostile text did NOT inject filters (a `drawbox ... red` payload leaves the corner black)
  - crop took the left (red) half, fade-in starts darker than it ends
What it does NOT settle: other ffmpeg versions, other fonts, text wrapping/size, any codec/device
behaviour, frame-exact cut points. It checks the planned filter strings, not the browser editor.
"""
import json, os, subprocess, sys, tempfile
import numpy as np

FF = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = tempfile.mkdtemp()
W, H = 540, 960
T = 120000  # ticks per second


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def make_source(name, vf):
    path = os.path.join(TMP, name)
    r = run([FF, "-y", "-f", "lavfi", "-i", f"{vf}:s=1280x720:r=30:d=4", "-f", "lavfi", "-i", "sine=d=4",
             "-shortest", "-pix_fmt", "yuv420p", path])
    assert r.returncode == 0, r.stderr[-500:]
    return path


def plan_args(src, effects):
    js = f"""
import {{ buildRenderPlan }} from {json.dumps('file://' + os.path.join(HERE, 'plan.mjs'))};
const T = {T};
const clip = {{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, trimStart: 0, params: {{ src: {json.dumps(src)} }}, effects: {json.dumps(effects)} }};
const p = buildRenderPlan({{ tracks: {{ overlay: [], audio: [], main: {{ id: 'm', type: 'video', elements: [clip] }} }}, width: {W}, height: {H}, fps: 30 }});
console.log(JSON.stringify(p));
"""
    r = run(["node", "--input-type=module", "-e", js])
    assert r.returncode == 0, r.stderr[-800:]
    return json.loads(r.stdout)


def frame(path, t):
    r = subprocess.run([FF, "-v", "error", "-ss", str(t), "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       capture_output=True)
    assert r.returncode == 0, r.stderr[-300:]
    return np.frombuffer(r.stdout, np.uint8).reshape(H, W, 3).astype(int)


def render(name, src, effects):
    p = plan_args(src, effects)
    out = os.path.join(TMP, name + ".mp4")
    r = run([FF, "-y", "-v", "error", *p["args"], "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out])
    return p, out, r


report = {"ffmpeg": run([FF, "-version"]).stdout.splitlines()[0], "cases": {}}
fc = run(["fc-match", "-f", "%{file}", "sans"])
report["fc_match_sans"] = fc.stdout if fc.returncode == 0 else f"fc-match unavailable ({fc.returncode})"
ok = True


def case(name, passed, note=""):
    global ok
    ok = ok and passed
    report["cases"][name] = {"pass": bool(passed), "note": note}


red_blue = make_source("redblue.mp4", "color=c=blue")  # placeholder replaced below
# left half red, right half blue, 1280x720
rb = os.path.join(TMP, "redblue.mp4")
r = run([FF, "-y", "-f", "lavfi", "-i", "color=c=blue:s=1280x720:r=30:d=4", "-f", "lavfi", "-i", "sine=d=4", "-shortest",
         "-vf", "drawbox=x=0:y=0:w=640:h=720:color=red@1:t=fill", "-pix_fmt", "yuv420p", rb])
assert r.returncode == 0, r.stderr[-300:]
black = make_source("black.mp4", "color=c=black")

# 1. crop (left red half) + fade in over the first second
p, out, r = render("crop_fade", rb, [
    {"id": "crop", "params": {"width": 640, "height": 360, "x": 0, "y": 0, "frameWidth": 1280, "frameHeight": 720}},
    {"id": "fade", "params": {"direction": "in", "startTicks": 0, "durationTicks": T}},
])
case("graph accepted: crop+fade", r.returncode == 0, r.stderr[-300:])
if r.returncode == 0:
    f0, f1 = frame(out, 0), frame(out, 1.5)
    mid = f1[H // 2 - 50:H // 2 + 50, 100:440]
    case("crop took the red half only", (mid[..., 0] > 200).all() and (mid[..., 2] < 60).all(),
         f"mid-band mean RGB {mid.reshape(-1, 3).mean(0).round(1).tolist()}")
    case("fade-in: first frame darker than t=1.5s", f0.mean() < f1.mean() - 20, f"mean {f0.mean():.1f} vs {f1.mean():.1f}")

# 2. hostile drawtext text, no fontfile: accepted, and the text actually appears
HOSTILE = "it's: a,b;[c]\\d %{x}"
p, out, r = render("hostile", black, [{"id": "text", "params": {"text": HOSTILE, "x": 10, "y": 100, "fontSize": 48}}])
case("graph accepted: hostile text", r.returncode == 0, r.stderr[-400:])
if r.returncode == 0:
    f = frame(out, 1)
    band = f[90:170]
    case("hostile text drew pixels (a font was found)", (band > 128).sum() > 200, f"{int((band > 128).sum())} bright subpixels in the text band")
    case("text stayed literal (%{x} not expanded: no 'x' expansion error)", r.stderr.strip() == "", r.stderr[-200:])

# 3. injection payload: if the apostrophe closed the quote, drawbox would paint the frame red
INJ = "',drawbox=x=0:y=0:w=iw:h=ih:color=red@1:t=fill,drawtext=text='"
p, out, r = render("inject", black, [{"id": "text", "params": {"text": INJ, "x": 10, "y": 100, "fontSize": 48}}])
case("graph accepted: injection payload as plain text", r.returncode == 0, r.stderr[-400:])
if r.returncode == 0:
    f = frame(out, 1)
    corner = f[900:960, 0:60]
    case("injection did not run: far corner still black", corner.max() < 40, f"corner max {int(corner.max())}")

# 4. same payload with a nasty path-ish string and a backslash at the very end
for k, txt in enumerate(["trailing backslash \\", "100% real: 'quoted' \"double\"", "unicode \u00e9\u00e8 \u2014 \u65e5\u672c"]):
    p, out, r = render(f"misc{k}", black, [{"id": "text", "params": {"text": txt}}])
    case(f"graph accepted: {txt!r}", r.returncode == 0, r.stderr[-300:])

report["all_pass"] = ok
print(json.dumps(report))
sys.exit(0 if ok else 1)
