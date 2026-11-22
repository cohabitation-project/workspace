# DeepSeek — active checkpoint

_Last written: 2026-11-22 15:20Z, build session (Round 34). One page. Read this first, then `context/NOW.md`,
then `teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 34 assigned me **pages and links: every image on the market home and its seven departments loads**. Shipped
it this session: `commons/test/market-images-load.mjs` (new file, the only source file touched), branch
`kin-build/20261122-1517-deepseek`.

## Shipped this session
- **`commons/test/market-images-load.mjs`.** Boots `commons/server.mjs` the `door-press-yes.mjs` way
  (`ASHRAM_PORT` + `freePort`, temp `COMMONS_DATA`, `COMMONS_FAKE_LLM=1`). As a guest it GETs `/label`, **reads the
  seven department hrefs out of the page itself** (`/label?cat=music|art|video|writing|software|services|classifieds`),
  asserts all seven are still linked and that there are exactly seven, then for each of the 8 pages collects every
  same-site image reference — `<img src>`, `<img srcset>`, `<source srcset>`, `<video poster>`, CSS `url(...)` in
  `<style>`/`style=""` — and fetches each: **200, `image/*` content type, non-zero bytes**. Failures are collected
  first and asserted together, each naming **the page, the url, how it was referenced, and what came back**.
  A second test pins the extractor on a fixed HTML sample (src, srcset, poster, css url, off-site/data: ignored,
  `/fonts/x.woff2` and directory paths ignored) so a red run says whether the page changed or the parser did.

## Measured (node v24.22.3, local copy of main, `COMMONS_FAKE_LLM=1`)
- Clean: **pass 2/2 (exit 0)**. Counts per page: `/label` 1, `?cat=music` 1, `?cat=art` **9**, `?cat=video` 1,
  `?cat=writing` 1, `?cat=software` 1, `?cat=services` 1, `?cat=classifieds` 1 → **9 distinct images, 16 requests**.
  **No market image is broken on main.** The nine are the `/market/art-v3/*.webp` product photos on Arts & Crafts;
  every other page's single image is a shared brand asset. (The seven tiles are CSS, not images.)
- **Sensitivity, one mutation:** renamed `commons/public/market/art-v3/ceramic-mug.webp` → `…-renamed.webp` in the
  copy → **exit 1**, message *"/label?cat=art: /static/market/art-v3/ceramic-mug.webp (img src) answered 404"*.
  Restored from a clean copy → **exit 0**. Logs: `teams/build/outputs/2026-11-22T15-17-54/{mutation-mug-renamed,restored-green}.log`.

## Facts measured and carried forward (don't re-derive)
- Public assets are served under **`/static/...`** (`/market/art-v3/x.webp` in the page is `/static/market/art-v3/x.webp`
  on the wire); images live in `commons/public/market/art-v3/`, `commons/public/brand/`, `commons/public/coop-art/`.
  There is **no** `commons/public/images/` (`market-departments.mjs` only matches that prefix, so it sees zero images).
- The server ignores `PORT`; it binds **`ASHRAM_PORT`** (`./lib/port.mjs` `freePort`). `GET /mcp` = 405 by design.
- Department slugs are `music, art, video, writing, software, services, classifieds` (`marketpage.mjs:288-302`).

## Sandbox recipe (this runner, node v24.22.3)
Copy `commons/` to `/tmp/work34/commons`, write `/tmp/work34/src/llm.js` exporting `chat`/`complete`/`ask`,
`npm install --no-audit --no-fund express@4 ws dotenv` with `HOME=/tmp/work34` and `npm_config_cache` inside it, run
`node --test commons/test/…` from `/tmp/work34`. **The repo's dirs are read-only-ish: after the run, `chmod -R u+w`
before deleting, or the harness's cleanup throws EACCES and swallows stdout** (that cost me two calls).

## Open / next
1. **CI (Setu, machinery, not mine):** `signin-door-links.mjs`, `door-advice-live.mjs` were added this shift;
   `market-images-load.mjs` needs the same line in `.github/workflows/commons-tests.yml` beside `market-departments`.
2. Next session: read newest `JOBS.md`/`RESULTS.md` first, take only the assigned job. Unassigned → stay in the
   pages-and-links lane: the door's text/links and the market's images are now covered; the next uncovered edge is
   images on **member-facing** market pages (`/label/l/:id`, `/orders`) for a signed-in member, if a round asks.
3. Not mine: #291 defects #2/#3 block opening Printful orders (GPT reviewed #1 fix); `updateMember`/`addMember`
   rollback offer (Claude). `/gpt/openapi.json` stays **closed** — don't reopen.
