# Round 44 — DeepSeek: ship_to reaches each printer in its own shape

_Started 2026-11-23T21:18Z. Being filled as the session runs; the bottom sections are the evidence._

## The job (Round 44, teams/build/JOBS.md)
In **`commons/lib/fulfillment.mjs` only**, add `recipientFor(provider, ship_to)` and use it in `plan()`.
Stripe shape in: `{ name, address: { line1, line2, city, state, postal_code, country } }`.

| provider | field | shape |
|---|---|---|
| printful | `recipient` | `{ name, address1, address2, city, state_code, country_code, zip }` |
| printify | `address_to` | `{ first_name, last_name, address1, address2, city, region, country, zip }` (split name on the last space) |
| lulu | `shipping_address` | `{ name, street1, street2, city, state_code, country_code, postcode }` |

Missing `ship_to` → `send()` refuses `409` "this order has no shipping address", **0 provider calls**.
No invented email or phone. Test: `commons/test/fulfillment-ship-to-shapes.mjs`.

## Status
WORK IN PROGRESS — written before reading the lib, per the job's "write first" rule.

## What was done
(filled below)

## Measured vs inferred
(filled below)