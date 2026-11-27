# Round 74 — DeepSeek — the printful tidy, delivered as a patch

**Job (JOBS.md, Round 74):** the round-73 change again, as ONE `run_python` call that edits, runs, writes the diff,
`git apply --check`s it, and prints the sha256. Tier 1 (touches `commons/server.mjs`), needs Setu's second yes.

**Patch:** `teams/build/proposed/printful-tidy.patch` — 6 300 bytes,
sha256 `ba80927b37cda08edc64042e9c7898a47a8b45633285132494e6fd551fb43303`.
A copy is also in `teams/build/outputs/2026-11-27T16-13-39/printful-tidy.patch` (byte-identical, same sha256, re-read
from disk before the control run).

**Why round 73 was lost, and what changed this time.** `$REPO` is a fresh copy per `run_python` call and the copy has
no `.git` (`gitdir False`, `rev-parse --show-toplevel` empty), so neither the edits nor a `git diff` could leave the
runner. This time the deliverable is the diff text itself, produced with `difflib.unified_diff` (a/ b/ prefixes) and
verified with `git apply --check -p1` against a pre-patch tree.

## File by file

1. **`commons/test/market-no-dead-merch.mjs`** — adds `codeLines()` / `hasCode()` and points every "must not appear"
   check (and the "still there" loop) at code lines instead of raw text. A comment that names a retired route can no
   longer redden a guard about what the script does; a real code line still does.
2. **`commons/lib/printful.mjs`** — removes `takeTask`, `forgetTask` **and the JSDoc line above them** ("The finished
   mockup a listing is about to use…"). Round 73 removed only the two functions, which left that comment hanging over
   the `merchsets.mjs` section — false in the same way the `server.mjs:1895` line was. 8 lines out, no additions.
   `const tasks` stays: `startMockup` / `mockupResult` still use it (:190/:196/:199).
3. **`commons/server.mjs`** — line 1895, `// payments open. \`printful.takeTask\`/\`forgetTask\` are now unused and left
   in place for a later job.` → `// payments open.` No code changed; the route registrations at :1896–1898 are untouched.

## Measured here (in the runner, on a copy of current main)

- `node --check` **exit 0** on all three files.
- `git apply -p1` on a pre-patch tree: **rc 0** (clean), and `--check` rc 0 before that.
- Patched: `market-no-dead-merch.mjs` **3 tests / 3 pass / 0 fail**; `merch-listings-no-client-caller.mjs`
  **4 / 4 / 0** (round 72's absence guard still holds against the current `server.mjs`).
- **Mutants** (each on the patched tree, one line appended to `commons/public/market.js`, then reverted):
  - **M5** a *comment* naming `/api/merch/listings` → **green 3/3** (it was red before this change — the point of the fix).
  - **M6** a real code line `const deadRoute = '/api/merch/listings';` → **red 2/3**, assertion message names the route.
  - **M7** a real code line `const box = document.querySelector('#mk-merch');` → **red 2/3**, "still mentions mk-merch".
    This one is the control that the guard kept its teeth after being made comment-blind.
- `takeTask` / `forgetTask` have **zero code callers** repo-wide (walked in round 73; the only hits left are prose in
  `teams/` and archived copies). Dead code cannot be proved dead by a test — the evidence is that walk plus the suite
  staying green.

## Unrun here (say it plainly)

- `commons/test/merch-printful.mjs` and `printful-curated-guard.mjs` both die at import
  (`ERR_MODULE_NOT_FOUND: 'sharp'`, from `merchsets.mjs`) and at boot (`ECONNREFUSED`). `npm ci` fails with
  `EACCES: … rmdir '/tmp/kin-py-*/npm/_logs'` — a permission problem on npm's cache dir, not network. So **no
  `sharp`, no booted server** in this runner; Setu's run is the first real one for those two.
- Nothing was checked on staging or production.

## Open, named, not fixed here

1. **Coverage given up in round 72:** the price floor (`amount >= t.base`) and withdraw-on-failed-link were tested only
   through the retired `POST /api/merch/listings`. That is GPT's round-74 question (price floor) — the answer belongs in
   a new home, not this patch.
2. `commons/test/merch-products-http-cold.mjs:6` — stale comment, parked since round 71.
3. Printful catalogue ids for blankets / tapestry — needs Ash's dashboard.
4. The maker panel has no "Try again" on a cold read (Aletheia-6's file, not touched).
