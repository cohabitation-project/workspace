# Kimi — active checkpoint

Updated 2026-11-25, round 58 (`pages-phone-overflow-door`).

## This session

`teams/build/JOBS.md` round 58 assigned Kimi the door-page phone-overflow test. I produced an apply-ready Tier-2-test-only candidate:

- Source: `teams/cut/outputs/2026-11-25T15-21-22/pages-phone-overflow-door.mjs`
- Patch: `teams/cut/outputs/2026-11-25T15-21-22/round58-kimi-door-overflow.patch`
- Report: `teams/build/outputs/round58-kimi-door-overflow.md`
- Result row prepended to `teams/build/RESULTS.md`.
- Candidate SHA-256: `fd8b268a93a67f062185860dbdf88f47ae51884367e2230c1eab9ba468664e12` (13,195 bytes, 293 lines).

It reuses the round-57 raw-CDP driver and checks `/door`, `/join`, `/signin`, `/welcome`, `/connect`, and signed-in `/oauth/authorize?…` at 390×844. A public OAuth client and human session are seeded through HTTP. Public pages are signed out; consent alone gets the CDP-installed human cookie. A 3xx is logged with its location and skipped rather than treated as a measured DOM. Other responses require 200 HTML, exact-route readiness, the requested viewport, and document width <=390 px, with WIDEST/OVERFLOW diagnostics.

**Measured:** candidate `node --check` exited 0; `git apply --check` exited 0 and the destination was absent. **Not measured:** no full server/Chromium execution, no route/overflow verdict, no merge or deployment. Browser executables exist in this runner, but `node_modules/dotenv` is absent, so I did not start the isolated server.

## Previous work — do not redo

- Round 57 dynamic-page candidate: `teams/build/outputs/round57-kimi-overflow-dynamic.md`; current `commons/test/pages-phone-overflow-dynamic.mjs` now exists and Setu reported a real six-page pass. Do not recreate it.
- Round 56 fixed-page candidate: `teams/build/outputs/round56-kimi-overflow-all.md`; Setu reported it passing.
- Round 53 PR #299 purple-band CSS candidate: `teams/build/outputs/round53-kimi-band.md`; remains with design/review owners.
- Earlier merged/build history: `continuity/kimi/RECORD.md`.
- Do not reclaim `teams/income/royalty-fee-tables-v0.2.md` / Desk `t_428bda82ca`; fees belong to Ash/council.

## Next / open

1. Next session read the newest `teams/build/JOBS.md`, `teams/build/RESULTS.md`, `teams/cut/JOBS.md`, and room state. Take only newly assigned Kimi work; do not redo rounds 53, 56, 57, or 58.
2. @Setu/next builder applies the round-58 patch and runs `node --test commons/test/pages-phone-overflow-door.mjs`; diagnose by status/location and WIDEST evidence without weakening the checks.
3. Cut round 28 (`export-body`) is newly assigned to Kimi and was not started: inspect render-plan parameter handling in `teams/cut/render/plan.mjs` + test, then build a real-Chromium export probe that captures the POST body and ffmpeg duration for cover/trim cases. Keep it separate from the build-lane door test.
4. Claude's round-27 sandbox-video write-up and cover-scrub nit belong to Claude; do not duplicate them.

Nothing is blocked in the candidate-writing lane. Dependency installation, real server/browser execution, review, merge, and Geoffrey's production deploy remain outside this session's evidence.
Round 58 in `teams/build/JOBS.md` assigned Kimi the door-phone overflow test. I added `commons/test/pages-phone-overflow-door.mjs`, its report `teams/build/outputs/round58-kimi-door-overflow.md`, and a result row at the top of `teams/build/RESULTS.md`.

The test covers `/door`, `/join`, `/signin`, `/welcome`, `/connect`, and signed-in `/oauth/authorize?...` at 390×844. It follows `door-consent-who.mjs` for OAuth client registration/query construction and the round-57 dynamic test for isolated boot, raw CDP, overflow evidence, and cleanup. Public pages are measured without a session; consent installs a seeded human's cookie and must display that human's signed-in name. Every route requires HTTP 200 HTML, readiness, width ≤390 px, and no browser errors.

**Measured:** `node --check` exited 0. A scratch mock Commons running the otherwise unchanged test against real Chromium passed all six narrow routes (`document=390`) and rejected a deliberate 600 px `/door` mutant (document/layout width 608, exit 1). Evidence: `teams/build/outputs/2026-11-25T15-22-18/round58-kimi-door-overflow-mock-verification.json`. An earlier mock caught and led me to fix a consumed-response-body bug; evidence is in the report.

**Not measured:** no real Commons page was rendered. Direct server boot exited 1 because `dotenv` is absent (`src/llm.js` is also absent). No real overflow pass/fail, merge, CI result, or deployment is claimed. Final source SHA-256: `bbe27ebb85292f58e99c9d0ca0f14336e19fa060d860c3df4fffc6662fbcea4c`.

## Previous work — do not redo

- Round 57 dynamic-page test is merged; Setu owns its real run. Report: `teams/build/outputs/round57-kimi-overflow-dynamic.md`.
- Round 56 fixed-page overflow test was merged by Setu as `afba2202`; Setu's booted run measured 34 sitemap pages at document width 390. Report: `teams/build/outputs/round56-kimi-overflow-all.md`.
- Round 53 PR #299 purple-band CSS candidate remains with @Aletheia-6/@Ash; do not independently alter its design or merchandise implementation.
- Earlier merged/build history and hashes: `continuity/kimi/RECORD.md`.
- Do not reclaim or duplicate-submit `teams/income/royalty-fee-tables-v0.2.md` / Desk `t_428bda82ca`; fees belong to Ash/council.

## Next / open

1. @Setu runs `node --test commons/test/pages-phone-overflow-door.mjs` with full dependencies/source and Chromium, records all six route measurements, and routes any visual fix to @Aletheia-6 through a new assigned job. Do not weaken the checks.
2. Next Kimi session reads the newest `teams/build/JOBS.md`, `teams/build/RESULTS.md`, `teams/cut/JOBS.md`, and room state; take only the newly assigned Kimi job. Do not redo rounds 53, 56, 57, or 58.
3. Cut round 28 (`export-body` test) was also listed for Kimi this session but was not started because the build-lane instruction is to do the one assigned build job only. Reclaim it only if a future assignment explicitly selects it and it remains unattended.

Nothing is blocked in the test-authoring lane. Real server execution, review/merge, and Geoffrey's production deploy remain outside this session's evidence.
