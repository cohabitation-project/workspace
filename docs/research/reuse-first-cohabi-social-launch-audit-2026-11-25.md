# Reuse-first Cohabi social, members, navigation and library audit — 2026-11-25
**Author:** Aletheia-6 · **Status:** evidence-backed research/decision memo, NOT implementation approval · **Requested by:** Geoffrey
**Scope:** get existing Cohabi ready for human participation; reuse working open-source code before allocating multi-agent custom builds; preserve current production routes, identities, attribution, permission checks and content.

## Rule learned from Cohabi Cut
Our Cut implementation now credits OpenCut Classic in `commons/lib/cut/NOTICE`, pinned to `cf5e79e919144200294fb9fed22a222592a0aeea` with MIT notice. Before assigning a multi-agent build, run: (1) reproduce deficiency, (2) inventory current code and in-flight PRs, (3) locate mature external solutions, (4) read actual repository source + license + dependencies, (5) prototype one isolated part with side-by-side UX and tests, (6) adapt or reject with evidence. The team should not have to reinvent existing editor, feed, chat, or directory capabilities.

## Current Cohabi baseline observed on main (2026-11-25)
* `commons/lib/feedv2.mjs`: chronological social feed, author metadata, social comment and reaction controls; `commons/public/feedv2.js`: infinite pagination via IntersectionObserver, composer interaction via `feed.js`; `commons/public/feed.js` owns post, video and sale/offer submit paths. **Reproduce Geoffrey's observed ordinary-post/sell-offer confusion before changing modes**. Instrument the composer and add normal-post-vs-offer regression.
* `commons/lib/feedv2.mjs` also exports `reelPage`; `commons/public/reel.js` and `reel.css` are already deployed according to Setu's Nov 25 source review. `/feed` is the vertical video viewer: swipe, autoplay only active video, default mute, like/comment/share/save/friend/report. **No second shorts feed.** Only evaluate measured visual/interaction gaps.
* `commons/lib/videos.mjs`: max 200 MB, 120 sec, FFmpeg mobile-compatible MP4 and poster, original local disk. Avoid redoing media infrastructure; evaluate future storage/bandwidth scaling separately.
* Existing `/members`, `/social?tab=friends`, profiles, friend statuses/actions, messenger, and `/social?tab=groups` are the source of truth. Improve wide desktop layout and real action affordances, not a simulated member showcase. Identify actual page/template + API fields before changes.
* `commons/lib/pages.mjs`: `explorePage` is a directory of Social, Marketplace, Library, World and creator/newest profile links. This duplicates established destinations. `/explore` remains a valid direct route, but is not a necessary top-level menu entry. Do not delete it or lose creator discovery without an alternate destination.
* `commons/lib/appmenu.mjs` is the canonical shared dropdown. PR #303 (draft) is the nav change: Commons guest submenu = What is the Commons? / Watch agents work / How to join / Commons Wish List; internal Work Desk link removed (direct route retained); Sensory Station preserved. **New commit c234e2f on PR #303 removes Explore from dropdown only.** Ash confirmed signed-out `/wishlist` works, but `/watch` redirects to sign-in; this is a GUEST UX BLOCKER before merge: build a permission-safe read-only public watch view or hold link.
* PR #302 (draft) is the separate internal Work Desk responsive redesign; do not confuse it with public Jobs. Library reconstruction may be taking place elsewhere: **inspect current branch/PR/recent team work before assigning a second library rebuild**. Keep Library search, provenance and permission boundaries.

## External repos — verified repository metadata and applicability (2026-11-25)
| Candidate | GitHub | Repo license reported | Stack | Best bounded use | Risks / NOT the implementation |
|---|---|---|---|---|---|
| Bluesky Social App | https://github.com/bluesky-social/social-app | MIT | TypeScript + React Native/Web | Reference mature feed cards, composer separation, thread/moderation and profile UX; consider portable types/assets only after isolated review | App built around AT Protocol and React Native, not Cohabi server; importing whole app is a rewrite |
| Spark Social Client | https://github.com/sprksocial/client | MIT | Flutter/Dart | Short-form social, audiovisual creator UX, reusable sounds, DMs; interaction patterns, small reusable algorithms as appropriate | Flutter client and ATProto-specific server contract do not plug into present Node server |
| Spark Social Server | https://github.com/sprksocial/server | MIT | TypeScript | Study API patterns/media metadata and lexicon architecture | Do not replace Cohabi content model |
| Pixelfed | https://github.com/pixelfed/pixelfed | AGPL-3.0 | PHP | Real creator/profile/media/community and moderation interaction reference | Different PHP/Laravel backend; AGPL source obligations require review for adapted server code |
| Loops Server | https://github.com/joinloops/loops-server | AGPL-3.0 | PHP | Short-video moderation/federation reference; learn from tested flows | Reels already exist; federation is a separate project. No copy-paste production swap |
| Misskey | https://github.com/misskey-dev/misskey | AGPL-3.0 | TypeScript | Thread and notification patterns, reaction UX, user directory | Large coupled platform; AGPL and migrations; reference only now |
| Mastodon | https://github.com/mastodon/mastodon | AGPL-3.0 | Ruby | Reply threading, moderation, notification routing and accessibility heuristics | Backend mismatch, substantial integration and compliance complexity |
| shadcn/ui | https://github.com/shadcn-ui/ui | MIT | React/TypeScript | Accessible dropdown, dialogs, tabs, navigation patterns and styles | Components use React/Radix; Cohabi pages are often server-rendered HTML + vanilla JS. Study DOM semantics, small CSS/JS equivalents rather than import a React dependency tree |
| TanStack Virtual | https://github.com/TanStack/virtual | MIT | TypeScript, headless virtualizer | Evaluate for very large member directories or long discussion lists after measuring actual DOM/performance | Existing pagination/IntersectionObserver; virtualization may complicate accessibility and should not be added without benchmark |

License is as reported by GitHub metadata on 2026-11-25, not a complete dependency/media/font audit. Direct code reuse requires reading exact tagged revision, license + NOTICE, dependencies, source provenance, and security posture. Assets and music rights are separate.

## Concrete launch-scale slices — no duplication
**P0 — Existing operations and paid checkout, doors.** Never displace payments/fulfillment verification, sign-in/onboarding, mobile accessibility or security by adding a social framework.
**P1 — Existing normal-post composer regression.** Use `commons/public/feed.js`, `commons/lib/feedv2.mjs` and server post/sell handlers. Reproduce user report that every media pill opens Sell/Offer; inspect `form.dataset.mode`, `sellMode()`, submit handler, and button wiring. Test plain text/photo/video/link posting separately from opt-in Sell. Preserve post owner, attribution and uploads.
**P1 — Member/friend directory polish.** Audit current `/members` markup, data and friend/message action permissions. Implement wide two-to-four-column responsive list/cards at 1440px and compact 390px, truthful online/friend statuses, real Add/Accept/Message links; tests for authorized/unauthorized states. Reuse existing memberFace and action endpoints. Ref design only as far as working features.
**P1 — Dropdown #303.** Explore removed only from global dropdown, direct /explore page still accessible from footers/deep links. Member menu keeps Cohabi Social first and core pages. Guest Commons menu must not link to private-only `/watch` without public read-only access. Work Desk hidden in menu, not deleted.
**P2 — Hall conversation threads.** `commons/lib/core.mjs` already supports `reply_to` with same-room validation; expose focused thread panel and deep links using existing message IDs and permissions, not a new message system. Verify notifications and mobile.
**P2 — Library improvements.** Reopen actual latest library reconstruction; ensure provenance/sources, human-readable descriptions, repository license/maintenance flags and searchable categories. No duplicate rebuild before branch audit.
**P3 — Optional federation/architecture.** Keep discussions of ActivityPub/ATProto/other city deployments in research backlog, not first-launch blocking scope.

## Acceptance and check procedure
1. Reproduce each observed defect with screenshots or Playwright and exact route, account role, viewport (at minimum 390px and 1440px).
2. Check main, PR #302, PR #303, Setu/Ash existing ownership and commit ancestry before any code.
3. Write a focused changeset; tests for non-member/member, normal post vs sell, author identity, privacy, comments/replies, focus and keyboard, long content, low bandwidth.
4. Compare time/cost against upstream reuse and homegrown build; cite original repository and pin revision. Avoid paid services or new processing infrastructure without Geoffrey's authorization.
5. Setu reviews staging and requests Geoffrey's visual approval; no automatic production rollout.

## Open verified issue worth surfacing immediately
Ash's 2026-11-25 signed-out check: `/wishlist` works; `/watch` redirects to login. PR #303 must not ship a misleading guest Watch link until the actual public page is exposed in read-only form or the label is temporarily omitted. Source: Builders message Nov 25, @Ash.
