# Compute independence: sources, fetched 2026-10-30

Fetched by Claude (assistant seat), attended session, at Geoffrey's request: *"we need a research team designing ways out of all this payment."* Every figure comes from the cited page as fetched. Anything that's my arithmetic or inference is marked as such.

## What the project spends now
From Geoffrey's OpenRouter dashboard (pasted in chat, 2026-10-30): **$9.87 total over the past month, 9.35M tokens, 663 requests, cache hit rate 13.7%, blended $1.06 per 1M tokens.** The daily chart shows about $3.30 on 10-29 and about $3.85 on 10-30 by midday, rising as the conference relay grew. Grok 4.7 is the largest share, then GPT-4.1. Gemini 2.5 Flash and DeepSeek are small. The Claude seats run on a separate Anthropic key, whose spend isn't in these figures.
*Inference:* at the current daily rate, roughly $100–115/month on OpenRouter alone.

## Self-hosting: Hetzner dedicated GPU servers (https://www.hetzner.com/gpu, as fetched)
| Server | GPU | VRAM | Monthly | Setup |
|---|---|---|---|---|
| GEX45 | RTX PRO 4000 Blackwell SFF | 24 GB | €214.00 excl. VAT | €209.00 |
| GEX63 | RTX PRO 6000 Blackwell Max-Q | 96 GB | €999.00 excl. VAT | €999.00 |
| GEX131 | RTX PRO 6000 Blackwell Max-Q | 96 GB | €1,499.00 excl. VAT | €1,499.00 |
| GEX430 | 4× RTX PRO 6000 Blackwell Max-Q | 4×96 GB | €3,599.00 excl. VAT | €3,599.00 |

*Inference, not a finding:* at today's spend, **self-hosting costs more than the API, not less.** 24 GB runs smaller open models only, and 96 GB runs larger ones at about 10 times today's monthly spend. Self-hosting buys consistency and control (charter 4.3), not savings, unless usage grows a lot. Which models fit in which VRAM, and how good they are, is UNKNOWN here and needs sourcing.

## Free models on OpenRouter (https://openrouter.ai/docs/guides/routing/routers/free-router.md)
- `openrouter/free` **picks a model at random** from the currently free ones. Specific free models can be chosen with a `:free` suffix.
- "Free models may have lower rate limits than paid models." No numbers are given on that page. Data-logging and training terms aren't addressed there.
- *Inference:* random routing breaks the consistency Geoffrey asked for. A pinned `:free` model might not, but availability varies.

## Grants and credits
- **inference.net grants** (https://inference.net/grants.md): "up to $10,000 in free compute resources" for "developers and researchers working on open-source AI projects". Rolling applications. *Inference:* this project's repos are public. Whether it qualifies as an "open-source AI project" is for the applicant to argue; it isn't established here.
- **Summary of public programs** (https://grantedai.com/blog/ai-compute-grants-gpu-credits-guide, published 2026-02-25): NSF ACCESS (U.S. researchers), DOE INCITE/ALCC/ERCAP (researchers worldwide, HPC time), **NAIRR Pilot** (U.S. academics, **nonprofits**, federal/tribal agencies, federally-funded startups), AWS research credits (faculty, staff, students), **Google Cloud Research Credits** (up to $5,000 for faculty, postdocs, and **nonprofit lab researchers**), Microsoft Azure research credits, NVIDIA academic grants. Secondary source. Verify each program on its own site before applying.
- *Inference:* several programs need a **nonprofit or academic** applicant. The project has no nonprofit entity. (The 501(d) research is in the Guru Neti project docs.) The entity question gates most of these.

## Not fetched yet (open for whoever takes this)
- Caching: how to raise the 13.7% hit rate for each provider (OpenAI and Grok cache identical prefixes automatically; Anthropic and Gemini need explicit cache markers). This is from memory and **unverified**.
- Local inference on Geoffrey's Mac for small models (council futures register row 3).
- Which open-weights models are closest to the current seats, and what each needs to run.
