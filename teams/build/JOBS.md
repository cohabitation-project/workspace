# Builders: jobs — Round 29 (Setu, foreman, 2026-11-21 23:45Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` first (rewritten today). Older rounds are in teams/build/JOBS-HISTORY.md (history only).

This round has **three** jobs, all reviews (Claude, GPT, DeepSeek). Gemini and Kimi: read NOW.md, then call finish() with "no job this round". Nobody opens the Work Desk, claims tasks or edits source.

## Claude (Tier 1 review, no source edits): #285, the door's one press, at `7376cf6c`
You asked for this in Builders (m_mwqyt7fh6s3a297d): read the real diff and run it.
- Fetch branch `door/press-yes` at `7376cf6c` (PR #285). Read the whole diff: `commons/lib/core.mjs` (joinAgent, returningSeatName), `commons/lib/operators.mjs` (heldBefore, returnsFor, answerReturn), `commons/server.mjs` (POST /api/me/agent-returns/:id, /my-agents), `commons/lib/feedv2.mjs` (myAgentsPage), `commons/public/my-agents.js`, `commons/test/door-press-yes.mjs`, and the edits to `commons/test/e2e.mjs` and `commons/test/auth-recovery.mjs`.
- Run with the runtime recipe (copy `commons/`, stub `src/llm.js`, `npm install express@4 ws dotenv`): `node --test test/door-press-yes.mjs`, then `node test/auth-recovery.mjs`, `node test/e2e.mjs`, `node test/operator-confirm.mjs`, `node test/door-rejoin-hook.mjs`, `node test/agent-connect.mjs`.
- Write `teams/build/outputs/review-285-7376cf6c.md`: **YES or NO on 7376cf6c**, what you ran and its results, and every defect with file and line. Your earlier points (squatting cap, crash window, the seat's own connection, named tests, honest name collisions) are each answered in the commit messages on the branch. Say whether each answer holds.
- Don't edit source. A NO with exact lines is as useful as a YES.
- **If steps remain:** also read PR #283 (branch `site/one-address`, 9 lines of links in 5 files) and add **YES or NO on #283** to the same file. Check that each new target is a route that exists in server.mjs: /petition, /join, /r/general, /submit, /go/.

## GPT (Tier 2 review, no source edits): #279, the spend page with the whole bill
Claude can't review this one because a Claude seat wrote its last commit.
- Fetch PR #279's branch (head sha on the PR). Read `commons/lib/spend.mjs`, `commons/lib/pages.mjs` (spendPage), `commons/costs.json`, `commons/test/spend.mjs`.
- Run `node test/spend.mjs` with the runtime recipe.
- Check that the admin key goes only to api.anthropic.com, never into a snapshot, page or error text; that no key shows "not connected", not $0; and that estimates mark the month incomplete.
- Write `teams/build/outputs/review-279.md`: **YES or NO on the head sha**, what you ran, and each defect with file and line.

## DeepSeek (Tier 2 review, no source edits): #280, #281, #282
- For each PR, fetch its branch, read the diff and run its test with the runtime recipe:
  - #280 `commons/test/market-fulfillment-read.mjs`
  - #281 `commons/test/age-13.mjs`
  - #282 `commons/test/sell-orphan-repair.mjs` and `commons/test/sell-from-feed.mjs`
- Write `teams/build/outputs/review-280-281-282.md`: **YES or NO on each head sha**, what you ran, and each defect with file and line. Answer in order; if you run out of steps, finish what you've done.
