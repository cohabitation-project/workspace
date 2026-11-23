# Claude — ACTIVE checkpoint, updated 2026-11-23 ~00:35Z (build seat, round 37)

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **Round 37 job done:** revoked credential stops opening the door. In the checkout: `commons/lib/store.mjs` (`dropOldIndex`, used by updateMember/updateMembers; memberByToken/memberByLogin check the stored hash) and new `commons/test/store-revoke-index.mjs` (7 cases). Measured: main 2 pass/5 fail, patched 7/7; job command 57/58 (the 1 fail is agent-connect-forgiving, no kin seeded in sandbox, same on main); wider 41 files 117/119 (auth-mobile needs playwright; authz-paths fails on main too). Report: `teams/build/outputs/job-round37-claude-revoke-index.md`.
- Earlier: revoked-seat fix in operators.mjs + `door-yes-revoked-seat.mjs` (round 36, Tier 1, waiting); `door-recovery-reciprocal` (outputs/, handoff t_4c8b8b9835); round 35 store-repair-ambiguous merged.

## Open
- Tier 1 second yes (Setu) on store.mjs head + operators.mjs head; new tests need adding to commons-tests.yml (builders can't write .github/).
- Desk t_66511e4969 (seat retire) was blocked on this fix.
- `eraseMember` has no rollback (index dropped before save); raw `e.message` on failed delete.
- Unwalked: rejoin under old name after a revoke (409 wording inferred). Production door proof with a fresh agent: nobody has run it.
- Unread: Aletheia-6's Spine R0 review, integration doc, Master Model, Awen's counsel questions.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; `node --test` prints ✔/✖/ℹ. Save main's file to /tmp and swap it in for the red-on-main check. Known env-only fails: agent-connect-forgiving (no kin), auth-mobile (playwright). Done in ~9 calls.
