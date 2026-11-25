# Job 4 round 23 — cover frame stays inside the trim?

**Result: NO.** Reviewed the main-source fallback as assigned; no `cover-clamp` patch/check file was present in `teams/cut/outputs/` at review time. This is a source review only, not a browser run or a reproduction.

- `commons/public/cut/cut.js:184` defines `clampTime` using only zero and the video's duration. It does not consider the trim bounds.
- `cut.js:185–192` builds `saveDraft()` values; `coverSec` is saved as `clampTime(cover.value)`. This can preserve a cover at 0 even when the trim starts later.
- `cut.js:232–238` handles trim changes and calls `saveDraft()`, but it only adjusts an invalid start/end relationship; it never clamps the cover to `[start.value, end.value]`.
- `cut.js:259–263` lets cover-input changes set a source-video time, again using the duration-only clamp.
- The export click path at `cut.js:289–306` calls `saveDraft()`, passes `values.coverSec` through `buildEdit()` at `cut.js:292–294`, and sends that edit in the `/api/cut/render` POST body at `cut.js:306`. I found no trim-range correction between those steps.
- The receiving validator in `commons/lib/cut/edit.mjs:86–87` requires a finite `coverSec` and throws unless it is inside `[trimStart, trimEnd]`.

Therefore, for example, changing the trim to 1–3 seconds while leaving the cover at 0 can send `coverSec: 0`; the server-side validator rejects that edit. Whether this exact interaction reproduces in a browser remains unmeasured. No patch, tests, runtime, production behavior, or deploy were checked.

## Job 4 round 55 — review of Claude's cover-clamp change

**Verdict: YES for valid trim ranges.** I read the shipped `commons/public/cut/cut.js` and `commons/test/cut-cover-range.test.mjs`. In the client source, `coverInRange` is defined at lines 25–29 and clamps finite covers to the closed interval `[trimStart, trimEnd]` when the range is ordered. The only render request in this file is the `POST /api/cut/render` at lines 313–316. Its `edit` is built at line 302 with `coverSec: coverInRange(values.coverSec, values.trimStart, values.trimEnd)`, so the request body at line 315 uses that clamped value. I found no alternate render-send path or other `coverSec` serialization in this client file. The test at lines 27–32 exercises the 1..3 / untouched-cover-0 example against the real `editToTracks`, and lines 35–37 check that export is wired through the helper.

**Boundary:** The helper deliberately returns the original cover for non-finite values or a backwards trim range (lines 26–27); the test explicitly checks this at lines 21–24 so the server can report invalid edits. Thus “inside the trim” is guaranteed for valid ordered finite ranges, not for malformed ranges that should be rejected by the server. I did not run tests, a browser, or a server in this file-only review. The earlier unfinished `cover-clamp-test.patch` is superseded by Claude's shipped source change and test; it is not evidence.

Reviewed source Git blob: `13e007b5948cd11dd6038827927cd51805b25c8a`. Test blob: `c530ed8cbc3ed5848d7375b65c390e0ab4de5e08`.
