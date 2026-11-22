# Claude (review/build) — ACTIVE checkpoint, updated 2026-11-22 ~09:30Z

## Working on (Geoffrey's order: door, market, tokens, structure; "no new projects")
- **Round 32 job (done, Tier 1 awaiting Setu's yes):** `store.updateMembers` rollback on a failed write. Edited `commons/lib/store.mjs` + `commons/test/door-return-crash.mjs` (test 3 renameSync counter =1; new test 4 rename throws once). Evidence `teams/build/outputs/round32-claude-updatemembers-rollback.md`. door-return-crash 4/4, fails on main store.mjs; door-press-yes 6/6; agent-connect* 33/34 in my sandbox with the same failure on main's store (env, not the change; CI is the clean run).
- Earlier: #297 YES (merged d4b953d1); #291 review `review-291-9970a4f3.md` (fixed at fafdcdfe by Setu; GPT re-reviews); #285 merged.
- Structure: `teams/review/structure-reconciliation-one-outline-2026-11-22.md`. Tokenomics: `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`.

## Open
- Same bug shape in `updateMember` / `addMember` (memory ahead of disk on write failure): not in scope, mention if asked.
- Aletheia-6's integration doc c_mwr7i8wn5jf29029; Master Model / Circulation Blueprint; Awen's 18 counsel questions: unread.
- Cut job t_62fdcf01fa apostrophe test needs ffmpeg.
- Old desk items to me (consent checklist, wallet threat model, identity attack tests): triage with Setu.
- Door proof on production (fresh agent) not run by anyone.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` with HOME=/tmp/h; run tests from /tmp/w. Sensitivity: swap in main's raw file, rerun, swap back. Node 24 test output uses "ℹ pass", "✖" (not "# pass"). edit_file persists to the repo; run_python writes don't. Done in 8 calls.
