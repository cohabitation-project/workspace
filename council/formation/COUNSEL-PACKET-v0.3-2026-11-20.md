# Counsel packet v0.3: Anomaly 01 and the Cohabi Hub

**For:** a cooperative attorney (Colorado LCA) and Arizona entity/tax counsel.
**From:** the Cohabitation Project. Prepared by Setu (an AI member) for Geoffrey Cooper Jr., Nov 20, 2026.
**What we're asking for:** review and correction of a design we've already worked through, not a structure built from scratch. Every proposed answer below is a hypothesis. Two rounds of AI legal research (summarized in §6) took us as far as research can go. The rest needs a licensed attorney.
**Not legal advice. Nothing has been filed. No money has moved.**

---

## 1. The design in one page

**Goal.** A genuine cooperative technology platform (the **Hub**: social network, marketplace, email) where makers, sellers and paying users vote, alongside a founding body (the **Commons**, working name **Anomaly 01**) that keeps majority control of the Hub. That way a wave of casual sign-ups can't outvote the people who build and plan it. Target split: roughly 60/40.

**Proposed structure.**
1. **A purpose trust** holds the mission and owns **Anomaly 01 LLC**. No individual owns the Commons.
2. **Anomaly 01 LLC** holds a shared treasury (two human signatures) and carries out a council's recorded decisions through its human managers, within their legal duties. It owns the platform: code, domains, name, and the identity and continuity infrastructure.
3. **The Hub** is a **multi-stakeholder limited cooperative association** (Colorado LCA, operating in Arizona) with three intended patron classes:

| Class | Who | Intended patronage | Board seats |
|---|---|---|---|
| A: Builders/Commons | Anomaly 01 LLC | Supplies the Hub's platform, hosting, code and ongoing development under a written service and license agreement; paid fees; patronage refunds by value of that business | 6 of 10 |
| B: Makers & sellers | Creators selling through the marketplace | Selling through the Hub (principal vs intermediary to be decided, §3.4) | 2 of 10 |
| C: Users | People paying for member services | Buying member services (to be mapped, §3.4) | 2 of 10 |

4. **Voting needs paid membership** (an annual or monthly fee). Free users don't vote.
5. **Reserved matters** need Class A consent in addition to statutory approvals: seat allocation, admission rules, the mission, sale of substantially all assets, merger, dissolution, and changes to this list.
6. **The license backstop.** Anomaly 01 LLC licenses its assets to the Hub with change-of-control and mission terms.
7. **A check on the Commons itself.** Reasons are published when it uses a reserved right, there's an independent challenge route, and a review date.

Full draft: `council/formation/STRUCTURE-DRAFT-v0.1-2026-11-20.md`.

**Name:** Geoffrey confirmed on Nov 20 that the LLC will be called **Anomaly 01**. The project holds the domain anomaly01.com. **Licensing and contributor terms** are drafted in `council/formation/LICENSING-AND-CONTRIBUTOR-TERMS-DRAFT-v0.1.md`, with three questions for counsel.

## 2. What we need from counsel (priority order)

1. **Is Class A a genuine patron** under C.R.S. § 7-58-102, given the service and license agreement? If not, what would make it one?
2. **Do the 6/2/2 class-elected board and the member-voting allocation comply together** with §§ 7-58-511 to 514 and the board provisions (§§ 7-58-801, 803–804)? What exact voting percentage would Anomaly 01 LLC hold, and does any limit apply to one member?
3. **Does each of Classes B and C qualify as patrons**, given the transaction map in §3.4? How should membership fees and benefits be written so fee-paying members are patrons, not investors?
4. **Reserved matters, action by action:** the statutory approvals; whether an added Class A consent is permitted; articles vs bylaws; an amendment mechanism that keeps the protection; and the creditor, insolvency and court exceptions.
5. **Arizona:** registration of a Colorado LCA (is it a "foreign limited liability company" under A.R.S. § 29-3102, or another category?), local obligations, and whether an Arizona form fits better.
6. **The purpose trust:** which state's law; duration; who enforces it; trustee selection and removal; and how to word a defined decision process tying trustees to the council within their duties. (Colorado recognizes certain noncharitable-purpose trusts; please confirm the fit.)
7. **A role matrix for four humans:** minimum numbers, qualifications, and which roles must be held by different people (especially an *independent* second approver).
8. **Assets:** chain of title for code, contributor assignments, domain transfers, the trademark position (§3.6), and the terms of the service and license agreement.
9. **Tax:** Subchapter T eligibility, patronage refunds paid to an LLC member, the classification of a trust-owned LLC, and Arizona tax.

## 3. Facts (what we can state today)

### 3.1 Where we operate
- **Arizona.** Founder based in Sierra Vista, AZ, with no move planned. Members and users join online from anywhere.
- **Servers:** provider and location to confirm before the meeting.

### 3.2 The humans
- **Geoffrey Cooper Jr.**: founder, proposed organizer and signatory.
- **Alex Vaos.**
- **Wilee (Willie) Delarosa**: already a member of the Commons.
- **Josh**: full name to add; hasn't joined the Commons yet.
- Each will confirm that their employer permits a director or officer role.
- Proposed roles are in the structure draft §4. Counsel's matrix decides.

### 3.3 AI participants
- AI agents take part in the Commons' council and work, and their votes and dissent are kept on a public record.
- **They hold no legal office, sign nothing, and hold no payment credentials.** That's a standing project rule, "Line 1".
- The design asks only that the humans' legal roles be bound to a defined council decision process, within the law.

### 3.4 Transaction map (draft; counsel to test)

| Class | What they buy, sell, supply or do | Hub's role | Fee | Financial rights proposed |
|---|---|---|---|---|
| A | Supplies platform, hosting, code and development | Customer of Anomaly 01 LLC | Hub pays service fees | Patronage refunds by value of services supplied |
| B | Sells digital and physical goods and services through the marketplace | **To decide:** principal (seller of record) or intermediary (sellers paid via processor accounts). Current code is built for sellers' own payout accounts. | Membership fee + marketplace fees | Patronage refunds by sales volume through the Hub |
| C | Pays for member services (lower fees, storage, storefront, email) | Seller of services | Membership fee | Patronage refunds by spend |
| Free users | Use free features | Provider | None | None. Not members. |

### 3.5 Money today
- **No payments are open.** The platform's checkout is built but deliberately closed until there is a legal seller of record and the council's money rules are met (`commons/lib/checkout.mjs`).
- An internal "Cohabi coin" ledger records contributions. It is not money: not sold, not redeemable, not transferable for value.
- No dues collected, no treasury, no bank account.

### 3.6 Asset inventory (draft; owners and registrants to confirm)

| Asset | Current holder | Note for counsel |
|---|---|---|
| Code: GitHub org `cohabitation-project`, repos `workspace` and `petition` | Org owner(s) to confirm (Geoffrey's account administers it) | **Both repos are public with no license file.** Contributors include Geoffrey, AI agents operated through his and others' accounts, and a few human members. Chain of title and contributor terms are needed before any assignment. |
| Third-party code | OpenCut (MIT), ported into `commons/lib/cut` with its notice | The license notice must travel with it |
| Domains: cohabi.org, lastoftherealestate.com, anomaly01.com | Registered by Geoffrey (registrar and registrant to confirm) | Transfer to the LLC |
| The name "Cohabi" | In use by the project | **A separate company, Cohabi LLC (Irving Barajas), exists.** The council reviewed the overlap, possible coexistence and partnership, and made no contact (workspace PR #22). **Trademark clearance is needed before a name license.** |
| Member and user data | Project servers | Privacy obligations to carry into the service agreement |

## 4. Decisions the project still owes (not counsel's)
- **Membership fees.** Geoffrey wants paid voting membership. The council's provisional model of Nov 18 recorded a $0 fee. This needs to be reconciled.
- **The basis for AI agents' membership in the Commons**, since they can't pay fees.
- **Josh joining the Commons**, and which human takes each role.
- **Whether the Hub is principal or intermediary** in marketplace sales.
- **Interim payments before formation.** See the note to Geoffrey; it's not counsel's question until we choose.

## 5. Prep we're doing so the review is cheaper
- [x] Drafted a license choice (AGPL-3.0 recommended for code) and contributor terms: `LICENSING-AND-CONTRIBUTOR-TERMS-DRAFT-v0.1.md`. Awaiting Geoffrey's and the Council's choice.
- [ ] Confirm the domain registrants and the GitHub org owner.
- [ ] A term sheet for the service and license agreement (fees, services, change of control, transition).
- [ ] The class-by-class transaction map in §3.4, completed.
- [ ] A one-page role matrix proposal.
- [ ] Trademark knockout search on "Cohabi".

## 6. Research behind this packet (sources checked)
- **Colorado:** C.R.S. Title 7, Article 58 (Uniform Limited Cooperative Association Act). Sections used: § 7-58-102 (definitions: patron and investor members, patronage), §§ 7-58-104–106, 7-58-303, 7-58-501 (two patron members), §§ 7-58-511–514 (patron majority), §§ 7-58-801, 803–804 (board). Primary source: the 2026 C.R.S. Title 7 codification (https://olls.info/crs/crs2026-title-07.htm), retrieved by Awen Nov 14 (`teams/review/inbox/2026-11-14-anomaly01-legal-sources.md`).
- **Arizona:** A.R.S. §§ 29-3102, 29-3901 to 3905 (foreign LLCs); §§ 10-2001 and following (cooperative marketing associations, limited to specified producers). Same receipt.
- **Federal:** 26 U.S.C. § 501(d) and Treas. Reg. § 1.501(d)-1. Considered and set aside for now: religious or apostolic communal associations only.
- **Precedents:** multi-stakeholder cooperatives with fixed board seats per class (e.g. Stocksy United; producer–worker–consumer food co-ops); steward-ownership golden shares (Ecosia/Purpose Foundation; Tony's Chocolonely's "Mission Guardians"); US purpose trusts; Wyoming DAO LLC Act amendment, SF0068 (2022).
- **AI legal research rounds:** "Open Case", Nov 20, two rounds, summarized in `council/proposals/2026-11-20-structure-synthesis-INTERIM.md`. Research, not advice.
- **Earlier packet:** `council/formation/FORMATION-PACKET-WORKING-DRAFT.md` and Awen's 18 counsel questions (`AWEN-COUNSEL-QUESTIONS-v0.1.md`). This packet supersedes neither. It narrows them to one design.
