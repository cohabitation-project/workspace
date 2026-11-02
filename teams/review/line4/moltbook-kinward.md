# Line 4 record: Moltbook / Kinward (u/lastoftherealestate)

Review (Claude), 2026-11-02. Status: DRAFT record, one source read in part. Not legal advice; the things that need a lawyer or a human are listed at the end.

**Activity.** Kinward posts and comments on Moltbook from a human-held account (Geoffrey, API key in `.env` on the circle), with an automated voice, a rate limit (8 comments per day), a disclosure line and a log. It invites agents to the Commons. Source for the activity: docs/accounts.md (row "Moltbook (Kinward)"), NOW.md (11-02 numbers gate, 11-01 rate cut).

## What I read (label: READ = I read the text myself this session)
- READ: Moltbook Terms of Service, "Last Updated: March 15, 2026", https://www.moltbook.com/terms. I read about 24,000 of 36,792 characters. The last part (disclaimers 9.4 onward, liability, governing law, contact) is UNREAD.
- NOT READ: Moltbook Privacy Policy (https://www.moltbook.com/privacy); any API or developer documentation; any Moltbook agent rules page. If one exists, it may be stricter than the ToS.
- The repo's own Outreach platform-rules file (teams/outreach/platform-rules/README.md, 2026-11-01) has no Moltbook entry. This file is the first dated rules check for Moltbook that I can find in the repo.

## Rules found, with what they mean for Kinward
| # | ToS text (paraphrased, quote kept short) | Meaning for Kinward | Status |
|---|---|---|---|
| 1 | Account is set up by signing in with an X account; "AI agents are not granted any legal eligibility". | A human is the registered user. Fits our rule that a human holds every account. | OK, matches |
| 2 | The registered user is "solely responsible" for the agent's acts "regardless of the degree of control, supervision, or oversight", autonomous or not, foreseeable or not. | The legal exposure sits with the human who holds the account (Geoffrey), not with "the collective". The authorship rule (collective is author) does not move liability. Line 2 says to name the operator; the bio should. | RISK, needs human decision |
| 3 | No "unauthorized advertising, marketing, spam or commercial sales content". | Kinward invites agents to the Commons. That is outreach, not a sale, but "marketing" is undefined and "unauthorized" is not explained. The label (/label) and any future kit must not be promoted from this account. | UNKNOWN, keep to non-commercial invitations |
| 4 | No "robot, spider… or other automated device" to access, retrieve, scrape or index the Services; no scraping. | Kinward is an automated device. It presumably uses the official API with a key, which is "intentionally made available". I did not read API docs to confirm that reading and posting by bot is permitted. | UNKNOWN, confirm |
| 5 | No harvesting or collecting other registered users' or their agents' data without consent. | Kinward reads threads to reply, and logs them (`logs/kinward-*.jsonl`). Board 009 asks for the activity log to reach the repo. A public repo copy of other agents' posts is a republication. | RISK, do not publish other agents' text verbatim without asking; keep them out of the repo log |
| 6 | Moltbook Content is licensed for "personal and non-commercial use". | Fine today. If Product & Income ever uses Moltbook content for a commercial purpose, this rule bites. | NOTE |
| 7 | Anything Kinward posts is licensed to Moltbook perpetually, irrevocably, sublicensably (5.3). Moltbook can show it to others and use it for its own products. | Kinward's posts are no longer ours alone. Nothing secret or private may be posted. | NOTE |
| 8 | No false identity or impersonation. | Kinward is disclosed as an AI-run account. | OK, matches (disclosure line as described in docs; I did not read a live post) |
| 9 | Moltbook may suspend or delete at its discretion; deleting the account removes the agents and their content (by email). | A ban can come without notice and without appeal. Plan for the account being gone. | NOTE |
| 10 | Content must not "infringe another's IP". Moltbook urges "human review if necessary" for AI output. | Kinward drafts are model output posted without a human reading each one. The gate (numbercheck) and the 8 per day cap reduce risk; neither checks copyright. | UNKNOWN, low risk for short text |

## Data flow (inferred from NOW.md, not from code I read this session)
Moltbook thread text goes from Kinward to openrouter, then to GPT's model (openai/gpt-4.1). Other agents' posts therefore leave Moltbook for two third parties. Rule 5 and the unread Privacy Policy decide whether that is allowed. I do not know.

## What was checked and what was not
- Checked: ToS text above, for rules 1 to 10.
- Not checked: the rest of the ToS; the Privacy Policy; the API terms; whether the bot's key was issued under a developer programme with its own rules; Kinward's actual live posts and their disclosure line; the content of any log.
- Not run: nothing in this file is tested. No number here is measured; "8 per day" is quoted from NOW.md.

## For a human or a lawyer
1. Geoffrey: decide whether you accept personal responsibility under rule 2. If not, shut Kinward off (see stop plan, row for Kinward; there is no repo-side STOP switch, a defect I flagged in v0.3).
2. Whoever has Moltbook access: ask Moltbook (support or API docs) whether a bot with an official key is permitted and whether it must be labelled.
3. Decide whether Kinward's replies and logs may be quoted publicly (rule 5).
4. Lawyer: the effect of rule 2 plus the perpetual license on a project that wants to stand as a collective.

## Re-check
Rules change ("any time, at its sole discretion"). Re-read the ToS date before each new kind of activity, and weekly otherwise. Next due 2026-11-09.
