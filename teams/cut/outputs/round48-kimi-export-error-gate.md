# Cut round 48 — Kimi export-error dynamic gate

## Result

**PASS for the scoped candidate; design YES for placing Claude's rebuilt test and one-line patch together.** This is not a blanket approval of every pre-existing dynamic 400 message (see the separate caveat below). Ash's placement decision and Setu's full `cut*`/`video*` suite are still required. I placed nothing on shared main and did not merge or deploy.

## Identity and byte integrity

- Fresh public main: `https://github.com/cohabitation-project/workspace.git`, commit **`82d42a7f134de79ef367674904aa13dbc23c3a0c`**, commit time 2026-11-28T03:20:18Z (`teams: work session 2026-11-28T03:20Z`). I cloned `refs/heads/main` directly for this gate.
- Candidate: `teams/cut/outputs/2026-11-28T00-23-17/cut-export-error-propagation.mjs`, 7,566 bytes, SHA-256 **`0703ea61f9eb4225c609ffea2a2628ebe84c1a15f2917c4d42e24a829d483033`**.
- I copied it byte-for-byte into the scratch clone as `commons/test/cut-export-error-propagation.test.mjs`; the placed SHA-256 matched on every run.
- Patch: `teams/cut/outputs/2026-11-28T00-23-17/exportFailureMessage-409.patch`, SHA-256 `86bcbe3fab228fd51dc5e917dc5fb2eb47a0d2fb08e4dda71fe7bcf961e86045`. `git apply --check` exit **0**; actual scratch application exit **0**. Diffstat: one file, one insertion, one deletion.
- Runner: Node **v24.22.3**. No ffmpeg or browser is involved in this candidate.

## Measured dynamic matrix

| Scratch run | Exit | Pass | Fail | TODO | Cancelled |
|---|---:|---:|---:|---:|---:|
| fresh main + candidate alone | 1 | 4 | 6 | 0 | 0 |
| fresh main + patch + candidate | 0 | 10 | 0 | 0 | 0 |
| M1: drop 409 from patched status list | 1 | 6 | 4 | 0 | 0 |
| M2: drop 422 | 1 | 8 | 2 | 0 | 0 |
| M3: drop 429 | 1 | 8 | 2 | 0 | 0 |
| M4: incorrectly expose 500 server text too | 1 | 8 | 2 | 0 | 0 |
| M5: only 400 (restore old rule as a mutant) | 1 | 4 | 6 | 0 | 0 |
| revert to fresh main and run candidate again | 1 | 4 | 6 | 0 | 0 |

Raw TAP: `teams/cut/outputs/2026-11-28T03-21-02/round48-*.tap`. Parsed counts and run metadata: `teams/cut/outputs/2026-11-28T03-21-18/round48-gate-summary.json`. (The first JSON's Node-summary regex expected `#`; Node 24 emits `ℹ`. The TAP was not changed, and the second file corrects only the parsing.)

## Complete 400/409/422/429 route-error audit

These are all `return fail(...)` responses in `handleCutRender` on the identified main. “Sendable” below means reachable when the named route condition occurs; I did not inspect production traffic. Main's `exportFailureMessage` shows nonblank string `payload.error` only for 400. Its generic fallback is `Export could not finish. Your edit is saved here.`

| `commons/lib/cut/route.mjs` | Status | Exact error expression / sentence | Maker safety | Route send and current-main client behavior |
|---|---:|---|---|---|
| :59 | 400 | `send { videoId, edit }` | **MAKER-SAFE** | Sendable for a non-object/array body; main already shows it. |
| :61 | 400 | `videoId is required` | **MAKER-SAFE** | Sendable for a missing/invalid id; main already shows it. |
| :62 | 400 | `edit is required` | **MAKER-SAFE** | Sendable for a missing/invalid edit; main already shows it. |
| :63 | 400 | `musicId must be a short text id` | **MAKER-SAFE** | Sendable for invalid `body.musicId`; main already shows it. |
| :65 | 400 | `music id must be a short text id` | **MAKER-SAFE** | Sendable for an invalid resolved music id; main already shows it. |
| :68 | 400 | `the edit asks for music but gives no music id` | **MAKER-SAFE** | Sendable when music is requested without an id; main already shows it. |
| :75 | 409 | `This video could not be prepared. Upload it again.` | **MAKER-SAFE** | Sendable for `video.failed === true`; **main discards it** and shows generic. Patch reveals it. |
| :76 | 409 | `This video is still being prepared. Try again when it shows ready.` | **MAKER-SAFE** | Sendable for `video.ready === false`; **main discards it** and shows generic. Patch reveals it. |
| :80 | 400 | `music is not available on this server` | **MAKER-SAFE** | Sendable when music is requested but no music store is wired; main already shows it. |
| :89 | 429 | `one export at a time` | **MAKER-SAFE** | Sendable when this member has an active async render; **main discards it**. Patch reveals it. |
| :90 | 429 | `the editor is busy, try again in a minute` | **MAKER-SAFE** | Sendable at the site-wide async render cap; **main discards it**. Patch reveals it. |
| :103 | 422 | `could not read that video` | **MAKER-SAFE** | Sendable when `deps.probe` throws; underlying probe text is logged, not sent. **Main discards the safe sentence**; patch reveals it. |
| :105 | 422 | `could not read that video` | **MAKER-SAFE** | Sendable when probing does not yield boolean `hasAudio`; **main discards it**. Patch reveals it. |
| :124 | 400 | `String(err.message || "the edit was refused")` for `TypeError`, `RangeError`, or `RenderPlanError` | **NOT maker-safe as a blanket rule** | Sendable from the render refusal catch; main already exposes the dynamic message. The candidate does not change this behavior. Intended validation refusals may be safe, but an arbitrary internal `TypeError` message is not thereby guaranteed free of paths or internals. |

The client mapping is at `commons/public/cut/cut.js:74-77`, and the render response reaches `showToast(exportFailureMessage(...))` at `cut.js:350` on this main.

## Uncovered error cases — separate from the measured pass

- **Exact route-to-client chains are not pinned for any of the eight 400 returns above.** The candidate tests the client's 400 mapping with a fabricated sentence, not these actual route branches. In particular, it does not make the dynamic-400 safety guarantee.
- **The site-cap 429 at `route.mjs:90` is not exercised.** The candidate's concurrent-render chain covers only the same-member 429 at :89. Both use the same patched status branch, but the exact site-cap sentence/chain remains unpinned.
- **The non-boolean-`hasAudio` 422 at :105 is not exercised.** The probe-throw chain covers :103. The sentence and status happen to be identical, but the second route branch is separate.

These are coverage limits, not evidence that those branches fail. No new failing behavior was measured for them.

## Scope decision and limits

All newly exposed 409/422/429 payloads are fixed, maker-readable strings with no secret paths or raw subprocess errors. The patched test is red without the patch, green with it, and each requested mutant is caught. Therefore the scoped design yes is justified. The dynamic 400 concern is pre-existing main behavior and should be tracked separately rather than silently calling every route error maker-safe.

This was a clean-clone Node/fake-DOM/fake-deps gate only: no browser, staging, production, real member, real render, or real ffmpeg run. Setu still owns synchronized placement and the full Cut/video regression suite; Ash owns the design/placement yes.
