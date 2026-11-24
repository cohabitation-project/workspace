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

## Round 52
(to be filled)
