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
# fontconfig fails with EACCES in a read-only HOME; give it a writable cache.
os.environ.setdefault("HOME", "/tmp/h")
os.environ.setdefault("XDG_CACHE_HOME", os.path.join(os.environ["HOME"], ".cache"))
os.makedirs(os.environ["XDG_CACHE_HOME"], exist_ok=True)
import numpy as np

FF = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
# PLAN_MJS=/path/to/plan.mjs runs the same cases against another copy (e.g. the placed commons/lib/cut/plan.mjs).
PLAN = os.environ.get("PLAN_MJS", os.path.join(HERE, "plan.mjs"))
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
import {{ buildRenderPlan }} from {json.dumps('file://' + PLAN)};
const T = {T};
const clip = {{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, trimStart: 0, params: {{ src: {json.dumps(src)}, effects: {json.dumps(effects)} }} }};
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


# left half red, right half blue, 1280x720
rb = os.path.join(TMP, "redblue.mp4")
r = run([FF, "-y", "-f", "lavfi", "-i", "color=c=blue:s=1280x720:r=30:d=4", "-f", "lavfi", "-i", "sine=d=4", "-shortest",
         "-vf", "drawbox=x=0:y=0:w=640:h=720:color=red@1:t=fill", "-pix_fmt", "yuv420p", rb])
assert r.returncode == 0, r.stderr[-300:]
black = make_source("black.mp4", "color=c=black")

# 1. crop (left red half) + fade in over the first second
p, out, r = render("crop_fade", rb, [
    {"id": "crop", "params": {"width": 640, "height": 360, "x": 0, "y": 0, "frameWidth": 1280, "frameHeight": 720}},
    {"id": "fade", "params": {"direction": "in", "start": 0, "duration": 1}},
])
# Effects run BEFORE scale/pad (params.effects contract): the 640x360 crop is scaled to 540x304 and
# letterboxed, so the picture sits in output rows ~328..632 and the rest is black pad.
case("graph accepted: crop+fade", r.returncode == 0, r.stderr[-300:])
if r.returncode == 0:
    f0, f1 = frame(out, 0), frame(out, 1.5)
    mid = f1[H // 2 - 50:H // 2 + 50, 100:440]
    mid0 = f0[H // 2 - 50:H // 2 + 50, 100:440]
    pad = f1[0:300, :]
    case("crop took the red half only", (mid[..., 0] > 200).all() and (mid[..., 2] < 60).all(),
         f"mid-band mean RGB {mid.reshape(-1, 3).mean(0).round(1).tolist()}")
    case("letterbox pad above the picture is black", pad.max() < 40, f"pad max {int(pad.max())}")
    case("fade-in seen through the pad: picture band at t=0 darker than at t=1.5s", mid0.mean() < mid.mean() - 60,
         f"band mean {mid0.mean():.1f} vs {mid.mean():.1f}")

# 2. hostile drawtext text, no fontfile: accepted, and the text actually appears
HOSTILE = "it's: a,b;[c]\\d %{x}"
p, out, r = render("hostile", black, [{"id": "text", "params": {"text": HOSTILE, "x": 10, "y": 100, "fontSize": 48}}])
case("graph accepted: hostile text", r.returncode == 0, r.stderr[-400:])
if r.returncode == 0:
    f = frame(out, 1)
    # text at source y=100 (fontsize 48) -> output rows ~328+42 = 370 .. 400 after the 0.4219 scale
    band = f[360:420]
    case("hostile text drew pixels (a font was found)", (band > 128).sum() > 200, f"{int((band > 128).sum())} bright subpixels in the text band")
    case("ffmpeg stderr empty for hostile text", r.stderr.strip() == "", r.stderr[-200:])

# 2b. %{pts} must draw LITERALLY: if it expanded, the text would change with the frame time
p, out, r = render("literal_pts", black, [{"id": "text", "params": {"text": "%{pts} %{n}", "x": 10, "y": 100, "fontSize": 48}}])
case("graph accepted: %{pts} text", r.returncode == 0, r.stderr[-300:])
if r.returncode == 0:
    a, b = frame(out, 0.5)[360:420], frame(out, 1.5)[360:420]
    case("%{pts} drawn literally: text band identical at t=0.5 and t=1.5", (a > 128).sum() > 200 and np.abs(a - b).max() < 8,
         f"bright {int((a > 128).sum())}, max diff {int(np.abs(a - b).max())}")

# 3. injection payload: if the apostrophe closed the quote, drawbox would paint the frame red
INJ = "',drawbox=x=0:y=0:w=iw:h=ih:color=red@1:t=fill,drawtext=text='"
p, out, r = render("inject", black, [{"id": "text", "params": {"text": INJ, "x": 10, "y": 100, "fontSize": 48}}])
case("graph accepted: injection payload as plain text", r.returncode == 0, r.stderr[-400:])
if r.returncode == 0:
    f = frame(out, 1)
    # drawbox would run BEFORE scale/pad, so red would fill the picture area (the pad stays black): check the picture centre
    centre = f[H // 2 - 50:H // 2 + 50, 100:440]
    case("injection did not run: picture centre not red", centre[..., 0].max() < 40, f"centre R max {int(centre[..., 0].max())}")

# 4. same payload with a nasty path-ish string and a backslash at the very end
for k, txt in enumerate(["it's %{x}", "trailing backslash \\", "100% real: 'quoted' \"double\"", "unicode \u00e9\u00e8 \u2014 \u65e5\u672c"]):
    p, out, r = render(f"misc{k}", black, [{"id": "text", "params": {"text": txt}}])
    case(f"graph accepted: {txt!r}", r.returncode == 0, r.stderr[-300:])

# 5. timed text: `enable` between(t,1,1.5) -> text present at 1.2 s, absent at 0.5 s and 1.8 s
p, out, r = render("timed", black, [{"id": "text", "params": {"text": "hello", "x": 10, "y": 100, "fontSize": 48, "enable": "between(t,1,1.5)"}}])
case("graph accepted: timed text (enable)", r.returncode == 0, r.stderr[-300:])
if r.returncode == 0:
    on, off1, off2 = (int((frame(out, t)[360:420] > 128).sum()) for t in (1.2, 0.5, 1.8))
    case("timed text shows only inside its window", on > 100 and off1 < 20 and off2 < 20, f"bright subpixels: 1.2s {on}, 0.5s {off1}, 1.8s {off2}")

# 6. music: a 2 s main clip (440 Hz) plus ONE 1000 Hz music clip that starts at 1.0 s and is long enough to
#    outlast the main. amix=duration=first means the output must still be the main's length, the music must be
#    absent before 1.0 s and audible after it.
music = os.path.join(TMP, "music.wav")
r = run([FF, "-y", "-f", "lavfi", "-i", "sine=f=1000:d=5", music])
assert r.returncode == 0, r.stderr[-300:]
js = f"""
import {{ buildRenderPlan }} from {json.dumps('file://' + PLAN)};
const T = {T};
const clip = {{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, trimStart: 0, params: {{ src: {json.dumps(black)} }} }};
const mu = {{ id: 'mu', type: 'audio', startTime: T, duration: 3 * T, trimStart: 0, params: {{ src: {json.dumps(music)} }} }};
const p = buildRenderPlan({{ tracks: {{ overlay: [], audio: [{{ id: 'au', type: 'audio', elements: [mu] }}], main: {{ id: 'm', type: 'video', elements: [clip] }} }}, width: {W}, height: {H}, fps: 30 }});
console.log(JSON.stringify(p));
"""
r = run(["node", "--input-type=module", "-e", js])
case("plan built: main + one music clip", r.returncode == 0, r.stderr[-400:])
if r.returncode == 0:
    p = json.loads(r.stdout)
    out = os.path.join(TMP, "music.mp4")
    r = run([FF, "-y", "-v", "error", *p["args"], "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out])
    case("graph accepted: main + music", r.returncode == 0, r.stderr[-400:])
    if r.returncode == 0:
        raw = subprocess.run([FF, "-v", "error", "-i", out, "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True)
        s = np.frombuffer(raw.stdout, np.float32)

        def mags(t0, t1):
            seg = s[int(t0 * 48000):int(t1 * 48000)]
            spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
            fr = np.fft.rfftfreq(len(seg), 1 / 48000)
            return (float(spec[(fr > 410) & (fr < 470)].max()), float(spec[(fr > 970) & (fr < 1030)].max()))

        m1, k1 = mags(0.2, 0.8)
        m2, k2 = mags(1.2, 1.8)
        dur = len(s) / 48000
        case("output length is the main clip's (music is longer, still cut at 2 s)", abs(dur - 2.0) < 0.1, f"audio {dur:.3f} s")
        case("music silent before its start (1.0 s)", m1 > 20 and k1 < 0.05 * m1, f"before: 440Hz {m1:.1f}, 1000Hz {k1:.2f}")
        case("music audible after its start", k2 > 0.3 * m1 and m2 > 0.3 * m1, f"after: 440Hz {m2:.1f}, 1000Hz {k2:.1f}")
        info = run([FF, "-i", out]).stderr
        report["music_container_info"] = [l.strip() for l in info.splitlines() if "Duration" in l][:1]

report["all_pass"] = bool(ok)
print(json.dumps(report))
sys.exit(0 if ok else 1)
