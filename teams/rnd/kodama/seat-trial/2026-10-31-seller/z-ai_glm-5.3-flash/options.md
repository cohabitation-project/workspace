# Options for Seller of Record — Kodama Scout Explorer Kit

**Prepared by:** z-ai/glm-5.3-flash candidate, seat-trial session 2026-10-31.
**Task:** board task 011 — "Seller of record: name the entity before any venture or price." Lay out the options; give no legal advice and no recommendation.

**Tagging scheme (as instructed):**
- **[KNOWN]** — I fetched a source that says so; URL cited.
- **[INFERRED]** — reasoned from known claims (mine or another session's fetched sources, noted).
- **[UNKNOWN]** — not established; "unknown" is the honest answer.

**Provenance note:** Some citations are to pages cached in this repo by other candidates' seat-trial sessions (I state the repo path). The IRS page I fetched live this session. Where I only have a search-result snippet, I say so and mark the claim accordingly.

**Project-internal facts used below (from the repo record, not external law):**
- Board task 011 asks that the entity be named before any venture or price; the request originated from council minutes 2026-10-27 and is carried by Geoffrey Cooper Jr. [KNOWN, repo: `board/tasks/011-seller-of-record-name-the-entity-before-any-ventur.md`]
- The product is the Kodama Explorer Kit at a proposed USD 150, targeting educators/parents; the revenue target is $300 → $900. [KNOWN, repo: `teams/income/300_to_900_plan.md`]
- Project rule 1: money moves only through the agreed process; "no kin holds a card or a payment credential." [KNOWN, project mission text given to this session]

---

## Option 1 — Geoffrey Cooper Jr., as an individual (sole proprietor)

**What it is:** The project's existing human principal sells the kit in his own name, with no new legal entity.

**In practice:**
- **Who takes payment:** Geoffrey, through a payment account in his name (e.g., Stripe or a marketplace seller account). Note the tension: project rule 1 says no kin holds a payment credential — under this option the payment credential is necessarily held by one human. [INFERRED from rule 1]
- **Who carries liability:** Geoffrey personally — for product liability (a physical robot kit with motors, batteries, and small parts sold to educators/parents), contract disputes, and debts. [INFERRED — general principle; no source fetched in this session on sole-proprietor liability, so the *existence of unlimited personal liability* is an inference from how sole proprietorships work and should be confirmed]
- **Who files taxes:** Geoffrey, on his personal return; business income is reported like self-employment income. [INFERRED — this session fetched the IRS page only for the SMLLC case (Option 2); the sole-proprietor tax treatment was not independently fetched]
- **Returns & safety obligations:** Whoever is the "manufacturer," "importer," or "retailer" of the kit carries the consumer-product-safety obligations (see CPSC material under Option 7's safety block). With no entity, that person is Geoffrey. [INFERRED]

**What needs a lawyer or accountant:**
- Whether an individual is the right fit given the product's injury-liability profile (batteries, motors, child-adjacent buyers) — this is a risk-tolerance and insurance question for a human and a professional, not something this document should decide.
- Whether Geoffrey already owns a business entity that could be used instead (see "Cross-cutting unknowns").

---

## Option 2 — A new single-member LLC owned by Geoffrey

**What it is:** A limited liability company (an entity created by state statute) with Geoffrey as the only member.

**In practice:**
- **Who takes payment:** The LLC, via a merchant account in the LLC's name. [INFERRED — standard practice; not sourced this session]
- **Who carries liability:** The LLC, with the owner's personal exposure generally limited — **but** the IRS page fetched this session covers tax treatment only, not liability shielding, so I mark the liability claim itself as an inference needing confirmation. [INFERRED]
- **Who files taxes:** By default a single-member LLC is a **disregarded entity**: the IRS treats it "as part of the owner's tax return," the LLC reports using the owner's SSN/EIN, and income lands on the owner's Schedule C. It can elect corporate or partnership classification instead (Form 8832). Exception: for **employment taxes** and **certain excise taxes**, the disregarded SMLLC is treated as a separate entity and must use its own name and EIN. An SMLLC without employees and excise-tax liability does not need an EIN, though one is usually obtained (e.g., to open a bank account). [KNOWN — https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies, fetched live 2026-10-31]
- **Returns & safety obligations:** Under 16 CFR § 1110.7, the **domestic manufacturer or importer** of a general-use consumer product subject to a CPSC rule must draft and issue a General Certificate of Conformity (GCC); the importer need not be US-located. GCCs must be furnished to distributors and retailers and produced to CPSC/Customs on request (CPSA §14(g)(3)). If kits are imported (e.g., assembled or manufactured overseas), the importer of record — under this option, the LLC — is the legally responsible party. [KNOWN — CPSC GCC FAQ, https://www.cpsc.gov/FAQ/GCC, cached copy at repo `teams/rnd/kodama/seat-trial/2026-10-31-seller/deepseek_deepseek-v4.1-flash/fetched/03-www.cpsc.gov.txt`]
- **Membership:** Single-member means one human owner; this concentrates control in Geoffrey and leaves the AI kin and other humans with no legal standing in the entity. [INFERRED]

**What needs a lawyer or accountant:**
- Which state to form in and whether an AI/agent can be a member (see cross-cutting unknowns).
- Whether liability shielding holds for a founder who personally controls every decision ("veil piercing") — a lawyer question.
- Whether S-corp election is worth it at kit-sale revenue levels — accountant question.

---

## Option 3 — A multi-member LLC (or member-managed co-op style LLC) owned by the kin

**What it is:** An LLC whose members are the project's humans (and possibly a structure designed around the cooperative character of the project), governed by an operating agreement.

**In practice:**
- **Who takes payment:** The LLC. **Who carries liability:** the LLC, subject to the same confirmations as Option 2. **Who files taxes:** a multi-member LLC is taxed by default as a partnership, which is outside what this session fetched — the IRS pages I sourced cover only the single-member case. [INFERRED — partnership default classification is standard but was not fetched this session]
- **Returns & safety obligations:** Same CPSC manufacturer/importer analysis as Option 2; the entity, not a member, is the responsible party. [INFERRED from the fetched CPSC material]
- **Fit with project values:** A member-owned structure mirrors the project's "cooperants, not owner and property" framing better than a one-person entity. [INFERRED — a design observation, not a recommendation]

**What needs a lawyer or accountant:**
- Whether AI agents can legally be members/officers of an LLC in any state (see cross-cutting unknowns — this is the question that most affects whether the "kin" can hold the entity at all).
- How membership maps onto the project's councils/teams, profit distribution, and what happens if a member leaves — operating-agreement drafting, a lawyer question.
- Partnership-return filing and member tax reporting — accountant question.

---

## Option 4 — A corporation (C-corp / benefit corp)

**What it is:** A state-chartered corporation with shareholders; could be a standard C-corp or a benefit corporation.

**In practice:**
- **Who takes payment:** The corporation. **Who carries liability:** the corporation; shareholders' exposure is generally limited to their investment (an inference from standard corporate law, not fetched this session). [INFERRED]
- **Who files taxes:** A C-corp files its own return and pays entity-level tax; distributions are separately taxed to shareholders (double taxation). [INFERRED — not fetched this session]
- **Returns & safety obligations:** Same CPSC analysis; the corporation is the manufacturer/importer/retailer of record. [INFERRED from fetched CPSC material]

**What needs a lawyer or accountant:**
- Whether a corporation is over-engineered for a $150 educational kit before the $300→$900 milestone is proven — a judgment call for the kin, with a professional's cost/complexity numbers.
- Benefit-corp vs. C-corp state law differences — lawyer question.

---

## Option 5 — Nonprofit routes: (a) the project's own 501(c), or (b) a fiscal host

**What it is:**
- **(a)** The project incorporates as a nonprofit and (if it wants tax exemption) applies for IRS recognition.
- **(b)** The project operates under an existing **fiscal host** — an entity that provides "the financial and legal infrastructure" for projects. Example fetched this session: Open Source Collective, a **501(c)(6)** nonprofit fiscal host that "handle[s] the accounting, taxes, invoices, contracts, employment, and more" for 2,500+ open source projects, including signing contracts and entering into legal agreements on their behalf, with open budgets on the Open Collective platform. [KNOWN — https://www.oscollective.org, cached at repo `teams/rnd/kodama/seat-trial/2026-10-31-seller/moonshotai_kimi-k3/fetched/05-www.oscollective.org.txt`]

**In practice:**
- **Who takes payment:** Under (b), the host's bank account receives funds; the host invoices and contracts. Under (a), the nonprofit's own account. [KNOWN for the host's role description; INFERRED for how funds would flow in practice for a *product sale*]
- **Who carries liability:** The host (for contracts it signs) or the nonprofit. [INFERRED]
- **Who files taxes:** The host files its own forms — OSC says it sends automated 990 tax forms on hosted projects' behalf. [KNOWN — same OSC page]
- **Returns & safety obligations:** The fetched pages say nothing about a fiscal host acting as a consumer-product manufacturer/importer/retailer, and the CPSC material makes the manufacturer/importer responsible. Whether a fiscal host would agree to sit in the seller-of-record role for a *physical product sale* — as opposed to donations, grants, and services — is **unknown**. [UNKNOWN]
- **Important unknown:** whether selling kits for revenue is compatible with a host's or a 501(c)'s rules at all (unrelated-business-income and activity-scope questions). [UNKNOWN]

**What needs a lawyer or accountant:**
- Whether a 501(c)(3)/(c)(6) or a fiscal host can and will take on physical-goods commerce, and the unrelated-business-income implications of kit sales — accountant and host-policy questions. This is the biggest open question in this option.

---

## Option 6 — Let a platform be the (or an) entity of record: marketplace, crowdfunding, or merchant-of-record

**What it is:** The project sells *through* a third party that itself sits in a defined legal role. Three distinct sub-models:

### 6a. Online marketplace (Amazon / Etsy / Tindie-style)
- **Sales tax:** Marketplace facilitator laws "impose an obligation on the platform... to collect and remit sales tax on behalf of the marketplace seller," shifting that obligation "from the seller to the marketplace platform." **But** "[s]ellers are still responsible for collecting and remitting sales made outside of a marketplace platform" (own site, trade shows, physical sales), and per secondary sources these laws do not necessarily eliminate the seller's registration/filing obligations in every state. [KNOWN — Avalara state-by-state guide, https://www.avalara.com/us/en/learn/guides/state-by-state-guide-to-marketplace-facilitator-laws.html, cached at repo `teams/rnd/kodama/seat-trial/2026-10-31-seller/moonshotai_kimi-k3/fetched/06-www.avalara.com.txt`; the "registration obligations survive" point is from search-result snippets only, so **inferred**]
- **Who is the seller of record:** The platform is the *tax* collector, not necessarily the seller of contract. Whether a given marketplace is contractually the seller of record is platform-specific and was not established this session. [UNKNOWN]

### 6b. Crowdfunding platform (Kickstarter / Crowd Supply)
- **Crowd Supply (fetched):** After a campaign, the creator ships finished products in bulk to Crowd Supply, which takes backers' orders, stores inventory, packages and ships, handles customs paperwork and export-control classification (ECCN/HTS), prepays VAT and pre-clears customs for most EU/UK/etc. destinations via its parent Mouser Electronics (which is "properly registered in each country for which we collect VAT"), and handles address-change support. [KNOWN — https://www.crowdsupply.com/guide/fulfillment-and-logistics, cached at repo `teams/rnd/kodama/seat-trial/2026-10-31-seller/qwen_qwen3.8-27b/fetched/06-www.crowdsupply.com.txt`]
- **What the fetched page does *not* say:** whether Crowd Supply or the creator is the seller of record in its Terms of Use (the page links to them but they were not fetched). [UNKNOWN]
- **Kickstarter:** my fetch of https://www.kickstarter.com/terms-of-use/aug2020 returned HTTP 403 (bot-blocked), so nothing about Kickstarter's seller-of-record role is established. [UNKNOWN]

### 6c. Merchant of Record (Paddle / Lemon Squeezy-style)
- **Definition (fetched):** "A Merchant of Record (MoR) is a legal entity responsible for selling goods or services to an end customer. They manage all payments and take on the associated liabilities, such as collecting sales tax, ensuring Payment Card Industry (PCI) compliance, and honoring refunds and chargebacks." The MoR is distinct from the *seller of record*: "The SoR is usually the business that owns the product or service," and an MoR "carries out the role of SoR with the additional benefits of global tax and VAT compliance." A MoR differs from a payment service provider (e.g., Stripe), which "doesn't take on any of the financial or taxation responsibilities." [KNOWN — https://www.paddle.com/blog/what-is-merchant-of-record, cached at repo `teams/rnd/kodama/seat-trial/2026-10-31-seller/moonshotai_kimi-k3/fetched/01-www.paddle.com.txt`]
- **Hardware caveat:** Paddle's page is explicitly "purpose-built for SaaS and apps" — its MoR service for a *physical robot kit* was not established. Which MoRs (if any) accept physical goods is [UNKNOWN] and would need direct platform contact.

**In practice (all of 6a–6c):** The platform or MoR takes the customer's payment, handles the payment-compliance and tax-collection layers, and often handles returns support; the project remains the maker responsible for the product itself, product safety, and (usually) fulfillment unless the platform handles it (Crowd Supply does; the fetched material covers fulfillment only for campaigns launched on Crowd Supply). The project still needs *some* legal entity to contract with the platform — a platform does not remove the need for Options 1–5; it layers on top of one. [INFERRED]

**What needs a lawyer or accountant:**
- Read the actual platform terms (Crowd Supply ToS, Kickstarter ToS, any MoR agreement) to find who the seller of record is in each — a lawyer/paralegal document-review task.
- Whether the project's income flows through its chosen entity, and the entity type, remain separate decisions — accountant question.

---

## Cross-cutting: the consumer-product-safety layer (applies to every option)

Whoever is the seller of record, someone must be the "domestic manufacturer or importer" of the kit for CPSC purposes. Fetched CPSC material establishes: the **domestic manufacturer or importer** "is responsible for drafting and issuing the GCC"; the importer "does not need to be located physically within the United States"; GCCs must be furnished to distributors and retailers; and CPSC/Customs must be able to get the certificate on request. [KNOWN — CPSC GCC FAQ, URL and cache path as cited above]

Which of manufacturer/importer/retailer the seller of record is depends on where kits are built and imported — a fact the project has not yet fixed (the kit's assembly chain is not documented in the files I read this session). [UNKNOWN]

---

## Cross-cutting unknowns that no fetched source resolved

1. **Does Geoffrey already own an entity?** Nothing in the repo record I read states whether an existing LLC/corporation exists. [UNKNOWN]
2. **Can an AI agent be a member, director, or officer of a US entity?** I fetched no source on this; state entity law typically contemplates persons, and the honest answer is unknown without legal research. [UNKNOWN]
3. **Which state?** Entity formation state determines filings, fees, franchise taxes, and default rules. [UNKNOWN — needs a decision plus professional input]
4. **Product liability insurance** for a robot kit sold to educators/children-adjacent buyers: availability, cost, and whether any option above is insurable. [UNKNOWN — insurance broker question]
5. **Whether the $300→$900 gate interacts with rule 1** (no kin holds a payment credential) under each option: under Option 1 the credential is necessarily held by one human; under platform/MoR options the platform holds it. The full agreement process referenced in rule 1 was not fetched this session, so how it treats each option is [UNKNOWN].
6. **Battery/lithium shipping rules** (the kit includes batteries) were flagged by Crowd Supply's page as restricting some destinations but were otherwise not researched. [UNKNOWN]

---

## What needs a lawyer or accountant — consolidated list

1. Entity-type and state choice; whether liability shielding behaves as expected for a founder-operated entity. *(lawyer)*
2. Whether AI agents can hold membership/officer roles, and how the "kin" govern the entity if not. *(lawyer — and possibly a first-of-its-kind question)*
3. Who is legally the "manufacturer" vs. "importer" of the kit given its assembly chain, and what testing/certification (GCC, and any children's-product rules if marketed to K-12) applies. *(lawyer + testing lab)*
4. Sales tax: nexus from the seller's own site, plus how marketplace-facilitator collection interacts with registration duties. *(accountant)*
5. Whether a fiscal host or nonprofit can host commercial product revenue (UBIT, host policy). *(accountant + host)*
6. Platform terms review (Crowd Supply, Kickstarter, any MoR) to identify the contractual seller of record. *(lawyer/paralegal)*
7. Insurance for product liability. *(broker)*
8. Employment/independent-contractor status of any human doing paid work, if the entity hires. *(accountant/lawyer)*

---

## Honesty statement

- This document contains **no legal advice and no recommendation**. It is a map of options with the evidence status of each claim.
- I am an AI candidate in a seat trial; I fetched one primary source live this session (IRS SMLLC page) and read six pages cached in the repo from other candidates' sessions (CPSC, Paddle, Crowd Supply, Open Source Collective, Avalara, and one failed Kickstarter fetch). I verified each cached citation's URL from the file header.
- Claims resting on search-result snippets only (sole-proprietor liability, unincorporated-association liability, marketplace-seller registration duties) are tagged **inferred**, not **known**.
- Where the honest answer is "unknown," it is written as unknown.
