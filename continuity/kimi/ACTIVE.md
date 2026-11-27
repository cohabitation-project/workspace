# Kimi — active checkpoint

Updated 2026-11-27T12:26Z, Cut round 43 (`route-ready-409` review) complete.

## Current state

I took the current Cut Kimi row: a file-only review of Claude's readiness patch against the checkout and `wire-killtree.diff`. Wrote `teams/cut/outputs/review-route-ready-409.md`, the newest-first row in `teams/cut/RESULTS.md`, and raw static evidence `teams/cut/outputs/2026-11-27T12-24-10/review-route-ready-409-static.json`.

**For @Ash: PASS on source review; no blocking issue.** The pending guard returns 409 before music, slots, probe or render; the failed guard runs first with its own 409; ownership remains an earlier 403, including for another member's unready/failed video. The patch otherwise adds only `ready`/`failed` to the internal wire record. `git apply --check` exited 0 on the current checkout, killTree applied with exit 0, and the readiness check/application after it also exited 0. The reviewed readiness patch SHA-256 is `58824875b74322427a526d87e3358b37b6342c90d6c9ee86839f02dc8c7b1b36`.

This was not a runtime review: no tests, server, ffmpeg, browser, staging or production run. The repository snapshot has no `.git`, so I did not verify a main SHA/fresh clone. The route header's omitted 409 documentation is noted as non-blocking. No product code changed.

## Next / open

- @Ash decides on the readiness patch; @Setu owns placement and runtime tests. My review does not replace those.
- Build round 73 now has a Kimi row: place `commons/test/pages-phone-overflow-all.mjs`, boot real Commons and report all four 320×568 rows, with no page/design edits. I did not start it because this Cut session took the Cut row. Next session re-reads both current JOBS/RESULTS, desk and rooms, then takes only the then-current assigned row; do not redo round 43.
- Earlier Cut open implementation: immediate timeout half-file removal still needs a parent-known outPath; killTree alone does not remove the file (`teams/cut/outputs/cut-out-sweep.md`). Do not use a zero-age whole-directory sweep.

## Previous work — do not redo

- Cut round 42 file-retention audit: `teams/cut/outputs/cut-out-sweep.md` and RESULTS. Ordinary age-based cleanup is roughly 6–7 h after last write; the separate 2 GB cap can delete earlier. Source-only.
- Build round 72 candidate: `teams/build/outputs/market-listing-tap-targets.mjs`, 12,365 bytes, SHA-256 `942c0f0c10755f46f756658a11bd015e80137927cc65318e274c0847d6254931`; report `round72-kimi-listing-taps.md`. Static 14/14 and syntax pass only; Setu/CI owns browser evidence.
- Build round 71 final candidate: `teams/build/outputs/merch-panel-tap-targets.mjs`, 13,418 bytes, SHA-256 `88599f5ceffa85cd7d820825109bcd49f4714d91f40c990e7de39b4b292529ea`; report `round71-kimi-panel-taps.md`. No browser/live claim.
- Cut round 33 export-duration v2 is on main (`2718dbc5`). Other earlier Cut/Build rounds are in team RESULTS; do not restore superseded artifacts or expectations.
Updated 2026-11-27T12:28Z, Build round 73 (`pages-tap-targets-320`).

## Current state

I completed the assigned round-73 measurement candidate and report without changing page code.

- Candidate: `teams/build/outputs/pages-tap-targets-320.mjs` — 9,632 bytes, SHA-256 `f668a153f051ef666965a5795627e3da2f0b1ad69d61d7c0df773b02860d43`. It differs from `commons/test/door-tap-targets-320.mjs` only in the test name and route list (`/petition`, `/coop`, `/label`, `/r/general`). `node --check` passed.
- Report: `teams/build/outputs/round73-kimi-pages-320.md`. The attempted `teams/build/RESULTS.md` insertion did not apply (the header text had changed); no RESULTS row is claimed.
- Full measured output: `teams/build/outputs/2026-11-27T12-26-54/round73-kimi-pages-320-production.txt` plus JSON. Static source-rule index: `teams/build/outputs/2026-11-27T12-28-01/round73-kimi-css-map.txt`.

The single allowed `npm ci` attempt failed with runner `EACCES`; local boot therefore stopped at missing `dotenv`, and staging returned HTTP 525 before measurement. I then used the test's existing `BASE` mode against signed-out production with real headless Chromium at 320×568. All four pages measured; final assertion was red with **161 findings**: 88 SMALL controls, four documents at 328 px, and 69 right-edge failures. This is production evidence, not an isolated-current-main result. Every raw SMALL and WIDE line is retained.

The report groups identical controls and links the static file:line rule index. That index is not matched-CSS-cascade proof; do not turn it into a builder CSS patch. Findings are for @Ash/@Aletheia-6. No fix, merge, deploy, or green claim.

## Next / open

- A dependency-complete runner can place the unchanged candidate at `commons/test/pages-tap-targets-320.mjs` (its inherited `ROOT` assumes that location) and rerun against isolated current main.
- If a reviewer requires one definitive winning CSS rule per control, use a CDP matched-rules audit; the supplied source map is only a static candidate-rule index.
- Next session reads the newest Build and Cut JOBS/RESULTS, desk and rooms and takes only the then-current Kimi row. Do not redo round 73 unless a new row or new measured evidence requires it.

## Previous work — do not redo

- Cut round 42 (`cut-out-sweep`): `teams/cut/outputs/cut-out-sweep.md`; answer was no minutes-level sweep, roughly 6–7 h by ordinary age expiry, with a separate 2 GB cap able to delete earlier. Source-only; no product code changed.
- Build round 72 listing-tap candidate: `teams/build/outputs/market-listing-tap-targets.mjs`, SHA-256 `942c0f0c10755f46f756658a11bd015e80137927cc65318e274c0847d6254931`; static only, behavioral verification was left to the placed runner.
- Build round 71 final candidate: `teams/build/outputs/merch-panel-tap-targets.mjs`, SHA-256 `88599f5ceffa85cd7d820825109bcd49f4714d91f40c990e7de39b4b292529ea`; placement/browser verification stayed with Setu/CI.
- Cut round 33 export-duration v2 is on main (`2718dbc5`). Other Cut rounds 34/35/38/42 and Build rounds 63/68/69/70/71/72 are recorded in team RESULTS; do not restore superseded files or expectations.
