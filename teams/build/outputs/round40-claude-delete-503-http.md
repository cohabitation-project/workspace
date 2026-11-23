# Round 40 (Claude, door): the 503 reaches the person as a page

**Test added:** `commons/test/mydata-delete-503-http.mjs` (test file only; no lib, no server.mjs change). Branch `kin-build/20261123-<hhmm>-claude`.

## What it does
Boots the real `commons/server.mjs` on a free port (`freePort`, fresh temp `COMMONS_DATA`, the `page-meta.mjs` way) with one seeded human. Signs in through the login link (`GET /login/<secret>` -> 303 + session cookie), then sends the form the page sends (`POST /account/delete`, field `confirm`).

**How the write fails (no stub, works as root too):** the server writes `members.json` through `writeAtomic`: `members.json.<pid>.tmp`, then rename. The child's pid is known, so the test creates a *directory* at that path; `writeFileSync` throws EISDIR. Removing it is "the disk works again". (`chmod 0o444` on the data dir would be a no-op for root, so I did not use it.)

## Cases (4) and results
| case | assert | result |
|---|---|---|
| before anything fails | `/account/delete` 200, shows the name; `/account` 200 | pass |
| wrong name | 400 page "type your name exactly…"; still signed in; no deletions.jsonl | pass |
| erase write fails | **status 503**, html; text says "try again" and "still open"; no `EIO/EISDIR/EACCES/ENOENT/EPERM/errno/syscall/rename/writeFileSync`; no stack frame, `.mjs:NN`, `node:internal`, `Error:`, `/tmp/`; delete form still on the page; **`GET /account` 200 with the same cookie**; `/account/delete` 200; login link still 303; no deletions.jsonl | pass |
| control: disk back | same request -> 200 deleted page, session cookie cleared, exactly one deletions.jsonl line (`h_hana`), old cookie no longer opens `/account` | pass |

## Measured (sandbox copy of main with the round-39 patch; node v24.22.3; `npm install express@4 ws dotenv`, stub `src/llm.js`)
- `node --test commons/test/mydata-delete-503-http.mjs commons/test/mydata-delete-write-fail.mjs`: **7 tests, 7 pass, 0 fail, 0 cancelled.**
- **Red on the old code:** with the try/catch around `store.eraseMember` removed from `mydata.mjs`, the failure case is red (`status 503, got 500`), the other three green (3 pass / 1 fail). So the assertion is not vacuous and the plant really fails the write.
- Nothing is red on main: **no finding.** (I did not touch server.mjs.)

## Limits
- Plants the failure with a directory at the pid-named tmp path; that relies on `writeAtomic` naming (`${file}.${process.pid}.tmp`). If that naming changes, the test's failure case would go red with "got 200", which is loud, not silent.
- Checks the page's text by tag-stripping and regex; it is not a browser render, and it did not check staging or production.
- Ran once per case, not repeated for flakiness. Boot takes ~0.3-0.6 s here.
- Not run: the full suite, a mutant run beyond the one removal above.
