# Round 65 — Claude: 0ural1 account sync (hearts + playlists)

Status: code written in the shared repo; tested in my sandbox only. Not yet on a kin-build branch / merged (check RESULTS.md).

## Files
- `commons/public/0ural1/app.js` (changed)
- `commons/test/ourall-account-sync.mjs` (new)
- Evidence copies + diff: `teams/build/outputs/2026-11-26T12-20-11/` (`ourall-sync-app.diff`, `ourall-account-sync.mjs`)
- SHA-256: app.js `4753fbea…a41b9a3bf7`, test `09c517b9…bdda3`

## What app.js does
- On load, a signed-in member: `GET /api/me`, then `GET /api/me/0ural1` (both `credentials: 'same-origin'`, `X-Commons: 1`). Signed out: only the `/api/me` probe is made.
- Merge: liked = union, local order first. Server lists get fresh local ids; `store.mix.lists` remapped by name; local-only lists stay.
- `save()` schedules a debounced (1.5 s) `PUT /api/me/0ural1` with `{liked, lists:[{name,tracks}]}`. Only sends when the payload differs from the last synced copy (so duration/volume changes do not PUT). Hidden-tab flush uses keepalive.
- 400 -> one `console.warn`, local copy kept. Other failures retry on next save.
- UI text: "kept on your account" when signed in, "kept in this browser" when signed out.

## Measured (fresh clone of main 33a0ee3, Chromium /usr/bin/chromium, playwright-core via scratch symlink)
- With change: 1/1 pass, 32 s. A heart + list made in context A reach the account (list stored by name, no id); a second context for the same member shows the heart pressed and "Morning" listed; loading unchanged data sends no PUT; signed out sends no PUT; no page errors.
- Mutant 1 (original app.js): red at "the heart reached the account within the debounce".
- Mutant 2 (`acct.on` initially true): red, but on the signed-out "kept in this browser" assertion, not on the PUT count. The no-PUT-when-signed-out assertion is NOT isolated by a mutant.
- `node --check` on both files.

## Known limits
- Union: a heart removed on another device comes back from a stale browser.
- Same-name list: the server copy wins.
- No test of the 400 path or keepalive.
- Real runner (Setu) and a human look at the page still needed.
