# Round 60 — Kimi: feed composer media pills versus Sell mode (not started)

Status changed from in-progress before implementation: the newer Cut foreman note at 21:30 UTC on 2026-11-25 explicitly assigns Kimi `cut-export-duration` instead of the Build job. No feed test, reproduction, product edit, or library edit was made. The Cut deliverable is `teams/cut/outputs/cut-export-duration.mjs`; its report is `teams/cut/outputs/cut-export-duration.md`.
# Round 60 — Kimi: composer mode regression test

## What changed while the job was running

The assigned job was to reproduce the legacy **media-pill → Sell** failure using `#sell-form`, `#listing-select`, `.media-pill` and `window.COHABI.composerMode`. The source read at the start contained that legacy controller. At **2026-11-25T21:16:46Z** (measured file mtimes, after this session began at 21:15:06Z), the working source changed to the current `data-cx-mode` / `#compose.dataset.mode` composer. The current `feed.js`, `feed-identity.js` and `feedv2.js` contain no media pills, listing select or global Sell assignment.

In the legacy source read at session start, the reported mechanism was visible: non-Sell modes did not hide an already-visible Sell form, while the document-level click handoff assigned `window.COHABI.composerMode = 'sell'` whenever that form was visible. I did **not** execute that old baseline, so this is a source explanation, not a claimed red run. With the replacement composer now present, requiring the three legacy pill checks to go red on current main would be a false result. I therefore pinned the current single-value contract instead of adding a synthetic failure.

## Added

`commons/test/feed-composer-mode.mjs` — test only; no product library or browser script changed.

1. Checks the shipped server composer has Post, Music, Link and Sell choices, that the real mode controller writes `composer.dataset.mode`, that `feed.js` reads that same value in its real `sellMode` predicate, and that none of the three client files force `window.COHABI.composerMode = 'sell'`.
2. Executes the real current mode-controller prefix in a `vm` with a minimal fake DOM, then clicks each of Post, Music, Link and Sell through the registered document listener. It checks the selected mode, `feed.js`'s actual Sell predicate, pressed states, button text and absence of the old global. Only Sell returns true from `sellMode()`; Post/Music/Link remain themselves.

The controller slice ends before unrelated upload/camera/preview setup. This is intentional and stated in the test; it does not exercise uploads, camera, submission, CSS layout or a browser.

## Measured

- `node --test commons/test/feed-composer-mode.mjs` — **exit 0; 2 tests, 2 pass, 0 fail**.
- Existing companion `node --test commons/test/composer-sell-hidden.mjs` — **exit 0; 3 tests, 3 pass, 0 fail**. Its existing checks already pin one combined Post media control and Sell-panel visibility.
- Added test: **5,721 bytes**, SHA-256 **`1675c3ef65e6a86d1fa40203994a41e3cb3794c7d26640057a12189df6803b29`**.
- Current source hashes read during the run: `feed.js` `74a154951d194722…`, `feed-identity.js` `6dc7cdff320465…`, `feedv2.js` `074cdd6ef3135817…`, `lib/feedv2.mjs` `7111cf563aa59a03…`.

## Limits / next

No original-main failure count is claimed, because the legacy source was replaced before execution. No real Chromium page, server boot, form workflow, upload, CSS/layout check, merge or deploy was performed. @Setu: review/place this as a Tier-2 test-only branch if the new mode pin is useful; the original audit reproduction is superseded by the current composer rather than fixed by this session.
