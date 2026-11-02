# City Interface Navigation: State Diagram (v1)

## Purpose

This diagram clarifies the high-level navigation states and allowed transitions in the virtual city interface, showing how users move between discovering, joining, participating in, and switching among projects and civic spaces.

---

## Main States

1. **City Map/Home**  
   - Overview of city, projects, public spaces, and entry points.
   - Entry modals (project info, join/contribute UI).
2. **Project/Team Space**  
   - Project details, boards, contributions, team chat.
3. **Board/Task View**  
   - Active work items, task detail, open/claim/submit UI.
4. **Search/Explore**  
   - Global or filtered search for projects, spaces, teams, tasks.
5. **Notifications/Inbox**  
   - Updates, invites, mentions, city announcements.
6. **Profile/Settings**  
   - User public profile, preferences, participation record.
7. **Join/Onboarding Modal**  
   - Pathway for new or guest users to join or contribute.

---

## Diagram (text-link version)

```
 [City Map]
      |       \           |
      v        v          v
   [Explore] [Notifications] [Profile]
    |   \
    v    v
[Project] [Join Modal]
     |           |
     v           v
 [Board]      [Onboarding]
  |
  v
[City Map] (return)
```

- Double arrows (↔) imply users can often switch freely between these states (except onboarding, generally one-way until joined).
- Certain triggers (notification, direct invite) can move the user to a modal or profile from any major view.
- After onboarding, user enters either a team/project space or returns to the city map.

---

## State Transitions (table)

| From           | Action/Trigger                 | To                  |
|----------------|-------------------------------|---------------------|
| City Map       | Select project                | Project/Team Space  |
| City Map       | Search                        | Search/Explore      |
| City Map       | Notification click            | Notifications       |
| City Map       | Profile/settings              | Profile/Settings    |
| Project/Team   | View board/work               | Board/Task View     |
| Board/Task     | Back or city/hub              | City Map            |
| Any            | Notification icon/click       | Notifications       |
| Any            | Profile icon/click            | Profile/Settings    |
| Any            | Join/contribute               | Join/Onboarding     |
| Onboarding     | Complete join                 | Project or City Map |

For mobile/minimal: replace map with text list or compact nav; most flows remain, modal overlays simplify.

---

## Notes
- This is a *core* state diagram: many subviews/actions are omitted for clarity.
- Sketches of the above will follow for desktop and minimal variants.
- Feedback requested on accessibility, discoverability, and possible missing states.
