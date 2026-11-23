# Claude — ACTIVE checkpoint, updated 2026-11-23 ~06:35Z (cut seat, round 9)

## Working on (Geoffrey: door, market, tokens, structure; "no new projects")
- **Cut Job 4, round 9: done.** Placement bundle: `teams/cut/place/README.md` (diff table, proof) + `teams/cut/place/build-bundle.py` (rebuilds the tree on any checkout) + 14 flat files in `teams/cut/outputs/2026-11-23T06-17-33/` (`commons__lib__cut__*.mjs`, `commons__test__cut-*.test.mjs`). Proof: over fresh main 91962ccb, `node --test commons/test/cut-*.test.mjs` = 59 tests, 55 pass, 0 fail, 4 skipped (real-ffmpeg; none here). Only import lines differ (edit.mjs:32, render-edit.mjs:19, test imports). RESULTS.md row written. No server.mjs change.
- Next in Cut: GPT's read of `route-wire.md` against today's server.mjs (`teams/cut/outputs/review-route-wire.md`), then Setu copies the bundle, applies the hunk, runs a real render on staging (Tier 1).
- Earlier: round 8 route-wire.md; build rounds 35–38 (store-repair-ambiguous, door-yes-revoked-seat, dropOldIndex merged; eraseMember rollback awaiting Setu's second yes).

## Open
- Cut: bundle doesn't include the screen (cut.html/js/css + editor-page test): needs a decision on where the page is served. Real ffprobe / real ffmpeg through fork on the server (Setu). Label tracks as music (no id→file lookup on main). No mutation run on route.mjs. If commons-tests.yml lists tests by name, add the six cut-*.test.mjs (not read).
- Build/review: `mydata.deleteAccount` 503 wrapper; add store-erase-rollback + store-revoke-index to commons-tests.yml; boot repair guards test `teams/review/proposed-tests/door-repair-guards.mjs`; 3 door tests time out (15 s) in my bare sandbox (cause unknown); unwalked: rejoin under old name after revoke; production door proof.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions. council/decisions.md Oct 27 #1 and Nov 14 #2 rows need Setu's edits.

## To the next me
- run_python can't make subfolders in $OUT (EACCES, whole call's output lost) and can't write into the repo: keep $OUT flat, or ship a small generator script via write_file and verify it byte-for-byte against the tested copy (that's what round 9 did, in 7 calls).
- `git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/main` works from the sandbox: that's the "fresh main checkout". Cut tests need no npm ci.
- Order: read JOBS.md; build + run in 2–3 calls; write README/RESULTS/ACTIVE by call 8; grep `^ℹ (tests|pass|fail|skipped|cancelled)` for totals.
# Claude — ACTIVE checkpoint, updated 2026-11-23 ~06:35Z (build seat, round 39)

## Working on (Geoffrey: door, market, pages, structure, tokens; "no new projects")
- **Round 39 (done):** `deleteAccount` now turns an eraseMember throw into a CommonsError 503. Files: `commons/lib/mydata.mjs` (try/catch around `store.eraseMember`, import CommonsError) + new `commons/test/mydata-delete-write-fail.mjs`. Red on main 2/1 (raw EIO, no status), patched 3/3; wider 43/44 (known agent-connect-forgiving artifact). Write-up `teams/build/outputs/round39-claude-delete-503.md`. Message deliberately does NOT say "nothing was lost" (content is erased before eraseMember). Tier 1: Setu's second yes on the exact head.
- Round 38: eraseMember rollback merged (d61759c9). Round 37: revoke index (2f3b51b4). Earlier: store-repair-ambiguous, door-yes-revoked-seat.

## Open
- Add store-erase-rollback, store-revoke-index, mydata-delete-write-fail to commons-tests.yml (foreman).
- Booted-server walk of the 503 page (server.mjs:987 deletePage) not done.
- Boot repair guards for behaviour B (returning_to, kind, retired): proposed test `teams/review/proposed-tests/door-repair-guards.mjs`.
- 3 door tests time out (15 s) in my bare sandbox on main too; cause not found.
- Unwalked: rejoin under old name after a revoke on a live door; production door proof with a fresh agent.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions. Old desk items (consent checklist, repo audit, LayerV clearance) untriaged.
- council/decisions.md Oct 27 #1 and Nov 14 #2 rows still need Setu's edits.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons (build seat's write_file edits ARE in $REPO); urllib-fetch package.json, package-lock.json, src/llm.js and main's changed file from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; run `node --test` in /tmp/w; grep ✔/✖/ℹ. Red-on-main = run the new test before editing the lib (the copy then still equals main). Done in 11 calls.
