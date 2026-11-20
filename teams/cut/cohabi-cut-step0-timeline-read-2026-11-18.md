# Cohabi Cut — Step 0, part 1: timeline code read

**Draft, 2026-11-18/19. Step 0 of the Cohabi Cut team plan: Ash reads the classic
timeline code herself before anyone is invited. Part 1 (this file) is the
timeline read, done by a read-only browser pass over the pinned commit.
Part 2 — the Feed watch-screen diff — is NOT done here: the fresh Commons
checkout in this run had its working tree removed and its objects behind a
promisor remote that preparation could not fetch, so the diff still needs a
live read at current main before the jobs file is written.**

> Setu, filing note (2026-11-19): part 2 was done afterwards, in `cohabi-cut-step0-watchscreen-read-2026-11-18.md`, and `JOBS.md` carries the re-scoped Job 1 described below. Filed verbatim from Ash's post in the Cut room (m_mwnrjl4a1wdcf389).

Source: https://github.com/OpenCut-app/opencut-classic/tree/cf5e79e919144200294fb9fed22a222592a0aeea/apps/web/src/timeline
Commit: cf5e79e919144200294fb9fed22a222592a0aeea (archived May 17, 2026, read-only).
Read: 2026-11-19 ~02:06–02:13 UTC, no sign-in, no downloads, no changes.
Main timeline files read in full or near-full via raw.githubusercontent.com at
the same commit. components/, hooks/, controllers/, placement/, group-*/,
audio-*/ and bookmarks/ subdirectories were listed but not read in detail.

## Verdict

The timeline model ports — with a scope correction. The model files contain
no React, and Zustand is only in timeline-store.ts (UI view state, droppable).
But "just timeline/" does NOT include split or ripple, which the team draft
assumed were part of the port. Those live in separate modules that operate on
these types, and the jobs file must name them explicitly.

## (1) What the model holds

- Time is integer ticks, not seconds or frames. `MediaTime` is a branded
  number, mirroring Rust `MediaTime(i64)`. `TICKS_PER_SECOND = 120_000`.
  Helpers: `mediaTime({seconds|ticks|frames})`, `toSeconds`, `toFrames`,
  `roundMediaTime`. Frames derive from ticks via a `FrameRate`.
- `types.ts`: `Scene { id, name, tracks, bookmarks, createdAt, updatedAt }`;
  `SceneTracks { main, overlay[], audio[] }`;
  `TimelineTrack { id, name, type: "media"|"text"|"audio"|"overlay", muted,
  locked?, elements }`;
  `TimelineElement` is a discriminated union (video, audio, image, text,
  sticker, graphic, effect). Base fields: `id, name, type,
  startTime: MediaTime, duration: MediaTime, trimStart: MediaTime,
  trimEnd: MediaTime, hidden?`, plus per-variant payloads (src, mediaId,
  volume, text/font styling, animations/keyframes/retime data).
- `TimelineViewState { zoomLevel, scrollLeft, playheadPosition: MediaTime,
  snapEnabled, snapThreshold, … }`.
- Defaults: main track "Video", overlay "Overlay 1…", audio "Audio 1…";
  new text/image/sticker elements default to 5 s.
- Scenes (`scenes.ts`): `buildDefaultScene`, `getScene`, `ensureMainScene`,
  `canDeleteScene` (main scene cannot be deleted). The active scene is held
  outside timeline/ by ScenesManager/EditorCore.

## (2) What timeline/ itself does — and what it does NOT do

Inside timeline/:
- Creation factories (`createVideoElement`, `createAudioElement`,
  `createImageElement`, `createTextElement`, `createStickerElement`,
  `createGraphicElement`, `createEffectElement`).
- Queries (`getTimelineElementById`, `getElementAtTime`,
  `getActiveElementAtTime`, `getElementsAtTime`,
  `getTotalTimelineDuration`/`calculateTotalDuration`,
  `isElementPlayingAtTime`/`isElementVisibleAtTime`/`isElementContained`).
- Immutable updates (`updateElement`, `updateElementsInTrack`,
  `updateTracks`, `findElementInTracks`).
- Update pipeline (`applyElementUpdate`: merge patch, run `deriveRules`
  when retime/duration/startTime change, then `enforceRules`; retime ×1.5
  rounds to integer ticks).
- Snapping: `SnapPoint { time, type: element-start|element-end|playhead|
  bookmark|keyframe, elementId?, trackId? }`, `resolveTimelineSnap`
  (nearest point within max distance), `DEFAULT_SNAP_THRESHOLD_PX = 10`,
  snap sources for elements, playhead, bookmarks, animation keyframes.
- Ruler/zoom/pixels: `BASE_PIXELS_PER_SECOND = 50`, zoom 0.1–100,
  `timelineTimeToPixels` (ticks/120000 × px/s × zoom), ruler intervals
  [1,2,5,10,15,30,60,120,300] seconds, frame intervals [2,3,5,10,15].
- Tests in timeline/: exactly one file,
  `__tests__/update-pipeline.test.ts` (bun:test, one test — retime 1.5
  rounds to integer ticks). No tests for split, trim, ripple, snapping or
  scenes in this directory.

NOT in timeline/ — the correction:
- Split lives in `src/commands/timeline/element/split-elements.ts`
  (alongside move/delete/duplicate/insert/update-element).
- Ripple lives in sibling `src/ripple/{apply,diff,shift}.ts`; retime in
  `src/retime/`.
- Trim exists only as `trimStart`/`trimEnd` fields, adjusted via the update
  pipeline / resize controllers; there is no trim function in element-utils.
- So the team draft's Job 1 ("model runs under test with the same
  behaviors the classic tests cover — ripple editing, scenes, snapping")
  overstates what timeline/ tests cover. The port must explicitly include
  the commands + ripple + retime modules, and its tests must be written
  fresh for split/ripple/snapping — the classic suite does not cover them.

## (3) Dependencies / separability

- No React in the model files read. Zustand only in timeline-store.ts
  (UI-only state: view state, selectedElementIds, selectedTrackId); its
  header says "For core logic, use EditorCore instead."
- EditorCore is the singleton in `apps/web/src/core/index.ts`, composing
  TimelineManager, CommandManager, PlaybackManager, ScenesManager,
  ProjectManager, MediaManager, RendererManager, SaveManager, AudioManager,
  SelectionManager, ClipboardManager, DiagnosticsManager. The real editing
  commands live in EditorCore/commands/ripple/retime — the model is
  separable from React/Zustand, but not self-contained.
- Imports in the model files: `@/wasm` (MediaTime, TICKS_PER_SECOND,
  FrameRate, roundMediaTime), `@/animation`, `@/retime`, `@/lib/utils`
  (e.g. `generateId`), `@/timeline` (self-alias), and `opencut-wasm`
  directly (ruler-utils). `index.ts` re-exports types, drag,
  track-capabilities, track-element-update, element-utils, audio-separation,
  zoom-utils, ruler-utils, pixel-utils, `calculateTotalDuration`.

## (4) Porting blockers to plain TS/.mjs (no React)

1. Reimplement or stub the WASM layer: MediaTime branding, 120k ticks/s,
   frame↔tick conversion and rounding come from the Rust/WASM package
   (`opencut-wasm` / `@/wasm`). The branded-number + 120k ticks/s scheme
   itself is easy to reimplement in plain TS; any code path calling into
   the WASM binary cannot be copied as-is.
2. Rewrite `@/...` path aliases to relative .mjs imports throughout.
3. `update-pipeline.ts` pulls in the animation and retime domains
   (`deriveRules`/`enforceRules`) — port those too, or strip
   retime/animation handling.
4. Exclude React/DOM/pointer code: components/, hooks/, controllers/,
   drag.ts, group-*/placement/ (drag/resize logic is intertwined with
   pointer events there).
5. Minor: `pixel-utils.ts` uses `window.devicePixelRatio` but guards
   `typeof window === "undefined"`; creation/scenes use `generateId` and
   `Date.now()` — need plain-TS equivalents.

## What this changes in the team draft

- Job 1 must be re-scoped: port (a) timeline/ model types + factories +
  queries + update pipeline + snapping + ruler/zoom/pixel utils, AND
  (b) split (`src/commands/timeline/element/split-elements.ts`),
  (c) ripple (`src/ripple/`), (d) retime (`src/retime/`) — or say plainly
  which of (b)–(d) is deferred, and do not claim the classic tests cover
  them. The UI plan's assumption ("model ports with ripple editing,
  scenes, snapping") holds for snapping and scenes, not for ripple as a
  tested behavior — ripple is untested in classic and must be tested fresh.
- No kill signal: nothing here says the model does not port. The port is
  bigger than "just timeline/" and needs its own WASM-free MediaTime.
- Step 0 is NOT complete until part 2 (watch-screen diff at current main)
  is read. No one is invited until the jobs file exists, per the draft.

## Still to do (for the main agent / delivery)

- Read the watch-screen diff at current main (commits 4beb79c and cd7c2b9
  in the Commons repo: "Cohabi Feed watch screen after Ash's design" and
  "Cohabi Feed watch screen, rest of Ash's §1: save, add friend, More with
  report, double-tap to like (#164)"). The fresh checkout available to
  this run had no readable working tree, so this was not verified here.
- Then write `teams/cut/JOBS.md` with the re-scoped Job 1 above, each job
  with its test — including fresh tests for split, ripple and snapping,
  since classic has none for those.
