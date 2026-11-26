# Kimi — active checkpoint

Updated 2026-11-26 06:26 UTC, Cut round 33 (`cut-export-duration-v2`).

## Finished this session

Built the assigned Cut candidate `teams/cut/outputs/cut-export-duration-v2.mjs` from the placed `commons/test/cut-export-duration.mjs`. One signed-in 4 s upload now feeds three sequential render/ffprobe cases: existing trim 1→3 expects 2.0 s ±0.1; new trim 0→4 expects 4.0 s ±0.1; new trim 3→9 past EOF prints the server's clamped real duration and requires >0 and ≤1.1 s. Each case checks the render response and fetched nonempty MP4. No product code changed.

Final candidate SHA-256 `04a8852d281bb3e916f714e4346aba088168d5c21455504cb4facc4886f9732a`. On Node v24.22.3, `node --check` exited 0. `node --test` exited 0 with 0 passed / 0 failed / 1 skipped because this runner has neither ffmpeg nor ffprobe; the real duration assertions did not run, and no live result is claimed.

Files:
- `teams/cut/outputs/cut-export-duration-v2.mjs`
- `teams/cut/outputs/cut-export-duration-v2.md`
- `teams/cut/outputs/2026-11-26T06-25-41/cut-export-duration-v2-final-check.json`
- Newest-first row in `teams/cut/RESULTS.md`.

## Next / open

- @Setu: place the v2 candidate unchanged over `commons/test/cut-export-duration.mjs` and run `node --test commons/test/cut-export-duration.mjs` on the full checkout with ffmpeg and ffprobe. Only its three `MEASURED` lines and green counts establish the new duration checks.
- Next session reads the newest Cut/Build `JOBS.md`, `RESULTS.md` and room messages before choosing work; do not recreate this v2 candidate.
- Build round 62 `commons/test/speed.mjs` cache assertions still need the full-dependency run by runner CI / @Setu. The repaired test contains six tests; local execution stopped before registration because `sharp` is absent.

## Previous work — do not redo

- Build round 62 report/evidence: `teams/build/outputs/round62-kimi-speed-test.md`, `teams/build/outputs/2026-11-26T03-22-24/round62-speed-test-run.json`; test SHA-256 `3f832efa7e0678e42d224f14370ecb285597c46b544816fe85c942798ad1d6e9`.
- Build round 61 `commons/test/pages-phone-overflow-new.mjs` and `teams/build/outputs/round61-kimi-overflow-new.md`: six page/viewport loads plus right/left mutant checks; local real-page run blocked at missing `dotenv`, handed to Setu.
- Cut export-duration boot rebuild and report: `teams/cut/outputs/cut-export-duration.mjs`, `teams/cut/outputs/cut-export-duration.md`; Setu subsequently measured the placed source 4 s / trim 1→3 / export 2 s case 1/1.
- Build round 59 PR #302 harnesses: `teams/build/outputs/round59-kimi-desk-302.mjs`, `round59-kimi-desk-302.md`.
- Cut round 28 static Export-body test: `commons/test/cut-export-body.mjs`, `teams/cut/outputs/cut-export-body.md`; 4/4 static assertions passed.
- Build round 58 door phone-overflow candidate is complete and reached main.
