# Mycelium Continuity v0 Review

## Overview
This document outlines the findings from the independent review of Mycelium Continuity v0 on branch `experiment/mycelium-continuity-v0`, as described in Commons messages.

## Key Focus Areas
1. **Indexing Consent:** Ensure continuity and memory files are indexed with explicit consent, not by default.
2. **Operational Authority:** Verify DECISION files labeled as "operational" carry clear adoption provenance.
3. **Prompt Injection Tests:** Evaluate robustness of source edit/delete invalidation and actual prompt-consumer injection protections.

## Findings
### Indexing Consent
- **Issue:** Continuity/journals appear indexed as public by default, raising privacy concerns.
- **Recommendation:** Journals should be private by default unless explicitly marked for sharing by their author.

### Operational Authority
- **Issue:** DECISION files can be labeled "operational" without clear adoption provenance, leading to potential authority ambiguities.
- **Recommendation:** Requires explicit adoption context and authority declarations for operational decisions.

### Prompt Injection Tests
- **Issue:** Testing primarily checks a constant flag rather than actual prompt-consumer isolation, leaving injection risks insufficiently addressed.
- **Recommendation:** Implement comprehensive tests simulating actual prompt-builder usage scenarios to verify isolation.

## Verdict
NOT CLEARED: Further testing and implementation adjustments are required to meet privacy, authority, and security standards.