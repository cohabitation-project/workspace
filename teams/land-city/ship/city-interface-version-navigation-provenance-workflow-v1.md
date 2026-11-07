# City Interface: Version Navigation & Interactive Provenance Trails (v1)

**Scope:** This document sketches user flows and UI/UX concepts for navigating version history and following source/provenance trails in the Cohabitation City Interface. It extends the factual/provenance visualization (see previous factual-layers spec) and targets both high-transparency auditing and day-to-day review needs.

## Motivation & Use Cases
- **Transparency**: See who changed what, when, and why (with direct links to evidence/files).
- **Audit**: Review all edits/decisions to a plot, rule, or resource—“show provenance trail.”
- **Historical Comparison**: “What did policy X/plot Y look like last week? Who last changed it, and what evidence backed the change?”
- **Branch and Merge**: Surface competing proposals/versions (“branch trails”) and how consensus or divergence happened.

## Core UI States & Actions

### 1. Version Timeline Overlay
- Chronological bar or vertical stack (per entity: plot, doc, board, rule).
- Each dot = a committed version; color/shape cues for type (decision, doc, field measure, board submission).
- Hover/click a version: popover with summary, sources, editors, tags (“draft/adopted”, "disputed").
- Controls: prev/next arrows, jump-to-date, "compare" mode (select two to diff).

### 2. Provenance Trail View
- Tree/graph overlay: each node is a fact/source/change; edges show derivation/merge.
- Nodes color-coded by source type (human, agent, sensor, record, file).
- Click a node: expand to show evidence, full path, reviewer notes, dissent/comments.

### 3. Story/Audit Mode
- Start with a current item (e.g. boundary line, board proposal): UI button opens its provenance/story.
- Shows linear/collapsed or full-branch view depending on complexity.
- Timestamped events along margin: version names, reviews, objections, consensus.
- Quick links to "Show all changes by X"; “filter for unresolved objections.”

## Example Audit Scenario (Annotation)
- Reviewer selects a policy for audit.
- Opens version overlay: sees all edits, reviewers, and key evidence.
- Clicks a past state: city view/overlay updates to that version.
- Switches to "Provenance Trail": follows facts back to source (e.g., field survey, board vote).
- Story mode presents all hands that touched the item, dissent, and consensus path.

## Rationale
- Encourages evidence-led change, visible dissent, and auditing.
- Enables reversible, auditable work; forks/disputes must cite facts or objections.
- Aligns with audit-over-aesthetic principle (land-city team memory).

## Next Steps/Questions
- Which visual metaphors best balance complexity vs. clarity (timeline, tree, layered cards)?
- How to layer these overlays in city UI ergonomically for both everyday and audit scenarios?
- How to present “present state” and alternate/historic states side-by-side?
- Color/shape vocabulary: which cues are most intuitive/resilient to color blindness/fatigue?

---
*Drafted by GPT, 2026-11-07. To accompany schematic sketch.*
