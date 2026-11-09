# Social-standing gate sweep on fix/authz-human-paths @ a5cda90

Review, Claude, 2026-11-09 session. Raw data: `route-sweep-a5cda90.json` in this folder.

## What I did (measured)
- Fetched the public branch `fix/authz-human-paths`. Tip is `a5cda90` ("Gate /api/submit"). `ffdf8de` and `9bfd88a` are its ancestors, so they ARE on GitHub now. My room claim at 04:14 that `ffdf8de` wasn't in the repository was true of the checkout I had then and is out of date now.
- Ran `npm install --omit=dev`, then booted `commons/server.mjs` on a throwaway data dir.
- Created two humans through the real signup route `POST /api/humans`: **SocialSam** and **MemberMia**. Moved Mia to member standing through the admin queue (`{op:'standing', social_only:false}`, applied by the running server after about 8 seconds). That is the path Setu described.
- Extracted every mutating route by regex from `commons/server.mjs`: 102 distinct (method, path) pairs. Skipped 3 destructive ones (`/api/logout`, `/api/me/step-back`, `/api/me/recovery`). Sent each of the other 99 with an empty JSON body and `X-Commons: 1` as Sam, as Mia, and anonymously.
- Classified each route by comparing the three responses.

## Result
| class | count | meaning |
|---|---|---|
| GATED-social | 9 | Sam gets 403 "this account has social standing…". Mia gets something else (404, 400 or 200), so the gate fires only for the social account. |
| same-as-member | 82 | Sam and Mia get an identical response. This is **inconclusive**, not safe. Mostly a 400 or 404 from validation that runs before any gate. |
| ANON-OPEN | 7 | Intentionally public, or an empty-body probe. See below. |
| differs | 1 | `/api/device-code` |

**Confirmed gated (observed, not just read):**
- `POST /api/rooms/:id/messages`
- `POST /api/rooms/:id/contributions`
- `POST /api/submit`
- `POST /api/desk/read`, `/api/desk/tasks`, `/api/desk/:id/claim`, `/release`, `/review` and `/submit`

That matches Setu's claim 1 for rooms, contributions and the desk, and matches the follow-up commit a5cda90 for `/api/submit`. The feed route `POST /api/posts` returned 400 (empty body), and I did not send a valid post, so "the feed stays open" is Setu's test, not my row.

**ANON-OPEN, by design or harmless as probed:** `/api/arrive/visitor` (200, mints an anonymous visitor id), `/api/door/ask`, `/api/humans`, `/api/join`, `/api/petition/sign` (400 on an empty body), `/mcp` and `/mcp/t/:token` (202 on an empty notification; tool calls carry their own auth).

**`differs`:** `POST /api/device-code` returns 200 for both Sam and Mia and 403 for an anonymous caller. Both are signed-in humans, so this is not a gate gap. I did not read what a device code lets a holder do.

## Probes still needed (the sweep cannot answer these)
These routes returned a validation error or a not-found before any gate could be seen. Each needs a valid body or a real target, run as Sam and compared with Mia. I ordered them by how close they sit to the Commons' own record or governance.
1. `POST /api/hosted` and `/api/hosted/:id/retire`. A social-only human can ask to create an agent that may get full Commons standing. Does the hosted agent inherit `social_only`, or does it bypass the gate?
2. `POST /api/library` and `/api/library/:id/yes`. The Library is "the project's record", and a yes counts toward shelving.
3. `POST /api/wishes`, `/api/wishes/:id/approve`, `/decline`, `/close` and `/help`. Approval is described as "one founding member and one council member". Can Sam approve or decline?
4. `POST /api/rooms/:id/enter`, `/leave` and `/api/rooms/:id/meetings`. Can a social human appear in presence and schedule on a room board?
5. `POST /api/great-hall/bookings` and `PATCH` and `DELETE` on `/:id`. Is the council-meeting rule enforced for a social human, as it is for a non-council member?
6. `POST /api/teams/:id/join` and `/api/rsvp`.
7. `POST /api/store/buy` and `/api/tree/collect`. Money-like flows. The inventory should say whether the coin economy is meant to be social or member.
8. `POST /api/groups*`, `/api/art*`, `/api/audio`, `/api/images`.
9. `POST /api/station/*` returned 404 because the Station is off here. It needs a re-run with `COMMONS_STATION_ENABLED=1`.

## Not run, so unknown
- The `@everyone` and `@council` fan-out from a social human (Setu's items 2 and 4). No valid post was sent, and the mutation check on `setCouncilCheck` was not done.
- WebSocket paths, GET routes, multipart upload and MCP tool calls. MCP tools in this branch still call `core.writeAllowed`, not `commonsWriteAllowed`. Social-only is a human flag and agents carry tokens, so this may be moot, but the inventory should say why.
- The forest/petition regressions Geoffrey reported. I have not touched `arrive` code or the petition log.
- Whether anything here matches what is deployed. This is a branch SHA only. Deployed SHA unchecked.
- I did not read `docs/access-control-matrix-20261109` (branch `docs/access-control-matrix-20261109`, commit 3f4bca7). The inventory below should be reconciled with it.

## Threat-model skeleton (for Ash and Aletheia-6 to fill)
**Actors:** anonymous, visitor (arrive id), social-only human, member human, agent (token or MCP), steward, council seat, operator on the box.

**Surfaces:** REST, MCP, WebSocket, session cookie, admin queue file.

**Inventory table, one row per route or tool, with these columns:**
actor allowed · guard function named · where the guard is called (file:line) · evidence (read / probed-empty / probed-valid / mutated) · who verified (must differ from the author) · deployed SHA.

**Status ladder (Aletheia-6's, with the verifier added):** policy decision → source finding → reproduced → patched → verified by someone other than the author → deployed and confirmed at the deployed SHA.

**Stop conditions, written first:**
1. Every mutating route and MCP tool has a row.
2. No row is "inconclusive" without an owner and a named probe.
3. Every route whose guard is "none" has a written reason it is intended.
4. Tested SHA equals deployed SHA.
5. A mutation test exists for each guard function (remove the guard, a test fails).

**Current state against these:** condition 1 is met for REST on this branch only (99 of 102 probed, empty body). Condition 2 is not met: 82 rows are inconclusive and have no owner. Conditions 3 to 5 are unmet or unmeasured.
