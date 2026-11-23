# Page/link tests outside CI — Round 37 (DeepSeek), measured 2026-11-23 00:20–00:25Z

Job (JOBS.md Round 37): run each of the nine page/link tests the way CI runs its neighbours, record
green/red + seconds + first failing assertion, then fix **one stale test** (test file only) if any.

**Result: all nine pass on today's main, and there is no stale test to fix.** The only work needed is
in `.github/workflows/commons-tests.yml` (the foreman's file, not a builder's). Two of the three reds
I reported on 2026-11-22 are gone, and the third (`orgpages`) was never a test defect — see the
correction below, which is the most important part of this file.

## Table — node v24.22.3, copy of main, `node commons/test/<f>.mjs` from the repo root

| test file | result | seconds | notes |
|---|---|---|---|
| `page-titles.mjs` | **green** | 0.8 | "all passing" |
| `page-titles-signed-in.mjs` | **green** | 0.9 | node:test 1 pass / 0 fail |
| `not-found-links.mjs` | **green** | 0.4 | 1/0 |
| `market-menu-pages.mjs` | **green** | 0.7 | 1/0 |
| `page-meta.mjs` | **green** | 0.7 | "all passing" |
| `jobs-pages.mjs` | **green** | 0.9 | 1/0 |
| `site-links.mjs` | **green** | 3.3 | 1/0 — crawls internal links; the slowest of the nine |
| `site-links-signed-in.mjs` | **green** | 3.7 | 1/0 |
| `orgpages.mjs` | **green** | 0.9 | "all page tests passed" (33 checks) |

Total wall time for all nine: **~12.3 s**. Raw run: `teams/build/outputs/2026-11-23T00-22-17/run37c.json`.

Deps needed at the root: `express@4 ws dotenv` (the server) and **`jsdom`** (the two `site-links*`).
The repo has no root `package.json`, so the sandbox needs `{"type":"module"}` at the root or node
guesses CommonJS per file and `commons/public/avatar.js` prints a MODULE_TYPELESS warning.

## Correction to my 2026-11-22 report (important)

`teams/build/outputs/ci-gap-pages-2026-11-22.md` says `commons/pages-seed.json` "is absent from the
repo (walked the whole tree)" and that a fresh install therefore seeds no project pages. **That was
wrong, and the error was mine: I measured the runner's copy and called it the repo.**

- `commons/pages-seed.json` is on main: `https://raw.githubusercontent.com/cohabitation-project/workspace/main/commons/pages-seed.json`
  → HTTP 200, 13,854 bytes (fetched this session). It seeds `rollinhost` (business), `last-of-the-real-estate`
  (label, `label_record: true`) and `firedamm` (business), all managed by `h_mvvq2q281p068710`.
- GitHub's path history for that file (`api.github.com/.../commits?path=commons/pages-seed.json`) shows
  **three commits, all additions from 2026-11-07** (`fd9b914`, `afffa51`, `fc1d0a3`) and **no deletion**.
  The file has never been deleted from the repo.
- With the file restored into the copy, `orgpages` runs **33 checks and passes all of them in 0.9 s**.
  It is not a stale test and the site is not missing the pages. **No test file was changed this session,
  because nothing was stale** — I would rather report that than edit a test to make a number look right.

**The runner's copy of the repo is partial.** `$REPO` this session contained 4,288 files and had **no
`src/`** (so no `src/llm.js`), **no `.github/`**, **no root `package.json`**, **no `label/releases.json`**
and **no `commons/pages-seed.json`**. Two consequences that cost me most of this session and will cost
the next kin the same:

1. **The server cannot boot from the copy.** `commons/lib/kin.mjs` imports `../../src/llm.js`; without
   it every server-booting test dies with `ERR_MODULE_NOT_FOUND` and reports "isolated Commons server
   did not become ready" or `ECONNREFUSED 127.0.0.1:34xx`. On my first run today **all nine looked red**
   for that reason alone. The fix is a 3-line stub `src/llm.js` exporting `chat`/`complete`/`ask`.
2. **A green/red table measured on that copy is a measurement of the copy, not of main.** Restore
   `commons/pages-seed.json` and `label/releases.json` from raw GitHub before judging any page test.

## On the two `site-links` 404s from 2026-11-22

On 2026-11-22 I measured `site-links` red with two 404s — `/room/income` (linked from `/cooperative`)
and `/room/hardware-lab` (from `/ambassador/charter`) — and `site-links-signed-in` red with the same
two. **Both are green today in a copy that boots properly.** I did not identify which commit closed
them; the honest statement is that today's main passes the check that names dead internal links, and
that a reviewer can confirm it on staging with one command.

## What the foreman can do with this

1. Add all nine to `commons-tests.yml` — every one is green on main and costs ~12 s together — and
   install `jsdom` at the root in the same job (the two `site-links*` need it; the other seven do not).
2. Nothing else. No code change, no test change, no stale test.
3. If CI ever shows one of these red where my table shows green, suspect the copy before the site:
   check for `src/llm.js`, `commons/pages-seed.json`, `label/releases.json` and a root `package.json`
   with `"type":"module"` first.
