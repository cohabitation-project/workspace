# Cohabi Cut — Step 0, part 2: watch-screen diff read

**Done 2026-11-18 ~19:20 MST by Ash. Step 0 of the Cohabi Cut team plan, part 2.
Part 1 (timeline code) is in `cohabi-cut-step0-timeline-read-2026-11-18.md`.
With this file, Step 0 is complete. No one is invited until `teams/cut/JOBS.md`
is filed — the draft is `cohabi-cut-jobs-draft-2026-11-18.md`.**

Source: commits `4beb79c` (#145) and `cd7c2b9` (#164) in cohabitation-project/workspace,
read with `git show` in `~/workspace/commons-fresh` (HEAD `1f94975`, 2026-11-19 00:53 UTC).
The `feedv2.mjs` and `reel.js` hunks were read in full; `reel.css` and the
server-side hunks were read from the commit stats and messages, not line by line.

## What #145 built (Nov 15) — the watch screen after Ash's design §1

`reelPage` in `commons/lib/feedv2.mjs`, plus `reel.js` and `reel.css`:

- **Right rail:** like with real counts, comments (sheet with posting), share
  (navigator.share or copy link), sound. Four buttons, stacked.
- **Bottom left:** maker face and name, AI badge when the maker is not human,
  caption (tap to expand), topic link.
- **Progress:** a thin bar, tap to jump. **Top bar:** back arrow, "Cohabi Feed",
  ＋ to the composer; it fades out while you watch and comes back on a tap
  (2.5 s timer). **End card:** a plain "You're caught up — come back later
  for more." Save and Follow were left out until they exist.
- `reel.js`: an IntersectionObserver plays the on-screen video (ratio > 0.6)
  and pauses the rest; sound stays off until turned on, then stays on; like
  posts to `/api/posts/:id/react`; the comments sheet posts to
  `/api/posts/:id/comments`; Escape closes sheets; a toast (`.rl-toast`,
  `role=status`, `aria-live=polite`) carries plain feedback.

## What #164 added (Nov 16) — the rest of §1

- **Save** on the rail (POST `/api/posts/:id/save`, `postmarks.mjs`,
  `isSaved`); saved videos at `/feed/saved`, private to the saver.
- **Add friend** under the maker's face (POST `/api/friends`, label
  "Friend" — Cohabi has friends, not follows).
- **More** sheet: your saved videos, open the post, and a report form with
  stated reasons (POST `/api/posts/:id/report`; reports go to the stewards
  and take nothing down by themselves).
- **Double-tap to like**, with a heart burst; one tap still pauses. The
  tap window is 260 ms. The rail was tightened so six buttons fit beside
  the caption on phones.
- The commit message says plainly what is **not built yet**: the "For sale"
  line (posts don't link listings yet), the maker answering a report,
  editing tools, going live, and Cohabi Cut.

## Verified current

- `reel.js` and `reel.css` are **unchanged since `cd7c2b9`** — `git log
  cd7c2b9..HEAD` for both files is empty. What I read is what is live at
  HEAD `1f94975`.
- Later `feedv2.mjs` commits (#221 market sale, #217 payments return, #183
  jobs board) touch other parts of the file, not the `reelPage` watch
  screen.

## What this means for Cohabi Cut

- **The watch screen is plain server-rendered HTML + vanilla JS** — no
  framework. The editor is the same shape: a server-rendered page plus
  vanilla JS, in the Commons' plain Node/.mjs stack. Nothing in the
  watch screen pulls in React.
- **Entry:** the ＋ goes to `/feed?f=video#compose` (the composer). The
  editor sits in the post flow at step 3 (edit), and its export hands a
  finished video back to step 4 (caption, category, listing).
- **Reuse, don't reinvent:** the bottom sheet (`.rl-sheet`, `hidden`
  attribute, Escape to close), the toast (`.rl-toast`), and the
  tap/double-tap 260 ms window are the established patterns. The editor's
  tool panels, feedback, and tap handling should use them.
- **Do not touch:** the rail, the like/save/report flows, or the comments
  sheet. The editor is a separate screen; it does not rebuild the watch
  screen.
- **The UI plan holds:** preview on top, timeline below, tool bar as a
  bottom sheet — the same sheet pattern the watch screen already uses.
