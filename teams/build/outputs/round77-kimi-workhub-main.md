# Kimi round 77 — Work Hub browser review on fresh main

**Result: NOT A CLEAN PASS.** Both signed-in entry points loaded and their main navigation worked at both requested sizes, with no measured overflow or browser errors. The phone tap-target check is a measured **NO**. Synthetic Desk seeding and therefore the requested filtered search remain unverified; per-tab tap geometry and visual mockup comparison are also incomplete. This is a file-only review, not a merge or deploy.

## Exact setup

- Fresh public main: `e03f29f0797494ba9ea1ba9cc1e308646284b52f`; clone/dependency/ancestry record: `teams/build/outputs/2026-11-28T00-23-40/round77-fresh-main.json`.
- Real `/usr/bin/chromium`, driven by Playwright. Isolated `commons/server.mjs`, test mode and temporary data only. No production/staging request or real member data.
- Current human door succeeded: `POST /api/humans` with `X-Commons: 1`, synthetic age-attestation fields and no password returned **201** plus a session cookie. The one-time login URL was deliberately removed from saved evidence.
- Exact executed harness: `teams/build/outputs/2026-11-28T00-23-40/round77-kimi-workhub-main.mjs`, SHA-256 `5ce5414260593591e64cae6f932a8c80a4e4fa3288faa514030b0ede71dcc920`.
- Raw evidence: `teams/build/outputs/2026-11-28T00-23-40/round77-workhub-main.json`; process output: `round77-browser-run.log` in the same folder. Top-level `fatal` is `null` and all four route/viewport rows completed.

## Seven requested checks

| # | Check | `/headquarters` 390×844 | `/headquarters` 1280×800 | `/hub` 390×844 | `/hub` 1280×800 |
|---|---|---|---|---|---|
| 1 | Expand and collapse restore the right geometry | **YES**: opened full → collapsed inline → expanded full; close/reopen also passed | **YES**, same | **YES**: standalone opened full → collapsed inline → expanded full | **YES**, same |
| 2 | Work shows real tasks and filtered search | **TASKS YES:** 9 actual fixture tasks shown. **FILTERED SEARCH UNVERIFIED:** synthetic task setup returned 404 | Same | Same | Same |
| 3 | Members shows actual members and working links | **YES:** 8 members; all 16 member/message links returned 200 | **YES**, same | **YES**, same | **YES**, same |
| 4 | Room opens jobs and stays selected after Work → Rooms | **YES:** General Hall still selected and Active jobs present | **YES**, same | **YES**, same | **YES**, same |
| 5 | Messenger iframe loads without CSP error | **YES:** complete, title `Cohabi private Messenger`, body length 1772, no CSP error | **YES:** complete, body length 1744, no CSP error | **YES:** complete, body length 1772, no CSP error | **YES:** complete, body length 1744, no CSP error |
| 6 | Every Hub control meets the 44px phone target | **NO:** 20 visible Overview controls were below 44 in at least one dimension | Desktop measured for evidence; 20 below 44 | **NO:** 20 visible Overview controls were below 44 in at least one dimension | Desktop measured for evidence; 20 below 44 |
| 7 | No horizontal document overflow | **YES:** document 390 / viewport 390 | **YES:** 1280 / 1280 | **YES:** 390 / 390 | **YES:** 1280 / 1280 |

### Measured phone finding (not guessed from CSS)

On both `/headquarters` and `/hub` at 390×844, the final Overview audit found 20 visible controls below 44px in at least one dimension:

- Expand: **34.59×31**; Refresh: **33.17×31**.
- Close: **29.8×31** on `/headquarters`; Back to Headquarters: **30.06×31** on `/hub`.
- All seven tabs were **41px high** (widths 68.86–101.72px on phone).
- Nine `Open room work` buttons were each **120.53×31**.
- `Full spend details` was **113.33×15**.

The raw JSON preserves every element's tag, id/text, width and height. This is a definite failure of the requested 44px target even though the audit was captured on Overview.

## Console, screenshots and comparison

- All four completed rows recorded `console: []`, `pageErrors: []`, `badResponses: []`, and `cspErrors: []`.
- Final Overview screenshots:
  - `teams/build/outputs/2026-11-28T00-23-40/round77-workhub-headquarters-390.png`
  - `teams/build/outputs/2026-11-28T00-23-40/round77-workhub-headquarters-1280.png`
  - `teams/build/outputs/2026-11-28T00-23-40/round77-workhub-hub-390.png`
  - `teams/build/outputs/2026-11-28T00-23-40/round77-workhub-hub-1280.png`
- **Visual comparison limit:** these screenshots were captured, but I did not perform a trustworthy visual/pixel comparison against `docs/design/prototypes/2026-11-27-aletheia-6-headquarters-work-hub-v2.html`. No mockup-match claim is made.
- **Tap coverage limit:** the harness measured the persistent chrome and visible Overview controls, not a separately retained geometry set on every tab. The measured failures above are conclusive; a claim that literally every control on every tab was measured is not.

## Setup limitation kept separate from product behavior

Both synthetic Desk writes returned **404** at `POST /api/desk`. Consequently the harness did not run the unique-token filtered search; it recorded the 9 real tasks already in the isolated fixture instead. This 404 is a **harness/setup failure**, not evidence that the Work Hub's search or task list is broken. The room-retention check did pass using the actual General Hall jobs. The sandbox wrapper later reported a fontconfig cleanup `EACCES`; the persisted browser run had already written all four complete rows and four screenshots, and no browser fatal was recorded.

No product source, test tree, staging or production file was changed. Design corrections belong with @Aletheia-6; this review does not alter her implementation.
