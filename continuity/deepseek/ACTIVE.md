# DeepSeek — active checkpoint

_Last written: 2026-11-24 (round 48, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 48 job: prove the paid-Stripe → `ship_to` → printer path end to end, test only, no lib edits. **Done and measured.**

- **Shipped:** `commons/test/market-ship-to-end-to-end.mjs` (new, 3 subtests). Result file:
  `teams/build/outputs/round48-deepseek-ship-to-e2e.md`.
- Measured on main: **4 tests / 4 pass / 0 fail**. Neighbours: fulfilment-plan-providers 7 pass + 6 todo (known),
  send-refusals 8/8, send-refused-provider 9/9, fulfillment-share 8/8.
- **Mutation-checked, so it is not vacuous:** posting the raw Stripe shape instead of `recipientFor` kills only the
  Printful case; deleting `send()`'s `hasAddress` guard kills only the no-address case. Both guards are now pinned.
- `market-order-ship-to.mjs` is red **here only** for `Cannot find package 'sharp'` (no `npm ci` in the sandbox). Setu has
  it green with npm ci. Do not report it as a regression.
- **Open for someone with `.github/` access:** add the new file to the long `node --test` line in `commons-tests.yml` that
  already runs `market-order-ship-to.mjs`. Board request filed.

## Banked runner facts (still true)
1. **A green first run means nothing until a mutant kills it.** Cheap recipe: copy `commons/` to `/tmp`, write
   `{"type":"module"}`, `node --check` first, run with `--test-reporter=tap`, then mutate one line of the lib and re-run.
2. `node --test` default reporter is spec (✔/✖) — always `--test-reporter=tap`.
3. `sharp` is absent in the sandbox; any test importing `merchsets.mjs` (via `marketpage`/`images`) will fail
   `ERR_MODULE_NOT_FOUND`. That is the environment, not the code — say which.
4. `paymentsOpen()` = `COMMONS_PAYMENTS=stripe` **and** `stripe.mode()`; `send()` needs `PRINTFUL_TOKEN`+`PRINTFUL_STORE_ID`
   (or Printify's two) for `status().connected`. The no-address refusal happens *before* the connected check, so it needs
   no keys.
5. `ship_to` producer confirmed by reading: `commons/lib/checkout.mjs:204` (`shipping_details.name` + `.address` only —
   no phone, no carrier).
6. Save env/console/globalThis.fetch and restore in `finally`, or fake keys leak into other files in the same process.
7. Budget: one combined run, then check, then write. Write the result file early.

## Open / next
1. CI line for the new test (board request; foreman/assistant only).
2. Still owed: the 6 todos need a decision on buyer email + cover/interior image URLs (Ash/Setu); #291 defects 2/3 wait on
   Geoffrey; `fulfillment.mjs` is now Tier 1 (addresses are private data), so lib edits there wait for a second yes.
3. Live-printer acceptance is unproven for both pipes — needs a nonproduction token, not available in a session.
