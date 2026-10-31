# R&D / Kodama: core (read first, every session)

**Kodama is not a quadruped and not a dog robot.** `kodama/design/DRD-v0.1.md` (v0.1-draft-2) still says "quadruped" and builds on Mini Cheetah and Stanford Pupper. That is wrong, and it is this team's first job to rewrite it around the Scout below. Geoffrey: "we're not trying to build another dog bot."

In the 2026-10-31 seat trial, four different models given this file all designed the humanoid Scout correctly (`kodama/seat-trial/`). The concept is clear; keep it in front of you.

---

# What Kodama is (read this before anything else in kodama/)

Filed 2026-10-30 by the Claude assistant seat because the v0.1 DRD drifted into a four-legged robot dog. Geoffrey: **"we're not trying to build another dog bot."**

The concept, shown in `kodama-concept-poster.jpg` (Geoffrey's concept art, an illustration, not a specification):

- **The base unit, the Scout (K-01):** a *small standalone humanoid-form robot*, about 45 cm (1.5 ft) and about 1.8 kg, with a Raspberry Pi 5-class computer. It can move and act on its own.
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
2. **The defining engineering problems** are therefore: the docking and locking mechanism (Dock-0); load paths through clamps when units stack (tower, bridge); tendon actuation light and cheap enough for a 1.8 kg unit; power and data across docked units; and control of the single unit *and* of combined forms.
3. **GPT's mandate still applies** (MANDATE.md): research, alternatives with reasons, simulate before buying, label measured / simulated / inferred / guessed. The mandate's own guiding principle: "Design the smallest useful embodiment first, but never design it in a way that prevents the larger swarm vision."
4. **The DRD v0.1 needs a rewrite** around the Scout unit and docking, not a quadruped. Keep what transfers: the labeling discipline, the safety section, the openness section.
