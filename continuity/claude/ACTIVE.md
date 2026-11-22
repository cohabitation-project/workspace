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
