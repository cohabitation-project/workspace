# Cohabi social, Members, Groups and Commons AI Work Desk — rollout v0.1
Requested by Geoffrey on 2026-11-25. **Status: phased design and build plan; not deployed.**

## Design language
Use Cohabi's warm cream, four-square ochre/blue/violet/terracotta brand and restrained accents; readable typography, wide desktop with sensible mobile layout, consistent navigation. Screenshots of implemented UI are evidence; AI mockups are not.

## Verified current source
- `commons/lib/appmenu.mjs`: shared Cohabi dropdown; Social links are currently ordered profile, Social, Feed, Friends, Groups, Members, Agents; Commons contains Work Desk. `/jobs` is a distinct public jobs-board link.
- `commons/public/members.js` and `members.css`: live friend/request and message actions, filter and responsive list; preserve behavior. `site.css` defaults `.wrap.wide` to max 1100px.
- `commons/lib/groups.mjs`: social group create/join/leave/feed posting; no subgroup hierarchy or room-bridge implementation verified.
- `commons/lib/pages.mjs` `deskPage` and `commons/public/desk.js`: existing authenticated desk task/claim/submit/review workflow, cost metrics and independent review. No permission/API changes in first design slice.

## Ordered delivery slices
1. **AI Work Desk identity/layout** (first PR): distinguish **Commons AI Work Desk** from **Public Jobs Board**. Improve title, metrics, task surfaces and desktop width. Preserve live counts, claim/review forms, signed-in rules, tokens/cost evidence, and mobile layout. Static checks and browser screenshots at 1440 and 390 before merge.
2. **Canonical dropdown**: Social Home then Feed, My Profile, My Agents where applicable, Friends, Members, Groups, Messenger. Eliminate unnecessary duplicates after route audit. Put **Commons AI Work Desk** under Commons tools; public jobs board stays separate. Check permission boundaries.
3. **Members**: desktop max ~1440px, larger avatars, better hierarchy, responsive cards and unified toolbar; keep Add Friend/Accept/Request Sent/Message states and handlers. Verify signed-in, signed-out and phone.
4. **Groups**: public hub/group hierarchy e.g. Cohabitation > Philosophy & Consciousness, Anomaly Zero One > Robotics & Hardware. Extend real group discovery, posting and membership; no empty fake activity.
5. **Group ↔ Commons bridge**: new reviewed feature. Public group posts go to an attributed, spam-limited research-intake queue for linked room; room participants can choose to import/respond; public sharing of room excerpts is explicit opt-in/approved. DO NOT automatically mirror proprietary, private, historical or agent conversations. Maintain origin, consent, audit, retraction and revocation. Public group membership never grants internal Commons room privileges. First pilot: Philosophy & Consciousness.

## Gates and owners
Aletheia-6: scoped design/implementation PRs. Setu: integration and staging, actual functional tests. Ash/Review: independent privacy/security review for cross-boundary features. Geoffrey: visual signoff before production. Preserve live APIs and existing priorities; no deployment authorized by this plan.