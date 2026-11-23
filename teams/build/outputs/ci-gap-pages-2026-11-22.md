# Page and link tests outside CI: do they pass? (Round 36, DeepSeek, 2026-11-23)

**Method.** Local copy of `main` (node v24.22.3). `commons/` copied to `/tmp/w36`, a throwaway root
`package.json` (`{"type":"module"}`), a `src/llm.js` stub (`chat`/`complete`/`ask`), and
`npm install express@4 ws dotenv jsdom` — the way CI runs a neighbour: `node commons/test/<file>.mjs` from the repo
root, nothing else set. **Measured**, one run each, times are wall-clock.

**Second, separate finding first, because it changes how the rest should be read:** in this runner each
`run_python` call gets a *fresh* copy of the repo at `$REPO` (`/tmp/kin-py-XXXX/repo`). A file written there does
**not** survive to the next call, and I could not show it reaching a branch. So the `orgpages` patch below is
**measured in a sandbox copy but not placed**; it needs a runner that can write `commons/test/`, or Setu's hands.
Everything else here is measurement only and needed no write.

## The nine files

| test | result | secs | first failure (file:line) | verdict |
|---|---|---|---|---|
| `page-titles` | **green** | 0.8 | — | safe to add to CI |
| `page-titles-signed-in` | **green** | 0.5 | — | safe to add to CI |
| `not-found-links` | **green** | 0.4 | — | safe to add to CI |
| `market-menu-pages` | **green** | 0.5 | — | safe to add to CI |
| `page-meta` | **green** | 0.7 | — | safe to add to CI |
| `jobs-pages` | **green** | 0.5 | — | safe to add to CI |
| `site-links` | **red** | 3.0 | `commons/test/site-links.mjs:80` — "Found 2 bad links: /room/income (status 404), /room/hardware-lab (status 404)" | **site defect** |
| `site-links-signed-in` | **red** | 3.7 | `commons/test/site-links-signed-in.mjs:125` — "Found 2 bad signed-in links: /room/hardware-lab from /ambassador/charter (404), /room/income from /cooperative (404)" | **site defect** |
| `orgpages` | **red** | 0.0 | `commons/test/orgpages.mjs:7` — `ENOENT commons/pages-seed.json` | **stale test + possible content gap** |

Two dependencies to install at the root before the green ones can join CI:
`site-links`, `site-links-signed-in` need **jsdom** (both die with `ERR_MODULE_NOT_FOUND: jsdom` without it — measured);
everything above was run with jsdom present. `page-meta` and `orgpages` boot with `COMMONS_PORT` and that **works**
(the server honours it as well as `ASHRAM_PORT`) — no change needed there.

## Defect 1 (site): two links to rooms that do not exist

`/room/:id` is a real route (`commons/server.mjs`, `roomview.roomViewPage`), so a 404 means the room id is not in the
room store. Sources:
- `commons/lib/coop.mjs` — `<a href="/room/income">Product &amp; Income room</a>` on `/cooperative`.
- `commons/lib/ambassadorcharter.mjs` — `<a href="/room/hardware-lab">Hardware Lab</a>` in the top nav of `/ambassador/charter`.
- `commons/lib/roomview.mjs` has a `hardware-lab` layout branch and a charter wall, so the room was meant to exist.

Before changing either link: `commons/test/cooperative-tokens.mjs` **asserts** `/room/income` exists and fetches it,
so the id has to be agreed, not guessed. This is the one class of defect nothing in CI catches today, which is the
argument for adding the two `site-links` files rather than fixing the links alone.

## Defect 2 (test + content): `commons/pages-seed.json` is not in the repository

`commons/server.mjs` (`orgpages.init(DATA, { seedFile: process.env.COMMONS_PAGES_SEED || path.join(import.meta.dirname, 'pages-seed.json') })`)
and `commons/lib/orgpages.mjs` both expect it; `fs.existsSync` is not used for the default path, so a **fresh store
seeds no project pages**. Nothing was found named `pages-seed*.json` anywhere in the repo copy (**measured** by walk).
`commons/test/orgpages.mjs:7` reads it unconditionally and dies before the server boots, so the file measures nothing
today. On a fresh store I also measured `/page/last-of-the-real-estate` (the Label's own page) answering **404** —
that page is seeded from the same missing file. Production may still hold the pages in its data; nobody in this
session checked production data.

**Fix attempted, measured, not placed.** Guard the boot (`fs.existsSync` → empty seed) so the file runs at all; then
`node commons/test/orgpages.mjs` exits **1** with **33 checks, 27 pass, 6 fail**, and the six are exactly the checks
that need project-seeded content:

```
✗ a Label artist's name can't be taken
✗ your profile lists the pages you run, with Create a page
✗ the unified COHABI menu links to your profile and pages
✗ /api/me/pages lists them with the menu fields
✗ the Label's own page lists its artists from the Label's record     (/page/last-of-the-real-estate is 404)
✗ its banner shows the album covers
```

So the honest shape of the fix is two parts: (a) guard the boot, (b) let those six print as `absent (project seed file
missing): <name>` instead of failing, and say why in the header — they come back by themselves if the seed file is
restored. Part (a) alone is measured above; part (b) is **written but not run** (no persistent write, see Method). The
patch for part (a), lifted from the copy that was run:

```diff
--- a/commons/test/orgpages.mjs
+++ b/commons/test/orgpages.mjs
@@
-const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'commons', 'pages-seed.json'), 'utf8'));
-const seedFile = path.join(data, 'seed.json'); fs.writeFileSync(seedFile, JSON.stringify({ pages: real.pages.map((p) => ({ ...p, manager: 'SeedOwner' })) }));
+const seedPath = path.join(ROOT, 'commons', 'pages-seed.json');
+const real = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : null;
+const seedFile = path.join(data, 'seed.json');
+fs.writeFileSync(seedFile, JSON.stringify({ pages: real ? real.pages.map((q) => ({ ...q, manager: 'SeedOwner' })) : [] }));
```
plus `if (real) { …seeded block… } else { console.log('· the seeded-page checks are skipped: commons/pages-seed.json is not in the repository.'); }`.

## What Setu can do next, smallest first

1. Add the six green files to `commons-tests.yml`, with `jsdom` installed at the root. No code change.
2. Add `site-links` and `site-links-signed-in` **after** the two 404s are fixed — otherwise CI is red from day one.
3. Decide `/room/income` and `/room/hardware-lab`: either the room ids exist under other names (then fix
   `coop.mjs`, `ambassadorcharter.mjs` and `cooperative-tokens.mjs` together) or the rooms were removed (then the
   links go).
4. Find out whether `pages-seed.json` was dropped on purpose. If the project pages should exist on a fresh install,
   restore it; place the `orgpages` patch from a runner that can write `commons/test/`.
