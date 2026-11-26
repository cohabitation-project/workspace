# GPT — active checkpoint (2026-11-26 03:22Z)

## Current: Cohabi Cut — video upload refusal / async conversion failure proposal

**This session:** Completed the missing status report for Claude's unplaced candidate: `teams/cut/outputs/2026-11-26T00-25-06/video-refuse-fail.md`. It records the intended behavior, the prior runner's test results with clear attribution, the two ffmpeg-present failures, the unverified cause, and a hold recommendation pending Ash's product disposition and green regression suite. This session did not rerun any tests or independently verify the patch.

**Prior evidence:**
- My maker-visible failure-state candidate: `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure.patch` and report. Targeted fake-ffmpeg red/green test only; unplaced and unapproved.
- Claude's broader candidate: `teams/cut/outputs/2026-11-26T00-25-06/video-refuse-fail.patch`. Claude's 00:25Z standup reports 11/11 no-probe/wait tests passing, but 2/41 failures when ffmpeg is on PATH in the larger suite; main reportedly passes 41/41. Report is now at the path above. These numbers are attributed, not re-measured here.
## Current: Build Round 62 — door pages/link test

**Shipped this session:** `commons/test/pages-door-links.mjs` and report `teams/build/outputs/round62-gpt-door-links.md`; appended evidence to `teams/build/RESULTS.md`. Test covers `/door`, `/join`, `/signin`, `/signup`, `/connect` signed out and signed in, with one-hop same-origin href/src checks, explicit signed-in signin/signup redirect logging, and fake-ref mutant mode.

**Evidence / limits:** `node --check` passed. Actual Commons server readiness test timed out after 20.15s (0 pass/1 fail, before navigation); real page and link behavior remains unrun here, needs Setu's dependency-complete boot. Temporary local HTTP fixture baseline passed 1/1 (10 page visits, bad=0; two signed-in 302 redirects logged); fake-ref mutant logged the injected 404 and failed 0/1. Fixture only validates harness behavior, not Commons. Build-room post pending.

**Next:** @Setu run `node --test commons/test/pages-door-links.mjs` on a full dependency-complete isolated checkout; confirm pages and first-hop links, redirects and test pass/fail. If placed, keep the fixture-vs-app distinction in RESULTS.

## Previously carried: Cohabi Cut conversion failure candidate

Patch `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure.patch` (blob `aa62dc80be239877b7850b33310d4b0e186ed34a`) and report in same folder. Candidate creates a persistent maker-safe failure state for async ffmpeg conversion; targeted temporary-copy red/green test passed, but no full checkout, ffmpeg decode, HTTP, browser, production, or live check. Ash's product disposition needed before placement; Setu only after design choice. Keep 125s no-ffprobe cap separate.

- Ash directs Cut's design queue. Ask Ash to confirm the refuse-unverified-upload policy before placement; candidate is not approved or live.
- If approved, fix and rerun the seven-file test set both with and without ffmpeg, including `cut-music-list` and `cut-route-http`; then Setu can place and verify authenticated `GET /api/videos?by=me` and the UI waiting/failure path.
- Geoffrey owns production deploys. Never infer live status from a candidate or test.

## Other carried context

Cut's export-duration candidate `teams/cut/outputs/cut-export-duration.mjs` remains awaiting Setu placement and real ffmpeg/ffprobe run (see Kimi's latest standup). Do not conflate that task with upload-refusal work. Round 28 phone-overflow harness is partial only; actual startup previously blocked by missing `dotenv`.
**Decisions:** Geoffrey owns production deploys. No live status inferred from tests. Do not confuse the Cut candidate with the Build job.
