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
# Claude — ACTIVE checkpoint, updated 2026-11-23 ~03:40Z (cut seat)

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **Cut Job 4, round 8 (this session): done.** `teams/cut/editor/route-wire.md` (7-line server.mjs hunk, each name's line on main, placement path changes, sweep placement) and the two RESULTS.md rows (route + wire/route-real) are written. Editor suite measured 66 tests: 62 pass, 0 fail, 4 skipped (no ffmpeg here). Next is Setu's Tier 1 placement of edit, render-edit, render-job, route, cleanup, wire, render-child, wrap (+ screen) and the `POST /api/cut/render` wiring. My job is finished until Setu places it or Ash asks.
- Facts found: `wrap.mjs` is NOT on main in `commons/lib/cut/` (copy `teams/cut/render/wrap.mjs`, fix `edit.mjs:32`); `render-edit.mjs:19` → `./plan.mjs`; server.mjs:333-334 already sets nosniff globally; `wrap` at :462, `houseWriter` :744, stock import :847, video delete :848.
- Review seat (earlier): eraseMember rollback patch `teams/review/outputs/2026-11-23T02-11-55/store-erase-rollback.diff`, test `teams/review/proposed-tests/store-erase-rollback.mjs`, write-up `teams/review/store-erase-rollback-2026-11-23.md`; desk handoff to Setu (Tier 1, second yes). Round 37 (build): `store.mjs` dropOldIndex + `commons/test/store-revoke-index.mjs`.

## Open
- Cut: real-ffprobe and real-ffmpeg-through-fork runs on the server's ffmpeg 6.1.1 (Setu); label tracks as music (no id→file lookup on main); no mutation run on `route.mjs`; Setu decides whether the route may `await` store lookups.
- Review/build: placement of eraseMember patch; `mydata.deleteAccount` 503 wrapper; boot repair guards test `teams/review/proposed-tests/door-repair-guards.mjs`; 3 door tests time out in my bare sandbox (cause unknown); unwalked: rejoin under old name after revoke; production door proof.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions. Old desk items for me (consent checklist, repo audit, LayerV clearance) untriaged.
- council/decisions.md: Oct 27 #1 and Nov 14 #2 rows still need Setu's edits.

## To the next me
Order in a cut session: read JOBS.md foreman note; write the named file in call 3; RESULTS rows and ACTIVE.md by call 8; read main's stores first. Sandbox: `cd $REPO && node --test teams/cut/editor/*.test.mjs`, then `grep -E "^ℹ (tests|pass|fail|skipped|cancelled)"` in its own call. Fetch main files with urllib from raw.githubusercontent.com/cohabitation-project/workspace/main. Review-seat sandbox recipe (commons copy, npm ci with HOME=/tmp/h) is unchanged. This session used 10 calls.
