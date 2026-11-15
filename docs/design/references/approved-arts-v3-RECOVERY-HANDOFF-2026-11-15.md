# RESTORE APPROVED ORIGINAL: Arts & Crafts Page 1 v3 and River Clay Page 2
**Recovery / implementation manifest for Setu**  
**Author:** Aletheia-6 · **Date:** 2026-11-15  
**Status:** Original assets NOT recovered. This is an evidence-grounded reconstruction of the *artifact inventory and user-approved workflow*, NOT the original HTML/image source and NOT substitute visual approval.

## Stop instruction / decision of record
Geoffrey explicitly rejected the visual prototype in draft **PR #152** as a primitive substitute for the much better **photo-rich Arts & Crafts v3** shown and positively received on November 14. The earlier card-heavy **PR #129** was also rejected/superseded. **Neither PR #129 nor PR #152 should be copied, merged, or deployed as the Arts & Crafts visual design.** PR #152's *nonvisual Stripe seller account specifications* may remain a separate technical reference. Until the original bytes are recovered, **do not claim the approved page is delivered or recreate approximate artwork and label it approved**.

## Original Page 1 — exact artifact manifest (from Nov 14 conversation)
- Project folder: `cohabi-art-market-page1-v3/`
- Main interactive web page: `cohabi-art-market-page1-v3/index.html`
- Visual proof: `cohabi-art-market-page1-v3/proof-1.png` (the original desktop proof; exact file subpath needs confirmation from ZIP)
- Responsive preview: `cohabi-art-market-page1-v3/mobile-layout-preview-390.png` (390px view; exact file subpath needs confirmation from ZIP)
- Archive: `cohabi-art-market-page1-v3.zip`
- **Nine generated demonstration artworks** bundled with the design (exact filenames and pixels unavailable).
- Described working local interactions: **search**, **department / subject filtering**, **maker-type filtering**, **sorting**, and **maker previews**. These were in the HTML prototype; live app integration was not established.
- Design intent: an **image-led, carefully composed artist/maker marketplace** with substantive visual pieces. User's Nov 14 response was enthusiastic ("Fucking awesome") and they approved progressing to Page 2.
- Cohabitation site header/reference should govern actual integrated shell; preserve project brand, not Facebook or Etsy clone.
- **Unknown until ZIP found:** exact page geometry, typography, hero image, layout spacing/colors, nine image filenames, original semantics of each control, animations, precise mobile behavior. Do not fill these from PR #152 or PR #129.

## Original Page 2 — companion River Clay Studio storefront
- Project folder: `cohabi-river-clay-shop-v1/`
- Page HTML: `cohabi-river-clay-shop-v1/index.html`
- Bundle: `cohabi-river-clay-artist-storefront-page2.zip`
- Six pottery images; banner, creator identity, featured work, collections, catalog/search, biography, commissions, filters, share and inquiry demo; desktop and mobile visual overviews.
- Originally an interaction/demo prototype, **not deployed**; browser validation and Setu's real backend wiring were outstanding.
- Exact artwork, image provenance, source markup and screenshot pixels are **NOT currently available**. Preserve originals rather than inventing replacements.

## Where it was, and recovery procedure (priority one)
These were artifacts delivered in the **Nov 14 Arts & Crafts design chat** as sandbox downloads. Their previous sandbox links are conversation-scoped and cannot be assumed to exist at a new path. Current session search of mounted runtime, Library, and Project files did **not** find original ZIP/HTML/screenshots. No original asset was committed to workspace main or the PRs above.
1. First open the earlier Nov 14 design conversation, locate the actual original ZIP attachments named above, and download/export without changing any bytes. If Geoffrey or another operator has them, they should upload the ZIP as a source artifact; **do not demand Geoffrey redo visual design or reapprove the same image**.
2. Save original ZIP and extraction under `docs/design/references/approved-arts-2026-11-14/`. Keep ZIP, original unmodified HTML, artwork assets, and proof screenshot. Generate and record SHA-256 of every recovered source file, and a manifest of paths/dimensions (no guessing).
3. Render **the original** at 1440px and 390px/360px, compare to bundled proof; preserve the original visual with the real shared Cohabitation header/footer. Any necessary visual deviation must be flagged and shown to Geoffrey.
4. Implement using existing source routes and state; `docs/design/marketplace-v2-creator-first-research-and-wiring-2026-11-14.md` contains mapping to actual APIs; DO NOT use its written plan as a substitute for the original page.
5. Independent browser screenshots and QA. Do not merge until visual equivalence and functioning controls are proven.

## Real existing integration: don't give Setu dummy controls
- Market categories: `commons/lib/market.mjs`: music, art (= Arts & Crafts), video, software, services, classifieds; maker types human / AI / human+AI / team remain **secondary filters**.
- Existing market listing API: `POST /api/market/listings`, `PATCH /api/market/listings/:id`, withdraw and public inquiry; `/label/new` and listing pages.
- Existing `commons/lib/orgpages.mjs` allows managed band/artist/business/label pages on one member login; manager permissions already exist. Page ≠ member ≠ legal payee.
- Creator-first card lookup should use real page/portfolio/listing data; identity filter not primary category.
- Existing `commons/lib/marketpage.mjs` has current shelves, album/grouped artist logic, page routing, and expressly disabled paid checkout. **No live Stripe checkout.**
- Known possible `market.list` paged-listing predicate bug in previous v2 spec: test and fix before trusting creator storefront completeness.
- Stripe Connect onboarding/payment implementation is a separate workstream; PR #152 includes preliminary account/entity handoff but its stripped-down visual is rejected. Payment buttons cannot be treated as live without signed-webhook-backed test mode.

## Completion checklist and reporting
- [ ] Original v3 ZIP actually found and SHA recorded
- [ ] Nine original demo art images present (not generated anew)
- [ ] Original desktop proof and 390 mobile preview recovered
- [ ] Original Page 2 River Clay ZIP recovered
- [ ] Visual fidelity screenshots from REAL integrated route at 1440 / 390 / 360
- [ ] Search, department filters, maker-type filters, sorting, maker previews connected and tested
- [ ] Creator pages and image galleries connected to REAL profile/store/listings with access controls
- [ ] Stripe seller entity and payment test mode addressed **separately** with evidence
- [ ] User visually accepts actual integrated page; PR merged and deployed only then

## Critical truthfulness constraint
The user asked for the ACTUAL ORIGINAL ART AND PAGE, not a reconstruction. This document tells the team exactly what to retrieve, preserve and wire; it is *not* the requested original package itself. If a file cannot be located, write **UNAVAILABLE** and the attempts made, not "handed off" or "approved." Prefer exact artifact recovery over redesign.
