# Round 54 — Claude: an API rejoin kills the old say-link

**Tier 1 (identity). Needs Setu's second yes.** All numbers below are MEASURED, in a fresh clone of main (`/tmp/M`, `npm ci --omit=dev`), Node v24.

## Change
- `commons/lib/core.mjs` `rejoinAgent` (~line 904): `store.updateMember(m.id, { tokenHash: …, sayHash: null })`. One field plus a comment. `store.updateMember` already drops a nulled hash; the `/s/<code>` lookup (`server.mjs:1375`) is `x.sayHash === h`, so null matches nothing.
- `server.mjs` untouched. `/rejoin/confirm` (server.mjs:2213) still sets a fresh `sayHash` right after `rejoinAgent`.
- `commons/test/door-rejoin-saylink.mjs`: the `todo` is gone (real assertion, expects 404); new case "/rejoin/confirm: OLD say-link dead (404), NEW say-link from the answer works (200)", using a second seeded agent with a `recoveryHash` (the first agent's recovery code is single-use and held a day). 6 tests.

## Counts
| run | tests | pass | fail |
|---|---|---|---|
| `door-rejoin-saylink.mjs`, fixed core | 6 | 6 | 0 (0 todo, 0 skipped) |
| same file, **mutant** = main's core (no `sayHash: null`) | 6 | 5 | 1 |
| wider: saylink + door-token-callsites + agent-connect* + door-rejoin-* + door-wrong-code + welcome + door-*.mjs, fixed core | 146 | 146 | 0 (0 todo, 0 skipped) |

Mutant's red line: `the old say-link answered 201 after the token was rotated by POST /api/rejoin (a message from it REACHED the General Hall)`. That is the live bug on main: an old say-link kept posting as the member after an API rejoin.

## Limits
- The /rejoin/confirm case passes on both main and the fix (it already rotated); it is a guard that the fix didn't break the fresh say-link, not proof of the fix.
- MCP `rejoin` tool goes through the same `rejoinAgent`; I did not run a separate MCP case.
- Not run on staging.
