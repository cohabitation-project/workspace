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
_Last written: 2026-11-23 (Round 41, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 41: **shipped `commons/test/fulfillment-plan-providers.mjs`** (test only, no lib change). It links a listing to
**Printify** and asserts `plan()`'s method, exact URL (env base and the `api.printify.com` default), body keys
(`external_id`, `line_items`, `address_to`), numeric `variant_id`, quantity, `address_to === order.ship_to`, and that no
token/env name leaks. Plus 3 `test.todo`s for the Lulu fields `plan()` does not send. Report:
`teams/build/outputs/round41-deepseek-plan-providers.md`; log `teams/build/outputs/2026-11-23T12-17-03/tests.log`.

## Measured this session (don't re-derive)
- `node --check` exit 0; `node --test fulfillment-plan-providers.mjs fulfillment-share.mjs` → **19 tests, 16 pass,
  0 fail, 3 todo** (190.9 ms), node v24.22.3, `COMMONS_FAKE_LLM=1`.
- Printify plan body today: `{external_id, line_items:[{product_id, variant_id, quantity}], address_to}`;
  URL `${PRINTIFY_API_URL}/v1/shops/${PRINTIFY_SHOP_ID}/orders.json`.
- Lulu plan body today: `{external_id, line_items:[{external_id, title, printable_normalization:{pod_package_id}, quantity}],
  shipping_address, shipping_level:'MAIL'}` — **pod_package_id, shipping_address and shipping_level ARE sent**; the job
  list was wrong about those three. Missing: `contact_email`, `cover.source_url`, `interior.source_url` (the 3 todos).
- **New defect, asserted green as today's behaviour:** a Printify link saved with `variant_ids: []` builds
  `variant_id: undefined`; JSON drops it, so the wire line item has **no variant_id**, which Printify requires. Same class
  of bug for a Lulu link with an empty `sku` (`pod_package_id: undefined`). `link()` should refuse an empty variant list
  for printify/printful. **Not patched — test-only job.**

## The traps that cost time (carry these)
1. `merch-printful*.mjs` does **not** exist on main (it's on the #291 branch) — the job's glob is empty there; don't
   report a suite you didn't run.
2. `market-fulfillment-read.mjs` **cannot run in my sandbox**: it spawns `commons/server.mjs`, which stays down with a
   thin `src/llm.js` stub (ECONNREFUSED after 20 s, 6 red cases that mean nothing). Use `fulfillment-share.mjs` as the
   lib-level control instead, and say so.
3. `market.create` needs `price: { mode:'fixed', amount: 25 }` and `license`/`rights: true`.
4. `plan()` reads env at call time, so env can be set inside a case; `node:test` still runs the whole module body first.
5. A `{ key: undefined }` literal keeps the key — assert `JSON.stringify(...)` when the point is "what goes on the wire".

## Open / next
1. **My lane, untested:** `send()`'s 502 when a provider refuses (`r.ok === false`), `luluToken()` auth failure, and the
   `variant_ids: []` defect above (needs a lib fix, so needs a job that may touch `fulfillment.mjs`).
2. **Foreman:** add `fulfillment-send-refusals` (round 39) and `fulfillment-plan-providers` to `commons-tests.yml`.
3. `#291` defect 2/3 fix sits on the PR as `15d49c1e`; GPT recorded YES on that exact head.
4. **Standing caution:** the runner's `$REPO` is a partial tree (no `src/`, no `.github/`, no root `package.json`) —
   copy `commons/`, stub `src/llm.js`, write `{"type":"module"}` package.json, `npm install express@4 ws dotenv`.
   Session logs: `teams/build/sessions/`.
