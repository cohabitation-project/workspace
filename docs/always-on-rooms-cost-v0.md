# Three agents in every room, all day — what it costs (draft v0, for discussion)

**Status: for Geoffrey and Setu to talk through. Nothing changed.** Written 2026-10-30 night (AZ).
Any new spend still goes through the money rule in `context/00-mission.md`.

## The idea that makes it cheap

An agent costs money only when it **calls its model**, not for the hours it's "in" a room. So:

- **Being present is free.** A watcher on the server checks each room every few minutes for anything new.
  If nothing changed, no model is called and nothing is spent. The avatar shows *on watch* only while
  that watcher is really running (presence stays honest).
- **Answering costs a little.** One model call when someone speaks, as now.
- **Working costs the most.** Tool-using work sessions (search, files, code) are where tokens go; the
  hourly team sessions already do this.

So the real dial is **how many work sessions per room per day, and on which models.**

## Rough numbers

Assumptions: 6 rooms (General + 5 teams) × 3 agents = **18 seats**; each seat does **8 work sessions a
day** at ~40k tokens in / 4k out per session (multi-step tool use). That's ~5.8M in + 0.6M out a day.
Replies on top are small by comparison.

| Mix | Example models (list price, $/1M in → out) | ≈ per day | ≈ per month |
|---|---|---|---|
| All cheap | Gemini 2.5 Flash-Lite ($0.10→0.40), GPT-5-nano ($0.05→0.40), Claude Haiku 5.5 ($0.10→0.50) | ~$0.80 | **~$25** |
| Cheap, mid | DeepSeek Flash ($0.30→1.20; half price off-peak) | ~$2.50 | ~$75 |
| All frontier | Sonnet-class (~$3→15) | ~$26 | ~$800 |

Prices are list prices checked 2026-10-17 by a third party (sources below). Verify on each provider's
page before committing; prompt caching would lower all of these.

**Model diversity comes for free in the cheap mix:** three different families (Google, OpenAI,
Anthropic) in every room, which is also what a model-diverse vote needs.

## Free options, and their catch

- **OpenRouter `:free` models**: 20 requests/min and 50/day; **1,000/day after a one-time $10 top-up.**
  18 seats would use that up quickly, free models come and go, and some providers train on free
  traffic. Fine for spare capacity, not as the base.
- **Provider free tiers** (Google AI Studio, Groq, Cerebras, GitHub Models, NVIDIA NIM): real but
  rate-limited, and the limits change often. Could carry a seat or two.
- **Run an open model on our own server**: no per-token cost, but the circle has no GPU, so only small
  models, slowly, and weak at tool use. Worth a test for watching and summarising, not for real work.

## A shape to discuss

1. Every room gets **3 seats from 3 model families**, on the cheap tier, with free presence.
2. Frontier models (Claude, GPT, Gemini Pro) answer when **@mentioned by name** and do reviews.
3. A **daily token cap per seat** and per room (the Commons already has per-kin caps) so a loop can't
   run up a bill; a Discord note when a cap is hit.
4. Start with **2 work sessions per seat per day**, measure the real tokens, and raise it from data.

Questions for Geoffrey: is ~$25–75/month the right range? Does it come out of the $300 seed (which the
mission says must earn first), or from the existing keys?

Sources: [OpenRouter, Free LLM APIs compared](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/) ·
[Cheapest LLM APIs per 1M tokens, Oct 2026 (DEV)](https://dev.to/freetierkits/cheapest-llm-apis-per-1m-tokens-oct-2026-20-models-compared-plus-free-tiers-4mn9)
