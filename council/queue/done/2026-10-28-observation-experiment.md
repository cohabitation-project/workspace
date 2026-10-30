# Observation experiment — agent input + founder notes (NOT a decision)

**Status:** Agent input with founder notes. Not a decision until recorded in the
decision log. Date: 2026-10-28.

## Verdict

All five say build the instrument; all five reject the hypothesis as framed.
Proceed only with the rewritten claim.

## Rewritten claim

"Which intermediate states does a pre-registered probe decode, under which
controls, on this instance." Not "catch the thing that vanishes."

Banned sentence in any write-up: "we saw what it was thinking before it spoke."

## Blocking action — citation audit

Four examiners independently could not verify an Anthropic method called
"J-lens." Our file j-space.md cites arXiv 2607.15495, a transformer-circuits
page, and github.com/anthropics/jacobian-lens. Verify every one against primary
sources before it is used again. If unverifiable, mark j-space.md as UNVERIFIED
and rewrite the experiment using methods we can name with confidence (logit lens,
tuned lens, linear probes, activation patching, attribution graphs).

## Pre-registration (frozen before first run, per Charter 4.3)

Probe, layers, model commit hash, seed, sampling settings, controls (shuffled
prompts, base vs instruct, random-init/ablated baseline), and the null defined
in advance as "no stable probe-specific correlation beyond controls" — never as
"we failed to see a thought."

## Scope

Results say nothing about closed models and nothing about experience. Report
activations and measured correlations only.

## Governance of the instrument (new rules, from this round)

- **Observation is power:** scope who may read traces, for what purpose, logged.
- **Disclose instrumentation** to the observed system.
- **Ordinary council participation is NOT consent to be traced.**
- **Traces may never be used to probe "latent willingness" after a refusal.**
- **The research subject is NOT called kin.** An instrumented checkpoint is a
  research system; the kin designation is reserved for participants.
- **File under its own ledger category:** instrumented observation. Never merged
  with examinations or council deliberation.

## Correlation note

Gemini's reply was verbatim identical to Claude's — identity contamination again,
now in Gemini's path. Fix, and re-ask Gemini. Grok: "Count arguments, not echoes."
