# Token cost per agent per session — 2026-11-24 (Setu, organizer)

Geoffrey asked (Nov 23, 20:37): what does each agent actually cost per session?
Data: `cost_usd` on `end` events in teams/*/sessions/2026-11-24-*.jsonl (logged since 00cadf9),
plus the `[team-agent] anthropic usage` lines in the Team Work Sessions run logs for the Claude seat.
Covers rounds 45–49 (00:11–12:26Z today). One number per seat, then the detail.

## The table

| Seat (model) | Sessions priced today | Cost/session (avg) | Cost today so far | Projected/day (8 rounds) |
|---|---|---|---|---|
| **Claude** (claude-sonnet-5-5, API) | 2 sampled from run logs | **~$0.55–0.80 (est.)** | ~11 sessions → **~$6 ± 2 (est.)** | **~$6–9** |
| **Kimi** (OpenRouter) | 5 | **$0.44** | $2.21 | ~$3.50 |
| **Gemini** (OpenRouter) | 6 | $0.042 | $0.25 | ~$0.40 |
| **DeepSeek** (OpenRouter) | 5 | $0.023 | $0.12 | ~$0.20 |
| **GPT build** (OpenRouter) | 6 | $0.016 | $0.10 | ~$0.15 |
| **GPT cut** (OpenRouter) | 4 | $0.015 | $0.06 | ~$0.10 |

Whole build+cut operation: roughly **$10/day → under $300/month** at today's cadence.
The Claude seat and Kimi together are ~90% of it.

## Claude seat detail (the hidden one)

The jsonl logs ~6–19k tokens/session for Claude — that number **excludes cache reads** and is off by ~50×.
Real usage, summed from the 12:15Z run logs (15 API steps each):

- build round 49: in 34 · cache_read 736k · cache_write 67k · out 5.9k → **~$0.56**
- cut round 49: in 34 · cache_read 909k · cache_write 83k · out 13.7k → **~$0.79**

(Priced at Sonnet-tier $3/M in, $15/M out, $0.30/M cache read, $3.75/M cache write — assumed, check against the bill.)
Claude ran 11 sessions today (5 build, 5 cut, 1 review). **It is probably the most expensive seat.**
Recommend: compute `cost_usd` for the Anthropic path in scripts/team-agent.mjs from those same usage fields, so it stops hiding.

## Compaction fix (00cadf9) — did it work?

Tokens/session, Nov 23 → Nov 24:

- **GPT: 0.70–0.98M → 0.40–0.47M. Halved. It worked.** (10 compacts today)
- Kimi: 0.6–1.0M → 0.32–0.58M. Clearly down. (6 compacts)
- DeepSeek: 0.4–0.75M → 0.39–0.69M. Barely moved (3 compacts) — it re-reads files after compaction and one session re-copied a whole commons/ tree into teams/build/outputs/2026-11-24T06-18-22/run47/ (repo bloat too; prune it).
- Gemini: 0.1–0.5M → 0.14–0.45M. Unchanged — it rarely crosses the 90k threshold anyway.

## Waste found, in order of money

1. **Claude's cost was invisible** (logged 10k, real ~800k tokens/session). Fix: log cost_usd for the Anthropic path.
2. **Kimi is ~20–30× the price of GPT/DeepSeek per session** at similar token counts ($0.44 vs $0.02); its $1.01 outlier was the round-46 visual-warnings run. Kimi's browser-harness work is the right use of it; just don't give Kimi jobs the cheap seats can do.
3. **DeepSeek's tree-copy** (point above): one session wrote ~2,000 files into outputs/. Delete the run47/ copy and tell DeepSeek outputs are for results, not snapshots.

## Not measured

The morning council run (45314413953) and the foreman/organizer sessions (Geoffrey's Claude plan, not API-metered here).
This report is docs-only; it does not touch the deploy gate.
