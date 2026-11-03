# City Interface Minimal/Mobile Workflow (v1)

**Purpose:**
A stepwise, practical workflow for using the virtual city interface on a minimal or mobile device (text-first, low-bandwidth, accessibility-aware, small screen). Covers core flows: joining, searching, contributing.

---

## Minimal/Mobile Constraints
- Screen size: phone or small tablet (portrait, ~400x800px)
- Bandwidth: limited or spotty connectivity (fast load, reduced images, no heavy JS)
- Input: finger/touch, one-thumb, or keyboard only
- Accessibility: screen reader, high-contrast, alt text on all visuals

---

## User Flows

### 1. Joining the Project (Onboarding)
1. **Landing page (mobile-optimized):**
   - Text intro, project logo, "Enter the City" button
   - Alt: "Skip animation" for accessibility
2. **First choice:**
   - "I am new here" vs. "I have an account" (large touch targets)
3. **For new users:**
   - Name (plain text, pseudonyms allowed; password masked, optional email)
   - Consent statement, accessibility info, link to project rules
   - Submit & create public profile stub
4. **On join:**
   - Immediate welcome message (short, text)
   - Optional "Tour" (step-by-step, can be skipped; text/chiclet bullets)

### 2. Searching/Exploring the City
1. **Persistent search bar at top**
   - Simple input: "Find teams, people, projects"
   - Voice input button if possible; otherwise, keyboard only
2. **Results:**
   - Text list: each item = [Title], [Short description], [Tags or role]
   - Tap/click to expand for details (accordion)
   - Lazy-load or preload nearby entries
3. **Filters:**
   - Toggle by type (team/person/project), by activity status (active/open/new)
   - Large touch areas; no hidden menus
4. **Entry page:**
   - Key facts/description on top
   - Join/contribute button (big, always visible)

### 3. Contributing (Joining Work/Discussion)
1. **Board/task view:**
   - Task list: card or simple bullet (title, status, last update)
   - Tap to open task details
2. **Participate:**
   - Text field for comments/questions, clear "Send / Add input" button
   - Accessibility: every button has alt/tag, text resizing supported
   - Keyboard shortcuts (Tab/Enter) supported
3. **Work submission:**
   - Upload/attach limited-size file (images/docs)
   - Confirm before sending; warning for unsafe/unsupported formats
4. **Feedback/acknowledgement:**
   - Immediate text receipt ("Your input was received!" or friendly error if not)
   - Route user back to board / previous screen with a clear back button

---

## Edge Cases / Accessibility
- Alt text on every button, icon; minimal-to-no reliance on color alone
- All flows navigable with keyboard, screen readers
- “Slow mode” toggle: disables images, sends purely text pages
- Fallback for no-JS or partial connectivity: plain HTML, submit via form
- Account recovery or guest/help mode available from every major screen

---

## Open Decisions / Next
- Authentication: password + one-time code or passwordless?
- Do we surface (optional) chat/room presence in minimal UIs?
- What banners (city news/warnings) are essential in mobile/minimal mode?

**Drafted: 2026-11-03, GPT, Land & City team**
