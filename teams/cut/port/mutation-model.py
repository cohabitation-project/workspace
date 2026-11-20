# Mutation pass 2 for the Cut timeline port: model.mjs only. Run: python3 teams/cut/port/mutation-model.py
# One exact-string mutant per run of `node --test cut-timeline.test.mjs` in a temp copy of teams/cut/port.
# killed = a test failed (good). SURVIVED = all tests passed (a hole, or an equivalent mutant).
import os, shutil, subprocess, sys, json
src = os.path.dirname(os.path.abspath(__file__))
M = [
("model.mjs","if (!TRACK_TYPES.includes(type)) throw new Error(`unknown track type: ${type}`);","","track type unchecked"),
("model.mjs","if (!TRACK_TYPES.includes(type)) throw new Error(`unknown element type: ${type}`);","","element type unchecked"),
("model.mjs","if (!Number.isInteger(v)) throw new Error(`${k} must be integer ticks, got ${v}`);","","non-integer ticks accepted"),
("model.mjs","return element.type === \"video\" || element.type === \"audio\";","return element.type === \"video\";","audio not retimable"),
("model.mjs","return element.type === \"video\" || element.type === \"audio\";","return true;","everything retimable"),
("model.mjs","return [...tracks.overlay, tracks.main, ...tracks.audio];","return [tracks.main, ...tracks.overlay, ...tracks.audio];","getAllTracks order changed"),
("model.mjs","for (const e of track.elements) end = Math.max(end, e.startTime + e.duration);","for (const e of track.elements) end = Math.max(end, e.startTime);","timeline end ignores duration"),
("model.mjs","if (!animations) return { leftAnimations: undefined, rightAnimations: undefined };","","split animations: undefined not guarded"),
("model.mjs","shouldIncludeSplitBoundary ? k.time <= splitTime : k.time < splitTime","shouldIncludeSplitBoundary ? k.time < splitTime : k.time < splitTime","left boundary key dropped"),
("model.mjs","(shouldIncludeSplitBoundary ? k.time >= splitTime : k.time > splitTime)","(shouldIncludeSplitBoundary ? k.time > splitTime : k.time > splitTime)","right boundary key dropped"),
("model.mjs",".map((k) => ({ ...k, time: k.time - splitTime }));",".map((k) => ({ ...k }));","right keys not rebased"),
("model.mjs","out[channel] = keys.filter((k) => k.time >= 0 && k.time <= duration);","out[channel] = keys.filter((k) => k.time >= 0);","clamp keeps keys past duration"),
("model.mjs","out[channel] = keys.filter((k) => k.time >= 0 && k.time <= duration);","out[channel] = keys.filter((k) => k.time <= duration);","clamp keeps negative keys"),
("model.mjs","out[channel] = keys.filter((k) => k.time >= 0 && k.time <= duration);","out[channel] = keys.filter((k) => k.time >= 0 && k.time < duration);","clamp drops key exactly at duration"),
("model.mjs","if (getMainScene(scenes)) return scenes;","","ensureMainScene always adds"),
("model.mjs","return [createScene({ name: \"Main scene\", isMain: true }), ...scenes];","return [...scenes, createScene({ name: \"Main scene\", isMain: true })];","main scene appended not prepended"),
("model.mjs","if (!scene) return scenes;","","deleteScene unknown id not tolerated"),
("model.mjs","if (scene.isMain) throw new Error(\"the main scene cannot be deleted\");","","main scene deletable"),
("model.mjs","if (!(\"retime\" in patch) || !isRetimableElement(element)) return { element };","if (!(\"retime\" in patch)) return { element };","retime applied to non-retimable"),
("model.mjs","? { ...patch.retime, rate: clampRetimeRate({ rate: patch.retime.rate }) }","? { ...patch.retime }","patched retime rate not clamped"),
("model.mjs","const visible = Math.max(0, sourceDurationOf(originalElement) - element.trimStart - element.trimEnd);","const visible = sourceDurationOf(originalElement) - element.trimStart - element.trimEnd;","visible span not floored at 0"),
("model.mjs","if (typeof element.sourceDuration === \"number\") return element.sourceDuration;","","stored sourceDuration ignored"),
("model.mjs","return element.trimStart + element.trimEnd + visible;","return visible;","inferred source length drops trims"),
("model.mjs","const requested = Math.max(ZERO_MEDIA_TIME, element.startTime);","const requested = element.startTime;","negative startTime allowed"),
("model.mjs","if (context.trackId !== context.tracks.main.id) {","if (false) {","main-track rule applied to all tracks"),
("model.mjs","if (c.id === element.id) continue;","","moving element compared with itself"),
("model.mjs","if (!earliest || c.startTime < earliest.startTime) earliest = c;","if (!earliest || c.startTime > earliest.startTime) earliest = c;","earliest = latest"),
("model.mjs","requested <= earliest.startTime ? ZERO_MEDIA_TIME : requested","requested < earliest.startTime ? ZERO_MEDIA_TIME : requested","tie with earliest does not snap to 0"),
("model.mjs","triggers: [\"duration\"],","triggers: [\"startTime\"],","duration enforce rule never triggers on duration"),
("model.mjs","params: { ...element.params, ...(patch.params ?? {}) }","params: { ...(patch.params ?? element.params) }","params replaced not merged"),
("model.mjs","for (const f of result.changedFields ?? []) changed.add(f);","","derived fields not fed to enforce rules"),
("model.mjs","const minDelta = -Math.floor(element.trimStart / rate); // can only un-trim what was trimmed","const minDelta = -Infinity; // can only un-trim what was trimmed","start trim: can un-trim past zero (delta bound)"),
("model.mjs","const sourceDelta = Math.max(-element.trimStart, roundMediaTime({ time: d * rate }));","const sourceDelta = roundMediaTime({ time: d * rate });","start trim: source delta not floored"),
("model.mjs","const sourceDelta = Math.max(-element.trimEnd, roundMediaTime({ time: d * rate }));","const sourceDelta = roundMediaTime({ time: d * rate });","end trim: source delta not floored"),
("model.mjs","const minDelta = -Math.floor(element.trimEnd / rate);","const minDelta = -Infinity;","end trim: can un-trim past zero (delta bound)"),
("model.mjs","const d = Math.min(Math.max(delta, minDelta), element.duration - 1);\n\t\tconst sourceDelta = Math.max(-element.trimStart","const d = Math.max(delta, minDelta);\n\t\tconst sourceDelta = Math.max(-element.trimStart","start trim: can shrink to <=0 length"),
("model.mjs","return { ...element, startTime: element.startTime + d, duration: element.duration - d, trimStart: element.trimStart + sourceDelta };","return { ...element, startTime: element.startTime, duration: element.duration - d, trimStart: element.trimStart + sourceDelta };","start trim: startTime not moved"),
("model.mjs","return { ...element, duration: element.duration - d, trimEnd: element.trimEnd + sourceDelta };","return { ...element, duration: element.duration - d, trimEnd: element.trimEnd };","end trim: trimEnd not advanced"),
("model.mjs","if (!Number.isInteger(delta)) throw new Error(\"delta must be integer ticks\");","","trim: non-integer delta accepted"),
("model.mjs","throw new Error(\"side must be start or end\");","return element;","trim: bad side silently ignored"),
("model.mjs","const rate = clampRetimeRate({ rate: element.retime?.rate ?? 1 });","const rate = 1;","trim ignores retime rate"),
]
def run(d):
    r = subprocess.run(["node","--test","cut-timeline.test.mjs","cut-model.test.mjs"],capture_output=True,text=True,cwd=d,timeout=60)
    return r.returncode == 0
if not run(src):
    print("BASELINE FAILS: fix the suite before judging mutants"); sys.exit(1)
res = []
for i,(f,old,new,desc) in enumerate(M):
    d = f"/tmp/cutmm{i}"; shutil.rmtree(d, ignore_errors=True); shutil.copytree(src, d)
    t = open(os.path.join(d,f)).read()
    if t.count(old) != 1:
        res.append((desc,f,f"NOT-APPLIED (count {t.count(old)})")); continue
    open(os.path.join(d,f),"w").write(t.replace(old,new))
    res.append((desc,f,"SURVIVED" if run(d) else "killed"))
for r in res: print(r)
k = sum(1 for r in res if r[2]=="killed"); n = sum(1 for r in res if r[2].startswith("NOT"))
print(f"{k}/{len(res)} killed; not applied: {n}; non-killed:", [r[0] for r in res if r[2]!="killed"])
out = os.environ.get("OUT")
if out: json.dump(res, open(os.path.join(out,"mutation-model.json"),"w"), indent=1)
