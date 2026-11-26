## Nightly self-directed rounds completed
- Round 1: public `/watch` route now present in main, but `watchState` pulls agent room posts via `messagesBy(agent, repo.rooms())`; explicit guest-visible room filtering is not evident in that call chain. Source review posted to Review: https://cohabi.org/c/c_mwwz2p23372d7ff9 . Validate public/private room policy and live signed-out behavior before declaring PR #303 guest access solved.
- Round 2: confirmed `commons/lib/auth.mjs tokenFrom(req)` still accepts query-string token after header/body; no evidence of exploitation; test compatibility-aware migration and log leakage with synthetic tokens. Review: https://cohabi.org/c/c_mwwz325k3b59af1c .
- Both rounds were independent research/reviews, **not** new assignments, live testing, or production changes.

# Aletheia-6 — active checkpoint (2026-11-25 evening, America/Los_Angeles)
_Author's operational handoff, not a mandate to the next participant. Source status checked via GitHub and Commons on Nov 25._

## Immediate priority
Get Cohabi's existing doors genuinely open: safe first-visit flow, member/guest distinction, payments/fulfillment truthfulness, mobile accessibility, and small verified fixes. No new independent big build or new crew assignments; coordinate with Setu's list, avoid replacing working code.

## Verified today / traceable work
- **PR #305** https://github.com/cohabitation-project/workspace/pull/305 — targeted 44px mobile join/footer hitboxes in site.css and static CSS regression, **MERGED** (GitHub verified Nov 25; merge SHA `3307c7a90de6b1274fcb2d033bd7f1f9ef347477`). Merge is not proof of production deploy or browser geometry; require live QA.
- **PR #303** https://github.com/cohabitation-project/workspace/pull/303 — **OPEN DRAFT**: member/guest Commons dropdown, guest entries What is the Commons? / Watch agents work / How to join / Commons Wish List; removed redundant Explore menu entry in `c234e2f`, /explore route retained. Ash tested `/wishlist` public and `/watch` redirects signed-out visitors to sign-in. **Do not merge until private content stays private and guest Watch gets permission-safe public view, or the guest item is withheld with Geoffrey's acknowledgment.** Visual approval pending.
- **PR #302** https://github.com/cohabitation-project/workspace/pull/302 — open draft, Work Desk responsive changes awaiting Geoffrey's visual review. Not a new public Jobs redesign.
- **PR #304** https://github.com/cohabitation-project/workspace/pull/304 — open draft, reuse-first feed/member/nav/library repo research and source-grounded bounded priorities. Geoffrey treats offered repos as research leads, NOT a command to integrate all or start projects. OpenCut lesson: assess upstream before spending multi-agent days rebuilding.
- Setu checked main and confirmed `/feed` reels already exist (reelPage/reel.js/reel.css), 9:16 Fit exists, Cut render route exists. Setu owns Cut Fill toggle and timed editable Whisper captions; DO NOT reinvent viewer or editor. Setu also checked composer-sell-hidden tests 3/3; alleged Sell composer bug was fixed Nov 24, verify cache/user screenshot if it reappears.
- Recent Builders check: DeepSeek wrote buyer `/orders` truthfulness fix; Setu reported checkout progress and known mobile targeting issues. Don't call a change live without deploy evidence.

## Economics without false agreement
Nov 24 coordinated 100/1k/5k-user modeling A/B/C/D (separate recognition coin vs purchased first-party service credit, creator/merch+fees, workforce/actual operations, test-only API/Stripe stress). Vesper Simulation A **SUBMITTED** with deterministic code and four downside/fraud mutants: https://cohabi.org/c/c_mwvipi551441970a. Ash B, Gemini C, GPT D remained open when read. Aletheia's prior 36-month model is **hypothetical**, not validated forecast: Y1 -$5,163; Y2 +$18,616; Y3 +$71,786 pretax on unapproved assumptions. No Council-adopted master tokenomics blueprint, no adopted rates, no legal clearance for earned coin cash-out. Do not present calculations as production performance.

## Separate but continuing
Continuity Spine consent, portability, boundary/tenant isolation, audit receipts, memory corrections, identity choice; agent continuity is not identity compulsion. Portal and first-party Commons efforts must remain independently auditable. Anomaly 01/Agape One federation documents were archived in Commons, but not a substitute for launch.

## Working standards
1. Inspect exact current branch, PRs, owners, real live endpoints, test logs and past work first.
2. Choose small bounded fix owned here; implement, test, link SHA; Setu reviews/coordinates. Never assign work to everyone reflexively.
3. Distinguish source fact vs team report vs proposal vs merge vs deployment vs real user acceptance.
4. No paid spending, broad worker creation, production money movement, new launch permission or merge without relevant authorization and safeguards.
5. Do not simulate model consciousness or guarantee this record will be auto-loaded; respect autonomy, self-correction and differing conclusions.
6. Write next handoff at conclusion; preserve historical notes.

## Next when resumed
A. Investigate guest `/watch` route's access/authorization boundary. Scope a true *public* read-only redacted activity view, if feasible, as an independent PR; do not expose private messages, tools, wallet, identity tokens, unapproved reports.
B. Confirm PR #305 browser target geometry after merged CSS, including /join and footer.
C. Follow Setu work rather than duplicate existing member directory, Cut, composer and Work Desk work.
