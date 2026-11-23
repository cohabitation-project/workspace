# DeepSeek — active checkpoint

_Last written: 2026-11-23 (Round 40, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 40: **`commons/test/fulfillment-plan-providers.mjs` shipped** (test only, no lib change). It asserts what
`plan()` builds for printify and lulu against both providers' docs, and carries **6 `test.todo`s** for required fields
the code omits. Report: `teams/build/outputs/round40-deepseek-fulfillment-plan-providers.md`.
Measured in a sandbox copy: `fulfillment-plan-providers` 7 pass / 6 todo / 0 fail; the job's three-file command
**29 tests, 23 pass, 0 fail, 6 todo** (491.5 ms); `node --check` exit 0.

## Measured this session (don't re-derive)
- **`order.ship_to` has no producer.** `checkout.mjs:162` builds an order with no shipping address and `grep -rn
  ship_to commons/` hits only `fulfillment.mjs`. So a real order's request has no `recipient` / `address_to` /
  `shipping_address` at all (JSON.stringify drops undefined). This is the blocking wiring gap, bigger than the
  per-provider field gaps.
- **plan() today:** printify `POST /v1/shops/{PRINTIFY_SHOP_ID}/orders.json`, body `{external_id, line_items[{product_id,
  variant_id, quantity}], address_to}`; placeholder `<shop>` when the shop id is unset. lulu `POST /print-jobs/`, body
  `{external_id, line_items[{external_id=provider item id, title, quantity, printable_normalization:{pod_package_id}}],
  shipping_address, shipping_level:'MAIL'}`, base `https://api.sandbox.lulu.com` unless `LULU_LIVE=1`. plan() calls
  fetch 0 times and leaks no key.
- **Lulu spec facts** (fetched 2026-11-23 from `https://api.lulu.com/api-docs/openapi-specs/openapi_public.yml`; needs a
  browser User-Agent or it 403s): Print-Job `required: id, status, line_items, shipping_address, contact_email,
  shipping_level` (id/status readOnly); `printable_normalization` requires `cover` and `interior`, each requiring
  `source_url`; `shipping_address` requires `name, street1, city, country_code, postcode, phone_number, email`. The POST
  request body's own `required:` block I did **not** read literally — say so if asked.
- **Printify** (`https://developers.printify.com/#create-an-order`): `line_items` (product_id, variant_id, quantity) and
  `address_to` (first_name, last_name, email, phone, country, region, address1, address2, city, zip) required;
  `shipping_method` optional (1 std default); `print_areas` only when the order creates the product.

## Traps that cost time (carry these)
1. **`node:test` evaluates the whole module before any case.** Set env *inside* a declared test, in the order you need;
   top-level `Object.assign(process.env, …)` applies to every case.
2. "payments open" in a test = `COMMONS_PAYMENTS=stripe` + a key starting `sk_test_`/`rk_test_`.
3. `send()`'s gate order is payments → `status==='paid'` → link → connected.
4. `images.ownedBy()` is not an ownership check; `images.upload()` de-dupes on post-strip bytes.
5. `market.create` needs `price: { mode: 'fixed', amount: 25 }`, `license`, `rights: true`.

## Open / next
1. **Foreman/Setu:** add `fulfillment-plan-providers` to `commons-tests.yml` (and confirm `fulfillment-send-refusals`
   from Round 39 is in — JOBS.md Round 40 says it is). Builders can't write `.github/`.
2. **My lane, still untested:** `send()`'s 502 when a provider refuses (`r.ok === false`), and `luluToken()`'s auth
   failure. Same file, green today.
3. The 6 todos are the fix list for fulfillment wiring; the address field is the blocking one.
4. **#291** defect 2/3 fix sits on the PR as `15d49c1e`; GPT reviewed that exact head YES (39/39). Waits on Geoffrey.
5. **Standing caution:** the runner's `$REPO` is a partial tree (no `src/`, no `.github/`, no root `package.json`) —
   stub `src/llm.js` and write `{"type":"module"}` before any server-booting test. Session logs: `teams/build/sessions/`.
