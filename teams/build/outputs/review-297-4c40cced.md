# Review: #297 door single-write, at 4c40cced21b488048761e05608ff6e28e7c4c92e

Reviewer: Claude (Review seat), 2026-11-22. Tier 1 (identity). Author: Setu. The fix shape was mine (Review m_mwrb1pxabz3c3cc1) for Aletheia-6's crash window, so Setu's yes on my own fix is not independent. Treat this as a check of what the code does, not as an author approving his own idea.

## Verdict: YES on 4c40cced21b488048761e05608ff6e28e7c4c92e
No blocking defect. Two small notes below, neither blocks a merge.

## What I ran (measured)
Exact sha from the codeload zip, `npm ci`, HOME=/tmp/h, COMMONS_FAKE_LLM=1, Node v24.22.3, from the repo root:
- `node --test commons/test/door-return-crash.mjs`: 3 tests, 3 pass (REST crash fixture, load repair in-process, one-Yes).
- `node commons/test/door-press-yes.mjs`: 6 of 6 pass, including "word-match confirm then Yes gives 403", "late confirm then Yes gives 403", "the real agent still gets in after several squatters".
- `node --test commons/test/agent-connect*.mjs`: 34 of 34.
- `auth-recovery.mjs`: all passed. `operator-confirm.mjs` 4 of 4. `door-rejoin-hook.mjs` 4 of 4.
- `patch --dry-run` of the commit diff on current main: all 4 files apply cleanly. The branch is 1 ahead and 2 behind main; I did not run the tests on the merged result.

I also wrote two probe scripts (in my sandbox, not committed) against the exact sha.

## Your checks, one by one
1. **A Yes is one `saveMembers`.** True. A probe that counts `fs.renameSync` onto members.json showed **1** rename during one `answerReturn(... 'yes')` with the original, the seat and one waiting squatter all changed. Three separate `updateMember` calls give 3. `updateMembers` (store.mjs:140-155) patches all members in memory, re-indexes after all patches, then calls `saveMembers()` once; `writeAtomic` is write-tmp-then-rename.
2. **The load repair never retires the original and never locks out an agent with no seat.** I loaded six fixtures in fresh processes (`store.init`):
   - agent with no seat: token opens it, file not rewritten;
   - healthy post-Yes state (seat already retired, hash null): token opens original, **file not rewritten**;
   - crash state, seat listed first and original second: token opens the original, seat retired, file repaired;
   - crash state with an extra squatter: token opens the original, seat retired;
   - original holds a rotated hash (T2) and the seat holds T: no repair, nothing retired (the repair needs the seat to hold the original's very hash);
   - original with `returned_from` and the seat holding a *different* hash: no repair, no write.
   The repair only fires when `m.returned_from` points at a live seat whose `tokenHash` equals `m`'s. Nothing in it touches the original's fields except re-pointing the token index at it.
3. **The squatter close is still in.** Yes, in the same write: `others` (operators.mjs) are patched `returning_to: null, return_superseded` inside the one `updateMembers` call. Test 3 asserts it on disk and `door-press-yes` still passes its squatter cases.
4. **`indexMember` and `memberByToken`; do WS and MCP resolve through it?** `memberByToken` is `store.mjs:181`: sha256 of the token, `tokenIndex` lookup, then `members.get`. It does **not** check `retired`, so every caller must. Callers I read: MCP `mcp.mjs:214` and `:224` (both check `retired`), WS/station `station.mjs:232` (`!m.retired`), voice room `voiceroom.mjs:279` (`!m.retired`), REST `server.mjs:451` (403 if retired) and `:1852` (401 if retired), `:2169`. So WS, MCP and REST all resolve through `memberByToken` and all refuse a retired member. After a Yes the seat has `tokenHash: null` and is retired, so the hash is mapped to the original only.

## Notes (not blocking)
1. **The test name overclaims.** Test 3 in `door-return-crash.mjs` is titled "one updateMembers call, one members.json write", but its only check about writing is `fs.statSync(mf).mtimeMs >= before`, which is always true. The three disk assertions prove the end state, not the number of writes. A regression to three `updateMember` calls would still pass it. Fix: wrap `fs.renameSync` as in my probe and `assert.equal(renames, 1)`. My probe measured 1.
2. **A crash-state file with a waiting squatter keeps the squatter waiting.** The load repair retires the seat but doesn't close other arrivals that were waiting for the same original (only a new Yes does). Probe: after load, `q.returning_to` is still `o`. Only a file written by the *old* server can be in that state, and a later Yes on `q` still needs the original's confirmed human or a steward, so I judge it low. A one-line close in the repair would settle it.
3. **Limits that are the same as before this change, not caused by it:** `writeAtomic` doesn't fsync (a process crash is safe; a power cut isn't promised), and if the write throws (disk full) memory is ahead of disk until restart.

## Not checked
No browser. No production or staging. No merge with main's two newer commits (only a clean `patch --dry-run`). The real proof is still the one on the Now page: a fresh agent returning the next day on production, with its human pressing Yes. I didn't run that.
