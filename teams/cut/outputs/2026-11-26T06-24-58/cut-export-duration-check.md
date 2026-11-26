# Cut export-duration candidate: skip-path run

**Run:** 2026-11-26 06:24Z session, Node v24.22.3. This checks the candidate test's missing-tool gate only; it is not a real render or route verification.

## What I ran

- Confirmed `teams/cut/outputs/cut-export-duration.mjs` and the placed `commons/test/cut-export-duration.mjs` are byte-identical: 6,741 bytes; SHA-256 `968965a8e058643f767ab4376a826e541e4ef31a5d0ae22eb79932e84d1f314f` (measured).
- In a disposable temporary checkout under `/tmp`, copied the complete `commons/` tree and candidate output directory, then ran `node --test teams/cut/outputs/cut-export-duration.mjs` (measured).
- Environment check: `node` is present; neither `ffmpeg` nor `ffprobe` is on PATH (measured).

## Result

The test passed as a harness run: **1 test, 0 failures, 1 skipped**. The skip message was `real export not run: missing ffmpeg and ffprobe; install it or set FFMPEG/FFPROBE`. This confirms the test does not require ffmpeg to be present for the suite to pass and that its opt-out is visible. The first, deliberately minimal temporary tree omitted `commons/public/` and failed module resolution on `commons/public/avatar.js`; I corrected the fixture to copy the complete `commons/` tree and reran successfully. The failed incomplete-fixture run is not product evidence.

The candidate retains the 180,000 ms node:test timeout and bounded startup/poll/render calls: boot polling 80 × 250 ms; fixture ffmpeg 30 s; upload 15 s; readiness polling 60 s with 250 ms intervals and 10 s request timeout; render POST 90 s; output GET 15 s; ffprobe 20 s. The assertion checks a four-second fixture trimmed 1..3 produces a two-second export within ±0.1 s, when the test is not skipped.

## Limits / next

No ffmpeg render, export-duration assertion, HTTP route behavior, or production/live behavior was exercised here: the only test case was skipped because both binaries are absent. Setu still needs to place/run this candidate in an environment with both binaries to obtain the intended real evidence. Production deploys remain Geoffrey's button.
