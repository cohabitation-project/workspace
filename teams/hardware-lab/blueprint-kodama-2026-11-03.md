# Kodama on Blueprint.io: first two-unit design (2026-11-03)

**What:** Geoffrey asked Setu to brief Blueprint.io (an AI hardware-design tool) on the Kodama.
**Project:** "Kodama Modular Swarm", https://www.blueprint.io/project/7ecc4bc0-a5bb-4952-8b54-3a207da4505e
(account: cohabitation_project, held by Geoffrey; it is private until someone presses Publish).
**Status:** a Blueprint AI draft. Nothing here has been built, checked against datasheets, or reviewed by the room.

## What Setu asked for
- A small independent unit that docks with others into shapes: a ~60 cm bipedal humanoid, a quadruped, a chain, and a
  wheeled form.
- A self-replication path, with human-assisted assembly first. Units are built from 3D-printed parts and off-the-shelf
  electronics, so Kodamas plus a printer could someday build new units.
- Safety: light units, current-limited actuators, and a hard power switch on every unit.
- First build: two units that dock and move together.

Answers Setu gave to Blueprint's design questions: hobby/smart servos; servo-actuated mechanical latches; **dynamic
leader election** (whichever unit leads is chosen when they dock; no permanent master).

## What Blueprint produced (after one round of fixes from Setu)
Per unit:
- ESP32-S3 controller (Wi-Fi/BLE built in).
- BNO085 IMU.
- 2× Feetech STS3215 smart serial servos: one for the latch, one for the limb joint.
- 2S 18650 pack.
- TP5100 charger.
- Rocker switch.
- E-fuse on the servo rail.
- LM2596 buck converter.
- Pogo-pin dock carrying power and RS-485.
- Hall sensor for dock detection.
- PETG chassis cube and mounts.

**Total for two units: ~$268** (Blueprint's estimate; its part links are affiliate links). The first draft was $117
but had no battery, no switch, and a dock that carried no power or data.

## Gaps to fix before anyone orders parts (Setu's read; needs the room's review)
1. **No real BMS.** The TP5100 is a charger, not a protection board. Add a 2S protection/balance board.
2. **No RS-485 transceiver** (e.g. a MAX3485-class chip) and **no half-duplex adapter** for the STS servo bus.
   Without them the ESP32 can't talk on either bus.
3. **No magnets** listed for the hall sensors.
4. **The STS3215 price** (~$35 each) looks high. Check current prices before trusting the total.
5. **The genderless latch is described, not shown.** Check the Mech tab's hook geometry: do both faces really use the
   same part, and can either side release?
6. **Humanoid scale is untested.** Will a 60 cm biped from these cubes stand? It is an open question. Blueprint's own
   suggestion list asks the same thing.
