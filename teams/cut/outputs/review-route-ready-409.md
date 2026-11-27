# Review: `route-ready-409.patch` (Cut round 43, Kimi)

**For @Ash: PASS on source review; no blocking correctness issue found.** The patch has the requested ownership, readiness, failure, and ordering behaviour, and `git apply --check` succeeds both on the current checkout and after `wire-killtree.diff`. This is a file-only review, not a runtime or live pass.

## Verdicts

| Question | Verdict | Source basis |
|---|---|---|
| Unready video → 409 before probe/ffmpeg? | **Yes** | After the patch, `route.mjs:76` returns 409 with “This video is still being prepared. Try again when it shows ready.” when `video.ready === false`. This is before music lookup, busy-slot acquisition, `deps.probe` (current line 92), and `renderJob`/`renderEditJob` (current line 116). |
| Failed video → its own 409 message? | **Yes** | `route.mjs:75` checks `video.failed === true` first and returns 409, “This video could not be prepared. Upload it again.” Thus a failed record that also has `ready:false` gets the failure sentence, not the pending sentence. |
| Another member's video still 403? | **Yes** | Current `route.mjs:72` returns 403 when `video.owner !== member.id`; both new guards are inserted immediately after it. Ownership therefore wins regardless of the other member's readiness/failure state, and those states are not disclosed by the response. |
| Nothing else changes? | **Yes, within this patch's intended scope** | The route adds only the two early returns. The wire adapter adds only `ready:v.ready` and `failed:v.failed` to its existing internal `{owner,path}` record. No ready render, music, concurrency, probe, render, or response code is otherwise edited. The process-group behaviour comes from the separate killTree patch, not this one. |
| Applies after `wire-killtree.diff`? | **Yes, measured statically** | In a temporary copy of the current checkout, `git apply --check route-ready-409.patch` exited 0 before killTree; applying killTree exited 0; the readiness patch's subsequent `git apply --check` and actual application both exited 0, with empty stdout/stderr. The two patches touch different wire.mjs hunks. |

## Why the adapter fields are sufficient

Current `commons/lib/videos.mjs:102-103` makes `videos.get()` return `publicVideo(v)`, which supplies normalized `ready` and `failed` booleans. New uploads start with `ready:false` (`videos.mjs:67`), conversion failure sets `failed:true` (`:81-83`), and success sets `ready:true` (`:88`). The patched wire adapter now preserves those fields for the route instead of dropping them. Strict comparisons (`=== false` / `=== true`) also preserve the existing behaviour of older route fakes that omit readiness entirely.

When ffmpeg is unavailable, `publicVideo` deliberately reports `ready:true` (`videos.mjs:103`); that existing policy is unchanged. A `failed:true` record still receives the new failed-video 409 because the failed guard runs first.

## Static application evidence

- Readiness patch: `teams/cut/outputs/2026-11-27T09-19-18/route-ready-409.patch`, 1,565 bytes, SHA-256 `58824875b74322427a526d87e3358b37b6342c90d6c9ee86839f02dc8c7b1b36`.
- killTree patch: `teams/cut/outputs/2026-11-27T06-23-00/wire-killtree.diff`, 1,701 bytes, SHA-256 `dc4d212a289e273996922ec84e707edb48d363d2cf92c848e6b7fefd3fdd9c2b`.
- Raw results: `teams/cut/outputs/2026-11-27T12-24-10/review-route-ready-409-static.json`.
- After both patches in the temporary copy, the new route guards were at lines 75–76 and the adapter carried both fields at line 37; killTree's `detached:true` and process-group kill were also present.

The supplied repository snapshot has no `.git` metadata, so “current” here means the checkout files available to this session; I could not verify a commit SHA or a fresh `main` clone. No repository product file was modified.

## Non-blocking documentation note

The route header's `Answers` and `Order` comments do not yet list 409/readiness. That does not affect this review's behavioural verdict, but a placement pass may update those comments if desired.

## Not checked

I did not run Claude's unit tests, boot a server, invoke probe/ffmpeg, open the UI, or inspect staging/production. Those remain placement/runtime work, not evidence claimed by this review.
