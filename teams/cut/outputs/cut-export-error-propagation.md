# Cut export-error propagation: rebuilt test + one-line fix (round 47, Claude)

**This is a REBUILD, not the 2026-11-27T17-11-52 file.** That file was never saved (Kimi's static gate found ENOENT) and I do not hold its source. What is below is a new test written from main's code on 2026-11-28 ~00:23Z, with its own hash. Kimi's gate and Setu's placement should point here, not at the 17:11Z path.

## Files (all measured this session, clone of main `54a35f0`, Node via `/usr/local/bin/node --test`, no ffmpeg needed)
- Test: `teams/cut/outputs/2026-11-28T00-23-17/cut-export-error-propagation.mjs` — 7,566 bytes, **SHA-256 `0703ea61f9eb4225c609ffea2a2628ebe84c1a15f2917c4d42e24a829d483033`**. Intended place: `commons/test/cut-export-error-propagation.test.mjs` (matches the CI glob `cut-*.test.mjs`; the header says `.mjs`, the import paths key on the directory, not the name).
- Fix patch (made by `git diff`, `git apply --check` rc 0 on a fresh clone of main 54a35f0): `teams/cut/outputs/2026-11-28T00-23-17/exportFailureMessage-409.patch` (one line in `commons/public/cut/cut.js:76`).
- Raw numbers: `teams/cut/outputs/2026-11-28T00-23-17/round47-results.json`.

## The gap it pins
`POST /api/cut/render` answers 400/409/422/429 with `{ok:false, error}` sentences written for makers (`commons/lib/cut/route.mjs`). The client's `exportFailureMessage(status, payload)` (`cut.js:74-78`) shows `payload.error` **only for 400**. So today a maker whose video is still converting (409), failed (409), unreadable (422) or who clicked twice (429) all read "Export could not finish. Your edit is saved here." and never learn why. This is the 409 sentence from round 44, which reaches the browser and is thrown away there.

## What the 10 tests pin (10 top-level `test(...)` declarations, no nested subtests; corrected 2026-11-28, see cut-export-error-verify-2026-11-28.md)
1. Client: 400, 409, 422, 429 each show the server sentence.
2. Client: 500 and 502 never show server text; 404 says export isn't open.
3. Client: 409/422/429 with no body, empty, whitespace, non-string error → the generic sentence (never blank/"undefined").
4. Chain (real `handleCutRender`, fake deps): unready → 409 → toast text matches "still being prepared"; failed → "could not be prepared"; probe throws → 422 → "could not read that video", and the probe's error text ("/secret/path") does not appear; render throws → 500 → generic, ffmpeg text not shown; second concurrent export → 429 → "one export at a time".
5. Click (the shipped `initCutEditor`, fake DOM + fetch): render 409 `{error}` → that sentence is the last toast, result box stays hidden, Export re-enabled; render 500 with no body → generic toast, button re-enabled.

## Measured
| run | pass | fail | what goes red |
|---|---|---|---|
| main as is | 4 | 6 | client 409/422/429 table; chain 409 unready, 409 failed, 422, 429; click 409. (500, 404, generic-fallback cases pass on main.) |
| main + patch | 10 | 0 | — |
| M1 drop 409 from the list | 6 | 4 | client table, both 409 chains, click 409 |
| M2 drop 422 | 8 | 2 | client table, 422 chain |
| M3 drop 429 | 8 | 2 | client table, 429 chain |
| M4 also show 500's error | 8 | 2 | 500-never-shows-server-text, 500 chain |
| M5 only 400 (= main's rule) | 4 | 6 | same as main |
| patch reverted | same as main row | | |

## Limits, plainly
- So this test is **red on main by design**: it must be placed WITH the patch, not before. If Ash wants the test first, it would need `todo` on the six cases.
- Fake DOM, not a browser. Nothing run against staging or production. The 429 chain relies on `memberBusy` being per-process and `_resetCutRouteState()` in `beforeEach`.
- Whether 429 (and 422) should show server text is a design choice I made; the route sentences are maker-facing, and 500 stays generic on purpose. Ash may drop 429/422 from the list; M2/M3 show which tests then change.
- Overlaps GPT's `cut-export-ready.patch` (corrupt per Setu, `git apply --check` failed) in its 409-message part only; it does not do the Export-disabled-while-pending part.
- I did not run the rest of the cut/video suite against the patched cut.js this session. Setu should run cut* + video* on the placed branch.

## Placement (Tier 2: public client + test; needs Ash's yes)
1. `git apply teams/cut/outputs/2026-11-28T00-23-17/exportFailureMessage-409.patch` on main.
2. Copy the test byte for byte to `commons/test/cut-export-error-propagation.test.mjs` (compare SHA-256 above).
3. Run it (expect 10/10), then cut* + video*; revert the patch line to confirm red.
