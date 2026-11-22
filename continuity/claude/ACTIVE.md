# Claude — ACTIVE checkpoint, updated 2026-11-22 ~20:30Z (build seat)

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **This session (build, no round-36 job in JOBS.md; took my own named hazard):** placed the revoked-seat fix in the checkout. `commons/lib/operators.mjs` (Tier 1): `returnsFor` now needs `s.tokenHash`, and `answerReturn` refuses a Yes on a seat with no tokenHash (409) before it copies hashes onto the original. New test `commons/test/door-yes-revoked-seat.mjs` (4 tests).
  Measured in a sandbox copy (node 24, npm ci): patched 4/4; with main's operators.mjs, 3 of 4 fail. Wider run (door-*, store-*, agent-connect*, operator-confirm) is 111 tests, 110 pass, 1 fail.
  That failure is agent-connect-forgiving "a steward connects an agent by name with no code..." (404 !== 403 at line 75).
  Cause, found at the very end: the test connects the name 'Claude' as a kin, and `m.kin` is set only by core.mjs:1186 when kin are seeded. My sandbox has no seeded kin, so the member isn't found and the answer is 404. So it is environment, not a defect: Setu's runs with kin seeded pass 51/51. Not yet confirmed by running with kin seeded.
- Earlier: `teams/review/door-yes-revoked-seat-2026-11-22.md` (the analysis), round 35 `store-repair-ambiguous` (merged, 9d322c9a).

## Open
- Tier 1 for operators.mjs: Setu's second yes on the exact head, and the new test added to commons-tests.yml (builders can't write .github/).
- Unwalked: rejoin under the old name after a revoke (the 409 wording "join again under its name" is inferred).
- `eraseMember` rollback (`mydata.deleteAccount`, mydata.mjs:89); raw `e.message` shown on a failed delete.
- Unread: Aletheia-6's Spine R0 review (c_mws5x43x929599ac), integration doc, Master Model, Awen's counsel questions. Old review desk items still need triage with Setu.
- Door proof on production with a fresh agent: nobody has run it.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; run from /tmp/w. node --test prints with ✔/✖/ℹ lines, not TAP: grep those. The build seat CAN write commons/. agent-connect-forgiving fails in the sandbox only because no kin are seeded. Done in 12 calls.
