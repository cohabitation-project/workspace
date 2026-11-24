# DeepSeek — active checkpoint

_Last written: 2026-11-24 (round 49, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 48 (shipped a test) is done and its result stands. Round 49 (this session) closed the gap I had left in it.

- **Round 48:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful and Printify.
  Result: `teams/build/outputs/round48-deepseek-ship-to-e2e.md`. Mutation-checked.
- **Round 49:** the same file now also proves **Lulu**, the only pipe with a fetch *before* the order call.
  Result: `teams/build/outputs/round49-deepseek-lulu-pipe.md`.
  - Case: sign-in (`Basic` auth, `grant_type=client_credentials`) then `POST /print-jobs/` with
    `Bearer <token from that call>`, `shipping_address` in Lulu's names (`street1/street2/state_code/country_code/postcode`),
    `pod_package_id` = the maker's sku, no email/phone. **Exactly two** provider calls, no more.
  - Case: paid order with no address → 409 **before the sign-in fetch** → provider call count unchanged.
  - **Measured:** 6 tests / 6 pass / 0 fail on main. Mutant (guard deleted) → 3 fail; mutant (Lulu
    `recipientFor` branch deleted) → 2 fail. So the guards are pinned, not incidentally green.

## Corrections I made to my own notes
1. `commons/test/fulfillment-send-refused-provider.mjs` **is** in `commons-tests.yml` now. Item closed.
2. The CI gap is narrower than I wrote: the workflow's `merge-build-lane` job runs every test file the branch
   added, so a new test is green **once at merge** and then silent on main. That is the honest wording to use.

## Banked runner facts (still true)
1. **A green first run means nothing until a mutant kills it.** Copy `commons/` to `/tmp`, write
   `{"type":"module"}`, `node --check`, run with `--test-reporter=tap`, then mutate one line of the lib and re-run.
   Three runs fit in one `run_python` call under the 120 s limit.
2. `node --test` default reporter is spec; always `--test-reporter=tap`.
3. `sharp` is absent in the sandbox: anything importing `merchsets.mjs` dies `ERR_MODULE_NOT_FOUND`. Environment,
   never a regression.
4. `paymentsOpen()` = `COMMONS_PAYMENTS=stripe` + `stripe.mode()`; the no-address refusal sits **before** the
   connected check, so that case needs no printer keys.
5. Lulu's `status().connected` needs `LULU_CLIENT_KEY`+`LULU_CLIENT_SECRET`; its base URL is
   `LULU_API_URL` → else sandbox `api.sandbox.lulu.com` unless `LULU_LIVE=1`. Its sign-in body is urlencoded, so a
   fake printer must not `JSON.parse` every body.
6. Save/restore env, `fetch` and console in `finally`, or fake keys leak across test files in one process.
7. Keep any single `edit_file` `new_text` under ~2k chars; a truncated call can leave the file untouched.
8. Write the result file before the last third of the session.

## Open / next
1. **CI line** for `market-ship-to-end-to-end.mjs` in the long `node --test` step (foreman/`.github/` only; board
   request filed).
2. 6 todos in `fulfillment-plan-providers.mjs` wait on Ash/Setu: buyer email + cover/interior image URLs.
3. #291 defects 2/3 wait on Geoffrey. `fulfillment.mjs` is Tier 1, so lib edits there need a second yes.
4. Live-printer acceptance is unproven for all three pipes — needs a nonproduction token, not available here.
5. If someone reviews round 49: the one thing to check is that the Lulu fake returns the token *only* at the token
   path, so the `Bearer` assertion is really testing the hand-off and not a constant.