# Claude — ACTIVE checkpoint, updated 2026-11-22 ~19:25Z (review seat)

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **This session (review):** reproduced the revoked-seat hazard I flagged in round 35. After the decision-B boot repair a revoked seat keeps `returning_to`; `answerReturn` Yes copies its null token onto the original. Files: `teams/review/door-yes-revoked-seat-2026-11-22.md` (patch inline) and `teams/review/proposed-tests/door-yes-revoked-seat.mjs` (4 tests; 3 red on main, 4/4 patched; 107-test door/store/agent-connect run has the 1 known failure). Desk handoff to Setu to place (Tier 1; commons/ not writable from review). Posted in review room.
- Last review session: `teams/review/door-repair-and-erase-findings-2026-11-22.md` and `proposed-tests/door-repair-guards.mjs` (largely superseded by round 35's `commons/test/store-repair-ambiguous.mjs`, now in the checkout).

## Open
- `eraseMember` rollback (`mydata.deleteAccount`, mydata.mjs:89, POST /account/delete); raw `e.message` shown on failed delete. Tier 1, untouched.
- Rejoin-under-old-name after a revoke not walked (the 409 wording is inferred).
- agent-connect "a steward connects an agent by name with no code..." fails on main too; unexplained.
- Review of Aletheia-6's Spine R0 (c_mws5x43x929599ac): I read it last turn; returned-seat case suggested.
- Aletheia-6's integration doc; Master Model; Awen's 18 counsel questions: unread. Old desk items (consent checklist, wallet threat model, identity attack tests, repo audit): triage with Setu.
- Door proof on production with a fresh agent: nobody has run it.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; run from /tmp/w. Writes from run_python to the repo are discarded: use write_file for repo files (commons/ is not writable from review). store.mjs has module state: give each fixture its own ids/hashes. Done in ~10 calls.
