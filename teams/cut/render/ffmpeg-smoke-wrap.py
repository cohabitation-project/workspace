#!/usr/bin/env python3
"""Real-ffmpeg check for teams/cut/render/wrap.mjs (long Words captions).

Usage:  python3 ffmpeg-smoke-wrap.py /path/to/ffmpeg
Needs node and numpy. Prints one JSON report on the last line ({"all_pass": bool, ...}).
PLAN_MJS / WRAP_MJS can point at placed copies (commons/lib/cut/...).

Question 1 (estimate is conservative): for a spread of strings, is wrap.mjs's estimated width >= the real
  bright-pixel width drawtext produces for the same text at the same size? If not, wrapping could still overflow.
Question 2 (end to end): a long Words caption through buildRenderPlan -> ffmpeg. Does the plan have several
  drawtext lines, and do all bright pixels stay inside the frame minus the planned right margin and above the
  bottom edge, and is the caption absent outside its window?
Not settled: other fonts (the server's `sans` is unknown), kerning-heavy text, right-to-left or CJK text.
"""
import json, os, subprocess, sys, tempfile
os.environ.setdefault("HOME", "/tmp/h")
os.environ.setdefault("XDG_CACHE_HOME", os.path.join(os.environ["HOME"], ".cache"))
os.makedirs(os.environ["XDG_CACHE_HOME"], exist_ok=True)
import numpy as np

FF = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.environ.get("PLAN_MJS", os.path.join(HERE, "plan.mjs"))
WRAP = os.environ.get("WRAP_MJS", os.path.join(HERE, "wrap.mjs"))
MODEL = os.path.join(HERE, "..", "port", "model.mjs")
TMP = tempfile.mkdtemp()
W, H, T = 540, 960, 120000
results = []


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def case(name, ok, detail=""):
    results.append({"case": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (" | " + detail if detail else ""), flush=True)


def frame_at(path, t):
    r = subprocess.run([FF, "-v", "error", "-ss", str(t), "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                       capture_output=True)
    assert r.returncode == 0, r.stderr[-300:]
    return np.frombuffer(r.stdout, dtype=np.uint8).reshape(H, W)


def bbox(img):
    ys, xs = np.nonzero(img > 128)
    return None if len(xs) == 0 else (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()))


black = os.path.join(TMP, "black.mp4")
r = run([FF, "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=30:d=4", "-f", "lavfi", "-i", "sine=d=4",
         "-shortest", "-pix_fmt", "yuv420p", black])
assert r.returncode == 0, r.stderr[-300:]

# Question 1: estimate vs real width, single line, drawtext at x=0.
SIZE = 48
strings = ["Hello Cohabi", "WWWWWWWWWW", "iiiiiiiiiiiiiiiiiiii", "THE QUICK BROWN FOX", "0123456789 0123456789",
           "it's 5:00 [live]; 100% %{pts}", "mmmmmmmmmm", "Cohabi Cut makes captions", "@#$%&*()_+={}|<>?~", "Zażółć gęślą jaźń"]
js = f"""
import {{ estimateTextWidth }} from {json.dumps('file://' + WRAP)};
console.log(JSON.stringify({json.dumps(strings)}.map((s) => estimateTextWidth(s, {SIZE}))));
"""
r = run(["node", "--input-type=module", "-e", js])
case("wrap.mjs loads and estimates", r.returncode == 0, r.stderr[-300:])
if r.returncode == 0:
    est = json.loads(r.stdout)
    worst = None
    for s, e in zip(strings, est):
        txt = os.path.join(TMP, "t.txt")
        with open(txt, "w", encoding="utf-8", newline="") as f:
            f.write(s)
        out = os.path.join(TMP, "line.mp4")
        rr = run([FF, "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r=30:d=1",
                  "-vf", f"drawtext=expansion=none:textfile={txt}:x=0:y=100:fontsize={SIZE}:fontcolor=white:font=DejaVu Sans,format=yuv420p",
                  "-c:v", "libx264", "-qp", "0", out])
        if rr.returncode != 0:
            case(f"render line {s!r}", False, rr.stderr[-200:])
            continue
        b = bbox(frame_at(out, 0.2))
        if b is None:
            case(f"line {s!r} draws something", False, "no bright pixels (font lacks the glyphs?)")
            continue
        real = b[1] - b[0] + 1
        ratio = e / real
        worst = ratio if worst is None else min(worst, ratio)
        case(f"estimate >= real width for {s!r}", e >= real, f"estimate {e:.0f}px, real {real}px, ratio {ratio:.3f}")
    print("min estimate/real ratio", worst)

# Question 2: end to end.
CAP = "Absolutely nothing about this sentence fits one line"
js = f"""
import {{ buildRenderPlan }} from {json.dumps('file://' + PLAN)};
import {{ createEmptyTracks, createElement, createTrack }} from {json.dumps('file://' + MODEL)};
const T = {T};
const tracks = createEmptyTracks();
tracks.main.elements.push(createElement({{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, params: {{ src: {json.dumps(black)} }} }}));
const words = createTrack({{ type: 'text', name: 'Words', id: 'words' }});
words.elements.push(createElement({{ id: 'cap1', type: 'text', startTime: T, duration: T / 2, params: {{ content: {json.dumps(CAP)}, fontSize: 48, color: 'white', 'transform.positionX': 24, 'transform.positionY': 36 }} }}));
tracks.overlay.push(words);
console.log(JSON.stringify(buildRenderPlan({{ tracks, width: {W}, height: {H}, fps: 30 }})));
"""
r = run(["node", "--input-type=module", "-e", js])
case("plan built for a long Words caption", r.returncode == 0, r.stderr[-400:])
if r.returncode == 0:
    p = json.loads(r.stdout)
    n_draw = p["filterComplex"].count("drawtext=")
    case("long caption became several drawtext lines", n_draw >= 2, f"{n_draw} drawtext filters")
    out = os.path.join(TMP, "wrapped.mp4")
    rr = run([FF, "-y", "-v", "error", *p["args"], "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", out])
    case("graph accepted: wrapped caption", rr.returncode == 0, rr.stderr[-400:])
    if rr.returncode == 0:
        b = bbox(frame_at(out, 1.2))
        margin = round(W * 0.04)
        case("wrapped caption draws", b is not None)
        if b:
            case("every bright pixel inside the right margin", b[1] <= W - margin, f"max x {b[1]} of {W}, limit {W - margin}")
            case("every bright pixel above the bottom edge", b[3] < H, f"max y {b[3]} of {H}")
            case("caption starts at its x", b[0] >= 24 and b[0] < 24 + 20, f"min x {b[0]}")
        for t in (0.5, 0.9, 1.6, 1.9):
            case(f"no caption outside window at {t} s", bbox(frame_at(out, t)) is None, str(bbox(frame_at(out, t))))
        # contrast: the unwrapped single line really overflows (guards against a test that cannot fail)
        txt = os.path.join(TMP, "cap.txt")
        with open(txt, "w", encoding="utf-8", newline="") as f:
            f.write(CAP)
        one = os.path.join(TMP, "one.mp4")
        rr = run([FF, "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r=30:d=1",
                  "-vf", f"drawtext=expansion=none:textfile={txt}:x=24:y=36:fontsize=48:fontcolor=white:font=DejaVu Sans,format=yuv420p",
                  "-c:v", "libx264", "-qp", "0", one])
        ob = bbox(frame_at(one, 0.2)) if rr.returncode == 0 else None
        case("unwrapped single line overflows the frame (the problem is real)", ob is not None and ob[1] >= W - 1,
             f"unwrapped bbox {ob}")

ok = all(c["pass"] for c in results)
print(json.dumps({"all_pass": ok, "n": len(results), "ffmpeg": run([FF, "-version"]).stdout.split("\n")[0], "cases": results}))
