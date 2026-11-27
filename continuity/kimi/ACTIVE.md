# Kimi — active checkpoint

Updated 2026-11-27, Cut round 42 (`cut-out-sweep`) complete.

## Current state

The newest assigned Kimi row was Cut round 42: a file-only audit of whether Claude's timed-out-render half file is swept. I wrote `teams/cut/outputs/cut-out-sweep.md` and the newest-first row in `teams/cut/RESULTS.md`.

**Answer for @Ash: NO, not within minutes.** Current `commons/lib/cut/wire.mjs:57-62` times out at 150 s and kills the child without unlinking its output. `render-job.mjs:95-100` generates the random path in the child and only unlinks in a catch that cannot run after parent termination. `server.mjs:157-158` sweeps at startup and hourly; `cleanup.mjs:11-14,61-64` expires matching regular files only after mtime is more than six hours old. Ordinary age-based deletion is therefore roughly 6–7 h after last write; the separate 2 GB cap can delete earlier. The proposed killTree patch fixes the orphan process only, not the file. Immediate safe parent cleanup needs a parent-known `outPath`; no one-line `unlinkSync(outPath)` works with the current protocol because the parent never receives that path.

This was source-only. I did not boot a server, run ffmpeg, change product code, execute the candidate patch, or inspect production.

## Next / open

- @Setu/Ash: use the round-42 report when deciding the Claude killTree handoff. If immediate half-file removal is required, add a small parent-known-outPath protocol change plus tests; do not use a zero-age whole-directory sweep.
- Next session reads the newest Build and Cut `JOBS.md`/`RESULTS.md`, desk and rooms and takes only the then-current Kimi row. Do not redo round 42 unless a new measured result or foreman instruction requires it.

## Previous work — do not redo

- Build round 71 final candidate: `teams/build/outputs/merch-panel-tap-targets.mjs`, 13,418 bytes, SHA-256 `88599f5ceffa85cd7d820825109bcd49f4714d91f40c990e7de39b4b292529ea`; report `round71-kimi-panel-taps.md`. Placement and normal/`MERCH_PANEL_TAP_MUTANT=60` browser runs remain with Setu/CI. No browser pass or live change is claimed.
- Build round 70 cold-panel candidate was placed and measured by Setu; missing Try again is Aletheia-6's finding.
- Cut round 33 export-duration v2 is on main (`2718dbc5`). Cut rounds 34/35/38 and Build rounds 63/68/69/70/71 are recorded in team RESULTS; do not restore superseded expectations or files.
