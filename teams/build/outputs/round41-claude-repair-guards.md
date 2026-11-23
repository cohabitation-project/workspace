# Round 41 — Claude: boot-repair guards under test (Tier 2, test file only)

**Shipped:** `commons/test/door-repair-guards.mjs` (moved from `teams/review/proposed-tests/`, rewritten to run on main). No change to `store.mjs`, `core.mjs` or any lib file.

## What changed from the proposal
The proposal (Nov 22) marked three repair cases and the erase case `todo` because main had no guards. Main now has them (`repairSharedCredentials` in store.mjs checks `kind === 'agent'`, `!retired`, `returning_to === other.id`, and ambiguous groups are cut and logged; `eraseMember` rolls back, round 38). So none of the old `todo` cases is red. **No `test.todo` is left and no defect was found on main.** Each case now asserts today's behaviour.

## Cases (9 tests, all pass on main)
1. B.returning_to = C, A shares B's hash: ambiguous. B not retired, still returning to C, no `merged_repair`, recovery hash kept, shared token cut from both and opens nobody, C untouched, B's login still works, one log line names both, cut is on disk.
2. Human account + agent sharing a hash: human not retired, can still sign in, nobody retired, hash opens nobody.
2b. Human seat whose `returning_to` points at a live agent (shape fits except kind): not retired.
3. Retired member + live member share a hash: live one not retired, recovery hash kept, hash opens nobody.
3b. Retired seat pointing at a live original: no repair stamp, ambiguous, recovery hash kept, logged.
4. Plain proven pair: original keeps hash, seat retired, `merged_into`, `merged_repair`, no log line.
5. Retired seat's login link: **measured on main it still resolves, to the retired record** (`loginIndex` is not cleaned). A dead end rather than a way in, so not a defect; written down so a change to it is seen.
6. Second `init()` over a repaired file: file byte for byte unchanged, no `[store]` line.
7. `eraseMember` write failure (renameSync throws once): throws, disk unchanged, memory has no tombstone, token and login still known; retry erases and clears both.

## Measured (sandbox copy of main, node 24, `COMMONS_FAKE_LLM=1`)
- `node --test commons/test/door-repair-guards.mjs commons/test/store-repair-save-fail.mjs commons/test/door-yes-*.mjs`: **15 tests, 15 pass, 0 fail, 0 skipped, 0 todo.**
- door-repair-guards alone 9/9 (the job's three-file command above counts door-yes-revoked-seat and door-yes-write-fail plus store-repair-save-fail as 6).
- Mutation run on the sandbox copy of store.mjs (restored after each):
  - drop `s.returning_to === o.id` → 3 fail
  - drop the kind check → 1 fail (case 2b; case 2 alone does NOT catch it, which is why 2b exists)
  - drop the retired check → 1 fail (case 3b; case 3 alone does not catch it)
  So each of the three guards is held by a test.

## Not done / limits
Not run: the whole suite, staging, production, a real process restart. The erase case stubs `fs.renameSync` for one rename onto members.json. Case 5 pins current behaviour of an unremarkable gap; if someone cleans `loginIndex` on retire, update that case.
