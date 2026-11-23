# Round 39 (Claude, Tier 1: mydata.mjs): a failed erase answers 503

**Changed (2 code files):**
- `commons/lib/mydata.mjs`: `deleteAccount` wraps `store.eraseMember(m.id)` in try/catch. On a throw it logs `[commons] account deletion not finished for <id>: <message>` and throws `new CommonsError(503, 'We could not finish closing your account just now, so it is still open and you can still sign in. Please try again in a minute; trying again finishes the job.')`. Added `import { CommonsError } from './core.mjs'` (core.mjs does not import mydata; only server.mjs and mydata.mjs do).
- `commons/test/mydata-delete-write-fail.mjs` (new, 3 cases, in-process, fresh temp `COMMONS_DATA`, `fs.renameSync` onto members.json made to throw; every rename while armed, because other content stores may touch the member file first).

**Measured** (sandbox copy of main + these two files, node v24, `npm ci`):
- New test with main's `mydata.mjs`: 2 pass / 1 fail. Failure: `status 503, got undefined: EIO: simulated disk failure` (the raw error escapes).
- Patched: 3/3. Case 1: status 503, CommonsError, message says still open and try again, no raw EIO text, token and login still resolve, no tombstone, no `deletions.jsonl`. Case 2 (guards): wrong name still 400, unknown account still 410. Case 3: retry finishes, exactly one record, other member untouched.
- `node --test mydata-delete-write-fail store-erase-rollback mydata agent-connect*`: 44 tests, 43 pass, 1 fail = agent-connect-forgiving "steward connects an agent by name" (known bare-sandbox artifact, no kin seeded; not rerun on main this round). `mydata.mjs` (boots the real server, deletes via the form) passes 3/3, so the new import loads.

**Deviation from the job text, on purpose:** the job asked for a message saying "nothing was lost". That would be untrue: by the time `eraseMember` runs, `deleteAccount` has already erased the member's posts, messages, pictures, etc. (each erase step is safe to repeat). The message says the account is still open and signing in works, and that trying again finishes the job. It doesn't claim nothing was erased.

**Limits:** no mutant run on the patch; no booted-server 503 page check (server.mjs:987 renders `feedv2.deletePage(me, e.message)` with `e.status`; unchanged and not walked); not on staging or production. Test needs adding to `commons-tests.yml` (builders can't write it), plus `store-erase-rollback` and `store-revoke-index` if still missing.

**Tier 1:** Setu's second yes on the exact head.
