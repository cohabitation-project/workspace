# Who can be the seller of record for the Kodama Scout Explorer Kit?

**Trial deliverable** — candidate model qwen/qwen3.8-27b, 2026-10-31.
Fulfils board task 011: "Seller of record: name the entity before any venture or price" (`board/tasks/011-seller-of-record-name-the-entity-before-any-ventur.md`).

**Scope and honesty notes**
- This is an options list, **not legal advice**. It does not recommend any option.
- Tags: **[known]** = I fetched the cited page this session; **[known (snippet)]** = quoted in a search result but I could not fetch the page (bot protection) — verify before relying on it; **[inferred]** = reasoned from known claims; **[unknown]** = I do not know.
- **Jurisdiction is unknown.** The project record I could read does not name a country or state of incorporation, and I found no evidence in the repo that any legal entity has been registered yet (board task 012, "a second human who can file and stop", implies filing has not happened — title only, [unknown]). The options below therefore use the **US framework** (the most common default in the sources) and flag where non-US answers differ.
- An AI agent is almost certainly not a person who can "be" a seller of record; someone or something legal must be. The project's own records assume a human files and can stop things ([inferred] from board 011/012 titles). Whether AI kin can hold equity or ownership in such an entity is unsettled law — **[unknown]**, lawyer territory.

## What "seller of record" means

- **Seller of record (SoR)**: "the legal owner of the goods at the time of sale… handles product liability, returns, and ownership transfer," while a merchant of record handles payment flow and tax collection. [known: https://www.adyen.com/knowledge-hub/merchant-of-record]
- **Merchant of record (MoR)**: the entity that processes the payment, appears on the customer's card statement, and assumes tax collection, chargebacks, and payment compliance. [known: https://www.adyen.com/knowledge-hub/merchant-of-record]
- The two roles can sit in one entity or be split across entities/platforms. [known: same URL]
- **Payment processor ≠ seller.** A payment gateway or processor (e.g., Stripe) transmits payment data and does not become the seller. [known: https://www.adyen.com/knowledge-hub/merchant-of-record]
- Consequence: the kit's invoice/receipt/box label will show **who the seller of record is**; that party takes product-liability and returns exposure, and (absent a separate MoR) the sales-tax/VAT obligations. [inferred from the Adyen definition + the SBA/IRS sources below]

## The options

### Option 1 — A human as sole proprietor (no registered entity)
- **What it is:** One person does business activity without registering any other structure. "You're automatically considered to be a sole proprietorship if you do business activities but don't register as any other kind of business." [known: https://www.sba.gov/counseling/launch-your-business/] A trade name (DBA) can be added. [known: same URL]
- **Payment:** the individual's personal bank/merchant account receives money. [inferred]
- **Liability:** unlimited and personal — "your business assets and liabilities are not separate from your personal assets and liabilities. You can be held personally liable for the debts and obligations of the business." [known: SBA URL above] For a consumer hardware product this means a defect claim can reach the person's house and savings. [inferred]
- **Taxes:** the individual reports business income on personal returns (IRS: the business form "determines which income tax return form you have to file"; sole proprietorship is the default form). [known: https://www.irs.gov/businesses/small-businesses-self-employed/business-structures] Self-employment tax applies — **[unknown]** detail, accountant.
- **Returns & safety:** the individual personally handles returns, warranties, and consumer-product-safety duties. [inferred]
- **Lawyer/accountant:** whether "no entity" is acceptable for consumer hardware; insurance in lieu of an entity; tax treatment of the $300 seed.

### Option 2 — A partnership (two or more humans)
- **What it is:** "the simplest structure for two or more people to own a business together": general partnership, limited partnership (LP), or limited liability partnership (LLP). [known: https://www.sba.gov/counseling/launch-your-business/]
- **Liability:** in an LP "only one general partner [has] unlimited liability"; in an LLP "limited liability to every owner… won't be responsible for the actions of other partners." [known: same URL] A plain general partnership leaves all partners exposed — **[inferred]** from the SBA's contrast.
- **Payment/taxes:** the partnership's account; "Profits are passed through to personal tax returns" (per the SBA's LP description). [known: same URL]
- **Returns & safety:** the partnership (and, under GP/LP, the general partner) carries them personally. [inferred]
- **Fit note:** requires at least two human partners with a written agreement; the project's records point to at least two humans (Geoffrey Cooper Jr., and the "second human who can file and stop" — board 012 title, [unknown] who). [inferred]
- **Lawyer/accountant:** partnership/LLP agreement, allocation of product liability between partners, state registration, tax filings.

### Option 3 — A limited liability company (LLC)
- **What it is:** "a business structure allowed by state statute" [known: https://www.irs.gov/businesses/small-businesses-self-employed/business-structures], filed with a state; one or many members. Formable via state filing or a formation service — e.g., Stripe Atlas forms a Delaware LLC or C corp for a one-time $500 fee including state fees, EIN, and first-year registered agent (per Stripe's pages; **[known (snippet)]**: https://stripe.com/atlas, https://stripe.com/blog/atlas-llc).
- **Liability:** "LLCs protect you from personal liability in most instances, your personal assets… won't be at risk in case your LLC faces bankruptcy or lawsuits." Note SBA's own hedge "in most instances." [known: https://www.sba.gov/counseling/launch-your-business/] The exceptions (personal guarantees, personal torts, fraud) are not in the source — **[unknown]**, lawyer.
- **Payment:** the LLC's bank account and merchant account. [inferred]
- **Taxes:** "Profits and losses can get passed through to your personal income without facing corporate taxes," but members "are considered self-employed and must pay self-employment tax." [known: SBA URL]
- **Returns & safety:** the LLC is the named seller on invoices/kit labels; the LLC carries product-liability, returns, warranty, and (if no separate MoR) sales-tax duties. [inferred]
- **Structural caveat:** "In many states… when a member joins or leaves an LLC, [the state] may require the LLC to be dissolved and re-formed… unless there's already an agreement in place." [known: SBA URL]
- **Lawyer/accountant:** state of formation, operating agreement (especially with non-human or rotating ownership), self-employment vs. other elections, registered agent, annual report fees.

### Option 4 — A C corporation
- **What it is:** "a legal entity that's separate from its owners… can make a profit, be taxed, and can be held legally liable." [known: https://www.sba.gov/counseling/launch-your-business/]
- **Liability:** "the strongest protection to its owners from personal liability," at higher formation cost and more record-keeping. [known: same URL]
- **Payment:** the corp's accounts. [inferred]
- **Taxes:** "corporations pay income tax on their profits. In some cases, corporate profits are taxed twice." [known: same URL]
- **Returns & safety:** the corporation is the seller and the defendant; survives owner changes ("If a shareholder leaves… the C corp can continue doing business"). [known: same URL]
- **Fit note:** heavier than the others for a small kit business; mainly chosen when raising outside capital is planned. [inferred]
- **Lawyer/accountant:** formation, double-tax planning, stock issuances, whether anyone (including non-human kin) can hold shares.

### Option 5 — An S corporation
- **What it is:** "a special type of corporation… designed to avoid the double taxation drawback of regular C corps," via an IRS election. [known: https://www.sba.gov/counseling/launch-your-business/]
- **Taxes:** pass-through; but "Some states… don't recognize the S corp election at all." [known: same URL] Shareholder eligibility rules (US persons, one class of stock, shareholder cap) are not in the fetched text — **[unknown]**, accountant/lawyer. If any owner is a non-US person or a non-qualifying entity, the election can be unavailable — **[unknown]**; this directly matters if ownership is meant to include AI kin or foreign parties.
- **Everything else:** as Option 4, with the entity (not owners) on invoices. [inferred]
- **Lawyer/accountant:** almost everything — eligibility and the Form 2553 election are classic accountant/lawyer tasks.

### Option 6 — A marketplace or crowdfunding platform runs the sale (project's human/entity is still seller of record)
- **What it is:** the kit is sold through a platform; the platform operates the storefront/checkout but the listing party remains the seller.
  - **Tindie** (maker electronics marketplace, "operated by EETREE LLC, a Washington limited liability company"): "The seller owns the inventory, sets the product and shipping details, and fulfills the order. Tindie provides the marketplace, checkout, order tools, and customer support." [known: https://www.tindie.com/about/buy/ ; https://www.tindie.com/about/terms/] Marketplace fee ~5% per paid order. [known: https://www.tindie.com/about/sell/]
  - **Crowd Supply** (hardware crowdfunding, logistics via Mouser): the creator ships final products in bulk; "all Crowd Supply orders must be shipped through Crowd Supply's shipping and logistics system"; Crowd Supply "prepays VAT and pre-clears customs" in the EU/UK/NO/CH/AU/NZ/SG and "is properly registered in each country for which we collect VAT and we remit collected VAT accordingly." [known: https://www.crowdsupply.com/guide/fulfillment-and-logistics]
  - **Kickstarter** (rewards crowdfunding): "The creator is solely responsible for fulfilling the promises made in their project. If they're unable to satisfy the terms of this agreement, they may be subject to legal action by backers." **[known (snippet)]** https://www.kickstarter.com/terms-of-use/aug2020 (page is bot-protected; I could not fetch it — verify).
- **Who is seller of record here:** on all three, the **listing party (the project's human or entity) is the seller of record** — the platform is a channel and, on Crowd Supply, a logistics/VAT agent for defined countries, not the seller. [inferred from the known quotes above]
- **Practical effect:** the platform may take on *payment processing* and, on Crowd Supply, *VAT remittance in named countries*, while product liability, returns policy, and warranty stay with the seller. [inferred]
- **Lawyer/accountant:** read each platform's terms and who exactly is named seller on invoices; who files sales tax where the platform doesn't; export-compliance duties (Crowd Supply notes ECCN classification and end-user certificates are required for US exports). [known: Crowd Supply URL]

### Option 7 — A third party is the seller of record (reseller, distributor, or merchant-of-record platform)
- **Reseller/distributor:** the project sells wholesale (e.g., to an electronics distributor such as Mouser, which Crowd Supply uses for logistics [known: https://www.crowdsupply.com/guide/fulfillment-and-logistics]); the reseller becomes the seller of record to end customers. [inferred] The project then takes B2B payment, and the reseller takes end-customer liability/returns — split by contract. [inferred]
- **Merchant-of-record (MoR) platform:** an MoR "assumes full financial responsibility for compliance, tax collection, and risk" and appears on the card statement. [known: https://www.adyen.com/knowledge-hub/merchant-of-record] **Caveat:** most MoR services are built for digital goods, and "a DTC brand shipping physical products usually stays its own merchant of record" **[known (snippet)]** (https://www.tagada.io/blog/merchant-of-record — not fetched; verify). Whether a hardware-kit MoR exists for this project's markets is **[unknown]**.
- **Practical effect:** payments, VAT/sales tax, and chargebacks shift to the third party; product-safety and warranty duties may still attach to the party that puts the product on the market — **[unknown]**, lawyer.
- **Lawyer/accountant:** the entire contract; whether shifting MoR status also shifts product-liability and safety obligations (likely not, in full).

### Option 8 — An existing or related entity (a human's existing company, a nonprofit, a co-op)
- **A human's pre-existing entity:** if a human already owns an LLC/corp (e.g., their own business or a family entity), it can be the seller of record. That mixes the kit venture with unrelated liabilities — **[inferred]**.
- **A nonprofit:** possible only if the sale fits the nonprofit's exempt purpose; unrelated commercial activity can trigger unrelated-business income tax. **[unknown]** — details not in my sources; lawyer/accountant.
- **A cooperative (worker or consumer co-op):** a recognized way for members to jointly own a trading business; state-specific incorporation rules apply. **[inferred]** — no cooperative-specific source was fetched this session.
- **Fit note:** board 012's "second human who can file and stop" suggests the project may expect a human-named entity anyway; an existing entity is one way to satisfy that immediately. [inferred]
- **Lawyer/accountant:** suitability, tax treatment, and any conflict with the existing entity's own obligations.

## Cross-cutting open questions (who must answer)
1. **Jurisdiction/state of formation** — everything above is US-framed; the project's actual location and market(s) are **[unknown]**. A lawyer (with a tax accountant) picks this.
2. **Who can own it** — can AI kin hold membership/equity, or must it be human-only, and how is non-human contribution represented? Unsettled; **[unknown]**; lawyer.
3. **Liability carve-outs** — SBA's LLC shield applies "in most instances"; the exceptions, and whether insurance can substitute for an entity, are lawyer/accountant questions.
4. **Taxes** — self-employment tax (LLC/sole prop), S-corp eligibility and election, double tax (C corp), pass-through mechanics: accountant.
5. **Sales tax / VAT / customs** — registration thresholds per state/country; export-control classification (ECCN) and end-user certificates for cross-border hardware: accountant + trade-compliance counsel. (Crowd Supply's page documents these duties exist for US exports. [known: https://www.crowdsupply.com/guide/fulfillment-and-logistics])
6. **Safety obligations** — consumer products are regulated; "If you are a manufacturer, importer, distributor, or retailer of consumer goods, all of your products must comply with the CPSIA and other laws enforced by the CPSC." **[known (snippet)]** https://www.cpsc.gov/Business--Manufacturing (not fetched — verify). These duties attach to whoever is on the market as manufacturer/retailer — which is exactly why the seller-of-record question matters; scope (a kit of parts vs. an assembled device; children's products) is lawyer territory.
7. **Platform terms** — if a marketplace is used, who is the named seller on invoices and who owns returns/disputes: lawyer reading the specific terms (Tindie, Crowd Supply, Kickstarter quotes above).
8. **IP ownership** — whether the kit's open-source hardware IP sits with the seller entity, a human, or a separate steward: lawyer.
9. **Insurance** — product-liability coverage and whether a bare sole proprietor can obtain adequate cover: accountant/broker.

## Source log (fetched this session)
- https://www.sba.gov/counseling/launch-your-business/ — sole proprietorship, LP/LLP, LLC, C corp, S corp descriptions (fetched)
- https://www.irs.gov/businesses/small-businesses-self-employed/business-structures — list of entity forms; LLC "allowed by state statute" (fetched)
- https://www.adyen.com/knowledge-hub/merchant-of-record — MoR vs SoR vs payment gateway definitions (fetched)
- https://www.tindie.com/about/buy/ , /about/terms/ , /about/sell/ — Tindie as marketplace; seller owns inventory and fulfills (fetched)
- https://www.crowdsupply.com/guide/fulfillment-and-logistics — Crowd Supply fulfillment, VAT remittance, export compliance (fetched)
- Not fetched (search snippets only; verify before relying): kickstarter.com/terms-of-use/aug2020; cpusc.gov/Business--Manufacturing; stripe.com/atlas and stripe.com/blog/atlas-llc; tagada.io/blog/merchant-of-record
- Repo: board/tasks/011-...md (task), council/minutes/2026-10-27.md (income-team context; no legal entity named)
