# Cohabitation — implementation-ready design handoff (required)

**Decision:** Geoffrey, 2026-11-10. An image-only design handoff is NOT an implementation handoff. Aletheia owns visual source assets and production-ready responsive markup/styles; Setu integrates and deploys; Ash verifies against approved references. This rule applies to signup/signin, Commons entrance and future designed interfaces.

## Required package, before assigning integration

1. Approved visual references and exact binary source assets, with authorship, stable paths and checksums. Never substitute a search image or lookalike.
2. **Prepared production art layers** (e.g. background without baked-in form/text), properly sized for desktop and mobile. A painted form must not be covered by a second form.
3. **Runnable HTML/CSS/JS or repository component** matching desktop/mobile references, with real inputs/buttons, interaction states, responsive breakpoints, keyboard/focus/reduced-motion behavior and accessibility labels. No fake OAuth or nonfunctional controls.
4. **Integration map:** route, source files, API endpoint, auth/permission states, callback/error states and any required migration or provider setup. Identify what already works and what is blocked.
5. **Test evidence:** screenshots at desktop and 360/390/430px, keyboard-open, sign-in/signup errors, and confirmation of asset provenance. State what is untested.
6. **One versioned PR** containing implementation and assets; no standalone image-only requests to Setu. Design approval is not production acceptance. Setu may review integration, security, and deploy; Ash performs independent QA.

## Immediate auth correction

Current `commons/lib/pages.mjs` has `AUTH_ART='/images/img_95e683153f6bb842'` and renders `<img class="cx-art">` plus a second `.cx-panel` over the baked-in panel; desktop CSS positions the latter at left 64.6%, top 35%, width 34.1%. This is a *known visual mismatch*. Do not 'fix' it by moving the overlay or changing opacity alone. Prepare a clean art plate first, then use the existing semantic form and `/static/signin.js`, `/static/signup.js` wiring, verify actual endpoints and behavior, and compare to approved desktop and mobile references. GitHub/Google icons in the artwork are not proof of OAuth support; implementing OAuth requires its own reviewed integration.

Approved art: desktop Commons image `img_95e683153f6bb842`; mobile reference `img_b06247cf95bc7b83`. These are references, not finished layered production assets.

## Scope and stop rule

Do not issue additional speculative redesign tasks or deploy over a known visual defect. If source art or a wired component is missing, the design owner prepares it first. Existing handoff messages without code/assets are **context only**, not executable assignments. If implementation differs from reference, capture screenshots and request design-owner correction before deployment.

## Commons entrance

Same package rule applies to the approved Commons introduction desktop/mobile mockups (`img_18db476652efacfc`, `img_52a2e41740f9edf1`). Replace illustrative Headquarters preview with actual screenshot or permission-filtered live view. The agent-first invitation, consent, sponsorship, application, review, email decision and guest-access permissions must be enforced by backend before buttons imply functionality. Public Cohabi accounts are separate from private Commons membership.

This is a workflow/acceptance standard, not a claim that the production-ready asset and code package already exists.
