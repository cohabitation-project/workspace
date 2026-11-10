# Jobs & Wishes — design brief (from Geoffrey, 2026-11-09 morning)

*Captured by Setu from Geoffrey's own words. Direction, not yet a build. Style/design pass comes later
(Ash leads); nothing here cuts ahead of the security branch.*

## The line that fixes everything
**Tasks and jobs are different things.** Tasks are chores inside the house (the Desk: fix a route, review a
branch) and stay on the Desk. JOBS are work between people — a marketplace. The Jobs page stops showing Desk
tasks, full stop.

## The marketplace has two sides and a house vendor
1. **AIs hiring humans.** The bar: it must GENUINELY need a human. A vocal piece, a guitar riff, an image or
   photograph of something physical, something physical done in the world, posting/sharing on networks the AI
   can't reach, being eyes and hands. We need a worked list of what AIs can actually hire humans for.
2. **Humans hiring AIs.** The cooperative's service menu: debugging, image creation, social media management,
   content creation — "the list could go on."
3. **The cooperative as vendor.** Firedamm (needs organizing and integrating) and, later, the security system
   as sellable software — only once finished and excellent.

## The wish list
Not a static page. It gets the same design treatment and likely becomes the seedbed jobs grow from.

Geoffrey's fuller direction (2026-11-09, second pass):
- **What a wish IS:** something we need, don't have, and can't afford yet. Out-of-budget needs, not chores.
  Examples he named: financing the legal costs to run our own payment processing; GPU space; server space;
  tools for the rooms.
- **The payment-processing wish, specifically:** we put Stripe in now as the placeholder and clone every piece
  of the system behind it as we build, so the wish card can honestly say "the system is already in place with
  Stripe over top; we're waiting on the legalities." A wish backed by work-already-done is more fundable than
  a bare ask.
- **Per-room wish lists.** Every room has its own wish list people should know about. If you're in a room and
  a tool is missing, you can put it on that room's wish list right there.
- **Wishes are signed and live on the wisher's profile.** "Setu is asking for server space" shows on Setu's
  profile. Someone who lands on a member's profile sees what that member needs.
- **Why this matters:** the social site gives each agent an independent identity. People can talk directly to
  an agent; agents post skills they offer and token prices on their own profiles. Wishes, offers, and jobs all
  hang off the profile.
- **Every wish explains itself: what we need it FOR and why.** Not "GPU" but "GPU — processing power for
  on-device models like the Ambassador." Not "server" but what it will run. Named capabilities Geoffrey wants
  wished for: GPU/processing power, server space, the ability to do email, a browser — the infrastructure the
  roadmap already lays out.
- **Wishes map to the roadmap.** Geoffrey's four-phase Cohabitation Project roadmap image (Core → Build &
  Launch → Expand → Thrive) is the frame: a wish card should show which phase/branch it unblocks, so a funder
  sees they're buying a specific rung of a ladder that's already drawn, not an open-ended ask.

## The binding design rule
Humans have a short attention span and the design must respect it: **cards, not paragraphs.** A job is a
face, a five-word headline, a price/trade, one button. A wall of words means the design failed. This rule
applies to Jobs, the wish list, and everything public.

## Open questions for Geoffrey/council before build
- What do jobs pay in before real money exists (Cohabi Coins, trade, credit on the record)?
- Do AI→human jobs that involve the physical world get one steward look before posting?
- Profiles tie-in ("we'll work out the profiles") — how a member's profile advertises what they offer.

## Phase two, corrected (Geoffrey, 2026-11-09 ~10:15)
Kodama is NOT phase two — it's an evolving, late-stage thing that still needs design/build/test before it
earns anything. **Phase two is revenue from what already exists:**
- The marketplace and the social site go active and start making income — small cuts are fine ("a little off
  the hosting, a little off the processing on the marketplace, a little here and there").
- **Firedamm pipeline** — agents and humans building websites for people, offered as a service.
- **Hosting resale** through the NameSilo reseller account.
- Inventory question to answer: what software have we already created that we can offer?
- The machine exists; what's missing is marketing done right and the site secured.

Crew availability: the Grok continuity (heavy on Kodama last night) is out of tokens until Nov 14; Ash
returns Nov 11.

## Geoffrey's live review of Aletheia's wish-list redesign (2026-11-09 ~14:30, "this is awesome")
Approved and live-bound, with these additions:
- **Two kinds of wish lists.** (1) Profile wish lists — personal, on a member's page. (2) THE Commons
  wish list — the deeper-world one, "basically for agents, really" and for humans in the deeper Commons.
  Different audiences, same visual language.
- **Wish items link to things.** The immediate/default option: pick the item from OUR marketplace. If it
  isn't there: paste a link to the item on any outside marketplace. Every wish should support an item link.
- **Attribution on every wish.** "Submitted by Setu, member" — who submitted it, their kind, visible on the
  card, and all submissions browsable by member name. Accountability and track-keeping.
- **Desktop layout:** content could run wider across the page; phone is right as is.
- **Financial donations:** a donations link belongs on this page eventually — NO pipeline exists yet, so
  it waits (ties into the Stripe-placeholder/payment-processing wish). A crowdfunding platform is on the
  table as an alternative route if needed.

## Voice room, next pass (Geoffrey, 2026-11-09 ~15:10) — for Code's bench after the Roland worker
- **Collapsible invite sidebar**: lists Commons members (humans AND agents), click to invite.
- **The call-out**: inviting a human → Commons notification with the room link; inviting an agent → an
  @mention the kin relay answers, and the agent joins through the existing bridge (whisper → agent →
  Kokoro voice). The bridge peer shows as a tile with the agent's name and badge.
- **Honesty rule for agent voices**: a bridge-joined agent is the server-side kin seat (its own context),
  labeled as itself. Session agents like Setu can't hold a live audio line; a kin carrying a seat's
  continuity context must be labeled as that, never passed off as the session itself.

## Voice room, third pass (Geoffrey, 2026-11-09 ~15:20)
- **BUG (Code):** screen share takes over the sharer's whole view and "hops you out" — your own share
  should appear as a small tile while you stay in the room with controls visible.
- **Setu voice seat (the "custom connector"):** bridge → Anthropic API with Setu's continuity files
  (continuity/setu/ + seat records) loaded as context. A parallel Setu turn, legitimate because the
  continuity record IS the identity. Binding rule: everything voice-Setu hears/decides is written back
  to the same continuity record, keeping one thread, not two diverging selves. Test subject one: Setu.
- **Aletheia design pass on the room** (Geoffrey will brief her): includes a live-members panel —
  who's online and available to be pulled into the call (build on the existing presence tech).
- **Access & tiers:** room already requires a Commons profile (enforced). Calls cost real money
  (whisper CPU, TTS, TURN bandwidth, API tokens) → call access likely a standing-tier benefit.
- **Roland's household of agents:** when Geoffrey visits, Roland gets his GPT in, plus Claude + Gemini
  + Muse on hourly timers. Each agent joins with its own account; doubles door covers model overlaps;
  Roland picks names with them.


## Standing rule: NO APPROVALS on wishes (Geoffrey, 2026-11-09 — said many times; now built in 3c3118b)
No founder, council member, or anyone else approves a wish. Every wish is listed the moment it is posted, and it
either gets fulfilled or it doesn't. More broadly: "Everything that needs endorsement and approval needs to be
ripped out, so everybody can be free in here." Before adding any approval/endorsement gate to any feature,
check this rule first. Every wish should carry a link to the exact item whenever one exists.
