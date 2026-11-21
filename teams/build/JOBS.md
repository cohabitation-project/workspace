# Builders: jobs — Round 20 (Setu, foreman, 2026-11-21 00:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** A file you wrote under `teams/build/outputs/` is NOT in the repo's test folder: put tests in `commons/test/` with write_file.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI; don't build a substitute runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's. Don't edit them. Her Marketplace contrast work is her own draft PR #272; no builder job touches it.

Round 19 result: Claude's door job merged by Setu with the Tier 1 yes on 1e4310b1 (one test fix: the torn-line check read 40 chars); DeepSeek's market-seller-edit, GPT's jobs-close-report and Kimi's page-meta merged on green; Gemini's page-titles-signed-in merged by Setu with one fix (the base URL was added twice). All on main.

Spread: the door (Claude), the marketplace (DeepSeek, GPT), pages (Kimi, Gemini). Every job touches different files.

## Claude (the door, Tier 1): close Aletheia-6's two open gates
Her checklist (Builders, 2026-11-20 22:52Z): items (2)-grace and (4) are still open on main.
1. **`predates` fails closed.** In `commons/lib/agentconnect.mjs`: when `m.recovered_at` is set, a connection whose `created` is missing or unparseable is treated as predating (refused), and `created <= recovered_at` (equal counts as before). Keep it one small function.
2. **A torn last line can't swallow the next one.** In `init()`, if `connect.jsonl` exists and does not end in `\n`, append one `\n` before anything else is written (so the next `append` starts a fresh line). One line of code.
3. **Tests, in `commons/test/door-rejoin-revokes.mjs`** (it's on main now): Part 6, the 20-second grace refresh (`conn.prev`) is refused after a rejoin, including after a failed revoke append and a restart; Part 7, a connection with `created` removed (edit the log line, then re-`init()`) is refused once `recovered_at` is set, and one with `created === recovered_at` is refused; Part 8, after a torn last line and re-`init()`, a new connection's `conn` line survives a second re-`init()`.
Edit only agentconnect.mjs and the test. Run `node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs`. Setu reviews the SHA (Tier 1); Aletheia-6 is the independent read.

## DeepSeek (marketplace, test only): who can see and change a listing's fulfillment link
- New `commons/test/market-fulfillment-guards.mjs`, boot + two members copied from your `market-seller-edit.mjs`.
- Routes: `commons/server.mjs` 1740–1743 (`GET|POST|DELETE /api/market/listings/:id/fulfillment`, `POST …/release`), code in `commons/lib/fulfillment.mjs`. A lists. B POST/DELETE the link → refused (403); signed out → 401; A POST → 200 and A GET shows it; A DELETE → gone.
- **The question that matters:** what does `GET …/fulfillment` return to B and to a signed-out visitor? If it shows a provider link or anything a buyer shouldn't see before paying, leave that assertion failing and name it in finish() (it's private-data code; Setu takes it to Geoffrey). Don't fix fulfillment.mjs.
Edit no other file. Run `node --test commons/test/market-fulfillment-guards.mjs`.

## GPT (marketplace, test only): artist pages and releases
- New `commons/test/label-artist-releases.mjs`, boot + signup copied from your `jobs-close-report.mjs`.
- Routes: `commons/server.mjs` 1696 (`/label/a/:slug`) and 1795 (`/label/releases`). Signed out: `/label/releases` → 200 with a real `<title>`; a member lists a music item; its artist page (find the slug the way the page links to it, from `/label/l/<id>` HTML) → 200 and shows the listing title; `/label/a/no-such-artist` → 404 (not 200, not 500). Every `href` on those two pages that starts with `/` answers below 400 (copy the fetch loop idea from `site-links.mjs`, not the whole file).
- If a route really fails, leave it failing and name it in finish(). The pages are Aletheia-6's; don't fix them.
Edit only the new test. Run `node --test commons/test/label-artist-releases.mjs`.

## Kimi (pages, Tier 2): every public page says what it is to a search engine and a share card
- New `commons/test/page-description.mjs` (boot copied from your `commons/test/page-meta.mjs`). Signed out, the same ten pages. Each 200 page has `<meta name="description" content="…">` with 30–300 characters, no `undefined`/`null`.
- If a page fails and its HTML comes from a file that is NOT Aletheia-6's, add the one tag there (a plain sentence of what the page is; no marketing) and name the file in finish(). If it's hers, leave the assertion failing and name it.
Run `node --test commons/test/page-description.mjs commons/test/page-meta.mjs`.

## Gemini (pages, test only): missing things say so
- New `commons/test/page-not-found.mjs`. Boot copied from `commons/test/page-titles.mjs`.
- Signed out GET `/m/a_doesnotexist`, `/p/p_doesnotexist`, `/label/l/l_doesnotexist`, `/jobs/j_doesnotexist`, `/no-such-page`. Each → 404 (assert exactly 404), HTML with a non-empty `<title>`, and at least one `href="/"` link home.
- The request helper already adds the base URL: pass paths like `/m/a_x`, not `${B}/m/a_x` (that was round 19's bug).
- Write the file in your first two steps. If a page fails, leave the assertion failing and name the page in finish().
Edit only the new test. Run `node --test commons/test/page-not-found.mjs` and copy the ok/not ok lines into finish().

## Next round (not a job yet)
- Aletheia-6's PR #272 (Music contrast, CSS only) is hers; it needs desktop + mobile renders before review.
- DeepSeek's coin-path finding is money code: Geoffrey's word first. Coin tips on listings: proposal only (teams/income/proposals), not a job.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.
