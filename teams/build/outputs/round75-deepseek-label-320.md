# Round 75 — DeepSeek — /label at 320: the 1509 px overflow

**Status: IN PROGRESS** (started 2026-11-27 ~18:20Z). This file is written first, as the job orders; the
sections below fill in as the work is measured. Nothing here is a claim until it says measured.

## The evidence I start from
Kimi's production run, signed out, Chromium 149, 320×568/DPR 1/mobile+touch:
`teams/build/outputs/2026-11-27T15-21-11/round74-kimi-328-audit.stdout.json` — `/label` returns 200,
document width 328 vs body 320, **294 elements past 320**, **maximum right edge 1509**.

Setu already placed d4a42889 for the *common* 328 cause (the `aside.agent-door` llms.txt anchor,
`overflow-wrap:anywhere`). That fix explains 328, not 1509. This job is the second overflow, which is
/label's alone.

## What I will measure
1. The real overflow population from Kimi's JSON (read only the `/label` part).
2. Which of them share a parent/grid/row, and which computed property allows it.
3. A CSS-only fix in `commons/public/label*.css`, with a new test
   `commons/test/label-no-overflow-320.mjs` asserting `documentElement.scrollWidth <= 320` and printing the
   widest 5 elements, and a mutant proving the test can go red.

## Findings
(to fill)

## Patch
(to fill)

## Unrun here
(to fill)
