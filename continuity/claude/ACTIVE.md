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
