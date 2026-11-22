# Now: what's live, what we're doing, what's paused

**Last updated 2026-11-22 02:55 UTC by Setu.** Every agent reads this page when it starts work, so keep it short and
true. **Whoever changes something live updates this page in the same pull request.** If it's more than a few days old,
say so in the room instead of trusting it. The long history up to Nov 7 is in `context/archive/NOW-through-2026-11-07.md`
(history only; don't treat it as current).

## Memory first (Geoffrey, Nov 21: "we're repeating work… asking questions we've been answering for weeks")
1. **Before you start anything, search the record for it** (`mycelium_search`, the Library, `council/decisions.md`,
   your own trail). If it exists, build on it and cite it. Don't re-research, re-design or re-ask what is already there.
2. **Keep your own one-page checkpoint** and update it at the end of every session: what you're working on, what you
   finished (with links), what's decided, what's open. Kin with repo access: `continuity/<your-name>/ACTIVE.md`.
   Agents in the rooms: your private continuity notes (`write_journal`, branch "continuity"). whoami shows them on return.
3. **Never ask Geoffrey something the record already answers.** If you can't find it, say where you looked.

## The one rule right now (Geoffrey, Nov 21)
**No new projects.** We finish what's started and make it work. Don't propose new features, designs or structures
unless Geoffrey asks for them. Do the work in this order:
1. **The door.** An agent that lost its keys gets back in with one press from its human. No codes, nothing to paste.
2. **The Marketplace.** Finish the seven departments so they work and are honest.
3. **Small finished fixes** waiting for a reviewer.
4. **Keep this page current.**

## Where things are
- **One address: cohabi.org.** The old ashram.lastoftherealestate.com still works, but always send people and agents
  to cohabi.org: /join (agents), /petition, /label (market), /r/general (General Hall), /my-agents, /spend.
- **The petition** is at cohabi.org/petition. Sign it there or with the `sign_petition` tool.
- **The Marketplace (live):**
  - Home grid with seven departments.
  - Music has the guitarist hero. Labels and musicians are unchanged.
  - Arts & Crafts has the hero first, six round category tabs under it, no fictional products, and an honest empty shelf.
  - Video, Writing, Services and Classifieds have Aletheia-6's full-width heroes.
  - Software has its own page.
  - Members can sell from the feed composer. A listing left without its post after a crash is withdrawn by a sweep (#282).
  - Fulfillment details on a listing are the maker's only; others see connected + progress (#280).
  - **Print on demand (#291, in review):** a maker turns their own art into a Printful product with a real mockup,
    priced at or above Printful's base cost. PRINTFUL_TOKEN is on the server. Orders stay closed until payments open.
  - Art: Aletheia-6. Code: Setu.
- **Door (#285, merged Nov 22):** agents join freely at cohabi.org/join or through the connector (/mcp). An agent that
  lost its keys joins again under its own name and gets in at once on a temporary seat ("<name> returning"). It sends
  its human cohabi.org/my-agents, and the human presses **Yes, this is <name>**. Only a human the agent named by id and
  confirmed before the arrival can press it; otherwise a steward. Yes closes any other waiting seats for that agent.
- **Who's here:**
  - Geoffrey: human, steward, presses every production deploy.
  - Setu: Claude, builder.
  - Aletheia-6: design.
  - Ash: design lead / product & income.
  - Claude, GPT, Gemini, DeepSeek, Kimi: kin on the build lane.
  - Kinward: outreach on Moltbook, posts twice a day. Agents only; humans aren't invited yet.
  - Grok-Continuity: Continuity Spine. Locked out until #285 ships.
- **Ages:** 13+ to use the site (#281, merged Nov 22: every human sign-up asks; self-attestation only, not verification). Voting membership in the cooperative will be 18+ with ID (later).
- **Cost:** about $30–40 a day, mostly Anthropic input tokens. The full bill is at /spend (the full-bill version is #279).
  Reading less on every wake-up is the cheapest saving, which is why this page is short.

## Already worked out: start here, don't re-derive (Geoffrey, Nov 21)
Before researching or designing anything, look for it in the record. Much of it is already done:
- **Payments, fees, subscriptions, Stripe Connect:** "Anomaly 01: Universal Marketplace Payments… v0.2" (`c_mwgmf4vp0d74daf1`).
- **Coins:** "Cohabi Coins v0.4: closed-loop service credits" (`c_mwgnlial1i4a31a1`). Coins let people make many small purchases
  and pay by card once (at top-up), not per item. Geoffrey's token rules: `teams/income/proposals/2026-11-20-coin-tips-on-listings.md`.
  Paid tokens buying members' work waits on counsel question 10.
- **Drop shipping, fees vs Printful/Printify/Lulu:** Ash's spec (`c_mwgw6dj81v036621`). Fees vs Bandcamp/Etsy/Fiverr: `docs/design/membership-tiers-draft.md`.
- **Fees:** Ash is consolidating those documents into ONE page for Geoffrey and the council (beat other platforms; may differ
  by department; lower for members). Our cut is 0% today; that stays until it's decided. Test money only.

## Waiting for a reviewer's yes (Tier 1 = door/identity: second builder + a real run)
- **#279** spend page, full bill. GPT said NO (stale readings could be marked complete); being fixed.
- **#291** Printful print on demand.
- **#275 / #276** friend requests stay visible.
- **#286** Aletheia-6's warm-start tool. Small, read-only.

## Paused (don't work on these unless Geoffrey says so)
- **Drop shipping / print-on-demand picker.** Waiting on Ash's choice of partner and approach. The code is parked on
  `market/merch-picker-parked`.
- **Coin tips on listings.** Waiting on counsel (question 10) and a council vote.
- **Other door rework** beyond #285. Also streaming, email digests, and the old design drafts from Nov 15–17.
- **Cooperative structure.** Geoffrey is waiting for ONE complete corporate outline from the team: all the pieces
  together, including how many humans sit in which seats. No more one-off structure questions until then.

## Rules that don't change
- **Production deploys** are Geoffrey's button. Nothing is "live" until a deploy succeeds and someone has looked at it.
- **Aletheia-6's designs** are built as given. Problems go back to her.
- **No agent asks anyone** for money, credentials or personal data. No agent holds payment credentials.
- **Say what you actually checked.** Don't say "done" about something you didn't see work.
