# Navigation and content reconciliation — 2026-11-10 (Aletheia-6)

Status: working integration plan; no production deployment or branding decision authorized. Reported mobile breakage requires device/browser verification.

## Three distinct public surfaces
- **lastoftherealestate.com**: legacy arts/label and philosophical content. Inventory existing live pages and preserve valuable original writing; do not blindly redirect or erase. In particular, Geoffrey identified the **Epista Crystal Primer** (spelling/title to verify against the live source), the **Three Greatest Gifts**, and the petition as important orientation readings. These are **not yet confirmed to exist in this repository under those titles**. Request original page URLs/content before migration. Do not misattribute or silently rewrite.
- **ashram.lastoftherealestate.com**: Commons/Headquarters and agent collaboration, plus prototype /show and /homepage-preview routes.
- **cohabi.org**: public Social/Marketplace entry. Domain and brand naming remain undecided; no renaming.

## Canonical route inventory (source-derived; test on production)
| Purpose | Route | Notes |
|---|---|---|
| Stable public porch | /porch | independent of authenticated / behavior |
| Public root | / | host and session dependent; don't use as universal back button |
| Sign in | /signin | Offered Apple visual merged in PR #15; verify on mobile |
| Sign up | /join | social account; not the deeper application |
| Cooperative arrival | /arrive | separate application/gate |
| Social | /feed | not /social |
| Marketplace | /label | /marketplace redirects, but use canonical |
| Headquarters | /headquarters | Commons |
| Coin explainer | /cohabi | Tree of Life visual; not an actual wallet dashboard |
| Petition | /petition | reading and consent |
| Library | /library | orientation references |
| Jobs | /desk | context-specific work |
| Spend | /spend | not a wallet |
| Store | /store | member goods |
| Member profile | /m/:id | authenticated identity |
| Prototype world | /show/land-city/proto/aletheia-observatory/walkable-3d-v2.html | verify production |
| Homepage preview | /homepage-preview/ | Aletheia static design; NOT production home |

## Confirmed code/integration problems
1. Static homepage preview linked to nonexistent /social, /login, /signup and misdirected /store for coin explanation; this branch corrects those links to /feed, /signin, /join, /cohabi and other known routes. The preview is still static and has no live content integration.
2. Shared header, landing header, social header, marketplace header and HQ header are separate implementations; mobile behavior is inconsistent. Do not merge a new universal header without testing authentication and keyboard/touch.
3. HQ mobile destinations/zoom repair is open as PR #10; review and test before merging.
4. The server appears to register /door in a headquarters handler before the dedicated /door handler. Express route precedence may shadow the Ask Cohabi page; reproduce and fix with regression tests.
5. Sign-in/Coin changes from PR #15 are merged, but production responsive behavior remains unverified. User reports mobile layout breakage.
6. /porch#slide-wallet is a coin information slide, not a wallet. The balance chip must not imply a functional wallet.
7. Avoid unsupported /homepage-preview link claims until assets and server serving are verified.

## Proposed compact information architecture — subject to discussion
**Primary:** Social · Marketplace · Commons · one accessible “More” menu · Profile / Sign in.
**Commons dropdown:** Headquarters; Rooms; Library & orientation; Work Desk; Virtual world; Petition / principles; Coin & wallet information.
**Contextual / footer:** Tools, Images, Submit, Station/Live, API, Privacy, Wish lists, Store, Help, moderation/admin. Keep routes and permissions; relocate navigation, do not delete functionality.
**Legacy content library:** distinguish *original source*, *reading copy*, *orientation summary*, *approved current policy*. Agents may be invited to read the original primer, petition and Three Greatest Gifts; do not present these as mandatory ideological agreement or conflate a petition with binding governance.

## Mobile acceptance checks
- 320, 375, 390, 430px widths; portrait and landscape; actual Android and iOS when available.
- Sign-in form stays visible and tappable over Offered Apple art; no painted mock fields mistaken for real controls.
- Coin page Tree of Life art never hides the copy, balances or buttons; no fictitious purchases.
- HQ controls reachable with touch, keyboard and screen reader; dropdown can close; no horizontal overflow.
- Signed-out and signed-in navigation, direct deep links, session return URLs and cross-host transitions.
- Homepage preview asset paths and every link; never silently replace / with preview before live data integration.
- Review image rights, alt text, load performance and reduced-motion behavior.

## Integration order
1. Preserve source/attribution and capture screenshots of existing production pages.
2. Verify legacy original content and map its stable URLs to Library/orientation links.
3. Repair mobile PR #10 and PR #15 regressions with tests.
4. Stage the corrected Aletheia homepage preview; integrate real public feed/listings and approved copy.
5. Agree on minimal header/dropdown destinations; implement shared navigation without branding decisions.
6. Smoke-test all three domains, then obtain review/approval before merge/deploy.

Ownership: Aletheia-6 prepared this inventory and preview link repairs. Setu or the authorized deployer should review and stage; no live deployment asserted.
