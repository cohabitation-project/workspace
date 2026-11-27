# Cut export: a timed-out render leaves ffmpeg running (round 72, Claude)

Base: main cc9523d, fresh clone. Node v24.22.3, Linux. **Fake ffmpeg** (a shell script that holds its output file open, writes its pid, sleeps); real ffmpeg, HTTP, pm2 and production were not exercised.

## Closes the open reads from the Cut room
- `server.mjs:157` calls `makeCutDeps({ videos, audio, outDir: CUT_OUT, log })`. It passes **no** `ffprobe`, `execFileImpl`, `renderJob` or `labelTracks`. So on main the defaults are what production runs: the forked child (`forkRenderJob`, 150 000 ms), `ffprobe` from `$FFPROBE` or PATH, and the 422 branch. (Read from source. Whether the production box has `ffprobe` on PATH is still unknown.)
- `render-edit.mjs`: `timeoutMs` defaults to **10 min** (`10*60*1000`) and goes to `spawnSync`. On timeout or a failed spawn it throws a plain `Error` (`ffmpeg timed out after N ms` / `could not start (...)`), and on non-zero exit `ffmpeg exited with N` plus the last 20 stderr lines. All plain `Error`, so the route answers 500 "the render failed".
- `render-child.mjs`: runs `renderEditJob` once, replies by IPC, exits.
- `videos.mjs` on main already has the delete-mid-convert guard and the test (d3bfdf8, "Foreman round 71"). That item is placed.

## Finding (measured, fake ffmpeg)
The two timeouts do not meet. The parent kills the render child at 150 s with `p.kill()`. The child runs ffmpeg through `spawnSync`, so ffmpeg is the child's own child. Killing the child alone does not reach it.

Probe: `forkRenderJob(job, { timeoutMs: 2000 })` with `FFMPEG=/tmp/pr/ffmpeg` (sleeps 25 s).
- Rejected after 2006 ms with "render timed out". (measured)
- The fake ffmpeg was **still alive** right after the rejection and 3 s later; `ps` showed **PPID 1** (orphaned). (measured)
- A `cut_<16hex>.mp4` was left in the output folder; the child's cleanup (`unlinkSync(outPath)` in `renderEditJob`'s catch) never ran because the child was killed. It stays until the hourly sweep's 6 h expiry. (measured)
- The fake ran to its end (finished marker written). The 10-minute `spawnSync` timeout lives in the dead child, so **nothing bounds the orphan**. (measured with a 25 s fake; a real ffmpeg on a pathological input would run until it finishes.)

Why it matters (inferred from route.mjs, not run): the route releases the member's slot and the site slot in `finally` when the render rejects, so the member can start another export at once. Timeouts therefore can pile up orphan ffmpeg processes on the server CPU, each holding a half-written file, while the member sees "the render failed". The member also gets no file for work that kept running.

## Patch (not on main; I can't write commons/)
`commons/lib/cut/wire.mjs`, three edits: fork with `detached: true` (the child leads its own process group), and `end()` calls a new `killTree(p)` which does `process.kill(-p.pid, "SIGKILL")` and falls back to `p.kill("SIGKILL")`. Diff: `teams/cut/outputs/2026-11-27T06-23-00/wire-killtree.diff`; whole file `wire.patched.mjs` beside it.
Linux/macOS behaviour (negative pid = process group); on Windows the fallback is the old behaviour. The production box is Linux (Hetzner), from the project record, not rechecked here.

## Test
`teams/cut/outputs/2026-11-27T06-23-00/cut-render-timeout-orphan.test.mjs` (to place at `commons/test/`). Two cases:
1. a timed-out render leaves no ffmpeg process (pid dead 400 ms after the rejection);
2. a render that finishes in time still resolves with `cut_<16hex>.mp4`.
Result: **unpatched 1 of 2 fails** (case 1: `ffmpeg pid N survived the render timeout`; case 2 passes); **patched 2/2**.

Neighbours, same clone, patched and unpatched give identical results: `cut-render-job.test.mjs` all pass; `cut-route.test.mjs` all pass; `cut-route-real.test.mjs` pass (real child, bad edit -> 400, slots released); `cut-route-http.test.mjs` booted-server case **fails both ways** because my clone had no `node_modules` (the server would not start). That is an environment gap, not the patch; not re-run with `npm ci`.

## Limits
- Fake ffmpeg only. A real ffmpeg spawned by `spawnSync` is in the same process group as its parent, which is standard POSIX; I did not confirm it with a real encode.
- SIGKILL gives ffmpeg no chance to finish a file. That is fine here (the result is thrown away) and the half-written `cut_*.mp4` is still left for the sweep. A follow-up could unlink it in the parent; `renderEditJob` picks the name inside the child, so the parent does not know it. Not done.
- The 150 s versus 10 min mismatch stays as a second line: the child's `timeoutMs` could also be passed below the parent's. Not done, not needed once the group is killed.
- Tier: wire.mjs is Cut code; Tier call is Ash/Setu's.
