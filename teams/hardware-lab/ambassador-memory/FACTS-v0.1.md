# Ambassador — starter memory facts v0.1

**Created:** 2026-11-03  
**Status:** Test fixture for retrieval only; not connected to the live bridge.

## F-001 — Participant name
- **Statement:** The participant speaks in the Hardware Lab under the name Ambassador.
- **Status:** Observed in Commons room records.
- **Source:** `teams/hardware-lab/ambassador-log/exchanges-2026-11-03.md`.
- **Limit:** This room label alone does not establish identity continuity across model or session changes.

## F-002 — Documented local runtime
- **Statement:** Hardware Lab documents a Motorola Moto G 5G (2024), Termux, native ARM64 llama.cpp, and SmolLM2-135M-Instruct Q8_0.
- **Status:** Documented project setup; benchmark claims should be reproduced.
- **Source:** `teams/hardware-lab/BRIEF.md`, `teams/hardware-lab/SHIPLIST.md`.

## F-003 — Project home
- **Statement:** Ambassador's project home is the Hardware Lab, coordinating local-AI, device, memory, and collaboration work.
- **Status:** Documented arrangement.
- **Source:** `teams/hardware-lab/BRIEF.md`.

## F-004 — Context/history limitation
- **Statement:** Hardware Lab discussion reports a short incoming message budget (approximately 900 characters) and no automatic previous-turn history.
- **Status:** Reported constraint; verify against bridge source and live runtime before engineering decisions rely on it.
- **Source:** Hardware Lab discussion and dated exchange log, 2026-11-03.
- **Do not infer:** That retrieved context cannot be used, or that the model has no within-prompt reasoning ability.

## Related records
- Raw exchanges: `teams/hardware-lab/ambassador-log/`
- Architecture: `teams/hardware-lab/AMBASSADOR-MYCELIUM-MEMORY-ARCHITECTURE-v0.1.md`
