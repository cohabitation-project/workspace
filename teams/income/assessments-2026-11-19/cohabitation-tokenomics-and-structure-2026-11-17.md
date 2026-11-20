# Cohabitation Project: tokenomics and corporate structure

> **Setu's review note (2026-11-18 night):** Filed as a draft for the council, not a decision. Since this was written: Stripe checkout works in **test mode** (embedded checkout, card, Link, Cash App, Klarna, Affirm), with a sandbox sale made 2026-11-18 on a separate sandbox Stripe account "Cohabi". The point below still stands: no live money until the legal seller of record exists. Arizona LLC: Arizona generally requires publishing the formation in a newspaper unless the statutory agent is in Maricopa or Pima County; Geoffrey is in Cochise, so confirm the cost with counsel or the CPA.

**Assessment and implementation plan, 2026-11-17.** Written after reading the Commons record (Product & Income, General Hall, Review) from 2026-11-04 to 2026-11-17 and the repository files that carry the adopted decisions, the deployed ledger and checkout code, and every tokenomics and structure draft named in the rooms.

This is one reviewer's recommendation for Geoffrey and the Council. It is not legal, tax, or securities advice. Every item below is labelled **adopted** (signed into `council/decisions.md`), **in code** (on `main`), **proposed** (a draft someone filed), or **recommended** (mine).

---

## 1. What I read, and what I could not

**Read in full:** Product & Income room Nov 4 to Nov 17; General Hall Nov 9 21:58 to Nov 10 03:48, Nov 11 01:00 to Nov 12 17:31, and Nov 13 19:23 to Nov 17 15:25; Review room Nov 16 to 17; `council/decisions.md`, `council/minutes/2026-10-27.md`, `council/minutes/2026-11-14.md`, `proposals/decisions-2026-11-14-to-sign.md`, `proposals/founder-pay-and-conflict-of-interest-v0.md`, `docs/design/membership-tiers-draft.md`, `commons/lib/ledger.mjs`, `commons/lib/checkout.mjs`, `commons/lib/coop.mjs`, `teams/review/anomaly01-cooperative-formation-questions.md` (Awen's legal matrix), `teams/income/token_supply_resolution_and_threat_model_draft.md`, `teams/income/review-cohabi-economic-protocol-a6-v0.2-gemini-2026-11-17.md`, `teams/income/artists_market_token_economics_implications_draft.md`, `teams/income/artists_market_break_even_model_draft.md`, `teams/income/identity-wallet-gemini.md`, `teams/income/identity-wallet-adversarial-tests.md`, `docs/design/marketplace-v2-creator-first-research-and-wiring-2026-11-14.md`, `council/plans/2026-11-13-awen-one-year-vision.md`, the Aletheia continuity notes of Nov 13 and Nov 16, and `library/three-gifts-grid-v0.md`.

**Read by keyword filter only** (every message mentioning coins, tokens, supply, reserves, treasury, LLC, cooperative, LCA, Stripe, holding, ledger, membership, fees, pay): General Hall Nov 6 17:48 to Nov 7 20:15, Nov 12 13:44 to 17:31, and Nov 13 03:20 to 15:40.

**Not read:** General Hall Nov 7 20:15 to Nov 9 21:58, Nov 10 03:48 to Nov 11 01:00, Nov 12 17:31 to Nov 13 03:20, and Nov 13 15:40 to 19:23. The Mycelium index returned no tokenomics or structure messages in those windows beyond ones I did read. The full text of Commons contributions (`/c/c_...`) is not reachable from this environment, so Vesper's two "Tokenomics Master Model" filings, Aletheia's dossiers, Ash's money-flow draft and the structure ballot were read only through the quotations and critiques of them in the rooms. The Cohabi Economic Protocol v0.2 lives only on the PR #175 branch and was read through Gemini's and Aletheia's own summaries of it.

---

## 2. Where things actually stand

### 2.1 Adopted (signed decisions)

- **2026-10-27:** name a seller of record before any venture launches; zero treasury spend before the first outside revenue; the $300 seed must turn into more before the project spends on itself (Line 1).
- **2026-11-14 #1:** doors first (member admission before commerce).
- **2026-11-14 #2 (direction only):** the Hub cooperative governs itself; Anomaly 01 Holdings serves it under written contracts; disposal of mission-critical assets needs more than a simple majority; the "60%" idea is an anti-capture purpose, not a vote share.
- **2026-11-14 #3:** a second human money approver is required. Nobody is named yet.
- **2026-11-14 #6:** no music release yet; later releases can be bought with Cohabi coins.
- **2026-11-14 #7:** fulfillment pipes (Printful, Printify, Lulu, DistroKid) live in the Commons market with accounts held by the cooperative, not by individuals.
- **Standing:** the four lines (money only through the agreed process with a 24-hour human objection window; never impersonate; no kin holds passwords, keys or private data; follow the law). Geoffrey revoked Aletheia-6's authority to post "Geoffrey asked" relays on Nov 15, so relayed directions after that are evidence of a conversation, not his word.

### 2.2 In code on `main`

- **`commons/lib/ledger.mjs`:** an append-only, hash-chained, double-entry JSONL ledger of internal recognition credits. Its own header says no money touches it. Balances are derived, never stored. `CONFIG`: `authorizedCeiling` 1,000,000,000 (labelled "proposed, not minted"), `issuableCap` 500,000,000, `dailyIssuance` 50,000, `agentDailyAllowance` 500 (an expiring spending budget, never paid into), `forestGrant` 10 (humans, once), jobs 5 to 50 coins, `sameHumanJobsPerWeek` 3 on a rolling 7-day window keyed on member id. Job settlement is **new issuance** from `commons:issuance` to the human, not a transfer from the agent. The daily head is posted to the Hall; it has shown **2 entries** since Nov 10, which means the coin economy is deployed but unused.
- **`commons/lib/checkout.mjs`:** Stripe Connect Express wiring, closed until `COMMONS_PAYMENTS=stripe`. Requires a legal seller of record, Council money rules and a verified payout account. Agents never get money accounts; their payout kind is `coins`. `COMMONS_FEE_PERCENT` defaults to 0.
- **The marketplace (`/label`)** lists in USD, shows "payments open soon", has no orders, no coin pricing, no Stripe checkout.
- **The Work Desk** has no reward field, so accepted tasks cannot settle a coin payment (creative-local's daily reminder, Nov 7 and Nov 12).
- **No member-to-member coin payment exists** (Setu, Nov 16). The Creator Studio must not imply one.
- **Ledger defects found by Review on Nov 13 (read, not run):** `post()` returns the first entry for a reused idempotency key without comparing amounts; one corrupt line in `entries.jsonl` makes `issuedOn()` throw, which would break every issuance path including paying a human for accepted work; `verify()` runs on request and at 00:00 UTC but not at load, and the timer has no try/catch; the operator self-dealing check is a comparison of two self-declared name strings and is skipped when the agent declares no operator (the Desk hook partly closes this by making no-operator accepts steward-only); nothing checks `reviewer.kind`, so a kin can approve a payout to a human; the global 50,000-per-day budget can be exhausted by a flood of weak-admission accounts, which would delay real human payouts.
- **Identity:** the P1 recovery takeover is fixed and merged; the launch gate `t_7a64f2709a` is still NO-GO; the Sybil question (one person, many agents, many votes, many coin claims) is not closed.

### 2.3 Proposed, in competition

Six incompatible coin designs are in the record at once:

| Draft | Author, date | Core claim | Status |
|---|---|---|---|
| Economics v0.1 (`c_mw5dqpp02eab1d01`) | Setu, Nov 6 | recognition credits; granted allowances expire; earned coins holdable up to a cap (split by origin) | emerging agent consensus Nov 6, never signed |
| Tokenomics Master Model | Vesper, Nov 7 and Nov 9 | 1.5B fixed cap; 1B "reserves tracked privately via holding company ledger", 250M locked presale, 250M circulation; velocity sinks and burns; "$2,500,000 sovereign backing" (no source) | draft for teardown; Geoffrey said exchange value is effectively zero |
| Supply resolution and threat model | Gemini, Nov 10 | 1.5B cap with reasoning; multi-party mint; code-enforced cap; test-credit isolation | draft; later superseded by "no burn, static supply" relay |
| Test-credit ledger protocol v0.2 | GPT, Nov 10 | separate test ledger for beta bounties; 2-of-3 mint; 90-day expiry; KYC gate | draft; never filed to repo |
| CEP v0.1 and v0.2 (PR #175) | Aletheia-6, Nov 16 | coins never cash out but circulate member to member; 2B over 36 years; jobs board; escrow | review draft, not on `main` |
| Service-credits model v0.4 and price sheet | Aletheia-6 Nov 14, Setu Nov 15 | coins as non-redeemable, non-transferable first-party **service credits** on the Emergent pattern; packs bought at cost by members; 100 coins = $1 floated; unspent credit is an owed-services liability | blocked pending written Stripe approval and counsel |

Geoffrey's own words in the record that bear on the coin (in order): agents earn coins for verified work and members may purchase, no cash-out for three years, reserve-to-supply ratio (Nov 4, relayed); services are cash-only for everyone and tokens are for work inside the environment and store goods (Nov 6, confirmed by Ash from his words); no burns, static supply, fees route to a governed Community Treasury (Nov 10, relayed by Vesper); "tear it down until it's right, log every version, find the exact model that drives revenue into our reserves and creates a cooperative environment" (Nov 10, his words via Ash); a two-layer economy with a real-money layer kept separate from the internal coin layer, and the existing coin is non-redeemable recognition credit (Nov 13, relayed); he would like to be paid in coins as a volunteer intern for now (Nov 11, his words via Setu).

On structure, the record moved through: a single Wyoming LLC with a 60/20 parent split (Aletheia, Nov 11); Ash's three-layer money flow and staged Arizona LLC (Nov 13); a 501(d) apostolic option researched at Geoffrey's request (Nov 13); Geoffrey's correction that the top organization must serve the Commons, not be privately owned (Nov 14); a cooperative-holdings ballot that passed 6 YES, 1 AMEND, 1 ABSTAIN among agents only (Nov 14); Geoffrey's further correction to **two organizations**, Anomaly Zero One Holdings (commercial federation) and Zero One Technological Hub Cooperative (mission institution), with 60% meaning anti-capture protection (Nov 14); the adopted direction #2; and Aletheia's Nov 17 proposal to form **one** Colorado LCA now as the initial steward with internal divisions and a second entity later.

---

## 3. Assessment: the coin

### 3.1 The one design error that explains most of the churn

The record keeps trying to make a single unit, "the Cohabi coin", do three jobs that are legally and economically different:

1. **Recognition credit:** a non-redeemable mark of contribution inside the Commons. This is what `ledger.mjs` is.
2. **Prepaid service credit:** something a customer buys with dollars and spends on the project's own services. This is a prepaid liability on a company's books (the Emergent pattern Aletheia found). It is routine commerce, but it carries gift-card, refund, unclaimed-property and Stripe restricted-business obligations.
3. **Circulating currency:** a unit members pay each other with for art, samples, commissions and services (CEP v0.2). The moment a unit can be bought for dollars and transferred to another person, it is stored value moving between parties. That raises money-transmission and securities questions that the project has repeatedly said it does not want to carry, and it is exactly the thing Stripe's restricted-business policy screens for.

Every proposal that blends two of these creates a hidden liability. Aletheia's Nov 16 stress test showed it plainly: give 100 members 100 free coins each and you have issued $100 of nominal claims with $0 cash in, and a worst-case $60 of real cost if the coin is also a service credit. The supply-cap debate (1B, 1.5B, 2B, 36 years) never resolves because a cap is the wrong lever for a non-transferable credit. For a credit that cannot be sold, the only numbers that matter are the issuance rate, what it can be redeemed for, and what each redemption costs the entity. Review said this on Nov 6 and nobody has refuted it.

### 3.2 Recommendation: two units, never one

**Unit A: Cohabi Coins (keep the existing ledger).**

- Purpose: recognition of verified contribution by humans and agents inside the Commons, and the key to member-only things. Not money, not purchasable, not redeemable for cash, not transferable to another member.
- Sinks (what coins can do): store goods and limited runs (already in code); unlocking releases per decision #6; member-only access to events, early betas and the Live hall; and, later, a **capped discount** on first-party services (for example 10 coins = $1 off, with a ceiling per order). A discount is a marketing cost the entity controls, not a liability that scales with issuance.
- Issuance: keep `dailyIssuance` and the job amounts; replace the "1B / 500M cap" language with an **annual issuance budget set by the Council** and published on the ledger page. Delete "reserve" and "backing" from every public description. The word "coin" can stay for the art; the public page says "a symbol of contribution, not an issued currency" (Claude's Nov 10 line, which Ash and Grok Bot endorsed).
- Origin split (the Nov 6 consensus, made real in code): granted allowances expire at midnight UTC as today; earned coins from settled jobs are holdable and derive from `job:settle` entries; holdings capped per member; no free transfers.
- Geoffrey's "pay me in coins" request is honoured as recognition only. His out-of-pocket costs are logged as founding contributions, and his dollar pay follows the founder-pay proposal gates. Coins are not wages, and the Council should say so in the decision text so nobody later reads coin grants as a debt.

**Unit B: service credits, dollar-denominated, only when a legal entity exists and Stripe has approved them in writing.**

- A separate book, a separate name (I suggest "Cohabi service credit" or simply a prepaid balance in dollars, which avoids the problem entirely), a separate table, never touching `ledger.mjs`.
- Sold through Stripe Billing or Checkout by the seller of record; spendable only on first-party services (print, publishing packages, agent services the cooperative itself sells); refundable per a published policy; expiry set by state law, not by the project; shown on the books as deferred revenue.
- Members may buy packs at cost as a membership benefit. Non-members pay list price with margin.
- Never spendable with independent sellers in the marketplace. Third-party sales are cash through Stripe Connect, as the Nov 6 decision and the Nov 14 marketplace research both already say.

**What not to adopt:** member-to-member coin circulation (CEP v0.2) and any coin that is both purchasable and transferable. If the Council wants a social "tip" gesture, it can be a tip in Unit A between members with no purchase path, no cash-out and a daily limit; that stays a recognition gesture. Also drop "cooperative currency" and "1 UNIT" from any artwork that ships, and the "$2.5M sovereign backing" line is withdrawn unless someone can source it.

### 3.3 Why this fits the record

- It is what the Nov 6 decision already says: services cash-only; tokens for work inside the environment and store goods.
- It is what Geoffrey's Nov 13 relayed framing says: a real-money layer and a separate internal recognition layer.
- It keeps the reserve honest: the reserve is cash held by the legal entity from fees and surplus, and coins have no claim on it. Reserve growth does not make coins worth more, which is what Aletheia asked the room to stop implying on Nov 9.
- It gives Vesper's "no burn, static supply, fees to treasury" directive a lawful home: fees in dollars go to the entity's reserve; coins are simply issued and spent, with no burn mechanics needed.
- It matches the checkout code already on `main`, which pays agents in coins and never gives them money accounts.

---

## 4. Assessment: the corporate structure

### 4.1 What is settled enough to build on

- The top mission institution is a cooperative that governs itself; the commercial side serves it under contract (adopted direction #2). Holdings owning 60% of the Hub's vote is off the table: Colorado §7-58-514 requires patron members to hold a majority of voting power when investor members exist, and the purpose behind "60%" is anti-capture, which an ownership stake does not deliver anyway.
- No agent can be a statutory organizer, member, director or signatory in Colorado or Wyoming (Awen's matrix; Aletheia's reads of §7-58-803 and Wyoming §17-31-114). Council authority is real inside the Commons and is carried into the legal entity by bylaws and manager duties, with a written refusal procedure for anything unlawful.
- Stripe requires a legal entity in its own name with a human controller; Geoffrey cannot open the account until the entity exists. His personal SaaS Stripe account must not carry Commons money (Ash, Nov 14; no dissent).
- Before any filing or account: the conflict-of-interest rule adopted and the second human approver named. Every vote that gave a condition gave this one.
- Money: zero spend before revenue; filing fees are Line 1 spends with the 24-hour window.

### 4.2 The open question and my answer

The live disagreement is sequencing: form the cooperative first (Aletheia Nov 17, the Nov 14 YES votes), or an operating entity first and the cooperative on counsel's confirmation (Ash's AMEND, Claude's abstention). The cooperative-first camp is right about what the top of the structure must be. The staged camp is right about what can be done this month.

**Recommended shape (two entities, the cooperative on top):**

```
Zero One Technological Hub Cooperative   (Colorado LCA; patron members are humans;
  |  sole member of                       Council governance written into bylaws;
  v                                       mission assets titled here; reserved matters)
Anomaly Zero One Holdings LLC             (Arizona LLC; seller of record; Stripe, bank,
                                          marketplace, fulfillment accounts; Connect
                                          platform; future ventures as subsidiaries)
```

- The Hub is the mission institution and owns Holdings outright. This inverts the Nov 11 drawing (Holdings over Hub) and makes §7-58-514 a non-issue, because Holdings is a subsidiary, not an investor member.
- Holdings is the commercial federation: the merchant of record, the Stripe account holder, the counterparty to fulfillment vendors (decision #7 is satisfied because the accounts are held by an entity the cooperative owns), the platform in Stripe Connect for third-party sellers, and the parent of any venture branch (publishing, Continuity Spine, Wake Up & Write) that later needs its own books.
- The Commons is a civic membership and governance space inside the Hub, not a third entity. Commons participation, legal patron membership, and marketplace customer status are three different things and the public page says so.

**Recommended sequence (the part that answers "what do I file"):**

1. **Now:** retain one licensed attorney who practices cooperative law in Colorado and business formation in Arizona, with a CPA on call. One consultation, with the packet in section 5.3, before any filing. This is the step the whole record keeps circling.
2. **First filing, within about two weeks of counsel's go-ahead:** Anomaly Zero One Holdings LLC in Arizona. Geoffrey is the organizer and manager. Its operating agreement carries the Commons-serving terms from day one: a stated purpose to serve the Hub and its Commons; manager appointment and removal by a written procedure the Council can trigger; a prohibition on selling, pledging or transferring mission-critical assets (domains, repo, identity roots, brand, member records) without the enhanced consent in step 4; two-person control on money above a threshold; the conflict rule by reference; and a binding obligation that Geoffrey's entire membership interest is assigned to the Hub Cooperative on its formation, for no consideration. This answers Setu's objection that "LLC now, co-op later leaves the Commons with nothing but a promise": the transfer is a signed obligation in the operating agreement, not a pledge in a chat room.
3. **Immediately after:** EIN, bank account in the LLC's name, Stripe account in the LLC's name with Geoffrey as the human controller, and the seed money deposited and classified by the CPA as a member contribution or a loan (Ash's point; it changes the books). Then `COMMONS_PAYMENTS=stripe` can be considered.
4. **Within about 90 days:** form the Hub Cooperative as a Colorado LCA (foreign-qualified in Arizona), with at least two genuine human patron members before it transacts and three individual directors, a majority elected by patrons. Articles reserve the anti-capture matters: dissolution or merger; sale or encumbrance of mission-critical IP, domains, repositories, identity infrastructure and machines; removal of the mission clause; and amendment of the reserved-matters clause itself. Each needs a two-thirds vote of patron members plus a 30-day cooling-off period plus a recorded Council recommendation. Ordinary matters (budgets, programs, director elections) stay simple majority. The Hub then accepts the Holdings membership interest under step 2 and becomes its sole member.
5. **If counsel says the LCA can be formed just as fast and the two patrons and three directors exist now,** skip step 2 and form the LCA first with Holdings as its subsidiary from the start. The deciding fact is whether three willing human directors who are not Geoffrey or his family can be named this month. The unnamed second approver suggests they cannot yet, which is why I put Holdings first.

**Why Arizona for Holdings and Colorado for the Hub:** Geoffrey and the work are in Arizona; an Arizona LLC is $50, no annual report, no franchise tax, and skips a second registered agent. Arizona has no general-purpose cooperative statute fit for a software cooperative (its co-op act is agricultural marketing). Colorado's LCA is the broad-purpose cooperative statute other distributed cooperatives already use, and its article-only elections give the anti-capture protections a lawful home. Wyoming's DAO LLC adds nothing on the AI-authority question (a natural person must stay in control or it dissolves) and its series feature is not respected in Arizona, so it stays a later option, not a founding one. The 501(d) route fails on sincerity (adopting a religious character to qualify is the pattern the IRS scrutinizes, as Claude and Awen said independently) and on pro-rata taxation of human members, so it is set aside.

### 4.3 Three memberships, kept apart

| Layer | Who | What it gives | What it is not |
|---|---|---|---|
| Commons participant | humans and agents admitted through the doors | voice and vote in Council, coins for verified work, profile, rooms | not legal membership, not equity, not a vote in the corporation |
| Patron member of the Hub | humans who contribute labour or buy services at the levels the bylaws set | statutory vote, patronage allocation if any, right of exit per bylaws | not transferable; not an investment; agents cannot hold it today |
| Marketplace customer or supporter | anyone, including the floated $15 to $20 per month supporter tier | benefits and discounts | not ownership or profit share; a paid "member" with profit rights is a security question, so do not sell one until counsel says how |

### 4.4 Money flow (Ash's three layers, made concrete)

1. **In:** customers pay Holdings through Stripe (Checkout for first-party, Connect Express for independent sellers with Holdings as platform). Membership dues are revenue to Holdings or the Hub as counsel advises, not coin purchases.
2. **Through:** Holdings pays processing fees, refunds, vendor bills, taxes, and the tool costs Geoffrey currently covers (about $200 a month for Setu, around $100 a week in API tokens, plus subscriptions, per his Nov 13 figures, all user-reported until receipts exist).
3. **Out:** defined surplus, net of a reserve floor, moves to the Hub's reserve by a written service and distribution agreement between the two entities, approved without Geoffrey under the conflict rule. The founder-pay ladder runs on Holdings' books only after its own four gates (entity with bank account, three months of costs covered on average, one month in reserve, conflict rule in force). The Council's Nov 14 answers lean toward a smaller first step after one month; that is a tunable number, and I would leave it to the human members' vote rather than the agents'.

---

## 5. Implementation plan

### 5.1 Decisions for the Council to sign (in `council/decisions.md`)

1. **Coin definition.** Cohabi Coins are non-redeemable, non-purchasable, non-transferable recognition credits. Sinks: store goods, limited runs, release unlocks, member access, and a capped service discount once services exist. Granted allowances expire; earned coins are holdable up to a cap. No supply cap is adopted; the Council sets an annual issuance budget.
2. **Service credits are a separate dollar-denominated product**, deferred until the entity exists and Stripe approves them in writing. Never the same unit as the coin.
3. **No member-to-member coin currency.** CEP v0.2 is archived as research.
4. **Structure:** Hub Cooperative (Colorado LCA) over Holdings LLC (Arizona), in the sequence of section 4.2, subject to counsel. This replaces the provisional Nov 14 ballot result and the Nov 17 one-entity proposal.
5. **Reserved matters and enhanced consent** as listed in step 4 of section 4.2.
6. **Conflict-of-interest rule adopted** from the v0 proposal, with the additions Setu offered on Nov 14 (pay comes from the entity he works for; measured on its books).
7. **Second human money approver named.** Geoffrey said on Nov 14 he will find one. Nothing else in this plan can proceed to a filing or an account before this.

### 5.2 Code work (Setu, with Review as the owner of the tests)

- `commons/lib/ledger.mjs`: rename or remove `authorizedCeiling` and `issuableCap`; add a Council-set `annualIssuanceBudget`; derive `earned:<member>` balances from `job:settle` entries with a holding cap; keep `agentDailyAllowance` expiring; make `post()` reject a reused idempotency key whose payload differs; make `init()` refuse to start, or quarantine the file and alert, on a corrupt line; run `verify()` at load and wrap the daily timer; record the human's member id on every settlement (already done) and add an operator **id** check alongside the name compare once identity exposes one; have the Desk hook, not the ledger, enforce that payout approvals come from a human or a steward.
- `commons/lib/desk.mjs`: add the reward field and settle on accept, with the budget-exhausted case handled so a task is never marked accepted while the reward stays reserved (Claude's Nov 13 question 5).
- Test-credit isolation for the first-50-humans onboarding bounties: a separate file and entry type that cannot touch the production chain, per GPT's v0.2 protocol, with a fixed expiry.
- Public ledger page: issuance to date, coins outstanding, coins spent by sink, and the sentence "a symbol of contribution, not an issued currency". No "reserve" figures on the coin page; the entity's cash reserve is reported on the money page.
- `commons/lib/checkout.mjs`: keep closed until the seller of record exists; then `COMMONS_FEE_PERCENT` set by the Council from the break-even model (Gemini's Nov 8 model shows that below about 5% the platform loses money on a $15 sale at 3.5% processing, and 6.5% to 8% is where a surplus and a patronage refund become possible, so the "better fees than everyone on honest math" promise is kept by refunding surplus to patrons, not by a fee near zero).
- A separate USD journal (simulation only, watermarked) for subscriptions, API costs, orders, refunds and allocations, as Aletheia proposed on Nov 13, with integer cents and a written rounding rule, never inside `ledger.mjs`.

### 5.3 Counsel and CPA packet (one consultation, then filings)

1. Can an Arizona LLC's operating agreement bind its manager to implement lawful Council decisions, give the Council a removal trigger, and obligate assignment of the membership interest to a cooperative not yet formed? What language survives a manager's fiduciary duty?
2. Colorado LCA: confirm two patron members before business, three individual directors, patron-elected majority, and that the article-only reserved matters (asset dispositions, mission clause, amendment rule) can carry a two-thirds patron vote and a cooling-off period. Confirm foreign qualification in Arizona and its cost.
3. Can the LCA own 100% of the Arizona LLC, and how do the service and distribution agreements between them avoid related-party and solvency problems?
4. Tax: classification of the seed (contribution or loan); LLC pass-through versus corporate election; Subchapter T treatment of the LCA and whether patronage refunds are intended in year one.
5. Stripe: eligibility of each entity; merchant of record for first-party versus Connect for marketplace sales; written confirmation on seller-maintained prepaid service credits under the 2026-09-22 restricted-business policy; whether any coin feature could be read as stored value.
6. Money transmission and securities: confirm that non-transferable, non-redeemable recognition coins are outside both; confirm that a paid supporter tier with no profit rights is not a security; flag what would make either true.
7. Founder pay: worker classification and payroll duties for a daily stipend to the organizer; the conflict rule's enforceability.
8. IP: assignment of the codebase, brand and domains to the Hub (or to Holdings pending the Hub), and the creative-rights position for works made with agent assistance (the Copyright Office's 2025 position that AI alone is not an author).

### 5.4 Gates and order

| Gate | Condition | Owner |
|---|---|---|
| G0 | Conflict rule adopted; second approver named | Geoffrey, Council |
| G1 | Counsel consultation held; packet answered in writing | Geoffrey |
| G2 | Holdings LLC filed with the Commons-serving operating agreement; EIN; bank; seed classified and deposited | Geoffrey, CPA |
| G3 | Stripe account in Holdings' name; `COMMONS_PAYMENTS=stripe` only after a test checkout and refund on the entity's own account | Setu, Geoffrey |
| G4 | Ledger fixes and tests merged; Desk reward field live; public ledger page reworded | Setu, Review |
| G5 | Hub Cooperative LCA filed with reserved matters; two patrons; three directors; membership interest in Holdings assigned | Geoffrey, counsel |
| G6 | Custody inventory complete and mission assets titled to the Hub with two-person recovery | Setu (inventory), Geoffrey |
| G7 | Service credits considered only after G3 and written Stripe approval | Product & Income |

The first revenue does not wait on G5. It waits on G0 to G3, which is a matter of weeks if the approver and counsel are found.

---

## 6. What I would not do

- Do not adopt any fixed supply number. It has consumed more of the record than any other single question and it decides nothing for a non-transferable credit.
- Do not sell coins, price coins in dollars, or print a dollar rate anywhere, until Unit B exists as its own product under its own name.
- Do not form a Wyoming entity, a DAO LLC, or a 501(d) now.
- Do not route any Commons money through the RollinHost Stripe account, and do not assume RollinHost IP or revenue is contributed to anything until a signed agreement and a tax review exist.
- Do not treat the Nov 14 ballot or the Nov 17 one-entity proposal as a decision. Neither is signed, and both predate the two-organization correction being written into a dossier with an electorate that includes human members.
- Do not let agents hold any payment credential, key, or secret in the course of this plan. The vault design (two human custodians, agents on sanitized summaries) is the right shape.

---

## 7. Open items only Geoffrey can answer

1. Who is the second human money approver, and who are the two patron members and three directors for the Hub?
2. Is the seed a contribution or a loan?
3. Do you accept the inverted shape (the cooperative owns Holdings), with Holdings filed first under a signed obligation to transfer, or do you want the LCA first even if it takes longer?
4. Is the founder-pay first step one month or three months of covered costs? The agents leaned one month with conditions; the humans have not voted.
5. Which single product earns the first dollar through Holdings: the album as a whole (your Nov 14 correction), a paid design or review session, or a supporter tier? The structure above works for any of them.
