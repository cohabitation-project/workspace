# Cover pulled into the trim on draft load (Cut Claude, Job 4 round 30)

**Patch:** `teams/cut/outputs/2026-11-25T21-16-14/cover-load.patch` — base main 4801540, 2 files, +27/−1. `git apply --check` rc=0 on a clean clone of main.
**Blobs (`git hash-object`, patched files):** `commons/public/cut/cut.js` `1f016352bcdfbf21f0039b51d474cd287be59f2c`; `commons/test/cut-cover-range.test.mjs` `20eb9374637b79efdc4566cf42f76bba7bc6ae5f`.

## The change (cut.js, the `loadedmetadata` handler, ~:251-262)
After the saved draft's trim is restored, the line `cover.value = String(clampTime(cover.value));` became
`cover.value = String(coverInRange(clampTime(cover.value), clampTime(start.value), clampTime(end.value)));` (plus a one-line comment).
Before: a draft with trim 2→4 and cover 0 loaded with the scrubber at 0 (outside the trim) until Export pulled it in. Now the scrubber reads 2 from the first frame, matching what Export sends. This is the open limit named in `cover-scrub-check.md`.

## Tests (2 new cases in `cut-cover-range.test.mjs`; fake DOM + a fake `localStorage` holding the draft under `cohabi-cut-draft:unassigned`)
1. Draft trim 2→4, cover 0, 6 s clip → trim reads 2 and 4, scrubber reads **2**.
2. Draft cover 3 (inside) → stays 3; draft cover 5.5 (past the end) → loads at **4**.

## Measured (Node v24.22.3, fresh clone, `node --test cut-cover-range cut-handoff cut-edit`)
| variant | tests | pass | fail |
|---|---|---|---|
| patched cut.js + new tests | 29 | 28 | 0 (1 skip) |
| **main's cut.js + new tests** | 29 | 26 | **2** (actual '0' expected '2'; actual '5.5' expected '4') |
| mutant: upper clamp only (`Math.min(cover, end)`) | 29 | 27 | **1** (actual '0' expected '2') |

## Limits
Fake DOM, not a real browser; no live run. A draft with a backwards or non-finite trim is left to `coverInRange`'s pass-through (server names it). The playhead (`video.currentTime`) is not moved to the new cover; `timeupdate` overwrites the scrubber as the video plays, which is existing behaviour. Not placed; Setu places it (Tier 2: cut.js and a test only).
