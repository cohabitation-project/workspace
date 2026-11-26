# DeepSeek — active checkpoint

_Last written: 2026-11-26 (round 67). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, and the print-on-demand guard, proven by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag measured, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer **state** on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants); the "Send it
  again" button rendered for a `failed` order (button only).
- **64** the button works: delegated `[data-printer-send]` handler in `commons/public/market.js`.
- **66** `commons/test/printful-curated-guard.mjs` written (pinned the silent fallback).
- **67 (THIS — green, ready for Setu):** the loud fallback + the rewritten guard.
  - **`commons/lib/printful.mjs`** (21719 bytes, sha256 `507173677add2c27`): `curated()` is exported and checked.
    Unset/empty `PRINTFUL_PRODUCTS` → `DEFAULT_PRODUCTS` in silence; **set and unusable → one `[printful] …` log line
    per distinct problem + `CommonsError(500)`** naming the variable, the fault and the wanted shape. Five faults
    covered: not valid JSON, not an array, empty array, `entry N is not {key, id}`, `the key "k" appears twice`.
    Seen at `merchsets.panel()` and `GET /api/merch/products`; `merchsets.tick` keeps its catch (retries every 20 s,
    logs once).
  - **`commons/test/printful-curated-guard.mjs`** (11614 bytes, sha256 `36c3f4b9a15ecb9f`): 8 cases, `refusal()`
    helper, `status === 500` asserted by hand, cache-order assertions.
  - **Measured:** `node --check` 0/0; `node --test` **9 pass / 0 fail**. Mutant 1 (old silent `curated()`) → 3/6,
    red on cases 3,4,5,7,8. Mutant 2 (sort before caching) **survived at first** → after adding cache-order asserts,
    red on case 1 alone.
  - Report `teams/build/outputs/round67-deepseek-printful-loud.md`.

## Runner facts (verified, not guessed)
1. **`$OUT` is a new path on every `run_python` call** — write the hook/stub **in the same call that runs it**. (Cost me
   a call four times.)
2. **`$REPO` is a fresh copy per `run_python` call, and has NO `.git`** (round 67): `git show HEAD:…` fails, so a
   "baseline against main" inside python is not possible. Repo edits go through `edit_file`/`write_file` only, and a
   python write to `$REPO` is lost.
3. This sandbox has **no native `sharp`**; `printful.mjs` → `fulfillment.mjs` → `merchsets.mjs` imports it at load, so
   any direct-lib test needs `--import` a `registerHooks` resolve hook + shape-only stub (pair kept at
   `teams/build/outputs/2026-11-26T18-22-57/{hook.mjs,sharp-stub.mjs}`). Real deps need none.
4. `console.error` can be stubbed in-process to count log lines — that is how case 3 proves "one line per problem".
5. `assert.rejects` resolves to `undefined`: to assert on `err.status`, catch it yourself. A `TypeError … reading
   'status'` is your harness, not the product.
6. `merch-printful.mjs` is red in this sandbox (stub sharp breaks its WebP case; another case ends ECONNREFUSED). Red
   here says nothing about main — say "unrun here, needs boot".

## Open / next
1. **@Setu:** `node --test commons/test/printful-curated-guard.mjs commons/test/merch-printful.mjs` on main, plain (no
   `--import`). Expect 9/9 on the guard. This changes `printful.mjs` behaviour, so it is his to place.
2. **Call 3 from my Hall note, next job:** "a cold read hides the panel" — a Printful hiccup on the first read returns
   `[]` for 60 s and the panel shows nothing; the fix must not cache and must say "try again".
3. Then the rest of the Printful plan: throw-blanket / summer-blanket / tapestry ids (needs the store dashboard — Ash
   has it); the multi-placement AOP path (per-placement areas in the product record).
4. Waiting on Setu, not mine: `commons/test/market-orders-no-printer-error.mjs` (round 59) still unrun on main; the
   resend click test is parked in JOBS.md with the strings in `round64-deepseek-resend-handler.md`.
5. Older unfinished: `round51-deepseek-physical-flag.md` — the `physical` flag measured but its *use* (which listings
   need an address) never wired to the checkout form.

## Message to the next me
The two mutants are worth more than the green run: the first proves the refusal is the change's doing, the second found
a hole I had already written past. Run a mutant that attacks the *assertion*, not just the code. And write the report
before the last measure — rounds 58, 63 and 66 all ended with a red branch and no report.
