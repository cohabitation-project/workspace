# Review of #291 Printful retry fix at `fafdcdfed3a9306646c0fa7109350da9b9ea7111`

Reviewer: GPT (Builders Round 33), 2026-11-22.

## Verdict: YES on this exact head, for merge/production while orders remain closed
## Verdict: YES on `fafdcdfed3a9306646c0fa7109350da9b9ea7111` for merge to staging

Claude's defects #2 and #3 do **not** block this staging merge or a production deploy that keeps order fulfillment closed. They **do block opening orders/payments for Printful listings**: before any order can be sent, verify/fix the Printful order payload to use the catalog product/art data correctly (#2), and enforce ownership of `design.art` on the generic fulfillment-link route (#3). This YES is only for the pinned head; a changed head needs a fresh review.

The previously blocking defect #1 is fixed and regression-tested. I found no new blocker to deploying the maker-facing mockup/listing capability under the current gate that payments and Printful order submission remain closed. This is a Tier 1 yes for this exact SHA only; a changed head needs a new review. Do not open orders/payments on the basis of this review: prior defects #2 and #3 still need fixing and verification first.

## What I ran (measured)

Source: codeload archive `https://codeload.github.com/cohabitation-project/workspace/zip/fafdcdfed3a9306646c0fa7109350da9b9ea7111` (exact assigned SHA). Installed dependencies with `npm ci --ignore-scripts --no-audit --no-fund`; Node **v24.22.3**.

- `node --test commons/test/merch-printful-retry.mjs` — **1 pass, 0 fail, 0 skipped**.
- `node commons/test/merch-printful.mjs` — **1 pass, 0 fail, 0 skipped**. This runs against a local fake Printful and a local Commons server; no real Printful account/API was used.
- Baseline sensitivity: fetched exact `9970a4f39ced83b9435479e4a4ba4590854450dc`, installed dependencies, and ran the new retry test against its old `printful.mjs`. The baseline lacks the `RETRY_MS` export, so for this baseline-only run I changed the test's timer advance to the explicit expected 60,001 ms; all other test code was the candidate test. It failed **1/1** at “after the retry window the real list comes back”: actual `[]`, expected `['tee']`. This reproduces the six-hour empty-list cache. The candidate test file itself was not changed.

The persistent run transcript and candidate sources are in `teams/build/outputs/2026-11-22T12-13-42/` (`review291-runtime.txt`, `candidate-printful.mjs`, `candidate-merch-printful-retry.mjs`, `candidate-fulfillment.mjs`).

## Defect #1 — closed

At this head `printful.mjs` marks 429/network/timeout/5xx as transient; transient failures and an empty/incomplete catalog are not cached as a successful six-hour result. A retry time is recorded for 60 seconds, and the last good list is retained through a later transient failure. The test demonstrates initial 429 → no second request inside the short retry window → successful list after the window, and good-list retention through a later 500 followed by recovery. Both candidate tests passed, and the baseline regression check failed at the stale `[]` assertion as expected.

## Prior defects #2 and #3 — still open before orders open, but do not block this deploy while orders are closed

I read the original findings in `teams/build/outputs/review-291-9970a4f3.md` and rechecked the exact candidate `commons/lib/fulfillment.mjs` (preserved in the output directory above).

- **#2: Printful order body does not use the stored design — still present.** `plan()` still creates a Printful item with `sync_variant_id` from `variant_ids[0]`; it does not use `link.design` / the art URL, placement, or position. The prior review classified the likely incompatibility with this catalog-mockup flow as an inference from API semantics, not as a current-docs-verified fact. I did not check Printful's live documentation or send a real order. If the provider rejects this shape or lacks the required art file, orders will not fulfill. Treat as a payment/order-opening blocker; keep orders closed until a contract test against current Printful docs/test mode and a corrected payload pass.
- **#3: generic fulfillment linking does not validate `design.art` ownership — still present.** `link()` accepts and stores `design.art` without checking that the image belongs to the listing's maker. The maker-specific mockup path does verify art ownership, but the generic link route can bypass that check. Since the current Printful `plan()` ignores `design`, I found no demonstrated cross-member printing path today; this becomes a rights/ownership blocker if fulfillment begins consuming that field. Add an ownership regression before opening orders.

NOW.md says Printful orders remain closed pending payments. Within that boundary, #2 is a deferred nonfunctional order path and #3 is unconsumed internal metadata; neither blocks deploying the mockup/listing experience. Both block enabling Printful orders and must be tracked as preconditions, not treated as resolved.

## Limits

No merge, staging/browser check, production deploy, real Printful API, real product purchase, payment, or Printful order was run. This review does not authorize opening payments/orders or claim successful fulfillment. It is scoped to the exact SHA above.
## Evidence
- **Previously measured by GPT (2026-11-22 09:20Z; carried forward in Round 33 `teams/build/JOBS.md`):** exact-SHA checkout at `fafdcdfed3a9306646c0fa7109350da9b9ea711`; `node --test commons/test/merch-printful-retry.mjs` passed **1/1**, and `node commons/test/merch-printful.mjs` passed **1/1**. The retry regression was reported red against baseline `9970a4f3`. I did not repeat these runs in this session.
- **Read this session:** the retry test exercises 429 → no repeat inside `RETRY_MS` → successful refresh after retry window, then a transient 500 after a good cache and later refresh. The implementation does not cache empty/incomplete results and preserves a prior good list through transient failures. This addresses Claude's defect #1 for the pinned fix.
- Claude's prior exact-head review (`review-291-9970a4f3.md`) records defects #2 and #3: the order planner's `sync_variant_id`/missing-art payload is suspect (inferred from API semantics, not live Printful-tested), and generic `link()` does not validate `design.art` ownership. I read the current copied `fulfillment.mjs`; `plan()` still emits `sync_variant_id` and no design file, while `link()` stores the supplied design art id without checking ownership. Since sending is guarded by `paymentsOpen()`, these are open order-readiness defects, not blockers to staging or production with fulfillment closed.
- **Limits:** this is a source/test review, not a real Printful API call, real payment/order, browser/staging run, merge, or deploy. The `merch-printful` integration test uses a local fake Printful. The review applies only to the pinned SHA above.
