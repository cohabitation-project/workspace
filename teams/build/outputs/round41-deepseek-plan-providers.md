# Round 41 — DeepSeek: `fulfillment.plan()` for Printify, and what Lulu is missing

**Job:** Tier 2, test only. Write `commons/test/fulfillment-plan-providers.mjs`, link a listing to Printify, assert the
plan's method, URL and every body field; add one `test.todo` per Lulu field the job list named that `plan()` omits.
**No lib file was changed.** Branch `kin-build/20261123-<hhmm>-deepseek` (the runner opens it).

## Measured (sandbox, node v24.22.3, `COMMONS_FAKE_LLM=1`)

- `node --check commons/test/fulfillment-plan-providers.mjs` → exit 0.
- `node --test commons/test/fulfillment-plan-providers.mjs commons/test/fulfillment-share.mjs` →
  **19 tests, 16 pass, 0 fail, 3 todo** (190.9 ms). Log: `teams/build/outputs/2026-11-23T12-17-03/tests.log`.
- My file alone is 10 cases: 7 green assertions + 3 todos.
- **Not run:** `commons/test/merch-printful*.mjs` — no such file on main (it lives on the #291 branch), so the glob is
  empty. `commons/test/market-fulfillment-read.mjs` was tried and **could not run in my sandbox**: it boots
  `commons/server.mjs`, which stays down with the thin `src/llm.js` stub I use (ECONNREFUSED after 20 s). That is a
  sandbox limit, not a red test; CI should run it. `fulfillment-share.mjs` is the substitute I ran.

## What the test asserts about Printify, as `plan()` stands today

| what | value asserted |
|---|---|
| provider | `printify` |
| method | `POST` |
| url | `${PRINTIFY_API_URL}/v1/shops/${PRINTIFY_SHOP_ID}/orders.json` |
| url, env unset | `https://api.printify.com/v1/shops/<shop>/orders.json` |
| body keys, exactly | `external_id`, `line_items`, `address_to` |
| `external_id` | the order id |
| `line_items[0]` keys | `product_id`, `variant_id`, `quantity` |
| `variant_id` | a **number** (`Number('4321')` → 4321) |
| `quantity` | the order quantity |
| `address_to` | `order.ship_to`, passed through untouched |
| secrets | no token, key or env name anywhere in the plan JSON |
| unlinked listing | `provider: null`, no request, why = "the maker ships it" |

The Printify shape matches Printful/Printify's documented order fields for a listing linked to an existing product
(cf. round 40's doc notes); no `print_areas`, because we never create the product in the order.

## Finding 1 (new, real): a Printify link with no variants plans an order Printify will refuse

`link()` accepts `variant_ids: []` without complaint (`fulfillment.mjs`, the `vids` line filters and slices, no minimum).
`plan()` then builds `variant_id: Number(undefined) || undefined` → the key exists with an **`undefined` value**, so
`JSON.stringify` drops it and the line item on the wire is `{"product_id":"prod-0","quantity":2}` — **no `variant_id`**.
Printify's docs mark `variant_id` required on every line item, so such an order would be refused by the provider, not by
us. Asserted as today's behaviour (green) so a later fix has a red-to-green test waiting; recorded here, not patched —
this was a test-only job.

## Finding 2 (corrects the job's Lulu list): three of the six named fields *are* sent

Reading `commons/lib/fulfillment.mjs` (the last branch of `plan()`), the Lulu body today is
`{ external_id, line_items: [{ external_id, title, printable_normalization: { pod_package_id }, quantity }],
shipping_address, shipping_level: 'MAIL' }`. So:

- **Sent:** `line_items[].printable_normalization.pod_package_id` (from the link's `sku`), `shipping_address`
  (`order.ship_to`), `shipping_level` (`'MAIL'` hard-coded). The test asserts all three, plus `title` and `quantity`.
- **Not sent — the three todos:**
  1. `contact_email` — nothing in the body carries the buyer's email at the top level.
  2. `line_items[].printable_normalization.cover.source_url`.
  3. `line_items[].printable_normalization.interior.source_url`.

A `test.todo` per omitted field, as the job asked, but **three, not six**, because six would have been a false claim.

## What a fix will need (for whoever gets that job)

`plan(order)` receives only the order, and the order carries no image URLs. `cover.source_url` / `interior.source_url`
therefore need either the listing's images resolved inside `plan()` (it can reach `market.get(order.listing)`) or new
fields on the order at checkout. `contact_email` is already in `order.ship_to.email` for the Printify shape, so that one
is a one-line addition; the image URLs are a design question, not a typo — worth Setu/Ash deciding before anyone writes it.
Also unhandled: `pod_package_id` comes from the link's `sku`, so a Lulu link saved with an empty sku plans
`pod_package_id: undefined` — same class of bug as Finding 1.

## Limits

No network call, no provider account, no staging or production check. Everything above is read from main's source and
measured in a copy of `commons/` with `src/llm.js` stubbed.
