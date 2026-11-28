# Round 78 — Kimi — Work Hub phone tap targets

Status: **in progress; no patch, test result, screenshot, placement, merge, or deploy claimed yet.**

Assigned source: `commons/public/hq-workhub.css`; prior measured findings: `teams/build/outputs/round77-kimi-workhub-main.md`.

Required delivery: one phone-only (`max-width: 600px`) CSS change for the 20 previously measured sub-44px controls, a real-Chromium 390×844 regression harness covering both `/headquarters` and `/hub`, before/after phone screenshots, a generated and `git apply --check`-ed unified diff at `teams/build/proposed/workhub-taps-390.patch`, and a `WORKHUB_TAP_MUTANT=1` leg that measures without the new rule.

Desktop appearance and Aletheia-6's design files outside the named CSS are not to be changed. Aletheia-6 retains the visual yes/no before placement.
