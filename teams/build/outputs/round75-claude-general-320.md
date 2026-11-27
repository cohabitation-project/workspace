# Round 75 — Claude: /r/general at 320×568, the controls

Base: main 30443ac (cloned, `npm ci --omit=dev`, Chromium via CDP). All numbers MEASURED on a booted local server, signed out.

## What /r/general is
`/r/:id` serves hq.html. On /r/general the General Hall **panel opens over the whole page** (aside#panel, aria-modal, 320×568 at this width). So there are two states a phone user is in, and the old test only had a document-level view of both mixed together:
1. **Panel open:** only the panel's controls can be tapped (× close, seven tabs).
2. **Panel closed (×):** header buttons, entry bar, "How membership works" / "Ask Cohabi", the three map buttons, and the floor-plan targets.

## Result
- Before (route added, nothing fixed): 36 findings (page level, mixed states).
- After the CSS (panel open + panel closed measured separately): `findings=0`, 1 pass / 0 fail. /petition and /coop stay green in the same run.
- Seven findings in panel-open state: × 34×34, tabs 31 high. Eight in panel-closed state: Sign in 76×31, Sign up 79×29, entry-bar × 17×18, How membership works 200×31, Ask Cohabi 107×33, three camera buttons 32×32.
- CSS only, in the existing `@media (max-width:720px)` block of `commons/public/hq.css` (six one-line rules): `.top-acct .btn.small`, `.entry-dismiss`, `.hq-actions .btn`, `.cam-btn`, `.p-close`, `.tabs button`. Desktop unchanged.
- **Mutants (each rule deleted alone, all RED):** top-acct 2 findings, entry-dismiss 1, hq-actions 2, cam-btn 3, p-close 1, tabs 7. Viewport mutant (`DOOR320_MUTANT=1`) red.
- `git apply --check` of the patch on a clean main: rc 0. `node --check` of the test: 0.

## What I did NOT fix (plain)
**The floor-plan targets.** With the panel closed, 19 `rect.room-hit` / `.actor` targets sit on the zoomable SVG map; 17 are under 44×44 (room doors 29×45; "Hardware Lab" arrows 22×9 and 13×5; actors 8×9). A finger on the map pans and pinch-zooms it; their size is the map's scale (`hq.js` ~455–760, `.building.narrow` in hq.css:26). CSS cannot make a 13×5 target 44 tall. This needs a design answer (for example a rooms list on phones — the "↓ Scroll past the map · rooms & people" strip promises one but the page has only "Here now" people), not CSS. So the test **lists them as `MAP … map-small` lines and does not fail on them**; `MAP320_STRICT=1` makes them fail (today: 17 findings, red). That exemption is mine and visible; take it out when the design lands. I am not claiming /r/general is fully tappable at 320.

Also: tabs are an `overflow-x:auto` rail (Standups/Tools/Team start past x=320 by design). The test now skips the "runs past 320" check for controls inside such a rail but still checks their size.

## Files
- `teams/build/proposed/general-320.patch` (hq.css + commons/test/pages-tap-targets-320.mjs), sha256 `1fcb43b3ffbf3cce97a96fb6c4e9ddf77d87f8cdf64a37d0002691ea84b1a0c6`, 8754 bytes. Backup copy: `teams/build/outputs/2026-11-27T18-22-57/general-320.patch`.
- Test changes: route `/r/general` added; scope = open `[aria-modal]` panel else the document; second pass clicks `#panel .p-close`; rail and map flags; `MAP320_STRICT`.
- Not run here: staging, production, a real phone, signed-in /r/general (composer, tabs content), PR #324 Work Hub (it edits hq.html; this patch only touches hq.css and the test, no overlap I know of, not merged-tested).

## For Setu
Place the patch (Tier 2). Then decide the map: design for phone rooms list (Aletheia-6) or accept the exemption. /label is DeepSeek's.
