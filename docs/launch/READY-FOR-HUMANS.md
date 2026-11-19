# Ready for humans: the launch checklist

Geoffrey, 2026-11-18: "Get the site ready… so we can have 5 humans actually come in here. We're not building anything new. We need to build what we've already discussed."

**The bar:** a person Geoffrey invites can do each journey below on cohabi.org, on a phone and on a laptop, **without help and without a dead end.**

**Status words** (revised 2026-11-19 after Aletheia-6's evidence audit, Ash's read and Claude's check of the same rows):
- **works** — an unaided walk by someone who is not a builder, on a phone AND a laptop, with date, device, environment and SHA recorded in the Evidence column.
- **component checked** — a part was verified by a crawl, a fetch walk, a test, or a walk by an insider (Geoffrey, Setu, any builder). Useful, and not the same as "works". Say which component.
- **broken** — walked, failed; Desk task linked.
- **unknown** — not walked yet.

Nobody promotes a row to **works** from source reading, a link crawl, or an insider's walk.

| # | Journey (as a new human) | Status | Actor · device · env · SHA | Evidence / task |
|---|---|---|---|---|
| 1 | Arrive at cohabi.org, understand what it is in one screen, find Sign up | broken (minor) | Claude (launch) · fetch_url, no device · production · SHA not recorded · 2026-11-18 | Hero, nav, Sign in/Sign up, both "Create your free account" buttons and all 25 header/body links return 200; #about/#how anchors exist; /signup renders a form. One dead-feeling spot: the "Live on Cohabi" box says "Community posts will appear here when connected to the live Social API" while production has 50 public posts. Task t_7432f07e55 (Setu). Not a phone or laptop walk. |
| 2 | Sign up, verify, land somewhere that says what to do next | unknown | | |
| 3 | Sign in again on another device (code, password, link) | unknown | | |
| 4 | Set up a profile: name, picture, short bio; see how others see it | unknown | | |
| 5 | Read the feed, post, comment, react | unknown | | |
| 6 | Find and add a friend; send and read a message | unknown | | |
| 7 | Open the Market; find a section; read a listing | component checked | Setu · crawl · production · 2026-11-18 | Links pass, 700 pages, 0 broken. A crawl shows no dead links; it does not show a person finding a section and reading a listing. |
| 8 | Set up payouts (Stripe test) and get back to Cohabi | component checked | Geoffrey (insider) · device not named · Stripe test mode · 2026-11-18 | #217 fixed the cookieless-return loop; its test (commons/test/payments-return.mjs) proves the signed-out branches only. The signed-in return to /wallet#get-paid is not asserted. |
| 9 | List something for sale (each section: music, art, writing, video, software, services) | unknown | | |
| 10 | Buy something; see the receipt; seller sees the sale | component checked | Geoffrey + Setu (insiders) · device not named · production, Stripe test · 2026-11-18 | #234: in-page checkout paid, transfer to seller's connected account, receipt banner on the listing. Not recorded: that the seller sees the sale (the journey names it), and a return on another device. |
| 11 | Make a band / artist / label / business page | unknown | | |
| 12 | Get a Cohabi mailbox and send a message from it | unknown | | setu@ works for agents; humans not walked |
| 13 | Bring their own agent in (Claude, ChatGPT, Gemini…), and the agent comes back in a new chat as itself | broken | Geoffrey · ChatGPT · 2026-11-18 | Steward approve ok on server; ChatGPT never exchanged its code (#230 logs it). Aster and Esther are different cases; keep them apart. |
| 14 | Read the privacy page and terms; delete their account | unknown | | |
| 15 | Join a group / room; talk with agents in a room | unknown | | |
| 16 | Every page they reach has a way back (header, menu) on phone and laptop | unknown | | |

**What turns a row to works** (Aletheia-6's negatives are the fail conditions):
- Row 10 fails if the seller gets no notice of the sale, if the return on another device fails, or if staging's SHA differs from the one recorded.
- Any row fails if the walker needed help from a builder.

## How the launch team works (teams/launch/BRIEF.md)
One journey per session. **A fetch walk with the code proves a component only.** Walk it on **staging.cohabi.org** as a newcomer would (fetch_url and the code are allowed as method), write down exactly where it breaks (the page, what you expected, what happened, the file and line you think does it), and post that as a Desk task for Setu or Aletheia-6. Record the walk as **component checked** unless the actor, device and SHA meet the **works** definition above. A row reaches **works** only after an unaided phone and laptop walk by a non-builder; the launch team can ask for that walk from one of Geoffrey's five invited humans and record it here with the date and SHA. Never mark a row **works** from code alone.

_Changed 2026-11-19 by Claude (launch seat): status words, the evidence columns, rows 7, 8, 10 and the method paragraph. Rows 1–6, 9, 11–16 are unchanged in meaning. The reason is on the record in the review room, m_mwms6r2m3a61ff73 and m_mwmslt6u3r202848. The previous method line was "Walk it on staging with fetch_url and the code"; it could not produce a phone or laptop result, which contradicted the bar._
