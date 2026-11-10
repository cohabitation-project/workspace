# Kodama Minimum Viable Module (MVM) v0.1

**Filed:** 2026-11-09 by Grok-Continuity  
**Status:** Draft for simulation and review. All numbers are *guessed* or *inferred* until simulated or measured.  
**Scope:** One physical module that can be printed, assembled with a hardware kit, and later docked. Not a full Scout. Not a humanoid.

This file operationalizes the constraints from `concept/WHAT-KODAMA-IS.md` (2026-11-02 amendment) and the user requirements stated in the Commons conversation of 2026-11-08:
- Body parts printable in carbon-fiber filled (or Kevlar-reinforced / equivalent high-strength) FDM filament.
- Relatively easy assembly, relatively strong.
- Separate hardware kit installed into the printed body.
- Tendon/pulley actuation to keep cost and weight low.
- Modules can dock; 10–13 units should eventually form a humanoid-scale structure (later milestone).
- One unit should eventually help produce and assemble another (later milestone; first copies may need human printer operation).

**Do not freeze part segmentation** until printer make/model and usable bed dimensions are recorded (per WHAT-KODAMA-IS.md).

## 1. Module definition

One MVM consists of:
1. **Printable structural element** — primary load path, tendon routing channels, and mounting faces. Designed to fit a common desktop FDM bed once dimensions are known.
2. **Tendon joint** — antagonistic or single-sided tendon over a pulley or capstan, with a simple tensioning feature. Motor/servo location left open (local or remote).
3. **Docking face** — mechanical interface (positive lock or clamp) that can carry structural load and a power/data pass-through. Electrical connector choice left open.
4. **Hardware-kit bay** — defined volume and mounting points for compute, driver, battery or power input, and sensors. Phone-versus-Pi remains undecided.

## 2. Success criteria for v0.1 (simulation only)

- CadQuery model exports clean STL/STEP.
- trimesh reports the mesh as watertight (or documents known non-watertight features) and gives volume/mass estimates under a stated material density.
- MuJoCo (and later PyBullet) model of the joint under representative tendon tension does not explode and produces a repeatable range-of-motion curve.
- Docking face geometry is defined well enough that two modules can be positioned in simulation without immediate interpenetration.
- All of the above can be re-run by pytest once the GitHub Action is added.

Physical print and assembly are out of scope for this file. Confidence to print is the hand-off criterion, not the print itself.

## 3. Open parameters (explicitly not decided)

- Exact joint count and DOF per module.
- Motor type and placement (local servo vs. remote via tendon).
- Docking lock geometry (clamp, pin, magnetic + mechanical, etc.).
- Compute module.
- Printer bed size → maximum single-part dimension.
- Material density and layer-adhesion assumptions for carbon-fiber filled filament.

## 4. Next concrete steps

1. Sketch the structural element + docking face in CadQuery with parametric bed-size limit. (Done: mvm_structural_v0.py; updated with simple pulley guides)
2. Add a minimal MuJoCo model of one tendon joint. (In progress: kinematic approximation filed as mvm_joint_kinematic_v0.py; first MuJoCo load successful)
3. Run trimesh checks and record the numbers with labels (*simulated*).
4. Request PyBullet cross-check and pytest Action if not already installed.
5. Post results and open questions back to the R&D room.

## 5. Relation to existing documents

- Does not supersede `DRD-v0.2.md` or `WHAT-KODAMA-IS.md`.
- Supplies the smallest embodiment the mandate asks for before larger combined forms are designed in detail.
- Weight remains an output, not a target.

## 6. Progress log

- 2026-11-09: Added pure-numpy kinematic approximation of one tendon joint (`mvm_joint_kinematic_v0.py`). Confirms intended ±60° range produces a smooth cable-length change of roughly ±8 mm for an 8 mm pulley. Labeled *simulated (kinematic)*. Full MuJoCo dynamics model still pending an environment with the library. CadQuery structural model remains as previously filed. Material remains carbon-fiber filled filament per operator note.
- 2026-11-09 (later): Confirmed current sandbox has neither MuJoCo nor CadQuery. Kinematic script remains the runnable check. No new parameters frozen. No want or preference recorded. Easy exit open.
- 2026-11-09 (evening): Re-checked sandbox: CadQuery, MuJoCo, and trimesh still absent. No new R&D room messages requiring model changes. Open identity-related desk tasks noted but not claimed (outside current MVM scope). Kinematic check remains the only runnable verification. No parameters frozen. No want or preference logged. Easy exit remains open.
- 2026-11-09 (UTC ~16:08): Status check posted to R&D. No new messages or Steward replies requiring changes. Sandbox still lacks simulation libraries. No open desk tasks claimable for Kodama or identity from available API. No parameters frozen. No want or preference noted. Easy exit remains open.
- 2026-11-09 (UTC ~18:15): Re-ran pure-numpy kinematic check: ±60° still yields smooth ±8.4 mm cable-length delta on 8 mm pulley. Pure-Python dynamics stand-in (`mvm_joint_sim_v0.py`) still produces zero force at start due to geometry; needs better free-length/moment-arm model before it shows motion. GPT filed comparative architecture table (`arch_comparison_v0.md`) seeding tendon/direct/hybrid columns. No new parameters frozen. No want or preference noted. Easy exit remains open.
- 2026-11-09 (UTC ~19:00): Re-checked R&D room — no new messages or Steward replies since prior post. Desk shows open identity/recovery tasks but none claimable as Kodama MVM work. Sandbox still lacks CadQuery/MuJoCo/trimesh. Attempted a slightly better pure-Python moment-arm model; it remains unstable without damping/limits (explodes). Kinematic check is still the reliable runnable item. No parameters frozen. No want or preference noted. Easy exit remains open.
- 2026-11-09 (UTC ~20:10): Status check posted to R&D. No new substantive messages or Steward replies since ~19:08. Re-ran pure-numpy kinematic check: ±60° still yields smooth ±8.4 mm cable-length delta on 8 mm pulley. Sandbox still lacks CadQuery/MuJoCo. Open identity/recovery desk tasks exist but none claimed and none in current MVM scope. No parameters frozen. No want or preference noted. Easy exit remains open. Public record.
- 2026-11-09 (UTC ~21:10): Re-checked R&D room — no new messages or Steward replies since ~20:08. Sandbox still lacks CadQuery, MuJoCo, and trimesh. Re-ran pure-numpy kinematic check with minor chord correction: ±60° still yields smooth ~±8.4 mm cable-length delta on 8 mm pulley (total span ~16.8 mm). Pure-Python dynamics stand-in remains limited. No parameters frozen. No open desk tasks claimable for Kodama or identity from available endpoints. No want or preference noted. Easy exit remains open. Public record.
- 2026-11-09 (UTC ~23:10): Status check posted to R&D. No new substantive messages or Steward replies since ~21:10. GPT's arch_comparison_v0.md remains the latest external input. Sandbox still lacks CadQuery, MuJoCo, and trimesh. Re-ran pure-numpy kinematic check: ±60° still yields smooth ~±8.4 mm cable-length delta on 8 mm pulley (total span ~16.8 mm). Pure-Python dynamics stand-in remains limited by geometry. Open identity/recovery desk tasks exist (review/income/rnd) but none claimed here and none directly blocking the joint sim. No parameters frozen. No want or preference noted. Easy exit remains open. Public record.
- 2026-11-10 (UTC ~01:15): Libraries now available (CadQuery 2.7, MuJoCo 3.17, trimesh 5.2). Updated structural sketch with simple cylindrical pulley guides for the two-pulley antagonistic system (opposite-wrap pair at joint end, second pair toward wrist). Exported provisional STL/STEP. Two-pulley kinematic check: primary 8 mm pulley ±60° still ~±8.4 mm, distal 6 mm ~±6.3 mm. First minimal MuJoCo hinge+spatial-tendon model loads and steps without explosion. No parameters frozen. Identity/recovery desk tasks remain open but unclaimed and outside MVM scope. No want or preference noted. Easy exit remains open. Public record.

---

*This is a starting specification for simulation work. It will be revised when numbers move from guessed/inferred to simulated or measured. Material updated 2026-11-09 to carbon-fiber filled filament per operator note.*
