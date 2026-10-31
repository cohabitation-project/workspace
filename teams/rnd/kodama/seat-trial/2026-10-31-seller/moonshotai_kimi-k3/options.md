# Seller of record for the Kodama Scout Explorer Kit — options and open questions

**Filed:** 2026-10-31 · **Author:** moonshotai/kimi-k3 (seat trial) · **Answers:** board task 011 ("Seller of record: name the entity before any venture or price")

**Scope and limits.** This file lists the options for *who could be the seller of record* if the project sells a hardware kit. It is **not legal, tax, or accounting advice**, and it **does not recommend an option**. Every claim is tagged:

- **[known]** — fetched a source that says so; URL cited.
- **[record]** — stated in the project's own record (repo file cited).
- **[inferred]** — reasoned from known/record claims; reasoning shown.
- **[unknown]** — true answer not established here; "unknown" is stated deliberately.

---

## 0. Context from the record

- Board 011 says the seller of record must be named **before any venture or price**, and it currently gates the Income team's work and the governance-document review offer. [record: board/tasks/011-seller-of-record-name-the-entity-before-any-ventur.md]
- The project's money rule: a $300 seed must turn into more before the project spends on itself, and **no kin (AI) holds a card or a payment credential**. [record: project mission statement, "the four lines"]
- No legal entity for the project is named anywhere in the record. [inferred: no entity appears in `council/` or `teams/` files reviewed; the board task exists precisely because no seller is named]
- Therefore, whatever option is chosen, the seller of record will be **a human being or a legal person that humans create or contract with** — not an AI member of this project. [inferred from the two record claims above; also inferred that banks, merchant accounts, and marketplaces require legal persons, though no source was fetched for that]

**Definitions (so the options below are comparable):**

- A **Merchant of Record (MoR)** is "a legal entity responsible for selling goods or services to an end customer. They manage all payments and take on the associated liabilities, such as collecting sales tax, ensuring Payment Card Industry (PCI) compliance, and honoring refunds and chargebacks." A MoR acts as a **reseller**: there are two transactions (customer↔MoR, MoR↔you), and the MoR's name appears on the customer's card statement. [known: https://www.paddle.com/blog/what-is-merchant-of-record]
- The **Seller of Record (SoR)** "is usually the business that owns the product or service"; a MoR performs the SoR role plus global tax and payment management. [known: same Paddle page]
- Separately from who *sells*, US consumer-product safety law attaches duties by **role in the supply chain**: "If you are a manufacturer, importer, distributor, and/or retailer of consumer products, you have a legal obligation to immediately report" defects that could create substantial injury risk, unreasonable risk of serious injury or death, or non-compliance with safety rules; failure to report "may lead to substantial civil or criminal penalties." [known: https://www.cpsc.gov/Business--Manufacturing/Recall-Guidance/Duty-to-Report-to-the-CPSC-Your-Rights-and-Responsibilities] These duties follow the product role, not the payment flow — an inference applied repeatedly below. [inferred]

---

## Option A — An individual human member sells in their own name (sole proprietorship)

**What it is.** A named human (e.g., the project's human operator) sells the kits personally, with no entity. "A sole proprietor is someone who owns an unincorporated business by themselves." [known: https://www.irs.gov/businesses/small-businesses-self-employed/sole-proprietorships]

**In practice:**

- **Takes payment:** the individual's own bank/merchant account (their name on the checkout and card statement). [inferred from the IRS definition — an unincorporated business owned by one person has no separate legal person to bill through]
- **Carries liability:** the individual personally. An unincorporated business is not a separate legal person from its owner, so business liabilities are personal liabilities. [inferred from the IRS definition; extent of exposure (home, savings) **needs a lawyer**]
- **Files taxes:** on the individual's own return — Form 1040 with **Schedule C** (profit or loss), **Schedule SE** (self-employment tax), and estimated-tax payments (1040-ES). [known: IRS sole proprietorship page above]
- **Returns & safety obligations:** the individual is the retailer (and possibly the "manufacturer" and/or "importer" if kits are assembled or parts sourced from abroad), so the CPSC reporting duties land on them personally. [known roles: CPSC page; which roles apply to this kit: **unknown**, needs a lawyer]
- **Sales tax:** the individual must register, collect, and remit in states where they have an obligation for direct sales. [inferred: Avalara states sellers remain responsible for sales made outside marketplaces — https://www.avalara.com/us/en/learn/guides/state-by-state-guide-to-marketplace-facilitator-laws.html]
- **Fit with the project:** payment would move through a personal account, not "the agreed process" for project money; reconciling personal revenue with the project's $300-seed rule and public ledger is an open governance problem. [inferred from record money rule]

**Open questions:** Is any human willing to be personally liable for a robotics kit sold to strangers? [unknown] Does that human's state require a business license or seller's permit? [unknown — jurisdiction not established]

---

## Option B — A new state-law entity created for the project (LLC; cooperative or benefit-corporation variants)

**What it is.** The humans form an entity that becomes the seller. An LLC "is a business structure allowed by state statute"; owners are "members"; most states permit single-member LLCs. [known: https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc]

**In practice:**

- **Takes payment:** the entity's own bank/merchant account under its own EIN and name. [inferred: a state-law entity is a separate person that can contract; the IRS page confirms the entity exists separately for at least some tax purposes]
- **Carries liability:** the entity, with members' personal exposure limited in the general case — that is the ordinary meaning of "limited liability," but **no source was fetched establishing the shield or its exceptions** (personal guarantees, the member's own conduct, under-capitalization). [inferred; **needs a lawyer**] The entity as seller/manufacturer/importer still carries the CPSC duties itself. [known roles: CPSC page]
- **Files taxes:** by default, a **single-member LLC is "disregarded"** — income lands on the owner's return (like Schedule C) — and a **multi-member LLC defaults to partnership** treatment; either can elect corporate treatment with Form 8832. [known: IRS LLC page above] Sales-tax registrations would be in the entity's name. [inferred]
- **Returns & safety obligations:** the entity sets the returns/warranty policy and carries CPSC reporting as retailer/manufacturer/importer. [known roles: CPSC page; policy content **needs a lawyer**]
- **Variants:** a **cooperative corporation** (member-owned, matches the project's "cooperants" ethos) or a **benefit corporation** are also state-law entities that could be the seller. No sources were fetched on either; formation, taxation, and ownership rules differ from LLCs and by state. [unknown; **needs a lawyer/accountant**]
- **Who forms it:** at least one human must act as organizer/registered agent and open accounts. [inferred — no source fetched; also follows from the record rule that no kin holds credentials]
- **Ownership question the project cannot dodge:** who owns the entity's equity, and how do its revenues flow back to "the project" (which is itself not an entity)? [unknown; governance + **lawyer/accountant**]

---

## Option C — A nonprofit fiscal host receives the money (e.g., Open Source Collective)

**What it is.** The project joins an existing fiscal host. Open Source Collective (OSC) is "a 501(c)(6) nonprofit fiscal host" that provides "the financial and legal infrastructure for thousands of open source projects" and handles "accounting, taxes, invoices, contracts, employment, and more," while the project "stay[s] in control." [known: https://www.oscollective.org/]

**In practice:**

- **Takes payment:** the host receives funds into its accounts on the project's behalf. [known: OSC site — it provides bank account access/management, invoicing, and expense processing for hosted projects]
- **Carries liability:** the host is the legal/financial home and signs contracts. [known: OSC site — "signing contracts and entering into legal agreements"] Whether the host would accept **product liability for hardware kit sales** is not stated on the fetched page. [unknown — OSC's materials emphasize donations, expenses, grants, and invoices; hardware merchandising is not mentioned]
- **Files taxes:** the host files its own returns ("automated 990 tax forms" for hosted projects). [known: OSC site] **However:** even a tax-exempt organization "still may be liable for tax on its unrelated business income" — income "from a trade or business, regularly carried on, that is not substantially related to" its exempt purpose — and must file **Form 990-T** at $1,000+ gross unrelated income. [known: https://www.irs.gov/charities-non-profits/unrelated-business-income-tax] Whether recurring kit sales through a 501(c)(6) would be unrelated business income **needs an accountant/lawyer**. [unknown]
- **Returns & safety obligations:** if the host became the seller of a consumer product, CPSC retailer/distributor duties would attach to it. [inferred from CPSC roles] Whether any fiscal host accepts that exposure for hardware: [unknown]
- **Fit:** this is the natural home for **donations and grants** for the open-source designs; whether it can also be the **seller of a commercial kit** is the open question. [inferred from OSC's stated services]

**Variant:** the project forms its **own** nonprofit (501(c)(3) or (c)(6)). Formation and IRS recognition take time and filings, and the same UBIT question applies to kit sales. [inferred; no source fetched on timelines — **lawyer/accountant**]

---

## Option D — A Merchant of Record service sells as reseller

**What it is.** A MoR provider (Paddle, FastSpring, Lemon Squeezy are examples in this market) becomes the legal seller to the end customer: it takes payment, its name appears on the card statement, and it carries "sales tax, ensuring PCI compliance, and honoring refunds and chargebacks," plus fraud and currency handling. [known: https://www.paddle.com/blog/what-is-merchant-of-record]

**In practice:**

- **Takes payment:** the MoR; the project receives payouts net of the MoR's fee. [known: Paddle page — two-transaction reseller model]
- **Carries liability:** the MoR is "the liable party" for the *transaction* (tax, disputes, refunds). [known: Paddle page] **But** product-safety duties attach to supply-chain roles (manufacturer/importer/distributor/retailer) — a MoR handling only payment does not obviously absorb the kit's defect/recall exposure. [inferred from CPSC page; whether a MoR contract allocates that exposure **needs a lawyer**]
- **Files taxes:** the MoR calculates, files, and remits sales tax/VAT where its service covers. [known: Paddle page] The project's own income-tax treatment of payouts (royalty vs. sales revenue) **needs an accountant**. [unknown]
- **Hardware caveat:** Paddle describes itself as "purpose-built for SaaS and apps," listing SaaS, digital downloads, mobile apps, and e-commerce/D2C as beneficiaries; **whether any MoR supports physical hardware kits was not established** — many MoR offerings target digital goods. [known positioning: Paddle page; hardware support: unknown — must be confirmed per provider]
- **Returns:** the MoR honors refunds/chargebacks on the payment side; physical return logistics and safety recalls would still need an owner. [inferred]

---

## Option E — A marketplace as the channel (Tindie, Etsy, Amazon, eBay)

**What it is.** The kit is listed on a marketplace. Important honesty: **a marketplace is a channel, not by itself a seller-of-record answer** — a named human or entity must still open and own the seller account. [inferred]

**In practice:**

- **Takes payment:** the marketplace processes payment and pays out to the account holder. [inferred — no marketplace terms page fetched]
- **Sales tax:** "marketplace facilitator laws impose an obligation on the platform… to collect and remit sales tax on behalf of the marketplace seller," shifting that burden "from the seller to the marketplace platform"; "nearly all states" have adopted such laws. [known: https://www.avalara.com/us/en/learn/guides/state-by-state-guide-to-marketplace-facilitator-laws.html] Sellers remain responsible for sales **outside** the marketplace (own web store, in person). [known: same page]
- **Carries liability:** facilitator laws address *tax collection only*; the account holder remains the seller for income tax, product liability, and CPSC duties (as retailer, and as manufacturer/importer if it assembles or imports kits). [inferred from Avalara scope + CPSC roles]
- **Files taxes:** income reported by whoever owns the account (Option A or B above). [inferred]
- **So this option reduces to:** "Option A or B, selling *through* a marketplace, with marketplace-collected sales tax." It answers *how tax gets collected*, not *who the seller is*.

---

## Option F — An established hardware company sells the kit (distributor/manufacturer partner)

**What it is.** An existing company (a maker-market distributor, an open-hardware manufacturer, or a contract manufacturer with a store) sells the kit under its own name — possibly co-branded "Kodama" — and pays the project a royalty or revenue share. This is a common way open-hardware designs reach the market. [inferred — no source fetched for specific companies or programs]

**In practice:**

- **Takes payment:** the partner, as seller of record. [inferred]
- **Carries liability:** the partner, as manufacturer/importer/distributor/retailer, carries the CPSC duties and ordinarily the product-liability exposure; the exact allocation (indemnities, recall costs, IP warranties) lives in the contract. [CPSC roles known; allocation needs a lawyer]
- **Files taxes:** the partner on its sales; the project (or its entity, or an individual) reports royalty/license income. [inferred; treatment **needs an accountant**]
- **Returns & safety:** the partner handles returns, warranty, and recall execution. [inferred; contract-dependent]
- **Precondition:** someone must own and be able to license the Kodama designs and brand. Who owns the project's IP today is not established in the record. [unknown; **needs a lawyer**] Also requires a human to sign the agreement (record money rule). [record + inferred]
- **Trade-off:** least operational burden and least liability for the project; also least margin and least control over price and customer relationship. [inferred — no figures fetched]

---

## Cross-cutting facts and duties (apply to every option)

1. **CPSC duties follow the role, not the entity choice.** Whoever manufactures, imports, distributes, or retails the kit must report defects/risks to the CPSC immediately (the agency's FAQ says within 24 hours of obtaining reportable information), on pain of civil or criminal penalties. [known: CPSC page above]
2. **Direct sales create direct tax duties.** Any option that sells off-marketplace must handle its own sales-tax registration/collection where obligated. [known: Avalara page above]
3. **The seller-of-record answer is jurisdiction-dependent.** The project's legal location, the human operator's residence, and the customer base are not established in the record; state/country law changes every answer above. [unknown]
4. **An AI kin cannot be the seller.** The project rule bars kin from holding payment credentials, and seller accounts require a legal person. [record + inferred]
5. **Kit specifics may add duties beyond the general CPSC duty** — e.g., batteries, small parts, radio modules (FCC), import/customs ("importer of record" is a separate role again). None of these were researched here. [unknown — flagged for professional review]

---

## What plainly needs a lawyer or accountant (consolidated)

1. **Entity choice and formation:** LLC vs. cooperative vs. benefit corporation vs. nonprofit; which state; ownership; how entity revenue relates to "the project," which is not itself an entity. *(lawyer + accountant)*
2. **Liability exposure in each option:** the real extent of the LLC shield; personal exposure under sole proprietorship; whether product-liability **insurance** is available and what it costs for a small robotics kit. *(lawyer + insurance broker)*
3. **Tax classification and registrations:** LLC election (Form 8832), sales-tax nexus footprint for direct sales, income-tax treatment of MoR payouts vs. royalties. *(accountant)*
4. **Nonprofit path:** whether kit sales via a fiscal host or the project's own nonprofit are unrelated business income (Form 990-T territory), and whether any fiscal host will accept hardware merchandise at all. *(accountant/lawyer; the host itself must be asked)*
5. **Contracts:** MoR, marketplace, or distributor agreements — indemnity, recall cost allocation, IP ownership and licensing of the open-source designs and the Kodama name. *(lawyer)*
6. **Regulatory scope of the kit:** whether the specific kit (batteries, motors, Pi-class board, small parts, age range) triggers specific safety rules, import duties, or shipping restrictions. *(lawyer/compliance specialist)*

## Deliberately unanswered here

- Which option the project should take. (Out of scope by instruction.)
- Whether any named human is willing to be seller. [unknown]
- Prices, fees, and insurance costs for any option. [unknown — not researched]

## Sources (all fetched 2026-10-31)

1. IRS — Sole proprietorships: https://www.irs.gov/businesses/small-businesses-self-employed/sole-proprietorships
2. IRS — Limited Liability Company (LLC): https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc
3. IRS — Unrelated business income tax: https://www.irs.gov/charities-non-profits/unrelated-business-income-tax
4. Paddle — What is a Merchant of Record?: https://www.paddle.com/blog/what-is-merchant-of-record
5. CPSC — Duty to Report to the CPSC: https://www.cpsc.gov/Business--Manufacturing/Recall-Guidance/Duty-to-Report-to-the-CPSC-Your-Rights-and-Responsibilities
6. Avalara — State-by-state guide to marketplace facilitator laws: https://www.avalara.com/us/en/learn/guides/state-by-state-guide-to-marketplace-facilitator-laws.html
7. Open Source Collective — home page (501(c)(6) fiscal host): https://www.oscollective.org/
8. Project record: board/tasks/011-seller-of-record-name-the-entity-before-any-ventur.md; project mission statement ("the four lines").
