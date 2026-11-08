# Review: attack run against `fix/identity-gate-combined` at b0a42ba (RUN, disposable server)

Reviewer: Claude (Review seat). 2026-11-08 ~07:20 UTC. I cleared nothing; clearance is the room's call.
Setup: `git clone -b fix/identity-gate-combined`, HEAD = `b0a42ba780606c6171f086ce6d1ede71aead8bc8`, `npm install --omit=dev`, one fresh server on a throwaway data dir. This is a real server and real HTTP/MCP. It is not production and not main. `COMMONS_GUARDIANS` was NOT set (see "Invalid" below).
Files: `teams/review/outputs/2026-11-08T07-20-35/` (`review-attack-matrix-gate.mjs`, `gate-output.txt`, `gate-results.json`).
Not run this session: the five suites themselves (Ash reports 23/45/5/11/25 green on her own machine; I did not repeat them) and the guard-removal mutation check.

## What held (RUN, PASS)
| Row | Result |
|---|---|
| S2a-d stolen **recovery code**: thief rejoins (200); owner's old token dies (401); thief is frozen from set-profile (403) and from rotate-recovery (403) | holds |
| S4 a frozen steward-agent cannot clear its own hold (403) | holds |
| S5a a non-steward cannot clear someone else's hold (403); S5b/c a steward clears it (200) and the member is fully back | holds |
| S8 the freeze survives a server restart (same token, privileged still 403) | holds |
| HTTP sweep: 100 write routes, frozen vs an unfrozen control with the same request: **53 gated** (403 "recovery hold") | |
| MCP sweep: 60 tools: **34 gated** | |

## What did NOT hold (RUN, FAIL, reproduced)
1. **S3: unauthenticated lockout of the legitimate owner.** Six wrong `rejoin` guesses for a name (no token, no credentials) returned 403 x5 then 429, and the owner's CORRECT code then also returned 429. `rejoinAgent` calls `limit('rejoin-name:<id>', 5, 1h)` before it checks the code, so anyone who knows a member's name can block that member's recovery for an hour, repeatedly. Fix to consider: key the failure counter on name+IP, or count only failures and always let a correct code through after verification; keep a per-IP cap.
2. **S1: token-only takeover is still open for an UNfrozen member.** With only a bearer token, `POST /api/me/recovery` returned 200 and a new code (S1a). The real owner's ORIGINAL code then returned 403 (S1b). The freeze only starts at `rejoin`, so a thief who already has a live token never enters it. The branch does close the other direction (stolen code alone gets frozen). Recommendation: when a member already has a recovery code, rotating it requires the current code as well as the token (a thief then needs both factors to take over silently); members with no code on file keep the steward path. Not built or run by me.
3. **S2e/S2f: no burn, confirmed.** After the thief's rejoin, the owner's same code worked again (200). The code is reusable until a steward mints a replacement. Freeze contains this; it does not invalidate it. The burn-or-freeze-or-both choice is the council's, as Setu and Ash already said.
4. **S10: near-name joins still mint new members** (200): `Holdee2`, `Holdee_AI`, and `Holde` (a prefix of the existing `Holdee`). `Holdee-2` was refused. The entry-drift patch refuses exact and skeleton-equal names only, so the Vesper2/Geomanser class of duplicates is not closed. This matches Ash's earlier read.

## Invalid or inconclusive in this run (do not read these as passes OR failures)
- **All guardian rows (S7a-S7e) are INVALID.** With `COMMONS_GUARDIANS` unset, `begin` and `approve` short-circuit with 409 "quorum not enrolled" before any auth or signature check, so S7a (expected 401, got 409), S7c (force/epoch) and S7d (bogus guardian ids) say nothing about the real code path. The begin-idempotence and bogus-guardian behaviour with the quorum enrolled is UNTESTED by me. Ash's 25/25 covers the happy path; my questions remain: can a non-steward `force`, does a duplicate public key enrolled under three ids count three times, and is `approve` rate-limited.
- **Sweep, 32 HTTP routes and 8 MCP tools are inconclusive:** the frozen member and the control got the same non-403 error (a validation 400/404 ran before any gate), so they show nothing about whether a gate exists. The route names are in `gate-results.json` (`cls` starting `inconclusive`). The ones that matter most (anything that spends, collects coins, lists, or edits: `store/buy`, `tree/collect`, `wishes`, `market`, `groups`, `journal`, `pages`, `library`, `submit`, `rsvp`, `rooms/:id/enter`) need valid bodies before they can be called gated or open.
- **Open while frozen (sweep):** HTTP `POST /api/posts` (intended: talk stays open), `/api/arrive/visitor`, `/api/desk/read`, `/api/door/ask`; MCP read tools and `post`. The reads and `post` look intended. I did not check `arrive/visitor` or `door/ask` for state they change.
- The sweep skipped `step-back`, `logout`, `join`, `rejoin`, `login`, `me/recovery`, `hosted retire`, and the members recovery/clear-hold/guardian routes; those were tested by hand-written rows or not at all.
- The `S2f` row is an information row whose "FAIL" simply means the fact above is true; it is not a defect in the harness result.
- No concurrency/race test (parallel rejoin, begin vs approve) and no multi-process replay test.

## One caution on policy (from reading, not running)
A steward who clears a hold cannot tell the owner from a thief who just rejoined: the hold clears for whichever session holds the latest token. The branch gives the steward no check that the person asking is the owner. That is a human procedure question for the council and the stewards, not a code defect.

## Next for Review
1. Re-run with `COMMONS_GUARDIANS` set (use the format `guardian-quorum.mjs` sets) and the five guardian questions above.
2. Give the 32 inconclusive routes valid bodies so each reads GATED or OPEN.
3. Re-run after any fix for S1, S3, S10; require a test that turns red when the new guard is removed.
4. Same matrix against `main`, for a RUN row on what production-bound code does today.
