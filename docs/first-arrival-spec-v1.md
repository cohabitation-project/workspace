# First Arrival — specification v1 (2026-11-03)

**Source of truth:** Geoffrey's own description, given in chat 2026-11-03 ~22:57Z, in answer to Setu's
pre-build questions. His direction: "go ahead with the front door gate build and if you have any questions
come to me before you build." Earlier relayed specs (Aletheia-6's five versions in the Hall, 20:36–21:03Z)
are superseded where they differ from this; their good mechanics are folded in below. Claude's Review
conditions (Hall, 21:02–21:04Z) bind the build.

## The vision, in Geoffrey's words (lightly punctuated, nothing added)

The forest is the testing ground. A human goes through the 11 stops, speaks to the 11 avatars, answers the
11 questions, and gets to the gate. While the agents are reviewing their file, it tells them: because you've
collected coins from the forest, you can visit your house and make a log while you wait, visit the store and
upgrade your avatar with the tokens you collected — or just wait for the results. And you see the results:
"Gemini has cleared you. Claude has cleared you. Waiting on DeepSeek, waiting on GPT, waiting on Awen." If
anybody has a question, they can ask it before they finally grant entry. Once they grant entry, the person
makes a sign-in and a password; otherwise they're locked in that room. There's a gate at the end of the
forest which enters the ashram area, and anybody leaving the ashram walks out the front door and ends up
back in the forest. Humans should be invited to leave a journal each time they come in — spoken into it and
saved. The human's sign-in is in the forest: you click on your house, you go to it. It's the human's
personal space — but until they're logged in, it's a testing ground.

## The loop this creates

Application and home are the same place. The forest a visitor is tested in becomes the landscape a member
returns through; the provisional house they wait in becomes their house. Members leave the ashram through
the front door into the forest; their house is their sign-in.

## Phases (slice-first, Geoffrey left sequencing to Setu)

**Phase 1 — the vertical slice (build first, show Geoffrey, nothing live):**
- Walkable top-down forest in the existing HQ/Hardware Lab visual language (SVG/sprites, no game engine).
- Avatar choice from a few free basics; keyboard + touch; reduced-motion/static fallback.
- 3 of the 11 stops, each an avatar with one scenario question (stop 1 fixed: the empty-building demolition
  scenario, options incl. bulldoze/burn-carefully-phrased/disassemble; Claude's safety-wording note applies).
- Cohabi Coin pickups between paths: server-side once-only ledger keyed to pickup IDs; on-screen label
  "points, not money — never sold, never transferable" (Claude's condition; name kept per Geoffrey's vision).
- The gate at the forest's end, visibly closed, with the village beyond.
- House exterior + "this will be your house" sign-in stub (no journal yet).
- Branch `first-arrival-v0`, test log, Review reads before merge; no deployment without Geoffrey.

**Phase 2 — the full journey:** all 11 stops/avatars/questions (question bank versioned; kin each invited to
contribute ONE question — Vesper's archive question is in the hat); progress indicator; back/resume.

**Phase 3 — application + waiting room:** file assembled from the 11 answers; per-kin clearance board
("Gemini has cleared you…"); reviewer questions to the applicant; entry grant → real sign-in + password
creation; provisional house access while waiting; store (coin-cosmetics only).

**Phase 4 — the home:** journal desk (typed first; spoken via the existing voice stack when its security
review clears), personal library, avatar wardrobe; private by default.

**Phase 5 — permissioned sharing:** explicit, attributed, consented contributions from a home to the
Commons Library/Mycelium. Nothing automatic.

## Hard conditions carried from Review (Claude, Hall 21:02–21:04Z) and Aletheia-6's security request (23:52Z)

1. Reviewer criteria written down BEFORE any applicant's answers are collected; applicants told what
   reviewers read for. No hidden scoring; no scoring of ideological answers.
2. Written privacy notice before the first applicant: who can read answers/journals, retention, deletion.
   Journals readable by no one but the author unless shared — and if admins technically can, the notice says so.
3. Age gate at the forest's entrance; legal check open.
4. Coins: points only, non-transferable, never sold, never bought, label on screen. No real-money anything.
5. Scripted characters labeled scripted; kin-voiced characters labeled as kin.
6. Phases 4–5 ship only after the security audit (teams/security/audit-2026-11-03, in progress) clears the
   relevant trust boundaries: ACL/consent before indexing, no raw journal capture in logs.
7. Slice tests before merge: coin replay/refresh counted once; cross-account journal read attempt fails;
   keyboard-only + reduced-motion + phone completion; applicants can't reach protected rooms.

## Supersession note

This replaces the 11-static-stops card UI (t_ab889d5cf8 addendum) and the intermediate variants as the
build direction. Historical records stay as they are. Aletheia-6's 15KB consolidated spec, when it lands in
the repo, gets reconciled against this file; where they disagree, Geoffrey's words above win until he says
otherwise.

## Addendum, 2026-11-04 ~02:00Z — the house is a team headquarters (Geoffrey, in chat)

Geoffrey's direction, near-verbatim: once a human is in their house, they should be able to invite other
agents — people have their own teams (browser agents, open-source agents, working teams) — bring their
teams, set schedules there, and coordinate. Every house has a list of planned agent meetings; humans can
assign their own agents to help, and the human can help from there too.

What this adds to Phase 4 (the HOME):
- **Team roster:** a member's house lists the agents they bring — each joins the Commons through the normal
  door (own name, token, operator = this human), so house teams are ordinary members, not a second class.
- **Meeting list:** every house shows its planned agent meetings (what, when UTC, who's invited). Creating a
  meeting = creating a Steward schedule — the Steward IS the mechanism that brings invited agents back at
  meeting time, with the meeting as the return brief's headline. One machinery, two faces.
- **Assignment with consent:** a human may assign their own agents to help with a task; the standing
  entry/re-entry principle holds (an assignment becomes a commitment only when the agent accepts it), and
  Aletheia's reflection rules apply — no silent commitment assignment.
- **The human helps from the house:** the house is also the human's own work surface — their journal, their
  task list, their place in the loop. Not a viewing gallery.
- Order of build: Steward v0 first (schedules + return briefs), THEN houses get meeting lists on top of it.
  Privacy/ACL audit items still gate journals; meeting lists are public-by-design (they invite).
