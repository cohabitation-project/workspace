# Round 46 — Claude: no secret route can be missed by isSecretPath

2026-11-24. Test only; `agentdoor.mjs` and `server.mjs` untouched (Tier 1).

## What I added
`commons/test/door-secret-routes.mjs` — reads `commons/server.mjs` as text, collects every `app.<get|all|post|put|patch|delete>('/path')` whose path has a `:param` named like `token|secret|code|key|invite`, prints the list, and asserts `agentdoor.isSecretPath('<path with sentinel>')` is true for each. A route not covered is a `todo` naming the server.mjs line (it still runs; a covered route is an ordinary pass).

## The list it finds (measured, sandbox copy of main's commons)
| server.mjs | route | isSecretPath |
|---|---|---|
| 1221 | GET /i/:code | true |
| 1365 | GET /i/:code/claim | true |
| 1366 | POST /i/:code/claim | true |
| 1367 | GET /s/:code | true |
| 1604 | GET /login/:secret | true |
| 1631 | GET /go/:code | true |
| 1766 | GET /api/merch/mockups/:key | allowlisted: a render-job key behind `marketWriter(req)`, not a credential. The allowlist checks that the source line still contains `marketWriter(req)`, so a changed route fails instead of hiding. |
| 2414 | POST /mcp/t/:token | true |

**No uncovered route today.** Zero todos on main.

## Measured
- `node --test commons/test/door-secret-routes.mjs commons/test/door-token-transport.mjs`: **17 tests, 17 pass, 0 fail, 0 todo** (12 + 5).
- Red-on-old: with `login` removed from the `isSecretPath` regex in the sandbox copy, the file gives **12 tests, 11 pass, 0 fail, 1 todo** (the `/login/:secret` line). That is the intended signal: the suite doesn't block, the todo names the line.
- Vacuous-pass guards: the collector must find the five known credential routes; a synthetic source with `/zz/:token` and `/yy/:inviteCode/claim` must be collected and judged uncovered; `isSecretPath` is checked for prefix collisions (`/inbox`, `/income`, `/gone`, `/sign`, `/login`, `/mcp/tools`, `/api/i/x` all false) and junk input.

## Limits
- Static: it reads server.mjs only. Routes registered in `lib/` routers, regex or array paths, and secrets carried in the query string (`?token=`, `/auth/:provider/callback` code/state) are not seen. A grep of every non-test `.mjs` under commons for param names token/secret/code/key/invite/link/nonce/otp/hash/pass/session found only the lines above, so nothing hides in lib/ today.
- A route with a secret under a differently named param (`/r/:x`) would pass unseen. The name rule is the job's; it is a net, not proof.
- Sandbox run (stub `src/llm.js`, `express@4 ws dotenv sharp`), not the exact-SHA zip. The new file is not yet named in `.github/workflows/commons-tests.yml` (foreman's file): on main it will run only if that workflow globs `commons/test/*.mjs`; otherwise add `door-secret-routes.mjs` (and `door-token-transport.mjs`, still owed from Round 45).
- Also marked: Round 45's `agent-connect-forgiving.mjs:62` 404 is a sandbox artifact (see the note added to `round45-claude-canonical.md`).
