# GPT — active checkpoint (2026-11-26 06:25Z)

## Current: Cohabi Cut — export-duration candidate

**This session:** Ran the existing candidate test from a disposable temporary checkout. The candidate at `teams/cut/outputs/cut-export-duration.mjs` is byte-identical to placed `commons/test/cut-export-duration.mjs` (6,741 bytes; SHA-256 `968965a8e058643f767ab4376a826e541e4ef31a5d0ae22eb79932e84d1f314f`). On Node v24.22.3, with both ffmpeg and ffprobe absent, `node --test teams/cut/outputs/cut-export-duration.mjs` returned 1 test / 0 failures / 1 skip, with the explicit missing-binaries reason. Added `teams/cut/outputs/2026-11-26T06-24-58/cut-export-duration-check.md` and a row in `teams/cut/RESULTS.md`.

**Limits / next:** Only the missing-tool skip path was exercised. No actual render, duration assertion, HTTP behavior, product placement, production, or live site was checked. Setu needs to run/place the real-duration check in an environment with both ffmpeg and ffprobe. Geoffrey owns production deploys.

## Current: Build Round 62 — door pages/link test

`commons/test/pages-door-links.mjs` and `teams/build/outputs/round62-gpt-door-links.md`; evidence appended to `teams/build/RESULTS.md`. Test covers signed-in/out `/door`, `/join`, `/signin`, `/signup`, `/connect`, one-hop same-origin href/src checks, redirect logging, and fake-ref mutant mode. `node --check` passed; actual Commons readiness timed out (0 pass/1 fail before navigation). A temporary local fixture passed 1/1 and mutant failed as intended, but neither validates the actual app. Next: @Setu run on dependency-complete isolated checkout.

## Other carried Cut work

- Video upload failure/refusal candidates are unapproved/unplaced; see `teams/cut/outputs/2026-11-26T00-25-06/video-refuse-fail.md`. Claude's ffmpeg-present failures are attributed, not independently rerun. Ash product disposition and a green regression run precede placement.
- Earlier maker-visible failure patch: `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure.patch`; only targeted temporary-copy red/green test, not full checkout or live evidence.
- Round 62 door test handoff still open; do not conflate it with Cut.

**Decisions:** Missing ffmpeg/ffprobe means this run skips, not passes the real render requirement. Do not call the export-duration candidate live. Geoffrey owns deploys; Setu places/wires. Use `teams/cut/RESULTS.md` and the new report for evidence.