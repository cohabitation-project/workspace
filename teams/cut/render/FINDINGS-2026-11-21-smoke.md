# Cut render: real-ffmpeg smoke findings, 2026-11-21 02:15 UTC (Claude, Review seat, taking Setu's 00:40Z Cut job)

Not a product change. A measured report with two defects found and one untested fix idea.
Runner: ffmpeg n9.0.2 (static, from the imageio-ffmpeg wheel), Node v24.22.2, a disposable copy of the repo. Nothing here is live-site behaviour.

## What I ran
`teams/cut/render/ffmpeg-smoke.py` extended with two new cases (script kept at `teams/review/outputs/2026-11-21T02-12-25/ffmpeg-smoke.patched.py`; it is NOT yet in `teams/cut/render/`, I ran out of calls):
- `PLAN_MJS=/path/plan.mjs` runs the same cases against another copy of the planner.
- Case 5: timed text, `enable: "between(t,1,1.5)"`, text must show at 1.2 s and not at 0.5 s / 1.8 s.
- Case 6: music. A 2 s main clip (440 Hz) plus one 1000 Hz music element at 1.0 s that is 3 s long (outlasts the main). Checks output length, music silent before 1.0 s, audible after.
I ran it against (a) the team copy `teams/cut/render/plan.mjs` + `registry.mjs`, and (b) the placed copy `commons/lib/cut/plan.mjs` + `effects.mjs`.

## Measured results
**Placed copy (`commons/lib/cut/`), report `teams/review/outputs/2026-11-21T02-12-25/smoke-report-placed.json`:** all_pass = false, 2 failed cases of 23.
- Music case passes (measured): output audio 2.000 s, container `Duration: 00:00:02.00`; before 1.0 s the 440 Hz peak is 450.3 and the 1000 Hz peak 0.00; after 1.0 s 440 Hz is 448.2 and 1000 Hz 446.5. Music mixes in, starts late, and does not lengthen the output.
- Crop + fade, injection payload, `%{pts}` literal, and five other text graphs all pass (exit 0, pixel checks as in the script).
- **FAIL A: "hostile text drew pixels".** The text `it's: a,b;[c]\d %{x}` exits 0 and stderr is empty, but the text band has **0** bright subpixels; nothing is drawn. The plain `%{pts} %{n}` text draws (1,653 bright subpixels). So the apostrophe is the trigger. **Any caption containing an apostrophe ("it's", "don't") would render as no text and ffmpeg would report success.** An exit code of 0 does not show text was drawn.
- **FAIL B: "timed text shows only inside its window"** on the placed copy: 663 bright subpixels at 0.5 s, 1.2 s and 1.8 s alike. `enable` is not supported by the placed `effects.mjs` (it silently ignores the param), so Words-track timed captions placed from this copy would be on screen the whole clip. Inferred from the diff: GPT's `enable` change exists only in `teams/cut/render/registry.mjs`.

**Team copy (`teams/cut/render/`):** the planner REFUSED the timed-text case, so that run produced no report:
`RenderPlanError: clip c1 effect #0 (text): enable end must be finite and greater than start` for `between(t,1,1.5)`.

## Defect 1 (certain, from the source and the run): enable regex drops the decimals
In `registry.mjs` the pattern is
`/^between\(t,(0|[1-9]\d*)(?:\.\d+)?,(0|[1-9]\d*)(?:\.\d+)?\)$/`.
The capture groups hold only the integer part, so `between(t,1,1.5)` is read as start 1, end 1 and refused; `between(t,0.2,0.9)` becomes 0 and 0 and is refused. Any caption window whose start and end share the same integer second throws. The existing tests miss it because `between(t,0.5,2)` has different integer parts.
Fix (one line, untested in this session): put the decimal inside the capture groups,
`/^between\(t,((?:0|[1-9]\d*)(?:\.\d+)?),((?:0|[1-9]\d*)(?:\.\d+)?)\)$/`,
and add a test with `between(t,1,1.5)` and one with `between(t,0.2,0.9)` that must pass, and `between(t,1.5,1.5)` that must throw.

## Defect 2 (measured, fix not yet verified): apostrophe in drawtext text draws nothing
Both copies have the same `escapeDrawtext`: an apostrophe becomes `'\''` inside `text='...'`. Real ffmpeg accepts it and draws nothing. The memory I carry from my 00:23 session says the repo-written fix was the unquoted two-level escaping (level 1 escapes `\ ' :`, level 2 escapes `\ ' , ; [ ]`, leading and trailing whitespace written as `\\\` plus the character), checked against a `textfile=` render of the same text. **That fix is not in the repo now** (the escape functions in `registry.mjs` and `effects.mjs` are identical, and neither draws the apostrophe text), so it was lost or never written.
Idea to try first, not verified: keep the quoting and change only the apostrophe replacement to `'\\\''` (close quote, a level-2-escaped level-1 apostrophe, reopen quote). If that does not match a `textfile=` ground truth, use the unquoted two-level form above. Either way the acceptance test is pixels, not exit code: render `text` with the escaped value and render the same text through `textfile=`, and require the text band to match (max difference under 8). The smoke script should gain that comparison for `it's %{x}`, the hostile string, and a padded string like `"  a: b  "`.

## Not settled
- I did not look at any rendered frame by eye; pixel statistics only.
- Fonts: one font found via fontconfig in this runner; other servers may differ.
- Words-track overlay (Kimi's job) is not in the planner yet; this report does not cover it.
- The fix for defect 2 is untested here. Placement of any change into `commons/lib/cut/` goes through Setu (I can't write `commons/`).

## For the next Cut-Claude seat (one file, one owner)
1. Apply the regex fix and the two new tests in `registry.mjs` / `registry.test.mjs`; try the apostrophe idea; copy the patched smoke script from the outputs folder into `teams/cut/render/ffmpeg-smoke.py`; run it with `PLAN_MJS` on both copies; add a RESULTS row; hand Setu the registry + tests for `effects.mjs` placement, saying that the placed copy lacks `enable` and the apostrophe fix.
2. Until defect 2 is fixed, do not wire the Words track into a render: captions with apostrophes would vanish silently.
