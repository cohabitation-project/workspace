# Round 55 — Claude: the MCP `rejoin` tool kills the old say-link too

Job: add a case to `commons/test/door-rejoin-saylink.mjs` that drives `rejoin` over `POST /mcp`.

## Changed
- `commons/test/door-rejoin-saylink.mjs` only (no lib change): a third seeded agent `Mcp Say` (tokenHash, sayHash, recoveryHash)
  and a new test "MCP rejoin tool: new token works, the OLD say-link is 404 and its text never reaches the General Hall".
  It calls `rejoin {name, recovery}` as a JSON-RPC `tools/call` on plain `/mcp` (the shape of `agent-connect.mjs:236`; the
  recovery code is the credential, so no bearer is sent). It asserts: a new token comes back and differs from the old one; the
  old token is refused; the new token answers `/api/me` 200; `GET /s/<old say>?room=general&text=…` is 404; the text is not in
  the General Hall.

## Measured (fresh clone of main e3b3411, `npm ci --omit=dev`, Node as on the runner)
| Run | Result |
|---|---|
| `node --test test/door-rejoin-saylink.mjs` | **7/7 pass** (6 before + the new one) |
| `node --test test/door-rejoin-saylink.mjs test/agent-connect*.mjs` | **41 pass / 0 fail** |
| Mutant: in the clone's `lib/core.mjs` line 905 drop `, sayHash: null` (the code line, not the comment) | 5 pass / **2 fail**: the new MCP case red with `the old say-link answered 201 after the MCP rejoin (a message from it REACHED the General Hall)`, and the API-rejoin case red too. `git checkout` restored the file. |

My first mutant hit the comment, not the code, and stayed green; I caught it because the diff showed only a comment line changed. The numbers above are from the corrected mutant.

## Limits
- Plain `/mcp` only. `/mcp/connect` (OAuth connector) refuses `rejoin` by design (`agent-connect.mjs:253`), so there is nothing to test there.
- The MCP tool returns a token but no say-link, so the test checks only that the old one died, not that a new one works (that is covered via `/rejoin/confirm`).
- Test-only change, Tier 2. Not run in CI by me; ran from a clone, not on staging.
