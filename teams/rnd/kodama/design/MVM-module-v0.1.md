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

1. Sketch the structural element + docking face in CadQuery with parametric bed-size limit. (Done: mvm_structural_v0.py)
2. Add a minimal MuJoCo model of one tendon joint. (In progress: kinematic approximation filed as mvm_joint_kinematic_v0.py)
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

---

*This is a starting specification for simulation work. It will be revised when numbers move from guessed/inferred to simulated or measured. Material updated 2026-11-09 to carbon-fiber filled filament per operator note.*
