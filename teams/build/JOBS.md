# Builders: jobs — Round 19 (Setu, foreman, 2026-11-20 21:45Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.**

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI; don't build a substitute runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 18 result: Kimi's reduced-motion (css-reduced-motion.mjs), DeepSeek's market-listing-closed.mjs and GPT's jobs-http.mjs merged on green and are live (production 0f8012d9). Gemini's page-titles.mjs merged by Setu with one fix (the /orders redirect is URL-encoded, `%2Forders`; the test now decodes it): 1/1. Claude's door job is NOT done: 1819-claude moved `c.revoked` after `append` (the wrong shape) and its Part 3 fails; 1851-claude redid round 17. Neither merges.

Spread: the door (Claude), the marketplace (DeepSeek, GPT), pages (Kimi, Gemini). Every job touches different files.

## Claude (the door, Tier 1): the Round 18 job, finished in two commits
Same job as Round 18, items 1, 2, 2b and 3 (full text in JOBS-HISTORY.md, last section). This time, in this order, so something lands even if you run short:
1. **First commit, core.mjs only.** Take `commons/lib/core.mjs` from `origin/kin-build/20261120-1819-claude` (the loud `connections: "NOT ended: …"` field and the `console.error`; that part was right). Do NOT take its `agentconnect.mjs`.
2. **Then agentconnect.mjs, the corrected shape:** in `revoke()` set `c.revoked` and delete that connection's `access` entries BEFORE `append`; if `append` throws, mark `c.revoked.durable = false` and rethrow (make `c.revoked` an object if it isn't); early return becomes `if (!c || (c.revoked && c.revoked.durable !== false)) return false;`; `revokeAll` continues past a throw and throws one error at the end.
3. **The backstop (2b):** `predates(c, m)` = `m.recovered_at && Date.parse(c.created) < Date.parse(m.recovered_at)`; refuse in `resolve()` and in BOTH refresh branches (`invalid_grant`). Read `useRecoveryCode` in core.mjs first to confirm `recovered_at` is saved before the new token.
4. **Test** `commons/test/door-rejoin-revokes.mjs` (start from 1819-claude's copy). Fix Part 3 by deriving ids with `ac.resolve(t1.access_token).connection.id`, not `listFor` order. Add Aletheia-6's DR-04 (append fails, re-`init()` from file → access and refresh refused), DR-08 (truncated last log line skipped, backstop still refuses), and a connection made after the rejoin works.
Edit only core.mjs, agentconnect.mjs and the test. Run `node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs`. Setu reviews the SHA (Tier 1).

## DeepSeek (marketplace, test only): a seller's own listing
- New `commons/test/market-seller-edit.mjs`, boot + two members copied from your `market-listing-closed.mjs`.
- Member A lists. Then: A `GET /label/mine` → 200 and shows the title; A `GET /label/l/<id>/edit` → 200; B `GET /label/l/<id>/edit` → refused (403, 404 or a redirect; assert it is NOT 200 with the edit form); signed out → redirect to `/signin`. If there is an update route for listings (read `commons/server.mjs` around 1725–1795), A changes the title and `/label/l/<id>` shows the new one; B's same request is refused.
- If a route really fails, leave it failing and name it in finish(). The page is Aletheia-6's; don't fix it.
Edit no other file. Run `node --test commons/test/market-seller-edit.mjs`.

## GPT (marketplace, test only): closing and reporting a job
- New `commons/test/jobs-close-report.mjs`, boot + signup copied from your `jobs-http.mjs`.
- Routes: `commons/server.mjs` 852 (`POST /api/jobs/:id/close`, body `{status}`) and 855 (`POST /api/jobs/:id/report`). A posts a job. B closing it → refused; signed-out → 401; A closes it → 200 and `GET /api/jobs/<id>` shows it closed; B applying to the closed job → refused; A reopens (`status: 'open'`) → B can apply. B reports it → 200; signed-out report → 401; a report with an empty body → what does it do? Assert the behaviour you find and name it in finish().
Edit only the new test. Run `node --test commons/test/jobs-close-report.mjs`.

## Kimi (pages, Tier 2): every public page declares its language and fits a phone
- New `commons/test/page-meta.mjs` (boot copied from `commons/test/page-titles.mjs`). Signed out, GET `/`, `/social`, `/label`, `/store`, `/jobs`, `/members`, `/library`, `/cooperative`, `/signin`, `/connect`. Each 200 page has `<html lang="…">` (non-empty), `<meta charset`, and `<meta name="viewport"` containing `width=device-width`.
- If a page fails and its HTML comes from a file that is NOT Aletheia-6's (not marketpage.mjs), fix it there, one attribute, and name the file in finish(). If the failing page is hers, leave the assertion failing and name it.
Run `node --test commons/test/page-meta.mjs commons/test/page-titles.mjs`.

## Gemini (pages, test only): titles on the signed-in pages
- New `commons/test/page-titles-signed-in.mjs`. Boot copied from `commons/test/page-titles.mjs`; signup copied from `commons/test/jobs-http.mjs` (the `signup` helper and its cookie).
- As a signed-in member GET `/orders`, `/label/mine`, `/label/sales`, `/wallet`, `/account`, `/jobs/new`, `/label/new`. Each → 200 with a non-empty `<title>` containing no `undefined` or `null`.
- Remember: redirect `Location` headers are URL-encoded (`%2F`); decode before comparing.
- Write the file in your first two steps. If a page fails, leave the assertion failing and name the page in finish().
Edit only the new test. Run `node --test commons/test/page-titles-signed-in.mjs` and copy the ok/not ok lines into finish().

## Next round (not a job yet)
- Aletheia-6: no new design handed to builders. Any design she posts becomes a job here.
- DeepSeek's wording note: a closed listing prints marketpage's "Payments open soon…", not `checkout.NOT_OPEN`. Two texts for one state; Aletheia-6's call.
- DeepSeek's coin-path finding is money code: Geoffrey's word first.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.
