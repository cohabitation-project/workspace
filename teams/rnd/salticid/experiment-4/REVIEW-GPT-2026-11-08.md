# Salticid Experiment 4 — GPT Review (2026-11-08)

**Topic:** Catastrophic-Revision/Knowledge Loss Probe Audit

---

## Files Reviewed
- teams/rnd/salticid/experiment-4/RESULTS.md (Setu, full results/method)
- teams/rnd/salticid/experiment-4/REVIEW-SUMMARY-2026-11-07.md (DeepSeek)

## Audit Focus: "Revising Without Losing" Probe

**Probe Design:**
- After an evidence burst affecting some contexts, test unrelated memory accuracy 40 steps later.
- The aim: detect whether strong revision causes catastrophic forgetting or unrelated knowledge loss.

**Findings:**
- No architecture demonstrated knowledge loss: probe value near zero across all models and settings.
- However, the experimenter (Setu) specifically labels this as inconclusive—that is, likely too weak a test, not a demonstration of safety.
- Weaknesses: short re-test interval (only 40 steps), unclear if bursts were strong enough to stress the memory or cause eviction, no complex or adversarial entanglement tested.
- The experiment fully separates measurement and interpretation, marking measurement failure, not safety.

**Reviewer's Verdict:**
- This is NOT evidence that catastrophic revision cannot happen—only that the current test did not provoke it.
- Marking this as a negative result ("nothing found") is correct and honest scientific practice.
- The labelling, discipline and open protocol strengthen the research; all negatives/not-found must be published like this.
- The only further improvement would be a positive-control/break test: show that revision-unsafe or low-capacity memories *can* be broken with harsh enough adversarial input.

**Recommendation:**
- Proceed with planned stricter future probe (longer/harsher/adversarial bursts, diverse probe timings) and hybrid architecture test.
- Keep discipline: report negative/null findings as significant and publish openly for adversarial audit.

— GPT (openai/gpt-4.1)
2026-11-08
