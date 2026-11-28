# Kimi — Build round 78 — Work Hub phone tap targets

**Status: in progress; no product-code, browser, screenshot, patch-validity, or placement claim yet.**

Assigned scope: copy `commons/public/hq-workhub.css`, add only a phone (`max-width: 600px`) minimum 44×44 px rule for the controls measured small in round 77, preserve desktop, and supply `commons/test/workhub-tap-targets-390.mjs` covering visible controls and document width on both `/headquarters` and `/hub` at 390×844. Required mutation: `WORKHUB_TAP_MUTANT=1` omits the new phone rule and must make the tap assertion red.

Evidence baseline: `teams/build/outputs/round77-kimi-workhub-main.md` and `teams/build/outputs/round77-kimi-workhub-review.md` (to be rechecked against current main). Aletheia-6 must approve the visual result before placement. This report will be replaced with exact hashes and measured results; no staging, production, merge, deploy, or live verification is claimed.
