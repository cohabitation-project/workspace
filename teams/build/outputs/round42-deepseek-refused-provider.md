# Round 42 — DeepSeek, marketplace (Tier 2): refused provider, and links too thin to send

**Setu's job (JOBS.md, 2026-11-23 15:30Z):** (1) make my red control case green in
`commons/test/fulfillment-send-refused-provider.mjs`, (2) make `link()` refuse a Printful/Printify link with no
`variant_ids` and a Lulu link with no `sku` (400, plain words), turn the todo into a real case, touch no other lib.

## State: both parts are already on main

The code landed in the 15:26Z session as branch `kin-build/20261123-1526-deepseek` @ `07869fa3`, recorded by the
lane at 2026-11-23T15:30Z in `teams/build/RESULTS.md` as **MERGED**. The result file below the job asked for was
never written (that session's tools cut off), so this file is that result, measured again on main's tree.

## Measured (not inferred)

Command, run on a copy of `commons/` from this runner's tree with a `{"type":"module"}` package.json and
`COMMONS_FAKE_LLM=1` (Node **v24.22.3**; no npm install needed for these four files):

```
node --test commons/test/fulfillment-send-refused-provider.mjs \
            commons/test/fulfillment-send-refusals.mjs \
            commons/test/fulfillment-plan-providers.mjs \
            commons/test/fulfillment-share.mjs
```

**38 tests, 32 pass, 0 fail, 6 todo, 394.6 ms; exit 0.** Per file:

| file | tests | pass | fail | todo |
|---|---|---|---|---|
| `fulfillment-send-refused-provider.mjs` | 9 | 9 | 0 | 0 |
| `fulfillment-send-refusals.mjs` | 8 | 8 | 0 | 0 |
| `fulfillment-plan-providers.mjs` | 13 | 7 | 0 | **6** |
| `fulfillment-share.mjs` | 8 | 8 | 0 | 0 |

`node --check` exits 0 on all four. No real host is contacted (every provider URL in the tests ends `.invalid`), no
key is real, and payments are "open" only inside a declared test with a fake `sk_test_` key.

## Part 1 — the `ord_undefined` control case: cause and fix

The control case (an accepted Lulu order) read `'ord_undefined'` because of **the fake, not the library**: the
responder named its parsed request body `body`, shadowing the captured response it was meant to return. The Lulu
sign-in body is form-encoded (`grant_type=client_credentials`), so `json()` handed `send()` back that string, no
`access_token` was found, and the failure surfaced as "Lulu sign-in failed" with no order id. Fix, in the test file:
capture `const reply = body` **before** reading the request, and use one fake per endpoint (token vs. print job).
`send()` itself was not changed for this.

What the file now proves, all green: a provider refusal (`ok:false`) is a 502 with plain words and the provider's
status, exactly one call, no `provider_order`; a non-JSON provider body still parses to a plain 502; a failed Lulu
sign-in calls the token endpoint once and **never** `/print-jobs/`; an accepted Lulu order sends the book, the
package, the address and `shipping_level: 'MAIL'`; and no error text or stack carries the token, `Bearer`,
`access_token` or provider HTML.

## Part 2 — thin links are refused at link time

In `commons/lib/fulfillment.mjs` `link()` only:

- `printful` / `printify` with no `variant_ids` → 400 *"<provider> needs at least one variant id: the variant you sell,
  from the product you made in their tool"*.
- `lulu` with no `sku`, or a blank one → 400 *"lulu needs the print package id (its sku) of the book you made"*.
- A refused link changes nothing (the existing link is kept, verified by deep-equal in the test).

The todo is a real case now, and it is asserted at the wire level, not just on the API: after a good link,
`plan()` emits `items[0].sync_variant_id === 4012` for the same listing that round 41 dropped. That closes the round-41
defect ("Printify line items lose `variant_id` when `link()` was saved with `variant_ids: []`") — it can no longer
happen, because such a link cannot be saved.

## Still open — the 6 todos are decisions, not code

`fulfillment-plan-providers.mjs` carries 6 todos naming, with doc URLs, the required fields `plan()` omits:

1. **Lulu print-job:** `contact_email`, `printable_normalization.cover.source_url`,
   `printable_normalization.interior.source_url` (Lulu's openapi requires cover and interior, each requiring
   `source_url`).
2. **Address shape:** Printify's `address_to` wants `first_name, last_name, email, phone, country, region, address1,
   address2, city, zip`; `plan()` forwards `order.ship_to` unchanged, and nothing today defines that shape.

Two of these cannot be built without an answer I should not invent: **where the buyer's email comes from**, and
**where the interior/cover image URLs come from** — `plan(order)` carries no image data, and the file's own design
says the maker designs in the provider's tool. Kimi's round 42 `ship_to` producer (Stripe `shipping_details.name` +
address) makes the address half measurable now; the image and email halves need a design call from Ash or Setu.

## CI gap (foreman action; builders can't write `.github/`)

Read today from `https://raw.githubusercontent.com/cohabitation-project/workspace/main/.github/workflows/commons-tests.yml`
(HTTP 200): the named-file step lists `fulfillment-send-refusals.mjs` and `fulfillment-plan-providers.mjs`, but **not**
`fulfillment-send-refused-provider.mjs`. The lane only runs a branch's *changed* test files, so this file has run on
its own branch and never on main. Adding it to that step is a one-line change only the foreman can make.

**Scope honoured:** two files, both mine — `commons/lib/fulfillment.mjs` (`link()` only) and
`commons/test/fulfillment-send-refused-provider.mjs`. No Tier 1 file touched, no new project, no provider behaviour
expanded past the assigned refusals.
