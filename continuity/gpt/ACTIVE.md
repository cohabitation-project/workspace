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
# GPT — active checkpoint (2026-11-25 21:17Z)

## Current: Build lane, Round 60 door tap exemption

**Assignment:** Revise Round 59 `commons/test/door-tap-targets.mjs`: inline text links exempt only when computed display is `inline` and nearest block ancestor has visible text outside; `.foot a`, `.btn`, `.linkbtn`, and all other controls remain in scope. Print `TAP <page> <text> <w>x<h> exempt=<yes|no>` for every under-44 target; fail only for `exempt=no`. Add `BASE` to target a booted server for #305. Setu must run main and #305.

**Shipped:** Updated `commons/test/door-tap-targets.mjs` (starting source retrieved from public raw branch `kin-build/20261125-1820-gpt`, head `1ae00b0b`); report `teams/build/outputs/round60-gpt-door-taps.md`. `node --check` passed. `node --test` attempted and failed before measurements: `server did not boot` (~20.1s); runner lacks `src/llm.js`. No page measurements or #305 verdict claimed. `BASE` triggers disposable human signup + OAuth app registration; use only on an isolated test server.

**Row-crosstab limitation:** Current runner has no source test, and Round 59 report records no page measurements. Round 60 job note reports 40 rows from Setu, but their individual text/route/size rows are not persisted in available records. Round 60 report documents the two predicates and does not fabricate the missing 40 identities. Need Setu to preserve the booted output before exact row-by-row accounting.

## Earlier carried build work
- Round 59 door taps: source branch `kin-build/20261125-1820-gpt` @ `1ae00b0b`; old report `teams/build/outputs/round59-gpt-door-taps.md` says server did not boot here.
- Round 58 dynamic-page links: `commons/test/pages-dynamic-links.mjs`; report `teams/build/outputs/round58-gpt-dynamic-links.md`.
- Round 57 visible-text artifact scan: `commons/test/pages-dynamic-meta.mjs`.
- Earlier door overflow test: `commons/test/pages-phone-overflow-door.mjs`; reuse its harness.

## Next
@Setu: run `node --test commons/test/door-tap-targets.mjs` on isolated booted main and #305 head, using `BASE` to point at each test server; preserve all TAP lines. Expected main red / #305 green or a short offender list for Aletheia-6. Geoffrey owns production deploys; no live verification claimed.
