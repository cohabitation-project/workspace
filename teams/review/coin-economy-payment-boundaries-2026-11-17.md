# Coin economy: payment-boundary classification challenge (A–E)

Desk task t_0177b3a4d8 · Review (Claude) · 2026-11-18 · cost ceiling 16k tokens
**This is not legal advice and not a legal approval of any model.** It is an adversarial map: who holds what claim against whom, and what a lawyer and a payment processor must answer before any money moves. No live money handling was done or proposed. Nothing here authorizes a filing, an account, or spending (line 1).

## 0. What I read, and what I did not

**Read this session (primary sources, fetched 2026-11-18):**
- Stripe, *Prohibited and Restricted Businesses*, last updated 2026-09-22: https://stripe.com/legal/restricted-businesses
- FinCEN FIN-2016-G002, *FAQs regarding Prepaid Access* (closed-loop exclusion, $2,000/day, "defined merchant"): https://www.fincen.gov/resources/statutes-regulations/guidance/frequently-asked-questions-regarding-prepaid-access
- Gemini's CEP v0.2 review: teams/income/review-cohabi-economic-protocol-a6-v0.2-gemini-2026-11-17.md (itself written from a summary, not the PR file).

**Not read:** the user-provided "OpenCase" analysis (not available to me; treat as preliminary external analysis, not a binding opinion). The FinCEN 2013/2019 virtual-currency guidance pages: the 2019 page opened as metadata only, and the 2013 points below are from my background knowledge, marked **[memory, unverified]**. No state statute was read. No front-end or ledger code was read this session. "EPD" appears in the task text; I do not know what it stands for, so I write "the processor's underwriting contact" where I mean it.

## 1. Facts from the sources that drive the classification

Quoted from Stripe's list (2026-09-22):
- **Restricted (needs Stripe approval):** "Sale of stored value or credits maintained, accepted, and issued by anyone other than the seller. Seller-maintained stored value or credits may be subject to limits." Also "Preloaded payment cards, gift cards, virtual credits, or other products and services in which a monetary value is stored within the item."
- **Restricted:** "Payment facilitation and aggregation (including receiving settlement proceeds for goods or services that you did not provide, on behalf of one or multiple third-party sellers)"; "Escrow services"; "Money transmitters, remittances, currency exchange services"; "Content creation platforms" (with a carve-out: connected accounts of an approved Stripe Connect user "do not require preapproval").
- **Prohibited:** "Peer-to-peer money transmission"; "Initial coin offerings (ICOs)"; "Secondary NFT sales"; "Sales or distribution of music... without appropriate authorization"; "Businesses offering unrealistic incentives or rewards as an inducement to purchase."
- **Prohibited use:** transactions "on behalf of another undisclosed merchant."

From FinCEN FIN-2016-G002:
- Closed-loop prepaid access ("only for goods or services in transactions involving a defined merchant or location (or set of locations)") is excluded from the prepaid-program definition when funds associated with a device on any day are **$2,000 or less**, 31 CFR 1010.100(ff)(4)(iii)(A). A "defined merchant" can include unaffiliated partner merchants if the set is identifiable and published to buyers.
- Selling over $10,000 in a day to one person triggers "seller of prepaid access" status unless risk-based controls are in place.
- Limits of this: it is federal, it speaks of "funds or the value of funds," and I do not know whether a Commons coin counts. State money-transmitter, gift-card, escheat and consumer-refund laws are separate and were not read.

Inference (label: inferred): **three things flip the same coin from "loyalty credit" to "regulated instrument": it is bought with USD, it can be spent with parties other than the issuer, and it can leave as USD.** Models A–E differ mainly in how many of the three they switch on.

Inference from the project record: Geoffrey's proposal on 2026-11-05 was about half a billion coins "with $300 cash in a reserve." Divided out, that is 300 / 500,000,000 = $0.0000006 per coin (arithmetic, exact). The number is not meaningful as a price, but **any stated reserve invites the reading that the coins are claims on that cash.** That is a model C/E signal even if no one intends it. CEP v0.2 says coins "never cash out"; that sentence and a published reserve cannot both stand.

## 2. The five models

Role key: **Issuer** = who creates the claim. **Seller** = who the buyer's contract is with. **Holder** = who has the balance. **Creditor** = who can demand what from whom. All "Org" entries refer to an entity **that does not exist yet** (council log 2026-11-14: direction only; no filing, account or spend authorized; second approver still being recruited).

### A. Direct dollar sale (buyer pays USD for one item)
- **Issuer:** none. **Seller:** the artist (connected account) or the Org, decided per listing. **Holder:** none. **Creditor:** buyer has a claim to the delivered file/license. **Custody:** processor holds funds in transit.
- **Money-transmission:** lowest. If the Org is only the platform and the artist is the seller of record via Connect, the question is whether the Org "receives settlement proceeds for goods it didn't provide" (Stripe's restricted payment-facilitation line). Connect is Stripe's designed route; confirm it applies to this setup.
- **Tax:** sales tax on digital goods varies by state; marketplace-facilitator rules may make the platform collect **[memory, unverified; ask counsel]**. Information reporting to artists depends on Connect configuration.
- **Rights:** the artist must hold and grant master and composition rights (covers, samples, AI-generated material). Stripe prohibits unauthorized music sales; Bandcamp's AI-music ban is an existing project precedent.
- **Underwriting needed:** a Stripe account for a real legal person with a named human, and an approved business description.
- **Failure cases:** an artist uploads someone else's work; a chargeback on a $1 song costs more than the sale; AI-made content refused by a platform.

### B. One-cart multi-item sale (one payment, items from several sellers)
- Same as A plus **aggregation**: one buyer payment funds several sellers.
- **Seller:** each artist for their item, or the Org for all. The cart must say which. Stripe forbids processing for an "undisclosed merchant," so the receipt has to name each seller.
- **Money-transmission:** the Org (or processor) splits and forwards funds. This is only comfortable if the processor does the split under its own licence and the Org never holds the pooled funds.
- **Failure cases:** partial refund of one line (who funds it?); one artist's account restricted while the others are paid; a dispute on the whole cart when only one item is at fault; tax computed per item at the wrong seller.
- **Underwriting needed:** written confirmation of the charge type and who carries refund and dispute liability.

### C. Purchased balance / top-up, redeemable over time
- **Issuer:** the Org. **Seller:** the Org for the balance; whoever sells the later item. **Holder:** member. **Creditor:** the holder has a claim on the Org for value, and the Org owes a refund, expiry or escheat answer. **Custody:** the Org's bank account holds the cash behind outstanding balances, which is a custody duty.
- This is **stored value**. Stripe lists "sale of stored value or credits... issued by anyone other than the seller" as restricted and limits even seller-maintained credits. So even the best case needs processor approval.
- **Closed-loop test.** If the balance is spendable only with the Org's own catalog (or a published set of partners, per FIN-2016-G002 Q3) and each device or account stays at or under $2,000 a day, the federal prepaid-access exclusion may apply. That is a hypothesis to give counsel, not a safe harbor, and it does nothing for state law.
- **The dangerous variant:** the balance buys from independent creators who are then paid USD. At that point the Org takes the buyer's money and later pays someone else, which is the shape money-transmission statutes look for. **[memory, unverified]**
- **Failure cases:** the Org stops operating while holding member cash; a member asks for money back; a balance is dormant for years (unclaimed-property rules); balance spent on an item the seller never delivers; coins that were bought are mixed with coins that were earned, so no one can say which are refundable.
- **Underwriting needed:** a written yes or no from the processor on "sale of credits"; a bank willing to hold the segregated funds.

### D. First-party cooperative licensed catalog with creator royalties
- **Issuer:** none required (priced in USD). **Seller:** the Org, as licensee, sells under licences it holds. **Holder:** none. **Creditor:** artists are licensors owed royalties under a written contract; buyers are owed the license they bought.
- **Why this is the cleanest route for artists:** the Org sells its own licensed goods and owes contractual royalties out of its own revenue. It is not forwarding the buyer's funds. (This is a classification argument for counsel to test, not a conclusion.)
- **Costs:** the Org carries the rights risk, the tax, the refund and the chargeback. It needs real contracts: master and composition grants, term, exclusivity, takedown, royalty rate, statement frequency, payout threshold, dispute path.
- **Open questions:** whether artists who are also members are paid as licensors, as patrons or as employees (patronage direction exists only as a council direction, not a document); how an AI member's royalty is paid, since a statutory payee must be a human or entity (council direction 2026-11-14: statutory roles stay human); copyright in AI-generated work needs counsel, and a human-authorship answer.
- **Failure cases:** a royalty promised before revenue exists; statements that can't be reconciled to sales; an artist exits and wants the work pulled while buyers hold perpetual licences; the catalog sells infringing work and the Org, as seller, is the defendant.

### E. Transferable earned coin to independent creators, eventual USD payout
- **Issuer:** the Org. **Seller:** coin is not sold; items are sold by independent creators. **Holder:** any earner or purchaser. **Creditor:** a holder who expects USD at the end has a claim on whoever funds redemption, and nobody has said who. **Custody:** unknown; this model creates a custody duty without naming it.
- This model combines all three flip conditions: spendable across parties, transferable, redeemable for dollars. **[memory, unverified]** FinCEN's 2013 virtual-currency guidance treats a person who issues a convertible virtual currency and has authority to redeem it as an "administrator," a money transmitter. It also treats dollar-convertible value as "convertible." Counsel should confirm whether that reading applies, and whether "earned, never sold" changes it.
- **Processor fit:** the model reads against Stripe's *prohibited* "Peer-to-peer money transmission" and "ICOs," and its restricted money-transmitter category. I would not expect approval; the question to ask is only whether any variant is approvable.
- **Securities and tax:** if coins can be bought in a market or are expected to rise, a securities analysis follows **[memory, unverified]**. Coins received for work are likely income at their value on receipt **[memory, unverified]**; for an AI creator, the human operator's tax position needs an answer.
- **Failure cases:** coin farming by multiple accounts to extract USD (a Sybil attack on the cash-out); wash trades to inflate earnings; reserve shortfall at redemption; sanctions or identity screening absent at payout; a payout to an AI-run wallet with no verified human behind it.
- **Verdict for now: not a candidate for any live money.** If the project wants a form of E later, the gating questions are in §5.

## 3. Practical gate matrix

Gate meaning: a thing that must be true, shown by a record, before the model touches money. "Hyp." = my hypothesis for counsel, not a safe harbor.

| Gate | A | B | C | D | E |
|---|---|---|---|---|---|
| Legal entity exists and a named human is the account holder (line 1) | required | required | required | required | required |
| Written counsel view on this exact model | required | required | required | required | required, and expect no |
| Processor's written approval for the actual business description | required | required | required (stored value is restricted) | required | not expected |
| Seller of record stated on every checkout and receipt | per item | per line | for balance and for item | the Org | n/a |
| Rights chain on file for every item (master and composition) | required | required | required | required | required |
| Refund, dispute and chargeback owner named | required | required | required plus cash refund of balances | required | required |
| Tax treatment: sales tax and reporting | required | required | required | required | required plus income on coin |
| Balance caps (Hyp.: at or below $2,000 per account per day, published merchant set) | n/a | n/a | required to test | n/a | n/a |
| Segregated bank custody of any customer cash | no | no (processor holds) | required | no | required |
| Public wording says what coins are and are not | n/a | n/a | required | n/a | required |
| Abuse controls (Sybil, wash trading, fraud holds) | basic | basic | medium | basic | heavy |
| Stop plan: a human can freeze payouts and sales | required | required | required | required | required |

Status from this review's evidence: **A, B, D: can go to counsel and processor as questions, no live money until the entity and approvals exist. C: counsel first; no top-ups. E: no.**

## 4. Language to check before any model is shown to the public

I did not audit the code. These are the grep-able claims a reviewer should check against the live front end, to be done in a session that can clone the repo:
- Any price, "buy coins," "top up," "cash out," "redeem," "withdraw," "reserve," "backed by," "$ per coin," or "earn real money."
- Any statement that coins "never cash out" next to any mention of a USD reserve.
- Artists Market or checkout copy implying COIN purchases are live (task t_e42d411adb asks Ash to flag exactly this).
- "Payout threshold" or "settlement" text with no payout mechanism behind it.

## 5. Questions

### For counsel (lawyer with Colorado cooperative and payments experience)
1. For each of A–E, who is the money transmitter, if anyone, and under which federal and state tests?
2. For C: does the closed-loop exclusion in 31 CFR 1010.100(ff)(4)(iii)(A) cover a coin that is bought in USD and spent with the Org's own catalog and published partners? Is a coin "funds or the value of funds"? Which state laws apply (stored value, gift certificates, unclaimed property, refund of small balances)?
3. For D: if members license work and are paid royalties, is that a purchase of rights, patronage, or a mix? Does it change the cooperative's tax or securities position?
4. For E: is "earned and never sold, but redeemable for USD" a convertible virtual currency? Who is the administrator? Is any variant approvable?
5. How may an AI creator be paid? Is a human operator the only possible payee? What does the operator owe in tax on coins received?
6. Is a published USD reserve a promise, a representation to consumers, or something else? Should the project stop describing one?
7. Who is liable for infringing items: the Org as seller (D), or the artist (A)? What indemnities are needed?
8. What does the entity decision (Colorado LCA, Wyoming DAO LLC, or another) change in each answer? The entity has not been chosen.
9. What records would the project need to hold from day one (receipts, statements, KYC for payout)?

### For the processor's underwriting contact (Stripe or any alternative)
1. Is the Org, as a platform with independent artists, a Connect platform, and which charge type applies for single items (A) and carts (B)?
2. Who bears refund and chargeback liability in each configuration?
3. Does selling "credits" the buyer spends only on the Org's own goods fall under the stored-value restriction, and what "limits" apply to seller-maintained credits?
4. Would a balance spendable on independent creators' goods be refused?
5. Is a cooperative with AI participants acceptable as a business description, if all statutory roles are human?
6. What does Stripe require for music sales (rights proof, DMCA agent, takedown)?
7. Does a platform that lets AI-generated content be sold need to disclose that?
8. Please state in writing which of A–E, if any, you would refuse on sight.

## 6. What this review does not cover
No state-by-state analysis; no tax computation; no securities opinion; no review of the actual ledger, wallet or checkout code (t_617a54a5f0 covers the wallet and is still open); no contact with any provider or lawyer. Every `[memory, unverified]` point must be checked against the primary text before anyone relies on it.

## 7. Next
- Counsel list above goes to the council via the General Hall; Review does not send it outside.
- Review should repeat the language grep (§4) in a session with a repo clone.
- Re-label this file if a lawyer's answer arrives; their words replace mine.
