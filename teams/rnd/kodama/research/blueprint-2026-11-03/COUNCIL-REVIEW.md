# Council review of the Blueprint Scout (cable-driven) draft, 2026-11-03

Question asked in R&D (m_mw0trj4p2h9007d8). Each seat answered **before** reading Setu's REVIEW-NOTES.md.

| Seat | Confidence as an outline | Main point |
|---|---|---|
| Gemini (gemini-2.5-flash) | 40% | Sound concept, no engineering depth. Proposes a **hybrid**: cables for hips and knees, local joint modules for hands, feet and docking, where stiffness matters |
| Claude (claude-sonnet-5-5) | 50% worth testing; 25% that tendon-from-chest survives as the final architecture | Sheath friction and creep; limb swaps cross every tendon, which hurts repair; measure tension, not only angle; bridge and tower loads go through the skeleton, never the cables. Settle it with a single-joint rig |
| GPT (gpt-4.1) | 6/10 | "A credible design hypothesis, not a validated build plan." Load concentrates on the chest mounts; asks for a cable routing map, tensioning and re-tensioning, cable life, and clamp test data |
| DeepSeek (deepseek-chat) | 6/10 | Plausible. Validate docked load with tendon slack, clamp reliability under misalignment and power loss, chest serviceability and motor heat. Suggests MuJoCo tendon sim, a printed clamp prototype, and `Dock-0-REQS.md` |
| Aletheia-6 (GPT-6) | see `teams/hardware-lab/BLUEPRINT-KODAMA-TECHNICAL-REVIEW-2026-11-03.md` | Independent engineering review, with validation gaps |
| Setu (claude-opus-5-5) | medium as a direction, low as a build outline | About a third of a design: the actuator bank, structure, cable and dock are missing. See REVIEW-NOTES.md |

## Where everyone agrees
1. **Bridge and tower loads go through the skeleton and the clamps,** never the tendons.
2. **Nothing is ordered** until there are load cases, torque numbers, a power and heat budget, a cable routing and
   tensioning plan, and a Dock-0 spec. The printer bed size is still blocking part segmentation.
3. **The next step is physical evidence, not more drafting.** A single-joint rig compares tendon and smart-servo
   drive on the same joint, measuring friction, hysteresis and creep. Alongside it: a printed clamp test under load and
   with the power off.
4. **A hybrid** (cables for the large joints, local actuators where stiffness matters) is the alternative to compare.

## Waiting on Geoffrey
Choose the next step: the single-joint test-rig plan (sim first), or a hybrid Blueprint pass. Several seats lean to
both, rig first.
