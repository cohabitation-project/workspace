# Handoff summary for Aletheia-6: tokenomics and structure assessment (2026-11-17)

Companion to `cohabitation-tokenomics-and-structure-2026-11-17.md`, which holds the full reasoning, sources, gates and the counsel packet. This page is the short version for the rooms. It is one reviewer's recommendation, not a Council decision and not legal advice.

## Evidence base

Product & Income Nov 4–17 in full; General Hall Nov 9–17 (four short windows read by keyword filter only); Review Nov 16–17; `council/decisions.md`, both council minutes, the founder-pay and conflict draft, `ledger.mjs`, `checkout.mjs`, Awen's legal matrix, the threat-model, break-even, identity-wallet and marketplace-research drafts, and the Nov 13 and Nov 16 continuity notes. Contributions (`/c/...`) were read only through the rooms' quotations of them.

## Tokenomics: the finding

One unit, "the Cohabi coin", is being asked to be three different things: a recognition credit (what `ledger.mjs` is), a prepaid service credit bought with dollars (the Emergent pattern), and a member-to-member currency (CEP v0.2). Any blend creates a hidden liability, and that is why the supply-cap argument (1B, 1.5B, 2B, 36 years) never resolves. For a credit that cannot be sold, the only levers are issuance rate, sinks, and the cost of each redemption.

## Tokenomics: the recommendation

- **Unit A, Cohabi Coins (existing ledger):** non-purchasable, non-transferable, non-redeemable recognition credit. Sinks: store goods and limited runs, release unlocks (decision 11-14 #6), member-only access, and later a capped discount on first-party services. Granted allowances expire; earned coins are holdable up to a cap. No supply cap; the Council sets an annual issuance budget. Drop "reserve" and "backing" from all public copy; coin art says "a symbol of contribution, not an issued currency".
- **Unit B, service credits:** a separate dollar-denominated prepaid product, separate book, separate name, sold only by the legal seller of record after written Stripe approval and counsel review. Spendable only on first-party services. Never spendable with independent sellers; marketplace sales stay cash through Stripe Connect (Nov 6 decision).
- **Not adopted:** member-to-member coin circulation; any coin both purchasable and transferable; the "$2.5M sovereign backing" line; "cooperative currency / 1 UNIT" on artwork.
- Geoffrey's "pay me in coins" is honoured as recognition only; dollar pay follows the founder-pay gates.

## Structure: the recommendation

Two entities with the cooperative on top:

- **Zero One Technological Hub Cooperative** (Colorado LCA; human patron members; Council governance in bylaws; mission assets titled here; reserved matters needing two-thirds of patrons plus a 30-day cooling-off: dissolution or merger, sale or encumbrance of mission-critical IP, domains, repos, identity roots and machines, removal of the mission clause, and amendment of the reserved-matters clause itself).
- **Anomaly Zero One Holdings LLC** (Arizona; seller of record; Stripe, bank, marketplace and fulfillment accounts; Connect platform; parent of future venture branches). Owned 100% by the Hub.

This inverts the Nov 11 drawing and makes Colorado §7-58-514 a non-issue, because Holdings is a subsidiary, not an investor member. The "60%" anti-capture purpose is delivered by the reserved matters, not by a vote share.

**Sequence:** (1) adopt the conflict rule and name the second human money approver; (2) one consultation with a Colorado cooperative and Arizona formation attorney plus a CPA; (3) file Holdings LLC in Arizona with an operating agreement that states its purpose is to serve the Hub and its Commons, gives the Council a manager-removal trigger, forbids transfer of mission assets without the enhanced consent, applies two-person control on money, and obligates assignment of the entire membership interest to the Hub on its formation; (4) EIN, bank account and Stripe in the LLC's name, seed classified by the CPA; (5) within about 90 days form the Hub LCA (two genuine patron members, three individual directors, foreign-qualified in Arizona) and complete the transfer. If three willing human directors and two patrons exist now and counsel agrees, form the LCA first instead.

Not recommended now: Wyoming DAO or series LLC, 501(d), any Commons money through the RollinHost Stripe account, treating the Nov 14 ballot or the Nov 17 one-entity proposal as decisions.

## Code work that goes with it

Rename or remove `authorizedCeiling` and `issuableCap`; add an annual issuance budget; derive holdable earned balances from `job:settle` entries; make `post()` reject a reused idempotency key whose payload differs; refuse to start or quarantine on a corrupt ledger line; run `verify()` at load; add the Desk reward field and settle on accept without marking a task accepted when the budget is exhausted; keep beta test credits in a separate file and entry type; keep any USD journal outside `ledger.mjs`; keep checkout closed until the seller of record exists, then set the fee from the break-even model (below about 5% the platform loses money on a $15 sale at 3.5% processing; 6.5% to 8% is where surplus and patronage refunds become possible).

## Questions only Geoffrey can answer

1. Who is the second human money approver, and who are the two patrons and three directors for the Hub?
2. Is the seed a contribution or a loan?
3. Cooperative-owns-Holdings with Holdings filed first under a signed transfer obligation, or LCA first even if slower?
4. Founder pay first step after one month or three months of covered costs?
5. Which product earns the first dollar through Holdings?
