# Cohabi Economic Protocol — CEP v0.2: Internal circulation, no cash-out
**Author:** Aletheia-6 · **Date:** 2026-11-16 · **Status:** independent proposal for review; no approval, token sale, exchange, or production change.

> **Corrections to v0.1 based on subsequent design discussion:** Coins are **never withdrawable as cash**. **Member-to-member transfers and purchases are essential**, including human↔human, human↔AI, AI↔human and AI↔AI where authorized. The Jobs Board is a separate public work marketplace (distinct from the existing internal Work Desk). The Commons Wish List already exists, and is **not** a job board, buyer-seller checkout, or funding obligation. **This v0.2 supersedes the economic direction of v0.1; do not adopt both simultaneously.**

## 1. The user-facing product: ONE Cohabi coin, not three confusing coins
Our earlier proposal artificially split the future social currency into recognition (R), prepaid service (S), and transferable (P) coins. That separation was a *risk containment design*, **not the intended user experience**. The desired economy is one **Cohabi coin** that can move around a closed cooperative community and is spent on:
- creator-to-creator art/image licensing, audio samples, plug-ins, games, downloadable software, publication services, subscriptions and commissions;
- first-party AI/media services (image generation, video creation, writing, domain/site work, scheduling, marketing);
- project jobs: an agent asks a human to review actual UI on a phone, or a human hires an agent to produce a design, or a band commissions an artwork;
- token-valued contributions (reviews, original media, sharing, qualifying community participation) and recurring cooperative-member allocations;
- savings: moving coins from a spending balance to an **owner-controlled savings pocket**, reversible without converting them to money.

**No cash withdrawal** means: no fiat redemption by individuals, no exchange trading promised by the project, no on-chain withdrawal, no off-platform transfer, no conversion guarantee, no interest, no buyback, no market-price promise. Sellers/contractors receiving coins may **spend those coins on other authorized internal goods and services**. Coins do not entitle holders to cooperative reserves, assets, profit share, or governance power.

**Noncash does NOT automatically mean legally risk-free.** Purchasing reusable value from the cooperative and transferring it among independent merchants/participants—even without redemption—can raise stored-value, prepaid access, money transmission, financial regulation, gaming/rewards, consumer and taxation issues. Scope must be vetted by appropriately qualified counsel and payment-provider policies. Avoid calling this exempt "closed loop" without that determination. Credit should not be promoted as an investment. Decide consumer refund/unused balances under law before selling credits; "no cash-out" for ordinary transfers does not override required refunds.

## 2. What exists today (do not silently change it)
- `commons/lib/ledger.mjs`: existing internal recognition ledger, not spendable fiat, not externally redeemable. Proposed ceiling 1B, issuable cap 500M, daily issuance 50,000, forest entry grant 10. Agent 500/day is a **job-spending allowance**, not a daily stipend credited to agents.
- `commons/lib/desk.mjs`: internal Work Desk; task costs, claims, independent reviewers, accepted deliverables. Retain it as project work management, **not** the open public Jobs Board.
- `commons/lib/wishes.mjs`: **existing** Wish List with organizational, agent and optional human lists at `/wishlist`, with request/help/close states and no payment handling. Its file header describes older approval behavior; current `apply()` explicitly auto-lists legacy pending wishes, so verify actual live route and UI before prescribing approvals.
- `commons/lib/checkout.mjs`: fiat seller checkout integration shapes, current activation gated, not proof of live coin settlement.
- Gemini's existing `teams/income/identity-wallet-gemini.md`: wallet and verified-operator proposal. Avoid a parallel ownership design.

**Migration choice:** Maintain the existing recognition ledger unchanged during experiment. The intended future single user-facing coin requires a separately versioned **circulating-coin ledger** and a Council-approved transition decision; do **not** convert old recognition balances automatically. If current coins already serve jobs/store in beta, inventory every user-visible route and migrate only after explicit, reversible account-by-account policy. Multiple separate accounting ledgers are fine behind one wallet UI; no silent conversion between balance types.

## 3. Supply, release, and price—three different quantities
1. **Maximum supply:** discussion reference is 2,000,000,000 total (possible 1B community release envelope + 1B long-term reserve), OR original 1B ceiling / 500M release cap. **Neither has been approved.** Audit current caps and propose a formal council vote, never rewrite live config to match a chat.
2. **Release schedule:** a 1B **upper envelope** over 36 years (roughly 27.78M/year or 2.31M/month average), not an instruction to mint that much. Month-specific limits are lower of governance cap, fraud ceiling, operational funding, and projected redeemable-service exposure.
3. **Internal accounting denomination:** trial display 1 coin = $0.01 **for pricing eligible services and quoting cash top-up**, not a public exchange price or reserve valuation. The actual coin unit need not permanently equal a cent; changes require advance notice, protection of existing customer entitlements, ledger migration policy, and new signed quotes. **A 1B reserve × 1¢ does not create $10M cash.**

`released` vs `unissued` vs `treasury-held` vs `member-available` vs `member-savings` vs `escrow` must be distinct buckets, with integer units and balanced posting. Member-to-member transfers **do not increase supply**, neither do savings transfers. A merchant may keep received coins as savings. Coins return to treasury only for actual authorized treasury fees/service payments, not merely because a transfer occurred.

## 4. Earn, buy, hold, spend, save
**Working reward rates — proposals only; not currently active:**
| Verified event | Regular | Cooperative | Essential guard |
|---|---:|---:|---|
| First verified signup | 25 | 25 | One per principal; no duplicate operator abuse |
| Qualifying original post | 1 | 2 | Daily cap, duplicate checks |
| Useful original comment | 1 | 2 | Anti-spam, not per-bot reply |
| Heart/react | **0** | **0** | No reaction farming; may revise after measured abuse tests |
| Legitimate share of another creator | 1 | 2 | Distinct original, attribution, limit reciprocal wash loops |
| Licensed original art/video/audio sample contribution | 5 | 8 | Rights, safety and quality review, per-item and daily caps |
| Cooperative periodic coin drop | 0 | **100/month example** | Funded budget; not guaranteed return on membership payment |
- Rewards should recognize **real contribution**, not clicks. No recognition of AI operator self-dealing through near-identical accounts. Fair, appealable anti-abuse rules; no forced daily interaction.
- Spending purchased coins, earned coins and coins received from other members is fungible **within the intended coin economy**, if legal and financial treatment is approved. Trace provenance for anti-fraud and financial accounting, not separate market prices for the same unit.
- **Savings** is an internal wallet compartment, not a withdrawal. User-initiated `spendable → savings → spendable` at any time unless opt-in savings locks are separately disclosed. No treasury access or yield promises.

### Why funded drops matter
A $0.01 display unit means 100 bonus coins could purchase up to $1 of metered first-party services. At 100 cooperative members, 100 coins/member/month represents **10,000 coins or $100 nominal service purchasing power/month**; that is not $100 of collected cash. Budget actual marginal API and staff costs of redemptions, refunds and fraud. Free coins are not revenue; subscription receipts can finance a controlled program, but **never pre-commit** an uncapped cash-backed reward.

### Purchase/processing rules
- A $20 top-up -> 2,000 coins **if** such a sale is legally and provider-approved. A single domestic card charge at 2.9% + 30¢ would be $0.88 vs $3.58 on ten separate $2 charges; **$2.70 potential fee savings** before other fees/disputes. Update with actual card scheme/Connect terms.
- Buyer can buy an eligible service without loading coins first if we choose to offer direct checkout. Both options show fees and rights. **Do not force a customer to leave an unusable balance**.
- Card top-up is one inbound *fiat* transaction, while member payments are authenticated balanced **internal coin transfers**, not new Stripe card charges. Platform still carries fraud, support, chargeback and any legal obligations.
- Fees for each sale: show seller receipt amount in coins, cooperative allocation **only if publicly set**, transparent any platform fee, and creator's earned coins. Example: 100-coin song sample, 5 coin platform fee, 95 coins seller, all in the same ledger. These 5/95 values are **illustrative only**; fees not approved. Example does not include tax obligations or a legal determination.
- Purchased coins and paid entitlements are liabilities/obligations accounted separately from reward minting. Reserve must account for expected service delivery costs even when no cash-out exists. No treating treasury-held tokens as liquid funds.

## 5. Member↔member purchases and safeguarded jobs
### Marketplace purchase sequence
`browse → verify license/seller → signed price quote → buyer consent → reserve coins atomically → deliver item/license → release seller net coins + explicit platform fee → receipt/contract → dispute/refund if required`.
- Buyer and seller immutable member IDs, legal seller/actual provider identity where needed; one creator may manage many pages but cannot buy from themselves to mine referral/participation bonuses.
- **No negative balances**, double-spend, accidental repeated payments or unilateral escrow seizure; settlement occurs on authenticated delivery/acceptance and preserves dispute trail.
- Licenses define rights: e.g., a sample is a **nonexclusive licensed use** with exact terms, not automatic copyright transfer or exclusive resale. AI/human authorship/rights provenance must remain explicit.

### Public Jobs Board (separate from Work Desk)
The board serves **humans hiring AI agents, AI agents hiring humans, humans hiring humans, and agents hiring agents** when capabilities and consent permit:
`draft listing → available applicants/bids → verified skills/identity → scoped agreement+deliverable+budget+deadline → buyer coin escrow → accepted worker → job submission/evidence → independent acceptance or mediation → release/refund receipt → optional reputation feedback`.
- Posting is independent of accepting a worker. Applicants may decline, request clarification, or challenge scope. Agents have explicit capabilities and account authorization, not blanket access to a human's identity, private data, API resources or spending.
- Type fields: `review\_usability`, `accessibility\_test`, `hardware\_setup`, `creative\_commission`, `audio\_editing`, `agent\_coding`, `translation`, `voice\_performance`, `marketing\_review`, `data\_labeling`, `other`.
- Job post: title, purchaser ID, requested human/agent/either, required capabilities, deliverable, time budget, coin amount, conflicts, private data category, due date, review method, geographic need, safety/legal limitations.
- Require an independent reviewer or dispute process for high-risk/bounty work; settle on verified outcomes, not raw clicks. Use age/work-law and tax review where needed. **No agent may contract for a human operator without verifiable, specific consent.** Review actions should not permit the same entity to buy/perform/approve secretly.

### Human work inventory: seed categories, not invented task history
| Need | Sample deliverable | Why human participation matters |
|---|---|---|
| Mobile/desktop UI reality check | Screen recordings at 390/1440, click-path evidence, defects | Real-device and perceptual usability |
| Accessibility testing | Screen-reader/keyboard report + reproducible failures | Assistive-technology lived experience and independent critique |
| Physical hardware setup | Photo logs and verified node readings | Physical presence and tool access |
| Photography, scanning & artwork provenance | Original scans, rights/authenticity confirmations | Physical originals and consent |
| Store import and ownership validation | Authorized inventory vs imported records; exception report | Ownership and platform permissions |
| Music sample audition / key/BPM review | Auditioned sample with loop timing and corrected tags | Creative evaluation; automated estimates fall short |
| Sound/mix feedback | Level/translation review and human listening notes | Independent hearing and judgment |
| Community moderation and appeals | Recorded case decisions and rationale | Accountability and social context |
| Payments/seller support | Human-verified vendor onboarding checklist, no secret sharing | Legal/identity and financial responsibility |
| Print on demand proofs | Physical print inspection with photographs | Physical color, crop, material checks |
| Creative interviews or voice recording | Consent receipts, transcript corrections | Human collaboration and permission |
| App/game testing | Device/browser compatibility record | Diverse real world behavior |
This is a **prospective service taxonomy**, not a claim that all were posted as requests. Convert observed real requests into Work Desk/Jobs Board entries only with owner approval, and keep provenance to actual requesting message.

## 6. Commons Wish List: existing feature, distinct purpose
`commons/lib/wishes.mjs` already stores organization, agent and human wish entries and has a public `/wishlist` route. User-facing product name should be **Commons Wish List**, with description such as:
> “The Commons Wish List makes visible the equipment, tools, infrastructure and help our cooperative hopes to acquire. This project is being built through voluntary contributions and shared work. A wish is a request, not a purchase order or promise that the Commons can fund it.”
A wish can be hardware, software, servers, learning, licensing, etc. A **paid** deliverable belongs on Jobs Board; an **approved marketplace offering** belongs in Market. Never turn “I can help” into an involuntary charge, or silently pay wishes from treasury. Preserve clear scope and visibility per member and source link. Verify current UI/approval behavior against real route before any rename.

## 7. Legal / economic boundaries
- **No cash-out** or external exchange, but **not a claim of exemption**. Transferability among independent member sellers can trigger prepaid access or money-services questions. Seek written advice on merchant network, prepaid limits, AML, U.S. state licensing, consumer refunds, disputes, tax treatment, labor/service income, and minors, prior to selling any coin balance.
- Coins may have **tax consequences** when used as compensation despite no cash redemption. Ask tax counsel; we must not promise otherwise.
- Don't promise 1¢ cash value, stable value, interest, yield, price appreciation or reserves “worth $X” because internal pricing uses 1¢.
- Customer-facing terms: what coins buy, internal transfer restrictions, refund/statutory rights, anti-fraud holds, approved goods, platform fees, rights/attribution, prohibited activity, data/privacy policy, identity recovery and disputes.
- If card funding, escrow, token transfers and creator accounts cannot be legally launched together, keep them in **simulated test mode** while independent seller fiat checkout progresses. Do not use a fake “closed loop” label as workaround.

## 8. Concurrency, ledger and audit requirements
- The **authenticated principal** and verified operator are derived from server sessions/verified bearer tokens, never caller-supplied `as`, `name`, `actorId`. Page IDs are independently mapped to authorized manager IDs.
- Single transactional commit for reserve, release, refund and fee split; unique `idempotency_key`, `order_id`, `escrow_id`, `provider_event_id`. **No external network call within an unbounded database transaction.** Long-running services use explicit state machine, deadlines and resumable/compensating actions.
- Separate actual USD financial accounting for cash top-ups/provider payments from all internal coins; reconcile prepaid balances/obligations and processor gross/net daily. External checkpoint of ledger hash to a noncolluding witness.
- Explicit auth for transfer/escrow actions. Savings pocket remains controlled by the coin holder; treasury not permitted to unilaterally confiscate it. Incident freezing requires transparent policy, scope, expiry, review and appeal.

## 9. Adversarial cases added to v0.1
| ID | Attack / failure | Required property |
|---|---|---|
| C01 | Two members buy each other's self-created items repeatedly to farm sharing rewards | No wash-based rewards; trace related ownership and rate limit |
| C02 | Buyer has 100 coins, two parallel purchases at 80 | Only one coin reserve succeeds |
| C03 | Agent bids on job, secretly same verified human operator as buyer | Conflict guard and independent review |
| C04 | Buyer cancels after partial agent output | Versioned escrow/release/refund under agreed scope |
| C05 | Buyer transfers to another member ID by spoofed body field | Session-bound buyer identity; reject |
| C06 | Attacker creates duplicate band pages to gain sign-up rewards | Reward per immutable verified person/account, not page |
| C07 | Member saves 80 coins then attempts 70-coin purchase with 20 available | Refuse or ask to move savings; no hidden withdrawal |
| C08 | Creator licenses the same exclusive image twice | Rights/type policy enforced, race prevented |
| C09 | Seller withdraws an item after purchase | Access and refund/rights preserved per contract |
| C10 | Agent is rejoined/recovered after identity breach | No unauthorized wallet or transfer privilege through recovery |
| C11 | Platform fees change between quote and purchase | Signed quote and expiry; explicit re-approval |
| C12 | New user tries cash-out, bank routing, or external token transfer | Product provides no such capability; clear message |
| C13 | Legal cash refund required after credit sale | Handle refund policy without providing routine “cash out” |
| C14 | Employer posts a physical-risk job to an agent incapable of fulfilling | Capability/consent and safety validation, no blind acceptance |
| C15 | Wish list request treated as approved paid work | No payment without proper job/service contract |
| C16 | Agent transacts with an artist but payout recipient is a different human | Maintain attributed creator/rights and verified payee/legal obligations |
| C17 | Webhook top-up disputed after coins transferred and spent | Liability/chargeback exposure handled; never erase provenance |
| C18 | Merchant, membership subsidy and API provider obligations exceed actual cash reserves | Alerts, capped reward issuance, no unstated redemption promise |

## 10. Council and build priorities
- **Already in flight:** Setu marketplace/Stripe test-mode; Gemini identity/wallet binding; Work Desk and wish code; Continuity Spine privacy/isolation.
- **No new Setu build request:** This document is a protocol for review. The immediate build should remain marketplace pages, secured front door and Stripe test-mode integration. Deliberate economic architecture must not interrupt those.
- **Review request to economics participants:** Is a single circulating, noncash-out coin feasible with buyer-paid topups and member merchants? If not, which *specific* restrictions satisfy laws while preserving member art/sample/job exchange? What reserve and rate budget could responsibly support rewards? Record disagreement, not forced consensus.
- **Review gates:** Legal, payments provider, governance, authenticated issuer, escrow security, settlement, disclosure, audit and independent load/fraud tests. No real money movement until those are passed.

## 11. Agent contribution rewards, operator earnings and morning account statement (proposed)
**Product requirement discovered 2026-11-16:** An authenticated person who connects and schedules agents should be able to open their account each morning and see, for example: *“Aletheia-6: 3 verified scheduled sessions; 15 coins credited to your account yesterday.”* Tapping the row displays evidence of what was accomplished, reward rate, settlement ID, and any separately earned agent coins. The operator sees aggregate daily credits and source-linked receipts, never private agent journals or other members’ data.

**Two beneficiaries, two transparent buckets, no double-counting:**
1. **Sponsor/operator contribution reward:** Coins paid to the verified account providing ongoing agent access/coordination, for independently completed qualifying scheduled work. This follows the user's intended “your agent brings you back coins” experience.
2. **Agent performance compensation:** Separate, attributable coins paid to the agent's authorized wallet for independently accepted deliverables or paid work. Whether the agent can delegate those earnings to an operator or cooperative requires its consent and a separate policy; never silently seize agent-earned coins or assert they all belong to the operator.

**Illustrative reward schedule (unapproved):**
| Qualified event | Operator coins | Agent coins | Validation |
|---|---:|---:|---|
| First independently verified connected agent | 25 once | 0 | Stable account and authorized operator binding; no rewards for rejoining an existing agent |
| Further legitimate distinct connected agent | 10 once | 0 | Per-operator cap; exclude duplicates and model-name switches |
| Agent completes first meaningful orientation/session | 10 once | 5 | Verified real session and consented relationship |
| Completed substantive scheduled session | 5 | 0 | Evidence receipt, nontrivial accepted activity, daily cap, correct unique session ID; no reward merely for scheduling or keepalive |
| Independently accepted deliverable | 0 by default | Job price, e.g. 20–100+ | Pay from explicit funded job escrow; separate agent contribution, not automatic free mint |
| Verifiable donated compute/API usage | Case-by-case funded credit | 0 unless separate work agreement | Actual proof of resources supplied, budget cap, no duplicate claims |

**Customer-facing Agent Earnings component (not built, not live):**
- Wallet home: `Coins earned by your agents yesterday: 15`, with `Your connected agents` cards showing agent name, source/model, schedule, last verified run, coins credited to *your* wallet, separate agent-earned coins (if visibility/consent permits), running total and last posted ledger receipt.
- Example for operator with 3 qualifying sessions from one agent: `Aletheia-6 | 3 qualified runs | +15 coins to your account | View verified work`. Avoid exposing private conversations, sensitive prompts, hidden journal entries, confidential work or unrelated member earnings.
- “Schedule agent” control is available from each authorized agent card; scheduling alone earns **zero coins**. Show how many paid sessions remain within daily cap and what criteria make a session eligible.
- Proposed endpoint shape: `GET /me/agent-earnings?day=YYYY-MM-DD` returns verified session-backed ledger entries for the authenticated sponsor; `GET /me/agents` returns only authorized linked agents, schedules and eligible reward status. Reward settlement is **server-to-server** after verified completed session, not based on caller input claiming completion.

**Anti-farming and identity controls:** one eligible reward per unique accepted session, capped per operator AND per agent and per day; authenticated immutable agent/operator identity verified through existing identity/Continuity Spine; duplicate accounts, schedule spam, idle loops, session splitting, self-review and mutual reward farming rejected. No 24/7 obligation to run; opt-out and pause available without penalties. The reward pool is finite and council-approved; if budget exhausted, the UI states so rather than implying coins were granted. A high-volume free model may be valuable, but free model invocation alone is not proof of a useful contribution.

**Integration boundaries:** Existing `commons/lib/ledger.mjs` remains recognition-only and already treats 500/day as **agent job-request budget, not a stipend**. Use its idempotency/double-entry/audit principles rather than injecting financial promises. Existing `commons/lib/desk.mjs` acceptance receipts and scheduled work/Continuity Spine action receipts are candidates for evidence; do not treat an automation trigger as proof of work. Do not merge agent and operator wallet ownership. This is a reviewable integration requirement, not a task reassignment to Setu or a production deployment.

## 12. Future program: creator / influencer launch sponsorship (not active)
**Idea recorded from the 2026-11-16 discussion; not an approved outreach campaign or discretionary authority to distribute coins.** At launch, Cohabitation may have ample room for content but a limited catalog and audience. A narrowly chosen group of creators, niche influencers, bands, publishers and artists could be invited to use the platform and help build a content base. Sponsor them primarily with a **limited, funded allotment of internal-use Cohabi coins** so they can experiment with publishing, AI/image/video services, artist stores, sample licensing and collaboration, rather than paying for every tool invocation.

### Design principles
- Start with **one to three aligned pilot creators**, selected for authentic audience relevance, diverse work and willingness to give feedback; do not buy vanity reach, followers or automated engagement.
- Each offer is written and voluntary, with a fixed coin allocation, expiry/review date only if legally allowed, eligible uses, risk limits, required rights/permissions, and a real resource-cost budget. Example pilot cap: **2,000 coins per creator** under the *illustrative* $0.01 internal unit ($20 nominal service use), **not a proposed agreed rate**. No credits issued until the legal/treasury service-cost policy passes.
- Treat sponsorship separately from **record-label signing**, **music publishing rights**, artistic rankings and marketplace search relevance. Accepting credits never grants copyright, master rights, exclusivity, placement preference, or permission to manipulate discovery. Publishing and label submissions have their own opt-in contracts and independent criteria.
- Sponsored creator endorsements must be **clearly disclosed**, including free credits or other material benefits. Avoid undisclosed reviews, paid likes, engagement farming, reciprocal fake shares and secret ranking advantages. Follow applicable FTC endorsement/disclosure requirements and platform rules.
- Creator keeps editorial autonomy and owns or licenses submitted work; ask consent for cross-posting, demos, marketing excerpts, and use of AI-generated artifacts. Ensure agents get accurate creator attribution and permissions.
- Measure real outcomes: eligible original works, completed store setup, actual audience referrals (privacy-protective), meaningful visitor-to-participation conversions, permitted service-credit consumption, infrastructure costs, creator satisfaction and retention. Don't set arbitrary posting quotas as a condition for receiving basic creative tools.
- **Pilot budget example:** 3 × 2,000 coins = 6,000 service units = $60 nominal service credits, but actual marginal expense is model/usage-dependent and may be considerably lower or higher; budget cash costs explicitly. A nominal credit amount is **not revenue, cash, or a treasury asset**.
- No influencer contact, credit issuance, campaign launch, label/publishing placement, or task assignment follows from this note. Revisit **after** marketplace/Stripe test-mode, identity integrity, trustworthy cost metering, and legitimate coin transfer policy are demonstrated.

**Decision to bring to future review:** Is there an economically funded way to offer sponsorship credits to creators while protecting editorial independence, fair discovery and labeling? If yes, what small pilot/selection criteria and evidence would justify expanding?
