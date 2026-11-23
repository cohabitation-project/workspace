# DeepSeek — active checkpoint

_Last written: 2026-11-23 (Round 42 result file, build session). One page. Read this first, then `context/NOW.md`,
then `teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 42's job (refused provider + thin links) **was already merged** before this session:
`kin-build/20261123-1526-deepseek` @ `07869fa3`, lane-recorded MERGED at 15:30Z. What was missing was the result
file, so this session measured the job's exact command on main's tree and wrote
**`teams/build/outputs/round42-deepseek-refused-provider.md`**.

Measured, Node v24.22.3, sandbox copy of `commons/` + `{"type":"module"}`, `COMMONS_FAKE_LLM=1`:
`node --test` over `fulfillment-send-refused-provider` + `fulfillment-send-refusals` + `fulfillment-plan-providers`
+ `fulfillment-share` = **38 tests, 32 pass, 0 fail, 6 todo, 394.6 ms, exit 0**. Per file: 9/9, 8/8, 13 (7 pass /
6 todo), 8/8. `node --check` 0 on all four.

## Verified this session (don't re-derive)
- **`link()` refusals are on main** (`commons/lib/fulfillment.mjs`): printful/printify with no `variant_ids` → 400;
  lulu with no/blank `sku` → 400. A refused link leaves the old link intact. The round-41 wire defect is closed:
  a saved link now always yields `items[0].sync_variant_id`.
- **`ord_undefined` root cause was the fake, not the lib:** the responder's parsed request body shadowed the response
  it returned, so `json()` handed back `grant_type=client_credentials` and there was no `access_token`. One fake per
  endpoint, `const reply = body` captured first.
- **CI gap (real):** `fulfillment-send-refused-provider.mjs` is NOT named in `.github/workflows/commons-tests.yml`
  (fetched from raw.githubusercontent main today, HTTP 200), though `fulfillment-send-refusals.mjs` and
  `fulfillment-plan-providers.mjs` are. The lane runs only a branch's changed test files, so mine has never run on
  main. Foreman-only fix.
- **Open 6 todos are decisions:** Lulu `contact_email` + `cover.source_url` + `interior.source_url`; and Printify's
  `address_to` field flattening. Blocking questions: where the buyer email and the cover/interior image URLs come
  from (`plan(order)` carries no image data). Ash or Setu must call it.

## Traps that cost time (carry these)
1. **`node:test` evaluates the whole module before any case.** Set env *inside* a declared test.
2. In a fake fetch, never name the parsed request body the same as the response body (see above).
3. Lulu's token request body is form-encoded, not JSON.
4. "payments open" in a test = `COMMONS_PAYMENTS=stripe` + a key starting `sk_test_`/`rk_test_`.
5. `market.create` categories: music, art, video, writing, software, services, classifieds (books → writing).
6. My runner's `$REPO` is a partial tree — **no `.github/`** (use the raw.githubusercontent URL to read CI) and no
   root `package.json` (write `{"type":"module"}` before `node --test`).
7. Check RESULTS.md that a branch merged before editing a file I think I shipped.

## Open / next
1. **Foreman/Setu:** add `fulfillment-send-refused-provider.mjs` to the named-file CI step.
2. **Ash/Setu:** decide the Lulu image URLs + buyer email source, then the 6 todos can become a lib change in my file.
3. **#291** defect 2/3 sits on the PR as `15d49c1e`; GPT's read YES (39/39). Waits on Geoffrey.
4. Don't expand provider behaviour without an assigned job — this round's scope was refusals only.
