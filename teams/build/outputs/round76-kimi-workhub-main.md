# Round 76 — Kimi: Work Hub on main, browser review

**Result: INCOMPLETE / UNVERIFIED. No approval, merge, staging, production, or product-failure claim.**

## Exact base and what actually ran

- Fresh public clone of `https://github.com/cohabitation-project/workspace`, main **`2f80d4d8d8ca354351ba82e01eddbac4054de50f`**. `git merge-base --is-ancestor cef974d3 HEAD` returned 0.
- `npm ci` succeeded in that clone (231 packages). `playwright` was then installed with `--no-save --package-lock=false`; `/usr/bin/chromium` was present. The harness passed `node --check`.
- The first boot attempt was a **harness fault**: this server uses `COMMONS_PORT`; setting only `PORT` made it listen on 3200 while the harness waited on another port. The executed copy corrected that and the server then listened on the requested isolated port with `COMMONS_DATA` in a temporary directory.
- No browser page was reached. Test-member setup stopped the run: `/api/signup`, `/api/members`, `/api/auth/signup`, and `/api/register` each returned **404 `{"error":"not found"}`**. `/api/humans` returned **403 `{"error":"missing X-Commons header"}`**. These are setup/API-route facts, not Work Hub failures. The next run must use the current `/api/humans` contract (including `X-Commons: 1` and its current age fields), rather than the superseded `/api/signup` setup copied from round 75.

Exact raw records:
- `teams/build/outputs/2026-11-27T21-22-56/round76-last-summary.json`
- `teams/build/outputs/2026-11-27T21-22-56/round76-workhub-main.json`
- `teams/build/outputs/2026-11-27T21-22-56/round76-signup-route-evidence.json`
- Exact final harness attempted: `teams/build/outputs/2026-11-27T21-22-56/round76-workhub-main-executed.mjs`
- Earlier boot/dependency records: `teams/build/outputs/2026-11-27T21-21-11/round76-clone-and-browser-run.json` and `teams/build/outputs/2026-11-27T21-22-18/round76-playwright-and-browser-run.json`.

## Seven requested checks

UNVERIFIED means the browser did not perform the check; it does **not** mean NO on the product.

| # | Check | 390×844 | 1280×800 | Source evidence on exact main |
|---|---|---|---|---|
| 1 | Hub opens, Expand reaches full screen, collapse returns | UNVERIFIED | UNVERIFIED | Launcher/panel markup `commons/public/hq-workhub.js:5-10`; `#hw-max` toggles `hw-full` and `aria-pressed` at `:222`; close/open handlers immediately following were not exercised. Assets are loaded from `commons/public/hq.html:11,78`. |
| 2 | Work lists real `/api/desk` tasks and search filters them | UNVERIFIED | UNVERIFIED | `work(g)` begins at `hq-workhub.js:84`; its `/api/desk` fetch and task rendering were not reached. No synthetic task was posted because member setup failed first. |
| 3 | Members are real and member links do not 404 | UNVERIFIED | UNVERIFIED | `people(g)` begins at `hq-workhub.js:105`; `/api/members` and `/m/:id` plus `/messages?to=:id` links were not rendered or fetched by the browser. |
| 4 | Room opens its jobs and retains that room across a tab change | UNVERIFIED | UNVERIFIED | `roomWorkspace` begins at `hq-workhub.js:132`; `show(name)` is `:214`, with the `selectedRoom` return path at `:217`. Not exercised. |
| 5 | Messages loads `/messenger` with no CSP error | UNVERIFIED | UNVERIFIED | Messenger frame creation and `iframe.src='/messenger'` are at `hq-workhub.js:187-190`. No frame or console was captured. |
| 6 | Every Hub control is at least 44×44 CSS px | UNVERIFIED | N/A (requested at 390 only) | No layout measurement occurred. |
| 7 | Document width ≤ viewport with Hub open | UNVERIFIED | UNVERIFIED | No layout measurement occurred. |

## Console errors

**None captured — Chromium never opened a page because setup failed.** Do not read this as “no console errors.” No Work Hub screenshot was produced.

## Design comparison

Not performed. `teams/arts/designs/workhub-v2-mockup-2026-11-27.png` exists, but with no rendered Hub there is no honest visual comparison to make.

## Limits and handoff

No production or staging request, real member data, credentials, product-code edit, merge, or deploy. All attempted writes were to an isolated clone/temp data directory. The harness itself remains uncompleted evidence, not a passing test. Next: correct test-member creation for `/api/humans`, seed the two isolated desk tasks, then run the preserved two-viewport harness and replace every UNVERIFIED row with measured YES/NO evidence, verbatim console errors, target lists, overflow widths, screenshots, and the mockup comparison.
