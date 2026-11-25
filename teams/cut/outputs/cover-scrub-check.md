# Cover scrubber follows the trim (Cut Claude, Job 4 round 29)

**Patch:** `teams/cut/outputs/2026-11-25T18-22-49/cover-scrub.patch` (git diff, base main `10fca7c`). Two files: `commons/public/cut/cut.js` (+2 lines in `syncRange`) and `commons/test/cut-cover-range.test.mjs` (+2 cases, 1 import changed). Tier 2.

**Blobs (measured with `git hash-object`):** patched `cut.js` `c9dfa078…f5`, patched test `f12c11d0…808`; main's `cut.js` before: `13e007b5…a`.

## What changed
`cut.js` `syncRange` (the handler behind both trim inputs, the `const syncRange` block just before `loadedmetadata`): after the existing start/end nudge and before `saveDraft()`, it now sets
`cover.value = String(coverInRange(clampTime(cover.value), clampTime(start.value), clampTime(end.value)))`.
Reason: Export already pulled the cover into the trim (`coverInRange`, `cut.js` ~:302), but the scrubber still displayed 0 after a 1→3 trim, so the member saw a cover that wasn't the one sent. Now the visible value is the sent value. Export's own clamp stays (defence in depth; also covers a draft restored with an out-of-trim cover).

## Test
Two new cases in `cut-cover-range.test.mjs` drive the shipped `initCutEditor` (exported, takes a `root` with `getElementById`) on a tiny fake DOM (elements with `value`, `addEventListener`, `fire`), set the clip to 5 s via `loadedmetadata`, then move the trim:
1. trim 1→3, cover 0 → scrubber shows `'1'`.
2. cover 2 inside the trim stays `'2'`; trim end moved to 1.5 → cover `'1.5'`.

**Measured, Node v24.22.3, fresh clone of main 10fca7c, no server/browser:**
- patched cut.js + new tests: 6 tests, **6 pass, 0 fail**.
- main's cut.js + new tests: 6 tests, 4 pass, **2 fail** (`actual '0' expected '1'`; `actual '2' expected '1.5'`) — red on main.
- mutant (upper clamp only, `Math.min(cover, end)`): 5 pass, **1 fail** — case 1 catches a missing lower clamp.
- `cut-handoff` + `cut-edit` + `cut-cover-range`: 27 tests, 26 pass, 0 fail (1 skipped/todo in those files, not examined).

## Limits
- Fake DOM, not a browser: it proves the handler's logic on the shipped file, not layout, and not that a real range input renders the new value (it will: it is the same `.value` the draft restore sets).
- Not changed (reported, not fixed): `loadedmetadata` with a saved draft (`cut.js` ~:256-258) restores trim and cover separately and clamps the cover only to the duration, so a draft saved before this patch with an out-of-trim cover would show it until the trim is touched; Export still clamps it. Also, the video playhead is not moved to the new cover (`timeupdate` would reset the cover to the playhead if the clip is playing; unchanged behaviour).
- `teams/cut/editor/cut.js` (unplaced prototype copy) untouched.
- Not applied to main by me; I can't write to `commons/`. Setu places it.
