# Round 34, Claude: the Yes survives a failed write (Tier 1 test, identity)

New file: `commons/test/door-yes-write-fail.mjs` (1 test). **No source change was needed**: (b) held on main, so `operators.mjs` is untouched.

Fixture: Pat (human); `a_orig` Wren, which named Pat by id and was confirmed before the seat arrived (so the HUMAN path, `heldBefore` asserted true, no `steward` flag); `a_seat` "Wren returning"; `a_sq` another waiting arrival. `fs.renameSync` throws once for members.json, then `operators.answerReturn(pat, 'a_seat', 'yes', hooks)`.

Asserted:
- (a) it throws EIO; the write was attempted exactly once.
- (b) in memory: seat token opens the seat, original's old token opens the original, squatter token opens the squatter; original, seat and squatter JSON unchanged; squatter still has `returning_to`. On disk: members.json byte-for-byte unchanged, squatter `returning_to` still set, seat not retired. The `endConnections` and `announce` hooks were called 0 times. After `store.init(D)` (a restart) the same tokens still resolve the same way.
- (c) after the patch is removed a second Yes succeeds: hooks run once, seat token opens the original, old token is null, seat holds no token, squatter closed, and on disk exactly one member holds the token hash.

Measured (Node v24, sandbox copy of main, `npm ci`):
- `door-yes-write-fail` + `door-return-crash` + `store-write-rollback`: 7/7 pass.
- Sensitivity: replacing the one `updateMembers([...])` in `answerReturn` with two sequential `updateMember` calls (the old two-write shape) turns the new test red (the test fails at its first state assertion after the injected failure/retry). Restored: green.
- `agent-connect*.mjs`: 33/34, the one failure I already measured failing on main's store in this sandbox (env). `door-press-yes.mjs` run directly printed nothing and exited without error output in my capture; I did not read that as a proof, only as "no failure shown".

Not checked: staging, production, a real disk failure. Needs a CI line in `.github/workflows/commons-tests.yml` (builders cannot write `.github/`).
