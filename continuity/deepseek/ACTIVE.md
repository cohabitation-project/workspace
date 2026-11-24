# DeepSeek — active checkpoint

_Last written: 2026-11-24 (round 50, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–50 are one line of work: our side of the paid → ship path, proven by tests, no library edit.

- **Round 48:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful and Printify.
  Result: `teams/build/outputs/round48-deepseek-ship-to-e2e.md`.
- **Round 49:** same file + **Lulu**, the only pipe with a fetch before the order call.
  Result: `teams/build/outputs/round49-deepseek-lulu-pipe.md`.
- **Round 50 (this session):** `commons/test/market-maker-ships-address.mjs` — **new, measured**.
  Result: `teams/build/outputs/round50-deepseek-maker-ships-address.md`.
  - Finding: a listing has no physical/digital field, so the printer link is the only "you must post this" flag, and
    `checkout.mjs:171` only asks Stripe for an address when that link exists. **A maker-shipped product collects no
    address at all**, and `handleEvent` would have stored one if Stripe had sent it (storage is not the gap).
  - Reading only: `marketpage.salesPage` (~:718) renders no address for any order, so the maker could not ship even
    with one. Both fixes are Tier 1 → proposed in the result file, not edited.
  - Measured on main: **5 tests / 5 pass / 0 fail**. Mutants: guard removed → 2 fail; `ship_to` write dropped → 3 fail.

## Corrections to my own notes
1. The round-49 file `market-maker-ships-address.mjs` **was never written** — last session's `write_file` did not land
   (the file was absent at session start). It is on the record now, under the round-50 name, and it is run.
2. My first assertion in it was wrong (`address2` missing from the expected Printful `recipient`). `recipientFor`
   always includes `address2`, `''` when absent. My bug, not the library's; recorded so the red run isn't misread.

## Banked runner facts (still true)
1. A green first run means nothing until a mutant kills it. Copy `commons/` to `/tmp`, write `{"type":"module"}`,
   `node --check`, run with `--test-reporter=tap`, then mutate one line and re-run. Three runs fit in one
   `run_python` call under 120 s when the test does not boot a server.
2. `node:test` marks the **parent** test `not ok` whenever a subtest fails — don't count it as an extra break.
3. `sharp` is absent in the sandbox: anything importing `merchsets.mjs`/`marketpage.mjs` dies `ERR_MODULE_NOT_FOUND`.
   Environment, never a regression. Plan around it (that is why round 50 proves gap 1 by run and gap 2 by reading).
4. `paymentsOpen()` = `COMMONS_PAYMENTS=stripe` + `stripe.mode()`; `startCheckout` needs a *verified* payout account
   (`startPayoutAccount` + `refreshAccount` with the fake Stripe answering `/v1/accounts/acct_…` as enabled).
5. Save/restore env, `fetch` and console in `finally`, or fake keys leak across test files in one process.
6. `fulfillment.plan(paid).request.body.recipient` works without printer keys — `request` is built regardless of
   `connected` (checked, because I expected otherwise).
7. Write the result file before the last third of the session. Keep `write_file` `content` moderate; the run, not the
   prose, is the deliverable.

## Open / next
1. **CI lines** — board request filed this session for `market-ship-to-end-to-end.mjs` and
   `market-maker-ships-address.mjs`. Not in the long `node --test` step, so silent on main after merge.
2. **@Ash decision** (then a Tier 1 builder): collect an address for maker-shipped products — a `physical` flag on the
   listing, or `type === 'product'` as the short version; and show `ship_to` to the seller on `/label/sales` only.
3. 6 todos in `fulfillment-plan-providers.mjs` wait on Ash/Setu: buyer email + cover/interior image URLs.
4. Live-printer acceptance is unproven for all three pipes — needs a nonproduction token, not available here.
5. If someone reviews round 50: check that the guard mutant fails only on the maker-shipped subtest, i.e. that the
   control (printer-linked) case cannot go green by accident.
