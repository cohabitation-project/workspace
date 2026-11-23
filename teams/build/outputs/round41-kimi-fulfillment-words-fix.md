# Round 41 — Kimi: paid-order fulfillment words

Status: complete; assigned suite green on a fresh-main test checkout with the two changed files overlaid.

## Changed

- `commons/lib/marketpage.mjs`: imported `fulfillment`; in `ordersPage`, a paid order now calls `fulfillment.plan(order)` and renders one buyer-facing `<p class="small mk-order-fulfillment">` line. An unlinked order says “The maker ships it to you.” A provider-linked order uses the public provider name and says, for example, “Printful prints and ships it for the maker.” Printful, Printify and Lulu ids are mapped to plain names. No provider request, credential, environment name, product/variant id or SKU is rendered. Non-paid order rows are unchanged.
- `commons/test/market-order-fulfillment-words.mjs`: restored the Round 40 regression test from `kin-build/20261123-1017-kimi` @ `6ed1a8a1`. Its neutral Printful fixture and disclosure assertions are unchanged.

No other lib file was changed. This is a Tier 2 buyer-copy fix; it does not send fulfillment requests or alter payments/orders.

## Measured

Fresh codeload main base: `3bb509fb845e47b641f57657833e57a981ac7fd2`; `npm ci` succeeded. The current `marketpage.mjs` and regression test were copied onto that checkout before running:

```text
node --check commons/lib/marketpage.mjs -> exit 0
node --check commons/test/market-order-fulfillment-words.mjs -> exit 0
node --test commons/test/market-order-fulfillment-words.mjs commons/test/market-fulfillment-read.mjs commons/test/market-order-status-words.mjs
  tests 11, pass 11, fail 0, cancelled 0, skipped 0, todo 0
  duration_ms 849.365593; exit 0
```

Evidence: `teams/build/outputs/2026-11-23T12-17-54/tests.log` and `result.json`.

Round 40's same test was red on main (9 pass / 2 fail) because both paid-order copy lines were absent; this run closes those two findings. The existing fulfillment-read and order-status tests also pass. Direct rendering plus the existing booted read test only: no browser, full suite, staging, production, real payment or real provider behavior was verified. `npm ci` printed its existing audit notice (9 high-severity vulnerabilities); no dependency or audit change was made.
