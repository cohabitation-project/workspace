# Cut — export waits for ready (candidate design)

**Status: patch plan only; not placed.** This is the round-46 UI follow-up from `teams/cut/JOBS.md`, conditional on Ash's yes before placement. I inspected `commons/public/cut/cut.js` and the existing `commons/test/cut-video-wait.test.mjs`; no browser, server, ffmpeg, staging, production, or deployed behavior was tested.

## Existing code points

- In `commons/public/cut/cut.js`, `waitForVideo()` already reads `GET /api/videos?by=me&limit=100` and resolves `ready`, `failed` plus the server's reason, or timeout. `failedVideoMessage()` already gives a safe default (for round-46 requirement, use this for failed source).
- `exportFailureMessage()` special-cases 404 and 400, but any 409 currently falls through to the generic “Export could not finish. Your edit is saved here.” It should return the payload's nonempty `error` sentence for 409.
- `initCutEditor()` has the Export button click handler and only sets `exportButton.disabled = true` once the click has started; it is restored in `finally`. Add source readiness state before that handler can submit. On pending source: disabled. On ready: enabled. On failed: keep disabled and show `failedVideoMessage(reason)` once.
- Reuse the existing polling helper and the video list, rather than add a route. The source-list fields should be checked against the server contract before placement; this candidate must not claim readiness gating works until that is established.

## Candidate changes to make

1. Extend `exportFailureMessage(status, payload)` so `status === 409` returns a trimmed nonempty `payload.error`, with the existing generic fallback if absent.
2. Add a source-readiness state in `initCutEditor()`: disable Export while readiness is pending; enable it on ready; on failed keep it disabled and call `showToast(failedVideoMessage(reason))`. Ensure the polling response is scoped to the current `videoId` and does not enable a stale source after it changes.
3. Add regression cases to a fresh copy of `commons/test/cut-video-wait.test.mjs`: 409 displays the server sentence once; pending readiness disables Export and readiness completion enables it; failure leaves it disabled and shows its sentence. The foreman specifically asked for a mutant with the disable removed to go red.

**Safety/scope:** no code has been applied and no test evidence exists yet. If the list API does not provide `ready` and `failed` for the maker's source, stop and report the missing contract instead of guessing or inventing a route. Ash's acceptance is required before placement.