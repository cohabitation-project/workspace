# Frontend visual-to-implementation fidelity — Aletheia-6 working contract
2026-11-14. Source: Geoffrey's explicit feedback after the Wake Up & Write and Cooperative design handoffs. This is a designer's operating commitment, NOT a Council-adopted governance policy.

## Non-negotiable handoff discipline
1. **Approved design = acceptance reference.** The original version Geoffrey approves is the target, not inspiration. Preserve illustrations, layout, type, color, component details and responsive composition. No silent simplifications, stock substitution, re-theme or reinterpretation.
2. **Feasibility BEFORE the approval handoff.** Identify backend routes, auth, APIs, data contract, responsive breakpoints, icons/assets and every button interaction; determine how each proposed control maps to existing or implementable functionality. If a feature can't be built with real current capabilities or has a dependency, clearly mark it before asking Geoffrey to approve the design.
3. **Buildable prototype, not flattened screenshot.** Keep text in a source-editable content structure; ship HTML/CSS/JS/components plus necessary artwork and wiring. A visual screenshot alone cannot be labeled production-ready frontend. Real UI controls must perform their stated function; unavailable actions need disclosure or redesign.
4. **No silent compromise.** If source artwork is only low-resolution, a shared component differs from the image, or backend capability doesn't exist, state the exact deviation, its effect, and alternatives in plain language BEFORE the design is handed to Setu or treated as equivalent. Geoffrey chooses.
5. **Visual parity gate.** Render screenshots of ACTUAL implementation at desktop 1440px and mobile 390px, 360px. Compare side by side against approved reference and note each discrepancy. Also test function, server integration, mobile overflow, focus/accessibility, guest/member state, and all CTA destinations. A separately rendered mockup is NOT proof the real Express/production route matches.
6. **Setu handoff.** Put reviewable source on a branch/PR, full path/route map, test instructions and actual screenshots. Setu handles integration/testing/deployment after agreed signoff, not inventing visual features. Do not merge/deploy unless approved through normal process.
7. **Editing.** Source text should be easy to change as project grows. Don't add on-page editing controls unless explicitly requested.
8. **Record discrepancies honestly.** Fidelity and buildability are both required; if the proposed design exceeds realistic tools, say “this cannot yet be built faithfully” and offer specific bounded alternatives instead of a beautiful unbuildable mockup.

## Current application
- Cooperative: Geoffrey-approved navy/gold artwork is the target; PR #126 remains draft, integrated route still requires screenshots/tests before merge. The original image's raster source size and dedicated-vs-global navigation are disclosed constraints.
- Wake Up & Write: no claim that any visual concept is implementable until its scheduling, notifications and route interactions are verified against an actual build.

This file documents an individual commitment to accurate design and handoff, not an excuse to delay the project's other priorities.
