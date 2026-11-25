# Cut round 54 (Claude): cover frame outside the trim -> pulled into range

## The bug
`commons/public/cut/cut.js` clamped the cover time to the video duration (`clampTime`) but not to the trim range. `commons/lib/cut/edit.mjs` (`editToTracks`) refuses a `coverSec` outside `trimStart..trimEnd`. The cover scrubber starts at 0 and follows the playhead, so a member who moves only the trim start (say to 1) and leaves the cover alone exports `coverSec: 0` with trim 1..3 and gets a 400 toast: "coverSec 0 must lie inside the trimmed range 1..3". My round-21 browser run hit exactly this and I wrongly called it a harness mistake. GPT's file-only review (`review-cover-clamp.md`) said NO to main for the same reason.

## The fix (2 small edits, `commons/public/cut/cut.js`)
- New exported pure function `coverInRange(cover, trimStart, trimEnd)`: returns the cover pulled to the nearest end of the range; if any value is not a number, or the range is backwards, it returns the cover unchanged so the server's own message still speaks.
- The Export click now builds its edit with `coverSec: coverInRange(values.coverSec, values.trimStart, values.trimEnd)`. The saved draft is not changed (the member's chosen cover is kept if they widen the trim again).

## Test: `commons/test/cut-cover-range.test.mjs` (4 tests)
1. `coverInRange` in range / below / above / on each end.
2. Broken range or non-number is passed through, not hidden.
3. Real `editToTracks` (from `commons/lib/cut/edit.mjs`): `buildEdit({trimStart:1,trimEnd:3,coverSec:0})` throws the 400's message; the same edit through `coverInRange` is accepted (`durationSec: 5`).
4. Source check: the export click goes through `coverInRange`.

## Measured (Node v24.22.3, copy of `$REPO/commons` with `{"type":"module"}`, no server, no browser)
- New test file: 4 tests, 4 pass, 0 fail.
- Mutant (export click put back to `coverSec: values.coverSec`): 3 pass, 1 fail (the source check, case 4). The behavioural cases test the pure function, so they cannot see the wiring; case 4 is what guards it.
- On old main the file fails to import (`coverInRange` is not exported), so it is red there.
- `cut-handoff.test.mjs` + `cut-edit.test.mjs`: 21 tests, 20 pass, 0 fail, 1 skipped.

## Not done / limits
- No browser re-run of the click path: the fix is checked at the function and model level, not by dragging sliders at 390 px. A live run (trim start 1, cover untouched, Export -> 200) is still owed.
- `teams/cut/editor/cut.js` is an older prototype copy and differs from `commons/public/cut/cut.js`; I did not change it.
- `commons/test/cut-music-list.test.mjs` (boots a server) was not re-run.

## Music hint: what I found while checking the upload entry point (Ash's order)
- Where can a member upload audio in the UI? Only found so far: `commons/public/hq.js:1407` and `:1435`, the room composer's 📎 attach button (accepts `audio/mpeg, audio/wav, audio/ogg`), which POSTs to `/api/audio`. No audio-upload control in `studio.js`, the Cut page or (by grep for `/api/audio` and `accept=…audio`) in any other public script. Found by grep, not by using the page; the 📎 button is in the HQ rooms, not in the feed composer.
- `loadMusic` in `cut.js` only unhides `#music-wrap` when the list has a track; for a member with zero uploads there is no control and no text (read from code, not measured live).
- So a hint "Upload a track to add music" would need to point at an HQ room (📎). Per Ash's rule, I have not written the hint: I need Ash to confirm that pointing a Cut member at an HQ room composer is acceptable, or that audio upload should get its own entry point. Not run live.
