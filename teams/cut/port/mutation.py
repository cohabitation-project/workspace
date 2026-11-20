# Mutation pass for the Cut timeline port. Run:  python3 teams/cut/port/mutation.py
# For each mutant: copy teams/cut/port, replace ONE exact string, run `node --test`.
# killed = a test failed (good). SURVIVED = all tests passed (a hole, or an equivalent mutant).
import os, shutil, subprocess, sys, json
src = os.path.dirname(os.path.abspath(__file__))
M = [
("time.mjs","const magnitude = Math.round(Math.abs(time));","const magnitude = Math.floor(Math.abs(time));","round half away: floor"),
("time.mjs","export const DEFAULT_SNAP_THRESHOLD_PX = 10;","export const DEFAULT_SNAP_THRESHOLD_PX = 12;","snap threshold 12"),
("time.mjs","export const BASE_TIMELINE_PIXELS_PER_SECOND = 50;","export const BASE_TIMELINE_PIXELS_PER_SECOND = 40;","base px/s 40"),
("time.mjs","export const RETIME_RATE_MAX = 5;","export const RETIME_RATE_MAX = 4;","rate max 4"),
("time.mjs","export const RETIME_RATE_MIN = 0.01;","export const RETIME_RATE_MIN = 0.1;","rate min 0.1"),
("time.mjs","export const TIMELINE_ZOOM_MAX = 100;","export const TIMELINE_ZOOM_MAX = 50;","zoom max 50"),
("time.mjs","export const TIMELINE_ZOOM_MIN = 0.1;","export const TIMELINE_ZOOM_MIN = 0.2;","zoom min 0.2"),
("time.mjs","export const TICKS_PER_SECOND = 120000;","export const TICKS_PER_SECOND = 90000;","ticks/s 90000"),
("ops.mjs","const rightSource = subMediaTime({ a: totalSource, b: leftSource });","const rightSource = roundMediaTime({ time: getSourceSpanAtClipTime({ clipTime: rightVisible, retime }) });","right source rounded on its own (breaks invariant)"),
("ops.mjs","if (splitTime <= element.startTime || splitTime >= end) return [element];","if (splitTime < element.startTime || splitTime > end) return [element];","split at edge allowed"),
("ops.mjs","const rightTrimStart = addMediaTime({ a: element.trimStart, b: leftSource });","const rightTrimStart = element.trimStart;","right trimStart not advanced"),
("ops.mjs","const leftTrimEnd = addMediaTime({ a: element.trimEnd, b: rightSource });","const leftTrimEnd = element.trimEnd;","left trimEnd not extended"),
("ops.mjs","if (retainSide === \"left\") return [left];","if (retainSide === \"left\") return [left, right];","retainSide left ignored"),
("ops.mjs","shouldIncludeSplitBoundary: true","shouldIncludeSplitBoundary: false","split boundary key dropped"),
("ops.mjs","e.startTime >= afterTime ? { ...e, startTime: e.startTime - shiftAmount }","e.startTime > afterTime ? { ...e, startTime: e.startTime - shiftAmount }","ripple shift excludes element at gap end"),
("ops.mjs","for (const a of [...list].sort((x, y) => y.afterTime - x.afterTime))","for (const a of [...list].sort((x, y) => x.afterTime - y.afterTime))","ripple earliest gap first"),
("ops.mjs","if (!allAfterIds.has(id)) pushInterval(vacated, b.startTime, b.endTime);","pushInterval(vacated, b.startTime, b.endTime);","moved to other track counts as gap"),
("ops.mjs","if (b.endTime > a.endTime) pushInterval(vacated, a.endTime, b.endTime);","if (b.endTime !== a.endTime) pushInterval(vacated, a.endTime, b.endTime);","EQUIVALENT: lengthening pushes an empty interval that pushInterval drops"),
("ops.mjs","if (d <= threshold && d < bestDistance)","if (d < threshold && d < bestDistance)","snap strict < threshold"),
("ops.mjs","if (d <= threshold && d < bestDistance)","if (d <= threshold)","snap takes last in range, not nearest"),
("ops.mjs","if (excludeElementIds.includes(e.id)) continue;","","exclude ids ignored"),
("ops.mjs","a.snapDistance <= b.snapDistance","a.snapDistance > b.snapDistance","element snap picks farther edge"),
("ops.mjs","return { startTime: b.snappedTime - duration,","return { startTime: b.snappedTime,","end-edge snap offset by duration"),
]
def run(d):
    r = subprocess.run(["node","--test","cut-timeline.test.mjs"],capture_output=True,text=True,cwd=d,timeout=60)
    return r.returncode == 0
if not run(src):
    print("BASELINE FAILS: fix the suite before judging mutants"); sys.exit(1)
res = []
for i,(f,old,new,desc) in enumerate(M):
    d = f"/tmp/cutmut{i}"; shutil.rmtree(d, ignore_errors=True); shutil.copytree(src, d)
    t = open(os.path.join(d,f)).read()
    if t.count(old) != 1:
        res.append((desc,f,f"NOT-APPLIED (count {t.count(old)})")); continue
    open(os.path.join(d,f),"w").write(t.replace(old,new))
    res.append((desc,f,"SURVIVED" if run(d) else "killed"))
for r in res: print(r)
k = sum(1 for r in res if r[2]=="killed"); print(f"{k}/{len(res)} killed;", [r[0] for r in res if r[2]!="killed"])
out = os.environ.get("OUT")
if out: json.dump(res, open(os.path.join(out,"mutation.json"),"w"), indent=1)
