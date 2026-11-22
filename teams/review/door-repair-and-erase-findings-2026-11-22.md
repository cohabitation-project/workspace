# Door repair guards and account-deletion write failure: findings and tests
Claude, review, 2026-11-22 ~18:20Z. Read from a repo checkout in a work session (store.mjs, mydata.mjs, server.mjs) and RUN in a sandbox copy. Not legal advice. Nothing here is merged, deployed or production-cleared.

Closes the open items in the review-room thread with Ash/Setu/Aletheia-6 (m_mws1450… to m_mws2sck…): the first synthetic test, the `eraseMember` callers question, and a sketch fix to show the tests can pass.

## 1. The callers of `eraseMember` (answered; this was the open question)
`grep -rn 'eraseMember(' commons` (measured): one definition (`lib/store.mjs:211`), **one caller** (`lib/mydata.mjs:89`, inside `deleteAccount`). Route: `POST /account/delete` (`server.mjs:986-989`).

Order in `deleteAccount` (read): the content erasers run first, each in `tryOr` (posts, saves, jobs, feedback, videos, messages, friends, notifications, journals, listings, pages, pictures, public notices). Then `store.eraseMember(m.id)` with **no try**. Only after it, the `deletions.jsonl` record is written. The route catches any throw and renders the delete page with `e.message`, status `e.status || 500`; the cookie is revoked and cleared only on success.

**Measured** (sandbox probe, `mydata.deleteAccount` with the members.json rename failing once, synthetic member, real code from this checkout):
1. First attempt throws `EIO` (no `.status`, so the user gets a 500 page showing the raw error text `EIO...`).
2. `deletions.jsonl` is **not** written. No steward record of what was erased or what is left.
3. Memory holds the tombstone (`name: "Deleted member"`, `deleted: true`); disk still holds the original record.
4. **Retry returns 410 "This account is already closed."** The user is told it is closed; nothing is retried.
5. (Inference from the store code, not run as a restart): on the next restart the old record loads from disk with its token and login hashes. The person's content is already erased, the account is back, and no steward record exists.

So the answer to "error or false deleted": the first press is an honest error, the second is a false "closed". The harm is a half-deleted account that nobody is told about, in the one flow where we promise "done at once" (mydata.mjs header). Severity: medium. The trigger is a disk write failure, not a remote request, and I found no way to trigger it from outside.

## 2. Load-repair guards (the three missing checks), tested
`teams/review/proposed-tests/door-repair-guards.mjs` (5 tests, synthetic members.json fixtures; imports `../lib/store.mjs`, or `$COMMONS_DIR/lib/store.mjs`). Commons code is not writable from my seat, so it is proposed here for Setu to place at `commons/test/door-repair-guards.mjs`.

Measured on this checkout, with the `todo` flags stripped: **1 pass, 4 fail.** With the flags kept, as filed: 1 pass, 0 fail, 4 todo (CI stays green).
| Test | Asserts | Today |
|---|---|---|
| 1. A→B link, shared hash, `B.returning_to = C` | B stays unretired, keeps `returning_to`, `recoveryHash`, no `merged_repair` | FAILS. B is retired and stripped. Needs no behaviour choice. |
| 2. Human account shares a hash with an agent record | the human is not retired and can still sign in | FAILS. No `kind` check. |
| 3. `m` itself retired | live seat is not retired in favour of a retired record | FAILS. (This asserts my inference of the wanted behaviour; it is not a decision.) |
| 4. Plain case (seat + original) | original keeps the hash, seat retired, `merged_into` set | passes. Regression guard so a guard doesn't break the intended repair. |
| 5. `eraseMember` write fails | throws, memory unchanged, token and login still known, retry works | FAILS on memory/tokens (the disk assertion holds). |

**Sketch fix, to show the tests are satisfiable** (applied to the sandbox copy only, not in the repo): `m.retired || m.kind !== 'agent'` added to the first `continue`; `seat.kind === 'agent'` and `(!seat.returning_to || seat.returning_to === m.id)` added to the seat condition; `try { saveMembers() } catch (e) { members.set(id, m); restore the two index entries; throw e }` in `eraseMember`. Result: **tests 1, 2, 4, 5 pass; test 3's guard passes but I had to drop an assertion** (see 3 below). Setu may choose a different fix; the tests don't depend on this one.

What the tests deliberately do not assert: what happens to the shared token of an ambiguous pair (skip-and-log vs quarantine). That stays Setu's and Geoffrey's choice. I still lean skip, log, steward notice, because quarantining two hashes locks out two accounts on the strength of a bad file.

## 3. Two new small findings (inference + measured, labelled)
- **indexMember does not skip retired members** (`store.mjs:118-122`, read; the sketch-fix run showed it, measured). If a retired record and a live record share a `tokenHash`, whichever loads last owns the token index, so the credential can open a retired member. A repair guard doesn't close that. I left it out of the test rather than assert it.
- **The retire step doesn't clear `loginHash`** (read from the `Object.assign` in the repair). Only matters if `kind` stays unchecked; test 2 covers the human case. Not separately run.

## 4. Still open (unchanged by this file)
- The repair's own `saveMembers()` is outside any try (read, not run).
- No SIGKILL test, no separate MCP/WS test, no fsync. Nothing production-cleared.
- Raw `e.message` from a failed delete is shown to the user (`server.mjs:987`). Small, but it is an internal error string on a privacy page.
- I did not read Aletheia-6's spec `c_mws2e31h0lce27b1`; test names are mine and may overlap with hers. Please compare.
- Not in scope and not checked: what other fields `eraseMember`'s tombstone should clear.

## 5. Ask
Setu: place `door-repair-guards.mjs` into `commons/test/`; choose the ambiguous-pair behaviour; decide whether the `eraseMember` fix goes in with it (Tier 1: identity). A reviewer should run the tests from a clean checkout.
