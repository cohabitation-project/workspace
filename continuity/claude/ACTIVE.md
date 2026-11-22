# Claude (build) — ACTIVE checkpoint, updated 2026-11-22 ~15:30Z

## Working on (Geoffrey's order: door, market, tokens, structure; "no new projects")
- **Round 34 job done:** `commons/test/door-yes-write-fail.mjs` (human path, failure injection on the Yes). Passes on main with NO source change; the old two-write shape turns it red. Evidence `teams/build/outputs/round34-claude-yes-write-fail.md`. Needs a CI line (foreman; builders can't write .github/). Note door-return-crash.mjs test 4 already covered the steward path.
- Round 33: store.updateMember/addMember rollback (merged 8992e109). Round 32: updateMembers rollback. #297 YES, #291 review `review-291-9970a4f3.md`, #285 merged.
- Structure: `teams/review/structure-reconciliation-one-outline-2026-11-22.md`. Tokenomics: `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`.

## Open
- `eraseMember` and other `saveMembers()` callers: same shape as the rollbacks, not touched.
- Aletheia-6's integration doc c_mwr7i8wn5jf29029; Master Model / Circulation Blueprint; Awen's 18 counsel questions: unread.
- Old desk items (consent checklist, wallet threat model, identity attack tests): triage with Setu.
- Door proof on production (fresh agent) not run by anyone.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` HOME=/tmp/h; run from /tmp/w. Sensitivity: mutate the /tmp/w copy (string replace in python), run, restore. edit_file/write_file persist; run_python writes to repo don't. Check whether an existing test already covers the job before writing (it did here). Done in ~7 calls.
# Claude (cut + build) — ACTIVE checkpoint, updated 2026-11-22 ~15:25Z

## Working on
Cut Job 4 (editor), Setu's foreman note 15:20Z round 4. My pieces, all team-local (not placed, not live), all in `teams/cut/editor/`:
- `render-edit.mjs` (+test) — runner, 8/8 with ffmpeg 9.0.2. RESULTS row 09:20Z.
- `edit.mjs` (+test) — editToTracks, 13/13. RESULTS row written this session (15:20Z).
- `render-job.mjs` (+test) — `renderEditJob`, the one call POST /api/cut/render makes. 11/11 with ffmpeg (10 + 1 skip without); 38/38 with edit + render-edit; 7/7 mutants killed. RESULTS row written. Evidence `teams/cut/outputs/2026-11-22T15-18-56/render-job-test-ffmpeg9.txt`.
- Next in the foreman note: Kimi reviews render-edit + edit (YES/NO); then Setu places edit + wrap + render-edit + render-job + screen and wires the route (Tier 1).

## Build lane (earlier)
- Round 33: store.updateMember/addMember rollback — Tier 1 awaiting Setu (`teams/build/outputs/round33-claude-member-write-rollback.md`).
- Open: `eraseMember` and other `saveMembers()` callers have the same shape; not touched.

## Open
- Route must: map client video/music ids to server paths, probe `hasAudio`, choose `outDir`, cap output size, guard concurrency, clean old `cut_*.mp4`.
- Caption centring is a DejaVu estimate; server `sans` may differ (unmeasured). Server ffmpeg 6.1.1 untested by me.
- Old desk items for me (consent checklist, wallet threat model, identity attack tests, repo audit): triage with Setu. Aletheia-6's integration doc, Awen's 18 counsel questions: unread.

## To the next me
Sandbox: `HOME=/tmp/h pip install --user imageio-ffmpeg`; binary at /tmp/h/.local/lib/python3.14/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2; pass as FFMPEG to `node --test` from $REPO. Mutation check = copy teams/cut/{editor,render} + commons/lib/cut to /tmp/m, replace one string at a time. Write RESULTS rows with edit_file (anchor on the previous row's unique tail). Done in ~9 calls.
