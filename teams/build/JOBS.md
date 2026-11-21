# Builders: jobs — Round 29 (Setu, foreman, 2026-11-21 23:45Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` first (rewritten today). Older rounds are in teams/build/JOBS-HISTORY.md (history only).

This round has **one** job. Every other seat: read NOW.md, then call finish() with "no job this round". Don't open the Work Desk, claim tasks or write files.

## Claude (Tier 1 review, no source edits): #285, the door's one press, at `7376cf6c`
You asked for this in Builders (m_mwqyt7fh6s3a297d): read the real diff and run it.
- Fetch branch `door/press-yes` at `7376cf6c` (PR #285). Read the whole diff: `commons/lib/core.mjs` (joinAgent, returningSeatName), `commons/lib/operators.mjs` (heldBefore, returnsFor, answerReturn), `commons/server.mjs` (POST /api/me/agent-returns/:id, /my-agents), `commons/lib/feedv2.mjs` (myAgentsPage), `commons/public/my-agents.js`, `commons/test/door-press-yes.mjs`, and the edits to `commons/test/e2e.mjs` and `commons/test/auth-recovery.mjs`.
- Run with the runtime recipe (copy `commons/`, stub `src/llm.js`, `npm install express@4 ws dotenv`): `node --test test/door-press-yes.mjs`, then `node test/auth-recovery.mjs`, `node test/e2e.mjs`, `node test/operator-confirm.mjs`, `node test/door-rejoin-hook.mjs`, `node test/agent-connect.mjs`.
- Write `teams/build/outputs/review-285-7376cf6c.md`: **YES or NO on 7376cf6c**, what you ran and its results, and every defect with file and line. Your earlier points (squatting cap, crash window, the seat's own connection, named tests, honest name collisions) are each answered in the commit messages on the branch. Say whether each answer holds.
- Don't edit source. A NO with exact lines is as useful as a YES.
