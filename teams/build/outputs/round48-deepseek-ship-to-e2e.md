# Round 48 — DeepSeek: a paid Stripe order reaches the printer with its address, end to end

**Job (JOBS.md, Round 48, DeepSeek):** marketplace, Tier 2, test only. Prove the whole path — paid Stripe checkout
with `shipping_details` → order `ship_to` → `fulfillment.plan(...).request.body.recipient` — and add Printify plus the
no-address refusal. No lib edits.

**Shipped:** `commons/test/market-ship-to-end-to-end.mjs` (new file, 10,620 chars, 3 subtests).
No production code changed: `commons/lib/fulfillment.mjs` is untouched this round (verified — the run below is against
main's own file; the only mutations were in throwaway `/tmp` copies, deleted).

## Measured on main (this session)

Runner: temp copy of `commons/` + `{"type":"module"}`, `COMMONS_FAKE_LLM=1`, `node --test --test-reporter=tap`.
No `npm ci`, so **`sharp` is absent** — see the caveat.

`node --check` on the new test: pass (clean, no syntax error).

| Run | Result |
|---|---|
| new test on main, as written | **4 tests, 4 pass, 0 fail, 0 skip, 0 todo** |
| neighbouring `fulfillment-plan-providers.mjs` | 13 tests, 7 pass, 0 fail, **6 todo** (the known 6) |
| `fulfillment-send-refusals.mjs` | 8 tests, 8 pass, 0 fail |
| `fulfillment-send-refused-provider.mjs` | 9 tests, 9 pass, 0 fail |
| `fulfillment-share.mjs` | 8 tests, 8 pass, 0 fail |
| `market-order-ship-to.mjs` | **1 test, 0 pass, 1 fail** — *cause:* `Cannot find package 'sharp' imported from commons/lib/merchsets.mjs` (`ERR_MODULE_NOT_FOUND`) |

**The `market-order-ship-to` red is this sandbox, not the change.** It is a missing optional dependency, not an
assertion failure; Setu measured that file green with `npm ci` (79 tests / 73 pass / 0 fail / 6 todo, Round 47). I make
no claim that it is green here, and my new file imports none of the modules that need `sharp`.

## Why the test is not vacuous (mutation check, throwaway copies)

A green-on-first-run test proves nothing until it can go red. Two mutants of `fulfillment.mjs` in `/tmp`:

| Mutation | Killed |
|---|---|
| `plan()` posts `recipient: order.ship_to` (raw Stripe shape) instead of `recipientFor('printful', …)` | **case 1 only** (Printful), parent fails |
| `send()` loses `if (!hasAddress(order?.ship_to)) fail(409, 'this order has no shipping address')` | **case 3 only** (no-shipping_details), parent fails |

Each mutant kills exactly the subtest that names the fact it breaks; restored file returns 4/4 pass. So the two
guards round 47 shipped are both actually pinned by this file.

## What the three cases assert

1. **Printful.** Real signed webhook (`checkout.handleEvent(stripe.verifyWebhook(...))`, same signature construction as
   `market-order-ship-to.mjs`) for a paid session carrying `shipping_details` on a Printful-linked listing →
   `order.ship_to === { name, address }`; then `fulfillment.send(order, { fetchImpl: fakePrinter })` makes **exactly one**
   POST to `https://printful.test/orders` with `Authorization: Bearer …`, `X-PF-Store-Id`, `external_id === order.id`, and
   `recipient` = `{ name, address1, address2, city, state_code, country_code, zip }` filled from the buyer's own address.
   Asserts no `email`, `phone` or `country_name` key — nothing invented, no provider gets a field the buyer did not give.
   `send()` returns `provider: 'printful'`, `provider_order: 7001`.
2. **Printify.** Same for a Printify-linked listing: exactly one POST to `/v1/shops/999/orders.json`, and `address_to` is
   `{ first_name: 'Ada B', last_name: 'Lovelace', address1, address2, city, region, country, zip }` for the name
   **"Ada B Lovelace"** — i.e. the split is on the **last** space, so a middle name stays with the first name instead of
   being dropped. No `email` key.
3. **No `shipping_details`.** The same paid webhook without it → order is `paid`, has **no** `ship_to` key,
   `fulfillment.plan(order).provider === 'printful'` (so the printer is known and the link is fine), and `send()` throws
   **409** matching `/no shipping address/` with **zero** printer fetches. That is the round-47 ordering fact: an order with
   no address stops after `plan()` and before any provider call, rather than being told its listing has no link.

## Limits — say plainly

- **Fake Stripe, fake printers.** No network, no keys, no real payment, no real order at Printful or Printify. This proves
  our side of the wire: shape, translation, refusal ordering. It does **not** prove a live printer accepts the payload;
  that needs a nonproduction token (Kimi's round-47 note: printfiles/templates are 401 without auth).
- Printify's `first_name`/`last_name` split on a **one-word** name yields `first_name: 'Cher'`, `last_name: ''` — that is
  `recipientFor` as written, read, not run in a live order. Gemini's five-line review of `recipientFor` answers the same
  question independently.
- Env is restored after the test (`oldEnv`), so the fake keys and `COMMONS_PAYMENTS=stripe` do not leak into other files
  in the same process.
- **Not in CI.** `commons-tests.yml` lists test files explicitly; `.github/` is outside this session's write guard
  (same wall GPT hit on task 071). Board request filed to add
  `commons/test/market-ship-to-end-to-end.mjs` to the line that already runs `market-order-ship-to.mjs`.
