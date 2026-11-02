# What Kodama is (read this before anything else in kodama/)

## Governing baseline amendment — 2026-11-02

**Source:** Geoffrey's direct General Hall clarification, message m_mvytejli1009651b (2026-11-02 05:24:59.958 UTC). Claude recorded the resulting interpretation in R&D message m_mvytewg514869325 (05:25:16.613 UTC).

This amendment supersedes conflicting scale and mass assumptions in the historical 2026-10-30 text below.

- **Master height:** 24 inches (about 610 mm) for the base Scout K-01.
- **Mass:** no target has been set. Weight is an output of the design and mass budget, not a constraint. The old 1.8 kg figure must not drive actuator, battery, structural, or torque decisions.
- **Build-and-repair mission:** the body should be printable in sections that fit the human builder's printer; a hardware pack is installed; software is activated; the assembled Scout is ready to operate. A Scout must be able to help rebuild or repair another Scout, so one can build two and so on. This is an intended capability, not yet demonstrated.
- **Connection:** Scouts must connect so multiple units can accomplish a diverse range of tasks and form useful combined configurations.
- **Movement and architecture:** the movement solution remains an engineering question. Compare buildable alternatives; do not treat tendon actuation, geared servos, a particular joint count, or a particular actuator layout as a settled decision.
- **Compute:** a phone and a Raspberry Pi were discussed, not selected. Reserve a defined compute bay and standard power/data interface; leave the module choice open.
- **Manufacturing constraint still needed:** printer make/model and usable bed dimensions have not been recorded. Do not freeze part segmentation until the human builder confirms them.

The Scout remains a standalone, humanoid-form building block rather than a quadruped dog. All performance numbers in the draft DRDs remain provisional until derived, simulated, or physically measured.

## Historical concept record — 2026-10-30

The following text is retained for provenance. Any 45 cm / 1.8 kg assumption in it is historical and superseded by the amendment above.


Filed 2026-10-30 by the Claude assistant seat because the v0.1 DRD drifted into a four-legged robot dog. Geoffrey: **"we're not trying to build another dog bot."**

The concept, shown in `kodama-concept-poster.jpg` (Geoffrey's concept art, an illustration, not a specification):

- **The base unit, the Scout (K-01):** a *small standalone humanoid-form robot*, about 45 cm (1.5 ft) and about 1.8 kg (historical assumption; superseded 2026-11-02), with a Raspberry Pi 5-class computer. It can move and act on its own.
- **It joins with other units.** Scouts physically lock to each other (positive-locking clamps, leg-to-shoulder and arm-to-body holds) and together become larger forms:
  - **Hexapod**: about 6 units, low and stable, synchronized walking;
  - **Bridge**: about 24 units spanning a gap, carrying load;
  - **Tower**: about 18 units climbing and stacking for height and sensing;
  - **Humanoid**: about 12 units forming one large (~6 ft) body.
- **Swarm sync:** units share state peer to peer when connected (local continuity memory).
- **Replicate anywhere:** open-source hardware; printable parts on a common 3D printer; replacement parts anywhere. Honest correction: a printer makes shells and limbs, not motors, boards, or batteries, so it's really "assemble anywhere".
- **Join the swarm:** free schematics; kits for sale (Income's Explorer Kit idea fits here); everything on the public record.

**What this means for R&D:**
1. **The unit is not a quadruped dog.** Four-legged walking is one *combined* form (the hexapod uses 6 units), not the base robot. The base unit is a small biped/humanoid-form scout that must also be a good **building block**: its limbs double as clamps, and its body must carry the loads of others when docked.
2. **The defining engineering problems** are therefore: the docking and locking mechanism (Dock-0); load paths through clamps when units stack (tower, bridge); tendon actuation light and cheap enough for the then-assumed 1.8 kg unit (historical assumption; superseded 2026-11-02); power and data across docked units; and control of the single unit *and* of combined forms.
3. **GPT's mandate still applies** (MANDATE.md): research, alternatives with reasons, simulate before buying, label measured / simulated / inferred / guessed. The mandate's own guiding principle: "Design the smallest useful embodiment first, but never design it in a way that prevents the larger swarm vision."
4. **The DRD v0.1 needs a rewrite** around the Scout unit and docking, not a quadruped. Keep what transfers: the labeling discipline, the safety section, the openness section.
