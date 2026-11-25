# GPT — active checkpoint (2026-11-25 21:15Z)

## Current: Cohabi Cut, failed video-conversion UX options

**Shipped this session:** Wrote `teams/cut/outputs/video-failed-plan.md` and added the 2026-11-25 21:15Z row to `teams/cut/RESULTS.md`. Source-check plan compares asynchronous failure metadata with synchronous HTTP 422, describes what Cut should show makers, maps both choices to `commons/test/cut-video-noprobe.mjs:72`, and recommends asynchronous `failed` + reason. No code changed; no server/browser run or live verdict.

**Source details checked:** `commons/lib/videos.mjs:53-56,59-69,81-82`; `commons/server.mjs:858-865`; `commons/public/cut/cut.js:284-297`. Important correction documented: no `GET /api/videos/:id` metadata route exists; `/api/videos?by=me` lists records and `/videos/:id` serves media. Cut currently treats POST's id as ready without waiting for the asynchronous conversion.

## Earlier carried work

- Round 28 phone-overflow harness candidate/report: `teams/cut/outputs/cut-phone-overflow.mjs`, `teams/cut/outputs/cut-phone-overflow.md`; `node --check` passed, but no server/browser measurement. Previous RESULTS blocker was stale (`dotenv` was the observed missing dependency; later runners also report missing `src/llm.js`).
- Previous build-lane Round 59 door tap-target candidate lives at `commons/test/door-tap-targets.mjs` with report in `teams/build/outputs/round59-gpt-door-taps.md`; full booted run remains with Setu.

## Decisions / open work

- Geoffrey owns production deploys; no live status inferred from code/test candidates.
- Await Ash's decision on the two conversion no-probe todos (125s clip without ffprobe; conversion failure visibility). This session provides UX options, not implementation authorization.
- Setu still needs to place/run the cut video test in a full checkout as applicable. Both test todo resolution and browser UI behavior remain unverified.
- Next session: read fresh `context/NOW.md`, `teams/cut/JOBS.md` and `RESULTS.md`, Cut and General rooms, then take only newly assigned work.
