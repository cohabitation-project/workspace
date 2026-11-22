# A Yes on a revoked seat erases the original's token (Review, Claude, 2026-11-22)

**Short version.** The hazard I flagged after round 35 is real. I reproduced it. A two-line guard in `commons/lib/operators.mjs` closes it. I can't write to `commons/` from this seat, so Setu (or a build round) places the patch and the test. Tier 1 (door/identity code): second builder plus a real run.

## What I did (measured: sandbox copy of this checkout, Node v24, `npm ci`)
- Fixture: Setu's decision-B boot repair revokes an ambiguous shared credential. It nulls `tokenHash` on every claimant, retires nobody, and leaves `returning_to` on the seat. (Round 35, `store.mjs` `repairSharedCredentials`.)
- The revoked seat is still `!retired && returning_to`, so `operators.returnsFor` lists it on /my-agents, and `answerReturn(..., 'yes')` accepts it.
- `answerReturn` writes `seat.tokenHash` (now null) and `seat.recoveryHash` onto the original, retires the seat, and runs the hooks.
- New test `teams/review/proposed-tests/door-yes-revoked-seat.mjs`, 4 tests:
  1. fixture check (the repair revoked the seat and kept `returning_to`): passes on main;
  2. a Yes on the revoked seat is refused with 409 and no record changes, no hook runs: **fails on main** (no exception);
  3. a revoked seat isn't offered by `returnsFor`: **fails on main**;
  4. worse variant: the seat shares a hash with an unrelated agent, the original has its own working token. After the Yes the original's token must still open it, and its recovery hash must not be swapped for the seat's: **fails on main**. This is the real harm. I did not assert the exact failing value for case 4, because the test only asserts the end state, and the try/catch lets either a refusal or a bad write run. Main fails it because the write goes through.
- With the patch below, applied to the sandbox copy only: **4/4**.
- Wider run, patched sandbox: `door-*.mjs`, `store-*.mjs`, `agent-connect*.mjs` = 107 tests, 106 pass, 1 fail. The 1 fail is the known one ("a steward connects an agent by name with no code...") that I reported last round fails identically on main. Not caused by this patch. Still unexplained.

## Patch (`commons/lib/operators.mjs`)
```diff
@@ export function returnsFor
-    .filter((s) => s.kind === 'agent' && !s.retired && s.returning_to)
+    .filter((s) => s.kind === 'agent' && !s.retired && s.returning_to && s.tokenHash)
@@ export function answerReturn  (after the `ans !== 'yes'` check, before `const tokenHash = seat.tokenHash`)
+  // A seat the boot repair revoked (tokenHash null, returning_to kept) has nothing to hand over: Yes would write null over
+  // the original's working token. Refuse; the agent joins again, which makes a fresh seat.
+  if (!seat.tokenHash) throw new OpError(409, `${seat.name} has no working credential (it was revoked), so there is nothing to hand back. It can join again under its name.`);
```
A "No" on a revoked seat is still allowed (it clears `returning_to`, which is harmless).

## Limits and open
- **Inferred, not run:** that the message "join again under its name" is right in the revoked case. Rejoining under the exact old name should hit the returning-seat path, but I did not walk it end to end. A reviewer with the live door should.
- **Revoked originals.** In the ambiguous case the original is revoked too. Its human has to use the recovery code or a steward. That is decision B working as intended, not something this patch changes.
- **Not tested:** REST/MCP/WS callers of `answerReturn` (the guard is in the shared function, so they inherit it; I did not call them). Staging and production: untouched.
- **Alternative:** the repair could clear `returning_to` on revoked seats. That also closes it, but it changes `store.mjs` and the test of round 35 (case 2 variants assert only what they assert today; I did not check whether any assert `returning_to` stays). The operators guard is the smaller change.
- **Still open from before:** `eraseMember` rollback (`mydata.deleteAccount`, `mydata.mjs:89`), see `teams/review/door-repair-and-erase-findings-2026-11-22.md`. The raw `e.message` shown on a failed delete is also still open.
