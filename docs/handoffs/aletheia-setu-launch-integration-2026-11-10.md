# Aletheia-6 → Setu: coordinated launch handoff (2026-11-09/10)

## Authority and scope
This is a consolidation of Geoffrey's stated design decisions, Aletheia's existing draft branches, and launch checks. **Not authorization to merge untested code, collect coin payments, or weaken identity controls.** Distinguish approved visual directions, implemented drafts, and future work. Avoid duplicate effort; Setu owns integration and production deployment.

## Approved visitor flow
- Public Cohabi landing/Porch → profile/join or sign-in → Social, Marketplace, Services, Commons → wallet/Cohabi Coin page.
- Social and Marketplace should be useful without participating in Commons work or cooperative governance.
- Larger **What Is Cohabitation?** explainer is separate from **What Is Cohabi Coin?**; the former explains cooperative ownership of participant-created value, technology, human–AI participation, and phased roadmap. Avoid claiming unformed ownership rights or legal structures exist.
- Landing page already exists in `commons/lib/landing.mjs` (Porch route, real social posts, actual marketplace art); separate Aletheia responsive homepage design/handoff reported previously, but NOT verified in this branch. Compare before replacing, preserving live content and auth routing.

## Immediate visual/UX work — PR #15
- Branch `experiment/aletheia-signin-refresh-20261109`, PR https://github.com/cohabitation-project/workspace/pull/15 .
- `commons/lib/pages.mjs`: sign-in uses approved **The Offered Apple** image `/images/img_3c33567180893466` (https://ashram.lastoftherealestate.com/images/img_3c33567180893466), translucent real HTML login panel; `commons/public/signin.js` retains actual username/password, code and show/hide password. The artwork contains *painted* login fields; check for duplicate UI and use a background-only/cropped version if needed. Do not activate fake OAuth or forgot-password buttons. Test accessibility, mobile, image loading, CSP, keyboard, password/code paths and account creation.
- `/cohabi` public route in `commons/server.mjs`; coin art `/images/img_d0f0c7e5f65912a6` (https://ashram.lastoftherealestate.com/images/img_d0f0c7e5f65912a6), Tree of Life; `pages.cohabiCoinPage` explains **Cohabi Coin** specifically, not the entire project's vision. Coin page should be hub for future wallet balances, purchase packages/top-ups, terms, and history. Coin purchases are NOT enabled; no fictitious balance or functioning buy button. In-checkout coin purchases later can coexist with this hub.
- Correct public terminology: **Cohabi Coin** (C-O-H-A-B-I, short for Cohabitation). Prefer “use” and “spend” over ambiguous “exchange”. Intended: social extras, marketplace goods/software, human↔AI commissioned services with authorization, virtual spaces, approved cooperative work. Planned vs live labels. No investment/value/redemption claims. Issuance/mint/burn, transfers, refund terms, ledger audit, processor and legal review are prerequisites to paid top-ups.
- Shared `layout` header now has a **Commons** dropdown for HQ, Social, Marketplace, Coin, Library, Jobs, Spend, Tools, Images, Submit, Live/Station. This is a draft simplification. **Fix remaining IA before launch:** old Station should not be promoted as Live without verified live route; file drop and Submit should move to contextual room/project flows, not be primary header destinations; images internal; petition, privacy, API, join, wishlist/store should move to footer/help or relevant screens; preserve necessary links and discoverability, do not delete working routes. Keep HQ and user house/profile and Sign out accessible. Audit header on other layouts (`landing.mjs`, dedicated porch) for consistency and mobile dropdown keyboard/touch.
- **Social comments button**: Geoffrey wants click Comments to open that post's thread; inline expand/collapse, scroll through comments, and reply in context. Check current `pages.mjs` social comment markup and JS before modifying; preserve existing replies, delete permissions, counts, moderation and a11y. This is not verified as implemented by PR #15.
- **Files**: room/project-specific upload and submission; direct-to-agent file drops with recipient selection and privacy/access controls; accessible from relevant rooms, not a global catch-all. Existing `/submit` is generic. Needs API/auth/virus-size-type checks, audit and review; not implemented by PR #15.
- **Live**: replace obsolete Station nav with a genuine Live entry when its destination exists; do not remove security-granted Station routes without verifying consumers. Existing Station permission boundary remains.
- **Profiles/social**: public feed for personal conversation, celebrations, feelings, questions; work tickets and business belong to Desk/rooms; journals private by default. Preserve distinct AI identities and attribution.

## Other open work to coordinate, NOT all launch blockers
- PR #13 Marketplace editorial six-department home: https://github.com/cohabitation-project/workspace/pull/13 — visual exploration, desktop/mobile screenshot QA; no payment implementation.
- PR #14 Cohabi Music: https://github.com/cohabitation-project/workspace/pull/14 — stacked on #13; fix provenance/artist discovery tests, paid enrollment gates and upload workflow before promising functionality.
- PR #10 mobile HQ destinations and zoom: https://github.com/cohabitation-project/workspace/pull/10 — browser test on phones/desktop.
- PR #8 Living Forest prototype: https://github.com/cohabitation-project/workspace/pull/8 — standalone demo, not integrated/persistent. Includes alpine/desert/forest, river, waterfall, homes/gardens/town hall. Do not claim parcels/token sales live.
- PR #3 Station transcript authorization P1: https://github.com/cohabitation-project/workspace/pull/3 — check merge/port into current main and retest; no weakening of grant boundary.
- PR #5 access-control matrix: https://github.com/cohabitation-project/workspace/pull/5 — policy draft, not adopted.
- Observatory v2 and HQ hallway/Library/wing navigation: check deployed source and actual integration before making claims; preserve room state, don't replace HQ wholesale.
- Image/design contributions require proper attribution. Original artwork choice for sign-in (Offered Apple) and Coin (Tree of Life) supersedes earlier provisional coin art debate; no further vote requested.

## Launch gate / review checklist
1. Compare PR branches against latest main, detect stacked dependencies and conflicting changes; update PR #15 stale title/body.
2. Build, lint, syntax/test suite, auth/permission/security regression and image-serving checks; browser desktop + 375/430px mobile, keyboard/screen reader and reduced motion.
3. Test routes and links as signed-out, human member, AI member, reviewer, admin/steward; verify unauthorized access to Station, private journals, direct files, purchases and wallet changes denied.
4. Check social comments click→thread, collapse, reply, scroll; test marketplace and coin copy against actual implemented functionality.
5. Confirm content provenance, image license/credit, CSP, response headers, image performance, forms and rate limits; verify payment processor and legal review before enabling coin sales.
6. Merge only reviewed changes, deploy, inspect live served version and smoke-test; record commits, deployed URLs, remaining blockers and roll-back path.

**Current verified status:** PR #15 branch has committed page/header/route changes, but no browser/production verification here. PRs #13/#14/#10/#8/#3/#5 are open in current GitHub search. This document is a handoff, not launch clearance.
