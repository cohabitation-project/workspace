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
# PLAN_MJS=/path/to/plan.mjs runs the same cases against another copy (e.g. placed commons/lib/cut/plan.mjs).
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


def audio_plan_args(main_src, music_src=None):
    music_tracks = "[]" if music_src is None else f"[{{ id: 'au', type: 'audio', elements: [{{ id: 'mu', type: 'audio', startTime: T / 2, duration: 3 * T / 2, trimStart: 0, params: {{ src: {json.dumps(music_src)} }} }}] }}]"
    js = f"""
import {{ buildRenderPlan }} from {json.dumps('file://' + PLAN)};
const T = {T};
const clip = {{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, trimStart: 0, params: {{ src: {json.dumps(main_src)} }} }};
const p = buildRenderPlan({{ tracks: {{ overlay: [], audio: {music_tracks}, main: {{ id: 'm', type: 'video', elements: [clip] }} }}, width: {W}, height: {H}, fps: 30 }});
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


def textfile_reference(name, text):
    """Render the same literal text via drawtext's textfile input as a pixel ground truth."""
    text_path = os.path.join(TMP, name + ".txt")
    with open(text_path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    out = os.path.join(TMP, name + "-reference.mp4")
    vf = (f"trim=duration=2,setpts=PTS-STARTPTS,drawtext=expansion=none:textfile={text_path}:"
          f"x=10:y=100:fontsize=48:fontcolor=white,"
          f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
          f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p")
    r = run([FF, "-y", "-v", "error", "-i", black, "-vf", vf, "-t", "2", "-an",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", out])
    return out, r


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

# 5. Escaping must be demonstrated by pixels, not merely ffmpeg's exit status.
# Compare the filtergraph text against drawtext's textfile= ground truth using identical text,
# geometry, scaling and encoding. This catches silent blank-text output for apostrophes.
for k, txt in enumerate(["it's %{x}", HOSTILE, "  a: b  "]):
    p, planned, planned_run = render(f"textcmp{k}", black, [{"id": "text", "params": {"text": txt, "x": 10, "y": 100, "fontSize": 48}}])
    case(f"planned graph accepted for textfile comparison {k}", planned_run.returncode == 0, planned_run.stderr[-300:])
    reference, reference_run = textfile_reference(f"textcmp{k}", txt)
    case(f"textfile ground truth rendered for case {k}", reference_run.returncode == 0, reference_run.stderr[-300:])
    if planned_run.returncode == 0 and reference_run.returncode == 0:
        actual = frame(planned, 1)[360:420]
        expected = frame(reference, 1)[360:420]
        max_diff = int(np.abs(actual - expected).max())
        case(f"text pixels match textfile ground truth for case {k}", max_diff < 8,
             f"max absolute RGB difference in text band: {max_diff}")

# 6. timed text: `enable` between(t,1,1.5) -> present at 1.2 s, absent at 0.5 s and 1.8 s
p, out, r = render("timed", black, [{"id": "text", "params": {"text": "hello", "x": 10, "y": 100, "fontSize": 48, "enable": "between(t,1,1.5)"}}])
case("graph accepted: timed text (enable)", r.returncode == 0, r.stderr[-300:])
if r.returncode == 0:
    on, off1, off2 = (int((frame(out, t)[360:420] > 128).sum()) for t in (1.2, 0.5, 1.8))
    case("timed text shows only inside its window", on > 100 and off1 < 20 and off2 < 20, f"bright subpixels: 1.2s {on}, 0.5s {off1}, 1.8s {off2}")

# 6b. Words-track caption end to end: buildRenderPlan on a real model timeline with a Words text element
# (apostrophe, colon, brackets, %). Whole frames before / during / after the 1.0-1.5 s window are compared
# with a static textfile= render of the same text (during) and a no-text render (before, after).
CAP = "it's 5:00 [live]; 100% %{pts}"
WRAPF = os.environ.get("WRAP_MJS", os.path.join(os.path.dirname(PLAN), "wrap.mjs"))
js = f"""
import {{ buildRenderPlan }} from {json.dumps('file://' + PLAN)};
import {{ createEmptyTracks, createElement, createTrack }} from {json.dumps('file://' + os.path.join(HERE, '..', 'port', 'model.mjs'))};
const T = {T};
const tracks = createEmptyTracks();
tracks.main.elements.push(createElement({{ id: 'c1', type: 'video', startTime: 0, duration: 2 * T, params: {{ src: {json.dumps(black)} }} }}));
const words = createTrack({{ type: 'text', name: 'Words', id: 'words' }});
words.elements.push(createElement({{ id: 'cap1', type: 'text', startTime: T, duration: T / 2, params: {{ content: {json.dumps(CAP)}, fontSize: 42, color: 'white', 'transform.positionX': 24, 'transform.positionY': 36 }} }}));
tracks.overlay.push(words);
// This caption is wider than the frame at 42 px, so the planner WRAPS it into one drawtext per line
// (wrap.mjs). The reference must draw the same lines at the same y, or it compares one line to three.
let lines;
try {{
  const w = await import({json.dumps('file://' + WRAPF)});
  lines = w.wrapCaptionParams({{ text: {json.dumps(CAP)}, x: 24, y: 36, fontSize: 42 }}, {{ width: {W}, height: {H} }}).map((p) => ({{ text: p.text, y: p.y }}));
}} catch (e) {{ lines = [{{ text: {json.dumps(CAP)}, y: 36 }}]; }}
console.log(JSON.stringify({{ ...buildRenderPlan({{ tracks, width: {W}, height: {H}, fps: 30 }}), refLines: lines }}));
"""
r = run(["node", "--input-type=module", "-e", js])
case("plan built: main + Words caption", r.returncode == 0, r.stderr[-500:])
if r.returncode == 0:
    p = json.loads(r.stdout)
    out = os.path.join(TMP, "words.mp4")
    # lossless (-qp 0) for this pixel comparison so codec noise cannot masquerade as a text difference
    r = run([FF, "-y", "-v", "error", *p["args"], "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", out])
    case("graph accepted: Words caption", r.returncode == 0, r.stderr[-400:])
    case("plan reports nothing ignored for the Words caption", p.get("ignored") == [], str(p.get("ignored")))
    if r.returncode == 0:
        ref_lines = p.get("refLines") or [{"text": CAP, "y": 36}]
        ref_txts = []
        for li, ln in enumerate(ref_lines):
            lp = os.path.join(TMP, f"cap{li}.txt")
            with open(lp, "w", encoding="utf-8", newline="") as f:
                f.write(ln["text"])
            ref_txts.append((lp, ln["y"]))
        # Words captions are drawn by the planner AFTER concat, in output space (540x960), so the reference
        # draws after scale/pad too (a first version drew before scaling and differed by 255: a reference bug).
        base = f"trim=duration=2,setpts=PTS-STARTPTS,scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p%s"
        def ref(name, dt):
            o = os.path.join(TMP, name + ".mp4")
            rr = run([FF, "-y", "-v", "error", "-i", black, "-vf", base % dt, "-t", "2", "-an", "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", o])
            assert rr.returncode == 0, rr.stderr[-300:]
            return o
        with_text = ref("cap-ref", "".join(f",drawtext=expansion=none:textfile={lp}:x=24:y={ly}:fontsize=42:fontcolor=white:font=DejaVu Sans" for lp, ly in ref_txts))
        case("reference drew the wrapped lines the planner drew", len(ref_txts) == p["filterComplex"].count("drawtext="), f"{len(ref_txts)} reference lines vs {p['filterComplex'].count('drawtext=')} planner drawtexts")
        no_text = ref("cap-none", "")
        lit = int((frame(with_text, 1.2) > 128).sum())
        case("caption reference actually has text (guards against a blank-vs-blank pass)", lit > 100, f"bright subpixels in reference at 1.2 s: {lit}")
        d = int(np.abs(frame(out, 1.2) - frame(with_text, 1.2)).max())
        case("caption during window matches textfile ground truth (whole frame, 1.2 s)", d < 8, f"max abs diff {d}")
        for t in (0.5, 0.9, 1.6, 1.9):
            d = int(np.abs(frame(out, t) - frame(no_text, t)).max())
            case(f"no caption outside window at {t} s (whole frame equals no-text render)", d < 8, f"max abs diff {d}")

# 7. music: music starts at 1.0 s and outlasts the 2 s main clip; output duration remains main's.
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

# 8. Mixing a silent music bed must not attenuate the main track. With amix's default
# normalization the main tone is typically halved while the second input is active; compare
# the decoded output RMS against the same main-only render, away from AAC start/end padding.
silence = os.path.join(TMP, "silent-music.wav")
r = run([FF, "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=2", "-t", "2", "-c:a", "pcm_s16le", silence])
assert r.returncode == 0, r.stderr[-300:]

def render_audio_probe(name, p):
    out = os.path.join(TMP, name + ".mp4")
    rr = run([FF, "-y", "-v", "error", *p["args"], "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out])
    case(f"graph accepted: {name}", rr.returncode == 0, rr.stderr[-300:])
    return out if rr.returncode == 0 else None

def decoded_audio_rms(path, start, end):
    raw = subprocess.run([FF, "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True)
    if raw.returncode != 0:
        return None, raw.stderr[-300:].decode("utf-8", "replace")
    samples = np.frombuffer(raw.stdout, dtype="<f4").astype(np.float64)
    segment = samples[int(start * 48000):int(end * 48000)]
    if len(segment) == 0 or not np.isfinite(segment).all():
        return None, f"invalid decoded sample window: {len(segment)} samples"
    return float(np.sqrt(np.mean(segment * segment))), ""

baseline = render_audio_probe("main-tone-only", audio_plan_args(black))
with_silence = render_audio_probe("main-tone-plus-silent-music", audio_plan_args(black, silence))
if baseline and with_silence:
    main_rms, e1 = decoded_audio_rms(baseline, 0.75, 1.75)
    mixed_rms, e2 = decoded_audio_rms(with_silence, 0.75, 1.75)
    valid = main_rms is not None and mixed_rms is not None and main_rms > 0 and mixed_rms > 0
    delta_db = (20 * np.log10(mixed_rms / main_rms)) if valid else None
    passed = valid and abs(delta_db) <= 0.5
    detail = ({"window_s": [0.75, 1.75], "main_only_rms": main_rms, "with_silent_music_rms": mixed_rms,
               "delta_db": float(delta_db), "tolerance_db": 0.5} if valid else {"error": e1 or e2})
    report["music_level_check"] = detail
    case("silent music leaves main tone RMS within 0.5 dB", passed, json.dumps(detail, sort_keys=True))
else:
    case("silent music leaves main tone RMS within 0.5 dB", False, "one or both probe renders failed")

report["all_pass"] = bool(ok)
print(json.dumps(report))
sys.exit(0 if ok else 1)
