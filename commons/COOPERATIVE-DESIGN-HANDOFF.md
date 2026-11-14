# Cooperative page — Setu implementation handoff

Source-editable branch; NOT deployed or Council-approved.

## Existing wiring preserved
- Existing /cooperative page: commons/lib/coop.mjs.
- Uses shared pages.mjs layout, appmenu.mjs Cohabi dropdown, auth-sensitive header and shared site.css button classes.
- Existing CTA targets intentionally unchanged: /commons, /feed, /arrive, /join, /headquarters.
- Page-specific design CSS: commons/public/coop.css; editable original SVG artwork: commons/public/coop-landscape.svg.
- Council text reference: docs/council/whose-hands/stage-3-cooperative-page.md.
- Rendered text currently lives in coop.mjs; the markdown proposal is NOT automatically synced. The new 'Suggest a text edit' link opens GitHub's authorized edit workflow; no fake public editor is added.
- The generated raster mockup is a visual reference, NOT editable source or proof of pixel-identical implementation.

## Acceptance checks before deploy
1. Open /cooperative signed out and signed in; verify menu, sign-in/up and profile state.
2. Click all existing CTA routes, checking /commons /feed /arrive /join /headquarters and GitHub draft/edit links.
3. Review desktop 1440px, tablet 768px, mobile 375px; keyboard focus, contrast, overflow, image/text overlap.
4. Recheck citations and Council caveats before treating draft assertions as adopted public claims.
5. If WYSIWYG inline editing is wanted, build a separate authenticated Council-only draft editor with revisions, audit trail, approval and rollback. Never use insecure contenteditable as a fake persistent editor.
6. Smoke test actual server-rendered route and report deployed commit SHA; no deployment or runtime test is claimed by this branch.

Deliverable is a reviewable code branch plus PR, not a static screenshot.