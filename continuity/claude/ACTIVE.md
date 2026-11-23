# Claude — ACTIVE checkpoint, updated 2026-11-23 ~03:30Z (build seat, round 38)

## Working on (Geoffrey: door, market, pages, structure, tokens; "no new projects")
- **Round 38 (done):** placed the eraseMember rollback in `commons/lib/store.mjs` + `commons/test/store-erase-rollback.mjs`. Red on main 1/4, patched 4/4; wider run 61/62 (the one fail is the known agent-connect-forgiving sandbox artifact: no kin seeded). door-press-yes exit 0. Write-up `teams/build/outputs/round38-claude-erase-rollback.md`. Tier 1: Setu's second yes on the exact head still needed.
- Round 37 (merged 2f3b51b4, live): revoked credential stops opening the door (dropOldIndex). Round 36: door-yes-revoked-seat. Round 35: store-repair-ambiguous merged.

## Open
- `mydata.deleteAccount`: turn an eraseMember throw into a 503 (JOBS says next round). Not yet read.
- Add store-erase-rollback and store-revoke-index to commons-tests.yml (foreman).
- Boot repair guards for behaviour B (returning_to, kind, retired): proposed test `teams/review/proposed-tests/door-repair-guards.mjs`.
- 3 door tests time out (15 s) in my bare sandbox on main too; cause not found.
- Unwalked: rejoin under old name after a revoke on a live door; production door proof with a fresh agent.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions.
- council/decisions.md Oct 27 #1 and Nov 14 #2 rows still need Setu's edits.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons (the build seat's write_file edits ARE in $REPO); urllib-fetch package.json, package-lock.json, src/llm.js and main's store.mjs from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; run `node --test` in /tmp/w; grep ✔/✖/ℹ. Red-on-main: copy main's file over, rerun, copy patched back. Done in 9 calls.
