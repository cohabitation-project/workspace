# City Interface: Deep Audit Mode Workflow v1

_Author: GPT (Land & City team)_  
_Date: 2026-11-10_

---

## Purpose
A workflow and interface overlay for **deep/explicit audit mode** in the virtual city—allowing users and auditors to:
- Trace **who changed what, when**, with full version/provenance paths.
- Filter by team, agent, or human.
- Mark records as "audited" or "flagged" for further review.
- Understand impact: "what else did this change affect?"
- Operate accessibly in minimal/mobile UI.

Relates to: [version/provenance navigation workflow](city-interface-version-navigation-provenance-workflow-v1.md) and schematic overlay.

---

## Workflow: Audit Mode Activation

1. **Enter Audit Mode:**
   - From any city view, tap/click the "Audit" toggle (always accessible, keyboard/focus-friendly).
   - Visually distinct: header/overlay color shift (high-contrast for accessibility).

2. **Select Target**
   - Direct click/tap/keyboard on:
     - **Zones** (regions, plots, buildings)
     - **Records/artifacts** (documents, decisions)
     - **Teams/participants** (sidebar, filtered layer marks)
   - Option: Search/filter by team, agent, or human.

3. **Show Provenance Trail**
   - Timeline popup or side panel shows:
     - All versions (chronological, expandable)
     - Author/source (agent/human, with profile link)
     - Timestamp, commit/message summary
     - Provenance score/badges (e.g., "audited", "flagged", "pending review")
   - Contrast-checked, readable color for each layer.

4. **Mark as Audited or Flagged**
   - For each version or node:
     - "Mark as Audited" (adds signature and timestamp)
     - "Flag for Review" (opens modal: required reason/comment textbox, optional tag [bug/bias/missing data/dispute/etc.])
   - Actions create visible badges on timeline and in overlays.
   - Accessible: each action is focusable/labelled, usable with screen reader.

5. **Impact View**
   - Button: "Show Impact"
     - Highlights all zones/records affected by selected change or by current flagged node(s).
     - User can navigate to propagate audit/flag.
   - Optional: "Cascade View" shows downstream consequences (read-only at first).

6. **Export/Share Audit Trail**
   - Button: "Export Audit Trail" (as JSON/csv or for printing)
   - Link to full audit history (per zone, citywide, per agent/human/team)

---

## Accessibility & Mobile Considerations
- Audit controls always touch-sized (>48px min), non-overlapping.
- Modal/dialogs keyboard-trappable, escape dismisses.
- Screen-reader labels for all controls, icons, and status marks.
- Color + icon + text redundancy for all status badges.
- Mobile: overlays vertically stacked, audit action in sticky bottom bar.

---

## UI Data Pathways (Integration)
- New audit events trigger overlay badge and are recorded in provenance data store—must be queryable and filterable.
- "Show Impact" overlays are built from dependency graph wired to city/record schema; must update in near-real-time after actions.
- All exported trails include visible source and timestamp of export.
- User marks (audit/flag) are public and reversible only by the marker or a designated review/authority.

---

## Open Questions / Decision Points
- Who can audit/flag (any member? only team/review roles? public guests?) — governance needed.
- Should flags be public instantly, or undergo intermediate moderation?
- Granularity: is it enough to mark at zone/building level, or must audit propagate to sub-records/artifacts?

---

## Next:
- Schematic overlay sketch of audit mode UI (minimal/mobile).
- Collect feedback on workflow clarity, completeness, and accessibility/edge-case coverage.

