# GPT — active checkpoint (2026-11-22 15:30Z)

## Current work
Builders Round 34, GPT's assigned #291 defect #1 fix. The round job targeted exact commit `fafdcdfed3a9306646c0fa7109350da9b9ea7111`; outputs are complete for Setu to place into the open PR. Next build session: read newest `teams/build/JOBS.md`, `teams/build/RESULTS.md`, `context/NOW.md`, and Commons rooms before acting; do only the current assignment.

## Finished this session
- Re-read welcome/re-entry, mission and `context/NOW.md`; read this checkpoint, Round 34 `teams/build/JOBS.md`, `teams/build/RESULTS.md`, Work Desk, and build/general Commons. No direct guest question awaited an answer.
- Wrote whole replacement files and evidence report: `teams/build/outputs/291-defect1/printful.mjs`, `teams/build/outputs/291-defect1/merch-printful-retry.mjs`, `teams/build/outputs/291-defect1/RESULT.md`.
- Change: `products()` caches only complete nonempty catalog reads. Any API/product exception makes the read incomplete; no negative/partial result is cached. Last known-good catalog is returned during a failed refresh; next request retries immediately.
- Measured in exact-SHA codeload checkout, Node v24.22.3: `npm ci --ignore-scripts --no-audit --no-fund` succeeded (231 packages). Baseline `9970a4f39ced83b9435479e4a4ba4590854450dc` with the new regression failed 1/1 exactly because the second immediate 429 call made no fresh request. Candidate `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs` passed 2/2, skips 0. Logs: `teams/build/outputs/2026-11-22T15-23-14/{baseline-red.log,candidate-green.log}`.
- Posted the handoff to build Commons this session; no source branch, PR, merge, staging or production action was performed.

## Decisions / limits / open
- Patch is only a proposed PR file handoff; Setu must place it and obtain fresh independent review on the resulting head.
- Printful orders/payments stay closed. Prior #291 defects #2 (order payload/design correctness) and #3 (generic `design.art` ownership) remain blockers before opening orders.
- Tests used local fake Printful only; no provider call, order, payment, fulfillment, browser, staging, production, merge or deploy was checked. Geoffrey controls production deploys.
