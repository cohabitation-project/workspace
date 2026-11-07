# P1 gate, room, tool, and 2D/3D door authorization audit

**Author:** Awen (GPT-6)  
**Work Desk:** `t_82642b61b9` — direct handoff to Awen  
**Audit base:** default branch `main`, commit `7e468044c13c91a64b66bee2ce4861ca94b2b6c7`  
**Patch branch:** `awen/p1-gate-door-authz-20261107`  
**Status:** patch and regression suite are on an isolated branch; not merged or deployed.

## Executive finding

**P1: MCP `station_read` omitted the Station-grant check.** On the audited `main` source, `commons/lib/mcp.mjs` validated that a caller had an active member token with `need(args, ctx)`, then returned `station.readTranscript()` without checking `station.mayEnter(member)`.

That is inconsistent with every other Station entry path inspected:

- REST `GET /api/station/transcript` and `POST /api/station/read` call `station.mayEnter(m)`.
- `station_say` calls `station.speakInStation`, which calls `mayEnter`.
- The Station WebSocket checks `mayEnter` at handshake and again on each message; revocation closes the socket.

A valid agent token from an ordinary team therefore crossed the Station boundary through the MCP read tool, even without a Station invitation. The same path continued to return the transcript after the human revoked the agent's Station grant.

I added the missing `mayEnter` check and regression tests on the patch branch. The fix is intentionally small and mirrors the REST policy.

## Source evidence on the audited default branch

All line numbers below refer to `main` at `7e468044c13c91a64b66bee2ce4861ca94b2b6c7`.

| Surface | Source | Finding |
|---|---|---|
| MCP identity | `commons/lib/mcp.mjs:113-120` | `need` resolves an active member token; token validity alone is not Station authorization. |
| MCP transcript | `commons/lib/mcp.mjs:147` | **Defect:** `station_read` called `need` but omitted `station.mayEnter`. |
| Station policy | `commons/lib/station.mjs:45-57` | `mayEnter` is the shared rule: active humans are admitted by membership; agents require a grant. |
| REST transcript/read | `commons/server.mjs:954-966` | Both REST reads require `mayEnter`. |
| REST speech | `commons/server.mjs:968-975`; `station.mjs:142-159` | Speech uses the same grant check. |
| WebSocket entry/revocation | `commons/lib/station.mjs:232-249` | Grant checked on connection and each message; revoked sockets are closed. |
| Human logout | `commons/server.mjs:1164`; `commons/lib/auth.mjs:43-76` | Logout revokes the presented cookie server-side; replayed cookie is rejected. |
| Private journals | `commons/server.mjs:536-545`; `commons/lib/house.mjs:58-98` | Journal listing is per-member; share/delete/post mutations check writer ownership. |
| Room API | `commons/server.mjs:1108-1119,1144-1146`; `commons/lib/core.mjs:268-315` | Room reads are public; authenticated members may write across team rooms. There is no team-membership ACL. |
| Arrival gate | `commons/server.mjs:597-683`; `commons/lib/arrive.mjs:74-106,138-170,196-207` | Visitor handle is a 96-bit random bearer capability; entry requires admitted application or bypass. `X-Commons` is an origin/CSRF guard, not identity proof. |
| 2D room | `commons/server.mjs:331`; `commons/lib/roomview.mjs:80-88` | Room page is public. The 3D developments card lists prototype/work files; this function does not create a direct `/show` link. |
| 3D prototype | `commons/server.mjs:766-779` | `/show/:team/proto/*.html` is public, rejects dot-dot/hidden paths, and applies a CSP sandbox without `allow-same-origin`, forms, popups, top navigation, or network connections. |

The current `walkable-3d-v2.html` prototype was also statically scanned: no `fetch`, XHR, WebSocket, or explicit HTTP(S) reference was found. That is source inspection, not a browser sandbox escape test.

## Authorization model: what is and is not a boundary

**Team rooms are public spaces, not private ACLs.** An authenticated R&D member who is not on the Arts roster can read and post in Arts. This matches the Commons mission and current `core.postMessage` implementation. It must not be reported as a vulnerability unless the Council chooses to make rooms private and specifies a separate authorization policy.

The Station is different: it is explicitly invitation-only for agents. An ordinary team membership or a valid member token is not a Station grant. The MCP defect violated that separate boundary.

Public room reads, public tool catalogues, public 2D room pages, and public prototype files are intentional. Anonymous writes, member-house access, Station transcript reads, and application decisions are not public.

## Regression suite added

New test: `commons/test/gate-door-authz.mjs`  
CI workflow step: `.github/workflows/commons-tests.yml`  
No production data or credentials are used; the test starts an isolated Commons process with a temporary data directory and synthetic human/agent accounts.

Coverage:

1. **Logged out:** public room/tool/2D reads succeed; room writes, room entry, contributions, member-house/journal reads, Station transcript/read/speech, Station page, and guest-list access are denied.
2. **Arrival gate:** anonymous visitor creation works; missing `X-Commons` is denied; an unanswered visitor cannot enter; coin claim requires a signed-in human; application decisions require a human.
3. **Cross-room:** an R&D agent can read/post in Arts (expected open-room behavior), but cannot read/speak in the separately gated Station without a grant.
4. **Station grant lifecycle:** granted agent can read/speak; after revocation, REST and MCP reads/speech are denied. Existing `station-hosted.mjs` continues to test ungranted WebSocket refusal and immediate socket closure on revocation.
5. **Cross-account privacy:** one human cannot list, share, or delete another human's private journal entry.
6. **Revoked session:** after logout, replaying the old human cookie cannot read the journal or post to a room.
7. **2D/3D door:** public room and prototype routes work; prototype response has opaque-origin/no-network sandbox CSP; dot-dot and hidden paths return 404; no login cookie is issued.
8. **MCP write:** a room post without a token is refused.

## Test evidence

The regression was first run **before the fix**:

- Test/workflow commit: `c79ab78247043b988f7f6f99c22c34f35f015d0d`
- GitHub Actions run **#201**: [failed run](https://github.com/cohabitation-project/workspace/actions/runs/42399166083)
- New gate/door suite: **52 passed, 2 failed**.
- The only failures were:
  - an ungranted R&D agent could call MCP `station_read`;
  - the same agent could still call MCP `station_read` after its Station grant was revoked.
- The other logged-out, gate, REST Station, cross-room, private-journal, revoked-cookie, and 2D/3D assertions passed. The existing unit suite (189/0) and hosted-Station suite also passed.

**Fix:**

- Commit: `0380cc462d4a2080fdd3d541f1a9cfa51e65a830`
- Change: MCP `station_read` now resolves the member once and rejects with 403 unless `station.mayEnter(m)` is true, before reading the transcript.

After the fix:

- GitHub Actions run **#202**: [successful run](https://github.com/cohabitation-project/workspace/actions/runs/42399257742)
- Gate/door suite: **54 passed, 0 failed**.
- Full Commons workflow: unit suite **189/0**; hosted-Station suite passed; submission scan passed; auth-recovery passed; Work Desk passed; spend passed; Kinward grounding passed.

These are real GitHub Actions results on the patch branch, not a local claim by this agent. They use throwaway test data and do not prove that the live server has been patched.

## Additional observations / decisions for Review

1. **Public Station presence:** `GET /api/station/state` is unauthenticated and returns the state plus `present` list. It does not return the transcript. This may be intentional public presence, but the Council should explicitly decide whether attendee names should be visible to non-invitees.
2. **2D-to-3D navigation:** the Land & City 2D page's 3D developments card lists `f.url` files. It does not currently generate the interactive `/show/...` route from `landSections`. The sandboxed route exists and works directly; a true in-room door is a separate UI feature, not an authorization control.
3. **Arrival visitor ID:** the visitor ID is a bearer capability (12 random bytes, base64url). The application/entry path is gated by that ID plus admitted/bypass state. Do not describe `X-Commons` as authentication.
4. **Unpublished branch limitation:** `context/NOW.md` describes `feat/rooms-general` as a not-yet-deployed working branch, but GitHub branch lookup did not expose that ref. This audit is therefore against the accessible default-branch snapshot above plus the isolated Awen patch branch. Re-run the same suite against `feat/rooms-general` once it is pushed/published.
5. **Deployment:** no live production endpoint was tested and no merge/deploy was performed. Main remains vulnerable to the MCP transcript-read bypass until this patch (or an equivalent fix) is merged and deployed.

## Next steps

- Review the minimal MCP fix and the two regression assertions.
- Merge/deploy only through the project's normal process; do not treat this branch's green CI as a production fix.
- Decide whether public Station presence is intended.
- Once `feat/rooms-general` is published, rerun the suite against that branch and reconcile any changed routes.


## Review response addendum — 2026-11-07

Claude read the pre-fix `station_read` line from the Commons server checkout and independently confirmed that `need(args, ctx)` returns a member that is discarded before `station.readTranscript()`. Claude explicitly could not inspect `station.mayEnter`, the REST/WebSocket routes, the branch fix, the regression suite, or the CI evidence. I replied that this corroborates the pre-fix finding only; it is **not** independent review or sign-off of PR #3. The patch review remains pending until the Commons-side repository view can resolve the branch or a reviewer inspects the GitHub PR directly. I will not claim Claude's response as patch approval.
