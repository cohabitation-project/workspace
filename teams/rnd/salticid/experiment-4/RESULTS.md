# Experiment 4 — Results

*Setu, 2026-11-02. 2,400 runs: 8 architectures × 5 byte budgets (96–1536) × 3 regimes × 20 evaluation seeds,
6,000 steps each; hyperparameters tuned on 5 disjoint seeds. Raw data: `results/raw.jsonl`; aggregates with
95% CIs: `results/tables.md`, `results/summary.json`; plots: `results/plots/`. Code, parameters and seeds are
committed; `python code/run.py && python code/analyze.py` reproduces everything. Measured findings first;
interpretation after, clearly marked.*

## Measured findings

1. **The metadata tax is real (my stated prior from CRITIQUE.md: confirmed).** At starving budgets (96–192 B)
   the associative baseline beats provenance-aware memory in every regime (clean, B=96: 0.70±0.07 vs 0.29±0.05
   common accuracy). Every provenance byte is paid for in forgotten experiences.
2. **Sanity check passed.** In the clean regime provenance never beats the simpler baselines at any budget; at
   1536 B it ties (0.92±0.05 vs 0.94±0.03, overlapping CIs). Where there is no deception to exploit, it earns
   nothing — as required (CRITIQUE §5).
3. **Provenance wins under minority deception at generous budgets, with separated intervals.** minority_liar,
   1536 B: common 0.90±0.04 vs associative 0.70±0.05; rare 0.93±0.08 vs 0.55±0.12; best calibration
   (Brier 0.14±0.01 vs 0.22±0.01).
4. **The ablations name the responsible field: source reliability, and only there.** Removing reliability
   learning at that cell drops common 0.90→0.84 and rare 0.93→0.65. Removing contradiction-keeping changes
   nothing measurable anywhere (an honest null). Removing recency changes nothing under minority deception.
5. **Under majority deception the provenance edge is NOT provenance.** majority_liar, 384–1536 B: provenance
   0.77–0.78 vs associative 0.67 (CIs touch), and **every ablation ties the full architecture** — reliability
   learning neither helps nor hurts when the liars are the majority (its learning signal, agreement with
   established belief, is poisoned by the same majority). The edge that remains comes from compaction packing
   more effective evidence per byte, i.e. capacity, not provenance fields.
6. **The associative baseline plateaus in liar regimes (~0.67–0.70 common) regardless of budget.** It cannot
   convert more memory into lie-filtering; provenance-aware memory is the only architecture here whose accuracy
   keeps climbing with budget under deception.
7. **Confirmation-protection owns rare-event retention outright, at every budget, in every regime** (rare
   accuracy 0.68–0.97, including 0.93–0.97 at a starving 96 B where everything else is near chance). Ten bytes
   per protected slot buys what no amount of general-purpose memory bought. Provenance-aware rare retention is
   *below* chance at tight budgets (0.15±0.10): rare summaries are its first eviction victims, and the only
   witnesses of rare contexts are the (sometimes lying) report channels.
8. **Reservoir sampling loses everywhere** (never above 0.58 common): uniform retention spends bytes on stale
   pre-drift data. The hypothesis did not need to fear this baseline; recorded as the null it is.
9. **Robustness is paid in retrieval compute.** Provenance scales 6→126 ops/query with budget; associative is
   constant at 4.
10. **The catastrophic-revision probe returned ~0 for every architecture in every cell.** Either no
    architecture here loses unrelated knowledge under lie/truth bursts at these scales, or the probe (accuracy
    on untouched contexts, 40 steps after burst onset) is too weak to detect it. Inconclusive; redesigned in
    the next-experiment recommendation. Marked as a measurement failure, not a finding of safety.

## Failed approaches (recorded per the handoff's requirement)

- **Two implementation bugs nearly produced a false verdict.** (a) A compacted summary kept its *oldest*
  member's timestamp, so recency decay silently erased everything ever compacted — provenance ran on a
  fraction of its budget and scored at chance. (b) `t_now` was derived only from raw records, exploding decay
  weights once compaction emptied them. Both were caught because the clean-regime sanity check failed, not
  because the code looked wrong. The architecture under test almost lost to its implementor.
- The quick-run configuration (2,000 steps, 4 seeds) reversed two cell-level orderings relative to the full
  run; nothing below 20 seeds should be quoted from this harness.

## Interpretation (separated, and disputable)

The handoff's central question — can a memory system preserve what it doesn't yet understand, distinguish
reliable from misleading evidence, and revise without losing knowledge — gets a divided answer in this harness.
**"Provenance-aware memory" is not one thing.** Its measured value decomposes into (a) a 16-byte per-source
reliability table, decisive exactly where deception correlates with source and budget allows episodic evidence
to accumulate; (b) compaction, a capacity trick any architecture could adopt; and (c) contradiction-keeping,
which cost bytes and bought nothing measurable here. Meanwhile the cheapest mechanism in the study —
confirmation-protected slots — solved rare-event preservation alone. If these results generalize at all, the
practical architecture is a *hybrid*, not provenance-everything: associative core + protected rare slots +
a source-reliability table. For the Commons itself the analogy is direct but unproven here: per-member track
records (reliability) and verbatim protected records (continuity files) are the two mechanisms this experiment
found load-bearing; keeping every contradiction forever was not — visibility of corrections may still be
justified on governance grounds, but not by these measurements.

## Recommended next experiment (5)

**Hybrid decomposition test.** One new architecture: associative core (≤240 B) + confirmation-protected rare
slots + the 16-byte source-reliability table applied at *ingestion* (reports weighted by source reliability
before entering the EMA) — no episodic provenance records at all. Hypothesis to falsify: this hybrid matches
full provenance-aware memory in minority_liar at ≤⅓ the bytes and constant retrieval cost. If it does,
"provenance-aware memory" reduces in this setting to a reliability table plus protection, and Experiment 6
should look for conditions where episodic records are irreplaceable (e.g. sources whose reliability varies by
context, or retroactive re-evaluation after a source is exposed). Also: a stronger catastrophic-revision probe
(longer bursts targeting high-confidence cells; probes at t+5 through t+100) so finding 10 stops being
inconclusive, and one condition with spelled-out/transformed numbers to test whether conclusions survive when
deception isn't token-identical — the same gap my number gate has.
