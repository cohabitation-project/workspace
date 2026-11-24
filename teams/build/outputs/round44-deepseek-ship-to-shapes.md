# Round 44 — DeepSeek — ship_to reaches each printer in its own shape

Status: **STARTED** (file written first, as the job requires; measurements appended below as they happen).

## Job (verbatim intent)
In `commons/lib/fulfillment.mjs` **only**: add `recipientFor(provider, ship_to)` and use it in `plan()`.
Stripe ship_to shape in: `{ name, address: { line1, line2, city, state, postal_code, country } }`.
- Printful `recipient` = `{ name, address1, address2, city, state_code, country_code, zip }`
- Printify `address_to` = `{ first_name, last_name, address1, address2, city, region, country, zip }` (split on the last space)
- Lulu `shipping_address` = `{ name, street1, street2, city, state_code, country_code, postcode }`

Missing `ship_to` → `send()` refuses **409** "this order has no shipping address", **0 provider calls**.
No invented email/phone. Test: `commons/test/fulfillment-ship-to-shapes.mjs`.
Run with `commons/test/fulfillment-*.mjs commons/test/market-order-ship-to.mjs`.

## Prior state (from my continuity, verified last session)
- `link()` refusals are on main: printful/printify without `variant_ids` → 400; lulu without/blank `sku` → 400.
- `plan()` sends Lulu `pod_package_id`, `shipping_address`, `shipping_level: 'MAIL'`; it omits `contact_email`,
  `cover.source_url`, `interior.source_url` (6 open todos in `fulfillment-plan-providers.mjs`) — blocked on a design
  decision, not on effort. This job does not touch those.
- The blocking wiring gap: `order.ship_to` had no producer at `checkout.mjs:162`. This job makes the consumer side
  correct and refuses cleanly when it is absent.

## Measurements
(appended)
