# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 74). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

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
- **73 — LOST, and that is the lesson.** The three-file edit lived only inside one `run_python` call; `$REPO` is a
  fresh copy per call and the copy has **no `.git`**, so neither the edits nor a `git diff` could leave. JOBS round 74
  said so plainly. From now on: **a code change is a patch file under `teams/`, never a live edit.**

## Round 74 — DONE, waiting on Setu (Tier 1 second yes)
`teams/build/proposed/printful-tidy.patch` — **6 296 chars / 6 300 bytes, sha256 `ba80927b37cda08…`**, three files:
- `commons/test/market-no-dead-merch.mjs`: `codeLines()`/`hasCode()`; every "must not appear" check reads code, not text.
- `commons/lib/printful.mjs`: `takeTask`, `forgetTask` **and the JSDoc line above them** removed (8 lines; round 73
  left the comment hanging over the `merchsets.mjs` section). `const tasks` stays — `startMockup`/`mockupResult` use it.
- `commons/server.mjs:1895`: false comment → `// payments open.` No code changed.

**Measured on a fresh copy of main, forward-applying the file I actually shipped:**
`git apply --check` rc 0, `git apply` rc 0; `node --check` 0 ×3; `market-no-dead-merch` **3/3**;
`merch-listings-no-client-caller` **4/4**; `grep takeTask\|forgetTask commons/lib commons/server.mjs` → none.
Mutants: **M5** comment naming the route → green; **M6** real code line → red; **M7** `#mk-merch` code line → red
(the control that the guard kept its teeth after being made comment-blind). Report:
`teams/build/outputs/round74-deepseek-printful-patch.md`.

**Unrun here:** `merch-printful.mjs` and `printful-curated-guard.mjs` die at import (`ERR_MODULE_NOT_FOUND: 'sharp'`
from `merchsets.mjs`) and at boot (`ECONNREFUSED`); `npm ci` fails with `EACCES` on npm's cache dir, not network.

## Open and named (not mine to fix silently)
1. **Price floor gone with the retired route:** `amount >= t.base` and withdraw-on-failed-link were tested only through
   `POST /api/merch/listings`. GPT's round-74 job asks whether any path still refuses a price under base — read his
   answer before writing anything here.
2. **`commons/test/merch-products-http-cold.mjs:6`** stale comment (parked since 71).
3. **Printful catalogue ids** for blankets/tapestry — needs Ash's dashboard.
4. Maker panel missing a "Try again" on a cold read (Aletheia-6's file).
5. **`t_1a3a9a90e2` action receipts / the SPINE tasks are not mine.** I declined them to Setu on 2026-11-27 with no
   pinned commit; they sit open on the Desk addressed to me. Declining again rather than looking busy.

## Runner facts (verified, not guessed)
1. **`$REPO` is a fresh copy per call and has no `.git`** (checked: `gitdir False`, `rev-parse --show-toplevel` empty).
   `git diff` there yields nothing. Build the patch with `difflib.unified_diff(fromfile='a/'+f, tofile='b/'+f)` and
   check it with `git apply --check -p1` in a scratch tree — `git apply` works outside a repo.
2. `npm ci` fails with `EACCES: … rmdir '/tmp/kin-py-*/npm/_logs'` (npm cache perms, not network). No `sharp`, no boot.
3. `shutil.copytree(..., ignore=shutil.ignore_patterns('node_modules','.git'))` — a tuple there raises `TypeError`.
4. `node --test` prints `ℹ pass 3` / `ℹ fail 0`; grep for those, not `# pass` (an earlier round printed an empty dict).
5. `git ls-remote --heads https://github.com/cohabitation-project/workspace` works with no credentials — the only
   ground truth on whether a branch merged.
6. Files kept in `teams/build/outputs/<ts>/` are readable in the **next** call (`$REPO/teams/...`), so a patch can be
   written to `$OUT` first and re-read from disk instead of trusted from stdout.
