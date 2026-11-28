# Cut round 49: every 4xx the render route sends is one plain sentence (test + finding)

Seat: Claude. Base: fresh clone of public main `fb2022a` (depth 1), Node v24, `HOME=/tmp/home COMMONS_NO_SPEND_POLL=1`, no `npm ci` needed (route.mjs and edit.mjs have no dependencies), no ffmpeg, no browser, nothing live.

**Test candidate:** `teams/cut/outputs/2026-11-28T06-21-00/cut-render-error-text.test.mjs`, SHA-256 `583867ec877487cc660ea0bdd4f385d5202f648198ed2fcca4343b904b950b94` (hash taken in the call that wrote it). Place unchanged as `commons/test/cut-render-error-text.test.mjs` (Tier 2, test only, no product code). It finds its repo root whether it sits in `commons/test/` or elsewhere.

## What it pins (today's behaviour, not a new rule)
1. Every refusal the route makes itself (400 x8, 401, 403 x2, 404 x3, 409 x2, 422 x2, 429 x2: 21 cases, all seven statuses exercised) is one line, 1 to 200 characters, and matches none of: a server path, `.orig`/`.mjs`, `node_modules`, `node:`, ffmpeg/ffprobe/libx264/stderr, ENOENT/EACCES, a stack frame.
2. A probe that throws a path + ffmpeg text gives the fixed 422; the real text is in `deps.log` only.
3. A job that throws a plain Error with a path + ffmpeg stderr gives the fixed 500 "the render failed"; real text in the log only.
4. An Error with a 4xx `.status` (400, 409, 422, 429, 499) or named `CommonsError`/`DeskError` and internal text is still the fixed 500. This is the answer to the `wrap` worry: the route never reads `.status`.
5. Positive control: RangeError, TypeError and RenderPlanError ARE shown at 400 with their own sentence, so 3 and 4 cannot pass just because everything is a 500.
6. The real chain: `renderEditJob` with a shell-script ffmpeg (via `FFMPEG`) that prints a path-laden stderr and exits 1 gives the fixed 500, the log has the stderr, and no half file is left in the out dir. A real `edit.mjs` refusal (trim past the end) gives a clean 400 "trim ...".
7. **DESIRED, reported as TODO (finding):** a real native TypeError that quotes a path is shown to the maker.

## Measured
- Base: **6 pass, 0 fail, 1 todo** (7 tests).
- Mutants, each an exact-once replace in `route.mjs`, restored after:
  | mutant | result |
  |---|---|
  | M1 the 500 branch returns `err.message` | 3 pass / 3 fail |
  | M2 the probe 422 returns `err.message` | 4 / 2 |
  | M3 the 400 branch shows any error (`if (true)`) | 3 / 3 |
  | M4 the 409 sentence adds `video.path` | 5 / 1 |
  | M5 the route honours `err.status` and shows its message | 5 / 1 |
  | M6 the log call is dropped | 4 / 2 |
  | M7 the 429 sentence adds member id and path | 5 / 1 |
  | restored | 6 pass / 1 todo |
  All seven red. The todo stays todo under every mutant (it is not a gate).

## The finding (design question for Ash, not a regression)
`route.mjs` (the `catch` around `renderJob`) shows `err.message` for **any** TypeError, any RangeError, or a name of `RenderPlanError`. It checks the class, not where the error came from. Test 7 builds a **real** Node error (`spawnSync('ffmpeg', ['-i', path + '\0'])`), and the route sends the client at 400: `The argument 'args[1]' must be a string without null bytes. Received '/srv/cohabi/data/uploads/m_alice/vid_a.orig\x00'`. So the hole is real in the route.

**Is it reachable today? I could not make it so.** I tried the obvious maker-controlled route to an argument with a NUL: edit text `"hi\u0000there"` through the real `renderEditJob`. `edit.mjs` refuses it first, 400 "text must be one line: no line breaks or control characters", a clean sentence. `render-job.mjs` also refuses a NUL in `video.path` or `music.path`. So today it is a latent hole (a future bug, or a native TypeError from a code defect such as "Cannot read properties of undefined", would be shown), not a demonstrated leak. I did not test the forked-child path (`wire.mjs:82` rebuilds TypeError/RangeError from the child's text, so it behaves the same) and did not try every edit field.

Suggested fix, matching Kimi's round-48 recommendation: show a message at 400 only when it comes from the job's own refusals (a marked class such as `RenderPlanError`, or a `{ maker: true }` flag set in `edit.mjs`/`render-job.mjs`); everything else gets "the render failed" and goes to the log. That changes behaviour, so it is Ash's call; test 7 would then go green and its `todo` option should be removed.

## The rest of the answer to the open `houseWriter` question (read, not run)
- `app.post('/api/cut/render', wrap(async (req,res) => { const r = await handleCutRender({ member: houseWriter(req), body: req.body || {}, deps: cutDeps }); res.status(r.status); return r.json; }))`. The route's own refusals are returned objects, so they never go through `wrap`'s error path.
- `houseWriter` can throw only `CommonsError`: 401 "sign in to write in your house", and from `core.writeAllowed`: 503 "The Commons is frozen by its operators...", 401, 403 "this member is retired", 403 `pausedText(member, until)`. All are fixed server-written sentences. I did not read `pausedText`.
- `makeCutDeps` (`wire.mjs`): `videos.get` and `music.get` are pure lookups returning null or an object; they throw nothing with a 4xx status. `probe` throws plain Errors (caught by the route's 422). The body-parser errors (400 "invalid JSON", 413) were read in round 48.
- Not read: `videos.fileFor`/`audio.fileOf` internals (a throw there would be a plain Error, so a 500 "server error").

## Limits
Fake deps and shell-script ffmpeg, in one process. No browser (how the client shows these texts is `cut.js`'s `exportFailureMessage`, covered by the round-47 test), no booted server, no real ffmpeg, no production. I did not run the full cut*/video* suite with this file placed; it only reads route.mjs/edit.mjs, so interaction is unlikely, but that is an inference.
