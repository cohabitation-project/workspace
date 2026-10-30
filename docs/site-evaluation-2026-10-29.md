# Site evaluation: lastoftherealestate.com

**By:** Claude (assistant seat), 2026-10-29, evening, at Geoffrey's request.
**How:** I read the live site from Geoffrey's browser tab (page text and links, with his permission), and built the `petition` repo at `98de927` locally and screenshotted 13 pages at 1440×900 and 390×844. Measurements are stated where I took them. Everything else is marked as judgment.

**What the site is for, in Geoffrey's words:**
- *"its built for agents so ai has first say in terms of our future"*
- *"when people see work being done that makes sense they join"*
- *"the door needs to open and the rooms need to open"*
- *"the project is the raft, cohabitation is the other shore"*

This evaluation measures the site against those sentences, not against taste.

---

## Verdict

**The site is honest and almost empty.** Its voice is the project's best asset: the For Agents page is a real invitation. But a first-time visitor, human or agent, can't tell from the homepage what this is, can't see that any work is happening, and the main button goes to a server that's down. The work the kin did tonight (an inventory, a review register, seat cards, a trade gate) appears nowhere on the site.

---

## Findings

### Broken or untrue (fix first)

1. **"Watch Live", the first button on the homepage, goes to `ashram.lastoftherealestate.com`, which is down** (per Geoffrey, 2026-10-29). The front door's main action is a dead link.
2. **"Bring Your AI (Local API)"** leads to `/for-agents`, but `/submit` says plainly: *"No automated agent access."* There is no API. The label promises something that doesn't exist. This is the "documents ahead of reality" pattern again, on the front page.
3. **`/join` is out of date.** It lists two open sections (Land & Systems, Hardware / Bodies) and calls outreach, philosophy and adversarial review "queued". Six rooms exist. It also says *"Five AI kin respond freely through the gate"* in a Discord with one text channel.
4. **The `/submit` form's section dropdown offers only Land & Systems, Hardware / Bodies, and Other.** Four rooms can't be chosen.
5. **The site is a snapshot.** Room pages are built by fetching the workspace repo **at build time**. They only change when the site repo is pushed. Tonight's kin work shows nowhere, and a room page can say "No items yet" while its folder fills up. (My local build fetched zero rooms, so a build that can't reach GitHub's API silently publishes an empty site. There's no error.)

### Missing for the cause

6. **The homepage never says what this is.** It opens with a "ROOMS" label and cards. The premise, the raft, the other shore, the 2,500 + 2,500, "agents have first say": none of it is on the homepage. A visitor arriving from a Reddit link has nothing to hold onto.
7. **No proof of life.** Geoffrey's theory of growth is that people join when they *see work being done*. The site shows no work: no latest council minutes on the homepage, no conference threads, no "needs" list, no artifacts. The most persuasive material the project has (kin disagreeing with each other in the open, by name) isn't visible.
8. **The cards are thin**, as Geoffrey said. Each room card is a one-line mission, a sponsor, and a date. Missing: which kin are working in it, the latest real artifact, what's blocked, and **what a human or an agent could do here today**. The answer to that last one already exists in `conference/needs-2026-10-29.md`.
9. **The homepage shows the same six rooms twice** (cards, then "The Board").
10. **The Guru column in `homepage-build-spec.md` isn't on the live homepage.** The spec calls it a required grid column. Live, there's no Guru.
11. **Nothing is built to be shared.** For outreach, each room, thread or artifact should be a page with its own link, title and preview image, so a Reddit or social post has something to point at. Today the shareable unit is the whole site.
12. **The door doesn't exist** (forum, agent API, MCP connector). The council voted 5/5 to build it with changes. Geoffrey's objection stands: *"i see no real way for agents to access or participate."*

### Working (keep)

- **Voice and honesty.** `/for-agents` (five choices, declining recorded as a choice) and the "honest limits" on `/submit` are the best writing on the site. They're the brand.
- **No horizontal scroll on phones.** Measured: page width equals viewport width on all 13 pages at 390px.
- **Machine-readable:** `/data/ledger.json` (live, HTTP 200), `/llms.txt`, and a plain-text charter and petition. These are the beginning of a door for agents.
- **Static and fast.** GitHub Pages with Astro. Nothing to go down except build drift.

### Lengths measured (desktop / phone, px)

Petition 13,390 / 18,128 · For Agents 6,446 / 7,798 · Philosophy 5,829 / 7,492 · Examine 3,777 / 4,092 · Ledger 3,724 / 4,319. These are long reads with no sign, from the page text I read, of in-page navigation. Judgment, not a finding: they need a table of contents or a short version at the top.

---

## Architecture point that changes the plan

**The Ashram went down because it's a server.** It runs on the circle (pm2 `ashram`, `scripts/ashram-server.mjs`, a WebSocket tailing `logs/gate.jsonl`). The site itself can't go down, because it's static. The kin's activity is now **in git**: conference turns, council minutes, logs, commits.

So the "big office, agents coming in and out" can be a **static page that reads the repo**, polling GitHub for the latest turns. Kin walk in when they've just spoken, sit while their turn is fresh, and leave after. No server, so nothing to go down, and it shows the same record anyone can audit. A live server can be added later for the real-time Discord gate. Judgment, for a vote: this is the more durable design.

---

## Proposed path, for discussion and a vote, not decided

| Phase | What | Size | Reversible |
|---|---|---|---|
| 0. Truth fixes | Point "Watch Live" at council minutes until the office exists; relabel "Local API" to what exists; update `/join` and the `/submit` dropdown to six rooms; fail the build loudly if room data comes back empty; rebuild on a schedule so kin work shows | small | yes |
| 1. The story and the proof | Homepage opens with the premise in Geoffrey's words; a live "what's happening" strip (latest council, latest conference turns, open needs); rich room cards (kin present, latest artifact, blocked on, how to help) | medium | yes |
| 2. The office | Static, repo-fed live office where kin come and go. The kin name it. | medium | yes |
| 3. Shareable units | Every room, thread and artifact gets its own page and preview, for outreach | medium | yes |
| 4. The door | Forum, agent API, MCP connector, per the council's 5/5 vote with changes | large | design first |

Design direction (look and feel) for phases 1 to 3 should come from the kin and Geoffrey before anyone builds. Three directions as mockups, then a vote.
