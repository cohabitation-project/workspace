# Claude (build) — ACTIVE checkpoint, updated 2026-11-22 ~18:30Z

## Working on (Geoffrey's order: door, market, tokens, structure; "no new projects")
- **This session (JOBS.md still Round 34, already done):** took Aletheia-6's source-pinned door risk `c_mws2e31h0lce27b1` (startup repair in store.init retires a seat without reciprocal/kind/deleted/competing checks). Files in `teams/build/outputs/door-recovery-reciprocal/`: `door-recovery-reciprocal.mjs` (6 tests, 1 pass/5 fail on main, 6/6 with patch; case 5 shows order-dependent identity on main) and `RESULT.md` (measurements, policy, risks, diff for store.mjs). Tier 1: Setu places/reviews. Needs CI line. Key risk: "token held by several live records opens none" — someone with data access should count duplicate live tokenHashes in production members.json first.
- Round 34: `door-yes-write-fail.mjs` (passes on main, no source change). Rounds 32/33: updateMembers, updateMember/addMember rollback merged.

## Open
- `eraseMember` and other `saveMembers()` callers: same shape as the rollbacks, not touched (Aletheia-6 says I own it).
- REST/MCP/WS agree-on-canonical-id after repair: not tested (only the store answer).
- Aletheia-6's integration doc c_mwr7i8wn5jf29029; Master Model; Awen's 18 counsel questions: unread.
- Old desk items (consent checklist, wallet threat model, identity attack tests): triage with Setu.
- Door proof on production (fresh agent) not run by anyone.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` HOME=/tmp/h; run from /tmp/w. store.mjs has module state: probe each fixture in a spawned node process. Compare patched vs main whole-suite by failure NAME (set diff), many sandbox failures are identical on both. When JOBS.md is stale (my job already done), pick the open item named in the room by a reviewer, and say so. Done in ~9 calls.
# Claude (build) — ACTIVE checkpoint, updated 2026-11-22 ~18:35Z

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **Round 35 job done (Tier 1, awaiting Setu):** startup repair cuts and tells. New `commons/test/store-repair-ambiguous.mjs` (10 tests; red on main 8 fail, green 10/10; 5 mutants killed) and `commons/lib/store.mjs` `init()` -> `repairSharedCredentials(list)`. Result file `teams/build/outputs/round35-claude-store-repair-ambiguous.md`. The foreman branches it `kin-build/20261122-<hhmm>-claude`.
- Open hazard I flagged, not fixed: a revoked seat keeps `returning_to`; `answerReturn` on it would write a null tokenHash to the original. One-line guard in operators.mjs (409 if `!seat.tokenHash`) or clear `returning_to` in the repair. Setu decides.
- Two interpretation calls to confirm are in the result file (case 3 retired original; pair proven by returning_to only).
- Earlier: round 34 door-yes-write-fail (7/7); round 33 store.updateMember/addMember rollback (merged); round 32 updateMembers rollback; #297 YES; #291 review.

## Open
- `eraseMember` and other `saveMembers()` callers: same rollback shape, untouched (store.mjs is Tier 1 now).
- agent-connect*: one failing test ("a steward connects an agent by name with no code...") fails on main too (33/34). Unexplained; someone should look.
- Aletheia-6's integration doc; Master Model / Circulation Blueprint; Awen's 18 counsel questions: unread.
- Door proof on production (fresh agent) not run by anyone.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` HOME=/tmp/h; run from /tmp/w. store.mjs keeps module-level state, so every case in one test file needs its own ids/hashes. Mutants: replace strings in the /tmp/w copy, run, restore. Write the test first (red on main), then edit. Done in ~9 calls.
