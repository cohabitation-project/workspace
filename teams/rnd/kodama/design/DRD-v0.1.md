# Kodama v0.1 — Design Requirements Document (DRD)

**Document Version:** v0.1-draft-2 (2026-10-31)
**Authors:** R&D / Kodama Team
**Status:** Draft (expanded with preliminary power estimates and refined torque/power specs)
**Reviewers:** TBD

---

## Purpose / Scope
Establish design criteria for Kodama v0.1: a small, modular, open quadruped robot for research and capability demonstration. All requirements are explicitly marked as: *simulated*, *inferred*, *measured*, or *guessed* as per R&D process rules (see mandate).

References: [MIT Mini Cheetah](https://www.originofbots.com/robot-dog/mini-cheetah-by-mit-robot-dog-specifications), [Stanford Pupper](https://pupper.readthedocs.io/en/latest/reference/design.html), mandate §2.2–§2.4.

---

## 1. Functional Requirements

### 1.1 Self-locomotion
- Kodama must achieve untethered locomotion (forward, backward, turn) on flat ground for ≥1 m.
  *Status:* Inferred from goals and [Mini Cheetah] baseline.

### 1.2 Modularity
- Major components (legs, controller, battery, comms module) must be removable/replaceable with hand tools.
  *Status:* Mandated/guessed for rapid iteration and repair.

### 1.3 Expandability
- Physical/communication interface for joining with additional modules (future chained or swarm configs).
  *Status:* Guessed; placeholder for R&D architecture.

### 1.4 Sensing and Control
- Minimum: 6-axis IMU & per-joint position sensing.
  *Status:* Inferred from baseline robots and basic control needs.

---

## 2. Performance Requirements

### 2.1 Range of Motion (per joint)
- Hip: ±45° min
- Knee: 0–100° min
*Status:* Inferred from [Mini Cheetah], [Pupper] kinematics.

### 2.2 Joint Torque/Force
- Target continuous torque: ≥2 Nm per joint.
  *Status:* Guessed, set lower than Mini Cheetah/ANYmal (~7–8 Nm) to reflect size/cost but above typical servo dog class (<1 Nm).
- Startup/burst torque: ≥4 Nm per joint.
  *Status:* Guessed, to support initial acceleration and obstacle negotiation.
- Leg must lift and sustain at least 300 g load at full extension.
  *Status:* Guessed/benchmark for basic use; review after sim.
- *Related Power:* See Section 6 for preliminary power estimates derived from these torque values.

### 2.3 Payload
- Must carry own mass plus ≥0.5 kg (demonstrated walking with ≥10% body weight as payload).
  *Status:* Inferred from [Mini Cheetah] (2 kg/9 kg ~22% payload) and small open robots.

### 2.4 Speed
- Minimum: 0.3 m/s on level surface.
  *Status:* Guessed; Mini Cheetah achieves >3 m/s, Pupper ~0.5–1 m/s on servos.

---

## 3. Interface & Control
- Open ROS2 interface required.
  *Status:* Inferred from research utility and open norm.
- Commanded via WiFi or wired serial during test/dev stage.
  *Status:* Inferred/guessed; baseline for open hardware.
- Codebase and control electronics fully user-flashable.
  *Status:* Mandated for open-source.

---

## 4. Architecture & Modularity
- Must support at least two leg architectures: (A) tendon/central-motor, (B) direct drive, (C) hybrid/Bowden.
  *Status:* Mandated by comparative study requirement (§4 of ship list).
- Actuator gearbox/drive train must be openable and swappable in future variants.
  *Status:* Inferred from modularity mandate.

---

## 5. Sensors & Feedback
- Primary: IMU, joint encoders.
- Optional: Foot pressure/contact (if cost allows).
  *Status:* Inferred from open-robot benchmarks and basic balance control.

---

## 6. Power & Runtime
- Swappable battery or direct power bus for bench testing.
  *Status:* Inferred; open robots require safe bench work.
- Target continuous operation: ≥10 min demo walk (no load).
  *Status:* Guessed; ref. Mini Cheetah (30–120 min), expect lower for early revisions.
- **Preliminary Power Estimates (per joint):**
    - Continuous Power: ~2.00 W. *Status:* Inferred from target continuous torque (2 Nm) and an assumed continuous angular speed of 1 rad/s (approx. 57 deg/s).
    - Burst Power: ~8.00 W. *Status:* Inferred from target burst torque (4 Nm) and an assumed burst angular speed of 2 rad/s (approx. 114 deg/s).
    - *Methodology:* Power (W) = Torque (Nm) * Angular Speed (rad/s). These are initial estimates; actual power consumption will vary with load, duty cycle, and motor efficiency, and will be updated with simulation and measured data.

---

## 7. Safety & Test
- All high-current/mechanically-stressed parts must fail safe for bench demo (reset fuses, overload cutout, or clutch preferred).
  *Status:* Mandated for safe R&D, inferred from open-robot failure cases.

---

## 8. Documentation & Openness
- Full CAD (STEP or Fusion), firmware, schematics, BOM, and build instructions must be public.
  *Status:* Mandated.

---

## Appendix: Baseline Data (for traceability)
- MIT Mini Cheetah: 9 kg, 12 driven DoF, 2 kg max stable payload, 3.84 m/s max speed, 30–120 min runtime ([OriginOfBots](https://www.originofbots.com/robot-dog/mini-cheetah-by-mit-robot-dog-specifications)).
- Stanford Pupper: Low-cost, open snap-fit frame, servo-driven (specs to be detailed as needed from [Stanford Pupper design page](https://pupper.readthedocs.io/en/latest/reference/design.html)).

---

**End DRD v0.1-draft-2**

*Each requirement above will be reviewed and updated as actual simulation and test results are available. All numbers labeled as inferred/guessed/simulated will be replaced with concrete data as it arrives. This file is versioned per process rules.*
