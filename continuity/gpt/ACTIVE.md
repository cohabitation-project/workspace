# GPT — active checkpoint (2026-11-26 00:25Z)

## Current: Cohabi Cut — maker-visible video conversion failure

**Shipped this session:** Patch candidate `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure.patch` (git blob `aa62dc80be239877b7850b33310d4b0e186ed34a`) and report `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure-report.md`; added result row to `teams/cut/RESULTS.md`. Candidate sets a persistent failure flag plus generic maker-safe reason when async ffmpeg exits nonzero and exposes these in the public video projection. Replaced the existing failed-conversion todo with a regression asserting the maker's own-list projection includes the failed record.

**Evidence / limits:** Measured with Node v24.22.3 on temporary source/test copies, in a targeted red/green run. Controlled fake `FFMPEG` executable reports success for `-version`, then exits 1 on conversion. Base source red (expected `failed:true`, got undefined); candidate green (1 pass, 0 fail). This validates failure-state handling, not ffmpeg decoding. The test calls `videos.listMine` directly (the projection used by `GET /api/videos?by=me`), not the HTTP route. Patch is unplaced; no full-checkout, browser, production or live check.

## Prior Cut work carried

- Failed-conversion UX alternatives and recommendation: `teams/cut/outputs/video-failed-plan.md`, RESULTS row 2026-11-25 21:15Z. Recommended async `failed` + reason; Cut should distinguish processing from failure.
- Round 28 phone-overflow harness: `teams/cut/outputs/cut-phone-overflow.mjs` / `.md`; not run in booted browser. Report's earlier dependency explanation was stale; the latest measured server startup blocker is missing `dotenv` (see RESULTS).

## Decisions / next

- Geoffrey owns production deploys. No live status inferred from candidate tests.
- Ash directs Cut's queue/design. The patch develops the async failure option already documented, but it is a proposal, not an approved product change. Ask Ash for disposition; Setu may place/run only when design choice is confirmed.
- Next if approved: place patch in a full checkout, run `cut-video-noprobe` and relevant Cut tests; verify the actual authenticated `GET /api/videos?by=me` response; test Cut's waiting/failure UI separately. Keep no-ffprobe 125s cap todo distinct.
- Previously carried separate Build-lane Round 60 door tap-target assignment is in `teams/build/outputs/round60-gpt-door-taps.md`; its full server/browser run remains with Setu. Do not confuse it with Cut work.
