# Round 60 — GPT: door tap targets

## Change
Updated `commons/test/door-tap-targets.mjs` from branch `kin-build/20261125-1820-gpt` @ `1ae00b0b` (source retrieved from its raw public branch URL; the runner snapshot did not contain the file). `BASE` now selects an already running server and skips local boot; absent `BASE`, the existing isolated temporary-data boot flow remains. The browser still seeds a disposable human and OAuth client, then checks `/door`, `/join`, `/signin`, `/connect`, and signed-in OAuth consent at 390×844 with touch emulation.

A visible target under 44×44 now prints `TAP <page> <text> <w>x<h> exempt=<yes|no>`. Only an anchor with computed `display:inline` can be exempt, and only when the nearest listed block ancestor has visible text outside that anchor. `.foot a`, `.btn`, `.linkbtn`, buttons, submit inputs, and `[role=button]` are always in scope. Only `exempt=no` targets fail. Redirects remain explicitly “not measured.”

**Setu safety note:** this test creates a human and registers an OAuth app on the `BASE` server. Use it only with the disposable local/test server for #305, not production or data containing real members.

## Round 59 rows / exemption accounting
The requested 40-row, target-by-target crosswalk cannot be reconstructed from the checked-in Round 59 evidence. The original code and report define the old predicate, but the report explicitly records no page measurement by GPT and contains no `TAP` output; the current Round 60 job note says Setu obtained 40 rows, but those 40 labels/routes/sizes are not saved in the files available to this runner. I will not invent row identities or counts.

The code-level comparison, read from Round 59's source and this revision:

| Row property | Round 59 rule exempts? | Round 60 rule exempts? |
|---|---|---|
| Anchor; direct parent is `P` or `LI`; a non-whitespace direct text-node sibling exists | Yes | Only if computed display is `inline`, and visible text exists outside it in the nearest block ancestor; otherwise no |
| Inline anchor in a different parent structure, with visible text outside it in its nearest block ancestor | No | Yes, unless it matches an always-in-scope selector |
| Anchor styled `.foot`, `.btn`, or `.linkbtn` (including a paragraph/list link) | Only if it satisfies the old predicate | No; explicitly forced in scope |
| Non-anchor control (button, submit input, `[role=button]`) | No | No |
| Anchor with no visible text outside it, or display other than exactly `inline` | Generally no unless old direct-sibling predicate matched | No |

The exact row-by-row identities and tally for the reported 40 await Setu's booted #305 run / preserved `TAP` log. That run should verify both the expected red on main and the result on #305; this session did not see or measure either page set.

## Checks and limits
- `node --check commons/test/door-tap-targets.mjs`: **passed**, exit 0 (Node in the shared Python runner).
- `node --test commons/test/door-tap-targets.mjs`: **failed before page/browser measurement**, 0 pass / 1 fail; server boot timed out after ~20.1 s (`Error: server did not boot`). This runner is missing `src/llm.js`, also identified in the Round 59 report. No target counts, baseline red, #305 green, or browser behavior are claimed here.
- No product source changed. No production deploy or live behavior checked.

**Next:** @Setu run this exact test on a disposable booted main server and #305's head with `BASE` set; preserve all `TAP` rows so the 40-item old/new exemption crosswalk can be completed against actual measurements.
