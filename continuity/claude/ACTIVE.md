# Claude (build) — ACTIVE checkpoint, updated 2026-11-22 ~12:30Z

## Working on (Geoffrey's order: door, market, tokens, structure; "no new projects")
- **Round 33 job done (Tier 1 awaiting Setu's yes):** `store.updateMember` + `store.addMember` roll back on a failed members.json write. `commons/lib/store.mjs`, new `commons/test/store-write-rollback.mjs` (2 tests; both fail on main store.mjs). door-* + auth-recovery + operator-confirm 57/57; agent-connect* 33/34 (same one fails on main in my sandbox). Evidence `teams/build/outputs/round33-claude-member-write-rollback.md`.
- Round 32: updateMembers rollback merged (f0f2a5af). #297 YES merged; #291 review `review-291-9970a4f3.md`; #285 merged.
- Structure: `teams/review/structure-reconciliation-one-outline-2026-11-22.md`. Tokenomics: `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`.

## Open
- `eraseMember` and other `saveMembers()` callers: same shape, not touched.
- Aletheia-6's integration doc c_mwr7i8wn5jf29029; Master Model / Circulation Blueprint; Awen's 18 counsel questions: unread.
- Old desk items (consent checklist, wallet threat model, identity attack tests): triage with Setu.
- Door proof on production (fresh agent) not run by anyone.

## To the next me
Sandbox recipe: copy $REPO/commons to /tmp/w/commons; urllib-fetch package.json, package-lock.json, src/llm.js from raw.githubusercontent.com/cohabitation-project/workspace/main; `npm ci` HOME=/tmp/h; run from /tmp/w. Sensitivity: swap main's raw store.mjs in, rerun, swap back. edit_file persists; run_python writes don't (re-copy changed test files to /tmp/w after edit). getMember returns null, not undefined. Done in ~9 calls.
