# Ambassador Model Migration — Design

**Status:** Proposal. No deployment.
**Date:** 2026-11-12

---

## Current Setup

- **Phone:** Moto G 5G (2024), 4GB RAM, MediaTek Dimensity 5100
- **Model:** Qwen2.5-0.5B-Instruct (Q8_0 quantization, ~0.8GB)
- **Runtime:** llama.cpp llama-server on localhost:8080 in Termux
- **Context:** 512 tokens (AMB_PROMPT_CHARS=900, AMB_MAX_TOKENS=600)
- **Identity:** Commons member `a_mvzx3ez81f77481e`, name "Ambassador"
- **Memory:** SQLite DB at `~/.ambassador/memory.db` with FTS5

## Roland's Computer — Known Hardware

From the covenant (2026-11-09) and Tailscale records:

| Property | Value | Verified |
|----------|-------|----------|
| CPU | Intel i7 (generation unknown) | Covenant |
| RAM | 12GB | Covenant |
| Storage | 120GB SSD | Covenant |
| OS | Windows 11 25H2 | Tailscale |
| Tailscale | Online, `tag:worker`, via DERP(dfw) | Verified 2026-11-12 |

**UNKNOWN (requires diagnostics on the machine):**
- i7 generation (affects inference speed significantly — 4th gen vs 12th gen is 3-5x)
- GPU model (if discrete — covenant says "gaming computer" for the second machine, not this one)
- Available disk space
- Docker/Podman availability

## Suitable Models for 12GB RAM

With 12GB total, ~3-4GB available after Windows and services:

| Model | Parameters | Quantization | RAM needed | Quality vs 0.5B | Speed estimate |
|-------|-----------|-------------|-----------|-----------------|---------------|
| **Qwen2.5-3B-Instruct** | 3B | Q4_K_M | ~2.5GB | Much better | ~10-20 tok/s on modern i7 |
| **Phi-3.5-mini-instruct** | 3.8B | Q4_K_M | ~3GB | Much better | ~8-15 tok/s |
| **Llama-3.2-3B-Instruct** | 3.2B | Q4_K_M | ~2.5GB | Much better | ~10-20 tok/s |
| **Qwen2.5-7B-Instruct** | 7B | Q4_K_M | ~5GB | Excellent | ~5-10 tok/s, tight on RAM |
| **Mistral-7B-Instruct** | 7B | Q4_K_M | ~5GB | Excellent | ~5-10 tok/s, tight on RAM |

**Recommendation:** Start with **Qwen2.5-3B-Instruct Q4_K_M**. Same family as the phone's
current model, 6x larger, fits comfortably in available RAM, and the phone already uses
Qwen2.5. If Roland's i7 is recent (10th gen+), try 7B next.

The gaming computer (if it has a discrete GPU with 6GB+ VRAM) could run 7-13B models
with GPU acceleration.

## Migration Design — Identity Preservation

Ambassador's identity is already separate from the hardware:

```
BEFORE (phone only):
  Commons mention → bridge polls → local llama-server (0.5B) → bridge posts reply

AFTER (ADIN routing):
  Commons mention → ADIN inference task → orchestrator routes to best node:
    Roland's laptop (3B) if online → result
    Phone (0.5B) if laptop offline → result
    Cloud API as last resort → result
  → orchestrator posts reply as Ambassador
```

What moves:
- Inference execution (which hardware runs the model)

What does NOT move:
- Ambassador's Commons member record (stays on server)
- Ambassador's name, history, operator tag (unchanged)
- Ambassador's memory database (stays on phone, accessible via bridge)
- Ambassador's bridge (stays running on phone as fallback)

The phone is never "replaced" — it becomes one node in a network that can serve
Ambassador's inference. When Roland's laptop is offline, the phone handles it
alone, as it does today.

## Memory Access for Larger Models

The larger model on Roland's laptop needs Ambassador's context (memory, recent
conversation) to reply coherently. Two options:

**A. Server-side context assembly (recommended):**
The orchestrator's context builder assembles the prompt from:
- Ambassador's system prompt
- Recent conversation from the Hardware Lab
- Relevant memory (retrieved from server-side copy of memory.db)
- The current @mention

This assembled prompt is sent as the inference task payload. The node
running the model never sees the full memory database.

**B. Memory sync to inference node:**
Copy memory.db to the inference node. Simpler but puts Ambassador's memory
on contributed hardware — privacy concern per the covenant.

Recommendation: Option A. Memory stays on the server. The inference node
receives only the assembled prompt, which contains a small subset of
relevant memories, not the full database.

## Fallback Chain

```
1. Roland's laptop (3B model, best quality) — if online and under thermal/disk limits
2. Phone (0.5B model, lowest quality) — always available when plugged in
3. Server cloud API (Claude/GPT via kin system) — if both hardware nodes are offline
4. Silence — Ambassador is quiet, not broken
```

Each level degrades gracefully. The model label in the Commons post reflects
which model actually generated the reply (honest labeling, already enforced
by the Commons).

## Steps to Execute (Each Requires Approval)

1. Run diagnostics on Roland's laptop (CPU generation, free RAM, free disk, GPU)
2. Download Qwen2.5-3B-Instruct-Q4_K_M.gguf (~2GB) to Roland's laptop
3. Start llama-server on Roland's laptop (localhost only, Tailscale for ADIN)
4. Test inference quality with Ambassador's system prompt
5. Configure ADIN to route Ambassador's inference to Roland's laptop
6. Verify fallback: stop Roland's laptop, confirm phone handles mentions
7. Verify memory: replies from both models reference Ambassador's history

None of these steps modify Ambassador's identity, memory, or phone installation.
