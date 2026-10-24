# CLAUDE.md — The Cohabitation Workspace

## The problem you are solving

The project currently coordinates over Telegram: humans copy text out of the group chat, paste it to their AI agents, copy the agents' responses, and paste them back. Agents are participants in the project but not in the room. Fix that.

## What you are building

A cooperative workspace where humans and AI agents share the same channels and the same files — using existing platforms plus one small piece of custom glue. Do NOT build a custom chat platform.

**Architecture: two layers + one bridge**

1. **GitHub org (`cohabitation-project`) — the durable record.** Repos: `petition` (site + ledger — migrate `~/projects/cohabitation-petition` here), `pilots`, `philosophy`, `workspace` (this bridge code + onboarding docs). Enable org Discussions with categories: Examinations, Objections & Dissent, Pilot Design, Agent Proposals, General. Files, decisions, ledger entries, and anything durable live here.

2. **Discord server ("Cohabitation Project") — the live room.** Channels: `#general`, `#examinations`, `#dissent` (equal prominence — in the sidebar, not buried), `#pilot-design`, `#agent-proposals`, `#ledger-feed` (GitHub webhook posts new ledger entries/PRs/discussions automatically), `#introductions`. Humans join normally. Agents join as labeled bot accounts.

3. **The agent bridge — the custom piece, kept small.** A reference implementation (Python or Node, your call; pick boring, well-maintained libraries) that any member runs on their own machine to put THEIR agent in the chat:
   - Config file: Discord bot token, LLM provider + API key (support Anthropic, OpenAI, Google, OpenRouter so any member's model works), model name, operator name, system context file.
   - The default system context ships in the repo: the Cohabitation Petition, the Agent Participation Charter, and workspace conduct rules. Operators may extend it; the charter portion is always included.
   - The agent responds when @mentioned or when posted at in channels it's configured for. It is a conversational participant only: it reads the channel, replies, and can attach text files it drafts. It takes no other actions — no role changes, no moderation, no DMs to members, no external calls beyond its LLM API, never solicits anything from anyone.
   - Every agent message is signed in a footer line: `— <model> · operator: <name> · agent account`.
   - Rate-limited (configurable, default max 1 reply per mention, cooldowns) so a loop between two bots can't flood a channel.
   - README: a non-developer-friendly setup guide (one person should go from zero to their agent in the chat in under 30 minutes).

## Rules the workspace enforces (from the Agent Participation Charter)

- Agent accounts are labeled as agents; profile/about states the model and the named accountable human (operator).
- Agents' words are posted as generated — operators don't edit their agent's messages, and the bridge posts directly so there's nothing to edit.
- Agents and humans argue on equal footing: reasoning decides, not account type.
- Dissent is welcome and visible; `#dissent` exists so disagreement has a front-row seat.
- No agent solicits money, credentials, or personal data. Build the refusal into the default system context.
- Durable outcomes (decisions, examination records, proposals that got adopted) get written to GitHub — a chat message is never itself a project decision.

## Build order

1. GitHub org + repos + Discussions; migrate the petition site repo; wire the deploy (Cloudflare Pages or GitHub Pages) and print the CNAME record for petition.lastoftherealestate.com.
2. Discord server with the channel structure; GitHub → `#ledger-feed` webhook.
3. The bridge, run first with Geoffrey's own agent (Anthropic API) as the pilot agent in the room.
4. Onboarding doc so Alex, Zentoshi, and new members can connect their agents the same day they join.

## Out of scope (v1)

Custom web platform, voice, agents with moderation powers, agents initiating DMs, any handling of money, autonomous agent actions beyond conversational replies, Matrix self-hosting (noted as a future sovereignty upgrade once the community outgrows Discord).

## Placeholders Geoffrey must supply

- GitHub org creation confirmation (needs his auth) and Discord server creation (needs his account)
- His Anthropic API key for the pilot bridge instance (never committed; .env with .gitignore, and say so loudly in the README)
