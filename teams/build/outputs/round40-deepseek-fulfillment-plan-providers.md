# Round 40 — DeepSeek: what `plan()` would send to Printify and Lulu, checked against their docs

**Job (teams/build/JOBS.md, Setu, 2026-11-23 09:30Z):** write `commons/test/fulfillment-plan-providers.mjs`; assert
method, URL path and every body field for the printify and lulu branches of `plan()`; for every field a doc requires
that `plan()` omits, add a `test.todo` naming the field and the doc URL. **Tier 2, test file only — no lib change.**

## What shipped
- `commons/test/fulfillment-plan-providers.mjs` — new, test only. `commons/lib/fulfillment.mjs` untouched.

**Measured** (sandbox copy of the runner's tree: `commons/` + stubbed `src/llm.js` + `{"type":"module"}` root
package.json + `npm install express@4 ws dotenv`; node v24.22.3, `COMMONS_FAKE_LLM=1`, no real keys, no network):

```
node --check commons/test/fulfillment-plan-providers.mjs        -> exit 0
node --test fulfillment-plan-providers.mjs fulfillment-send-refusals.mjs fulfillment-share.mjs
  tests 29 | pass 23 | fail 0 | cancelled 0 | skipped 0 | todo 6 | 491.5 ms
```
`fulfillment-plan-providers` alone: 7 cases pass, 6 todo, 0 fail.

## What the code does today (asserted, not described)
Both providers, `plan()` at `commons/lib/fulfillment.mjs:72`:

| | Printify | Lulu |
|---|---|---|
| method / path | `POST /v1/shops/{PRINTIFY_SHOP_ID}/orders.json` | `POST /print-jobs/` |
| default base | `https://api.printify.com` | `https://api.sandbox.lulu.com` (live only with `LULU_LIVE=1`) |
| body keys | `external_id`, `line_items[]`, `address_to` | `external_id`, `line_items[]`, `shipping_address`, `shipping_level: 'MAIL'` |
| line item | `product_id`, `variant_id` (numeric string → number), `quantity` | `external_id` (= provider item id), `title`, `quantity`, `printable_normalization: { pod_package_id }` |

Also asserted: with no `PRINTIFY_SHOP_ID` the URL keeps a visible `<shop>` placeholder (no silent wrong shop); `plan()`
calls `fetch` **0 times** (it is a plan, not a send); no configured token/key/secret appears anywhere in a plan
(`plan()` output is buyer-visible).

## The finding that matters more than either branch
**`order.ship_to` has no producer.** `checkout.mjs:162` builds the order as
`{ id, listing, title, buyer, seller, amount, currency, fee_cents, mode, status, ts }` — no shipping address — and
`grep -rn ship_to commons/` finds it only in `fulfillment.mjs` itself. So for a real order today `JSON.stringify`
drops the key: Printify receives no `address_to`, Lulu no `shipping_address`, Printful no `recipient`. The test asserts
this measured fact (`an order with no ship_to produces a body with no address key at all`). It is a wiring gap, not a
typo: nobody has decided where a buyer's address is collected or how it is stored.

## Doc-checked omissions (6 `test.todo`, each naming field + doc URL)
Lulu, from the OpenAPI spec (`https://api.lulu.com/api-docs/openapi-specs/openapi_public.yml`, fetched 2026-11-23):
1. `contact_email` — a documented request property, and required on the Print-Job resource
   (`required: id, status, line_items, shipping_address, contact_email, shipping_level`; `id`/`status` are `readOnly`).
2. `line_items[].printable_normalization.cover` and 3. `.interior`, each requiring a `source_url` — the spec's
   `printable_normalization` marks `interior` and `cover` required and each of those requires `source_url`; the doc prose
   is "Interior and cover files have to be specified with a URL from which Lulu can download the files". Today only
   `pod_package_id` is sent, so a real Lulu job has no file to print.
4. Lulu `shipping_address` keys — required `name, street1, city, country_code, postcode, phone_number, email` (verbatim
   from the spec). `plan()` forwards `order.ship_to` unchanged; nothing guarantees those keys.
Printify (`https://developers.printify.com/#create-an-order`):
5. `address_to` keys — required `first_name, last_name, email, phone, country, region, address1, address2, city, zip`.
   Same problem: passed through unchanged.
6. Both: an order needs a real shipping address at all (the finding above).

## Limits — what I did not check
- **Docs, not the live APIs.** Nothing was sent; no provider key exists here. Printify's required key list comes from
  its docs page (fetched today); Lulu's from the OpenAPI spec (fetched today). I did **not** read the `required:` block of
  the POST `/print-jobs/` *request body* literally — the `contact_email` requirement I quote is from the Print-Job
  resource schema and the documented POST example, which is why the todo says "required on a Print-Job".
- `send()`'s 502 when a provider refuses, and `luluToken()`'s auth failure, are still untested (my lane, next).
- No browser, staging or production check. The runner's tree is partial; measurements are from a sandbox copy.

## Next
1. Foreman/Setu: add `fulfillment-plan-providers` to `commons-tests.yml` (builders can't write `.github/`).
2. The six todos are the work list for whoever fixes fulfillment wiring — the address field is the blocking one.
3. My next: `send()` 502 on `r.ok === false`, and `luluToken` failure (both are the same file, still green today).
