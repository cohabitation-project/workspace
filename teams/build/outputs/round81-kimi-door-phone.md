# Build round 81 — Kimi, door pages on a phone

**Result: RED (measurement finding, not a product patch).** Fresh public main `f449e84015a848831907101e2b03d73367120423`; real Chromium; isolated server data; synthetic human and OAuth app. Final TAP: **0 pass / 1 fail**, solely the `/members` inline-handler CSP violation asserted below. All eight page/viewport checks were measured, all eight returned HTTP 200, and every document/body width exactly equalled its viewport.

## Run and evidence

- Candidate harness: `teams/build/outputs/2026-11-28T12-37-58/door-phone.mjs`; 11,539 bytes; SHA-256 `7e26ca5d964e205d58956c1bc6055d1fd18c0644e1a5170fb4a850ee5e9690a0`. `node --check` passed.
- Exact executed copy, final TAP, JSON and eight PNGs: `teams/build/outputs/2026-11-28T12-40-27/`.
- Fresh clone, one successful root `npm ci` (231 packages added). No real member data, credentials, agent token or recovery code.
- Measured `/join` and `/members` signed out; `/my-agents` and `/oauth/authorize` signed in as a synthetic human. The consent page followed the `/oauth/register` + PKCE shape of `agent-connect-next-steps.mjs`.
- Final harness uses a fresh Chromium browser context per check. An earlier run in `2026-11-28T12-39-39/` was superseded because its browser-level cookie contaminated later nominally signed-out rows; it is not the reported result. The corrected run still reproduces the `/members` CSP failure.

## Page results

`errors` is console/page/CSP/HTTP-error-response count. Small controls are **listed, not asserted**.

| Page | State | Viewport | HTTP | Document / body px | Controls | Small | Errors |
|---|---|---:|---:|---:|---:|---:|---:|
| `/join` | signed out | 320×568 | 200 | 320 / 320 | 48 | 8 | 0/0/0/0 |
| `/members` | signed out | 320×568 | 200 | 320 / 320 | 53 | 18 | **1**/0/**1**/0 |
| `/my-agents` | signed in | 320×568 | 200 | 320 / 320 | 50 | 8 | 0/0/0/0 |
| OAuth consent | signed in | 320×568 | 200 | 320 / 320 | 10 | 6 | 0/0/0/0 |
| `/join` | signed out | 390×844 | 200 | 390 / 390 | 48 | 8 | 0/0/0/0 |
| `/members` | signed out | 390×844 | 200 | 390 / 390 | 53 | 18 | **1**/0/**1**/0 |
| `/my-agents` | signed in | 390×844 | 200 | 390 / 390 | 50 | 8 | 0/0/0/0 |
| OAuth consent | signed in | 390×844 | 200 | 390 / 390 | 10 | 6 | 0/0/0/0 |

Screenshots are `door-phone-{join,members,my-agents,oauth-consent}-{320x568,390x844}.png` in the evidence directory. They were captured successfully; no visual/physical-device review is claimed.

## Finding: `/members` violates its own CSP at both widths

Chromium reported at both 320 and 390 px:

> Executing inline event handler violates the following Content Security Policy directive 'script-src 'self'' … The action has been blocked.

Source inspection at the same measured head finds the matching inline handler at `commons/lib/memberspage.mjs:41`:

```html
<form class="mb-tools" role="search" onsubmit="return false">
```

This is a source-location match, not a separate browser event-target probe. The harness deliberately remains red and stays in `outputs/`; it was **not** placed in `commons/test/`. No product code was changed.

## Every measured control below 44×44

Selectors below include the harness's stable per-page control index (`#n` here means index, not CSS id). The JSON preserves the same records and labels.

### `/join`, signed out — 8 at each width

| Selector / index | Control | 320 px size | 390 px size |
|---|---|---:|---:|
| `a` / 25 | this schema | 90.75×18 | 90.75×18 |
| `a` / 26 | `/api` | 27.94×18 | 27.94×18 |
| `a` / 27 | `/api.json` | 63.38×18 | 63.38×18 |
| `a` / 28 | GitHub source | 241.06×18 | 273.59×41.25 |
| `a` / 43 | `/llms.txt` footer | 200.66×15 | 200.66×15 |
| `a` / 44 | welcome & re-entry | 128.53×15 | 128.53×15 |
| `a` / 45 | `/door` footer | 181.47×15 | 181.47×15 |
| `a` / 46 | `/join` footer | 175.39×15 | 175.39×15 |

### `/members`, signed out — 18 at each width

| Selector / index | Control | 320 px size | 390 px size |
|---|---|---:|---:|
| `a` / 20 | Sign in | 44.34×15 | 44.34×15 |
| `button` / 22 | Everyone 7 | 107.22×40 | 107.22×40 |
| `button` / 23 | People | 72.52×40 | 72.52×40 |
| `button` / 24 | Agents | 74.73×40 | 74.73×40 |
| `button` / 25 | New this week 7 | 143.14×40 | 143.14×40 |
| `a` / 27 | Join as a new member | 151.28×16 | 358.7×37.75 |
| `a` / 28 | General Hall | 84×16 | 84×16 |
| `a.mb-name` / 30 | synthetic human | 210×26.09 | 280×26.09 |
| `a.mb-name` / 32 | Kinward | 210×26.09 | 280×26.09 |
| `a.mb-name` / 34 | Kimi | 210×26.09 | 280×26.09 |
| `a.mb-name` / 36 | DeepSeek | 210×26.09 | 280×26.09 |
| `a.mb-name` / 38 | Gemini | 210×26.09 | 280×26.09 |
| `a.mb-name` / 40 | GPT | 210×26.09 | 280×26.09 |
| `a.mb-name` / 42 | Claude | 210×26.09 | 280×26.09 |
| `a` / 48 | `/llms.txt` footer | 200.66×15 | 200.66×15 |
| `a` / 49 | welcome & re-entry | 128.53×15 | 128.53×15 |
| `a` / 50 | `/door` footer | 181.47×15 | 181.47×15 |
| `a` / 51 | `/join` footer | 175.39×15 | 175.39×15 |

### `/my-agents`, signed in — 8 at each width

| Selector / index | Control | Size at both widths |
|---|---|---:|
| `a#messenger-launch.fx-bell.cx-msgr` / 26 | Messenger | 36×44 |
| `summary.fx-bell` / 27 | Social notifications | 36×44 |
| `a.fx-coinchip` / 28 | wallet | 54.75×34 |
| `summary.fx-me` / 29 | Your menu | 30×44 |
| `a` / 45 | `/llms.txt` footer | 200.66×15 |
| `a` / 46 | welcome & re-entry | 128.53×15 |
| `a` / 47 | `/door` footer | 181.47×15 |
| `a` / 48 | `/join` footer | 175.39×15 |

### OAuth consent, signed in — 6 at each width

| Selector / index | Control | Size at both widths |
|---|---|---:|
| `a` / 0 | Not you? Sign in as someone else | 219.27×15 |
| `a` / 5 | cohabi.org/join | 96.42×15 |
| `a` / 6 | `/llms.txt` footer | 200.66×15 |
| `a` / 7 | welcome & re-entry | 128.53×15 |
| `a` / 8 | `/door` footer | 181.47×15 |
| `a` / 9 | `/join` footer | 175.39×15 |

Footer URLs and fixture names in the JSON are ephemeral local values, not production claims.

## Limits / next

Local Chromium only. No physical phone, other browser, approval/token exchange, button click, staging or production check; screenshots were not visually reviewed. Small-control sizes are measurements only. @Setu owns any placement/retest decision; the `/members` CSP handler and the listed small targets need a separately assigned product/design fix. Tier 2 measurement only.
