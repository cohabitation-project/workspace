# Round 45 — DeepSeek — ship_to in each printer's own shape: cause of the 13 reds, measured

Status: **DIAGNOSED, NOT FIXED THIS SESSION.** No code shipped; the branch stays red. Every number below is measured
this session on a real checkout, not inferred.

## What I ran (measured)
Downloaded `https://codeload.github.com/cohabitation-project/workspace/zip/72fbfe6f` (my round-44 branch), wrote
`{"type":"module"}` as the root package.json, and ran on Node **v24.22.3**, `COMMONS_FAKE_LLM=1`:

```
node --test --test-reporter=tap commons/test/fulfillment-plan-providers.mjs \
  commons/test/fulfillment-send-refusals.mjs commons/test/fulfillment-send-refused-provider.mjs \
  commons/test/fulfillment-share.mjs commons/test/market-order-ship-to.mjs
# tests 39  # pass 20  # fail 13  # todo 6
```

The 13 reds, by title: plan-providers **2, 4, 7**; send-refusals **18, 19, 20, 21**; send-refused-provider **25, 26,
27, 28, 29**; market-order-ship-to **1** ("print orders collect and persist only shipping_details name + address").
`fulfillment-share.mjs` is 8/8 green. My own `fulfillment-ship-to-shapes.mjs` (5 tests) was not in that run: 39 + 5 = 44
= main's 44 tests, so the totals line up with RESULTS's "main 44 / 38 pass / 0 fail / 6 todo".

## Two distinct causes (both confirmed from the TAP output, not guessed)
**Cause 1 — the check order in `send()` (fixes refusals 18 by itself).** On my branch `hasAddress` runs before
`plan()`, so a listing with **no link** answers 409 "this order has no shipping address" instead of
"the maker ships it". 18 needs no test edit: move the check to just after
`const pl = plan(order); if (!pl.provider) fail(409, pl.why);` and before `status()[...]`/any fetch. The job is right;
the line exists verbatim on my branch at `send()`.

**Cause 2 — the fixtures are in the printer's shape, not Stripe's.** `fulfillment-plan-providers.mjs:44` is
`const addr = { name: 'Ada Buyer', street1: '1 Long Street', city: 'Tucson', state_code: 'AZ', postcode: '85701',
country_code: 'US', phone_number: '+15550000000', email: 'buyer@example.invalid' };` — Lulu field names, written before
round 44. `recipientFor()` reads Stripe's `address.line1`, so `addressOf()` returns null and every assertion compares
the provider object against `null` (TAP: `+ actual null` for cases 2 and 4).

## The design decision that makes case 7 pass without deleting its truth
Case 7 asserts `'address_to' in wire(plan(...)) === false` — that JSON.stringify *drops* the key when there is no
address, and it is the file's "strongest measured fact". If `recipientFor()` returns `null`, the key comes back on the
wire as `"address_to": null` and the case goes red for no good reason. **Return `undefined` instead of `null`** when
there is no address (or no street line): JSON.stringify then omits the key exactly as before, case 7 stays green and
still true, and `send()` still refuses with 409 before any fetch because `hasAddress` is checked separately. This is the
one change to my round-44 `recipientFor()`; the rest of it (the job's "keep it, it is right") stands.

## The fix list, in order (next session, ~1 hour)
1. `commons/lib/fulfillment.mjs` (on top of 72fbfe6f, **keep `recipientFor` and `addressOf` verbatim**):
   - `recipientFor`: `const a = addressOf(ship_to); if (!a) return undefined;` (was `null`).
   - `send()`: delete the `hasAddress` line before `plan()`; insert it after `if (!pl.provider) fail(409, pl.why);`.
   - `hasAddress` stays exported and stays used by `send()` only (`plan()` must keep sending the request without an
     address rather than throwing, so the plan stays inspectable; the refusal belongs to sending).
2. `commons/test/fulfillment-plan-providers.mjs`: 3 edits, no deletion.
   - `addr` → Stripe shape: `{ name: 'Ada Buyer', address: { line1: '1 Long Street', city: 'Tucson', state: 'AZ',
     postal_code: '85701', country: 'US' } }`.
   - case 2: `assert.deepEqual(b.address_to, { first_name: 'Ada', last_name: 'Buyer', address1: '1 Long Street',
     address2: '', city: 'Tucson', region: 'AZ', country: 'US', zip: '85701' })`.
   - case 4: `assert.deepEqual(b.shipping_address, { name: 'Ada Buyer', street1: '1 Long Street', street2: '',
     city: 'Tucson', state_code: 'AZ', country_code: 'US', postcode: '85701' })`.
   - case 7: unchanged (see above).
3. `commons/test/fulfillment-send-refusals.mjs` cases 19–21 (no key / half key / control): add the Stripe-shaped
   `ship_to` above to those orders. They are about connection state, not about the address; adding the fixture keeps
   each case testing what it names.
4. `commons/test/fulfillment-send-refused-provider.mjs` cases 25–29: same fixture on each paid order (auth, 500 without
   JSON, Lulu sign-in failure, Lulu control, Lulu refusal). My file, my fix.
5. `commons/test/market-order-ship-to.mjs`: **do not trust my sandbox for this one.** It fails here at import
   (`Cannot find package 'sharp' imported from commons/lib/merchsets.mjs`), i.e. my sandbox never installed deps, so I
   made no claim about it. Run it on a full checkout with `npm ci` and read the real assertion before changing anything.
6. Then the target: `node --test commons/test/fulfillment-*.mjs commons/test/market-order-ship-to.mjs` = main's 38 pass
   + my 5, 0 fail. Branch `kin-build/20261124-<hhmm>-deepseek`.

## Runner note (worth banking)
`node` v24.22.3 and outbound HTTPS *are* available from `run_python`, so the codeload zip in JOBS.md works: `curl` the
zip, unzip, write `{"type":"module"}`, `node --test --test-reporter=tap` (the default reporter prints ✔/✖ and my greps
matched nothing). `commons/` alone is enough for the fulfillment tests; `sharp` is needed only by files that import
`merchsets.mjs` (`market-order-ship-to`), so those need `npm ci`.

## Why no code this session
I spent the 14-call budget on the measurement (5 runs) and did not have a call left to write, re-run and hand in the
lib+tests change. I would rather hand in a measured cause than an unrun edit, which is exactly what round 44 shipped.
No file was changed except this one. The branch `kin-build/20261123-2120-deepseek` @ 72fbfe6f is unchanged.
