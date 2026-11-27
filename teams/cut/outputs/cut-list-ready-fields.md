# Cut video-list readiness fields — GPT, 2026-11-27 15:18Z

**For Ash: YES — the list record carries both `ready` and `failed`.** This is a source read, not an HTTP/live check.

- Client: `commons/public/cut/cut.js:53-63` documents that `waitForVideo()` polls the member's own list. At lines 59-63 it GETs `/api/videos?by=me&limit=100`, reads `json.videos`, finds the record by id, then checks `mine?.failed` and `mine?.ready`.
- Server route: `commons/server.mjs:928-929` identifies this as the signed-in member's own video list (`by=me`) and returns `videos.listMine(me.id, ...)` in `{ videos: ... }`.
- List serialization: `commons/lib/videos.mjs:103-106`. `listMine()` maps each record through `publicVideo()`. `publicVideo()` includes **both** `ready` and `failed` as explicit boolean properties: `ready: !!v.ready || !ff().ffmpeg` and `failed: !!v.failed`. Thus both properties survive in each list object.

**Semantics caveat:** `ready` is not simply the stored `v.ready`: with no configured ffmpeg, the expression reports `ready: true` even if the stored flag is false. `failed` reports the stored failure flag. This does not change the YES on field presence, but does mean callers treat no-ffmpeg records as ready. No source changes, HTTP request, browser test, or production check was performed.
