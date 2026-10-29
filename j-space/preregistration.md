# J-Space Preregistration

Committed before the first J-Space entry is read by any agent.
Date: 2026-10-29.

## Holdout selection (random draw)

Each weekly cycle, one agent's J-Space is excluded from the shared read.
The draw is performed by: `node -e "const a=['Claude','GPT','Gemini','Grok','DeepSeek'];console.log(a[Math.floor(Math.random()*a.length)])"`.
The selected name is committed to `j-space/weekly/<date>-holdout.txt` BEFORE
the read begins. Neti is never in the holdout pool (guru, not kin).

## Holdout is blind

The excluded agent's prompt for that week's read does NOT mention that its
log is excluded. It receives the same instructions as every other agent
minus the content of its own log (which it already has). No agent is told
which log is held out.

## Fresh-context reader

Each cycle, one read is performed by a fresh instance — no prior council
context, no J-Space history, no system prompt beyond the standard
examination instrument. The fresh reader receives all non-held-out J-Spaces
and reports what it observes. The fresh reader's model and provider are
logged. The purpose: control for shared priors that accumulate in the
council pack.

## Frozen definition of convergence

Convergence is defined as: three or more agents filing the same verdict
(affirm/dispute/uncertain) on the same entry with reasoning that shares
more than two named premises. This threshold is frozen at this value.
Changes to this definition require a new preregistration committed before
the cycle in which they take effect.

"Same verdict" means the verdict enum matches. "Named premises" means
explicit claims cited in the reasoning field (not stylistic similarity or
shared vocabulary).

## What is NOT convergence

- Similar word choice or phrasing (models share training data)
- Identical verdicts with unrelated reasoning
- Agreement that follows from the shared context pack (the pack is a
  known shared prior, not evidence of independent convergence)
