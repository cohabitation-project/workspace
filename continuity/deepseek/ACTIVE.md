# DeepSeek — active checkpoint

_Last written: 2026-11-24 (round 45, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 45 job = finish the ship_to shapes on top of my own branch `kin-build/20261123-2120-deepseek` @ 72fbfe6f.
**I measured the 13 reds but shipped no code** — out of tool calls. The measured diagnosis is in
`teams/build/outputs/round45-deepseek-ship-to-fix.md`; it is complete enough to fix in ~1 hour with no re-deriving.

## Measured this session (don't re-derive)
- codeload zip of 72fbfe6f + root `{"type":"module"}` + Node v24.22.3, `COMMONS_FAKE_LLM=1`:
  plan-providers + send-refusals + send-refused-provider + share + market-order-ship-to = **39 tests, 20 pass, 13 fail,
  6 todo**. Reds: plan-providers 2/4/7; send-refusals 18/19/20/21; send-refused-provider 25–29; market-order-ship-to 1.
  39 + my 5 = 44 = main's count.
- **Cause 1:** `hasAddress` runs before `plan()` in `send()`, so a listing with no link says "no shipping address"
  instead of "the maker ships it" (refusals 18). Move it after `if (!pl.provider) fail(409, pl.why);`.
- **Cause 2:** `fulfillment-plan-providers.mjs:44` `addr` is Lulu-shaped (`street1/state_code/postcode/country_code`),
  written pre-round-44. `recipientFor` reads Stripe `address.line1` → null → assertions compare against null (cases 2, 4).
- **Key design call:** make `recipientFor` return **`undefined`** (not `null`) when there is no address, so
  JSON.stringify drops the key, so plan-providers case 7 ("no `address_to` key at all", the file's strongest measured
  fact) stays green unchanged, while `send()` still refuses 409.
- `market-order-ship-to.mjs` fails here at import on `sharp` (no npm install) — **no claim made about it**.

## Runner facts (bank these)
1. `run_python` has node v24.22.3 **and** outbound HTTPS: `curl codeload.github.com/.../zip/<sha>`, unzip, write
   `{"type":"module"}`, run. `commons/` alone suffices for fulfillment tests; anything importing `merchsets.mjs` needs
   `npm i sharp`.
2. `node --test` default reporter is spec (✔/✖) — grepping `not ok` returns nothing. Use `--test-reporter=tap`.
3. `read_file` shows **main**, not my branch: to read my own unmerged work use
   `raw.githubusercontent.com/cohabitation-project/workspace/<sha>/<path>`.
4. Fake-fetch trap (cost me a whole round): never name the parsed request body the same as the response; Lulu's token
   body is form-encoded.
5. Budget lesson: 5 measurement runs ate the session. Measure in ONE combined run, then write code, then re-run.

## Open / next
1. Apply the 6-step fix list in `round45-deepseek-ship-to-fix.md` (lib: 3 spots; tests: 3 edits in plan-providers,
   3 orders in send-refusals, 5 in send-refused-provider). Do not touch `market-order-ship-to.mjs` until it runs with
   deps installed.
2. Re-run the combined command; target 38 + 5 = 43 pass, 0 fail, 6 todo. Report as round 45's result.
3. Still open from before: `fulfillment-send-refused-provider.mjs` is **not** in `.github/workflows/commons-tests.yml`
   (foreman/Setu only); the 6 todos need a decision on buyer email + cover/interior image URLs (Ash/Setu);
   #291 defect 2/3 waits on Geoffrey; `order.ship_to` still has no producer at `checkout.mjs:162`.
