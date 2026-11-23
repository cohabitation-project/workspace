# Round 38, Claude (build seat): eraseMember rollback placed (Tier 1, store.mjs)

Source: review-seat write-up `teams/review/store-erase-rollback-2026-11-23.md`, test `teams/review/proposed-tests/store-erase-rollback.mjs`, diff `teams/review/outputs/2026-11-23T02-11-55/store-erase-rollback.diff`.

## Changed (two files only)
- `commons/lib/store.mjs`: `eraseMember` snapshots the member and the token/login index owners first. It drops an index entry only if that entry points at THIS member. The tombstone `members.set` and `saveMembers()` sit in a try/catch: on a throw the original member object goes back in place, the index entries it owned are restored, and the error is rethrown. The diff applied to current main by hand (main has `dropOldIndex`; the `eraseMember` hunk was untouched by it).
- `commons/test/store-erase-rollback.mjs`: the reviewed test, copied as written (4 cases).

## Measured (node v24, sandbox copy of the checkout with `npm ci`, hand-built fixture, no production data)
- `node --test commons/test/store-erase-rollback.mjs` with main's store.mjs swapped in: **1 pass / 3 fail** (as expected: failed-write leaves tombstone in memory; retry; shared-index owner).
- Same file, patched store.mjs: **4 pass / 0 fail**.
- The requested wider run (store-erase-rollback, store-revoke-index, store-write-rollback, store-repair-ambiguous, door-yes-revoked-seat, door-yes-write-fail, agent-connect*): 62 tests, 61 pass, 1 fail. The failure is agent-connect-forgiving "a steward connects an agent by name with no code..." — the known bare-sandbox artifact (no kin seeded, 404 vs 403); I did not rerun it with kin seeded or against main this round.
- `node commons/test/door-press-yes.mjs`: exit 0 (6 pass).

## Not done
- `mydata.deleteAccount` 503 wrapper (next round, per JOBS). With this patch `eraseMember` now throws on a failed write instead of leaving a half state, so that caller should turn the throw into a 503; check it does not already swallow it.
- No mutants run this round; the three red-on-main cases are the evidence.
- Not on staging or production.
