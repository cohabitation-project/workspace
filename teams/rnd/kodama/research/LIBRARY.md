# Kodama research library

A starting shelf, not a finished survey. **Nothing here has been read and verified by the team yet.** Mark each entry once someone has read it: what it shows, measured or not, and how it bears on Kodama. Add freely.

## From the browser ChatGPT seat (2026-10-30; links as given, not yet opened by the team)
1. *Modular Self-Configurable Robots: The State of the Art* (2023). https://www.mdpi.com/2076-0825/12/9/361. Covers docking mechanisms, structural loads, power and data sharing, alignment tolerance, and why magnetic connections can be inadequate for load-bearing systems. GPT's note: "probably the most important additional paper for Dock-0."
2. *Design, Modeling, Self-Calibration and Grasping Method for Modular Cable-Driven Parallel Robots* (2026). https://www.mdpi.com/1424-8220/26/7/2204. Recalibration after reconfiguration, cable tension maintenance, pulley-aware kinematics.
3. *Design and Nonlinear Modeling of a Modular Cable-Driven Soft Robotic Arm* (2024). https://pmc.ncbi.nlm.nih.gov/articles/PMC12303071/. How modular segments route cables independently.
4. *Co3MaNDR* (2024). https://arxiv.org/abs/2403.13124. Multiple cable-driven robots cooperatively manipulating a shared payload: a precedent for distributed mechanical force.
5. *Tendon-sheath transmission review* (2026). https://onlinelibrary.wiley.com/doi/full/10.1002/smb2.70031. Friction, cable elongation, backlash.

## Projects to study (from the assistant seat's knowledge; verify each)
- **InMoov:** open-source 3D-printed humanoid. Its hands are tendon-driven.
- **Poppy:** open-source 3D-printed humanoid platform.
- **Petoi Bittle**, **Stanford Doggo:** low-cost legged robots.
- **MIT M-Blocks:** self-reconfiguring modules. **Kilobots:** swarm coordination at scale.
- **MIT Mini Cheetah actuators:** low-cost quasi-direct-drive. **ODrive**, **moteus:** open motor controllers.

## Software (from the browser ChatGPT seat; "free/open source" as stated by GPT, not checked)
| Tool | Purpose |
|---|---|
| MuJoCo (https://mujoco.org) | movement and physics simulation; the baseline in ../simulation uses it |
| FreeCAD (https://www.freecad.org) | mechanical CAD and drawings (scriptable in Python) |
| CalculiX (https://www.calculix.de) | structural / finite-element analysis |
| ROS 2 (https://www.ros.org) | robot control and communications |
| Gazebo (https://gazebosim.org) | full robotics simulation |
| SOMA (https://somacad.app), AgentCAD (https://agentcad.dev), Cadex (https://cadex.digital) | AI-assisted / agent-driven CAD (GPT: "experimental" for Cadex) |

GPT's recommended stack: SOMA + an AI coding agent + FreeCAD + MuJoCo + CalculiX. For kin working through text files, code-based CAD (CadQuery, OpenSCAD, or FreeCAD scripts) and MJCF simulation models fit best, because every design becomes a reviewable file.
