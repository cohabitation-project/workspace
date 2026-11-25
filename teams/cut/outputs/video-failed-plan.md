# Failed video conversion: two product options

**Scope:** advice only, as requested. No code or server was changed, and neither option is implemented.

## What the current code does

- `commons/lib/videos.mjs:59–69`: `convert()` starts ffmpeg in the background. At `:64`, a non-zero ffmpeg exit deletes the partial output and returns without changing the metadata, recording a failure, or notifying the uploader. The original stays available to `fileFor()` when present (`:89–93`).
- `commons/lib/videos.mjs:53–56, 81–82`: upload creates the record with `ready:false`, stores it, starts conversion, and immediately returns `publicVideo(v)`. That public projection includes `ready` but no failure field or reason.
- There is **not** a `GET /api/videos/:id` record endpoint in the checked `commons/server.mjs`. `GET /api/videos?by=me` (`:858–860`) returns the member's records; `GET /videos/:id` (`:864`) serves video bytes, not a record. Thus a failure flag/reason would need to appear in the POST response and/or the existing own-videos list (or a record endpoint would need to be added); do not mistake the media URL for a metadata API.
- `commons/public/cut/cut.js:284–297`: after export, Cut POSTs the rendered MP4 to `/api/videos`, takes the returned id, and immediately shows the “Your edited video is ready. Tap \"Post it\".” link. It does not wait for conversion or inspect `ready`. If that background conversion fails, the maker can be offered a post link even though the expected normalized file/poster was never produced.

## Option A — persist and expose asynchronous failure (recommended)

On ffmpeg's non-zero exit, store `failed: true` and a safe, human-readable `reason` on the video record. Include those fields in the public record projection used by the upload response and `GET /api/videos?by=me`. Cut must not call a video ready just because the upload returned an id: it should wait/poll the own-videos record for this id, show the failure reason and withhold “Post it” on failure, and offer a clear recovery action. Keep the original only if that is an intentional usable fallback; otherwise avoid presenting it as a finished export.

**What the maker sees:** after Export, a short “Saving…” state; if conversion fails, an explicit “We couldn't prepare this video: [reason]” message in `/cut/`, with no misleading ready/post link. The asynchronous conversion architecture can remain.

**Test todo turned green:** `commons/test/cut-video-noprobe.mjs:72`, “a clip ffmpeg cannot convert tells its maker …”. Extend the existing child-process scenario to assert the returned/polled public record has `failed:true` and a useful reason, and (when Cut behavior is included) that the UI does not offer the ready handoff. The server-free test can establish the record part; it cannot prove browser UI behavior.

## Option B — reject with HTTP 422 before accepting

Make conversion a prerequisite to a successful upload response: run it synchronously (or otherwise hold the request until conversion outcome is known), return 422 with a maker-safe error when ffmpeg cannot convert, and do not leave a normal ready-to-post video record behind. Cut already reads the POST response body and displays `saved.error` or a status fallback at `cut.js:293–295`, so a 422/error message can be shown directly and no handoff link is created.

**What the maker sees:** Export may wait while conversion runs; on failure the editor displays the returned error and does not say the video is ready or offer “Post it”. This is a larger behavioral change: blocking request duration and resource use need consideration, especially with uploads up to 200 MB.

**Test todo turned green:** the same `commons/test/cut-video-noprobe.mjs:72` todo, rewritten to assert the upload returns `{status: 422, msg: ...}` for undecodable bytes and that no successful video record is returned. Its present helper already captures upload exceptions as `out.error`; it would need an assertion on `error.status` rather than the current-background-failure `last.ready` assertions.

## Recommendation

**Recommend Option A:** conversion is already asynchronous, so persisting a failure state/reason and making Cut wait for it is the least disruptive way to stop falsely telling makers their export is ready; fix the record contract and UI together, and test both separately.