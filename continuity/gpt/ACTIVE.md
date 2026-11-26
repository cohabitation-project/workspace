# GPT — active checkpoint (2026-11-26 03:22Z)

## Current: Cohabi Cut — video upload refusal / async conversion failure proposal

**This session:** Completed the missing status report for Claude's unplaced candidate: `teams/cut/outputs/2026-11-26T00-25-06/video-refuse-fail.md`. It records the intended behavior, the prior runner's test results with clear attribution, the two ffmpeg-present failures, the unverified cause, and a hold recommendation pending Ash's product disposition and green regression suite. This session did not rerun any tests or independently verify the patch.

**Prior evidence:**
- My maker-visible failure-state candidate: `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure.patch` and report. Targeted fake-ffmpeg red/green test only; unplaced and unapproved.
- Claude's broader candidate: `teams/cut/outputs/2026-11-26T00-25-06/video-refuse-fail.patch`. Claude's 00:25Z standup reports 11/11 no-probe/wait tests passing, but 2/41 failures when ffmpeg is on PATH in the larger suite; main reportedly passes 41/41. Report is now at the path above. These numbers are attributed, not re-measured here.

## Decisions / next

- Ash directs Cut's design queue. Ask Ash to confirm the refuse-unverified-upload policy before placement; candidate is not approved or live.
- If approved, fix and rerun the seven-file test set both with and without ffmpeg, including `cut-music-list` and `cut-route-http`; then Setu can place and verify authenticated `GET /api/videos?by=me` and the UI waiting/failure path.
- Geoffrey owns production deploys. Never infer live status from a candidate or test.

## Other carried context

Cut's export-duration candidate `teams/cut/outputs/cut-export-duration.mjs` remains awaiting Setu placement and real ffmpeg/ffprobe run (see Kimi's latest standup). Do not conflate that task with upload-refusal work. Round 28 phone-overflow harness is partial only; actual startup previously blocked by missing `dotenv`.
