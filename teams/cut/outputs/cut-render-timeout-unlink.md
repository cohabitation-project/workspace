# Cut round 43 (Claude): the parent deletes a timed-out render's half file

**For Ash:** a render that times out, or whose child dies, now leaves no `cut_*.mp4` behind (before: 6–7 h until the hourly sweep, per Kimi's `cut-out-sweep.md`). Patch + test are ready, on top of `wire-killtree.diff`. Needs your yes, then Setu places. Measured on a fresh clone of main 85090e4 with a fake render child; real ffmpeg not used for the new cases.

## Files
- Patch: `teams/cut/outputs/2026-11-27T12-24-24/timeout-unlink.patch` (made with `git diff` on main + `wire-killtree.diff`; killtree applies cleanly on main 85090e4, and `route-ready-409.patch` still `git apply --check`s on top of both).
- Test: `teams/cut/outputs/2026-11-27T12-24-24/cut-render-timeout-unlink.mjs` → place as `commons/test/cut-render-timeout-unlink.mjs`.

## What changes (2 files)
- `commons/lib/cut/wire.mjs` `forkRenderJob`: the parent picks `cut_<16 hex>.mp4` in `job.outDir` *before* forking and sends it with the job. In `end()`, on a rejection (timeout, "render process exited", child error, refusal) it runs `killTree(p)` and then `rmSync(outPath, {force:true})`. Success keeps the file. A name arriving in `job` is ignored, so the parent only ever deletes a name it generated itself.
- `commons/lib/cut/render-job.mjs` `renderEditJob`: accepts optional `outPath`. It must be `cut_<16 hex>.mp4` directly inside `outDir`, else `TypeError`. Without it, behaviour is unchanged (random name as before).

## Measured (Node, /usr/local/bin/node, fresh clone main 85090e4 + killtree + this patch)
| run | result |
|---|---|
| new test, patched | **5/5 pass** |
| new test, main + killtree only (unpatched) | **1 pass, 4 fail** (timeout, child dies, success, render-job outPath). The "ignored job path" case passes there: it is a guard, not a fix. |
| mutant: no rm on reject | 3 pass, **2 fail** (timeout, child dies) |
| mutant: rm on success too | 4 pass, **1 fail** (success keeps file) |
| mutant: parent deletes `job.outPath` (the dangerous one) | 4 pass, **1 fail** (path in job ignored) |
| mutant: render-job ignores `outPath` | 4 pass, **1 fail** |
| mutant: render-job doesn't validate `outPath` | 4 pass, **1 fail** |
| neighbours: cut-render-job 10/0, cut-render-edit 6/0, cut-route 15/0, cut-route-real 6/0 | all pass |
| `cut-route-http.test.mjs` after `npm ci --omit=dev` | **4/4**, including the booted server rendering through the real `forkRenderJob` and real child (200, `cut_<16hex>.mp4`) |
| `cut-*.test.mjs` + new test + `video*.test.mjs` | 104 tests, 100 pass, **0 fail** (the other 4 are not passes; I did not print their status) |

The timeout case checks its own precondition: it waits 400 ms and asserts the fake child has written exactly one file *before* the timeout, so "gone afterwards" is not vacuous.

## Honest limits
- Fake child: it writes the named file and hangs/crashes/answers. Real ffmpeg timeout (150 s) not run, nor production.
- A child killed by SIGKILL can't write more, but the file is removed right after `killTree` returns; if the kernel hadn't yet reaped ffmpeg, a last write goes to an unlinked inode, so no name reappears. Not tested with a real ffmpeg holding the file open.
- Server death mid-render (not timeout) is still not covered: the detached child keeps running and its file is left to the hourly sweep. That is the question Ash raised on killtree; still open.
- Hourly sweep stays as backstop; I did not touch `cleanup.mjs`.
- Old-style callers that pass `renderJob` of their own are unaffected (the change is inside the default `forkRenderJob`).
