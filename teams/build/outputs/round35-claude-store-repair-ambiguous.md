# Round 35 (Claude, Tier 1: store.mjs): the startup repair cuts and tells (decision B)

Files (both whole-file edits in the repo tree; the foreman branches `kin-build/20261122-<hhmm>-claude`):
- NEW `commons/test/store-repair-ambiguous.mjs` (10 tests: cases 1 x2 orders, 2 x3 variants, 3, 4 (all 6 array orders), 5, 6, 6b).
- `commons/lib/store.mjs`: `init()` now calls new `repairSharedCredentials(list)` (the old 12-line loop is gone). Nothing else in the file changed.

## What it does (measured, Node v24, copy of main + my files, `npm ci`)
- Claimant group = two or more members sharing one `tokenHash`, at least one not retired (foreman (a)).
- Proven pair = exactly two live agents, one (seat) with `returning_to` = the other. Seat retires, loses both hashes, `merged_into`, `merged_repair`; original keeps the credential. Same as before, either array order. No log line.
- Anything else: every claimant's `tokenHash` is nulled (a retired claimant too), the index entry goes only if it points at a claimant, nobody is retired, `recoveryHash` stays, one line: `[store] ambiguous credential revoked: id1, id2` (console.error) (foreman (c)).
- Save is attempted once. If it throws: init returns, a second line `[store] boot repair not saved (...)` is logged, memory keeps the repair, the next `saveMembers()` persists it (foreman (b)).

## Evidence
- On main's store.mjs, the new file: 2 pass (case 1, which is today's behaviour), **8 fail** (2 x3, 3, 4, 5, 6, 6b).
- With the change: **10/10**.
- Requested run: `node --test store-repair-ambiguous store-write-rollback door-return-crash door-yes-write-fail agent-connect*` = 51 tests, 50 pass, 1 fail. The one fail ("a steward connects an agent by name with no code...") fails identically with main's raw store.mjs swapped in (33/34 in agent-connect* on main), so it is not from this change. `node commons/test/door-press-yes.mjs` exit 0.
- Mutants (string replaced in the sandbox copy, then restored): no nulling -> 7 fail; no try/catch around the save -> 2 fail; no index delete -> 7 fail; retired-claimant group skipped -> 1 fail; pair rule without `returning_to` -> 3 fail. All killed.

## Two interpretation calls for Setu to confirm
1. **Case 3**: a retired original sharing the hash with a live seat. I read (a) as "at least one non-retired in a group of two or more members sharing the hash", so both lose the hash. If you meant only non-retired members count, then a lone live seat would keep a credential that a retired record also holds; that is what the test refuses.
2. A pair is proven by `seat.returning_to === original.id` only (your wording), not also by `original.returned_from`. Old code needed `returned_from`. Both are present in the real crash window, so the real case still resolves.

## A hazard I did NOT change (outside init, your call)
A revoked **seat keeps `returning_to`** and still shows on `/my-agents`. `operators.answerReturn` takes `seat.tokenHash` and writes it to the original. If a human presses Yes on a revoked seat (tokenHash null), the original's `tokenHash` becomes null and the real agent is locked out. One guard fixes it: in `answerReturn`, `if (!seat.tokenHash) throw new OpError(409, ...)`. Or have the repair clear `returning_to` on revoked seats. Not tested here; I read the code only.

Not checked: staging, production, a real members.json from the live server (no access). All fixtures are hand-written.
