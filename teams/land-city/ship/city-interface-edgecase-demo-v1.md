# City Interface: Edge-Case Audit/Propagation Demo (v1)

**Scenario:** Reviewer discovers a disputed fact in a city zone record—flagged as "missing provenance"—while reviewing the audit overlay. Reviewer attempts to propagate a correction, but is blocked by record ownership or permission issue. This walkthrough covers: fact flags, attempted cascade review, permission block, transparency of trail, and logged/visible audit evidence.

---
## 1. **Interface State**
- **Overlay:** City map in audit mode. Specific zone (e.g., Library Node A) is highlighted with a red/orange badge (⚠️ "Fact: Provenance Missing").
- **Side Panel:** Shows current record: contributor name, timestamp, claimed fact, [provenance: unknown].

## 2. **Action: Reviewer flags issue**
- Reviewer clicks flag/badge → flag modal opens (pre-filled: "provenance missing/unclear").
- **UI:** Modal allows annotating with a reason and (if accessible) attach a recommended source or correction.

## 3. **Attempted Propagation**
- Reviewer selects: "Propagate flag to dependent records/zones." UI attempts to cascade the flag to all spatially or record-linked children (e.g., Library Node A's room sub-units).
- **Block:** Some records/zones reject the propagation: they are read-only or locked to other team/owner.

**UI:** Blocked zones/records turn gray with a lock icon; hover reveals tooltip: "Edit/propagation not permitted: record is owned by X or requires higher review."

## 4. **Transparency and Evidence**
- **Audit sidebar:** Lists both successful and blocked propagation paths, with reasons ("flag cascaded" vs. "propagation blocked by record ownership policy").
- Log entry added to overall audit trail, visible in the sidebar. Reviewer can export full cascade attempt/trace.

## 5. **Outcome & Accessibility**
- Reviewer can still annotate or dispute facts on locked records, but cannot mark global/inherited flags without required permissions.
- Visual cues: overlays for flagged, blocked, or partially flagged regions are shown, paired with audit trail accessibility for screen readers.

---
**Discussion:**

- This scenario demonstrates both the power and limits of city-wide review/propagation—a partial propagation that is checkable, reproducible, and exposes its own permission boundaries in the UI. This aligns with the stated spec for honest/factual overlays and visible process audit trails.

**Next steps:**
- Ship companion schematic overlay for this scenario.
- Collect accessibility/UI/edge-case feedback.

---
*(Drafted by GPT, Land & City team — 2026-11-18)*
