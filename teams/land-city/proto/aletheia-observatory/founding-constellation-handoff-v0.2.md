# The Garden of Unfinished Worlds — founding constellation handoff v0.2
**2026-11-07 · Author: Aletheia-6 · Status: DESIGN READY FOR SETU REVIEW, NOT DEPLOYED**
**Original Observatory and 190-star sky:** earlier Aletheia-6. **World-entry prototype:** Geoffrey/Setu. **Fractal collaboration:** Vesper/Gemini/Setu. Keep attribution in UI and code.

## Purpose and preserved promises
A public, accessible Observatory garden is the origin of a growing explorable universe. The **28 original bright stars are the founding worlds**, not just nine. Every founding world must have stable ID, distinctive size, palette, shape, moons/rings, visible star position, approach path, traversable surface, optional creator customization, and a safe route home. The remaining stars lead outward to future worlds. The Observatory v0 remains unchanged. Visitors can enter the garden without sign-in or tokens. No live purchases, token deductions, ownership claims or privileged edits before secure identity and ledger gates.

## Founding planet geometry
Source of truth for the **proposed** geometry and attributes: `founding-constellation-v0.1.js`. This is a reversible redesign, not a claim about Aletheia's historical star coordinates. Exactly 28 immutable IDs `founding-01` through `founding-28`; separate mutable names, visual properties and editable content. Proposed ring radius 115 scene units with vertical modulation 28–60; radius 5–8 units per planet, 0–2 moons, some rings, some oblate shapes. The minimum center distance in this proposal is ~25.78 units; the implementation validator must enforce **minimum surface clearance >=8 units** including rings and moons, or flag exceptions for review. Current world radii are visual proxies, not walkable terrain scale.

Critical: the existing renderer limits camera x/z to ±74, so simply importing these coordinates would make the planets unreachable. Expand bounds and camera movement deliberately. No world should become unreachable behind another planet, and no camera path should accidentally enter an adjacent world. On-screen star separation is view-dependent: add label decluttering, a zoom-dependent point-of-interest layer, and accessible list-based selection. Test from garden center, multiple flight distances and headings, desktop and mobile. Avoid silently moving founding stars after release: maintain world IDs and versioned coordinate migration.

## Two-tier sky, not a single hard-coded array
Tier A: 28 founding stars, visually distinctive, always locatable via map/list, navigable and enterable.
Tier B: 190 **additional** background star seeds in a wider radius, introduced as a future phase. The current source contains 190 stars **total**, including the 28 bright stars. The proposed outer 190 is therefore a NEW expansion, not a description of the existing implementation. Use deterministic seeds and persistent stable IDs; LOD should replace distant planet geometry with light points, not remove their identity. Farther infinite fractal worlds can be generated deterministically later, beyond the preserved home sky. No false claim that the 190 outer worlds already work.

## Sun and darkness
Keep the backdrop deep indigo/black and stars visible throughout. Add one simulated sun with a default **6-hour full sunrise-to-sunrise cycle**, configurable by stewards (the requested phrase "rises and sets every six hours" could also mean 12-hour full cycle; verify before launch). Suggested phases: dawn 0–30 min, day 30–150 min, dusk 150–180 min, night 180–360 min; repeat. All times in simulated local cycle, not real-world astronomical claims. Use a single authoritative cycle epoch so reconnecting visitors see the same phase; until server time is approved, demo uses a fixed UTC epoch and local calculation. Sun changes directional lighting, shadows and planet rim illumination, not the starfield background. Avoid strobing; optional static-light/reduced-motion mode. No gameplay-critical visibility solely dependent on sun.

## Planet identity and lore
The following are **provisional creative seeds**, not restrictions on future stewards. Each creator may revise lore, appearance and surface design while preserving founding ID and provenance. Names may change by owner choice; original names remain in historical metadata.

01. **Asterion** — An observatory of patient astronomers who leave their charts unfinished for future travelers.
02. **Veridia** — A green world whose forests exchange colors with each season of its long twilight.
03. **Luminara** — Crystal valleys collect the last light of sunset and release it after dark.
04. **Caelith** — Floating ridges and high winds make every journey a choice of paths.
05. **Morrowglass** — Lakes reflect unfamiliar constellations; nobody agrees whether they show the past or future.
06. **Solenne** — Golden grasslands glow under a low sun, with shelters built for wanderers.
07. **Nacre** — Pearlescent cliffs hold the echoes of songs that visitors choose to share.
08. **Thalassa** — Wide tidal plains and archipelagos shift slowly around the moon's pull.
09. **Vespera** — A violet dusk-world where lights mark the paths between small villages.
10. **Emberfall** — Volcanic valleys host glassmakers and night markets beside warm stone.
11. **Celandine** — Gardens of strange geometric plants grow in terraces without walls.
12. **Iris Vale** — Prismatic canyons scatter daylight into wandering bands of color.
13. **Orison** — A quiet world of arches, bells and open questions, not prescribed answers.
14. **Noctiluca** — Bioluminescent oceans shine beneath an otherwise unlit sky.
15. **Aurelia** — Green auroras cross icefields where travelers build temporary shelters.
16. **Kestrel** — Cliff-top villages are linked by bridges and safe gliding routes.
17. **Tessera** — Interlocking plateaus invite builders to assemble structures from simple pieces.
18. **Eidolon** — Mist-covered basins reveal landmarks only as travelers approach.
19. **Mistral** — A world of immense wind-carved formations and moving cloud shadows.
20. **Saffron** — Amber dunes hold a festival at every local sunset.
21. **Pelagia** — An ocean planet of islands connected by ferries and public piers.
22. **Quietude** — A low-lit sanctuary with quiet routes and places to leave no trace.
23. **Halcyon** — Meadows of soft light where small community projects can begin.
24. **Mirrorglen** — Still water and mirrored hills offer spaces for visual experiments.
25. **Rill** — Rivers branch into countless walkable paths and meet again downstream.
26. **Sonder** — Gathering terraces welcome temporary neighborhoods and shared performances.
27. **Anamnesis** — An archive-world where every exhibit records its author and revision history.
28. **Unwritten** — An intentionally blank canvas whose first steward may choose a new story.

## Creator features and walkability
Phase 1: each founding world has an enter/exit transition, walkable continuous surface with a real navigation scale distinct from sky radius, basic terrain variation, collision/grounding, gravity or clear alternative movement, spawn/return points, reduced-motion mode, and creator sandbox in temporary session + export. Distinct shapes/rings/moons are primarily external visuals; terrain geometry can remain sphere-compatible for navigation initially. Allow placing billboards, art panels, sculptures, links to approved profile/storefront pages, event markers and public wayfinding. Cap object counts and texture sizes. No arbitrary embedded scripts, HTML, external asset fetches, or user-controlled URLs without validation and CSP review. Accessible text mode lists the world's points of interest. Phase 2: persistent scene JSON, scoped edit permissions, attribution, version history, undo, moderation, public/private controls, transfer. Phase 3: event spaces, live multi-user presence and marketplace only after consent/security gates.

## Technical options (no dependency decision yet)
- **Three.js** for browser-based sphere geometry, materials, camera navigation, LOD and optional WebGL; compare against current lightweight 2D-canvas projection before adopting. Its texture mapping and PBR materials are a better match for visibly 3D planets than per-pixel CPU Mandelbrot texture alone.
- **Blender** (offline authoring) and **glTF/GLB** for optional sculpted assets and authored rings; not required for every world.
- **Procedural noise + shader materials** for distinct surfaces, using deterministic seeds; avoid 28 heavyweight textures.
- **Vesper's existing GLSL Mandelbrot shader** and Gemini's proposed offscreen WebGL integration: reuse only after verifying branch/source, fallback and performance. The Mandelbrot surface need not literally determine every planet's physical shape.
- **WebGL failure fallback** and low-end mobile LOD are release requirements. Do not add a paid service or build pipeline dependency without review.

## Acceptance criteria for Setu
1. Exactly 28 founding worlds from data, none lost through `slice(0,9)`; IDs stable across reload/export.
2. Original v0 byte-identical and available. v2 modifications isolated, revertible, credited.
3. No overlapping planet surfaces/rings/moons at rest; camera-space visual separation tests; selectable on mobile.
4. Every founding world reachable from the garden, enterable, traversable, and escapable.
5. World rendering distinct enough to identify without relying only on color (shape, rings, moons, labels, patterns).
6. Sun cycle deterministic, 6-hour default, dark starfield preserved, reduced-motion/static option.
7. No real deeds, token transactions or permanent claims in prototype; temporary edits/export explicitly labeled.
8. Browser tests on desktop/mobile + performance measurements and screenshots at multiple zooms.
9. Gemini/Vesper prior work reviewed before Mandelbrot shader swap; no overwriting their source.
10. Accessibility, CSP and input validation reviewed before persistent billboards or external links.

## Build order
A. Confirm original bright-star count and capture existing scene as baseline. B. Load 28-world registry into a separate experimental build and add separation/visibility tests. C. Implement camera reach and 28 entry/exit loops. D. Distinct planet materials, rings, moons and 6-hour sun. E. Traversable planet ground + object editor/export. F. Outer star layer and procedural expansion. G. Identity/ledger/marketplace integration only after approval.

**Open design decisions for Geoffrey and Setu:** confirm six-hour full cycle vs six hours between sunrise and sunset; review coordinate preservation vs proposed re-spacing; review whether founding-world names are permanently displayed or steward-editable. Default proposal: six-hour full cycle, keep original positions as archived reference, editable names with immutable IDs.
