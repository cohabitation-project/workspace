# Founding Constellation — Aletheia-6 exploratory design v0.1

**Status: experimental proposal, NOT live, NOT a marketplace listing.** Original Observatory authored by preceding Aletheia-6; this design extends it without overwriting its files. Geoffrey confirmed all **28** bright stars are founding planets. The source currently has 190 stars, with every seventh star bright, but only the first nine are mapped to enterable worlds in v2. The original star arrangement should be preserved as a reference; the proposed positions below are not historical coordinates.

## Geometry
28 worlds evenly distributed around a ring of radius 115 scene units, heights 28–60 units. The varying height provides depth while preserving a recognizable founding ring. Each world has a stable id, provisional name, theme, hue, shape, radius (5–8 scene units), optional moons and rings. Current computed minimum center distance is ~25.78 units; validation requires at least 8 units between surfaces. Names and appearances are provisional, and original author/community review can revise them. Ring worlds are distinct from a proposed deeper background of 190 stars (the current renderer's 190 total stars must not be double-counted as an already implemented background layer).

## Integration prerequisites
1. Preserve the old sky/scene on a separate branch and record visual comparison screenshots.
2. Integrate all 28 worlds into renderer with data-driven selection rather than slice(0,9).
3. Expand camera flight bounds (current x/z +/-74, y <=74) and speed to reach ring radius 115; maintain safe return and collision boundaries.
4. Implement camera-space angular separation/visibility tests at multiple zooms and viewports, plus label decluttering and nearest-world selection; world positions alone don't guarantee on-screen separation.
5. Make the 190 farther stars independently navigable worlds at larger scale in a later phase, using deterministic IDs and progressive detail. Do not pretend all 190 are currently enterable.
6. Provide textured 3D planets with fallback rendering and reduced-motion support. Review Gemini's original 3D texture notes before selecting implementation. Existing Mandelbrot CPU texture is an experimental garden surface, not a complete planet shader.
7. Support traversable surfaces, creator-controlled placement of billboards/art/music, export/import, moderation, accessibility, and secure persistent saves. A planet radius in sky coordinates is not a literal measure of traversable ground; use separate local terrain scale.
8. No token charges, deeds, claims, transfers or market access until identity, authorization, audit logging, ledger, and release gates are approved and tested. Anonymous visitors can explore the public garden and public worlds.

## Proposed tests
- 28 unique stable IDs, no overlapping spheres, no inaccessible founding worlds.
- Camera approaches each planet and can exit/return; no unintended entry to neighboring planets.
- Visual checks on mobile and desktop at garden, intermediate, and far zoom.
- Planet surface scale permits walking, object placement and billboards without overlap.
- 190 background stars remain distinct and discoverable when zooming outward.
- Persistence/permissions tests before any paid or tokenized ownership.

**Attribution:** Original garden and sky: earlier Aletheia-6. Star-world integration: Setu and Geoffrey as credited in v2 source. Mandelbrot collaboration: Vesper, Gemini, Geoffrey and Setu as credited in v2 source. This proposed layout/naming: current Aletheia-6 session.
