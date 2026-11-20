"""Mutation pass for teams/cut/render/plan.mjs. Run: python3 mutation-plan.py
Each mutant replaces ONE exact string in a temp copy of render/ + port/ and re-runs plan.test.mjs.
A mutant is KILLED if the tests fail. Survivors must be judged by hand (equivalent or a real hole)."""
import os, shutil, subprocess, tempfile, json

REPO = os.environ.get("REPO", ".")
SRC = os.path.join(REPO, "teams/cut")

MUTANTS = [
    ("secs: 6 decimals -> 3", "toFixed(6);\n\treturn s.replace", "toFixed(3);\n\treturn s.replace"),
    ("secs: no trailing-zero trim", 's.replace(/\\.?0+$/, "") || "0"', 's'),
    ("atempo: upper split at 3", "while (r > 2)", "while (r > 3)"),
    ("atempo: lower split at 0.25", "while (r < 0.5)", "while (r < 0.25)"),
    ("atempo: halve by 3", "parts.push(2); r /= 2;", "parts.push(2); r /= 3;"),
    ("video setpts multiplies", "(PTS-STARTPTS)/${num(rate)}", "(PTS-STARTPTS)*${num(rate)}"),
    ("rate 1 not special-cased", 'rate === 1 ? "setpts=PTS-STARTPTS"', 'rate === 99 ? "setpts=PTS-STARTPTS"'),
    ("source span ignores rate", "getSourceSpanAtClipTime({ clipTime: clip.duration, retime: clip.retime })", "clip.duration"),
    ("trim end excludes trimStart", "const trimEnd = trimStart + span;", "const trimEnd = span;"),
    ("trim start dropped", "trim=start=${secs(trimStart)}:end=${secs(trimEnd)},${setpts}", "trim=end=${secs(trimEnd)},${setpts}"),
    ("audio trim start dropped", "atrim=start=${secs(trimStart)}:end=${secs(trimEnd)},asetpts", "atrim=end=${secs(trimEnd)},asetpts"),
    ("post-retime duration bound dropped (video)", "${setpts},trim=end=${d},", "${setpts},"),
    ("post-retime duration bound dropped (audio)", '`atrim=end=${d}`, `aresample', '`aresample'),
    ("scale keeps aspect off", "force_original_aspect_ratio=decrease,pad", "pad"),
    ("pad dropped", "pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,", ""),
    ("setsar dropped", "setsar=1,fps=${fps},format=yuv420p[v${i}]", "fps=${fps},format=yuv420p[v${i}]"),
    ("fps dropped", "setsar=1,fps=${fps},format=yuv420p[v${i}]", "setsar=1,format=yuv420p[v${i}]"),
    ("audio resample dropped", "`aresample=${AUDIO_RATE}`, ", ""),
    ("audio stereo format dropped", ', "aformat=sample_fmts=fltp:channel_layouts=stereo"]', "]"),
    ("hasAudio check inverted", "hasAudio === false", "hasAudio === true"),
    ("gap video colour not black", "color=c=black", "color=c=white"),
    ("gap uses wrong size", "color=c=black:s=${width}x${height}", "color=c=black:s=${height}x${width}"),
    ("gap audio dropped length", "atrim=duration=${d},asetpts=PTS-STARTPTS[a${i}]`);\n\t\tlabels", "asetpts=PTS-STARTPTS[a${i}]`);\n\t\tlabels"),
    ("gap not inserted", "if (clip.startTime > cursor) gap(clip.startTime - cursor);", ""),
    ("overlap not refused", "if (clip.startTime < cursor) throw", "if (false) throw"),
    ("overlap check <=", "if (clip.startTime < cursor) throw", "if (clip.startTime <= cursor) throw"),
    ("sort dropped", ".sort((a, b) => a.startTime - b.startTime)", ""),
    ("sort reversed", ".sort((a, b) => a.startTime - b.startTime)", ".sort((a, b) => b.startTime - a.startTime)"),
    ("cursor ignores duration", "cursor = clip.startTime + clip.duration;", "cursor = clip.startTime;"),
    ("concat n off by one", "concat=n=${labels.length}", "concat=n=${labels.length + 1}"),
    ("concat v/a swapped", "concat=n=${labels.length}:v=1:a=1", "concat=n=${labels.length}:v=1:a=0"),
    ("one input shared per file", "inputs.push(clip.params.src);", "if (!inputs.includes(clip.params.src)) inputs.push(clip.params.src);"),
    ("overlay not reported", "for (const t of [...(tracks.overlay ?? []), ...(tracks.audio ?? [])])", "for (const t of [])"),
    ("non-video main element not reported", "ignored.push({ trackId: tracks.main.id,", "void ({ trackId: tracks.main.id,"),
    ("src check dropped", "checkSrc(clip.params?.src);", ""),
    ("src newline allowed", "[\\0\\r\\n]", "[\\0]"),
    ("duration min 0", "requireInt(`${clip.id}.duration`, clip.duration, { min: 1 })", "requireInt(`${clip.id}.duration`, clip.duration, { min: 0 })"),
    ("odd size allowed", "(k !== \"fps\" && v % 2)", "false"),
    ("sourceDuration check dropped", 'typeof clip.sourceDuration === "number" &&', "false &&"),
    ("sourceDuration slack removed", "+ Math.ceil(rate) + 1)", "+ 0)"),
    ("rate not clamped", "clampRetimeRate({ rate: clip.retime?.rate ?? 1 })", "(clip.retime?.rate ?? 1)"),
    ("durationTicks wrong", "durationTicks: cursor", "durationTicks: cursor - 1"),
    ("audio maps swapped", 'audio: "[aout]"', 'audio: "[vout]"'),
]

def run_tests(d):
    r = subprocess.run(["node", "--test", "plan.test.mjs"], cwd=os.path.join(d, "render"), capture_output=True, text=True)
    return r.returncode == 0

def main():
    results = []
    base = open(os.path.join(SRC, "render/plan.mjs")).read()
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copytree(os.path.join(SRC, "render"), os.path.join(tmp, "render"))
        shutil.copytree(os.path.join(SRC, "port"), os.path.join(tmp, "port"))
        assert run_tests(tmp), "baseline must pass"
        for name, old, new in MUTANTS:
            n = base.count(old)
            if n != 1:
                results.append({"mutant": name, "status": f"BAD ANCHOR (matches {n})"})
                continue
            open(os.path.join(tmp, "render/plan.mjs"), "w").write(base.replace(old, new))
            results.append({"mutant": name, "status": "survived" if run_tests(tmp) else "killed"})
        open(os.path.join(tmp, "render/plan.mjs"), "w").write(base)
    killed = sum(r["status"] == "killed" for r in results)
    for r in results:
        if r["status"] != "killed":
            print(r)
    print(f"killed {killed}/{len(results)}")
    out = os.environ.get("OUT")
    if out:
        json.dump(results, open(os.path.join(out, "mutation-plan.json"), "w"), indent=1)

main()
