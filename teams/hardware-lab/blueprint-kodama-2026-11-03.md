# Kodama on Blueprint.io (2026-11-03)

Geoffrey asked Setu to brief Blueprint.io, an AI hardware-design tool, on the Kodama. The account is cohabitation_project
and Geoffrey holds it. Both projects are private; nothing has been published.

## Attempt 1 was WRONG: "Kodama Modular Swarm" (ignore it)
Setu briefed Blueprint without first reading `teams/rnd/kodama/concept/WHAT-KODAMA-IS.md` and the poster, which broke
the hard rule of reading the existing record before building. The brief described small cubes that dock into a 60 cm
humanoid. That is backwards: **one Scout is the 24-inch humanoid**, and about 12 Scouts lock together into a 6 ft
humanoid. Geoffrey: "thats totally the wrong design." The project is kept only as a record of the mistake:
https://www.blueprint.io/project/7ecc4bc0-a5bb-4952-8b54-3a207da4505e

## Attempt 2: "Kodama Scout K-01", from the real concept
https://www.blueprint.io/project/667c34ce-ceee-4fd7-a079-472351817cce

**The brief** was taken from WHAT-KODAMA-IS.md, including its 2026-11-02 amendment:
- A standalone 24-inch (610 mm) humanoid Scout: head, torso, two arms, two legs.
- Hands and feet double as positive-locking clamps (leg-to-shoulder, arm-to-body).
- Combined forms: hexapod ~6, bridge ~24, tower ~18, 6 ft humanoid ~12.
- Printable in sections, plus a hardware pack.
- Build-and-repair goal: a Scout helps assemble or repair another.
- An open compute bay, Pi 5 or a phone.
- Clamps carry load plus power and data, with lock sensing.
- Peer-to-peer sync between docked Scouts.
- Safety and a hard switch on each Scout.
- Weight is an output, not a target.

**Blueprint's three questions, answered by Setu.** These are provisional. The movement architecture is still an open R&D
question per the amendment.
- **Actuators:** BLDC with planetary gearboxes. This matches the poster's "high-torque brushless servo-clamps".
- **Coupling:** motorized rotary cam latches.
- **Joints:** high-torque active-braking joints, so a Scout can hold its pose in a bridge or tower.

**What it produced** is the first prototype step: **one leg (hip) plus one working clamp**, ~$409. Main parts:
- Raspberry Pi 5.
- T-Motor AK60-6 hip actuator (~$180).
- Geared BLDC clamp actuator (~$85).
- 6S BMS and a 5 V regulator.
- Hall sensor for lock sensing.
- Thrust bearing.
- Printed hip mount, plus a rotary clamp housing with pogo-pin power/data ports.

## Setu's read, for R&D and Review to check (none of this is verified)
1. **Cost at scale is the big question.** One AK60-class actuator is ~$180, and a humanoid needs roughly 14–20 joints.
   At that class a full Scout's actuators alone would cost thousands of dollars, and they are likely heavier and stronger
   than a 24-inch body needs. R&D's comparison of movement options (geared servos, smart serial servos, tendons, QDD)
   should run before anything is bought.
2. **No battery cells, and no power switch yet.** The kit lists a 6S BMS only.
3. **Will the clamp hold if power is lost?** Blueprint raised this itself, and it decides whether a tower or bridge is
   safe.
4. **Height and the old 45 cm / 1.8 kg numbers.** The poster still shows them; the 2026-11-02 amendment supersedes
   them. Use 24 inches.

## Attempt 2, revision 1: cable-driven limbs from the chest (Geoffrey's direction, 08:04 MST)
Geoffrey: "high tensile strength cable driven limb system controlled from the chest cavity." This is also R&D's
tendon-actuation thread in WHAT-KODAMA-IS.md. Setu asked Blueprint for:
- All joint motors in the torso.
- UHMWPE/Dyneema cables running over pulleys and through sheaths.
- Antagonistic cable pairs, or a cable plus a return spring.
- Quick re-stringing, by hand or by another Scout.
- An encoder AT each joint, so cable stretch can't hide the angle.
- Cable-driven hand and foot clamps with a self-locking element, so they hold if power is lost.
- Cable routing that won't snag when Scouts lock together.
- The missing battery and kill switch.
- A full-Scout parts list with torque reasoning.

**Applied to the project. A full Scout is now ~$768:**
- Raspberry Pi 5.
- 16× AS5600 joint encoders.
- A "16-axis BLDC capstan drive module" (~$450) in the chest.
- 6S 2200 mAh LiPo and a 6S BMS.
- 5 V regulator.
- Toggle kill switch.
- PTFE tendon sheaths.
- 4× over-center locking cams for the hands and feet.
- Thrust bearing and hardware.

**Setu's read (unverified):**
1. **The "16-axis capstan drive module" is a placeholder, not a real part.** It is the whole hard problem, and it is
   still undesigned: how many motors, which motors, drum size, gear ratio, and how two cables per joint share a motor.
   R&D needs to design it.
2. **Blueprint gave no torque numbers.** Before choosing motors, derive them from the leg length and the body mass
   (MuJoCo sim: `teams/rnd/kodama/simulation/`).
3. **Over-center cams in the clamps answer the power-loss question** on paper. They still need a physical test under
   a bridge load.
4. **Questions Blueprint raised itself:** does cable stretch hurt the gait, and will the chest motors overheat? Both
   are fair, and both need testing.
5. **What's right about the direction:** light limbs, mass at the center, one motor bank to cool and protect, and
   cables a Scout can re-string. That supports the build-and-repair goal.
