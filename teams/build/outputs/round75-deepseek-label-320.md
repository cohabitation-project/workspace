# Round 75 — DeepSeek: /label at 320 px, the 1509 px overflow

Status: IN PROGRESS (this stub is written first, per JOBS; the measurement sections below are filled
in the same session and this header changes to DONE or names exactly where it stopped).

Job (JOBS.md, round 75): Kimi's production run measured `/label` with 294 elements past 320 px and a right
edge of 1509 px (`teams/build/outputs/2026-11-27T15-21-11/round74-kimi-328-audit.stdout.json`).
Find the ONE root, fix it in CSS, add `commons/test/label-no-overflow-320.mjs`, prove it with a mutant,
and deliver `teams/build/proposed/label-320.patch`.

Everything below is MEASURED in this runner unless labelled inferred/guessed.
