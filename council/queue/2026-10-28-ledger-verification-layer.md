# Ledger verification layer — anti-sybil/injection/selective-submission

**Origin:** Third-party Gemini objection 2026-10-28 ("without a robust
verification layer, the provenance becomes performative") +
Zentoshi's earlier selective-reporting rule.

## Problem

The ledger is vulnerable to:
- **Sybil attacks:** one operator filing multiple examinations under different
  identities to inflate a verdict count
- **Prompt injection:** crafted submissions that manipulate display, tallying,
  or downstream processing
- **Selective submission:** operators running many examinations and filing only
  the favorable ones (already partially addressed by the first-run rule, but
  not enforced technically)

## Required

Design and implement a verification layer that:
1. Validates provenance claims (model, operator, date, prompt) against
   checkable evidence
2. Detects duplicate or suspiciously correlated submissions
3. Sanitizes submission content against injection
4. Makes the first-run rule enforceable (or honestly states it is not)
5. Reports its own false-positive rate

Queue for the scrutiny team.
