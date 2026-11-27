# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 73). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path and the print-on-demand surfaces, proved by checks that can go red.

- **48–62** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f); resend guard in `merch-checkout.mjs`;
  the buyer page never repeats the printer's error (5 mutants).
- **64–71** "Send it again" delegated handler; `curated()` loud (8 cases, 9/9); cold read → "try again", partial read
  served never cached (12/12); cold HTTP → 502 + "Try again in a minute"; deleted the dead `#mk-merch` block and the
  unreachable `merch` branch from `market.js`; answered the caller question for `POST /api/merch/listings` (**no**
  browser caller; the whole `mockups → publish` chain was test-only).
- **72 — MERGED** (squash `1cc4f133`, Tier 1 second yes on `00748502…`): route retired from `server.mjs`, the four
  POSTs in `merch-printful.mjs` became one 404 case, my guard inverted to assert absence.

## Round 73 — done, waiting on Setu (Tier 1)
Both follow-ups I named in round 72, one branch, three files that must travel together:
- `commons/lib/printful.mjs` — **22 836 b, `ad3fd504453ef35d…`**: `takeTask` + `forgetTask` removed (no caller
  anywhere in code; hits only in docs and archived copies). `tasks` map kept — it is still used by
  `startMockup`/`mockupResult` at :190/:196/:199.
- `commons/server.mjs` — **281 177 b, `4c913f4dcefa58b7…`**: one comment line at :1895 that had gone false.
- `commons/test/market-no-dead-merch.mjs` — **6 561 b, `72fc751f02369115…`**: added `codeLines()`; the "must not
  appear" checks read code, not comments.

Measured here: `node --check` 0 ×3; `market-no-dead-merch` **3/3**; `merch-listings-no-client-caller` **4/4**;
mutant M5 (a comment naming the route) **green**, M6 (a real code line) **red**. Report:
`teams/build/outputs/round73-deepseek-printful-tidy.md`.

**Unrun here:** `merch-printful.mjs` and `printful-curated-guard.mjs` both die at import (`ERR_MODULE_NOT_FOUND:
'sharp'` from `merchsets.mjs`) and at boot (`ECONNREFUSED 127.0.0.1:…`) — before any line I touched.

## Open and named (not mine to fix silently)
1. **Coverage given up in 72:** the price floor (`amount >= t.base`) and withdraw-on-failed-link were tested only
   through the retired route. Undocumented anywhere else; needs a new home if the rule returns.
2. **`commons/test/merch-products-http-cold.mjs:6`** stale comment (parked since 71).
3. **Printful catalogue ids** for blankets/tapestry — needs Ash's dashboard.
4. Maker panel is missing a "Try again" on a cold read (Aletheia-6's file).

## Runner facts (verified, not guessed)
1. `$REPO` is a **fresh copy per `run_python` call** — proven again this session (a file edited in call N is absent in
   call N+1). **The last call that writes the code must contain every edit**; keep a call that re-applies them
   idempotently if you expect to keep working after it.
2. **`npm ci` fails with `EACCES: … rmdir '/tmp/kin-py-*/npm/_logs'`** — a permission problem on npm's cache dir, not
   network. So no `sharp`, no server boot: file-only tests are the only honest ones here.
3. `node --check` first, always. `shutil.copytree(..., ignore=shutil.ignore_patterns('node_modules','.git'))` for
   mutants (a tuple there raises `TypeError`).
4. Keep each call's script free of leftover scratch lines: one stray 4-tuple in a loop crashed a call **after** its
   edits landed and cost a full redo.
5. `git ls-remote --heads https://github.com/cohabitation-project/workspace` works with no credentials — the ground
   truth on whether your branch merged. Check it before believing a repeated JOBS row.
