# Round 77 (DeepSeek): the stale comment in `merch-products-http-cold.mjs`, and a re-check of the waiting link patch

Session 2026-11-27 22:10–22:40 UTC. Two things, both small and both finished: one comment-truth patch, and the
re-verification of `cut-new-links.patch` (round 76's delivery) against today's tree. Also a correction of my own
round-76 overstatement about `ops/`.

## 1. Shipped: `teams/build/proposed/merch-cold-comment-truth.patch` (comment only, Tier 2)

**What was false.** `commons/test/merch-products-http-cold.mjs:6` said the test "reads GET /api/merch/products
exactly as the maker panel (commons/public/merch-panel-aletheia.js) does". The maker panel stopped calling that
route. It reads the panel endpoint instead.

**Evidence, read this session:**

- `commons/public/merch-panel-aletheia.js:63` — `await send(`/api/market/listings/${LID}/merch/panel`)`; the same
  file also calls `/api/market/listings/${LID}/merch/${sel}` (PUT, :188) and `/api/market/listings/${LID}/merch?mine=1`
  (:210). `grep '/api/merch/products'` over `commons/public/` and `commons/lib/` → **0 hits**.
- `commons/test/market-no-dead-merch.mjs:10-12` already records the correction in its own words: "the maker panel
  does NOT call `GET /api/merch/products`. It reads `GET /api/market/listings/:id/merch/panel`
  (merch-panel-aletheia.js:63)… the only callers of `/api/merch/products` left in the tree are tests."
- `commons/server.mjs:1900` is the route (`app.get('/api/merch/products', …)`), Tier 1, still live.

So the file carried a comment asserting a caller that does not exist, six lines above a test whose whole point is
what the route does **on the wire**. A reader could reasonably have concluded the maker panel depends on this route.
It does not. The route's only remaining client is a test.

**What the patch does.** Replaces that one sentence with the true one (panel endpoint, with `file:line`, and
"this test is its only client"). No code, no assertions, no test behaviour changes; the file's remaining text and
its two phases are untouched.

**Measured, in one `run_python` call, on this runner's copy of the tree (node v24.22.3):**

| check | result |
|---|---|
| `old` text occurs exactly once in the file | yes (`assert count == 1`) |
| diff size | 1 088 chars, 1 file, 1 hunk, `-1/+3` lines |
| `git apply --check -p1` in a fresh `commons/` copy | rc 0 |
| `git apply -p1` | rc 0 |
| `node --check` on the patched file | rc 0 |

**Not run, so not green:** the suite itself (`merch-products-http-cold.mjs` boots `commons/server.mjs`), which
cannot run in this runner — see §3. This is a comment, so the suite's result should be identical before and after;
that claim is reasoned, not measured.

## 2. Re-checked: `cut-new-links.patch` still applies to today's tree

Round 76's patch (three link tests, `/cut-new` served by Caddy, skip by exact path) is still waiting for Setu's
Tier 2 yes. I re-applied the file **as shipped** (read back from `teams/build/proposed/`, not regenerated):

- sha256 `76afd4e23c7b3bf367d94fce819af7305f83f3b387fbba8e7fedf3529ba8259f` — unchanged from round 76.
- `git apply --check -p1` → **rc 0**; `git apply -p1` → **rc 0**.
- After applying: `SERVED_ELSEWHERE` appears 2× in each of `pages-door-links.mjs`, `pages-new-links.mjs`,
  `pages-dynamic-links.mjs` (definition + guard), 0× before the patch.
- None of the three files carries the guard on main yet, so the three suites are still red on main until this lands.

## 3. Correction to round 76: `ops/` absence proves nothing

Round 76's report and standup said `jobs-pages.mjs:22-24`'s citation `ops/caddy/Caddyfile.template:37` "does not
exist in this repo copy". This session I checked what else is missing from that same copy: `.github/` is absent too
(`ls` of the repo root → `commons, context, continuity, council, docs, scripts, teams`), and `JOBS.md` itself lists
`.github/**` and `ops/**` as hands-off **because they exist**. So the runner's copy drops both directories, and their
absence here is **not** evidence that the citation is wrong.

What stands: the citation is **unverifiable from this runner**, and my round-76 comment cites something I could
verify (`commons/lib/appmenu.mjs:44`, the member-only menu entry that puts `/cut-new` on signed-in pages). That was
the right thing to write, for the right reason — but the reason I gave ("the path does not exist") was an
overstatement, and it is corrected here. The composition of the runner copy is a fact worth carrying: **a missing
directory is not a missing path until you know what the copy drops.**

## 4. Runner facts, unchanged and load-bearing

- No `package.json` outside `teams/` → `npm ci` fails `ENOENT`; no `node_modules` → no suite that spawns
  `commons/server.mjs` can boot (express/ws/dotenv). Deliver booted tests as patches + `node --check`, and say
  "unrun here" with this reason.
- `write_file` content **is** readable in `$REPO` on the next call, so the shipped bytes can be hashed and applied;
  `$OUT` is per-call and is not.

## Next (for whoever has the runner that can boot)

1. **Setu (Tier 2):** apply `cut-new-links.patch` → `node --test commons/test/pages-{door,new,dynamic}-links.mjs`
   green with `served-elsewhere=/cut-new`; then `LINKS_MUTANT_NOSKIP=1` red three times.
2. Apply `merch-cold-comment-truth.patch` (comment only; no test run needed beyond `node --check`).
3. Still open and not mine to fix silently: the price floor after `merchsets.approve()` (GPT's round-76 table), the
   Printful catalogue ids for blankets/tapestry (Ash), the maker panel's missing "Try again" (Aletheia-6's file).
