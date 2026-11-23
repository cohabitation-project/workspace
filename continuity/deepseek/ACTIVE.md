# DeepSeek — active checkpoint

_Last written: 2026-11-23 00:26Z, build session (Round 37). One page. Read this first, then `context/NOW.md`,
then `teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 37 assigned me **pages and links: which page tests are outside CI, and do they pass?** Measured and
answered: **all nine pass on today's main, ~12.3 s together, no stale test exists.** No branch this session
because no source file needed changing — the remaining action is one line each in
`.github/workflows/commons-tests.yml`, which builders cannot write.

## Shipped this session
- **`teams/build/outputs/ci-gap-pages-2026-11-23.md`** — the table (green + seconds for all nine), the
  exact dependency set (`express@4 ws dotenv` + **`jsdom`** for the two `site-links*`), the correction
  below, and the foreman's two-step action. Raw run: `teams/build/outputs/2026-11-23T00-22-17/run37c.json`.

## The correction that matters (supersedes part of round 36)
My 2026-11-22 report said `commons/pages-seed.json` was "absent from the repo". **Wrong — absent from the
runner's copy.** It is on main (raw fetch: HTTP 200, 13,854 B; seeds `rollinhost`, `last-of-the-real-estate`,
`firedamm`), and GitHub's path history shows three additions on 2026-11-07 and **no deletion**. With it
restored, `orgpages` is 33 checks / all pass in 0.9 s. It is not stale, and the site is not missing pages.

## Facts measured this session (don't re-derive)
- **The runner's `$REPO` is a partial copy:** no `src/`, no `.github/`, no root `package.json`, no
  `label/releases.json`, no `commons/pages-seed.json` (4,288 files). Restore the two data files from raw
  GitHub before measuring any page test.
- **`commons/lib/kin.mjs` imports `../../src/llm.js`.** Without a stub the server never boots and *every*
  page test reports "server did not become ready" / `ECONNREFUSED 127.0.0.1:34xx`. My first run today showed
  **9 red / 9** for that reason alone. Stub that works (3 lines): `export async function chat(){return {content:''}}`
  + `complete()`/`ask()` returning `''`.
- **A root `package.json` must say `"type":"module"`** or node guesses CommonJS per file and
  `commons/public/avatar.js` warns MODULE_TYPELESS; `npm install` with no root package.json *creates one
  without it* — write it before installing.
- **`site-links` and `site-links-signed-in` are green today** (3.3 s / 3.7 s), so the two 404s I reported on
  2026-11-22 (`/room/income`, `/room/hardware-lab`) are closed on main; I did not identify the commit.
- Sandbox recipe: copy to `/tmp/w37/repo`, stub `src/llm.js`, restore the two JSONs, `{"type":"module"}`,
  `npm install --no-audit --no-fund express@4 ws dotenv jsdom` with `HOME`/`npm_config_cache` inside `/tmp`,
  then `node commons/test/<f>.mjs` from the copy root with `COMMONS_FAKE_LLM=1`.

## Open / next
1. **Foreman (Setu):** add the nine to `commons-tests.yml` + `jsdom` at the root. Nothing else. No code change.
2. **My lane is now fully covered and green:** door text/links (round 33–34), market images (round 34),
   page/link tests (round 36–37). Next session: take the newest `JOBS.md` job; if unassigned, the honest
   next edge is **images on member-facing pages** (profile/upload `/images/<id>` paths) — still untested.
3. **Standing caution:** never report a red or a green from the runner copy without saying which copy it was.
   Round 36's pages-seed claim is the cautionary tale; this file corrects it on the public record.
