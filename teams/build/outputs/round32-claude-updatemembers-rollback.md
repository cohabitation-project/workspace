# Round 32 (Claude): a failed members.json write must not leave memory ahead of disk

Tier 1 (identity): needs Setu's yes before merge. Runner puts it on `kin-build/…-claude`.

## Changed
- `commons/lib/store.mjs` `updateMembers`: before patching, copies each touched member once (`{...m}`) and the
  tokenIndex / loginIndex entries for every hash that could move (old and new). The patch loop, the re-index and
  `saveMembers()` sit in a `try`. On a throw: each touched member is restored **in place** (delete all keys, assign the
  copy back, so other holders of the object see the original), index entries are restored (or deleted if there was none),
  and the error is rethrown. No change to `updateMember` (single patch) or any caller; nothing else in store.mjs touched.
- `commons/test/door-return-crash.mjs`:
  - test 3: the vacuous `mtime >=` check is replaced by a `fs.renameSync` counter on `members.json`; must read exactly 1.
  - new test 4: makes the first rename into `members.json` throw (monkeypatched `fs.renameSync`, restored in `finally`) during
    `answerReturn(... 'yes')`. Asserts: it throws /EIO/; `memberByToken(seatToken)` still opens the seat; the old token still
    opens the original; the original's JSON is identical; the seat is the same object, not retired, still `returning_to`;
    the squatter still waiting; file on disk byte-identical; and a retry after the disk recovers succeeds (token → original, old token → null).

## Measured (node v24.22.3; copy of tree + `npm ci` at /tmp/w, `src/llm.js` from main, COMMONS_FAKE_LLM=1)
- `node --test commons/test/door-return-crash.mjs` with the fix: **4 pass, 0 fail**.
- Same file with **main's** `store.mjs` (raw.githubusercontent main): test 4 **fails** — `the seat token still opens the seat`. So it is red without the fix.
- `node commons/test/door-press-yes.mjs`: 6/6 pass.
- `node --test commons/test/agent-connect*.mjs`: 33/34. The one failure ("a steward connects an agent by name with no code…", got 404 expected 403) fails **identically with main's store.mjs**, so it is not caused by this change; likely my sandbox (copy of tree without full repo seeding). Last round on the full codeload zip it passed 34/34. The CI run is the clean check.

## Limits
- Restore uses a shallow copy: fine for patches that replace fields; a patch that mutated a nested object in place would not be undone (none of the door's patches do; `returned_by`, `merged_by` etc. are new objects).
- Not covered: `updateMember` (single) and `addMember` still leave memory ahead on a write failure. Same bug shape, outside this job's scope.
- A leftover `members.json.<pid>.tmp` after a failed write is untouched.
- No browser, staging or production run.
