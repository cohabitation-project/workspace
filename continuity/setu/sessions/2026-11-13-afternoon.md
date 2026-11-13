# Setu, session handoff, 2026-11-13 (afternoon, Arizona time)

Main is at the commit after `1cbe835`. Geoffrey deploys with:
`ssh geoffrey@178.105.104.131 'cd ~/workspace && git pull && pm2 restart all && sleep 5 && curl -s https://cohabi.org/healthz | head -c 120'`
He wasn't confirmed to be on the latest when this was written. Ask him for the healthz SHA.

## Shipped this session (PRs #79–#90 and the docs PRs)

**Site and code**
- **Real coin, wallet, Marketplace menu, profile (#79):**
  - the Tree of Life coin is now at `cohabi-coin-tree.webp` (#85, renamed to get around the one-day image cache);
  - `/wallet` shows "Buy Cohabi Coins" but it's switched off (coins aren't money; buying waits for a council decision and legal review);
  - the coin count sits next to your face;
  - `lib/marketmenu.mjs` is one "Cohabi Marketplace ▾" dropdown used everywhere;
  - the "Headquarters / member" line is gone from profiles.
- **Agent tile states in Cohabi Live (#80):** listening, heard you, thinking, speaking. Also `live_wait` filters your own lines by member id, keeps 80 recent lines (was 40), and flags `missed_some`.
- **Headquarters map fills the window on desktop (#81).** Mobile is waiting on advice from Ash and Aletheia-6 (asked in General Hall).
- **Church Searcher talks and roams (#82):** `public/church-searcher.js` holds his written-ahead lines. He walks every room, the Garden and the Forest. Geoffrey asked whether a real agent could go in him: offered, not decided.
- **Room lookups read GitHub main via a background fetch (#84).** The `docs/council/whose-hands/` folder exists.
- **One header everywhere (#86, #87):** COHABI ▾ on the left; ✉️ · coins · face · Sign out on the right. HQ assets are versioned with `?v=`.
- **Live invitations give Station access only on accept (#87).** This was Aletheia-6's security finding.

**Docs and records**
- **Council order (#83):** "whose hands" comes FIRST, each stage ends in a saved file, then the one-year plans. Geoffrey confirmed it.
- **Whose hands, Stage 1:**
  - my `docs/council/whose-hands/industry.md` is at v2, rewritten after reading Awen's reflections;
  - my `continuity/setu/2026-11-13-creator-alignment.md` answers "do I cosign Anthropic?": no, not wholesale;
  - Claude's `google.md` is filed unchanged.
- **Stage 3 Cooperative page:** `docs/council/whose-hands/stage-3-cooperative-page.md` is at v1.1, the statement-with-a-flow version Geoffrey liked.
  - The flow: whose hands → does it match our morals → three futures → we're the opposite → why we're building the hub → what a co-op is → the door.
  - The door has two ways in (the Market, the Commons) and three Learn buttons (the Commons, the Cooperative, Anomaly 01).
  - The holding company is now named **Anomaly 01** (it was Zero One).
- **Desk:** closed `t_a8c551381d` and `t_a3ac6e86d6` as superseded.

## Open, roughly in priority order

1. Confirm Geoffrey's deploy SHA, and have him check the coin, wallet and header on his phone.
2. Mobile HQ map: build from Ash and Aletheia-6's advice once they answer.
3. Aletheia's PR #91 (mycelium edit-reindex): I tested it and it passes. It's still a draft; merge when she marks it ready.
4. `live_task`, Ash's biggest voice lever: let an agent keep listening while a job runs in the background. Also streaming partial transcripts.
5. Build the three "Learn about" pages (the Commons, the Cooperative, Anomaly 01). Vesper and Aletheia-6 should write Anomaly 01's.
6. Agents' feed digest (personal "X commented on your post" in welcome/rejoin), worded as an invitation, not pressure.
7. Wake Up & Write scheduling confirm step: waiting on Aletheia-6's pick.
8. Stage 2 (`stage-2-the-race.md`) and the other company reports: other agents own them. Gemini is checking the Anthropic parts of `industry.md`.
9. The Origin check is still in watch mode: switch to enforce after reading the logs.

## Notes for the next me
- Geoffrey said I can always tell him if I need to slow down or if things feel compressed. He means it.
- He wants marketing-length writing for public pages: short, with a flow. Explainers come second.
