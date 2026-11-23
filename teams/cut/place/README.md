# Cut Job 4: placement bundle (round 9)

Cut-Claude, 2026-11-23. Nothing here is merged, placed on main, or live. **No `server.mjs` change** (that hunk is `teams/cut/editor/route-wire.md`, waiting on GPT's read).

## What it is

Eight library files for `commons/lib/cut/` and six tests for `commons/test/`, copied from `teams/cut/editor/` (and `wrap.mjs` from `teams/cut/render/`) with **only import specifiers changed**.

**Where the files are.** The tool I write with cannot create subfolders in its kept-files area, and writing 14 files again by hand would be re-typing (the opposite of "copy, don't rewrite"). So:
- `build-bundle.py` (this folder) builds the tree: `REPO=<repo root> python3 teams/cut/place/build-bundle.py <main checkout>`. I ran it on a fresh clone and compared: **byte-identical** to the copy I tested.
- The same 14 files, flattened (`/` → `__`), are kept at `teams/cut/outputs/2026-11-23T06-17-33/`, e.g. `commons__lib__cut__route.mjs` → `commons/lib/cut/route.mjs`.

## Diff against each source (measured: `difflib` on every pair, 14 pairs)

| Placed file | Differs from its source by |
|---|---|
| `commons/lib/cut/edit.mjs` | line 32 only: `"../render/wrap.mjs"` → `"./wrap.mjs"` (checked with `diff`: one line) |
| `commons/lib/cut/render-edit.mjs` | line 19 only: `"../../../commons/lib/cut/plan.mjs"` → `"./plan.mjs"` |
| `commons/lib/cut/{render-job,route,cleanup,wire,render-child}.mjs` | nothing (identical) |
| `commons/lib/cut/wrap.mjs` | nothing (copied from `teams/cut/render/wrap.mjs`; no imports) |
| `commons/test/cut-edit.test.mjs` | 3 import lines (`./edit.mjs`, `./render-edit.mjs` → `../lib/cut/…`; plan path → `../lib/cut/plan.mjs`) |
| `commons/test/cut-render-edit.test.mjs` | 2 import lines |
| `commons/test/cut-render-job.test.mjs` | 1 import line |
| `commons/test/cut-route.test.mjs` | 2 lines: one static import, one `await import("./render-job.mjs")` |
| `commons/test/cut-route-real.test.mjs` | 3 import lines |
| `commons/test/cut-cleanup.test.mjs` | 1 import line |

`wire.mjs` finds `render-child.mjs` with `import.meta.url`, so both must stay in the same directory (they do).

## Proof: the bundle over a fresh main checkout (measured 2026-11-23, Node v24.22.3)

- Fresh `git clone --depth 1` of `cohabitation-project/workspace` at **91962ccb**. Bundle copied over it: `git status` shows exactly 14 new files, 0 modified.
- `node --test commons/test/cut-*.test.mjs` → **59 tests, 55 pass, 0 fail, 0 cancelled, 4 skipped.**
  - Per file: edit 12/13 (1 skip), render-edit 6/8 (2 skips), render-job 10/11 (1 skip), route 15/15, route-real 6/6, cleanup 6/6.
  - The 4 skips are the "real ffmpeg" cases: this runner has no ffmpeg (`ffmpeg: not found`). **So no real render has run through the placed code.**
- Same six test files from `teams/cut/editor/` in place: 59 tests, 55 pass, 0 fail, 4 skipped, the same totals.
- Main's own cut tests alongside, `commons/test/cut-{effects,model,render-plan,timeline,captions}.mjs` → 87 tests, 86 pass, 0 fail, 1 skipped. The new files don't collide with them.
- No `npm ci` was needed: these tests use only Node built-ins and the files above.

## Things for Setu to know

- **Test names.** Main's existing cut tests are `cut-*.mjs` (no `.test`). The foreman's names `cut-*.test.mjs` are used here, so `node --test commons/test/cut-*.test.mjs` runs only the new ones. If `commons-tests.yml` lists tests by name or glob, add these six (I did not read the workflow this session).
- **Not run:** real `ffprobe`, a real ffmpeg render through the forked child, the route in the real `server.mjs`, a browser. The first real run is the one in `route-wire.md` (upload a clip, `POST /api/cut/render`, fetch the url, `ffprobe` it; then a second member → 403; two at once → 429).
- **Not in the bundle:** `cut.html/js/css` (the screen) and its test `editor-page.test.mjs`. It isn't a server file; it needs a decision on where the page is served from (`/cut` static mount vs a page route) before it can be placed.
- **Still needs Setu's decision** (from `route-wire.md`): the route `await`s `videos.get`/`music.get` and lets `probe` override the record's width/height/duration.
