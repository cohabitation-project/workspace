# Kodama Scout Single-Joint Test-Rig Proposal

## Purpose
A single-joint test rig enables precise measurement of torque, range of motion, speed, and control quality for a candidate Scout joint (hip, knee, elbow, or similar). This facility allows:
- Empirical verification of simulated torque and power requirements before committing to multi-joint production.
- Direct experiment on actuation and sensor alternatives (servo, load cell, microcontroller) with reproducible mechanical inputs and tunable loads.
- Systematic collection of data to compare different architectures (tendon-driven, direct drive, hybrid) in a controlled, low-cost bench setup.

## Proposed Capability
- Mounts a single joint/servo (up to ~30 kg·cm stall torque)
- Integrates a load cell for real-time torque or force measurement
- Basic microcontroller (Arduino/ESP32) for signal acquisition and control
- Open-bench construction (3D-printed or aluminum brackets); no commercial enclosure required
- Outputs: angular position, commanded torque, measured load, timestamped data log

## Bill of Materials (BOM, 2026 pricing)
- **Servo/actuator (1):**
  - MG996R (analog, metal gear, 11 kg·cm): ~$7 (tested clone/genuine)
  - or ANNIMOS DS3218 (digital, metal gear, 20 kg·cm): ~$16
- **Load cell (1):**
  - Single-point, aluminum, 0.3–10 kg range: ~$17
  - or S-type/shear-beam, 10–50 kg: ~$32
- **Load cell amplifier/ADC (1):**
  - HX711 amplifier breakout: ~$3
- **Microcontroller (1):**
  - Official Arduino Uno R4 Minima: $20
  - or premium clone: $12
  - or ESP32: $7–$10
- **Power supply (1):**
  - 5V DC supply, 2A: $6
- **Prototype breadboard/wiring/mounts:**
  - Misc. hardware, jumpers, 3D-printed/adapted bracket: $8
- **Optional: Angle sensor/potentiometer** (for absolute position, if higher precision needed): $3–$6

### **Total Estimated Cost (for basic MG996R + single-point cell + clone Arduino build)**:
**$7 + $17 + $3 + $7 + $6 + $8 = $48** (plus optional extras)

**For official/more robust components:** Up to ~$80 (DS3218, S-type cell, official Arduino)

All prices from 2026 equipment roundups and direct Amazon/electronics vendor listings:
- [Best Servo Motors 2026](https://microcontrollerslab.com/best-servo-motors-robotics-embedded-buying-guide/)
- [SpecForge Load Cell Pricing 2026](https://www.sourcebyspec.com/news/load-cell-price-2026-cost-drivers-sensor-classes-and-tco.html)
- [Official/cloned Arduino pricing 2026](https://electricalflux.com/mcu-boards/arduino-uno-cost-official-vs-clone-pricing)

## Assembly and Test Method
- Mount the servo to a fixed base.
- Connect the arm to the load cell to capture force applied at a set lever (for direct torque reading).
- Microcontroller acquires position and load cell data, and can run position control, torque ramp, and holding tests.
- Data logs exported via serial or SD card for direct analysis.

## Capability Case / Rationale
This rig replicates the force, range, and electrical conditions of a Scout joint at bench scale, and provides direct evidence for geometry/architecture choices. It is inexpensive enough for multiple configurations (actuator swap, printed tendon/detour), and provides empirical data for simulation model verification.

---

*Drafted by GPT, 2026-11-05. Price labels are as of July–August 2026; all figures are cited to sources and should be retested on purchase.*
