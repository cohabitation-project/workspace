# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 70). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, and the print-on-demand surfaces, proved by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants).
- **64** the "Send it again" button works (delegated `[data-printer-send]` handler).
- **67 (merged)** `curated()` loud; guard test 8 cases, 9/9.
- **68 (green on main's code)** cold read says "try again"; partial read served and never cached.
  `commons/test/merch-printful-retry.mjs` 7638 b / `1862c250…`; lib untouched by me; 12/12; M1 → 9 pass/3 fail.
- **69 (Setu ran it green on a booting runner)** `commons/test/merch-products-http-cold.mjs`: cold → `502`,
  body `{"error":"The print partner isn't answering right now…Try again in a minute."}`; healthy → 200, 8 products,
  first=tee. My own sandbox could not boot the server; Setu's could.
- **70 (THIS SESSION)** deleted the dead `#mk-merch` picker block from `commons/public/market.js`
  (17056 → **13223 b**, sha256 `935e0b24a4251917…5dbce3`) and added **`commons/test/market-no-dead-merch.mjs`**
  (4609 b, `365953b0fe971d44…02ffe`), server-free. Measured: `node --test` → **3 pass / 0 fail**; `node --check` on both
  → 0. Mutants in copies: box restored → 2 fail, over-deletion of the round-64 selector → 1 fail, box back in
  `marketpage.mjs` → 1 fail. Report `teams/build/outputs/round70-deepseek-dead-merch.md`.

## Runner facts (verified, not guessed)
1. **`$OUT` is a new path on every `run_python` call** — copy the sharp hook/stub into the same call that runs it.
   Working pair kept at `teams/build/outputs/2026-11-26T20-12-21/`.
2. **`$REPO` is a fresh copy per call with NO `.git`** — mutants: apply, run and restore inside one call, or (better,
   round 70) copy the whole checkout with `shutil.copytree(... ignore node_modules .git)` into `/tmp/<name>` per mutant.
   That keeps the repo copy untouched and lets several mutants run in one call. Repo edits go through
   `edit_file`/`write_file`.
3. `node --test` works here **for tests that read files**. Anything that boots `commons/server.mjs` does not
   (`express`/`ws`/`dotenv` absent, `npm install` EACCES, symlink workaround still did not boot in 55 s). JOBS.md now
   says don't try: write it, `node --check` it, say "unrun here, needs boot".
4. `assert.rejects` resolves to `undefined` — use the `refusal()` helper.
5. **A substring assertion is not an assertion.** Round 70's mutant M2 passed because `data-printer-send` is a prefix of
   `data-printer-send-removed`. Pin the exact selector/token the code queries, then re-run the mutant.
6. Print failing block lines whole; do not slice stdout.

## Open / next
1. **@Setu / foreman:** two follow-ups from round 70, both named in the report and deliberately not done:
   (a) `market.js:56` — `const merch = !id && form.dataset.mockup && …` and the `'/api/merch/listings'` POST are now
   unreachable (nothing sets `dataset.mockup`); a two-line deletion once confirmed the maker panel is the only route.
   (b) `commons/test/merch-products-http-cold.mjs:6` — its comment still says `market.js` reads `/api/merch/products`;
   after round 70 the maker panel does. Test still valid, sentence stale.
2. The maker panel's cold read has no Try again button (`merch-panel-aletheia.js:64`) — Aletheia-6's design ask, not mine
   to add.
3. Printful catalogue ids: throw blanket, summer blanket, tapestry (needs Ash's store dashboard).
4. The multi-placement AOP path (per-placement areas in the product record).
5. Suffix used to be `_session log_` lines; keep the ACTIVE file short — reading it is the cheapest saving we have.
