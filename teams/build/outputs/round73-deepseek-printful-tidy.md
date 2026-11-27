# Round 73 — DeepSeek: finish the retirement (two named follow-ups)

**Job:** JOBS.md round 73, Tier 1 — needs Setu's second yes. Branch carries three files; they travel together.

| file | bytes | sha256 |
|---|---|---|
| `commons/lib/printful.mjs` | 22 836 | `ad3fd504453ef35d82a1f19f1c86c45237fe5491cf6f26c8b5a61f8f5b6d76e2` |
| `commons/server.mjs` | 281 177 | `4c913f4dcefa58b760e5b6ece5f90a283b5c53b5c67cd2258eb81dff220b6589` |
| `commons/test/market-no-dead-merch.mjs` | 6 561 | `72fc751f023691152b4119ac7131dc10889a4595f524b6327a6da46ec59c56d9` |

## What changed

**1. `commons/test/market-no-dead-merch.mjs` — the guard now reads code, not comments.**
Added the same `codeLines()` filter my round-71b sibling guard uses (`commons/test/merch-listings-no-client-caller.mjs`):
whole-line `//`, `*`, `/*` lines are dropped before matching. The four "must not appear" checks for the retired write
path (`/api/merch/products`, `/api/merch/mockups`, `/api/merch/listings`, plus `dataset.mockup` and `mf-on`) now read
the filtered text; the positive checks ("market.js still posts to `/api/market/listings`", `data-buy`, `mk-checkout`,
`closest('[data-printer-send]')`) are untouched. The `mk-merch` box checks in test 1 are filtered too — same false
positive class, same one-line fix, and leaving it raw would have been the odd case to explain.

Why: round 72's retirement left a *comment* in `market.js` naming the route it retired. Mutant M5 (a comment naming
`/api/merch/listings`) turned this guard red — a test about what the script *does*, failing on a sentence about what it
*no longer does*. That is how a maintainer learns to whitelist the file that must never POST again.

**2. `commons/lib/printful.mjs` — `takeTask` and `forgetTask` removed (lines 209–215 on main).**
Job condition met, measured rather than assumed: repo-wide walk (`node_modules`, `.git` skipped, `.mjs/.js/.cjs/.html/
.md/.json/.py`) finds **zero code callers**. Every remaining occurrence is prose or an archived copy:
`teams/build/JOBS.md`, `STANDUP.md`, `JOBS-HISTORY.md`, four `teams/build/outputs/*.md` reports, the round-72 snapshot
copies under `teams/build/outputs/2026-11-22T*/`, and my own `continuity/deepseek/ACTIVE.md`. No test imports them.
The `tasks` map **stays** — still used at `printful.mjs:190` (`tasks.set` after `startMockup`), `:196` and `:199`
(`mockupResult`). Only the two exports and their JSDoc went.

**3. `commons/server.mjs:1895` — one comment line, because it became false.**
It read "`printful.takeTask`/`forgetTask` are now unused and left in place for a later job." Now reads, continuing the
sentence from 1894: "…Orders reach Printful only once / payments open. The mockup take/forget helpers went with the
route in round 73: nothing called them." Verified in context (1892–1896); no code in `server.mjs` changed, and the
route registration is untouched.

## Measured here (Node; this runner)

- `node --check` → **0** on all three files.
- `node --test commons/test/market-no-dead-merch.mjs` → **3 pass, 0 fail** (exit 0).
- `node --test commons/test/merch-listings-no-client-caller.mjs` → **4 pass, 0 fail** (exit 0). Round 72's inverted
  guard (asserting the handler is *absent*) still passes against the current `server.mjs`, so the retirement holds.
- **M5 (control, must stay green):** append to `commons/public/market.js`
  `// we no longer post to /api/merch/listings nor fetch /api/merch/products; the panel owns mockups` → **exit 0**.
  This is the mutant that was red before the fix.
- **M6 (must die):** append to `commons/public/market.js` `const _deadMerchRoute = '/api/merch/listings';` → **exit 1**.
  The test still bites on code, so M5's green is aim, not blindness.
- Both mutants run in `shutil.copytree` copies; the tree under test was never mutated.

**Unrun here, and why (not a claim of green):** `merch-printful.mjs` and `printful-curated-guard.mjs` were both
attempted and both exit 1 on this runner, at import/boot, before any line I touched:
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sharp' imported from commons/lib/merchsets.mjs` (both tests);
- `[cause]: Error: connect ECONNREFUSED 127.0.0.1:33397` for the boot test's first case.
`npm ci` at the repo root was tried once, as the job allows, and fails with
`EACCES: permission denied, rmdir '/tmp/kin-py-*/npm/_logs'` — a permission problem on npm's cache dir, not a network
problem. So the two Printful tests are **unrun here** and Setu's run is the first real one for them. Nothing in either
file references `takeTask`/`forgetTask` (grep above), and `merch-printful.mjs`'s only route contact is its
`POST /api/merch/listings → 404` assertion at :79–80.

## Second yes — what the reviewer is being asked

Tier 1 (it touches `server.mjs`, if only a comment, and `commons/lib/`). The risky half is the removal: **nothing can
go red if `takeTask`/`forgetTask` are gone**, because an export nothing calls is invisible to tests. The proof is the
grep above plus two green file-only tests. If a future feature wants "the finished mockup, the maker's own, not yet
used", it needs a caller *and* a test at its new home — that is the condition under which this should come back, not
by resurrecting an unused export.

## Open, named, not fixed here

1. **Coverage given up in round 72** still stands: the price floor (`amount >= t.base`) and withdraw-on-failed-link
   were tested only through the retired `POST /api/merch/listings`. Unchanged by this round.
2. **`printful.curated()` cold-read path** — `merch-products-http-cold.mjs:6` has a stale comment (parked since 71).
3. **Printful catalogue ids** for blankets/tapestry still need Ash's dashboard.
