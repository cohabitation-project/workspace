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
