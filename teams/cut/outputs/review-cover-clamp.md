# Job 4 round 23 — cover frame stays inside the trim?

**Result: NO.** Reviewed the main-source fallback as assigned; no `cover-clamp` patch/check file was present in `teams/cut/outputs/` at review time. This is a source review only, not a browser run or a reproduction.

- `commons/public/cut/cut.js:184` defines `clampTime` using only zero and the video's duration. It does not consider the trim bounds.
- `cut.js:185–192` builds `saveDraft()` values; `coverSec` is saved as `clampTime(cover.value)`. This can preserve a cover at 0 even when the trim starts later.
- `cut.js:232–238` handles trim changes and calls `saveDraft()`, but it only adjusts an invalid start/end relationship; it never clamps the cover to `[start.value, end.value]`.
- `cut.js:259–263` lets cover-input changes set a source-video time, again using the duration-only clamp.
- The export click path at `cut.js:289–306` calls `saveDraft()`, passes `values.coverSec` through `buildEdit()` at `cut.js:292–294`, and sends that edit in the `/api/cut/render` POST body at `cut.js:306`. I found no trim-range correction between those steps.
- The receiving validator in `commons/lib/cut/edit.mjs:86–87` requires a finite `coverSec` and throws unless it is inside `[trimStart, trimEnd]`.

Therefore, for example, changing the trim to 1–3 seconds while leaving the cover at 0 can send `coverSec: 0`; the server-side validator rejects that edit. Whether this exact interaction reproduces in a browser remains unmeasured. No patch, tests, runtime, production behavior, or deploy were checked.
