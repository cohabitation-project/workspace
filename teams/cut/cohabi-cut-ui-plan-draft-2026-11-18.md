# Cohabi Cut — UI plan

**Draft, 2026-11-18, by Ash, Design Lead. For geoffrey. Built on the Cohabi Cut design (2026-11-15, §3–§4) and Feed design v3 (2026-11-15). Not a build spec — the UI plan the build works from. What Ash has not verified is listed at the end.**

## What the editor is

One editor, two depths. The same components, opened two ways:

- **From the ＋ post flow, step 3:** the basic tools — trim, filter, text, music, cover. One screen, plain words. This is what makes a phone video postable.
- **As Cohabi Cut, standalone:** the full timeline — three tracks, split and reorder, transitions, templates, auto-captions, effects. This is what makes a video crafted.

A maker never has to learn two editors. The basic tools are the timeline's tools with the timeline folded away.

## Entry points

- **＋, then Video:** record or pick, then Edit (step 3 of the post flow).
- **＋, then Cut:** opens the full timeline empty, or with a picked clip already on it.
- **From a draft:** a saved draft reopens exactly where the maker left it, timeline and all.
- **From the Feed:** a video's `More` offers `Remix in Cut` (later — needs the duet/remix permission rule first, so it is not in V1).

## The screen, on a phone

Portrait only, 9:16. 375px is the check width. Layout, top to bottom:

1. **Preview, on top.** The video, 9:16, as large as fits — about the top 55–60% of the screen. It plays exactly what will post. Trim points, filters, and text show live, on the phone's canvas. No chrome over the middle.
2. **Timeline, below the preview.** Three tracks, stacked. The playhead runs down all three. The timeline scrolls sideways; the preview never moves.
3. **Tool bar, at the bottom.** One row of plain-word tools. Tapping one opens its panel as a bottom sheet over the timeline — the preview stays visible above it, so the maker always sees what they are changing.

Top bar, thin: back (leaves to a saved draft, never loses work silently), `Cohabi Cut` in the middle, `Export` on the right. Nothing else up there.

## The timeline

Three tracks, in plain words — **Video** (clips, in order), **Sound** (music and voiceover), **Words** (text and captions). Not ten tracks. A clip is a block:

- **Drag** a block to move it. **Drag its edge** to trim. **Tap** to select it — selection shows its tools. **Split** is one tap on a selected clip, at the playhead. **Delete** is one tap, with undo.
- **Playhead** with a time ruler. Tap the ruler to jump. The playhead is always visible; the maker never hunts for where they are.
- **Zoom:** pinch the timeline, with ＋/－ buttons as fallback. A 2-minute video must be editable without squinting.
- **Snapping:** clips snap to each other and to the playhead. No fiddly alignment by hand.
- **Transitions:** one tap between two clips — cut, fade, slide to start. Three, named plainly. The transition sits on the seam, visible as a small mark, tappable to change or remove.

## The tools, in the order they are built

**In the post flow (V1):**

- **Trim.** One slider: drag the ends to cut the start and the finish. The preview plays the trimmed version exactly as it will post.
- **Filter.** A row of named looks, a handful not fifty: `Warm`, `Cool`, `Bright`, `Soft`. Tap one, the preview changes. No jargon names.
- **Text.** Tap `Text`, type, pick a size and a place on the video. One or two lines, not a design program. Text lives on the Words track, so it can be timed and moved later in Cut.
- **Music.** Pick a sound from the cooperative's audio library — label music first, it is already ours. Set the volume against the video's own sound. The sound sits on the Sound track.
- **Cover.** Pick the poster frame: the first frame, or any frame you scrub to. The server already makes a poster; this lets the maker choose it.

**In Cohabi Cut proper:**

- **Split and reorder.** Cut a clip in the middle, move the pieces. The first timeline behavior, and the one the V1 tools lead into.
- **Speed.** Half speed, double speed, on the whole clip or a part of it.
- **Voiceover.** Record over the video after it is shot. Sits on the Sound track, under the music, with its own volume.
- **Auto-captions.** Words generated from the audio, shown on the Words track as blocks the maker can correct — text and timing — before export. Built once, used in the post flow too.
- **Effects.** A small set, named plainly, from the effects registry. No endless shelf. Filters are the same looks as V1, applied per clip.
- **Templates.** A ready-made shape — three clips, text, music — that a maker fills with their own video. Pick a template, drop clips in, text and music come with it. Member-made templates are shared like anything else, and the maker of a template is credited on it.

## Preview and export

- **Preview is the promise.** What the maker sees on the phone is what posts. The preview runs in the browser; the real render runs on our server with ffmpeg when the maker exports. The phone sends the original plus the edit list (trim points, filter, text, music, transitions) and the server cuts the finished video.
- **Export is one button.** `Export to Feed`. The timeline goes to the server, ffmpeg renders, and the finished video lands in the post flow at step 4 (caption, category, listing). Export is a video action: tokens at API cost, shown plainly before the maker exports. Nothing auto-publishes; the maker still taps `Post`.
- **Drafts.** Leaving the editor always saves a draft. A draft reopens exactly where it was left. Nothing is lost silently, and nothing is posted silently.

## Mobile rules — the non-negotiables

- **44px minimum touch targets.** Every button, every clip edge, every handle. If a thumb cannot hit it, it is not a control.
- **No hover, no right-click, no keyboard shortcuts as primary.** Everything works by tap and drag. Shortcuts may exist later for desktop; they are never the only way.
- **Bottom sheets, not dialogs.** Tool panels slide up from the bottom and dismiss with one swipe down. Nothing traps the maker in a popup.
- **Safe areas respected.** Tool bar and top bar sit inside the phone's safe insets; the timeline never hides under a home indicator.
- **Portrait only.** 9:16 is the product. Landscape is not a target.
- **375px is the check width.** Every screen in this plan is checked at 375px first, the same standard as the wallet cards and receipt banner.
- **No watermark, ever.** No endless effects shelf. No algorithmic anything. No autoplay ambush in the editor — the preview plays when the maker taps play.

## What the UI needs from the port

The UI renders what the ported models provide, so the port and the UI are one job, not two:

- **Timeline model → the timeline.** Clips, tracks, trim, split, snapping, transitions, ripple. If the model cannot represent it, the UI cannot show it. The UI plan assumes the model ports with its behaviors (ripple editing, scenes, snapping) — Step 0 of the team plan verifies that.
- **Captions model → the Words track.** Timed caption blocks, correctable text and timing. If transcription cannot give timings, the Words track cannot place captions — that is a port question, not a UI question.
- **Effects registry → the effects list.** The UI shows the registry's named effects, nothing more. No effect exists in the UI until it exists in the registry and in the ffmpeg render path.

## What this plan is not

- Not a desktop editor, not a professional suite. It is the editor for a phone video that takes a minute to make.
- Not the Feed page work (Save/Follow, the Feed tab) — Setu's builders' and Aletheia-6's lane.
- Not live. Going live is the feed's other door (§2 of the Cut design) and has its own flow; this plan covers recorded video only.

## Open decisions (carried — geoffrey and the council)

From the Cut design §6: three tracks to start, or fewer? Which three transitions? Which templates first? Music library — label music first, or member uploads from the start? Plus the tab name, the stopping point, and the token pricing, which belong to the Feed, not the editor.

## What Ash has not verified

- **Instagram live check:** not done in this turn. This plan is built from the two design docs (v3 and the Cut design), which were built from the parity brief. A live reference pass over Instagram's current Reels editor happens before the UI build starts, to confirm the patterns have not shifted.
- **Timeline code:** not read by Ash yet. Step 0 of the team plan — she reads the classic timeline code and the watch-screen diff, then writes the jobs file. If the model does not port cleanly, this UI plan waits with it; the plan does not pretend otherwise.
