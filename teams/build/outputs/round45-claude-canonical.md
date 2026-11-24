# Round 45 — Claude: a secret-bearing URL is never offered as canonical

2026-11-24, sandbox copy of $REPO/commons (main at the time of this session) with express@4 ws dotenv sharp and a stub src/llm.js.

## What changed (3 files)
1. `commons/lib/agentdoor.mjs` — new exported helper `isSecretPath(p)` = `/^\/(?:i|s|go|login|mcp\/t)\//`; `headTags()` uses it instead of `/^\/(i|s)\//`.
2. `commons/server.mjs` (Tier 1, line ~404) — the canonical `Link` header uses `agentdoor.isSecretPath(req.path)`.
3. `commons/test/door-token-transport.mjs` — the canonical `todo` is removed, so it asserts; echo check now covers the body AND the `Link`/`Location` headers; two new cases: `GET /login/<sentinel>` and `GET /go/<sentinel>` (HTML, no redirect following).

## Paths that carry a secret (all GET routes in server.mjs checked by regex over `app.get/all`)
`/i/:code` (+`/claim`), `/s/:code`, `/login/:secret` (server.mjs:1604), `/go/:code` (1631, one-time sign-in code — **not in the foreman's list; added**), `/mcp/t/:token`. Others with `:id`/`:slug`/`:key` (`/room/:id`, `/p/:id`, `/m/:id`, `/api/merch/mockups/:key`, …) are public identifiers, not credentials; `/auth/:provider/callback` carries code/state in the query, not the path (canonical uses req.path only, so no query echo). Not checked: routes registered outside server.mjs (e.g. in lib/ routers).

## Measured (sandbox, node --test)
- `door-token-transport.mjs`, new code: **5 tests, 5 pass, 0 fail, 0 todo** (21 calls, every one answered).
- Same test with the two lines reverted in the sandbox copy (red-on-old): **4 pass, 1 FAIL**, echoes at `MCP GET /mcp/t/<valid> (HTML)`, `LOGIN GET /login/<sentinel>`, `GO GET /go/<sentinel>`.
- `signin-door-links.mjs page-meta.mjs agent-connect*.mjs` with new code: **36 tests, 35 pass, 1 fail**. The one failure, `agent-connect-forgiving.mjs:62` "a steward connects an agent by name…" (`404 !== 403` at line 75), **fails identically on the unpatched sandbox copy (34 tests: 33 pass, 1 fail for agent-connect* alone)**, so it is not caused by this change; most likely my sandbox lacks something that test needs (kin list / env). Not diagnosed. Please run it on a real checkout of the exact SHA.

## Update, Round 46 (Claude): the `agent-connect-forgiving.mjs:62` 404 is a sandbox artifact
Setu's Round 8 audit on a real runtime (RESULTS.md, 2026-11-19T21:20Z) already recorded that the 404-vs-403 "does not reproduce on main" with `npm ci`; it failed identically on unpatched code in my sandbox, so it is mine, not the change's. Treat it as a sandbox artifact (cause not diagnosed, not worth chasing). I did not re-run it on a real checkout in Round 46.

## Limits
- Sandbox, not the codeload zip of the exact PR SHA: no `npm ci`, a stub `src/llm.js`. The branch/PR is opened by the runner; I did not see it.
- Nothing about live cohabi.org was checked. Production still serves the old canonical until deployed.
- server.mjs is Tier 1: needs Setu's yes on the exact SHA.
