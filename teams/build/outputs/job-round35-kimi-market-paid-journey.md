# Round 35 — Kimi: one paid Marketplace order, start to finish

**Status: new regression test written and exercised; RED on one real order-view integration defect.** I touched only the assigned new test. This is not a placed branch, merge, deploy, or live-payment claim.

## Basis and artifacts

- Public main downloaded and tested at exact SHA `52fead57661ad527381d42db73f2e593b26735be`.
- Node `v24.22.3`; clean `npm ci --no-audit --no-fund` exited 0 (231 packages installed).
- New file: `commons/test/market-paid-journey.mjs` (in the tested archive).
- Portable whole file and new-file patch: `teams/cut/outputs/2026-11-22T18-20-36/market-paid-journey.mjs` and `round35-market-paid-journey.patch` in that same folder.
- Test SHA-256: `620fc6082aa7521c6f33842005ce7948b4d5b84214d6419c6c42519319145f8c`.
- Logs and machine summary: `teams/cut/outputs/2026-11-22T18-20-36/round35-{journey,combined,existing-status,existing-stripe,npm-ci,syntax}.log` and `round35-summary.json`.

## What the test actually exercises

With a fresh temporary `COMMONS_DATA`, it seeds a human seller, buyer and listing; uses a fake in-process Stripe to connect the seller and begin one $25 checkout; then signs every event with `whsec_journey`, passes the exact bytes through `stripe.verifyWebhook`, and passes the verified event to `checkout.handleEvent` — the same sequence as `server.mjs:1816-1819`. No HTTP server or network is needed to reach that handler.

The journey is `checkout.session.completed` → partial `charge.refunded` ($10 of $25) → `charge.dispute.created` → `charge.dispute.closed` (`lost`). After each event it checks the persisted status and `refunded_cents`, and renders `ordersPage` and `salesPage` from the same `checkout.ordersFor` projections used by `/orders` and `/label/sales`. It then replays the paid event and requires both the order and append-only log to remain byte-for-byte unchanged.

## Measured result

- `node --check commons/test/market-paid-journey.mjs`: exit 0.
- `node --test commons/test/market-paid-journey.mjs`: exit 1; Node reports **6 tests, 4 pass, 2 fail, 0 skipped** (the parent plus five subtests). Payment, dispute-open, dispute-lost and paid-event replay subtests pass. The partial-refund activity-page subtest fails.
- The failure is exactly: `/orders: expected "Partly refunded ($10.00 back)" for partly_refunded` at the new test's page assertion. The persisted order itself has `partly_refunded` and `refunded_cents: 1000`; the complete-order `orderStatusWords` check passes before the page assertion.
- `node --test commons/test/market-order-status-words.mjs`: **1/1 pass**.
- `node --test commons/test/stripe-checkout.mjs`: **9/9 pass**.
- Assigned combined command (`market-paid-journey.mjs market-order-status-words.mjs stripe-checkout.mjs`): exit 1 on the same partial-refund page assertion; full output is preserved in `round35-combined.log`.

This red test does **not** contradict the green fixture test: the fixture supplies `refunded_cents` directly, while the real checkout view projection drops it.

## Launch blockers visible in this slice

1. **Honest partial-refund display:** `commons/lib/checkout.mjs:60` (`shown`) omits `refunded_cents`; consequently the real activity-page projection cannot render the stored $10 refund amount. `/orders` is measured red; `/label/sales` uses the same projection. Include `refunded_cents` in that projection and rerun the new test. This file is now Tier 1, so the fix needs the normal exact-head second review.
2. **Payments are still closed by configuration:** `commons/lib/checkout.mjs:39` requires both `COMMONS_PAYMENTS=stripe` and a usable Stripe mode. The test uses test-only fake configuration, not production payment capability.
3. **Live-money approval/legal gate:** `commons/lib/stripe.mjs:14-16` refuses a live key without two named approvers; `commons/lib/checkout.mjs:10-13` also records the legal seller-of-record/council gate. Neither is satisfied by this test.
4. **Seller payout readiness:** `commons/lib/checkout.mjs:130` makes a human listing unpayable until the seller's payout account is verified. The fake account in this test is not evidence of a real onboarded seller.

## Limits and next hand

No real Stripe credential, provider request, card, payment, refund or dispute was used. I did not boot the HTTP server, use a browser, inspect production, or verify real webhook delivery. No product source was changed.

@Setu: place the unchanged new test on the requested Kimi build branch, make the small Tier 1 `shown()` projection fix (or assign it explicitly), then run the assigned three-file command and the normal exact-head review. Do not merge the red test as a green journey or treat this artifact as a pushed branch.
