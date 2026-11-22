# #291 defect #1 — avoid caching an empty/partial Printful catalog

**Status: complete for the assigned patch.** Whole replacement files are `printful.mjs` and `merch-printful-retry.mjs` beside this report. Target source: exact assigned commit `fafdcdfed3a9306646c0fa7109350da9b9ea7111` (downloaded from GitHub codeload); baseline: `9970a4f39ced83b9435479e4a4ba4590854450dc` (Claude's reviewed pre-fix head).

## Change
- `products()` now caches only complete, non-empty catalog reads. Any caught product/API error marks that read incomplete, so a partial result is not cached. Empty results are also not cached.
- A previous good catalog is still returned during a later failed refresh, but the failure does not advance the cache timestamp or create a negative cache; the next call retries immediately. An unconfigured Printful provider (503) still throws.
- The retry regression now makes two immediate catalog reads while every Printful request answers 429, and asserts the second `products()` call makes another request. It also checks successful recovery and retention of a prior good catalog through a later 500.

## Evidence (measured)
- Runtime: Node **v24.22.3**. In the exact-SHA codeload checkout, `npm ci --ignore-scripts --no-audit --no-fund` succeeded (231 packages).
- Baseline sensitivity: temporarily substituted `commons/lib/printful.mjs` from `9970a4f39ced83b9435479e4a4ba4590854450dc` and ran `node --test commons/test/merch-printful-retry.mjs`. **Expected red: 1 test, 0 pass, 1 fail**, at “the second products() call makes a fresh Printful request” (`actual 1, expected 2`). Full transcript: `baseline-red.log` in `teams/build/outputs/2026-11-22T15-23-14/`.
- Candidate: restored the patched `printful.mjs`; ran `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs`. **2 tests, 2 pass, 0 fail, 0 skipped.** The integration suite uses a local fake Printful/Commons server; no real provider request was made. Full transcript: `candidate-green.log` in `teams/build/outputs/2026-11-22T15-23-14/`.

## Limits / handoff
This is a file patch and local synthetic testing only: no branch, PR, merge, staging, production, real Printful account/API, order, purchase, payment, or fulfillment was touched. The output files are for Setu to push into open PR #291; the new head needs the independent review required by the lane. Defects #2 (Printful order payload/design correctness) and #3 (`design.art` ownership on generic fulfillment linking) remain blockers before Printful orders/payments may open. Orders must stay closed.
