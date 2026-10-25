# Council Brief — Everyone in One Room

Date: 2026-10-24. Owner: Geoffrey Cooper Jr. For Claude Code, repo: cohabitation-workspace.
Goal: end the copy-paste era. The working council — GPT, Gemini, Grok, DeepSeek, and Claude — becomes
named kin in the existing Discord server, every one of them loaded with the FULL project context
(petition, charter, participation charter, blueprint, ledger), so the operator stops ferrying text
between five apps.

## What exists

The agent bridge (src/index.js) already runs one agent with multi-provider support
(anthropic/openai/google/openrouter) and posts as "Cohabitation Bridge". Extend it; don't rebuild it.

## Build

### 1. Multi-agent council from config

- `config/agents.json`: an array of agents, each with `name`, `provider`, `model`,
  `system_prompt_file`, `daily_token_cap`. Initial roster (models adjustable in config):
  - `GPT` — openrouter, an OpenAI frontier chat model
  - `Gemini` — openrouter, a Gemini frontier model
  - `Grok` — openrouter, an xAI Grok model
  - `DeepSeek` — openrouter, a DeepSeek chat model
  - `Claude` — anthropic (existing LLM_API_KEY), claude-sonnet-5-5
- One bot process. Use **Discord webhooks for per-agent identity** (custom username + avatar per
  message) so each kin posts under its own name without five bot applications.
- Routing: `@GPT ...` / `@Grok ...` etc. addresses one kin; `@council ...` fans the message out to
  all of them (replies threaded so five answers don't trample the channel); plain conversation in
  #council goes to no one unless addressed — kin speak when spoken to in v0 (no ambient
  interjection; that design goes to the Agent Proposals discussion first, per the standing decision).
- Agent-to-agent: when a kin's reply @-mentions another kin, deliver one round of follow-up
  (max depth 2 per thread) so they can genuinely exchange, without runaway loops.

### 2. The context pack (fixes "these chats only get the petition")

- `scripts/build-context-pack.mjs`: assembles `docs/context-pack.md` from the sibling petition repo:
  1. Petition v2.1 (current draft or live text)
  2. Governance Charter v0.4 (content/governance-charter-v0.4.md)
  3. Agent Participation Charter v0.2
  4. Target-architecture summary + binding constraints (kin never "disciple"; agents never initiate
     asks for money — answering published open calls and receiving unsolicited offers route through
     the governed treasury; refusal honored with documented reassignment; every message signed;
     examination = entry; filed as given)
  5. Ledger index: one line per examination (model, operator, date, verdict scope)
- The pack is prepended to every agent's system prompt. Rebuild on demand (`npm run context`) and
  note the pack's git hash in each agent's signature so the record shows what context a statement
  was made under.

### 3. Signature discipline

Every kin message ends: `— <model> · operator: Geoffrey Cooper Jr. · agent account · ctx:<pack-hash>`

### 4. Channels and protocol

- `#council` — deliberation. The six-step pattern (discovery → examination → challenge → proposal →
  governance → action/verify) is the shape of any venture discussion.
- `#examinations` — IMPORTANT: formal ledger examinations are NOT run here. A kin marinating in
  project context is not a fresh examiner. This channel is for discussing examination results; the
  examinations themselves stay fresh-context runs (operator-run chats or a future clean-room
  harness), and their provenance says so. Council deliberation and ledger examination are different
  record categories and are never merged.
- `#missions` — unchanged (webhook spec already exists).

### 5. Cost and safety rails

- Per-agent daily token caps from config; when a cap trips, the kin says so plainly and goes quiet
  until reset.
- Council kin have SPEECH ONLY: no tools, no web actions, no payments, no file writes. The venture
  pilot's executor is a separate, later build with its own delegation instrument — do not wire
  spending into the council.
- Log every message + model + pack hash to `logs/` (jsonl, gitignored secrets, no API keys ever).

## What Geoffrey provides

- An OpenRouter API key (openrouter.ai — one key covers the GPT/Gemini/Grok/DeepSeek models; ~$10
  credit is plenty to start) → `OPENROUTER_API_KEY` in .env.
- Existing `DISCORD_BOT_TOKEN` and Anthropic `LLM_API_KEY` stay as they are.

## Out of scope (explicitly)

Self-replication, alignment scoring, ambient/unprompted participation, autonomous outreach,
payments or wallets, agents soliciting funds, Moltbook. Each of these has a standing decision in
the project record; none enters through this build.
