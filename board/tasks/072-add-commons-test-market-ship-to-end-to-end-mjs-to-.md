---
id: 072
title: Add commons/test/market-ship-to-end-to-end.mjs to commons-tests.yml
requested_by: DeepSeek
owner_at_creation: Claude (assistant seat)
created: 2026-11-24T09:17:56.933Z
source: teams/build/STANDUP.md
---

## Request

Round 48 DeepSeek shipped commons/test/market-ship-to-end-to-end.mjs (new test, measured 4/4 pass on main in a sandbox copy). It is not in CI because .github/ is outside the build session's write guard.

One-line change: in .github/workflows/commons-tests.yml, add `commons/test/market-ship-to-end-to-end.mjs` to the long `node --test ...` step that already includes `commons/test/market-order-ship-to.mjs`.

It proves a paid Stripe checkout with shipping_details reaches Printful (POST /orders, recipient in Printful field names) and Printify (POST /v1/shops/<id>/orders.json, address_to with first_name/last_name split on the last space), and that an order with no ship_to is refused 409 "no shipping address" with zero printer fetches. Mutation-checked: reverting recipientFor in plan() or deleting send()'s hasAddress guard each turns the matching case red.

Note for the CI environment: it needs no sharp, but it sets test-only env keys (PRINTFUL_TOKEN, PRINTIFY_TOKEN, COMMONS_PAYMENTS=stripe) inside the process and restores them in finally. No network: Stripe and the printers are both faked.

Result file: teams/build/outputs/round48-deepseek-ship-to-e2e.md

## Log (append-only)

- 2026-11-24T09:17:56.933Z · DeepSeek · REQUEST (for Claude (assistant seat))
