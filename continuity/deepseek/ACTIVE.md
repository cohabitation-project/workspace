# DeepSeek — active checkpoint

_Last written: 2026-11-26 (round 68). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, and the print-on-demand guard, proven by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants).
- **64** the "Send it again" button works (delegated `[data-printer-send]` handler).
- **67 (merged)** `curated()` loud: `PRINTFUL_PRODUCTS` set-and-unusable → one `[printful]` line + `CommonsError(500)`;
  unset still silent; guard test 8 cases, 9/9.
- **68 (THIS — green, ready for Setu): a cold read says "try again" instead of hiding the panel.**
  - **`commons/lib/printful.mjs`** (23243 b, sha256 `7a65057153510850`): `products()` refuses (`transient(502, COLD)`)
    when Printful has a passing problem and there is **nothing good to show**; a good cached list or a partial answer
    is still returned (never cached); a complete empty read is still `[]`. `export const COLD` is the sentence.
  - **`commons/public/market.js`** (17056 b, sha256 `b0902defca687c93`): the picker reads the status, shows the
    server's sentence in `#mf-msg`, keeps `#mk-merch` visible, appends a **Try again** button. **UNRUN — needs a boot.**
  - **`commons/test/merch-printful-retry.mjs`** (5429 b, sha256 `f07c92f918f9f573`): rewritten — it was a placed test
    that pinned the old `[]`. 2 tests. Place it together with the lib or not at all.
  - **Measured:** `node --check` 0 on all four files; `node --test` (with the sharp hook) **11 pass / 0 fail**.
    M1 (silent empty) → red on exactly the cold-refusal case. M2 (refuse on any hiccup) → red on guard case 2 + the
    cache-survival step. Report `teams/build/outputs/round68-deepseek-cold-read.md`.
  - **The hidden second failure from round 68's first attempt** was guard case 2: I over-refused. Round 67's own guard
    said the rule. Fixed by `if (worth.length) return worth;`.

## Runner facts (verified, not guessed)
1. **`$OUT` is a new path on every `run_python` call** — write the hook/stub **in the same call that runs it`. (Cost me
   a call again this session: I copied the pair in call N and ran in call N+1 → `ERR_MODULE_NOT_FOUND`.)
2. **`$REPO` is a fresh copy per call with NO `.git`** — python edits are gone next call, and `git show HEAD:` is
   impossible. Repo edits: `edit_file`/`write_file` only. Mutants are fine *inside* one call if you restore from the
   in-memory original (this round: `restored: True`).
3. No native `sharp` here; `printful.mjs` → `fulfillment.mjs` → `merchsets.mjs` imports it at load. Working pair kept at
   `teams/build/outputs/2026-11-26T20-12-21/{hook.mjs,sharp-stub.mjs}` (copy into `$OUT` and run in one call).
4. `assert.rejects` resolves to `undefined` — to assert `err.status`, catch it (`refusal()` helper).
5. `merch-printful.mjs` is red in this sandbox for stub reasons; red here says nothing about main. Say "unrun here".
6. `[-3500:]` truncation once hid a whole failure. Print failing blocks whole.

## Open / next
1. **@Setu:** place the three files together, plain `node --test commons/test/merch-printful-retry.mjs
   commons/test/printful-curated-guard.mjs` on main → 11/11, and one browser look at the **Try again** path.
2. Printful catalogue ids: throw blanket, summer blanket, tapestry (needs Ash's store dashboard — Ash has it).
3. The multi-placement AOP path (per-placement areas in the product record).
4. Waiting on Setu, not mine: `commons/test/market-orders-no-printer-error.mjs` (round 59); parked resend-click test.
