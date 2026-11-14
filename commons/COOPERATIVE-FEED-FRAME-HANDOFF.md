# SETU — Approved Cooperative UI implementation handoff — Nov 14, 2026

## Ground truth
Geoffrey approved the midnight-navy page, NOT the earlier cream page. Approved original: https://ashram.lastoftherealestate.com/images/img_81d6479b6e6d9fcb
Working-source screenshot previews, NOT production: desktop 1024 https://ashram.lastoftherealestate.com/images/img_bcaaa1c7bce8f51f ; mobile 390 https://ashram.lastoftherealestate.com/images/img_c41ed3e819279bb1 ; mobile 360 https://ashram.lastoftherealestate.com/images/img_a73fd6072e77b5d0
These screenshots come from an independently rendered STANDALONE HTML/CSS package using exact artwork crops, not from this Express PR or from production. Playwright reported no JS errors, no missing content and zero horizontal overflow at 1024, 390 and 360. This PR has NOT been run in a browser or against the live server.

## What the PR contains
- New midnight/navy/gold layout in commons/public/coop.css (not the previous cream mockup).
- Actual separate artwork from the approved original, stored in Commons image library at same-origin /images/img_* URLs; not generic substitute SVGs. This includes the hero, globe, 3 future images, cabin, Commons arches, Market tents and footer mountains.
- Source-editable text in ONE server file, commons/lib/coop.mjs, within its const body article template. The separate Council Markdown remains the reference but is not auto-synced. No in-page edit controls.
- Link actions remain anchors to /arrive /join /headquarters /feed /commons, plus real sign-in and account links. Search-shaped link currently opens /feed for browsing; DO NOT pretend that is an operational search API.
- Dedicated approved-look header/footer with real links, not the current feedv2 global header/footer. This is a disclosed architecture difference: the screenshot-approved nav DOES NOT MATCH current shared appHeader/bottomNav. Do not assert they are shared or alter all other pages silently.
- Two-column findings and globe, future cards with artwork banners, cabin-left/pledge-right, paired cooperative + hub text, illustrated Commons/Market cards, mountains at door. Mobile 360-430 gets stacked layout and full-width 46px CTAs.

## Material limits
The approved original is a 1024x1536 generated screenshot, not separately generated high-resolution art. Crops are exact source pixels, but a few can look soft when enlarged. If you need clean 2x originals, discuss with Geoffrey; NEVER silently swap in approximations again.
The static standalone package and screenshots show the design and verify responsiveness; this Github PR version requires independent rendering, regression tests and signoff before merge.
The explored /explore link needs explicit deployed-route verification. Search icon browses the feed, not a real search implementation. Other application pages keep the existing nav until separately approved.

## What Setu does
1. Run node --test commons/test/cooperative-frame.mjs and existing front door/feed tests.
2. Render this exact PR from running Express at 1440, 1024, 390, 360px, both guest and member. Screenshot before merging.
3. Audit links, assets, source-copy updates and no horizontal scroll / hidden content / duplicate baked text.
4. Hand actual screenshots to Geoffrey for comparison and approval; PR stays draft until then. No deployment by designer.