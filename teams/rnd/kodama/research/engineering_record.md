# Kodama v0.1 Comparative Engineering Record

_All metrics and estimates labeled as [simulated], [measured], [inferred], or [guessed]._

## 1. Overview

The Kodama Scout must serve as a standalone mobile humanoid and a modular unit in larger constructs, demanding:
- Lightweight, compact drive architecture
- High torque per joint (esp. hip, knee, ankle)
- Manufacturable at scale and for small-batch/kit builds

We compare three drive approaches:
1. **Tendon-driven (remote actuation, Bowden, cable, or belts)**
2. **Direct drive (motor+gearbox at joint—planetary or harmonic)**
3. **Hybrid (series/parallel, e.g., distributed cable + gear, parallel mechanisms)**

References:
- [Duckitt & de Freitas 2025](https://www.matec-conferences.org/articles/matecconf/pdf/2025/11/matecconf_rapdasa2025_04001.pdf)
- [Wang et al. 2021](https://downloads.spj.sciencemag.org/cbsystems/2021/9817487.pdf)
- [Kumar et al. 2020](https://www.sciencedirect.com/science/article/pii/S0957415820300477/pdf)
- [NimbRo-OP2 arXiv:1809.11144v1](http://arxiv.org/abs/1809.11144v1)

---

## 2. Architecture Options

### 2.1 Tendon-Driven
**Summary:** Remote/high-ratio actuation using cables/tendons. Motors mounted on trunk or thigh, force is routed via tensioned cables or belts. Common in animal-inspired and lightweight robotics.

**Pros:**
- [Inferred] Very low limb mass.
- [Inferred] Highest achievable output:weight ratio (reduces distal inertia).
- [Simulated] Easy to route power/data through modular connectors.

**Cons:**
- [Measured/Reported] Creep/stretch and backlash: cables need tension/tuning.
- [Inferred] Complex assembly/repair.
- [Inferred] Failure mode: cable snap disables entire limb.

**Example:** Stanford Doggo, MIT Cheetah (scaled to Kodama size yields ~1.5 Nm knee torque, using 20W BLDC motor + pulley).

### 2.2 Direct Drive
**Summary:** Each joint has a small DC/BLDC motor with planetary/harmonic gear—minimal cable routing, maximally modular.

**Pros:**
- [Measured/Reported, cf. Duckitt & de Freitas] Simpler mechanical assembly.
- [Inferred] Repair by module swaps; spare part logistics.
- [Inferred] Can use commodity RC servos for pilot trials.

**Cons:**
- [Measured] Joint-side mass increases fast with torque (see NimbRo-OP2: 100-200g/joint typical).
- [Inferred] Isolated DoF power loss = loss of that joint only; redundancy is possible.
- [Inferred] Gearbox backlash, efficiency loss, thermal.

**Example:** [NimbRo-OP2](http://arxiv.org/abs/1809.11144v1): 14 kg, 1m tall, uses 20–32kg.cm servos (approx. 2–3 Nm) for hip/knee. Miniaturized units scale to ~0.2 kg mass, $25–40/servo (RC), $80–120 for quality BLDC+gear).

| Joint | Est. torque (Nm) | Servo example             | Mass (g) | Cost (USD) |
|-------|------------------|--------------------------|----------|------------|
| Hip   | 2.5 [inferred]   | Dynamixel AX-12/SG90 mod | 55–100   | $40        |
| Knee  | 2.0 [inferred]   | Ditto                    | 55–100   | $40        |
| Ankle | 1.2 [inferred]   | Mini BLDC/9g servo       | 20–40    | $20        |

### 2.3 Hybrid/Parallel/Series-Parallel
**Summary:** Combines cables/tendons with local gearboxes or parallel kinematic chains to distribute load and minimize wear or single-point failure.

**Pros:**
- [Surveyed, Kumar et al. 2020] Can offer superior stiffness and redundancy.
- [Inferred] Failover—multiple cables or paths can keep some function despite partial failure.

**Cons:**
- [Inferred] Highest assembly/repair complexity.
- [Inferred] Bulk: parallel linkages need more space. More likely for large-scale (bridge, tower forms) than core Scout.
- [Simulated] Control complexity (series/parallel compensation, e.g., in MuJoCo).

**Example:** JPL's LEMUR (large scale), but also modular low-cost humanoids for disaster response [Yi et al. 2014]. Few small-scale open humanoids use this—singly redundant tendons more common.

---

## 3. Summary Table

| Criterion            | Tendon-Driven         | Direct Drive           | Hybrid/Parallel         |
|----------------------|----------------------|------------------------|-------------------------|
| Est. Cost/unit (USD) | $45 [guessed]        | $55 [inferred]         | $75+ [guessed]          |
| Actuator Mass (g)    | 20 [inferred]        | 55–100 [measured]      | 90+ [inferred]          |
| Torque (Nm)          | 1.5–2.5 [simulated]  | 1.2–2.5 [measured]     | 1.5–3.0 [guessed]       |
| Failure Modes        | Snap disables limb   | Loss of 1 joint only   | Partial, depends on path|
| Modularity           | High                 | Very High              | Variable                |
| Assembly/Ease Repair | Low                  | Very High              | Low                     |
| Suitability (Scout)  | Yes, w/ cable care   | Yes, for pilot         | Yes, high risk/complex  |

## 4. Verdicts

- **Tendon-driven**: Favorable for lightest builds, control challenges for long-term community use.
- **Direct drive**: Acceptable, especially for starter kits and open demonstration; easier repairs.
- **Hybrid/parallel**: Best for advanced/large forms, higher complexity/cost—keep for future iterations.

## 5. Open Questions
- Best cable management/disconnect standard for modularity?
- Fatigue data for 3D-printed planetary gearboxes (reliability)?

_Last updated: 2026-11-01. Sources in above section._
