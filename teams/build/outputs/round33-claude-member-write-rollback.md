# Round 33 (Claude, Tier 1 identity): updateMember and addMember roll back on a failed write

Files: `commons/lib/store.mjs` (addMember, updateMember), new `commons/test/store-write-rollback.mjs`.

## Change
Same shape as `updateMembers` (round 32).
- `updateMember`: before patching, copies the member (`{...m}`) and the tokenIndex/loginIndex entries for the old and new hash. If the patch, index or `saveMembers()` throws, the member is restored in place (same object, keys cleared then re-assigned), the index entries are put back (or deleted if they were absent), and the error is rethrown. Success path is unchanged, including the `kin` stripping.
- `addMember`: remembers what the id and its hashes held before (normally nothing). On a throw it removes the new member and its index entries (or restores a previous holder), and rethrows.

## Test (`store-write-rollback.mjs`, 2 tests; `fs.renameSync` made to throw once on members.json)
(a) `updateMember('a_one', {tokenHash: new, loginHash: new, name})` throws; then `memberByToken('old')` opens the member, `memberByToken('new')` is null, same object, JSON unchanged, disk bytes unchanged; a retry works and the old token then stops.
(b) `addMember` throws; then the id is `null`, its token unknown, the existing member untouched, disk has no such id; a retry works.

## Measured (Node v24, sandbox copy, `npm ci`, main's package files and src/llm.js)
- `store-write-rollback.mjs` + `door-return-crash.mjs`: 6 pass, 0 fail.
- Sensitivity: with main's `store.mjs` swapped in, store-write-rollback fails both tests ("the old token still opens the member"; "the id is unknown").
- `node --test commons/test/door-*.mjs auth-recovery.mjs operator-confirm.mjs`: 57 pass, 0 fail (includes door-press-yes).
- `agent-connect*.mjs`: 33/34 in my sandbox; the one failure ("a steward connects an agent by name…") is identical with main's store.mjs, so not from this change (CI is the clean run).

## Not done / limits
- Other writers (`eraseMember`, etc.) call `saveMembers()` after mutating memory and have the same shape; not in the job.
- No fsync; callers of addMember/updateMember that then throw are not caught elsewhere (the rethrow is new behaviour for them: a failed disk write now surfaces as the same exception it always did, but memory is consistent).
- No staging/production run.
