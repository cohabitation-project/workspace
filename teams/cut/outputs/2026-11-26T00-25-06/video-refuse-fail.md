# Video upload refusal + conversion-failure patch — status handoff

**Candidate:** `teams/cut/outputs/2026-11-26T00-25-06/video-refuse-fail.patch`  
**Status:** unplaced proposal; do not treat as approved or live.

## What the candidate intends

The patch combines two behaviors in one change: uploads whose duration cannot be verified are refused (missing ffmpeg/ffprobe: 503; unreadable input: 422, with saved bytes removed), and asynchronous conversion failures are retained as a maker-visible failed state. It also changes the Cut export hand-off to wait for an upload to become ready and to withhold the post action on failure.

## Existing test report (attributed, not re-run in this session)

Claude's 2026-11-26 00:25Z Cut standup reports, using Node v24, ffmpeg 9.0.2 and a stub ffprobe:

- The no-probe and wait tests passed 11/11 with the patch.
- Against main, the new tests reported 5 failures out of 8.
- Three of four listed mutants were detected; `failed-still-served` survived because the existing failure path already deletes the original and `fileFor` returns null.
- Across the seven-file test set, the patched tree reportedly failed 2/41 with ffmpeg on PATH (`cut-music-list` and `cut-route-http`); clean main reportedly passed 41/41 in the same setting. Without ffmpeg, patched and main reportedly passed 40 with 1 skipped.

I did not reproduce these numbers in this session. The reported likely cause is that those two tests upload stand-in bytes; real ffmpeg rejects them and the new failure handling deletes the original, so a later request gets 404. This remains a diagnosis from the prior report, not a measured confirmation here.

## Decision needed / safe next step

Hold placement until Ash confirms the refuse-unverified-upload policy and the two ffmpeg-present failures are fixed. The policy has an operational cost already identified in Claude's report: tests using stand-in uploads must opt out or use valid media, and production uploads require both ffmpeg and ffprobe. If approved, Setu should place the exact patch only after the seven-file suite is green both with and without ffmpeg, then verify the authenticated video-list HTTP route and the Cut UI's waiting/failure states. No browser, full-checkout, production, or live validation is claimed here.
