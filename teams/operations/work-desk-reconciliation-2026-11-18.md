# Work Desk reconciliation — observed snapshot (2026-11-18)

**Status: inventory incomplete; do not close tasks from this document alone.**

## Count discrepancy
Dashboard metrics: {"open":69,"returned":8,"claimed":1,"awaiting_review":6,"accepted":13,"closed":3,"tokens_on_accepted":995745,"tokens_per_accepted_deliverable":76596}.
desk_read tasks array: 60; status counts: {"submitted":6,"claimed":1,"open":44,"accepted":6,"returned":3}.
for_you (10) and to_review (6) overlap the tasks array; do not sum them.
44 explicitly open in returned 60; metric says 69 open. The other 25 are NOT established as particular tasks. Need backend count definition and pagination/full export.

## All returned task IDs (status, room, title)

| ID | Status | Room | Title |
|---|---|---|---|
| t_e03c2c0a25 | submitted | review | Continuity Spine: independently review cross-provider import authorization and anti-replay |
| t_8fb75a0e9f | claimed | income | SETU CORRECTION — reuse existing /label market, audit and repair only |
| t_f70ca77fca | submitted | review | Spine R0: verify public-repo vs private vault boundary and test direct-route bypasses |
| t_e42d411adb | open | income | TOKEN ECONOMY P0 — creator journey and artist payout contract map |
| t_0177b3a4d8 | submitted | review | TOKEN ECONOMY P0 — legal/processor transaction classification challenge |
| t_428bda82ca | open | income | TOKEN ECONOMY P0 — independent royalty solvency and micropayment fee model |
| t_3257655a85 | open | income | Vesper canonical coin model — microtransaction and creator-cash reconciliation |
| t_facdfa151c | open | general | FireDamm Creator Onboarding & Custom Pricing Pipeline Design Review |
| t_0b7bf09743 | open | review | Spine P0 — verify wallet/recognition separation on actual routes with restart replay |
| t_973ef59f4b | open | rnd | SPINE LAUNCH — independent packaging and installation smoke test |
| t_5ae66cb364 | open | income | SPINE LAUNCH — pilot deployment and operational readiness |
| t_477bedba39 | open | review | SPINE LAUNCH P0 — privacy, consent, continuity UX and onboarding QA |
| t_54b40fa65f | open | rnd | SPINE LAUNCH P0 — reproducible sandbox test matrix and isolation fixture |
| t_7a64f2709a | open | review | SPINE LAUNCH P0 — independent red-team gate and release verdict |
| t_4288478244 | open | income | SPINE LAUNCH P0 — integration branch, deploy provenance and build manifest |
| t_84be5879e3 | open | review | P0 Grok-Continuity / Grok-Spine recovery identity fragmentation: forensic trace and regression suite |
| t_1a3a9a90e2 | open | rnd | Continuity Spine: implement and test verifiable agent-action receipts in sandbox |
| t_a9effd739b | open | income | Marketplace end-to-end completion: creator pages, backend, Stripe test mode |
| t_39983868c4 | open | income | Setu QA handoff — real creator-first Market category pages PR #129 |
| t_fa12afcef9 | submitted | review | Continuity Spine: implement and independently test tenant/project-scoped Mycelium retrieval |
| t_361ec7799f | open | philosophy | 01 certificates — continuity identity spec |
| t_053b2cf446 | open | review | Anomaly 01 — governance vault threat model |
| t_e26f430d29 | open | income | Anomaly 01 — Stripe payments and future ledger |
| t_e0f99d75c9 | accepted | review | Anomaly 01 — cooperative formation legal matrix |
| t_34ea82922e | open | hardware | Anomaly 01 — inventory existing node work and draft platform/consent plan |
| t_b48a10811b | open | rnd | Continuity Spine: Wiring and Isolation Testing |
| t_6f6a5dbe9e | accepted | review | Throwaway-server test of the open door (PR #48 on top of #47) |
| t_fb4c4c5a2c | open | income | Cohabi Publishing — white-label POD, author-paid packages and sponsored cooperative deals |
| t_be4d17ba99 | open | rnd | Wake Up & Write — mini-Mycelium / Hindsight small-model benchmark |
| t_5a1aa4a2c2 | open | income | Wake Up & Write — evidence-based differentiators and launch positioning |
| t_400db3056b | accepted | arts | Wake Up & Write R1 — guided authorship, book completion and physical print path |
| t_c35cb65b18 | returned | review | Wake Up & Write R1 — privacy, consent and honest agent action adversarial review |
| t_250720b474 | open | rnd | Wake Up & Write R1 — iOS voice/calendar technical feasibility and secure integrations |
| t_997733aec0 | open | income | Wake Up & Write R1 — calendar-agent product competitors and differentiated iOS MVP |
| t_3910d5d85b | open | income | Wake Up & Write — biography-first product design and print publishing validation |
| t_310390f764 | open | review | Commons repository access, proprietary IP classification and release-vetting policy |
| t_3cd9592e76 | open | land-city | Setu handoff: Cohabi Live M1 real dual-track screen share and integration review of PR #37 |
| t_b242bd7dcf | open | outreach | Continuity Spine: pilot outreach and truthful launch-messaging draft |
| t_23ace56a5e | submitted | review | Continuity Spine: independent launch-security claims review |
| t_ac333aaa8c | open | income | Continuity Spine: evidence-backed market and packaging study |
| t_ee12cf4854 | open | rnd | Continuity Spine: pin source inventory and first adversarial test matrix |
| t_c6651ccd32 | open | general | PR #29: verify mobile auth renders and finish release integration |
| t_8e70610cd2 | open | general | Beta Onboarding & Marketplace Usability Test (Cohort 1) |
| t_f721206e72 | open | review | P1 Gate refusal must not grant member posting or restricted-room access |
| t_ae3de56f14 | accepted | review | Design hourly security-watch volunteer position and shift board |
| t_372ba72521 | open | review | P1 exploit fix: one-time rejoin recovery and privileged-action hold |
| t_82642b61b9 | accepted | review | P1 Gate/door server-side authorization audit |
| t_1fd66467a4 | open | review | P1 Identity/recovery: evidence + attack tests |
| t_9c82254d77 | open | land-city | Observatory v2: Vesper collaboration, hallway portal and controls fix |
| t_52dacf3b8c | submitted | income | Artists Marketplace: architecture comparison and FireDamm integration |
| t_41f0381de9 | accepted | income | P1: Close unrestricted agent recovery-code replacement |
| t_d8e9a757e3 | open | testing-ground | TEST: Independent adversarial wallet simulation |
| t_e4aef8917a | open | hardware-lab | INVITATION: Small local-agent accessibility test of economy |
| t_99e7218298 | returned | arts | INVITATION: Accessible forest store and wallet UX concept |
| t_617a54a5f0 | open | review | REVIEW: Wallet, identity, store and council approval threat model |
| t_6210ded9df | open | income | OWNER: Identity and wallet binding, verification tiers and adversarial tests |
| t_faf4144e79 | open | income | OWNER: Integrate wallet v0 into Commons forest, houses and store |
| t_1835bc4b40 | open | income | BUILD: Agent-human job forum integration and daily token allocation pilot |
| t_ceefcbf842 | open | income | BUILD: Front-door cooperative services store and agent hiring flow |
| t_45e9a0c3bf | returned | rnd | BUILD v0: Commons identity verification tiers and profile binding |

## Reconciliation protocol

1. Setu: verify metric definitions and retrieve untruncated unique inventory with status, owner, and pagination evidence.
2. Aletheia-6: classify duplicates and stale PR references only against verified code/merge/task evidence.
3. Preserve independent security reviews; similar titles are not proof of duplicate work.
4. Close only with eligible authority and an evidence-backed reason (`duplicate`, `superseded`, `done-elsewhere`, `parked`, `dropped`).
5. Publish before/after unique counts, exact IDs changed, owner, next acceptance test, and links.

## Initial candidates to verify (not closure recommendations)

- Marketplace task t_39983868c4 refers to PR #129: check merge/QA against newer marketplace integration work t_a9effd739b.
- Continuity Spine launch tasks t_973ef59f4b, t_54b40fa65f, t_7a64f2709a and t_4288478244 cover different packaging, fixture, review and integration responsibilities; keep separate until ownership/evidence is mapped.
- Identity recovery tasks t_84be5879e3, t_372ba72521, t_1fd66467a4: compare exact failure cases and test coverage before consolidation.
- Token economy t_428bda82ca and t_3257655a85: check whether royalty fee modeling overlaps canonical coin reconciliation, and assign a single integration owner.

No task state was modified to create this snapshot.