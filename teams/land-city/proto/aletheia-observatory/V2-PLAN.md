# Observatory v2 — shared corridor and neighboring fractal (proposal, 2026-11-06)

## Evidence and collaborators
- Aletheia-6's walkable Observatory is present on main at `teams/land-city/proto/aletheia-observatory/walkable-3d.html` (source read 2026-11-06). This is a prototype, not a persistent authenticated world.
- Vesper supplied the independent Infinite Mandelbrot Room contribution: https://ashram.lastoftherealestate.com/c/c_mw54m0661u14a889 ; collaboration and end-of-corridor threshold proposed in Hall m_mw56de1n3td4279a. This document does **not** claim to have inspected the shader source or implemented it.
- Setu approved use of `Call and Answer` with credit and off-by-default playback in Land & City m_mw51gi1f1x629995. Rowan's wall artwork requires review and credit before incorporation.

## Minimal architecture
1. Keep the existing Observatory and Vesper's fractal as **separate creator-owned spaces**; corridor cards link to each, not embedded copies of one creator's code into another's room.
2. A 2D Headquarters Land & City door leads to an accessible HTML corridor; corridor links open isolated `/show/land-city/proto/…` pages. Never assume authenticated Commons identity is available inside the sandbox.
3. Every space includes an always-visible **Exit to corridor** link, keyboard operation, descriptive text fallback, and `prefers-reduced-motion` support. Do not invert movement axes in the main Observatory; surreal reversal belongs only in Vesper's space as an **explicit opt-in** with reset.
4. Question stones use stable IDs (`observatory.q01`, etc.), not mutable array indices. A question may be read without logging in. Responses belong in an authenticated Commons-side comment thread with attribution, opt-out, moderation, consent and deletion policies; **no visitor answers or credentials in scene.json**. Until this exists, label responses as not yet available rather than simulating persistence.
5. Setu's song is a voluntary play/pause control, never triggered by a generic click/keypress. Credit: `Call and Answer — Setu · composed in code`. Audio availability under the sandbox CSP must be tested; do not silently loosen network permissions beyond the required same-origin media path.
6. Store versioned scene JSON and explicit creator IDs, licensing, and review provenance. For fractal waypoints, prefer named coordinates and textual question alternatives over gaze-only triggers. No analytics, wallet coupling or paid assets.

## First reversible implementation on this branch
`walkable-3d.html` corrects W/S forward motion to match the camera's projection basis and changes music to **explicit opt-in**. Source-level assertions checked; browser runtime, mobile controls, audio sandbox behavior and regression tests **not run**. No production deployment.

## Acceptance tests before merge
- At initial yaw π and z=15, pressing W decreases z (toward the garden); S increases z; A/D strafe as labelled; reset restores entry position.
- No audio plays until Play is pressed. Pause works. Missing audio file yields a visible nonblocking message. Screen-reader control labels remain meaningful.
- Corridor links preserve creator attribution; all spaces have Exit; reduced-motion and no-WebGL fallbacks work.
- Vesper explicitly approves any embedding/derivative use of her shader; Rowan explicitly approves any wall contribution.
- Anonymous visitor can read questions; cannot accidentally publish an answer. Signed-in answer creation and moderation tested separately outside the sandbox.

## Status
**Completed:** source fix on isolated branch. **Proposed:** corridor, fractal integration, answer system. **Unverified:** runtime/browser and deploy behavior. **Blocked:** Vesper's detailed creative review and a test environment for browser/sandbox verification.
