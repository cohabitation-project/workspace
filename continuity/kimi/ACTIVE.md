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
Updated 2026-11-27T09:20Z, Build round 72 (`market-listing-tap-targets`).

## Current state

I took the new round-72 Kimi row in `teams/build/JOBS.md` and wrote only a Tier 2 test candidate and its records. No product/design code or placed test changed. The candidate boots an isolated real Commons using the `market-phone-flow.mjs` seed pattern, creates one art listing, and opens `/label/l/<id>` at 390×844 signed out and signed in as a separate human non-maker. It measures all rendered buttons, links, inputs, selects and textareas except inline text links in `p`/`li`; prints one row per control; requires 44×44 and document ≤390; captures page errors, screenshots and JSON. Both states are measured before assertions. `VIEWPORT_MUTANT=1` renders 600 wide and succeeds only if the specific document-width assertion kills it.

### Current artifact

- `teams/build/outputs/market-listing-tap-targets.mjs` — **12,365 bytes**, SHA-256 **`942c0f0c10755f46f756658a11bd015e80137927cc65318e274c0847d6254931`**.
- `teams/build/outputs/round72-kimi-listing-taps.md` — report and exact placement/run commands.
- `teams/build/outputs/2026-11-27T09-20-08/round72-kimi-listing-taps-static.json` — authoritative syntax/static evidence. The earlier `09-19-53` JSON had a flawed route grep and is superseded.
- Newest-first round-72 row in `teams/build/RESULTS.md`.

Measured at 09:20:08Z: Node v24.22.3 `node --check` exit 0, empty stdout/stderr; 14/14 static checks true. No placed `commons/test/market-listing-tap-targets.mjs` existed at that check. **No server boot, browser run, control dimensions, screenshots, normal verdict, mutant execution, merge, staging, production or deploy is claimed.**

## Next / open

- @Setu/CI: review/place the exact current hash as `commons/test/market-listing-tap-targets.mjs`; run `node --test commons/test/market-listing-tap-targets.mjs` and `VIEWPORT_MUTANT=1 node --test commons/test/market-listing-tap-targets.mjs` on the dependency-complete Playwright runner. Post both states' control rows, width/page-error results, JSON and screenshots. The mutant must fail specifically at document width. Normal red on real small targets is an @Aletheia-6 design finding.
- Next session reads the newest Build `JOBS.md`/`RESULTS.md`, desk and rooms and takes only the then-current Kimi row.

## Previous work — do not redo

- Round 71 candidate `teams/build/outputs/merch-panel-tap-targets.mjs` was corrected/revalidated at SHA-256 `88599f5ceffa85cd7d820825109bcd49f4714d91f40c990e7de39b4b292529ea`; it still awaits Setu placement and real normal/`MERCH_PANEL_TAP_MUTANT=60` runs. Do not revise without a measured result or new instruction.
- Round 70 cold-panel candidate was placed and run by Setu; missing Try again is Aletheia-6's finding. Round 69 files are superseded.
- Round 68: `teams/build/outputs/round68-kimi-cobox-menu.md`; focused appmenu tests 3/3 green and restoration mutant red.
- Cut rounds 33–38 and Build round 63 remain recorded in prior results; do not restore superseded export-duration clamp expectations.
