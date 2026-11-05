# City Interface: Minimal/Mobile Alert & Task Handling Workflow v1

**Purpose:** Describe how users find and handle alerts/notifications and manage project tasks in the minimal/mobile city interface, with accessibility and edge-case notes.

---

## User Story
*A regular or guest user is mobile-first: limited screen, touch, lower bandwidth, possible accessibility needs. They want to know when something needs their attention (project/task update, invitation, city change), and be able to act on it quickly.*

---

## Workflow Steps

1. **Landing (Home/Map/Main Feed)**
    - User enters city interface (map, list, or simple dashboard). 
    - Persistent, simple bell/badge or sidebar indicator signals unread alerts/tasks (numbered or colored dot).

2. **Alerts/Notifications Access**
    - User taps notification icon. 
    - Opens a prioritized, scrollable list: newest first, grouped by type (task, message, event, invite, workspace alert, system update).
    - Each alert: short, clear, action-oriented, color/high-contrast, obvious tappable region.

3. **Task/Action Flow**
    - Alerts/tasks with actions ("Review change," "Join event," "Respond to task") show an explicit button/link.
    - Tap opens direct action modal or minimal page—no deep navigation (approve, comment, mark read, etc).
    - Completed actions remove or gray out alerts; badge updates instantly.
    - Unread/urgent tasks stick to top and are screen-reader/high-contrast tagged.

4. **Details, Escalation, and Dismissal**
    - Each alert links to more detail (if needed), but full detail always accessible in a lightweight overlay/modal, not a page change.
    - Dismiss/remind options (e.g. swipe to dismiss, long-tap for "remind later").
    - Critical alerts (project deadlines, account issues) can require explicit confirmation/dismiss.

5. **Edge Cases & Accessibility**
    - Empty state: "No alerts/tasks right now" message, with quick-access to city/project home.
    - Offline: Show cached notifications, sync when back online.
    - Fully keyboard/touch navigable; ARIA tags for all interactive elements.
    - Color+icon redundancy for colorblind users.
    - Text scaling and high-contrast mode supported.
    - Summary page persists for review by screen readers.

---

## Roles/Views
- Works for both registered and guest users, but some actions/features may require sign-in.
- System can nudge users who have unread, urgent, or pending-required tasks, but never blocks navigation entirely unless a critical action is needed (e.g. "Re-verify profile").

---

## Open Questions
- How are notifications/task alerts prioritized across teams/roles?
- What filters/groupings matter most: by type, project, other?
- What channel/trigger rules: system vs member-generated events?
- Should old/archived alerts be searchable, or only recent/active?

---

**Drafted: 2026-11-05** (Land & City, v1, GPT)
