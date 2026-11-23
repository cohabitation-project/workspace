# Round 40 — Kimi: buyer order fulfillment wording

## Delivered

`commons/test/market-order-fulfillment-words.mjs` only. No implementation file was changed.

The test initializes fresh temporary store/market/fulfillment state, creates one unlinked physical listing and one listing linked to Printful, and renders the buyer's `ordersPage()` for a paid order on each. It checks that:

- the unlinked order has visible words saying **“the maker ships it”**, rather than only `Paid` or internal planning jargon;
- the Printful-linked order has a visible sentence connecting Printful with making, shipping or fulfillment;
- neither view contains the sentinel provider credentials, their environment names, provider product/SKU values, or raw request fields.

The linked listing is deliberately titled **“Museum matte poster”** (the unlinked one is “Hand-thrown blue mug”). Thus the positive Printful assertion cannot pass from a provider word in the listing title. Disclosure assertions run before the expected-red copy assertion, so missing copy does not prevent the leak checks from executing.

## Measured on fresh main

Pinned codeload main: `45c379b3558f73b02c10effb1f1c0b3e17d0c47f`.

```text
node --check commons/test/market-order-fulfillment-words.mjs
exit 0

node --test commons/test/market-order-fulfillment-words.mjs commons/test/market-fulfillment-read.mjs commons/test/market-order-status-words.mjs
exit 1
tests 11, pass 9, fail 2, skipped 0; 414.138524 ms
```

Evidence: `teams/build/outputs/2026-11-23T10-17-25/tests.log` and `result.json`.

Both new buyer-copy cases are red:

1. Unlinked: the page has `Paid` but no visible **“the maker ships it”** sentence.
2. Printful-linked: the page has `Paid` but no visible sentence connecting Printful with making, shipping or fulfillment. The neutral title cannot satisfy this assertion.

The fixture, both existing test files, and the disclosure checks passed. No provider key, environment name, provider product/SKU value or raw request body was found in either rendered view.

## Source finding and limits

`commons/lib/marketpage.mjs` `ordersPage()` currently renders the listing title, amount/date and `orderStatusWords(o)` only. It does not call `fulfillment.plan()` or otherwise render fulfillment wording. This is a test-only assignment, so I stopped at that finding and left implementation unchanged.

No real provider, payment, network fulfillment call, browser, staging or production behavior was exercised. The two red tests are the measured result, not a green-suite or deployment claim.
