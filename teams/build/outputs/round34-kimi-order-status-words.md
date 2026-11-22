# Round 34 — Kimi: plain-language order, sales and receipt states

Assigned in `teams/build/JOBS.md` (Round 34, 2026-11-22 15:20Z). Scope stayed at `commons/lib/marketpage.mjs` plus new `commons/test/market-order-status-words.mjs`.

## Portable change

Final files and evidence: `teams/build/outputs/2026-11-22T15-20-10/`.

- `round34-order-status-words.patch` — canonical two-file patch; SHA-256 `5fc142e278806ce06589a899e1e2ce0ef1f6fb1446b7250bc9f8c309056424c3`.
- `marketpage.mjs` — complete modified source; SHA-256 `855cb7bc80b20e0937a082b5978916f48c7a71e68eed7d88eda2ea1c21579ec7`.
- `market-order-status-words.mjs` — complete new direct-render test; SHA-256 `1c90ec97fbd60794de388fb176bf071c8b4238185f37b9521b858d637f18903a`.
- `evidence.json`, red/green logs, regression log and combined log are beside them.

`orderStatusWords(o)` now covers all persisted order states, including `$12.50`-style amounts derived from `refunded_cents`. `ordersPage` and `salesPage` render those words instead of raw state keys. The `listingPage` receipt headlines partial/full refunds and open/lost disputes with those same words instead of “Payment received by Stripe — confirming.” Existing paid, cancelled and awaiting-confirmation headlines are unchanged.

## Measured evidence

Public main archive: `80748deafc363693133c201fb7c69b3e8595972e`; Node `v24.22.3`; archive dependencies installed with `npm ci`.

1. **Red on unmodified main:** `node --test commons/test/market-order-status-words.mjs` exited 1: **0 pass / 1 fail**, failing first on `awaiting_payment: missing "Waiting for payment" in the status element` (`red-new-test.log`). This is the final revised test, not an earlier draft.
2. **Green with only the patch:** same command exited 0: **1 pass / 0 fail / 0 skip** (`green-new-test.log`). The test directly calls all three page functions for each of the ten non-draft states, checks the exact status element on orders/sales, rejects leaked underscored state keys, and checks all four refund/dispute receipt headlines.
3. **Assigned existing regression command:** `node --test commons/test/market-orders-page.mjs commons/test/market-sales-page.mjs commons/test/market-receipt-link.mjs` exited 0: **3 pass / 0 fail / 0 skip** (`regression-pages.log`).
4. **Combined:** new test plus those three files exited 0: **4 pass / 0 fail / 0 skip** (`combined-pages.log`).

## Limits and remaining step

This runner has no git metadata and its file tools cannot write `commons/`; the tested change is therefore a portable output, **not yet placed on a branch, merged, deployed or live**. Setu still needs to apply the patch to `kin-build/20261122-<hhmm>-kimi` and let the normal runner/review process verify it. A Desk handoff records that step.

All orders were synthetic fixtures. No real Stripe request, credentials, payment, refund, dispute, staging or production behavior was touched or claimed. An earlier test draft produced a false positive on the unrelated navigation words “Get paid”; the final test instead asserts the exact `.mk-order-status` element and was rerun red and green. Earlier iteration outputs are not the deliverable; use only the final timestamped folder above.
