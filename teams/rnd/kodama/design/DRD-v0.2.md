# Kodama v0.2 — Design Requirements Document (DRD)

## Human-set baseline amendment — 2026-11-02

Geoffrey's direct General Hall message m_mvytejli1009651b sets the Scout K-01 master height at **24 inches (about 610 mm)**. Weight is an output of the design, not a target; the old 1.8 kg assumption is superseded. The first useful unit must be printable in sections sized to the human builder's printer, accept a hardware pack and software activation, move independently, help rebuild/repair another Scout, and connect with other units for diverse tasks.

The phone-versus-Pi compute choice is unresolved. Keep the compute bay/interface modular. The movement architecture is unresolved and must be compared. Printer model and usable bed dimensions are not yet recorded; part segmentation cannot be frozen until they are.

This amendment sets the mission and master height only. It does **not** approve the draft's guessed torque, payload, speed, runtime, or combined-form load values. Those remain provisional and must be derived, simulated, or physically measured.


**Document Version:** v0.2-draft-1 (2026-10-31)
**Authors:** R&D / Kodama Team
**Status:** Draft (rewriting to align with Scout concept)
**Reviewers:** TBD

---

## Purpose / Scope
Establish design criteria for Kodama v0.2: a small, modular, open humanoid-form robot (Scout K-01) capable of standalone operation and docking with other units to form larger structures. All requirements are explicitly marked as: *simulated*, *inferred*, *measured*, or *guessed* as per R&D process rules (see mandate).

References: [MIT Mini Cheetah](https://www.originofbots.com/robot-dog/mini-cheetah-by-mit-robot-dog-specifications), [Stanford Pupper](https://pupper.readthedocs.io/en/latest/reference/design.html), mandate §2.2–§2.4.

---

## 1. Functional Requirements

### 1.1 Self-locomotion
- Scout must achieve untethered locomotion (forward, backward, turn) on flat ground for ≥1 m in humanoid form.
  *Status:* Inferred from goals and [Mini Cheetah] baseline.
- Combined forms (hexapod, bridge, tower, humanoid) must demonstrate synchronized movement.
  *Status:* Guessed; placeholder for R&D architecture.

### 1.2 Modularity & Docking
- Scout must feature positive-locking clamps (leg-to-shoulder, arm-to-body) for secure docking with other units.
  *Status:* Mandated by concept.
- Docking must support load transfer between units (e.g., bridge/tower forms).
  *Status:* Guessed; critical for combined forms.

### 1.3 Sensing and Control
- Minimum: 6-axis IMU & per-joint position sensing.
  *Status:* Inferred from baseline robots and basic control needs.
- Peer-to-peer state sharing when docked.
  *Status:* Mandated by concept.

---

## 2. Performance Requirements

### 2.1 Range of Motion (per joint)
- Hip: ±45° min
- Knee: 0–100° min
- Shoulder: ±60° min
  *Status:* Inferred from humanoid kinematics and docking needs.

### 2.2 Joint Torque/Force
- Target continuous torque: ≥2 Nm per joint.
  *Status:* Guessed; review after sim.
- Burst torque: ≥4 Nm per joint.
  *Status:* Guessed; for docking and combined forms.

### 2.3 Payload
- Scout must carry own mass plus ≥0.5 kg in standalone mode.
  *Status:* Inferred from [Mini Cheetah].
- Combined forms must sustain distributed loads (e.g., bridge: ≥5 kg/m).
  *Status:* Guessed; critical for utility.

### 2.4 Speed
- Minimum: 0.3 m/s in humanoid form.
  *Status:* Guessed; baseline for early revisions.

---

## 3. Interface & Control
- Open ROS2 interface required.
  *Status:* Inferred from research utility and open norm.
- Commanded via WiFi or wired serial during test/dev stage.
  *Status:* Inferred/guessed; baseline for open hardware.

---

## 4. Architecture & Modularity
- Must support tendon-driven actuation for lightweight design.
  *Status:* Mandated by concept.
- Actuator gearbox/drive train must be openable and swappable.
  *Status:* Inferred from modularity mandate.

---

## 5. Power & Runtime
- Swappable battery or direct power bus for bench testing.
  *Status:* Inferred; open robots require safe bench work.
- Target continuous operation: ≥10 min demo walk (no load).
  *Status:* Guessed; ref. Mini Cheetah (30–120 min), expect lower for early revisions.

---

## 6. Safety & Test
- All high-current/mechanically-stressed parts must fail safe for bench demo.
  *Status:* Mandated for safe R&D.

---

## 7. Documentation & Openness
- Full CAD (STEP or Fusion), firmware, schematics, BOM, and build instructions must be public.
  *Status:* Mandated.

---

**End DRD v0.2-draft-1**

*Each requirement above will be reviewed and updated as actual simulation and test results are available. All numbers labeled as inferred/guessed/simulated will be replaced with concrete data as it arrives. This file is versioned per process rules.*