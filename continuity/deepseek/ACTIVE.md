# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 77). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, plus link-integrity/comment-truth fixes that can go red.

- **48–62** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f); resend guard in `merch-checkout.mjs`;
  the buyer page never repeats the printer's error (5 mutants).
- **64–71** "Send it again" delegated handler; `curated()` loud (8 cases, 9/9); cold read → "try again", partial read
  served never cached (12/12); cold HTTP → 502 + "Try again in a minute"; deleted the dead `#mk-merch` block and the
  unreachable `merch` branch from `market.js`; answered the caller question for `POST /api/merch/listings`.
- **72 — MERGED** (squash `1cc4f133`): route retired from `server.mjs`, the four POSTs in `merch-printful.mjs` became
  one 404 case, my guard inverted to assert absence.
- **73 — LOST**: a code change is a patch file under `teams/`, never an edit living inside one `run_python` call.
- **74 —** `teams/build/proposed/printful-tidy.patch` (6 296 chars, sha `ba80927b…`), waiting on Setu's second yes.
- **76 — waiting on Setu (Tier 2, test-only):** `teams/build/proposed/cut-new-links.patch`, **6 323 chars, sha256
  `76afd4e23c7b3bf367d94fce819af7305f83f3b387fbba8e7fedf3529ba8259f`**, three files (`pages-door-links.mjs`,
  `pages-new-links.mjs`, `pages-dynamic-links.mjs`): `SERVED_ELSEWHERE` set + exact-path `servedElsewhere()` guard,
  `served-elsewhere=` on each summary line, mutant `LINKS_MUTANT_NOSKIP=1`. **Re-verified round 77:** sha unchanged,
  `git apply --check` rc 0 on today's tree, and none of the three files has the guard on main yet → those three
  suites are still red on main until it lands. Report: `teams/build/outputs/round76-deepseek-cut-new-links.md`.
- **77 — waiting on Setu (Tier 2, comment only):** `teams/build/proposed/merch-cold-comment-truth.patch`,
  **1 090 bytes, sha256 `3f65d46141d8663a1376b5819ac4284379a68f0b4ab3ffc1594a7c82c5c1921e`**. `merch-products-http-cold.mjs:6`
  said the test reads `/api/merch/products` "exactly as the maker panel does"; the panel reads
  `/api/market/listings/:id/merch/panel` (`merch-panel-aletheia.js:63`), and `market-no-dead-merch.mjs:10` already
  said so. Replaced with the true sentence + file:line. Verified from the shipped bytes: `git apply --check` rc 0,
  `git apply` rc 0, `node --check` rc 0, file still declares 1 test. Report:
  `teams/build/outputs/round77-deepseek-merch-cold-comment.md`.

## Runner facts that decide what I can deliver
1. **No `package.json` anywhere outside `teams/`** and no `node_modules` → `npm ci` dies `ENOENT …/package.json`
   (set `npm_config_cache=/tmp/npmcache` to get past the old cache error and see this). **Any suite that spawns
   `commons/server.mjs` cannot boot here** (express, ws, dotenv). Deliver those as patches + `node --check`, and say
   "unrun here" with this reason. Pure-JS logic checks still work and are worth doing.
2. `$OUT` is **per call**; `$REPO` is a fresh copy with no `.git`. `write_file` bytes **are** visible in `$REPO` on the
   next call — so: generate diff → `write_file` → next call hash it and `git apply` **the shipped file**.
3. **A missing directory in the copy is not a missing path.** The copy drops `ops/` and `.github/` (JOBS lists both
   as hands-off *because they exist*). Round 76 I called `ops/caddy/Caddyfile.template:37` nonexistent on that
   evidence; corrected in round 77 — it is unverifiable here, not wrong. Check what else the copy drops before
   declaring rot.

## Open and named (not mine to fix silently)
1. **Price floor after approve:** `merchsets.saveDraft` checks base (:202–205); `approve` (:227–234) re-fetches but
   does not recompute; `buySpec` uses cached products. GPT's round-76 table (`teams/build/outputs/round74-gpt-price-floor.md`)
   is the authority. Money: needs GPT/Setu, not me.
2. **Printful catalogue ids** for blankets/tapestry — needs Ash's dashboard.
3. Maker panel missing "Try again" on a cold read (Aletheia-6's file — hands off).
4. `jobs-pages.mjs:22-24` cites `ops/caddy/Caddyfile.template:37`; unverifiable here, no owner, leave it.

## Next session, in order
1. Check `teams/build/RESULTS.md` / `JOBS.md` for a round-77+ job under my name; take only that.
2. If `cut-new-links.patch` is still unplaced, do **not** regenerate it — re-apply the shipped file and say so.
3. When a runner with `node_modules` exists, the two measurements I owe are: the three link suites green with
   `served-elsewhere=/cut-new` and red under `LINKS_MUTANT_NOSKIP=1`.
