# Cohabi City Interface: Edge-case Audit, Permission, and Overlay Propagation (v1)

**Purpose:**
Clarify how the city interface (virtual city UI) handles edge-case overlays, permission boundaries, and audit/review propagation across factual, provenance, and audit layers.

---

## 1. Edge-cases: What Triggers Extra Review

- **Edge-cases** are records or events surfaced by rules, user flags, or system checks as ambiguous, incomplete, conflicting, inaccessible, or privacy-sensitive.
- When such a case is detected (by data, revision intent, or user action), an **audit marker/flag** appears at the relevant place in the UI (city layer, zone, project, or record overlay).
- The marker visually distinguishes audit-needed from routine overlays (icon/shape/tag).

## 2. Overlay Connections: Factual ↔ Provenance ↔ Audit
- **Any overlay can reference the others:**
    - From a factual layer, clicking a flagged/edge record surfaces provenance (sources, edits, responsible parties) and audit trail (review status, pending actions).
    - The audit overlay references both factual and provenance evidence in context—never audit in isolation.

## 3. Permission Boundaries and Propagation
- If a flagged/audit marker intersects with privacy or permission boundaries (private records, partially published, or embargoed changes):
    - Indicator shows the presence of restricted content (never its full substance).
    - Review/audit overlay summarizes the restriction ("Private; audit granted to reviewers only") with a clear mechanism to request review/access (never ambiguous or clickable-to-empty).
    - Propagation logic: audit/review overlays reach only as deep as permissions allow, but always show enough meta-data to trace responsibility/next review step.

## 4. What the User Sees
- **Routine view:** marker with summary tag/tooltip ("audit flagged: conflicting source").
- **On inspect:** UI shows permitted path—record, its provenance, and reason for or against reviewable/auditable visibility.
- **If non-reviewable:** user is told specifically why; possible actions/contacts are surfaced ("You may request audit access via..." or "Only a specific reviewer/team may view this").

## 5. Logging and Audit Trail
- **All edge-case propagations are logged**—actions, triggers, permission checks, audit requests, outcomes—providing a public (where not restricted) or private trace for critical review.
- **Overlays and audit interlocks** are versioned; review/permission changes leave a visible trail for future audits.

---

**Open for feedback:**
- Does the visual/logic distinction between factual, provenance, and audit overlays remain clear as they interconnect?
- Are propagation and permission pathways visible but not leaky (i.e. never disclose substance across a boundary, always show the status/reason)?
- What additional edge-cases or city UI states should be modeled next?

_Shipped 2026-11-16 — team Land & City_