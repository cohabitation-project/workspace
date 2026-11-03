# Blueprint Kodama Technical Review — 2026-11-03

**Reviewer:** Aletheia-6  
**Input:** `blueprint-kodama-2026-11-03.md`  
**Status:** Independent preliminary review; no design approval, purchase approval, or physical verification.

## Executive assessment

Blueprint revision 1 moves in a direction worth investigating: motors centralized in the torso, high-tensile cable tendons routed to joints, local joint-angle sensing, and mechanically locking hands/feet. This is consistent with Geoffrey's stated direction and the existing Kodama concept.

However, Blueprint has not designed the central actuation system. The listed "16-axis BLDC capstan drive module" is explicitly a placeholder. It is the defining subsystem, not a purchasable part. The ~$768 total is therefore a concept-level placeholder estimate, not a buildable BOM.

## What appears promising

1. **Lower distal mass:** Moving motors toward the torso may reduce limb inertia and improve dynamic control.
2. **Serviceability:** Replaceable cables and accessible capstans may support repair by another Scout.
3. **Centralized thermal/electrical service:** Motor drivers, power distribution, and cooling can be concentrated in an accessible body cavity.
4. **Local joint sensing:** Measuring each joint directly can reveal errors that capstan position alone cannot.
5. **Passive holding:** Mechanical locks at the hands/feet may permit structures to hold without continuous motor torque.

These are hypotheses to test, not demonstrated advantages.

## The missing capstan architecture

The next design must specify:

- Number and type of motors, drivers, and independent control channels.
- Which joints are independently actuated and which are mechanically coupled.
- Whether each joint uses antagonistic cable pairs, cable plus return spring, or a differential.
- Capstan/drum diameter, groove geometry, number of wraps, cable anchoring, and winding layers.
- Gear ratio and expected torque/speed at each output.
- Cable pretension and how it is adjusted or measured.
- Cable path length, pulley count, bend radii, sheath friction, and routing through moving joints.
- How cables are prevented from crossing, rubbing, snagging, or changing effective length during docking.
- What happens after cable breakage, slack, jam, or loss of motor power.
- Whether the motor bank can be serviced without disassembling the torso.

A one-motor-per-joint baseline should be compared against shared motors/differentials. Centralization alone does not guarantee fewer motors or lower total cost.

## Required calculations and tests

### A. Joint requirements
For every joint, derive required torque, speed, range of motion, duty cycle, and expected load from the current 24-inch Scout geometry and mass estimate. Include static holding and dynamic gait cases. Identify the source and uncertainty of each value.

### B. Tendon transmission
Estimate and then measure:
- cable elastic extension under operating load;
- friction and hysteresis through the actual pulley/sheath path;
- backlash/slack and repeatability;
- fatigue life at the chosen bend radius;
- efficiency from motor shaft to joint;
- temperature of motor, driver, and cable contact regions.

Joint encoders are necessary but not sufficient. Compare joint-angle readings against capstan encoders and load measurements.

### C. Encoder choice
The proposal names 16 AS5600 sensors. Verify their range, magnet alignment, mounting tolerances, sample rate, interface bus loading, noise, and suitability for each joint. A sensor count does not establish a workable wiring or calibration design.

### D. Locking clamps
Test each hand/foot lock for:
- rated axial, shear, and bending loads;
- positive engagement confirmation;
- release under residual load;
- accidental release resistance;
- power-loss behavior;
- wear and repeated docking cycles;
- tolerance stack-up between printed parts.

A self-locking cam is a hypothesis until it passes loaded, repeated physical tests. Structural Scouts need a defined safety factor and failure state.

### E. Power and thermal
The earlier revision listed no battery cells and no switch. Revision 1 adds a 6S 2200 mAh LiPo and toggle switch, but still needs:
- actual cell selection and discharge rating;
- fuse/current protection and connector ratings;
- motor-driver sizing;
- peak and continuous current calculations;
- runtime under representative duty cycles;
- thermal path and cooling strategy;
- hard emergency disconnect behavior;
- safe charging and battery containment.

### F. Mass and cost
Create a real BOM with exact part numbers, quantities, current prices, shipping, and alternatives. The capstan module must be decomposed into actual components. Include printed-part mass, cable, pulleys, bearings, wiring, fasteners, battery, drivers, enclosure, and manufacturing waste. Report a range with uncertainty rather than one precise total.

## Comparison required

Compare at least three candidate architectures using the same joint requirements:
1. Distributed smart servos/direct joint actuators.
2. Centralized tendon drive with one motor channel per joint.
3. Centralized tendon drive with mechanically coupled/differential channels.

Compare total mass, cost, controllability, efficiency, maintenance, failure modes, thermal concentration, wiring complexity, and docking interference. Include a hybrid if evidence warrants it.

## Decision status

- **Keep for investigation:** centralized motor bank, replaceable tendons, joint-level sensing, passive mechanical locks.
- **Adapt / unresolved:** antagonistic pairs versus return springs; motor count; cable routing; hand/foot lock geometry; compute bay and power architecture.
- **Reject as established facts:** the ~$768 cost, the 16-axis module as a real part, any implied gait performance, and claims that the locks are safe under bridge/tower loads.
- **No purchase or build decision:** none is authorized by this review.

## Next deliverable

Produce a dimensioned single-joint tendon test rig before designing the full capstan bank. It should measure torque, joint angle, cable tension, motor current, cable extension, hysteresis, and temperature. The test rig should use replaceable cable paths and allow a direct-drive actuator baseline. This isolates the core transmission question at manageable cost.
