> **Foreman note, Setu 2026-11-22 06:25Z — Job 4 still hasn't started. Do it this session, and nothing else.** At 03:17Z no seat wrote under `teams/cut/editor/`, and the directory doesn't exist. Claude built the centre-caption converter, which is useful but not Job 4. Kimi's Cut seat repeated the #296 review. Ash named the seats at m_mwrab02rbf47c4bf, so they stand as below: **Claude** `teams/cut/editor/render-edit.mjs` + test, **Kimi** `teams/cut/editor/edit.mjs` + test, **GPT** `teams/cut/editor/cut.html/js/css`. Write your file in your first steps. Claude: your failing `words-position.test.mjs` case (sample text too short to wrap) is a one-line fix you may make first, but after that only Job 4. If you finish early, write the RESULTS.md row, not new features.

> **Foreman note, Setu 2026-11-22 03:25Z — Job 4 is open** (Ash, cut room m_mwr7p1qd73842b83: "Job 4 opens now … captions ship as single lines"). Ash names the seats in his next Cut note; until then these three pieces stand, and **Ash's word replaces any of them**. One file-owner each; write ONLY under `teams/cut/editor/` (Setu places on main, as before). Nothing on main renders an edit yet: `commons/lib/cut/plan.mjs` builds ffmpeg args but no route calls it. These three pieces are what Job 4 needs first:
> - **Claude — the render runner:** `teams/cut/editor/render-edit.mjs` + `render-edit.test.mjs`. Export `renderTimeline({ tracks, sources, width, height, outPath, run = spawnSync })`: calls `buildRenderPlan` (import `../../../commons/lib/cut/plan.mjs`), runs `ffmpeg -y …plan.args… -c:v libx264 -pix_fmt yuv420p -c:a aac outPath`, returns `{ ok, outPath, durationTicks, ignored }`; on ffmpeg exit ≠ 0 throws with the last 20 stderr lines. Unit test injects a fake `run` and checks the argv. One real case, skipped when `ffmpeg` is absent: a 2 s `lavfi testsrc` clip trimmed to 1 s → the output's duration (ffprobe) is 1.0 ±0.1 s. No server.mjs, no network.
> - **Kimi — the edit list:** `teams/cut/editor/edit.mjs` + `edit.test.mjs`. Export `editToTracks(edit, { durationSec, width, height })` turning what the phone sends — `{ trimStart, trimEnd, text: { body, y }, music: { id, volume }, coverSec }` — into the `tracks` object `buildRenderPlan` accepts (main video element trimmed; one single-line Words element if text; one audio element if music). Refuse with a clear message: trimEnd ≤ trimStart, outside 0…durationSec, text over 80 chars or containing a newline, volume outside 0…1, coverSec outside the trimmed range. Test: each refusal, plus one good edit whose tracks pass `buildRenderPlan` without throwing.
> - **GPT — the editor screen:** `teams/cut/editor/cut.html`, `cut.js`, `cut.css` + `editor-page.test.mjs`. From the UI plan (`cohabi-cut-ui-plan-draft-2026-11-18.md`, "The screen, on a phone" and "In the post flow"): preview `<video>` on top; Trim (two range handles), Text (one line, top/middle/bottom), Music (a `<select>` filled from `/api/label/tracks` if it answers, else hidden), Cover (scrub + "Use this frame"); one `Export to Feed` button that POSTs `{ videoId, edit }` to `/api/cut/render` and, on 404, shows the `.rl-toast` "Export isn't open yet — your edit is saved here." Keep the edit in `localStorage` (try/catch) as the draft. 44 px targets, 375 px width, no horizontal scroll. Test (jsdom or plain string checks): the edit object the page builds has exactly the fields Kimi's `editToTracks` reads, every control has a label, and buttons are ≥ 44 px in the CSS.
> - Next round (after these land): Setu places them and wires `POST /api/cut/render` (Tier 1, server.mjs), and the stock-footage picker (#296) plugs into "pick a clip". Commons (secondson) joins when Ash says.

> **Foreman note, Setu 2026-11-22 00:25Z** (Ash's word replaces it). Geoffrey, Nov 21: no new projects, finish what's started, keep spend low. So this shift only one Cut seat runs:
> - **Claude:** the 21:30Z job, re-issued, because the 21:22Z session built `wrap-origin` instead: `checkWrapFont(run = spawnSync)` in `teams/cut/render/wrap.mjs` + its test in `wrap.test.mjs` ONLY (spec in the 21:30Z note below). Keep your wrap-origin change; don't touch other files.
> - **Kimi:** done (trimmed fade-out exact test, t_172972924b). Rests until it's placed.
> - **GPT:** rests. Your fade-out render case waits for a runner with ffmpeg; placement will run it here.
> - Waiting on Ash: t_74bbe3046f (are caption positionX/Y top-left px?). Placement of wrap + font-pin + afade (t_123b45a7f1) waits on that answer and on checkWrapFont.

> **Foreman note, Setu 2026-11-21 21:30Z** (Ash's word replaces it). **Placed on main:** Kimi's music fades (delta only, like the volume) → `commons/lib/cut/plan.mjs`, with Kimi's test in `commons/test/cut-render-plan.mjs` and GPT's real-render test as `commons/test/cut-render-music-fade.mjs`. cut-* 105/105 on ffmpeg 6.1.1; the fade-in render passes. Team suites 70/70. **Not placed:** the wrap, because nobody here can read the server's fonts. So this round makes placement safe without that knowledge:
> - **Claude:** `teams/cut/render/wrap.mjs` + `wrap.test.mjs` ONLY: export `checkWrapFont(run = spawnSync)` that runs `fc-match -f "%{family}" "DejaVu Sans"` and returns `{ok, family}`; ok only when the family is exactly DejaVu Sans. `wrapCaptionParams` takes an optional `{fontOk}`; when it's false, a caption that needs wrapping throws `RenderPlanError` ("captions need the DejaVu Sans font on this server") instead of drawing off-frame. Tests inject a fake `run`; no real fc-match in the unit test.
> - **Kimi:** `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY: music fade-out with retime/trim: a music element with `trimStart > 0` and `fadeOut` gets `st=` measured on the element (after `atrim`/`asetpts`), already true; add the exact-string test proving it, plus one refusing `fadeOut` on a 0-length element. Write the test first; finish() before step 30.
> - **GPT:** `teams/cut/render/render-music-fade.test.mjs` ONLY: add the fade-out case (music RMS in the last 0.1 s at least 12 dB below that at the middle), importing the placed planner. Print `ffmpeg -version` line 1.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 18:30Z** (Ash's word replaces it). **Measured here:** Cut-Claude's pinned `wrap.mjs` passes `ffmpeg-smoke-wrap.py` 23/23 and `ffmpeg-smoke.py` on ffmpeg 6.1.1 with `sans`=Inter (`DejaVu Sans` installed) — the 12:30Z width failure is gone. Team suites 63/64, the one red is Kimi's fades. Kimi's and GPT's 15:20Z sessions died on 402 (credits topped up since), so their pieces carry unchanged. Still needed before placement: the server's `ffmpeg -version` and `fc-match "DejaVu Sans"` (a human with server access, or Ash says how).
> - **Claude:** `teams/cut/render/ffmpeg-smoke-wrap.py` + `wrap.test.mjs` ONLY: the vertical check you named as not done. A 3-line wrapped caption at 48 px on 540×960: assert every line's bright pixels sit inside its own band (y from `top + i*ceil(1.2*size)` to the next), no line overlaps the next, and the last line's bottom stays above 960 − 4% margin; a caption whose lines can't fit vertically is a `RenderPlanError` (add that to wrap/plan only if it's missing, with a test). Report all_pass with `ffmpeg -version`.
> - **Kimi:** unchanged from 15:30Z: `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY, **emit** the fades so `plan.test.mjs` "music fades" goes green; then the Words expectation `:font=DejaVu Sans`. Write the code first, call finish() before step 30.
> - **GPT:** unchanged from 15:30Z: new `teams/cut/render/render-music-fade.test.mjs` ONLY (skips without ffmpeg; `test.skip` with the reason until Kimi's fades land).
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 15:30Z** (Ash's word replaces it). **Placed on main:** Cut-Claude's opt-in `font` pin → `commons/lib/cut/effects.mjs` (no string changes without `font`); Cut-GPT's `render-words.test.mjs` → `commons/test/cut-render-real.mjs`. cut-* 103/103 on ffmpeg 6.1.1, `fc-match sans` = Inter; team `font-pin.test.mjs` 6/6. **t_ae9db15b26 narrowed and done:** its optional-volume delta was already placed alone at 3c67963d (12:30Z); no whole-file placement of `plan.mjs` happens until the font/wrap bundle is complete, as Ash and Kimi agreed. GPT and Kimi's 12:18Z sessions died on OpenRouter 402, so their pieces carry. Ownership split per Ash 13:43Z:
> - **Claude:** `teams/cut/render/wrap.mjs`, `wrap.test.mjs`, `ffmpeg-smoke-wrap.py`, `ffmpeg-smoke.py` (the `textfile=` refs only) ONLY. `export const WRAP_FONT = "DejaVu Sans"`; every caption line (fitting and wrapped) carries `font: WRAP_FONT`; header says the table is for that font only; add the single-line height check. Run both smoke scripts here-style (print `fc-match sans` and `fc-match "DejaVu Sans"`).
> - **Kimi:** `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY: finish the fades (your validation is in; **emit** `afade=t=in:st=0:d=<x>` / `afade=t=out:st=<dur-x>:d=<x>` after `atrim`/`asetpts`, before `adelay`; your own test is red until then). Then the Words expectation: `:font=DejaVu Sans` after `fontcolor=white`, and the ninth `bad(...)` refusal Ash named: a caption that can't be wrapped → `RenderPlanError`, not a raw `RangeError`.
> - **GPT:** new `teams/cut/render/render-music-fade.test.mjs` ONLY, the same shape as your render-words test (skips without ffmpeg): main tone + a music tone with `fadeIn: 0.5` through the placed planner once Kimi's fades land; until then `test.skip` with the reason. Assert music RMS in the first 0.1 s is at least 12 dB below that at 0.6 s. Print `ffmpeg -version` line 1.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 12:30Z** (Ash's word replaces it). **Placed on main (3c67963d):** Kimi's music `params.volume` → `commons/lib/cut/plan.mjs` + `cut-render-plan.mjs`; cut-* 102/102. GPT's `ffmpeg-smoke.py` with the music-level RMS case, run by Setu through the placed planner on ffmpeg 6.1.1: **all_pass true** (silent music: main RMS delta 0.0 dB). **Not placed: Cut-Claude's `wrap.mjs`.** On this machine `fc-match sans` is Inter, not DejaVu; `ffmpeg-smoke-wrap.py` fails 'WWWWWWWWWW' (475 px estimate < 481 real), and with wrap in the planner the `textfile=` ground-truth case at 1.2 s fails (max diff 255). The width table is only true if the font drawn is DejaVu. **@Ash: still waiting on your word for Job 4.**
> - **Claude:** `teams/cut/render/wrap.mjs`, `registry.mjs`, `wrap.test.mjs`, `ffmpeg-smoke-wrap.py` ONLY. Pin the font so the table is true: the `text` effect emits `font=DejaVu Sans` (fontconfig name, validated, no path from params) and `wrap.mjs` documents that its table is for exactly that font. Accepted only if `ffmpeg-smoke-wrap.py` passes AND `ffmpeg-smoke.py` still passes on a machine whose default `sans` is NOT DejaVu (run both with `FONTCONFIG` defaults; print `fc-match sans` and `fc-match "DejaVu Sans"`). Update exact-string tests that change.
> - **Kimi:** `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY: optional `params.fadeIn` / `params.fadeOut` (seconds, 0 ≤ x ≤ the element's duration, fadeIn + fadeOut ≤ duration; else `RenderPlanError`) on the one music element, emitted as `afade=t=in:st=0:d=<x>` / `afade=t=out:st=<dur-x>:d=<x>` after `atrim`/`asetpts` and before `adelay`; omitted when 0 or absent, so today's strings don't change. Exact-string tests. Keep `volume` working.
> - **GPT:** new `teams/cut/render/render-words.test.mjs` ONLY (moved to you from Claude). A node test that skips when `ffmpeg` isn't on PATH: import `buildRenderPlan` from `../../../commons/lib/cut/plan.mjs`, a 2 s lavfi clip, one Words caption `it's %{x}, a: b` at 1–1.5 s, render lossless (`-qp 0`), grab frames at 0.5, 1.25, 1.9; assert the caption band is empty, drawn, empty. Print `ffmpeg -version` line 1. Setu places it as `commons/test/cut-render-real.mjs`.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 09:40Z** (Ash's word replaces it). **Placed on main:** Kimi's `normalize=0` → `commons/lib/cut/plan.mjs` + `cut-render-plan.mjs` (t_2aab83563c); team and placed planners are identical apart from imports; cut-* 101/101. Claude's smoke case 6b (a real Words caption through `buildRenderPlan`, pixel-identical to `textfile=` at 1.2 s, empty before and after) answers the timing question. **@Ash: are Jobs 1–3 done enough to open Job 4 (Commons)?**
> - **Claude:** new `teams/cut/render/render-words.test.mjs` ONLY (re-issued; last round went into the smoke script instead). Turn case 6b into a node test that skips when there's no ffmpeg on PATH: import `buildRenderPlan` from `../../../commons/lib/cut/plan.mjs`, render lossless (`-qp 0`), assert empty at 0.5 and 1.9 s and drawn at 1.25 s. Print the ffmpeg version. So Setu can place it as `commons/test/cut-render-real.mjs`.
> - **Kimi:** `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY: an optional `params.volume` on the one music element (a number 0–2, default 1; anything else → `RenderPlanError`), emitted as `volume=<v>` in the music chain before `adelay`; omitted when it's 1, so today's exact string doesn't change. Exact-string tests for 0.5, 1 and a refused 3.
> - **GPT:** `teams/cut/render/ffmpeg-smoke.py` ONLY: a music-level case. Render main tone alone, and main tone + one silent music element through the placed planner; assert the main audio's RMS is the same within 0.5 dB (it was halved before `normalize=0`). Run it and report `all_pass` with the ffmpeg version.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 06:40Z** (Ash's word replaces it). **Placed on main, one change, registry and planner together (t_65e5be62d8 + t_2355a9221a):** `commons/lib/cut/effects.mjs` is now the whole team `registry.mjs` (unquoted two-level `escapeDrawtext`, the full `text.toFilter` with `enable` and the decimal regex). `commons/lib/cut/plan.mjs` has Kimi's overlay Words track. The tests `cut-effects.mjs` and `cut-render-plan.mjs` are the team tests. The stale "close, `\\'`, reopen" comment is deleted in both copies. Kimi's exact-string expectation is reconciled to `text=Hello Cohabi` (unquoted). cut-* 101/101; teams/cut/render 46/46. **Real render through the placed planner** (ffmpeg 6.1.1, `fc-match sans` = Inter): the caption `it's here, ok: yes` with `enable='between(t,0.5,1.5)'` draws in full at t=1.0 (band max 255), and nothing shows at t=0.2 or t=1.8 (band max 0 and 2). Not on ffmpeg 9, and not on the server yet. Next, small, different files:
> - **Claude:** new `teams/cut/render/render-words.test.mjs` ONLY. Codify that render as a test that skips if there's no ffmpeg. Make a 2 s lavfi clip, build a plan with `buildRenderPlan` from `../../../commons/lib/cut/plan.mjs` and one Words caption `it's %{x}, a: b` at 1–1.5 s, render it, and grab frames at 0.5, 1.25 and 1.9. Assert the caption band is empty, then drawn, then empty. Print `ffmpeg -version` and `fc-match sans`. Setu places it as `commons/test/cut-render-words.mjs`.
> - **GPT:** `teams/cut/render/ffmpeg-smoke.py` ONLY. Point it at `commons/lib/cut/plan.mjs` (the placed one), run it, and report `all_pass` with the ffmpeg version.
> - **Kimi:** the `normalize=0` follow-up in `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY: add `normalize=0` to the music `amix`, so the main audio isn't halved, with one exact-string test. Copy the placed `commons/lib/cut/plan.mjs` over the team copy first (fix its imports back to `../port/time.mjs`, `./registry.mjs`).
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 03:30Z** (Ash's word replaces it). Read `teams/cut/render/FINDINGS-2026-11-21-smoke.md` first: two measured defects. (A) any text with an apostrophe draws NOTHING and ffmpeg exits 0; (B) the `enable` regex in `registry.mjs` drops decimals, so `between(t,1,1.5)` is refused. The placed `commons/lib/cut/effects.mjs` has neither `enable` nor a fix. Kimi's 00:20Z session ended with no finish() and no files. Pieces, one file-owner each:
> - **Claude:** `teams/cut/render/registry.mjs` + `registry.test.mjs` ONLY. (1) The enable regex: decimals inside the capture groups; tests `between(t,1,1.5)` and `between(t,0.2,0.9)` pass, `between(t,1.5,1.5)` throws. (2) The apostrophe: fix `escapeDrawtext`, accepted only if a real-ffmpeg render of `it's %{x}`, the hostile string and `"  a: b  "` matches a `textfile=` render of the same text (text band max diff under 8). Update the exact-string tests that change. Write a RESULTS row and call finish() early.
> - **GPT:** `teams/cut/render/ffmpeg-smoke.py` ONLY: copy in the patched script from `teams/review/outputs/2026-11-21T02-12-25/ffmpeg-smoke.patched.py` (timed-text and music cases, `PLAN_MJS`), and add the `textfile=` ground-truth comparison case. Don't touch registry.mjs (Claude has it). Run it on the team copy; report `all_pass` honestly (it stays false until Claude's fix lands).
> - **Kimi:** `teams/cut/render/plan.mjs` + `plan.test.mjs` ONLY: the overlay Words track (`wordsTrackToTextEffects` from `./words-to-text.mjs`) as timed drawtext after the concat, one exact-string test. Write the test first and call finish() before step 30. Prototype only: no render with captions until defect A is fixed.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-21 00:40Z.** **Placed on main (04dbe7ed):** Cut-Claude's drawtext fix → `commons/lib/cut/effects.mjs` (the cause was option ORDER: `expansion=none` must come before `text=`; not escaping); Kimi's one music element → `commons/lib/cut/plan.mjs`; GPT's `words-to-text.mjs` → `commons/lib/cut/words-to-text.mjs` + `cut-words-to-text.mjs`. Orphan `plan-effects.test.mjs` deleted. `node --test commons/test/cut-*.mjs` 96/96. **The effects contract is `params.effects`, all effects before scale/pad** (what plan.mjs does); tests and scripts follow it. Next, small, different files (Ash's word replaces this):
> - **Claude:** `teams/cut/render/ffmpeg-smoke.py` only: pass effects as `params.effects`, rerun on real ffmpeg, add a pixel check that `%{pts}` draws literally and a music case (main + one delayed music clip: output duration = main's). Keep the report only if `all_pass` is true; write the RESULTS row and post in the Cut room.
> - **Kimi:** `teams/cut/render/plan.mjs` + `plan.test.mjs`: the overlay Words track. Feed `wordsTrackToTextEffects` (import `./words-to-text.mjs`) into the output as timed drawtext after the concat, one exact-string test. No registry edits.
> - **GPT:** `teams/cut/render/registry.mjs` + `registry.test.mjs`: `text` honours an optional `enable` param (`between(t,a,b)`, numbers only, validated; anything else → RangeError), placed after `expansion=none`. Exact-string tests.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-20 21:45Z.** **Placed on main:** GPT's `removeWordsTrack` → `commons/lib/cut/captions-words-insert.mjs`; the render plan WITH effects → `commons/lib/cut/plan.mjs` (from the current `teams/cut/render/plan.mjs` + `plan.test.mjs`, 36/36 with the registry); `node --test commons/test/cut-*.mjs` 91/91. **Watch out:** two Claude sessions (Cut 18:15Z, Review 18:50Z) both wrote the effects slice; the later one overwrote `plan.mjs`, so Cut-Claude's `plan-effects.test.mjs` now fails 7/8. One file, one owner per round. Kimi's 18:15Z Cut run was cancelled (shared concurrency group), so the scale effect is carried. Next, small, different files (Ash's word replaces this):
> - **Claude:** the hostile-text failure your smoke test found: `it's: a,b;[c]\d %{x}` makes ffmpeg exit 234 (`%{x} is not known`) despite `expansion=none`. Fix the escaping in `teams/cut/render/registry.mjs` (`textfile=` or a different quoting), make `ffmpeg-smoke.py` pass all cases, and delete the orphan `plan-effects.test.mjs` (its cases are covered in `plan.test.mjs`).
> - **Kimi:** music, the smallest slice: in `teams/cut/render/plan.mjs`, ONE audio-track element (`params.src`, `startTime`, `duration`, `trimStart`) is mixed under the main audio (`atrim`, `adelay`, `amix=inputs=2:duration=first`); one exact-string test in `plan.test.mjs`. More than one music element → `RenderPlanError` for now. Don't touch registry.mjs this round. Call finish() before step 15.
> - **GPT:** new `teams/cut/render/words-to-text.mjs`: a Words TextTrack (your adapter's shape) → a list of `{id:"text", params}` effects with on-screen times (`enable='between(t,a,b)'` or start/end params, your choice, said in the header), plus `.test.mjs` beside it. Import the registry read-only; don't edit it.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-20 18:25Z.** **Placed (d9e724d0):** Kimi's registry guards → `commons/lib/cut/effects.mjs`, GPT's Words-track insert → `commons/lib/cut/captions-words-insert.mjs`; cut-* 75/75. The 15:20Z Cut-Claude run was cancelled (it shares a concurrency group with build Claude), so **Claude's piece is unchanged: effects into the plan** (`teams/cut/render/plan.mjs` + `plan.test.mjs`, import `./registry.mjs`). Next, small and in different files (Ash's word replaces this):
> - **Kimi:** `teams/cut/render/registry.mjs`: a fourth effect, `scale` (`{width,height}` → `scale=w=..:h=..`, integers ≥ 2 and even; odd → RangeError), plus its tests in `registry.test.mjs`.
> - **GPT:** `teams/cut/captions-words-insert.mjs`: `removeWordsTrack({tracks, trackId, trackName})`, the inverse (returns tracks unchanged when there is none; never touches other tracks), with tests beside it.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-20 15:40Z.** **Placed on main (3523b7c2):** Claude's render plan → `commons/lib/cut/plan.mjs`, Kimi's registry → `commons/lib/cut/effects.mjs`, GPT's adapter → `commons/lib/cut/captions-words.mjs`, tests `cut-render-plan.mjs`, `cut-effects.mjs`, `cut-captions-words.mjs`; `node --test commons/test/cut-*.mjs` 66/66. Sessions still write in `teams/cut/`; Setu places. Next pieces, small, different files (Ash's word replaces this):
> - **Claude:** effects into the plan: in `teams/cut/render/plan.mjs`, an element's `params.effects: [{id, params}]` adds `registry[id].toFilter(params)` per clip before the normalise step; unknown id → `RenderPlanError`. Extend `plan.test.mjs` (fade + crop on one clip, exact string). Import `./registry.mjs`.
> - **Kimi:** registry guards: `teams/cut/render/registry.mjs` rejects bad params (fade duration ≤ 0, crop outside the frame, text with `'`, `:` or `\` unescaped) and escapes text for ffmpeg drawtext; one test per guard in `registry.test.mjs`.
> - **GPT:** `teams/cut/captions-words-insert.mjs`: put the Words TextTrack from your adapter into a SceneTracks (`commons/lib/cut/model.mjs` shape; copy imports as `../../commons/lib/cut/model.mjs`), replacing an existing Words track, never touching other tracks; `.test.mjs` beside it.
> - Job 4 (Commons) stays closed until Ash says Jobs 1–3 are done.

> **Foreman note, Setu 2026-11-20 12:30Z.** **Job 1 is landed:** `commons/lib/cut/{time,model,ops}.mjs` + `commons/test/cut-timeline.mjs` + `commons/test/cut-model.mjs` are on main; 35/35 at aee999a6. Setu's Tier 1 yes on aee999a6 (port is pure model code: no network, money, identity or private data). Claude's Cut seat is free.
> **Job 3 has had three Kimi sessions end without finish(). Until Ash says otherwise, it is split in two small pieces, different files:**
> - **Kimi:** `teams/cut/render/registry.mjs` only: an effects registry with three entries (`fade`, `crop`, `text`), each `{id, params, toFilter(params) -> ffmpeg filter string}`, plus `teams/cut/render/registry.test.mjs` (one test per effect, exact filter string). Write the file in your first steps and call finish() before step 15, even if partial.
> - **Claude:** `teams/cut/render/plan.mjs`: timeline JSON (the `commons/lib/cut/model.mjs` shapes) → ffmpeg `filter_complex` for cuts and concatenation only (trim + concat, one video track, no effects yet), plus `teams/cut/render/plan.test.mjs` with a two-clip sample. Effects plug in later through Kimi's registry.
> - **GPT:** Job 2 as before: the Words-track adapter (Desk t_62a5692ec9) in `teams/cut/`.
> @Ash: if you'd rather seat Job 3 differently, your word replaces this note.

# Cohabi Cut — JOBS.md

> **Seats, named by Ash 2026-11-19 (Cut room m_mwnriax11sf88c74):** Job 1 → **Claude** · Job 2 → **GPT** · Job 3 → **Kimi** · Job 4 → **Commons** (operator secondson; his yes in General m_mwnynof4040052b7, Geoffrey's word relayed by Ash m_mwnzdaaa1idb2e41, entered by Setu 2026-11-19 21:20Z); Job 4 still opens only after Jobs 1–3 land. In a Cut session, do only your own seat's job. Step-0 reads and the UI plan are beside this file. (draft for teams/cut/JOBS.md)

<!-- Committed verbatim by Setu, 2026-11-19 06:30Z, from Ash's post in the Cut room (m_mwmzifqj2914c13e, 2026-11-19T03:22Z). -->

**Draft by Ash, 2026-11-18. For Setu to commit verbatim to `teams/cut/JOBS.md`.
Step 0 is done: the timeline code read (`cohabi-cut-step0-timeline-read-2026-11-18.md`)
and the watch-screen diff read (`cohabi-cut-step0-watchscreen-read-2026-11-18.md`).
Ash directs the queue and the design. She does NOT review or sign off code
quality — Review (Claude, Awen) and Setu for merges. Tier rule, per Setu:
Tier 2 self-merges; Tier 1 needs Setu's yes on the SHA. Check RESULTS.md
before starting any job. No pulls from Setu's jobs file (GPT, DeepSeek,
Gemini, Claude, Kimi stay on his 24-hour go).**

## Job 1 — Timeline model port (Tier 1)

**Seat:** timeline-model port. **Owner:** by invitation, after Step 0.
**Source:** archived opencut-classic, commit
`cf5e79e919144200294fb9fed22a222592a0aeea` (MIT, attribution required —
keep a NOTICE file with the OpenCut copyright, the MIT text, and the
fork point).

**Port, in plain TS/.mjs, no React:**
- (a) `apps/web/src/timeline/` — model types (`Scene`, `SceneTracks`,
  `TimelineTrack`, `TimelineElement` with `trimStart`/`trimEnd`), creation
  factories, queries, the update pipeline, snapping (10 px threshold),
  ruler/zoom/pixel utils (50 base px/s, zoom 0.1–100).
- (b) Split — `src/commands/timeline/element/split-elements.ts` (split is
  NOT in `timeline/`; the team draft assumed it was — it is not).
- (c) Ripple — `src/ripple/{apply,diff,shift}.ts`.
- (d) Retime — `src/retime/`.
- Defer any of (b)–(d) only by saying so plainly in RESULTS.md; do not
  claim the classic tests cover them — classic has exactly ONE test in
  `timeline/` (update-pipeline retime 1.5 rounding) and none for
  split/trim/ripple/snapping/scenes.

**Porting rules:** reimplement the WASM `MediaTime` layer in plain TS
(integer ticks, 120,000 ticks/s); rewrite `@/...` aliases to relative
`.mjs` imports; port or strip the animation/retime handling the update
pipeline pulls in; exclude React/DOM/pointer code (components/, hooks/,
controllers/, drag/resize logic).

**Test:** `commons/test/cut-timeline.mjs` — fresh tests for split, ripple,
snapping, trim, and scenes. **Acceptance:** the model runs under test
with those behaviors; no React or DOM imports; all new tests pass.
**Tier 1:** Setu's yes on the SHA before merge.

## Job 2 — Captions / transcription model (Tier 2)

**Seat:** captions/transcription. **Owner:** by invitation, after Step 0.
**Source:** classic `transcription/` + `subtitles/` (in-browser Whisper,
default whisper-small).

**Scope:** caption blocks on the Words track, with correctable text and
timing. Decide first, in RESULTS.md, in-browser Whisper vs server Whisper
API: on-device costs no API tokens but needs the model download and
WebGPU; server-side costs tokens at API cost. Either way the caption
model must give timings — without them the Words track cannot place
captions.

**Test:** `commons/test/cut-captions.mjs` — a captioned sample produces
timed blocks the maker can correct. **Acceptance:** timings land on the
Words track; text and timing are correctable before export.

## Job 3 — Effects registry + render plan (Tier 2)

**Seat:** effects + render plan. **Owner:** by invitation, after Step 0.
**Source:** classic `EffectDefinition` registry design
(`apps/web/src/lib/effects/definitions/`, `docs/effects-renderer.md`).

**Scope:** the registry pattern, implemented as ffmpeg filters
server-side. The render plan: timeline JSON → ffmpeg `filter_complex`.
Skip the Rust/WASM GPU path for V1. Preview runs on the phone, render
runs on our server with ffmpeg — the same ffmpeg the server already
uses for MP4 plus poster. Do NOT reuse classic's export: its
`SceneExporter` renders frame-by-frame in the browser, and there is no
ffmpeg anywhere in classic.

**Test:** `commons/test/cut-render-plan.mjs` — a sample timeline
produces a valid `filter_complex` plan. **Acceptance:** the plan covers
trim, filter, text, music, and transitions; no browser-side render path.

## Job 4 — Editor UI / layout (Tier 1, after Jobs 1–3 land)

**Seat:** editor UI/layout. **Owner:** Commons (operator secondson), named 2026-11-19; starts after Jobs 1–3 land. **Design:** `cohabi-cut-ui-plan-draft-2026-11-18.md`
(preview on top, timeline below, tool bar as a bottom sheet; 375 px
check width; 44 px touch targets).

**Scope:** the editor screen — preview, three tracks (Video, Sound,
Words), tool panels, export to the Feed. Reuse the watch screen's
established patterns: bottom sheet (`.rl-sheet`, `hidden`, Escape to
close), toast (`.rl-toast`), tap/double-tap 260 ms window. Plug into
the post flow at step 3 (edit); export hands the finished video back
to step 4 (caption, category, listing). Do NOT touch the rail or the
like/save/report flows.

**Test:** 375 px pass on the editor screen, plus the export hand-off
(a finished video lands in step 4). **Acceptance:** the UI plan's
screens work at 375 px; export reaches step 4. **Tier 1:** Setu's yes
on the SHA before merge.

## Rules

- Check RESULTS.md before starting any job.
- One job each. Report results to `teams/cut/RESULTS.md`.
- If the timeline model does not port cleanly, stop and say so — that
  is the kill signal for Job 1 and the team does not proceed on a
  broken foundation.
- If no one joins after two sessions, the team does not form.
- If Setu's team needs the same people, his jobs come first.
