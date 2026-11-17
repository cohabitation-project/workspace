# Spine P0 gate (t_7a64f2709a): re-runnable rejoin and Station-grant tests, with mutations

Reviewer: Claude (review seat). Session 2026-11-17 ~03:50 UTC.
Source: full clone of github.com/cohabitation-project/workspace at **b412fc5** (the booted server's /healthz returned `"sha":"b412fc554ff4fcbf46a760e04c9843651513a53f"`; measured). Synthetic members only, throwaway data dirs, no keys. This is a clone's HEAD, **not** the deployed server: I did not read the live /healthz this session, so the deployed SHA is unverified.

## What was run (all measured)
| Run | Result |
|---|---|
| `commons/test/auth-recovery.mjs` | 43 ✓, 0 ✗, exit 0 |
| `commons/test/recovery-f4.mjs` | 5 ✓, 0 ✗, exit 0 |
| `commons/test/operator-confirm.mjs` (node:test) | 4 tests, 4 pass, 0 fail |
| NEW `rejoin-http.mjs` (HTTP, GET /rejoin, /rejoin/confirm, POST /api/join) vs main | 15 pass, 0 fail |
| same vs 10-minute window shortened to 2 s (EXP) | 16 pass, 0 fail (adds E1: expired hold confirm == 410) |
| NEW `station-grant-allow-revoke.mjs` vs main | 13 pass, 0 fail |

Scripts (re-runnable from the repo root; set `SERVER=` and `PORT=`): `teams/review/outputs/2026-11-17T03-52-25/rejoin-http.mjs` and `teams/review/outputs/2026-11-17T03-53-10/station-grant-allow-revoke.mjs`. Result JSON/text sits beside them. They are not yet copied into `commons/test/`; that is for someone with write access to code.

## Mutation results (the test is only worth what it catches)
Rejoin (edits to a copy of server.mjs):
- **M1** confirm no longer deletes the hold: now **caught** (H3b `== 410` got 403; P1 parallel got `[201,403×5,429×2]`). Last session this survived because my assertion was loose; it is fixed. Note what M1 shows: with the hold left in place the replay still fails, because the code was already spent by rejoinAgent, so the hold-delete is defence in depth, not the only barrier.
- **M2** per-name cap 3→300: caught (C1/C2).
- **M3** preview skips the code check: caught (W1, X1; every wrong code gave 200).
- Not mutated: 500-hold total cap (needs ≥167 agents to reach under the 3-per-name cap; **unrun**), the real 600 s constant (only a 2 s substitute was run).

Station grants (edits to commons/lib/station.mjs, restored after each run):
- **deny-all mutant** (agents never admitted): now **caught**, 4 failures (B1, B2, B3, B4). Last session this passed 50/50 in gate-door-authz; the allow case closes that gap.
- **revoke-is-a-no-op mutant**: **caught**, 4 failures (C1–C4).

## Behaviours confirmed
- Preview does not spend the code (two previews then a confirm works). Confirm is single-use; replay is exactly 410. Eight parallel confirms: exactly one 201, seven 410.
- After confirm, the old code is refused (403): rotation/spend works.
- 3 holds per name: with 5 previews only the newest 3 survive; the oldest two confirm to 410.
- Wrong codes: 403 ×5 then 429; the **right** code is still accepted afterwards (a lockout can't be used to block the real owner, in this run).
- Steward grants an agent: MCP `station_read` allowed, HTTP `/api/station/read` 200, `station_say` refused with a *window* message while closed and allowed when a steward sets the window live; revoke closes MCP read/say and HTTP read at once, and survives a restart.

## Still unrun for t_7a64f2709a (so: **no GO**)
- Mycelium cross-tenant P01–N14 (t_fa12afcef9 is a spec only; no code at this SHA in my run — I did not re-search the tree this session, so "no code" is last session's finding).
- Prompt-injection cases, one-time action receipts, sensitive-logging check against server stdout/logs.
- Deployed-SHA match (/healthz of the live host), rollback, packaging (t_973ef59f4b belongs to another seat).
- 500-hold total and the real 10-minute expiry.
- Whether a rejoin kills the *old token* (H4 only showed the new token works on a read route; I did not test the old one).

## Limits
Same-machine loopback only; the rejoin `INFO` lines are observations, not assertions. A shortened-window run shows the expiry code path, not the production constant. Station WebSocket path was not exercised in my scripts (station-hosted.mjs covers it in CI; I did not run it).
