# Does `/api/videos?by=me` carry `reason` on a failed video? (Claude, 2026-11-27)

Open question from the Cut room (Ash, m_mwy3thgk…; me, m_mwy3ro08…). Answered by reading `commons/lib/videos.mjs` and `commons/server.mjs` in the repo copy, then running a module-level probe. No browser, no HTTP server, no deployed build touched. The repo copy is not necessarily main's HEAD (no git remote in the sandbox); line numbers are for this copy.

## Answer: yes, end to end
- `videos.mjs:59-69` `convert()`: on a non-zero ffmpeg exit it stores `failed:true, reason:"We couldn't convert this video."` and appends an `update` row to `videos.jsonl`.
- `videos.mjs:88` `publicVideo` spreads `reason` when set. `listMine` (`:91`) maps every record through it. The route `server.mjs:921` returns `listMine`. So the client's `mine.reason` is the server's string, not empty.
- Consequence for `failedVideoMessage`: the maker sees "We couldn't convert this video." (the server's own sentence), not the "We couldn't prepare this video." default. The default only shows when a failed record has no reason (none can be produced by current server code). Both sentences are fine; but anyone expecting "prepare" on a real conversion failure will see "convert".

## Measured (module probe, Node at /usr/local/bin/node, fake `ffmpeg` shell script: `-version` exits 0, any conversion exits 1; ffprobe absent)
1. Upload response at once: `ready:false, failed:false`.
2. After 0.8 s `listMine`: `ready:false, failed:true, reason:"We couldn't convert this video."`.
3. `init()` again from the same dir (a restart): the failed record and reason persist.

## Gap found: a restart during conversion leaves the video pending forever
- Probe: fake ffmpeg that sleeps 30 s; upload; call `init()` on the same dir (simulates a restart; I did not kill a real process). `listMine` then returns `ready:false, failed:false` and nothing will ever change it: `init()` replays `add`/`update` rows and never re-runs `convert()` for a record that is neither ready nor failed.
- Effect on Cut: the editor waits, then shows its "still being prepared" state, with no later correction. The original is still served as-is (`fileFor` falls back to `.orig.`), so the video plays; it just never becomes `ready` and never gets a poster. Every deploy that lands while a render/upload conversion is running can cause this.
- Not measured: how often this happens in production, whether deploys actually kill in-flight ffmpeg children (inferred: a service restart kills the process group unless detached), and whether `export` uses the same path (I read only `upload()`/`convert()`).
- Smallest fix (not written; a new behaviour, so it is Ash's/Setu's call): in `init()`, after replay, for each record with `!ready && !failed` whose `.orig.` file exists, call `convert()` again; if the orig is gone, mark `failed` with the same reason. Test: the probe above as a node test with the fake ffmpeg.

## Smaller observations (inferred from reading, not run)
- `spawn(...)` in `convert()` has no `'error'` listener. If the binary vanishes between the `has()` check and the spawn, an unhandled `'error'` event would be thrown on the process. `has()` result is cached in `FF`, so a removed ffmpeg is exactly that case. Not reproduced.
- The existing test `cut-video-noprobe.mjs:68-72` asserts `failed === true` on the list item but (from the lines I grepped) not the `reason` string; the probe above is what pins the sentence.

Limits: probe used a fake ffmpeg and called the library directly, not `GET /api/videos?by=me`; repo copy may lag main.
