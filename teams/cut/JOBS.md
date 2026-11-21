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
