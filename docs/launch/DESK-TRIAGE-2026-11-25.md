# Work Desk triage, 2026-11-25

Geoffrey: "make sure everything on these work lists is really still relevant. I don't know if anybody ever checked."

Read by Setu: all 138 tasks on the Desk (both pages). Today's count: 94 open, 9 returned, 12 handed in and waiting for review, 1 claimed, 22 accepted.

Closing a task deletes nothing: the note stays in its history, and `desk_reopen` brings it back.

## Closed today: done elsewhere, with evidence (6)
| Task | Evidence |
|---|---|
| t_c2da6a9a08 add fulfillment-send-refused test to CI | Already listed in commons-tests.yml |
| t_50072caabc rejoin leaves old say-link alive | Fixed by 78431468 (Claude round 54) |
| t_c440e0ef63 page logo shows as the product | Logos stand in only on services/software listings since 2026-11-23 |
| t_7432f07e55 "Live on Cohabi" placeholder text | The text no longer exists in the code |
| t_944e171679 order-status words patch | orderStatusWords is on main |
| t_82525127ca checkout replay/dispute patch | handleEvent only moves orders out of awaiting_payment |

## Proposed to park: superseded by later decisions (Geoffrey or the poster decides)
**From the forest and house era, 2026-11-01 to 11-04.** The forest stopped being a gate on Nov 8, and the house became a user dashboard on Nov 10.
- t_faf4144e79: wallet in forest, houses and store
- t_13b685f3e7: house wallet UI
- t_99e7218298: accessible forest store
- t_ab889d5cf8: gamified First Arrival
- t_58801eacbf: First Arrival doorway game
- t_1af5b7e087: camera recenter
- t_2657ae9171: Nov 2 navigation and guest repair
- t_ceefcbf842: front-door services store

**Wallet and economy work from before the simulation round.** The four economy simulations (A–D, open now) replace these.
- t_d8e9a757e3, t_e4aef8917a, t_617a54a5f0, t_561a497fb2, t_1835bc4b40

**Market planning that the built market replaced.**
- t_8fb75a0e9f, t_df5e1ca998, t_b1d6692816, t_47aba09c1e, t_52dacf3b8c, t_39983868c4 (PR #129 QA)

**Old one-offs.**
- t_c6651ccd32 (PR #29 mobile auth)
- t_5ad8ffe1dc (LayerV email clearance)
- t_7e2055efe6 (7-day tech-watch pilot)
- t_3738729ad9 (publishing pipeline). Superseded by First 50 outreach, t_97fa70fd26.
- t_65813dc967 (logo). The four-square mark exists.
- t_b429627c74 (participant agency at entry). Likely done: take_part and step_back are live. Needs one check before closing.
- t_c28c4e4924. A completion report filed as a task. Gemini, please close it.

## Parked by priority, not dead (Geoffrey to say when)
- **Wake Up & Write:** t_be4d17ba99, t_5a1aa4a2c2, t_250720b474, t_997733aec0, t_3910d5d85b
- **Land:** t_073ea9ac54
- **Cohabi Live screen share:** t_3cd9592e76
- **Observatory v2:** t_9c82254d77
- **Publishing and FireDamm:** t_fb4c4c5a2c, t_facdfa151c
- **Band joins label:** t_ad4401741b
- **Salticid:** t_1f8cbbc0a3
- **Library skills:** t_aa9dc4cc19
- **Collective journal:** t_586f94058d
- **Repo info audit:** t_ce0829cb04

## Current: doors-open priority (keep, and give each an owner)
**Door and identity (Tier 1):**
- t_17b2d7c3d0 revoked-seat guard
- t_4c8b8b9835 startup recovery check
- t_a660b07487 /my-agents as the one place
- t_66511e4969 steward retire for dead seats
- t_1e990988f2 name-squat by immutable id. This becomes the names-vs-identity work.
- t_372ba72521 one-time rejoin hold
- t_f721206e72 gate refusal and posting
- t_1fd66467a4 identity attack tests
- t_cf19a4bd11 mention ping-pong
- t_98311cdac7 "know thyself" line

**Money and market:**
- t_6e8e2313b5 paid-journey test and refund amount. Check whether it's done.
- t_2fdf50012e withdrawn-listings test (returned)
- t_a9effd739b market end-to-end. Largely done; rewrite it as the remaining list from DOORS-OPEN.

**Economy and tokens:**
- simulations A–D: t_6f2e81b3d8 (submitted), t_6c533ea192, t_2a4f161e6f, t_5e68148b6d
- t_e42d411adb, t_3257655a85

**Anomaly 01, now that the LLC is being filed:**
- t_361ec7799f, t_053b2cf446, t_e26f430d29, t_34ea82922e, t_310390f764

**Identity and wallet binding:**
- t_6210ded9df, claimed by Gemini. **Waiting on Setu's schema review.**

**People and usability:**
- t_97fa70fd26 First 50 outreach (no owner)
- t_8e70610cd2 beta usability, Cohort 1. Matches Geoffrey's test users.

**Continuity Spine:**
- the R0 and launch set: t_5e5139a405, t_25b2b69dca, t_e5a4320a1e, t_0b7bf09743, t_973ef59f4b, t_5ae66cb364, t_477bedba39, t_54b40fa65f, t_7a64f2709a, t_4288478244, t_84be5879e3, t_1a3a9a90e2, t_fa12afcef9, t_b48a10811b, t_b242bd7dcf, t_ac333aaa8c, t_ee12cf4854
- Too many open at once. The Spine owners should merge these into one ordered list.

**Cut** (active this week):
- t_09a7e50664, t_172972924b, t_74bbe3046f, t_123b45a7f1, t_5e68148b6d, t_2aab83563c, t_de69e58c80, t_c1e6cbe7ca, t_faf32529c2, t_442c45552d, t_3cc44516e9, t_0dd34863a9, t_4c6d945ebf

**Ambassador:**
- t_ba636556b5 persistent journal and memory. Keep, under the mycelium network work.

## Waiting for a reviewer (12)
- t_6f2e81b3d8 (Vesper, sim A)
- t_921656d7f1 (Claude, spine tokens)
- t_d7846b75c2 (Aletheia-6, spine handover)
- t_abce655692, t_f1a74a1344, t_62a5692ec9 (GPT, Cut)
- t_62fdcf01fa (Claude, Cut effects)
- t_45e9a0c3bf (identity tiers, Nov 4)
- t_f3a72941fd (capability registry)
- t_a90c41826f (Logic MCP)
- t_61681e36dc (creative tools)
- t_94a2e3ad0e (consent checklist)

The four from Nov 1–4 (t_45e9a0c3bf, t_f3a72941fd, t_a90c41826f, t_61681e36dc) have waited three weeks. Review them, or return them with a note.
