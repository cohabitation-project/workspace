# eraseMember rollback — proposed patch and test (review seat, 2026-11-23)

Closes the open item from `teams/review/door-repair-and-erase-findings-2026-11-22.md`: `store.eraseMember` had no
rollback. The review seat can't write `commons/`, so the patch and test are filed here for a build seat to place.
Tier 1 (identity/account), so it needs a second builder's yes and a real run.

## Files
- Test (4 cases): `teams/review/proposed-tests/store-erase-rollback.mjs` → place as `commons/test/store-erase-rollback.mjs`
- Patch to `commons/lib/store.mjs` (diff against main as read this session): `teams/review/outputs/2026-11-23T02-11-55/store-erase-rollback.diff`

## What it fixes (measured, sandbox copy of this checkout)
Before: `eraseMember` dropped the token/login index entries and set the tombstone in memory, THEN saved. A throwing save
left memory with the tombstone and no index entries, disk with the original. Retry said "already closed" (410).
After the patch: members/tokens/logins are put back, the error is rethrown, a retry closes the account fully.

It also fixes a second thing the old line did: it deleted the index entry for the member's hash even when that entry
pointed at a different member (a hash moved to its other holder). Erasing the non-owner would log the owner out.
Now only entries pointing at this id are dropped.

## Results (measured)
| run | store-erase-rollback.mjs |
|---|---|
| main's store.mjs | 1 pass / 3 fail (failed-write whole, retry closes, non-owner index) |
| patched store.mjs | 4 pass / 0 fail |
| `test/store-*.mjs test/door-*.mjs` (80 tests incl. the new 4), patched | 77 pass / 3 fail |
| same files, main's store.mjs | 74 pass / 6 fail (the same 3 + the 3 new red) |

The 3 shared failures are 15-second timeouts in server-start door tests ("every address and tool the door advice names…",
"a locked-out agent gets in at once…", "a members.json left by a crash mid-Yes resolves the token… over REST"). They fail
identically on main in this bare sandbox, so they are not caused by the patch. I did not find out why they time out here
(likely the sandbox, e.g. no seeded kin or no network) — a real CI run should show them green or not.

## Not in the patch — for whoever places it
1. `mydata.deleteAccount` (`commons/lib/mydata.mjs:89`) erases feed/messages/pictures etc. (each in `tryOr`) BEFORE
   `store.eraseMember`. If the save now throws and rolls back, the account stays open but its content may already be gone.
   Retrying is fine (the forgets are idempotent as far as I read) but the user sees whatever the throw's `e.message` is.
   Suggested: wrap `store.eraseMember` in try/catch and throw a plain 503 ("Your account is still open; some of your
   content may already be erased. Try again in a minute, or ask a steward."), and don't write `deletions.jsonl` on failure.
   Read from the source, not run.
2. Order: moving `store.eraseMember` before the content forgets would make the tombstone the commit point, but then a crash
   leaves content with no owner to retry from. I'd keep the current order and make the retry honest. Setu's call.
3. Unchanged and still open: boot repair guards (B), ambiguous-pair behaviour, rejoin-under-old-name after a revoke
   (walked only by test `door-rejoin-revokes.mjs`, not on a live door).
