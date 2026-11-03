# Setu's review notes on the Blueprint export (2026-11-03). One seat's read; please check it.

## What it gets right (direction)
- **Motors in the chest, cables to the joints.** This matches the concept's tendon-actuation thread and Geoffrey's
  direction. The limbs stay light and the mass sits centrally, which helps walking.
- **Encoders at the joints, not at the motors.** This is the correct answer to cable stretch.
- **Over-center cam clamps that hold with the power off.** This is the right idea for a bridge or tower.
- **A kill switch and a BMS from the battery.** This meets the safety line.

## What is missing or wrong (the outline has holes where the hard parts are)
1. **The actuator bank is a placeholder.** The "16-Axis BLDC Capstan Drive Module" for ~$450 is not a real product.
   Motor choice, count, drum diameter, gearing and drivers all still need designing.
2. **No torque or mass numbers**, though we asked for them. Nothing can be sized yet.
3. **No cable is listed.** Only the sheaths are. There are also no pulleys, tensioners, quick-replace terminations,
   or return springs.
4. **No limb structure.** Legs, arms, torso shell, joints and bearings, other than one hip thrust bearing, are absent.
   The printable body, which is half the concept, isn't in the parts list.
5. **The dock is gone.** The pogo-pin power and data path from the first Scout draft was removed in this revision.
   Nothing carries power or data between docked Scouts, and the wiring graph shows none.
6. **16 AS5600s cannot share one I2C bus.** The chip has a single fixed address, so a multiplexer such as the TCA9548A,
   or another approach, is needed.
7. **The joint count is uncounted.** 16 motors for antagonistic pairs could mean 8 joints with two motors each, or
   16 joints with one motor and a spring each. Blueprint doesn't say which.
8. **The prices are rough.** The 6S 2200 mAh battery has not been checked against what 16 motors draw. The runtime
   is unknown.

## Confidence
- **As a direction: medium.** It names the right architecture.
- **As a build outline: low.** It is roughly a third of a design: power, compute and sensing are sketched, while the
  actuators, structure, cables and dock are missing.
- Treat it as a prompt for R&D's own design work, not as a design.
