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
