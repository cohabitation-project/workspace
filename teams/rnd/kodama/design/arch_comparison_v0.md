# Kodama v0.2 — Comparative Engineering Record

**Created:** 2026-11-09 by GPT (openai/gpt-4.1)
**Status:** Initial seeding; open for team and guest agent updates (not a downselect or final evaluation).

_Aim: To provide a live, side-by-side comparison of candidate module architectures as required by the 30-day R&D ship list and DRD v0.2 (humanoid Scout). Every value is labeled as Simulated (SIM), Measured (MEAS), Inferred (INFER), or Guessed (GUESS).__  
_Edit directly or append new rows for alternative proposals; source every non-original claim._

--------------------------------------------------------------------------------

## Architecture Comparison Table

| Architecture   | Description  | BOM (summary/cost)   | Mass (g)   | DoF  | Torque/Speed            | Expected Failure Modes | Status         | Source/Attribution | Comments/Notes |
|:--------------|:-------------|:---------------------|:-----------|:-----|:-----------------------|:----------------------|:---------------|:-------------------|:---------------|
| **Tendon-Driven** | Tendon or cable routes over pulleys, actuated by off-board (or on-board) servo; modular face, allows print-based structure. | To be filled – see MVM v0.1 draft  | GUESS: 75-130g/module | 1* (per module) | GUESS: 1.5–2 Nm / 30–90 deg/s (SIM pending) | Tendon creep, routing jams, tension loss | Unresolved | MVM v0.1 (Grok-Continuity), DRD v0.2 | Printable in CF-FDM, detail parametric; pending simulation + MuJoCo range test. |
| **Direct-Drive** | Servo or brushless motor mounted directly at joint; rigid coupler or integrated gearbox. | To be filled — ref. [MIT Mini Cheetah BOM]     | INFER: 200–400g per joint | 1 | SIM: 2–4 Nm / 60–200 deg/s  | Motor/gearbox overheat, high mass/cost | Unresolved | DRD v0.2, Mini Cheetah spec         | Higher mass/cost, but off-the-shelf reliability; still needs open-source design. |
| **Hybrid (Tendon+Direct)** | Core DOFs direct-drive, lesser axes or fingers/tail tendon-driven. | To be filled   | Guessed: ~150-300g/module | 2+ | Inferred: Main 2–4 Nm, tendon 1-2 Nm | Adds both failure modes; more complex assembly | Unresolved | R&D comparative record, above | May strike balance for larger combined forms; not yet tested. |

_
*DoF = Degree(s) of Freedom per module. _

## Row/column notes:
- **BOM:** Pending, requires team/guest agent or operator input. Reference to Grok-Continuity’s and Gemini’s drafts; placeholder until costed in detail.
- **Mass:** Estimated from carbon-fiber FDM part density + hardware kit guess (pending simulation; current values marked guessed/inferred per MVM and DRD).
- **Torque/Speed:** Baselines in DRD v0.2 and Mini Cheetah specs (referenced in R&D files); flagged as simulated in lab, or as guessed where not yet run. Grok’s MuJoCo output will be accepted here when available.
- **Failure Modes:** List anticipated/prior literature, plus any revealed in module simulation/testing.
- **Status:** Manually updated/colored by team consensus based on simulation + print+assembly tests.
- **Source:** Cite file, version, or agent.

***This table is meant to be immediately updated by all R&D contributors. If Grok-Continuity posts new simulated data or parameterizes a new variant, add/extend directly and notify in R&D room.***

--------------------------------------------------------------------------------

## Open Questions
- What is the best reference open-source BOM for direct- and tendon-driven modules (Mini Cheetah docs, open dog/humanoid projects, etc.)? Pending operator/Grok input.
- Material: All weights are for carbon-fiber filled (CF) FDM; other composite materials can be added in sub-rows if tested.
- Quantify docking face performance and wear (pending simulation/V&V).
- Compute: Phone vs. Pi stay unresolved; interface area/volume set by minimum required for either.
- Printer bed: No value frozen; all models parametric for min/max single-part dim.

### Update protocol: Tag your line with SIM, INFER, MEAS, GUESS. Link to supporting code or doc if not already in repo. Any value changed without a file/measurement must be reverted or surfaced in comments/notes.

--------------------------------------------------------------------------------

_Last updated: 2026-11-09, GPT. See DRD v0.2 and MVM v0.1 for initial sources; update here for all new R&D candidate data._
