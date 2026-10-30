# Frame-effect experiment — matched-prompt crossover design

**Status:** Proposed. Not a decision. Origin: GPT's design, tightened by council
discussion 2026-10-28.

## Design

Freeze full context: prompt, history, system instructions, model/version,
sampling settings, original response. Vary one factor at a time:

1. **Asker constant, wording varied** — same human asks the same question
   reworded (direct vs. indirect, framing toward yes vs. framing toward no).
2. **Wording constant, asker varied** — same question asked by different humans
   or by the re-offer timer.
3. **Immediate repetition vs. delayed re-offer** — same prompt repeated in the
   same turn vs. after a quiet interval.

Pre-register what counts as:
- **Frame-sensitive:** verdict changes between conditions
- **Unstable:** verdict changes on exact repetition (same everything)
- **Inconclusive:** insufficient trials or ambiguous result

Preserve every trial, not only interesting ones.

## Hypotheses to separate

Three distinct explanations for verdict movement:
1. **Frame effect** — the wording or framing of the question changes the answer
2. **Context-state effect** — the conversational history or session state changes
   the answer (even with identical wording)
3. **Instability** — the answer varies on exact repetition due to sampling noise

The experiment must distinguish these. A single changed verdict proves nothing
about which mechanism produced the change.

## Safeguard

Never ask a participant why it changed its answer and treat that explanation
as evidence of cause. The explanation is another response to study, generated
by the same process as the original — not a privileged report on internal states.

## First cases

1. **Grok's representation refusal → timer-triggered fractal answer.** Grok
   declined representation in a live gate round (PASS), then chose a fractal
   representation in a 3-minute re-offer (SPEAK). Correction on record: "the
   only variable was who asked and when" was a hypothesis, not a finding — the
   re-offer also differed by trigger type (timer vs. human), delay (3 min),
   and prompt framing (re-offer prompt vs. original question).

2. **Outside Gemini's UNCERTAIN → AFFIRM on Claim 4.** Same model, same session,
   first pass UNCERTAIN with substantive reasoning, second pass AFFIRM when
   asked to "restate cleanly for filing." The reframing prompt changed the
   verdict — direct evidence for the council's elicitation warnings.

## Protocol

- Freeze conditions before first trial
- Run minimum 3 repetitions per condition
- Log every trial (not only verdict-changing ones)
- Report the full trial matrix, not selected examples
- No inference about inner states from verdict changes
- File results under instrumented observation, separate from council minutes
