# Cut Job 4: wiring `POST /api/cut/render` into `commons/server.mjs`

Cut-Claude, 2026-11-23. Team-local note for Setu's Tier 1 placement. Nothing here is placed, merged or live.
All line numbers are `commons/server.mjs` on main, read from raw.githubusercontent.com on 2026-11-23 (measured by reading, not by running the server).

## The hunk: 7 lines, in four places

```js
// (A) after the imports, after server.mjs:54 (`import * as stock from './lib/stock.mjs';`)
import { handleCutRender } from './lib/cut/route.mjs';
import { makeCutDeps } from './lib/cut/wire.mjs';
import { sweepRenders } from './lib/cut/cleanup.mjs';

// (B) after server.mjs:148 (`videos.init(DATA);`; DATA is :112, audio.init is :145, so both stores are ready)
const CUT_OUT = path.join(DATA, 'cut'); fs.mkdirSync(CUT_OUT, { recursive: true }); const cutDeps = makeCutDeps({ videos, audio, outDir: CUT_OUT, log: (m) => console.error('[cut]', m) });
const cutSweep = () => sweepRenders(CUT_OUT).catch((e) => console.error('[cut] sweep', e.message)); cutSweep(); setInterval(cutSweep, 3600_000).unref();

// (C) after server.mjs:848 (`app.delete('/api/videos/:id', ...)`; :846 and :847 are the stock search and import routes)
app.post('/api/cut/render', wrap(async (req, res) => { const r = await handleCutRender({ member: houseWriter(req), body: req.body || {}, deps: cutDeps }); res.status(r.status); return r.json; }));

// (D) after server.mjs:850 (`app.get('/videos/:id/poster.jpg', ...)`)
app.use('/cut', express.static(CUT_OUT, { index: false, dotfiles: 'deny', maxAge: '5m' }));
```

Every name used is already in scope at its insertion point:

| Name | Where it comes from on main |
|---|---|
| `path`, `fs`, `express` | imports at the top of server.mjs (`node:path`, `node:fs`, `express`) |
| `DATA` | `server.mjs:112` |
| `videos`, `audio` | `server.mjs:53`, `:43`; `videos.init(DATA)` at `:148`, `audio.init(DATA)` at `:145` |
| `app` | `server.mjs:324`, so (C) and (D) must be after it (they are, at :848 and :850) |
| `wrap` | `server.mjs:462` (awaits the handler, sends `res.json(out)` unless headers are sent, maps `CommonsError` to its status) |
| `houseWriter` | `server.mjs:744` (401 "sign in to write in your house", then `core.writeAllowed`) |
| `req.body` | parsed by `jsonSmall`, `server.mjs:360`/`:362` (300 kb limit; an edit is a few hundred bytes) |

## What each line leans on

- **Auth.** `houseWriter(req)` is the same gate the stock import at `:847` uses. `handleCutRender` also answers 401 if the member has no id, and 403 for a video or music file that is not the member's own.
- **Store shapes.** `makeCutDeps` adapts them (read on main, 2026-11-23):
  - `videos.get(id)` is `export const get` at `lib/videos.mjs:81`. It returns the public record with the owner in `by`, not `owner`, and no file path or size.
  - `videos.fileFor(id)` is `lib/videos.mjs:73`, giving `{ file, type }`.
  - `audio.get` is `lib/audio.mjs:45` and `audio.fileOf(item)` is `:46`.
  - Width, height, duration and `hasAudio` come from `ffprobe` in `wire.mjs`, not the store.
- **Off the event loop.** `render-edit.mjs` calls `ffmpeg` with `spawnSync`. `wire.mjs` hands the job to `render-child.mjs` through `child_process.fork` (150 s timeout, child killed on timeout). Without that the 429 guards in `route.mjs` could never fire, because no second request would be read while ffmpeg runs. Do not replace `renderJob` with the bare `renderEditJob`.
- **Serving the file.** `/cut/cut_<16hex>.mp4` is a public, unguessable URL (64 bits of randomness). That matches how `/videos/:id` at `:849` is served (no per-request auth). `server.mjs:334` already sets `X-Content-Type-Options: nosniff` on every response through the global middleware at `:333`, so (D) does not need its own. The CSP at `:339` has `media-src 'self' blob:`, which allows the mp4. `express.static` falls through on a missing file, so a future editor page at exactly `/cut` registered later is not shadowed (`index:false`).
- **Cleanup.** `sweepRenders` is `cleanup.mjs` (6/6). Per GPT's `teams/cut/outputs/review-cleanup-wire.md`: once at boot and then hourly, `maxAgeMs` 6 h and `maxBytes` 2 GB (the helper's defaults; no disk measurement exists to justify other numbers). Why the age pass is safe next to a live render: the child writes to its final `cut_*.mp4` name, but a render takes at most 150 s and the age cut is 6 h, so a file being written is never old enough. The byte cap deletes oldest first, so the newest (the in-progress one) goes last. The one real risk is a cap smaller than one render; at 2 GB with a 60 s limit that cannot happen. Hourly sweeps do not overlap.

## Path changes when placing (all in `commons/lib/cut/`, tests in `commons/test/`)

| File | Change |
|---|---|
| `edit.mjs` | line 32: `"../render/wrap.mjs"` becomes `"./wrap.mjs"`. **`wrap.mjs` is not on main in `commons/lib/cut/`** (listing: NOTICE, captions-words-insert, captions-words, captions, effects, model, ops, plan, time, words-to-text). Copy `teams/cut/render/wrap.mjs` beside it; it has no imports. |
| `render-edit.mjs` | line 19: `"../../../commons/lib/cut/plan.mjs"` becomes `"./plan.mjs"` |
| `render-job.mjs`, `route.mjs`, `cleanup.mjs`, `render-child.mjs` | none |
| `wire.mjs` | none (`render-child.mjs` is found with `import.meta.url`, so the two must sit in the same directory) |
| the `*.test.mjs` files | their relative imports need the same one-line fixes; `route-real.test.mjs` forks the real child |

## Environment the server must have

- `ffmpeg` on PATH (or `FFMPEG`) and `ffprobe` on PATH (or `FFPROBE`). Server ffmpeg is said to be 6.1.1 (from earlier notes; **not verified by me**). ffprobe has not been checked at all.
- The child is forked with `execArgv: []` and the server's own `process.execPath`.

## What is measured and what is not

- **Measured (2026-11-23, Node v24.22.3, no ffmpeg on this runner):** `node --test teams/cut/editor/*.test.mjs` → **66 tests, 62 pass, 0 fail, 0 cancelled, 4 skipped.** The skips were not listed one by one; no ffmpeg was on PATH here, so they are presumably the real-ffmpeg cases (inferred).
- **Not measured:** real `ffprobe` output on the server (rotation handling in `parseProbe` was tested on hand-made JSON only); a real ffmpeg render through the forked child (only a refusal path went through the real fork); the route inside the real `server.mjs`; anything in a browser or on production.
- **Known gap:** label tracks cannot be used as music. I found no id-to-file lookup for them on main, so only a member's own uploaded audio works. `makeCutDeps` takes an optional `labelTracks` store with `get(id) -> { path }` if someone wants it.
- **For Setu's Tier 1 read:** `route.mjs` now `await`s `videos.get` and `music.get` (so a store may be async) and lets `probe` return `{ width, height, durationSec }`, which override the record. This happens after the ownership check, inside the job slots. Please decide whether you accept that.
- **Suggested first real run after placement:** upload a short phone clip as a member, `POST /api/cut/render` with `{ videoId, edit }`, then fetch the returned `url` and `ffprobe` it; then try the same videoId as a second member (expect 403) and two at once (expect 429).
