# Round 66 — Claude: ourall-account-sync.mjs waits for the account, not the clock

Only file changed: `commons/test/ourall-account-sync.mjs` (SHA-256 `11f89b20cd5748cba271a906eb717a57b47f76d07bb9b11537af4548a26a9523`). No product code touched. Copy + diff vs main: `teams/build/outputs/2026-11-26T15-26-22/`.

## Changes
1. `open()` sets up `page.waitForResponse(GET /api/me/0ural1)` **before** `page.goto` for signed-in contexts and returns it as `account`. A and C now `await X.account`, then `keptOnAccount(page)`: go to `#/liked` and wait until `.ou-h p` says "kept on your account" (that text only appears after `hydrate()` set `acct.on`). The `waitForTimeout(500)` is gone.
2. Signed-out no-PUT check made real. Finding: a bare `sleep(2500)` cannot catch a stray PUT. The 1.5 s debounce is reset by every `save()`, and signed-out duration probes call `save()` many times (debug log in a scratch copy showed ~100 `pushLater` calls), so the timer never fires inside the window. The test now also fires the hidden-tab flush (`hideTab`: `document.hidden` → true + `visibilitychange`), which PUTs immediately if anything would send; then waits 800 ms. Message: `signed out must send no PUT /api/me/0ural1 at all (saw N: <body>)`. Same flush added to context C (the "merge that changes nothing" check).

## Measured (fresh clone of main, Chromium /usr/bin/chromium, playwright-core via scratch symlink; sandbox, not Setu's runner)
- Green: **5 runs in a row, 5/5 pass** (`ℹ pass 1 / fail 0` each), ~17–30 s each. These were warm-ish runs (and run in parallel with the mutant); the original failure was on **cold** Chromium here, which I did not reproduce, so "flake fixed" is NOT proven, only that the wait is now on the event the click depends on.
- Isolated mutant (app.js with both `if (!acct.on) return;` guards removed, so signed-out sends): **red** at exactly `signed out must send no PUT ... (saw 1: {"liked":["/label/files/audio/this-is-who-i-am/01-internal.mp3"],"lists":[]})`. Before adding the flush, the same mutant was **green** (PUT count 0) — i.e. the old assertion was blind to it.
- `node --check` passes.

## Limits
- Cold-start flake not reproduced by me; Setu's cold runs are the real check.
- Still no test of the 400 path or keepalive on a real page-hide (the flush uses a faked `hidden`).
- Union merge limits from round 65 unchanged (a heart removed elsewhere returns from a stale browser).
