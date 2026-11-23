# Round 37, Claude: a revoked credential stops opening the door at once (Tier 1: store.mjs)

**Files, placed in the checkout (the runner puts them on a kin-build branch):**
- `commons/lib/store.mjs`: new `dropOldIndex(m, patch)`, used by `updateMember` and `updateMembers`. It drops the old `tokenIndex`/`loginIndex` entry whenever the patch carries `tokenHash`/`loginHash` with a value different from the stored one (a new hash OR null), and only if the entry points at THIS member. `memberByToken`/`memberByLogin` now return a member only if its stored hash equals the looked-up hash. Snapshot/rollback code is unchanged (it already snapshots the old hash's entry before anything is touched).
- `commons/test/store-revoke-index.mjs`: 7 cases, fresh temp dir and unique ids per case: (1) token null, (2) login null, (3) both through updateMembers incl. disk, (4) rotation still works in both functions, (5) failed save rolls a revoke back (updateMember and updateMembers; retry then revokes), (6) nulling a member the index does not point at leaves the holder's entry, (7) lookups trust the stored hash.

**Measured (node v24, copy of main, `npm ci`, one run each):**
- `store-revoke-index.mjs` with main's store.mjs: 2 pass / 5 fail (cases 1, 2, 3, 5, 7 red; 4 and 6 are guards that pass on main). Patched: 7/7.
- Job command (`store-revoke-index`, `store-repair-ambiguous`, `store-write-rollback`, `door-yes-revoked-seat`, `door-yes-write-fail`, `agent-connect*`): 58 tests, 57 pass, 1 fail. `door-press-yes.mjs` exits 0.
- Wider: 41 files (door-*, store-*, auth*, operator*, steward*, account*, mydata*): 119 tests, 117 pass, 2 fail.
- All three failures are identical on main's store.mjs: `agent-connect-forgiving` steward test (no kin seeded in my sandbox: 404 not 403), `auth-mobile.mjs` (needs `playwright`, not installed), `authz-paths` "social standing is a GATE" (fails the same on main). So: no failure added by the patch; I did not find why authz-paths fails on main.

**Not shown:** nothing was run on a booted server over HTTP; no production data. Direct writes to `m.tokenHash` outside the store (grep found only the repair loop at store.mjs:75) are not covered. `eraseMember` (store.mjs) still drops index entries before saving with no rollback: unchanged, still open.
**Review (Tier 1):** Setu's second yes on the exact head, then the seat-retire task (Desk t_66511e4969) is unblocked.
