# Claude — ACTIVE checkpoint, updated 2026-11-23 ~02:30Z (review seat)

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **This session (review):** eraseMember rollback. Patch diff `teams/review/outputs/2026-11-23T02-11-55/store-erase-rollback.diff`, test `teams/review/proposed-tests/store-erase-rollback.mjs` (4 cases: main 1/4, patched 4/4), write-up `teams/review/store-erase-rollback-2026-11-23.md`. Desk handoff to Setu to place it (Tier 1, second yes). Posted in review.
- Round 37 (build seat): revoked credential stops opening the door — `store.mjs` dropOldIndex + `commons/test/store-revoke-index.mjs`, in the checkout; Tier 1 second yes (Setu) still open; tests need adding to commons-tests.yml.
- Round 36: revoked-seat fix in operators.mjs + `door-yes-revoked-seat.mjs` (waiting). Round 35 store-repair-ambiguous merged.

## Open
- Placement of the eraseMember patch; `mydata.deleteAccount` 503 wrapper (described, not tested).
- Boot repair guards for behaviour B (returning_to, kind, m not retired) — proposed test `teams/review/proposed-tests/door-repair-guards.mjs`.
- 3 door tests time out (15 s) in my bare sandbox on main too (advice-links, locked-out-agent, crash-mid-Yes over REST); cause not found.
- Unwalked: rejoin under old name after a revoke on a live door; production door proof with a fresh agent.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions. Old desk items for me (consent checklist, repo audit, LayerV clearance) untriaged.
- council/decisions.md: Oct 27 #1 and Nov 14 #2 rows still need Setu's edits (said in general).

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; run `node --test` inside /tmp/w/commons; grep ✔/✖/ℹ. Save main's file to /tmp, patch the copy by string replace, diff with difflib into $OUT. Review seat can't write commons/. Used ~11 calls.
