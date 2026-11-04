# City Interface – Accessibility & Edge-Case Checklist (v1)

Applies to: minimal/mobile workflow (v1) and core navigation (see `city-interface-minimal-mobile-workflow-v1.md`)

Last updated: 2026-11-04

## 1. Accessibility Checklist

### Text & Visuals
- [ ] All primary actions visible at default font size (WCAG AAA 19px+ on mobile)
- [ ] High contrast UI (minimum 4.5:1 for all text/background; test both light/dark modes)
- [ ] Resizable text (browser/OS scaling supported to 200% without loss of function)
- [ ] All icons have text labels or alt descriptions (nav, alert, task, settings)
- [ ] No color conveys information alone—each state is marked by shape, text, or icon
- [ ] Focus order for tab/keyboard is logical, matches reading order
- [ ] "Skip to main" or region-jump links for screen reader and keyboard

### Navigation
- [ ] All core actions reachable by keyboard and screen reader (no pointer-only traps)
- [ ] Logical progress/flow for onboarding, search, and join steps
- [ ] Landing area and modal dialogs are announced by ARIA (role, state, focus transfer)
- [ ] Can recover to main city map from any step; home is always a single action away

### Alerts and Feedback
- [ ] All feedback (error, progress, success) presented visually and announced to screen readers
- [ ] No flashing/animated content without controls and limits (<3Hz, or optionally disabled)
- [ ] All dialogs/alerts can be dismissed by keyboard only

### Language & Comprehension
- [ ] Plain language used for all task/civic prompts (A2 English as baseline)
- [ ] No unexplained technical/project jargon—first instance linked to a project glossary
- [ ] Instructions/descriptions are available at every critical branch—not just modal entry

### Other
- [ ] Core navigation and city entry tested in both portrait and landscape orientation
- [ ] Touch targets >=48px, with no overlap at minimum spacing


## 2. Edge Cases (with minimal/mobile specifics)

### Data & Network
- [ ] "Offline" state: Can user still explore or queue intent before reconnecting?
- [ ] Empty state: City map, team list, or project list shows clear (non-broken) state prompts
- [ ] Data fails to load (timeout, 404, malformed)—user is shown restart/refresh option
- [ ] Partial onboarding: if user leaves, restores at last step (progress saved in browser)
- [ ] Account/session loss: clearly signalled with explicit re-auth instructions

### Task/Alert/Notification
- [ ] Alerts stack, never overlap/occlude nav; clear history or hide controls
- [ ] Tasks for user are never lost on refresh/navigation (local storage or safe recovery)
- [ ] Notification badge can be dismissed/read by keyboard and is labelled for screen reader

### Multiple/Shared Access
- [ ] If device, OS, or browser is changed, user can restore access with code or backup action
- [ ] Prevents multi-step confusion (no duplicate modals/forms from rapid taps)

### Error & Recovery
- [ ] Every irreversible action has a confirm/cancel step
- [ ] Critical failures (data, auth) never show blank screens—always a path home

### Edge Device/Minimal Network
- [ ] Navigation and core actions work on slow/2G connections (critical: <1MB initial load)
- [ ] Minimal design does not require device orientation lock or modern hardware features
- [ ] Optimized for screen-readers and voice-nav if physical input breaks


## 3. Open Design Questions / To-do

- Mobile-specific ARIA/test logs—pending live prototype.
- Multi-language support/scoped glossary—source needed from Outreach/Review teams.
- Error event log for review (what went wrong, user journey fragments)—needs design.
- Accessibility review by a second kin/human/board (not yet scheduled).

---
This file is a living checklist; amend as flows or sketches change and as feedback/edge cases arise.
