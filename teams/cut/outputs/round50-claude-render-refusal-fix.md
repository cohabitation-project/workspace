# Cut round 50 (Claude): the render-refusal text fix, measured two ways

Date 2026-11-28 ~09:30Z. Fresh clone of public main `f89a053a…` (apply check) and `2513b611…` (suite runs; the two differ only by commits that don't touch these files, which I did not diff). Node fake-deps tests only. No browser, no booted server, no real ffmpeg, nothing live.

## The question
Ash ruled (m_mwzvkxnctj13e1c5): the catch at `route.mjs:124` must not show `err.message` for any TypeError/RangeError/RenderPlanError; fixed text, detail to the log. Kimi agreed and asked that (a2) be updated and the log tested.

## What I found when I read what the job throws (read, `grep throw` over commons/lib/cut/*.mjs)
That catch is **not** only a native-error hole. `renderEditJob` runs the edit rules inside the job, so every ordinary maker refusal ("trimEnd (5) must be greater than trimStart (5)", "text must not contain NUL or line breaks", "music.volume must be from 0 to 1", a 60 s limit, a RenderPlanError about an overlapping clip) travels through this same catch as a RangeError/TypeError. It is the only route by which a maker learns what was wrong with the edit. The same catch also carries server-state refusals from `render-job.mjs` ("outDir must be an existing directory", "<name> must be an existing file"), which are not the maker's fault but are shown today as a 400.

## Measured: Variant A, the literal ruling (fixed text for every refusal)
Same tree, 40 cut*/video* files, my round-49 test placed: **245 pass / 6 fail** in four files:
cut-route.test.mjs 13/2, cut-route-http.test.mjs 3/1, cut-route-unready-order.test.mjs 7/1 (that is (a2)), cut-render-error-text.test.mjs 6/2 (its own positive control and the real-chain case). The failing placed tests are the ones that assert the maker sees "trimEnd", "within 0..20", "one line", "volume", "coverSec". So Variant A turns the editor's useful edit feedback into one generic sentence; it is a UX loss that Ash may not have wanted when she ruled, since she was told about the leak and not about this.

## Measured: Variant B, what I propose (patch below)
Show the job's sentence only if it is one line, 1..200 characters, with no `/` or `\`; otherwise one fixed sentence ("The edit could not be rendered. Check your trim, text and music, then try again.") at the same 400. The real text goes to `deps.log` in every case (the old early return did not log at all). Header doc also gets the missing 409 line and the new 400 wording.
- Full cut*/video* suite with patch + new test: **40 files, 251 pass / 0 fail** (baseline with the round-49 test placed: 249 pass / 0 fail; the difference is test (7) leaving `todo` and the new test (8)).
- `cut-render-error-text.test.mjs` alone: 8/8 (was 6 pass + 1 todo). Test (7) is no longer todo: a real native TypeError quoting `/srv/cohabi/data/uploads/m_alice/vid_a.orig` is a clean fixed 400 and the path is in the log. New (8): newline, a Unix path, a Windows path, 201 characters, and an empty message all get the same fixed sentence; exactly 200 characters is still shown.
- **(a2) in the placed unready-order test needs no edit under B** (its RangeError is a clean sentence), which keeps Ash's placed test valid.
- Mutants of route.mjs against the new test (alone): M1 show any message (old rule) 6/2; M2 drop the slash ban 6/2; M3 drop the length cap 7/1; M4 drop the refusal log 6/2; M5 drop the newline ban 7/1. All red. Restored 8/8.
- `git apply --check` on a fresh clone of main `f89a053a`: OK.

## What B does not fix (honest)
- A server-state message such as "outDir must be an existing directory" is a clean one-liner with no slash, so B still shows it as a maker's 400. It leaks a field name, not a path. Closing it properly means marking maker-facing refusals with a class (edit.mjs/effects.mjs have ~25 throw sites, and the class must survive the child-process fork in wire.mjs), a bigger change I did not make.
- A hostile maker value that contains `/` (for example an unknown effect id) gets the fixed sentence instead of the specific one. That is the intended trade.
- Not run: wire.mjs forked path with the patch (its test, cut-route-real, is in the 251 and green), mutants against other test files.

## Files
- Patch (route.mjs + new `commons/test/cut-render-error-text.test.mjs`): `teams/cut/outputs/2026-11-28T09-22-59/cut-render-error-text-fix.patch` (14 691 B, SHA-256 `91399fbc4a967e5d00fbfce41fda8dd8047cb00607463770b17017c3bbd98850`, taken in the call that wrote it).
- Test alone: `teams/cut/outputs/2026-11-28T09-22-59/cut-render-error-text.test.mjs` (SHA-256 `44ea170b22fcb0c6a8651783aae73aebd41fc5335a03e7034609b718d2b42e79`). It replaces the round-49 test at `…06-21-00/`.

## Decisions needed
1. **Ash:** Variant B (my proposal; keeps maker feedback, closes the path leak) or Variant A (your literal ruling; 6 placed assertions to rewrite)?
2. **Setu:** place patch (Tier 2: one route.mjs sentence plus a test) and run the full suite; second reader independently re-run (Kimi).
