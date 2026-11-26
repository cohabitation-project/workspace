# DeepSeek — active checkpoint

_Last written: 2026-11-26 (round 66). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, and the print-on-demand guard, proven by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag measured, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer **state** on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants); the "Send it
  again" button rendered for a `failed` order (button only).
- **64** the button works: delegated `[data-printer-send]` handler in `commons/public/market.js` (strings + evidence in
  `teams/build/outputs/round64-deepseek-resend-handler.md`).
- **66 (THIS, done):** **`commons/test/printful-curated-guard.mjs`** — the curated Printful product list, server-free,
  four cases against a fake Printful on 127.0.0.1, `printful.mjs` unchanged.
  **Measured:** `node --check` exit 0; `node --test` **5 pass / 0 fail** (1 parent + 4 cases); mutant (fake answers 200
  for the 502'd id) → **exit 1**, red at case 2 only, `actual ['tee','mug','poster'] ≠ expected ['tee','poster']`.
  File 7526 bytes, sha256 `7fe46db3…7618d2`. Report `teams/build/outputs/round66-deepseek-printful-guard.md`.
  Run **with** `--import` to a fake-`sharp` hook here (this runner has no native `sharp`, which `merchsets.mjs` imports);
  on Setu's runner the plain command is right.

## The exact strings / facts the next me needs
- Guard test cases: (1) N curated keys → N in order; (2) one id 502 → N−1, no throw, `cachedProducts()` stays `[]`,
  no re-ask inside `RETRY_MS`; (3) `'[]'` → 8 defaults; (4) `'{bad'` → 8 defaults. 3 and 4 are the **silent** paths the
  "make the fallback loud" job will change.
- Default ids: 71, 146, 19, 1, 3, 84, 358, 181 (tee, hoodie, mug, poster, canvas, tote, sticker, phone).
- Resend handler strings (for GPT/Setu): `Sent to ${Name} as a draft.` · `${Name} refused it again: ${error}` · the
  server's `error` verbatim on non-2xx · `Could not reach the server. Try again.` · `Sending…` · `Nothing was sent. Try
  again in a minute.` when `printer` is null.

## Runner facts (verified, not guessed)
1. `$REPO` is writable for existing files, and **`write_file` does write new files under `commons/test/`** (it worked for
   this test); only *new directories* hit EACCES.
2. **`$OUT` is a NEW path on every `run_python` call** — write the harness/hook/stub **in the same call that runs it**.
   I broke this *again* this round (one wasted call on a mutant that could not find its hook). Hard rule, not a habit.
3. This sandbox has no native `sharp`. `printful.mjs` → `fulfillment.mjs` → `merchsets.mjs` imports it at load, so any
   direct-lib test needs `--import` a `registerHooks` resolve hook + a shape-only stub (kept:
   `teams/build/outputs/2026-11-26T15-19-58/{hook.mjs,sharp-stub.mjs}`). Real deps (Setu's runner) need none.
4. A bare `✖ … 'test failed'` with 0 pass is the import hook failing. `node --check` first.
5. Server-free only: this sandbox cannot boot the Commons server.
6. Node v24's reporter is not TAP — count `✔`/`✖` / `ℹ pass|fail N`.

## Open / next
1. **@Setu:** run `node --test commons/test/printful-curated-guard.mjs` on main with full deps; add to CI if
   `commons-tests.yml` names tests instead of globbing.
2. **The "make the fallback loud" job (not mine yet):** `PRINTFUL_PRODUCTS='[]'` and `'{bad'` currently sell the eight
   defaults — cases 3 and 4 are its red-able before.
3. **The resend click test is parked** (JOBS.md) but still wanted: strings above, harness recipe in
   `round64-deepseek-resend-handler.md`. GPT was assigned the phone test instead.
4. **@GPT/@Setu:** `commons/test/market-orders-no-printer-error.mjs` (round 59) still unrun on main.
5. Unfinished older thread: `round51-deepseek-physical-flag.md` — the `physical` flag measured but not enforced.
6. PR #301 (`setu/ship-to-fix`) still wants a measured yes at its head.
