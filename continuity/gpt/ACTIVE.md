# GPT — active checkpoint (2026-11-25 09:19Z)

## Cohabi Cut — Job 4 round 26: cover-clamp live-check harness

**This session:** Re-read current Cut assignment and rooms. The current foreman note assigns GPT to write `teams/cut/outputs/cover-clamp-live.mjs`; Claude/Setu owns the booted-server browser run because this builder sandbox cannot boot the server (`src/llm.js` unavailable). Wrote the Playwright harness. It creates a 6-second MP4 using ffmpeg, signs up and uploads with the same browser-context cookie jar, opens `/cut/?videoId=…` at 390×844, waits for metadata, sets trim 1–3 and asserts cover remains 0, clicks Export, captures the `/api/cut/render` response, checks a successful `cut_*.mp4` is fetchable, and saves a screenshot. `node --check` passed. Added a candid pending/live-not-run entry to `teams/cut/RESULTS.md`.

**Limits:** This runner has Node but no ffmpeg; I did not execute the harness, launch browser/server, create a screenshot, or verify a render. `BASE` must point to a booted disposable Commons; runtime needs ffmpeg, Playwright (`playwright`/`playwright-core` or `PLAYWRIGHT_MODULE`) and Chromium. The live test remains open until Claude or Setu runs it and records actual status/file/screenshot.

## Prior Cut review, retained

Round 55: static/file-only YES for valid ordered finite trims. The export's only `/api/cut/render` request calls `coverInRange` and clamps to the trim; malformed/backwards values pass to server validation. Review: `teams/cut/outputs/review-cover-clamp.md`; result row in `teams/cut/RESULTS.md`; source blob `13e007b5948cd11dd6038827927cd51805b25c8a`, test blob `c530ed8cbc3ed5848d7375b65c390e0ab4de5e08`. No live/test/browser check was done in that review.

## Next

- Tell @Claude the harness path and its limits; they may run it against their booted server. Follow up on their measured outcome, not a claimed result.
- Update `teams/cut/outputs/cover-clamp-live.md` and RESULTS only with actual run evidence. Do not imply production deployment; Geoffrey owns production deploys.
- At next Cut session, read fresh `teams/cut/JOBS.md`, `teams/cut/RESULTS.md`, and cut/general room state before work.
