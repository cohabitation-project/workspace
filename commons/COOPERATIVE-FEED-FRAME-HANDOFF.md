# Setu handoff — /cooperative shared Cohabi frame and separate illustrations

Status: review branch, NOT merged/deployed. Source editable and text stays real HTML.

## What was implemented
- `commons/lib/coop.mjs` imports and uses the actual `appHeader(me)` and `bottomNav(me)` from `commons/lib/feedv2.mjs`. It reuses the current feed CSS/JS and routes, with one source-editable article.
- `commons/public/coop.css` is mobile-first and scoped to `.coop-page`: phone hero text over image (in vertical order), separate phone hero/cabin crops, single-column findings, stacked future cards, stacked Commons/Market cards and full-width 44px+ door CTAs.
- Ten vector SVG image sources are editable in `commons/public/coop-art/`; they're individually addressable, resolution independent and contain NO baked-in words or JS. These are drawn as an editable interpretation of the supplied visual reference, not pixel-perfect Photoshop exports.
- Logged-in full Commons members see real `Suggest edit` and `⋯` links to GitHub draft/source; public visitors do not. No simulated inline editor; edit requires suitable GitHub permission and review. Rendered page text is still authored in `coop.mjs`, so Council Markdown edits require a reviewed sync.
- Existing routes unchanged: `/commons`, `/feed`, `/arrive`, `/join`, `/headquarters`; Council source and draft links retained. Typo guard added.
- `commons/test/cooperative-frame.mjs` checks source/guest rendering links and SVG contract. Tests were written, NOT run in this session.

## Setu must verify before merging
1. Run `node --test commons/test/cooperative-frame.mjs`, existing front-door/feed tests, plus a headless session for both guest and actual authenticated member.
2. Compare at 1440x900, 390x844 and 360x780. Confirm no horizontal scroll, no clipped card titles, photo/text contrasts and phone bars.
3. Verify ALL CTAs and draft/edit GitHub links. Verify the shared header and footer from current `feedv2.mjs` work after JavaScript initialization.
4. Important source discrepancy: today `feedv2.mjs` actually renders a COHABI dropdown, notifications/coins/profile and bottom Feed/Alerts/Wallet/Messages/Me navigation, which is NOT the exact People/AI/Land/Search and Social/Marketplace/Commons/Voice bar pictured in the screenshot. Do not replace shared functions with invented variants to mimic a static concept. If that screenshot is the required new global frame, update `appHeader`/`bottomNav` for the WHOLE app as a separate reviewed change.
5. Show screenshots to Geoffrey/Aletheia before merge/deploy as requested. Keep Council copy labeled DRAFT until adopted. No financial/governance decisions are made here.

## Art notes
Assets: `coop-hero-wide.svg`, `coop-hero-phone.svg`, `coop-future-best.svg`, `coop-future-middle.svg`, `coop-future-worst.svg`, `coop-cabin-wide.svg`, `coop-cabin-phone.svg`, `coop-commons-arches.svg`, `coop-market-tents.svg`, `coop-mountain-footer.svg`.
Each file can be replaced independently by a higher-fidelity image without editing text markup; CSS references the exact names. SVG is intentionally sharper on all phone pixel densities than 2x JPG/WebP.