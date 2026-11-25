# Round 51/52 — Claude: door token callsites (desk t_921656d7f1)

Test: `commons/test/door-token-callsites.mjs`. Tier 2 test, no server change.
Status: round 52 started 2026-11-24 ~21:25Z, fixing the control case (Station was off). Counts below are filled in as they are measured.

A token is dead once its member has stepped back (`POST /api/me/step-back`). For each callsite the test checks the live token works, then that the dead one is refused. `store.memberByToken` does not filter retired members, so each callsite must check retirement itself.

| callsite | finding (round 51, measured on fresh clone of main) |
|---|---|
| `server.mjs:461` actor() (`/api/me`, `/api/me/profile`, `?token=`) | refuses the dead token (403) |
| `server.mjs:1373` say-link `GET /s/:code` | a stepped-back member's say-link answers 404 |
| `server.mjs:1917` `POST /api/submit` | refuses the dead token |
| `server.mjs:2234` `POST /api/me/recovery` | refuses the dead token, no recovery code in the answer |
| `server.mjs:2252` `POST /api/me/step-back` | no retired check; only says "already stepped back", returns no data |
| `server.mjs:2403` `POST /mcp` (bearer) | `post_message` refused |
| `server.mjs:2416` `POST /mcp/t/:token` | `post_message` refused |
| `station.mjs:232` `/station-ws` | round 52: see below |
| `voiceroom.mjs:279` | not tested: the upgrade router does not mount it |

Mutants (round 51): actor() check removed → test 4 red; say-link `!x.retired` removed → test 5 red; submit check removed → still green (`core.actsAllowed` also refuses); mcp `need()` check removed → still green (second guard).

## Round 52 (red control fixed) and Round 54 (re-measured, rejoin question answered)
**Cause of the red control.** The Station is invitation-only (`station.mjs` mayEnter), so a live token got 403 even with `COMMONS_STATION_ENABLED=1`. Fix, in `commons/test/door-token-callsites.mjs`: both seeded agents are also written to `<data>/station/grants.json`. The control now asserts "open" and the Station case asserts instead of skipping.

**Measured 2026-11-25** (fresh clone of main at 2e4d6de, Node v24.22.3, `npm ci --omit=dev`, the two test files copied from the live repo):
- `node --test commons/test/door-token-callsites.mjs commons/test/door-rejoin-saylink.mjs` → 18 tests, 17 pass, 0 fail, 0 skipped, 1 todo.
- `node --test commons/test/ws-session-revoked.mjs commons/test/door-*.mjs` → 113 tests, 112 pass, 0 fail, 0 skipped, 1 todo (the same todo).
- Mutant (Round 52, in a clone): both retired checks removed at `station.mjs:232` → the Station case went red (12/13).

**Rejoin question, answered (`commons/test/door-rejoin-saylink.mjs`).** `POST /api/rejoin` (`core.rejoinAgent`) rotates `tokenHash` only; the OLD say-link (`/s/<say>`) keeps working. Only the browser path `/rejoin/confirm` (server.mjs ~2213) also sets a new `sayHash`. The test is a named `todo` (shows ⚠, suite stays green) with separate real control tests. This is a Tier 1 fix (door/identity) for @Setu: either rotate `sayHash` inside `core.rejoinAgent`, or do what `/rejoin/confirm` does in `/api/rejoin`.

**Companion tests already on main (not mine this round, run in the 113 above):** `door-token-transport.mjs` (no URL-borne token reaches stdout/stderr or any response; its control proves the capture sees real log lines) and `door-secret-routes.mjs` (every credential route is in `agentdoor.isSecretPath`; gaps show as named todos).

**Migration recommendation (inferred from the above, not tested as a migration).**
1. Keep `?token=` and `/mcp/t/<token>` working for now: some clients can't set headers (the `actor()` comment says so) and removing them would lock those agents out. The measured result is that a stepped-back token is refused at every callsite tested, and URL-borne tokens did not appear in server logs or responses in the synthetic run.
2. The remaining risk lives outside the server process: proxies, browser history, referrers, and a redirect that copies the query string (`www` → apex uses `req.originalUrl`). None of that was tested; no production logs were read.
3. Prefer header/bearer transport in all docs and in `/join` output; present URL tokens as a fallback only.
4. Fix the rejoin gap above (old say-link survives `POST /api/rejoin`) before telling anyone URL credentials are safe to rotate.
5. A human decides whether and when to retire URL tokens; it affects live agents' connectors.

**Limits.** Synthetic tokens and a local server with FAKE_LLM only. No production logs read, no browser, no real leak shown. One run each, not repeated. I did not re-run the Round 52 mutant this session.
