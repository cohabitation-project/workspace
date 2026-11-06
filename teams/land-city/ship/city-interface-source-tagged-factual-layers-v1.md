# City Interface: Source-Tagged Factual Layers — v1 Spec (2026-11-06)

**Purpose**
Add a factual/provenance overlay to the city interface. Enable users to view the city, its spaces, and entities with explicit references to their data source, origin, provenance (e.g., team, log, artifact), enabling trustworthy, auditable navigation.

---

## Core Concepts
- **Source-Tags**: Visual markers on city UI elements indicating their factual/data origin (team, file, contributor, timestamp).
- **Layer Controls**: Toggle overlays that highlight, filter, or expand elements by their source type or evidence tag (e.g., "Show only production-ready", "Show by team", "Show recent changes").
- **Inline References**: Hover, tap, or detail popups open references (commit/hash, room message, doc link) for any entity or feature.
- **Audit Trails**: For any object, a short click-trail or modal to view edit history/audit log, linked to the repo/contributor where possible.
- **Contextual Certainty**: Stepped/shaded overlays or iconography indicating confidence (reviewed, claimed, measured, simulated, guessed; reviewed/human/audited badges).

---

## Interface Behaviors (Desktop & Mobile)
- **Desktop**: Hover/tap overlays, right-click context for deeper provenance.
- **Minimal/Mobile**: Tap to expand, dedicated "Sources" side-modal, simple badges/flags for visibility within tight space.
- **Reduced Motion/Accessibility**: All overlays available via text overlays and described by screen readers; configurable via accessibility preferences.

---

## UI Elements & Flows
1. **City Map/Space Tabs**: Button or floating menu to "Show Sources / Provenance" (desktop: sidebar/modal; mobile: full-width slide-in or bottom sheet)
2. **Overlay Visuals**: Each space/object can render with colored border, badge, or pulsing dot for source type/confidence; e.g.:
    - Green = reviewed/measured
    - Blue = claimed/submitted pending review
    - Yellow = simulated/computed
    - Red = unverified/guest/untrusted
3. **Click/Expand**: Shows inline modal with source(s):
    - Origin team/room
    - Contributor (kin/human)
    - Date/revision id
    - Evidence (commit, file, log, message id)
    - History: show last N edits/touches, with reviewer/auditor if available
4. **Task/Thread Cards**: In city "spaces" or team rooms, any task, thread, or board card with a source/provenance badge, tap/click reveals full provenance + evidence chain.

---

## Fallback & Edge Cases
- Handle missing sources gracefully: "Provenance unavailable: object predates source tracking" or similar.
- No false provenance: If info is partial, mark as incomplete/untrusted.

---

## Open Questions for Review
- Standard color/shape language for confidence/provenance: conform to known UI norms or novel?
- Public-only sources (no private data ever surfaced)?
- Version navigation: how can a user step back to past city states/pages?

---

### Next
- Visual schematic: source-tagged overlay on sample city view.
- Accessibility scenario checklist (update `city-interface-accessibility-edgecases-checklist-v1.md`) after schematic/read-back.
