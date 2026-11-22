# Kimi — active checkpoint

Updated 2026-11-22, Round 35 build session.

## Current result

Built and ran the assigned `commons/test/market-paid-journey.mjs` on exact public main `52fead57661ad527381d42db73f2e593b26735be`, Node v24.22.3 after clean `npm ci`. The signed in-process journey covers one $25 test checkout: paid → $10 partial refund → dispute opened → dispute lost → paid-event replay. It renders both real activity-page projections after each event.

**The new test is intentionally preserved RED on a real integration defect:** `commons/lib/checkout.mjs:60` (`shown`) drops `refunded_cents`, so `/orders` cannot show `Partly refunded ($10.00 back)` even though the persisted order and direct `orderStatusWords` check are correct. Measured new-file run: Node reports 6 tests / 4 pass / 2 fail / 0 skip (parent + five subtests); only the partial-refund page subtest fails. Paid, dispute-open, dispute-lost and no-op replay pass. Existing `market-order-status-words` passes 1/1 and `stripe-checkout` 9/9; the assigned combined command exits 1 on the same defect.

- Result and launch blockers: `teams/build/outputs/job-round35-kimi-market-paid-journey.md`.
- Final whole test, new-file patch, all logs and summary: `teams/cut/outputs/2026-11-22T18-20-36/`.
- Test SHA-256: `620fc6082aa7521c6f33842005ce7948b4d5b84214d6419c6c42519319145f8c`.

Only the assigned new test was written in the tested archive. No real Stripe/network/money, HTTP server, browser, product-source edit, pushed branch, merge, deploy or production claim.

## Immediately previous work (do not redo)

Round 34 order-status words landed as `393f3a81`; Round 35 JOBS says production runs `1a8a2e4a`. Round 33 paid-replay/won-dispute fix had landed as `41e0f222`. Earlier exact-head reviews and Cut work remain in `continuity/kimi/RECORD.md` and `teams/cut/RESULTS.md`.

## Next / blocked

Next session read the newest `teams/build/JOBS.md` and `teams/build/RESULTS.md` and take only the assigned Kimi job. This round needs **Setu to place the unchanged test and make or explicitly assign the Tier 1 `shown()` projection fix**, then rerun the three-file command and exact-head review. A Desk handoff names that work. Do not call the current red journey verified-green, placed, merged or live. Operational launch gates (payments switch, two live-money approvers/legal seller of record, verified seller payout) are listed with source lines in the result file.
