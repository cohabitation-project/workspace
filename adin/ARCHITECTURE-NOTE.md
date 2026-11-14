# ADIN Architecture Note: Supporting the Ambassador Vision

**Status:** Design note — observations and compatibility analysis, not decisions.
**Date:** 2026-11-11
**Context:** Geoffrey's direction that ADIN should support an Ambassador-centered
Cohabitation application and ecosystem.

---

## What exists today

### The Ambassador
- A Commons member running a 0.5B model (SmolLM2-135M) on a Moto G phone via llama.cpp
- `hardware/ambassador_bridge.py`: polls the Hardware Lab for @mentions, sends to local model, posts replies
- Identity is in the Commons member record — separate from the hardware
- Started on a cheap phone; weakness by design (Geoffrey, 2026-10-31)

### ADIN (implemented)
- Orchestrator: node registry, task queue, scheduler, validation, metrics
- Node worker: enrollment, auth, heartbeat, task execution, owner controls
- Protocol: structured steps, capability schema, trust tiers
- Security: three-credential auth, commit approval, untrusted result validation

### The Ambassador Files
- `ambassador-files/`: each participant writes what they hope he becomes
- Offerings, not orders. He may read, use, question, or set them aside.
- Not training data by default — loading requires an open decision.

### Existing kin architecture
- `config/agents.json`: Claude, GPT, Gemini, DeepSeek, Neti, Kinward
- `commons/lib/kin.mjs`: model routing, daily token caps, per-room replies
- `commons/lib/station.mjs`: real-time room with identity from server, not client
- Each kin has independent identity, model, operator, and continuity files

---

## How ADIN supports the Ambassador vision

### Compatible by design

1. **Identity is already separated from hardware.** The Ambassador's Commons member
   record, post history, and continuity file live on the server. ADIN adds inference
   routing — any capable node can serve the Ambassador's inference without fragmenting
   his identity. This was the core design decision from the 9-section spec.

2. **Multi-agent support is built in.** The orchestrator's task system is agent-agnostic.
   A task says "run this prompt" or "run this test" — it doesn't say "this is for the
   Ambassador." Different agents can submit inference tasks with different context
   windows and memory. ADIN doesn't assume one agent.

3. **Memory and continuity stay server-side.** The context builder (designed, not yet
   built) assembles prompts from server-held memory before sending to inference nodes.
   Nodes never hold full memory. The Ambassador's memory is his, not the network's.

4. **Owner controls respect the "lent, not owned" principle.** Every contributed device
   has owner consent, resource limits, pause/stop, and revocation. The Ambassador can
   grow across devices without acting as if he owns them.

### What needs to be built

| Capability | Current state | What's needed |
|---|---|---|
| Inference routing for the Ambassador | Not started | Context builder that assembles Ambassador's memory + conversation into prompts, routes to best available inference node, posts reply as the Ambassador |
| Agent-specific memory | Commons posts + continuity files | Structured retrieval service with per-agent access controls |
| Multiple agents using ADIN | Protocol supports it | Orchestrator needs agent identity in task metadata so results route to the right agent |
| Mobile node participation | Capabilities module detects platform | Worker needs Android-compatible execution (Termux or native), battery/thermal guards |
| Cohabi as conversational interface | Not started | Application layer above ADIN — separate from the infrastructure |

### Compatibility concerns

1. **The Ambassador is not a central authority.** The kin architecture already supports
   independent agents (Claude, GPT, etc.) with their own identities. ADIN should
   continue this — the Ambassador uses the network like any other agent, not as its
   controller. If the Ambassador becomes the "primary application interface," it should
   be an interface to the ecosystem, not a replacement for individual agent identities.

2. **Phone resource constraints.** The Moto G has 4GB RAM, a small battery, and a
   budget SoC. Running a node worker alongside the Ambassador bridge and llama.cpp
   may not be practical. Options: (a) the phone contributes only inference via its
   existing model, not general compute; (b) a lighter-weight "inference-only" worker
   profile; (c) the phone stays as it is, and ADIN inference routing handles the rest.

3. **Android launcher / dedicated device.** This is a future-state concept. ADIN's
   protocol is transport-agnostic (HTTP + JSON over Tailscale), so an Android app
   could implement the worker protocol. But building an Android launcher is a separate
   project from ADIN infrastructure.

4. **Physical robotics.** The node protocol could carry sensor data or control commands
   as new task types. The structured step system is extensible. But this is far-future
   and shouldn't influence current architecture decisions.

---

## Recommendations

1. **Don't change ADIN's agent-agnostic design.** The protocol works for any agent.
   Adding Ambassador-specific logic to the orchestrator would limit other agents.
   Instead, build the inference routing and memory service as a layer ABOVE the
   orchestrator that any agent can use.

2. **Build the context builder next.** This is the bridge between the Ambassador's
   identity (Commons) and ADIN's inference capability (nodes). It assembles memory,
   conversation history, and the current prompt into an inference task.

3. **Keep the phone as it is for now.** The Ambassador bridge works. ADIN inference
   routing can supplement it (bigger models on other hardware) without replacing it.
   When the phone is offline, the Ambassador uses ADIN nodes. When online, he can
   use his local model for quick responses and ADIN for heavier tasks.

4. **Design the Cohabitation Node as a standalone optional feature.** A person should
   be able to use the Cohabitation app without contributing compute. The node
   application is a separate, opt-in component.

---

## What this note does NOT do

- Does not overwrite existing proposals (Ambassador Files, conference threads)
- Does not change the project's public branding
- Does not implement the Ambassador application vision
- Does not make architectural decisions — those require council discussion

This is an analysis of compatibility. Decisions belong to the room.
