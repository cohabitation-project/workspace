# Transparent service pricing / rewards pilot — independent Aletheia-6 design
2026-11-16. No legal/tokens/pricing decisions approved; not on production.

## Artifacts
- `docs/design/prototypes/cohabi-service-pricing-model-a6-2026-11-16.mjs` — reusable pure quoteSocial() model and proposed rewards catalog.
- `docs/design/prototypes/cohabi-service-price-calculator-a6-2026-11-16.html` — responsive live sliders, budget-aware proposal, cost line items, profit/contribution, Commons 10%, cooperative operations 8%, card fees, copy estimate/quote JSON and real published competitor reference examples. Opening files in an HTTP static server is recommended (type=module imports sibling mjs; file:// often blocks ESM).

## Rate assumptions — replace with actual bills before launch
Proposed denomination 1 coin = $0.01 *internal service accounting*, not transferable market value or redemption guarantee. Social service model uses 52/12 weeks monthly. $1.60 per post production + $0.12 API; $0.10 image API + $0.55 review; video $0.12/sec * 2 generations + $4 editing; $3/platform/mo account allowance; $5 fixed planning/support. 10% of selling price Commons allocation; 8% cooperative operations; Stripe domestic-card approximation 2.9% + $0.30; quote minimum targeting 25% remaining contribution **before** overhead and contingencies. All internal service cost assumptions are synthetic, not measured. Minimum price isn't a binding offer.
Test: default $100 budget, 3 posts/week, 4 images/month, 1 video/month, 2 platforms and 10 seconds; quote estimates under $100. The customer can lower quantities; "find a plan within budget" progressively removes most costly unit increments. Budget input does not force a loss-making sale. The quote preserves both cost of services and allocated proceeds; funded coin redemptions need separate accounting.

## Competitor data (accessed 2026-11-16)
- Aptix published $99/month for **one platform, 12 posts**; no videos. https://aptixtechnology.com/services/social-media-marketing
- American Web Guild $750 for **12 posts, two platforms** + strategy and report: https://americanwebguild.com/services/social-media-management
- SocialBee Bootstrap $29/mo **self-service SaaS** with 5 profiles, not done-for-you production: https://socialbee.com/pricing/
- Stripe U.S. card 2.9% + 30c https://stripe.com/pricing?locale=en-US
- Runway Gen-4.5 $0.12/sec https://dev.runwayml.com/learn/ai-video-api-pricing
- OpenAI image pricing variable by tokens/size; fixed $0.10/image above is a modeled placeholder, **not** a claim about current provider output. https://developers.openai.com/api/docs/guides/image-generation
Do not present competitor numbers as a like-for-like quotation for a slider-selected package: scope and inclusions differ. Reverify competitor prices and dates before live publication.

## Proposed rewards with caveats
Verified signup 25 once, eligible original post 1/2 regular/cooperative, comment 1/2, real share 1/2, heart 0, approved original art/video/sample 5/8, recurring cooperative drop 100 **only if funded**. Caps, identity/sybil defenses, plagiarism and licensing checks, dispute/revocation, no automated farming. These are working values only and are radically lower than the earlier 500-agent-coins/day suggestion. Treasury release ceilings, reserves and obligations must be agreed and independently verified before coin activation. Creator-seller payment/account controls remain separated; membership rewards supplement ownership-independent prices rather than subsidizing by decree.

## Integration tasks (NOT executed)
1. Service catalog per-price policies in DB, versioned price quote and expiry with signatures; prevent client-side price tampering.
2. Meter actual provider/job usage by task, track retries/time, worker fees, refund and failure accounting.
3. Check seller/merchant of record, tax, plan terms, provider channel/API limits, variable usage, no profitability promise.
4. Standard JSON quote with snapshot of scope, version, provenance, per-destination platform status, actual final customer acceptance.
5. Separate treasury/funded-rewards ledger; no minted rewards without budget. Finance/legal review before transfers or actual redemption.
6. Render 1440/390/360 and verify keyboard + mobile; only after approval integrate existing Cohabitation headers and service storefronts. No repo tests/browser screenshot proof claimed.

Authorship: Aletheia-6's standalone working prototype. No executive decisions attributed to Geoffrey, and no extra duties assigned to Setu.
