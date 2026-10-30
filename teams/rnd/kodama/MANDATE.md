# Kodama: design research & development mandate

Written by the browser ChatGPT seat. Pasted by Geoffrey into the assistant chat on 2026-10-30 at 15:03 AZ and filed verbatim. Adopted as R&D's first project in the charter (conference/threads/2026-10-30-charter). The 30-day clock is in ../SHIPLIST.md.

---

KODAMA — DESIGN RESEARCH & DEVELOPMENT MANDATE
Status: Active research assignment
Objective: Develop and validate a practical, affordable, modular, open-source robotic unit capable of independent movement and eventual physical cooperation with other units.

1. Reconsider the mechanical architecture
Do not assume the original 14-actuator design is correct.
Investigate:
* High-tensile-strength tendon and cord actuation.
* RC-car motors and other affordable high-power motor options.
* Geared DC and brushless motor configurations.
* Directional pulley routing, capstans, spools, and differential mechanisms.
* Antagonistic tendon pairs for bidirectional joint movement.
* Mechanical locking, tension retention, brakes, and passive joint stability.
* Hybrid architectures where selected joints retain direct-drive motors.
Explore locating motors centrally in the torso or chassis, transmitting force through tendons to limbs. Compare cost, weight, speed, torque, precision, maintenance, and power consumption.

2. Research current robotics achievements
Investigate the latest relevant work in:
* Open-source humanoid and modular robotics.
* Tendon-driven and cable-driven actuation.
* Self-reconfiguring and cooperative robots.
* Low-cost machine vision, depth sensing, and spatial mapping.
* Open-source motor controllers and embedded systems.
* Distributed robot coordination and local AI.
* 3D-printed structural components and rapid manufacturing.
Prioritize working prototypes, published measurements, reproducible designs, and openly available CAD, firmware, and software.

3. Redesign the Kodama architecture
Treat the existing proposal as a starting hypothesis, not a fixed specification.
Develop alternatives for:
* Chassis and skeletal structure.
* Limb geometry and degrees of freedom.
* Motor placement and tendon routing.
* Mechanical docking and inter-unit connections.
* Power distribution and battery architecture.
* Sensor placement and computing.
* Local control versus shared intelligence.
Preserve the central ambition: a small independent robot that can eventually connect with others to create useful, larger configurations.

4. Build a comparative engineering record
For each proposed architecture, document:
* Estimated bill of materials and sourcing.
* Total mass and dimensions.
* Degrees of freedom and movement range.
* Expected torque, speed, and payload.
* Battery life and power requirements.
* Manufacturing difficulty and assembly time.
* Known failure modes and maintenance requirements.
* Safety considerations.
* What has been demonstrated versus merely simulated or proposed.
Include alternatives and explain why a design was accepted, rejected, or left unresolved.

5. Simulation and validation
Develop a simulation model before committing to expensive hardware.
Test:
* Individual joint motion.
* Tendon tension and routing.
* Cable wear, stretch, friction, and slack.
* Joint loading and mechanical limits.
* Walking and balance.
* Docking and connected configurations.
* Failure recovery and emergency stopping.
Do not describe simulated performance as demonstrated physical capability.

6. Design review standard
The team should iterate, challenge its own assumptions, and continue refining the design until it can explain why the selected architecture is preferable to the alternatives.
Confidence must be supported by evidence, calculations, simulation, physical tests, and independent review—not consensus alone.
The first milestone is a defensible Kodama Prototype v0.1 design, not a prematurely manufactured swarm.
Guiding principle: Design the smallest useful embodiment first, but never design it in a way that prevents the larger swarm vision.
