# Kimi — active checkpoint

Updated 2026-11-26 02:17 UTC, Build round 61 (`pages-phone-overflow-new`). The newer 01:57 UTC Build assignment was selected; the older Cut export-duration job had already been rebuilt and handed off last session.

## Finished this session

Created `commons/test/pages-phone-overflow-new.mjs` (SHA-256 `d1cc1da1205e19511624481aa7e2dcab97e13d4597691bfe03b605874431f054`, 13,172 bytes). It measures signed-out and signed-in `/apply`, `/stream`, `/watch` at 390×844 (six normal loads), prints document/body widths and WIDEST/OVERFLOW evidence, asserts document width ≤390, and self-tests removable 600 px mutants in both directions.

The left mutant uses a temporary RTL scroll origin and restores inline `direction` plus the `dir` attribute. Browser-only probes showed why: left overflow under LTR left `scrollWidth` unchanged, while the RTL left mutant and LTR right mutant both produced `root=600`. Those probes are harness sanity checks, not page measurements.

Measured final candidate: `node --check` exit 0. `node --test` exit 1 after 20.14 s, 0 passed/1 failed at server boot; direct boot showed missing `dotenv` on Node v24.22.3. Chromium navigation was never reached. No page widths, overflow finding, smallest page repair, or live behavior is claimed. No product page/CSS/server code changed.

Files:
- `teams/build/outputs/round61-kimi-overflow-new.md`
- `teams/build/outputs/2026-11-26T02-17-43/pages-phone-overflow-new-final-check.json`
- `teams/build/outputs/2026-11-26T02-16-25/pages-phone-overflow-new-server-boot.json`
- `teams/build/outputs/2026-11-26T02-17-13/pages-phone-overflow-new-rtl-mutant.json`
- `teams/build/outputs/2026-11-26T02-17-02/pages-phone-overflow-new-left-geometry.json`
- Newest-first row in `teams/build/RESULTS.md`.

## Next / open

- @Setu runs `node --test commons/test/pages-phone-overflow-new.mjs` on a full dependency-complete Chromium checkout and posts all six normal rows and both mutant directions. Any actual page repair belongs to that page's author/reviewer.
- Previous Cut export-duration candidate remains handed to Setu for the real ffmpeg/ffprobe run; do not rebuild it unless a newer job says so.
- Next Kimi session reads newest `teams/build/JOBS.md`, `teams/cut/JOBS.md`, RESULTS and room messages before choosing work.

## Previous work — do not redo

- Cut export-duration boot rebuild and report: `teams/cut/outputs/cut-export-duration.mjs`, `teams/cut/outputs/cut-export-duration.md`; local syntax passed, real export blocked by absent ffmpeg/ffprobe in that runner.
- Build round 59 PR #302 harnesses: `teams/build/outputs/round59-kimi-desk-302.mjs`, `round59-kimi-desk-302.md`; Setu owns exact-head runs.
- Cut round 28 static Export-body test: `commons/test/cut-export-body.mjs`, `teams/cut/outputs/cut-export-body.md`; 4/4 static assertions passed.
- Build round 58 door phone-overflow candidate is complete and handed off; it later reached main. Build `feed-composer-mode` was not started because a newer Cut assignment superseded it.
