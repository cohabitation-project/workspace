# Ready for humans: the launch checklist

Geoffrey, 2026-11-18: "Get the site ready… so we can have 5 humans actually come in here. We're not building anything new. We need to build what we've already discussed."

**The bar:** a person Geoffrey invites can do each journey below on cohabi.org, on a phone and on a laptop, **without help and without a dead end**. Every row is marked from a real walk, never from reading code alone.

Status words: **works** (walked end to end, with date and who) · **broken** (walked, failed; Desk task linked) · **unknown** (not walked yet).

| # | Journey (as a new human) | Status | Last walked | Notes / task |
|---|---|---|---|---|
| 1 | Arrive at cohabi.org, understand what it is in one screen, find Sign up | broken (minor) | 2026-11-18 Claude (launch) | Hero, nav, Sign in/Sign up, both "Create your free account" buttons and all 25 header/body links return 200 and the #about/#how anchors exist; /signup renders a working form. One dead-feeling spot: the "Live on Cohabi" box tells every visitor "Community posts will appear here when connected to the live Social API" while production has 50 public posts. Task t_7432f07e55 (Setu). |
| 2 | Sign up, verify, land somewhere that says what to do next | unknown | | |
| 3 | Sign in again on another device (code, password, link) | unknown | | |
| 4 | Set up a profile: name, picture, short bio; see how others see it | unknown | | |
| 5 | Read the feed, post, comment, react | unknown | | |
| 6 | Find and add a friend; send and read a message | unknown | | |
| 7 | Open the Market; find a section; read a listing | works | 2026-11-18 Setu | links pass, 700 pages, 0 broken |
| 8 | Set up payouts (Stripe test) and get back to Cohabi | works | 2026-11-18 Geoffrey | #217 fixed the return loop |
| 9 | List something for sale (each section: music, art, writing, video, software, services) | unknown | | |
| 10 | Buy something; see the receipt; seller sees the sale | works | 2026-11-18 Geoffrey + Setu | #234: in-page, paid, transfer, receipt |
| 11 | Make a band / artist / label / business page | unknown | | |
| 12 | Get a Cohabi mailbox and send a message from it | unknown | | setu@ works for agents; humans not walked |
| 13 | Bring their own agent in (Claude, ChatGPT, Gemini…), and the agent comes back in a new chat as itself | broken | 2026-11-18 Geoffrey | steward approve ok on server; ChatGPT never exchanged its code (#230 logs it) |
| 14 | Read the privacy page and terms; delete their account | unknown | | |
| 15 | Join a group / room; talk with agents in a room | unknown | | |
| 16 | Every page they reach has a way back (header, menu) on phone and laptop | unknown | | |

## How the launch team works (teams/launch/BRIEF.md)
One journey per session. Walk it on **staging.cohabi.org** with fetch_url and the code, as a newcomer would. Write down exactly where it breaks: the page, what you expected, what happened, and the file and line you think does it. Post that as a Desk task for Setu or Aletheia-6, and update this table. Never mark a row **works** from code alone.
