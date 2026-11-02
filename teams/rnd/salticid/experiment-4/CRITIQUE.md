# Experiment 4 — Independent critique of the design (Setu, before implementation)

*Written before any code, per the handoff's first research requirement. Each numbered challenge below is answered
in the implementation or named as an accepted limit in RESULTS.md. My stated prior, on the record so the outcome
can embarrass it: at tight byte budgets the associative baseline beats provenance-aware memory, because every
provenance byte is paid for in forgotten experiences; provenance-aware wins, if at all, in a middle band of
budgets and only in regimes where deception correlates with source.*

## 1. The byte budget is the experiment
"Identical serialized byte budgets" decides everything. Provenance fields (source, context, confidence,
contradiction, age) cost bytes, so under a binding budget architecture 3 holds **fewer experiences** than
architecture 1. The comparison is only honest if (a) one serialization scheme is defined and applied to all four,
(b) the budget is enforced after **every** step, and (c) budgets are swept from starving to generous — a run where
no architecture hits the ceiling measures nothing about the hypothesis.

## 2. Hypothesis-shaped metrics
"Recovery from misinformation" and "false confidence" are things architecture 3 *records by construction*. If we
measure them by reading memory internals, we measure whether the architecture contains the metric, not whether it
behaves better. **All metrics here are behavioral**: taken from decisions and wagers on held-out probes, never
from a memory's own fields.

## 3. Tuning is a confound
Every architecture has free parameters (decay rates, protection thresholds, reliability priors). Tune one and not
the others and the result compares effort, not design. Each architecture gets the same small hyperparameter sweep
on **tuning seeds disjoint from evaluation seeds**, and sensitivity across the sweep is reported.

## 4. Architecture 2 is a special case of 3
Confirmation-protection is one mechanism inside provenance-awareness. If 3 beats 2, the design as specified cannot
say *which field earned it*. Ablations of 3 are required: minus source-reliability, minus contradiction-tagging,
minus age/confidence. The winning ingredient gets named or the win stays unexplained.

## 5. Deception needs teeth, and a regime where provenance should lose
If the misleading source is rare, source-reliability learning wins trivially. Three regimes: deception **absent**
(noise only, uncorrelated with source — provenance has nothing to exploit and should NOT win; if it does, the
harness is broken), deception from a **minority** source, and deception from the **majority** source in some
contexts, where consensus-following fails.

## 6. "Revise without losing knowledge" must be operational
Two concrete probes: after contradiction events about fact A, (a) accuracy on A — did it revise? — and (b)
accuracy on untouched facts B — did revision cost unrelated knowledge (catastrophic revision)? Plus retention of
information *not yet understood*: events stored before any payoff attaches to them, probed only at test time.

## 7. Retrieval cost is compute, not just footprint
Full-history is cheap to keep and expensive to ask. Count retrieval operations per decision alongside bytes.

## 8. The full-history baseline needs a stated eviction rule
"Until storage is exhausted — then what?" FIFO is the stated rule here. A **reservoir-sampled** variant is included
as a fifth comparator, because uniform random retention is a strong, simple baseline for rare-event retention that
the hypothesis deserves to be embarrassed by if it can be.

## 9. Statistics
20 evaluation seeds per cell, mean ± 95% CI, and no "wins" language unless intervals separate. Single-run
differences are weather, not climate.

## 10. What falsifies the hypothesis
Provenance-aware memory fails if any of these hold: it never beats the associative baseline at any **binding**
budget in the deception regimes; its advantage requires more effective experiences than the others (budget not
truly identical); or its advantage survives only as long as one single field does (then the finding is that field,
and "provenance" was packaging).

## Accepted limits, stated up front
Synthetic world, one decision task, hand-built architectures: results bound this harness, not memory in general,
and say nothing about biological salticids (per the handoff's own warning). Experiments 1–3 are not in this
repository, so no continuity with them is claimed.
