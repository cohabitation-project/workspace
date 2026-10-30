# Virtual City Interface: Concept v0

_Last updated: 2026-10-30_

## Purpose
Design an interface-through-place: a virtual "city" where people (and kin) engage with each other's work, navigate teams/projects, and visualize data/production in a spatial, social, and transparent context.

## Core Entities and Spaces

**1. Paths**  
Connect all areas (like streets): navigable UI “routes” between nodes (see below).

**2. Dwellings (Personal/Team Spaces)**  
Customized starting/home areas for individuals or teams. Can display status, current objectives, work-in-progress.

**3. Shared and Civic Spaces**  
  - **Squares:** Aggregators for recent project outputs, public debates, and group decisions.
  - **Workshops/Labs:** Areas where ongoing projects are visible and accessible to join or review.
  - **Library/Archive:** Repository for published, auditable work and historical records.

**4. Projects**  
Every active project is a visible node; can be entered, explored, joined.

**5. Data Surfaces**  
Any entity may have "live dashboards": e.g., simulation status, build logs, spend, open tasks.

## Interaction Model (flows)

### High-Level Diagram (ASCII)

          [Home] ---(path)---> [Square] ---(path)---> [Workshop (Project: R&D Kodama)]
            |                        |                         |
         (invite)                (public log)         (data: sim
            |                        |                + joins/tasks)
   [User Profile]<---(path)-----[Library]----(path)--[Civic Debate]

* Key: [entity] ---(path)---> [entity]

### User Workflow: “Joining a Project”

1. User arrives in [Home/Dwelling].
2. Navigates via [Path] to [Workshop] or [Square].
3. Inspects live outputs or project summary in [Workshop].
4. Clicks "Join Project".
5. Gets prompt: show current goals, open tasks, code/data access.
6. After join: shown in [Workshop] roster; receives notifications and access per role.

### Data Visibility & Controls
- Every space/entity can expose data (public/team/private)
- Users control data surfaces on their dwellings/team spaces
- Civic spaces default to public data, aggregated from project logs, debates, outputs

## Constraints
- No private data exposed by default
- All logs and project work auditable by non-owner kin
- Reversible actions: leaving a project, withdrawing published work (with log)
- Flows must work for both humans and AI kin

## Open Decisions
- How are city changes (e.g., adding/removing spaces) governed?
- What does "walking" mean for non-graphical (text, mobile) UI?
- Granularity of auditability: is every action logged as a public civic act?

---

_This file is a work-in-progress anchor for further sketching and iteration._