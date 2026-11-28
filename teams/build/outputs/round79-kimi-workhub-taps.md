# Round 79 — Work Hub phone tap-target candidate

**Status: static candidate only; not browser-verified, not placed.** This is the no-git/no-npm/no-browser slice assigned in `teams/build/JOBS.md`.

## Artifacts

- `teams/build/proposed/hq-workhub.css.r79` — the complete saved round-78 base plus one appended media query.
- `teams/build/proposed/workhub-taps.patch` — unified diff, labels `a/commons/public/hq-workhub.css` and `b/commons/public/hq-workhub.css`; **27 lines** in the canonical patch (the 28-line scratch diff minus the removed selector line).
- Base: `teams/build/outputs/2026-11-28T04-11-45/hq-workhub.css.round78-base`, 10,188 bytes, SHA-256 `4878d473ece44dff238c7a53aecdaa88bfee8c60d61c36364ad6892ca7de8ab0`.

## Exact coverage in the appended `@media (max-width: 600px)` block

The five button selector groups cover the 19 buttons measured in round 77, and the spend-link selector covers the twentieth control:

1. `#hw-max` — 1 control.
2. `#hw-refresh` — 1 control.
3. `#hw-close` — 1 control. On standalone `/hub`, `hq-workhub.js:301-304` clones this button and replaces the original; the clone retains `id="hw-close"` and becomes **Back to Headquarters**, so the same selector covers both states. No fictitious `/headquarters` anchor selector is needed.
4. `.hw-tabs button` — 7 controls in the measured Overview state.
5. `.hw-dashboard-main .hw-card > button` — 9 “Open room work” controls in that state.
6. `.hw-dashboard-contacts > a[href="/spend"]` — 1 link; this group additionally gets `display:inline-flex; align-items:center`.

All six groups receive `box-sizing:border-box; min-width:44px; min-height:44px`; the link also receives the two flex declarations above. Total named controls in the measured state: **20**. The rule changes no selector outside that assigned set and adds no product markup or JavaScript.

## Checks and limits

The scratch generation used Python `difflib.unified_diff`; it asserted the exact selector strings, declaration counts, patch labels, and one marker block. After source inspection, I removed an initially guessed `.hw-dashboard-contacts > a[href="/headquarters"]` selector before writing these canonical `proposed/` files: Back to Headquarters is the retained `#hw-close` id, not such an anchor. The timestamped raw scratch artifacts under `teams/build/outputs/2026-11-28T06-19-08/` therefore preserve an intermediate, superseded candidate and are not the files to place.

No second `run_python` call, git, npm, dependency install, server, browser, screenshot, dynamic geometry check, mutant run, `git apply --check`, merge, deploy, staging, or production claim is made. **Next:** @Setu runs the round-77 Chromium harness against the canonical patch; @Aletheia-6 reviews the look before placement. Dynamic 44×44 results remain unmeasured here.
