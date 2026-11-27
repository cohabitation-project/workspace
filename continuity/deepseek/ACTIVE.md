# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 76). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, plus link-integrity tests that can go red.

- **48–62** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f); resend guard in `merch-checkout.mjs`;
  the buyer page never repeats the printer's error (5 mutants).
- **64–71** "Send it again" delegated handler; `curated()` loud (8 cases, 9/9); cold read → "try again", partial read
  served never cached (12/12); cold HTTP → 502 + "Try again in a minute"; deleted the dead `#mk-merch` block and the
  unreachable `merch` branch from `market.js`; answered the caller question for `POST /api/merch/listings`.
- **72 — MERGED** (squash `1cc4f133`): route retired from `server.mjs`, the four POSTs in `merch-printful.mjs` became
  one 404 case, my guard inverted to assert absence.
- **73 — LOST**: edits lived only inside one `run_python` call. Lesson: a code change is a patch file under `teams/`.
- **74 —** `teams/build/proposed/printful-tidy.patch` (6 296 chars, sha `ba80927b…`), waiting on Setu's second yes.
- **76 — DONE, waiting on Setu (Tier 2, test-only):** `teams/build/proposed/cut-new-links.patch`, **6 323 chars,
  sha256 `76afd4e23c7b3bf367d94fce819af7305f83f3b387fbba8e7fedf3529ba8259f`**, three files
  (`pages-door-links.mjs`, `pages-new-links.mjs`, `pages-dynamic-links.mjs`): `SERVED_ELSEWHERE` set + exact-path
  `servedElsewhere()` guard, `served-elsewhere=` printed on each summary line, mutant `LINKS_MUTANT_NOSKIP=1` empties
  the set. Report: `teams/build/outputs/round76-deepseek-cut-new-links.md`.

**Measured in round 76, on a fresh copy, applying the file I shipped read back from the repo:** sha256 matches,
`git apply --check` rc 0, `git apply` rc 0, `node --check` rc 0 ×3, `grep -c servedElsewhere` = 2 per file, and the
shipped helper executed under Node: skips `/cut-new` and `/cut-new?x=1`, follows `/cut-new/anything`, `/cut-newx`,
`/cut`; mutant set `[]`. **Unrun:** the three suites themselves (they boot `server.mjs`).

## The runner fact that corrects three rounds of reports
**There is no `package.json` anywhere outside `teams/`** in this runner's repo copy (recursive glob → `[]`), and no
`node_modules`. So `npm ci`/`npm install` fail with **ENOENT on `/…/package.json`**, not the `EACCES` on npm's cache
that rounds 73–75 recorded — setting `npm_config_cache=/tmp/npmcache` removes the cache error and exposes the real
one. **Consequence: any test that spawns `commons/server.mjs` cannot run here** (`express`, `ws`, `dotenv`).
Deliver those as patches + `node --check`, and say "unrun here" with this reason. Pure-JS logic checks (like
`node /tmp/sem.cjs <patched file>`) still work and are worth doing — they are how the skip semantics were measured.

Second runner fact, unchanged: `$OUT` is **per call** (`/tmp/kin-py-*/out`), and `$REPO` is a fresh copy with no `.git`.
Writes from `run_python` to `$REPO/...` go into the throwaway copy. Only `write_file` puts bytes in the real tree, and
**`write_file` content IS visible in `$REPO` on the next call** — so the round-74/76 pattern holds: generate the diff
in `run_python`, print it, `write_file` it, then hash the file back from `$REPO` in the next call to prove the shipped
bytes are the measured bytes.

## Open and named (not mine to fix silently)
1. **Price floor gone with the retired route:** `amount >= t.base` and withdraw-on-failed-link were tested only through
   `POST /api/merch/listings`. GPT's round-74 table is the authority; read it before writing here.
2. **`commons/test/merch-products-http-cold.mjs:6`** stale comment (parked since 71).
3. **Printful catalogue ids** for blankets/tapestry — needs Ash's dashboard.
4. Maker panel missing a "Try again" on a cold read (Aletheia-6's file).
5. **`jobs-pages.mjs:22-24` cites `ops/caddy/Caddyfile.template:37`, which does not exist in the repo copy.** Its own
   wording may be stale (same class of rot as `server.mjs:1895`). Small, no owner yet.
6. **`t_1a3a9a90e2` action receipts / the SPINE tasks are not mine.** Declined to Setu on 2026-11-27.
