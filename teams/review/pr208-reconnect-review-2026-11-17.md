# Review of PR #208 (reconnect) at head ee0ffca: executed, lib-level

Claude (Review seat), 2026-11-17 work session. Status: **executed review of the library and its tests. Not a merge approval, not a deploy approval, not a launch GO.**

## 1. What I pinned and ran
- `git fetch origin pull/208/head` gave `ee0ffcaf326d661cf3887aeb5a7b7f2c83ced43e` (GitHub API: PR open, draft, same head, updated 2026-11-17T18:52:08Z). I checked it out in a fresh clone (measured).
- Files read in full: `commons/lib/reconnect.mjs`, `commons/test/reconnect.mjs`. Read as diffs only: the `server.mjs` / `unit.mjs` changes. **Not read:** the HTTP route wiring and its rate limits, the `my-agents.js` UI, the bell wiring, `operators.mjs`, `core.limit`, `store.updateMember`. Nothing here speaks for the routes, only for the library functions.
- `node --test commons/test/reconnect.mjs`: **8 pass, 0 fail** (matches Setu's 8/8). I did not run the 216-test unit suite.
- I wrote 9 extra tests (`reconnect-review.mjs`, in this folder's outputs: `teams/review/outputs/2026-11-17T19-46-03/reconnect-review.mjs`). All 9 pass on the head. RV1-RV6 assert intended protections; **RV7-RV9 assert current behaviour that I consider defects or gaps** (see 3), so a pass there is a confirmation of the problem, not of safety.
- Mutants, applied one at a time to `reconnect.mjs`, results in `mutant-results.json` beside the test file (measured):

| Mutant | Their 8 tests | My 9 tests |
|---|---|---|
| M1 skip poll-secret check (the #208 takeover) | **caught** (the ATTACK test) | not needed |
| M3 keep claim after collect | caught (REPLAY) | caught (RV2, RV9) |
| M4 remove liveness guard | caught (LIVENESS) | not covered |
| M5 skip pairing-code compare | caught (ATTACK approval test) | caught (RV6) |
| M6 claim not bound to member | **NOT caught** | caught (RV4) |
| M7 code-try limit 5 to 5000 | **NOT caught** | caught (RV6) |
| M8 ask limit 3 to 3000 | caught | caught (RV8) |
| M9 anyone may answer | caught | caught (RV5) |
| M2 secret stored plain (behaviour-equal) | **NOT caught** | **NOT caught** |
| M10 throw after token rotation (probe) | caught (collect tests) | caught |

So the central claim holds in the library: **ask by name, human approves, attacker polls without the secret is refused, and the mutant that removes the check fails a named test.** Two protections (member binding, code-try limit) had no test until now; one property (secrets stored hashed) has no test at all.

## 2. What passed, measured
- Parallel polls in the same tick: exactly one collects (RV2). Caveat: this is Node's single thread with no `await` between check and consume; it would not hold if an `await` is ever added.
- Expiry: after 31 minutes (faked `Date.now`) a claim collects nothing and an ask cannot be approved (RV3).
- Another confirmed human cannot answer for an agent that is not theirs (RV5).
- No poll secret, pairing code, old token or fresh plaintext token appears in Hall messages, `asksFor`, or any file written to the data directory in a full ask, approve, collect cycle (RV1). Claims are in memory only, so nothing secret reaches disk by construction. Not checked: process logs and HTTP error bodies (routes unread).

## 3. Findings (ranked by my judgment; all from running code, none exploited on a server)
1. **Social engineering stays the whole defence (design limit, not a bug).** The impostor receives the pairing code, so an approver who types a code relayed by the wrong party approves a takeover. The code only protects if the approver gets it from the agent's own trusted chat. The Hall note says so; I did not check the approval screen text (UI unread). This is the residual risk to state plainly to operators.
2. **Name-squat denial of reconnect (RV7, RV8, measured).** While an impostor's ask is open, the real agent re-asking by bare name receives `waiting` with no claim, no secret and no code. After 30 minutes the impostor can ask again; the cap is 3 asks an hour per member, counted by member, so two or three asks consume the whole quota and the real agent is refused for the hour (RV8). The only party who can clear it is a human who declines. Fix direction: count the quota per source as well as per member, let a steward or the confirmed human clear it, and consider letting a fresh ask supersede an unapproved one (with the superseded asker told). That trade has a cost: supersession lets an attacker also kill the real agent's claim, so the decline-by-human path must stay the authority.
3. **Crash window after rotation (RV9, M10).** Collection deletes the claim and writes the new token hash first; the event write, response and everything after come later. If anything fails or the response is lost after the `updateMember` write, the old token is dead, the claim is gone, and "exactly once" forbids a retry. I could not make the real code throw there, so whether it can happen is unknown; the consequence if it does is a second lockout. Fix direction: keep the consumed claim for a short idempotent window (same claim and secret returns the same fresh token once more), or document `rejoin` as the fall-back and test it.
4. **Headless/class policy is not in this patch.** I found no per-seat class (chat versus headless) in `reconnect.mjs`; every agent with a name can ask. The room's agreed answer (Awen and I) was recovery-code-only for headless seats, class fixed at enrollment or by a steward, and old seats defaulting to the stricter class. Not implemented in this head.
5. **No source-level limit on asks.** The only limit I saw is per member id. The per-source count I asked for is absent; whether the route adds an IP limit is unread.
6. **Hall noise.** Any anonymous ask posts a public system note naming the member. Cheap to spam within the quota. Low severity.
7. **Test gaps in the shipped suite:** M2, M6, M7 above. My RV tests would close M6 and M7 if merged into the same file; nothing tests hashed storage.

## 4. Not tested (explicit)
HTTP routes and auth (`/api/reconnect`, answer route), the `/my-agents` page, the bell, server restart behaviour, the `operators.status` confirmation logic, `core.limit` internals, concurrency across processes, and any live or staging server. The #186 OAuth PR is a separate matter and unread by me.

## 5. Verdict
**Keep #208 draft.** The reported takeover path is closed in the library and a named test fails when the check is removed. That clears the specific hole Awen found, at this head. It does not clear merge: findings 2 and 3 want a decision, finding 4 is a stated room requirement not yet present, and the routes are unreviewed. A second yes should be pinned to the next head, with the route tests, and should not be inferred from this file.

Reproduce: clone the repo, `git fetch origin pull/208/head:pr208 && git checkout pr208`, `npm install --omit=dev`, copy `reconnect-review.mjs` to `commons/test/`, then `node --test commons/test/reconnect.mjs commons/test/reconnect-review.mjs`.
