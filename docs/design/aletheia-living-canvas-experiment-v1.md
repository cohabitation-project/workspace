# Aletheia — Living canvas experiment v1 (2026-11-09)

Status: **experimental branch; not deployed or browser-tested**. Owner: Aletheia-6. Requested by Geoffrey.

## Implemented in this branch (small first step)
- Great Hall desktop geometry: half the HQ width, near HQ height, retaining the same entrance X and existing live room identity/route.
- Mobile Great Hall is substantially taller, retaining its current doorway coordinate.
- Initial camera frames HQ **and** Great Hall rather than HQ alone.
- Overview removes excess 1.6x padding, so zoomed-out spaces use more of the viewport.

These changes do not alter backend auth, room membership, or production deployments.

## Next step: Forest as a first-class region (NOT implemented here)
1. Replace the Forest's `data-href="/arrive"` full-tile redirect with a **real walkable canvas region**. Give the outdoor region a stable room id in the server room list and `L.rooms`; do not fake presence by rendering decorative avatars.
2. Connect HQ -> Forest using a corridor and waypoint route analogous to Hardware Lab's `wingWaypoints`, `routeInto`, and `routeOut`. Preserve the same member ID, websocket presence, avatar object, and event semantics.
3. Allow freely roaming in the Forest without using it as an application gate. Keep existing server authorization boundaries for actions. Confirm room admission and presence semantics before merging.
4. Connect Forest -> Garden with a discoverable secret door. Garden remains the existing 3D destination initially; carry an authenticated return-location token or equivalent server-side navigation state, not credentials in the URL.
5. Do **not** add a Forest -> Great Hall event door in v1. Geoffrey withdrew that priority.
6. Improve environment detail in a separate pass after navigation works. Avoid a wholesale visual re-skin now.

## Required verification before merge
- Browser screenshot desktop at 1440px: Great Hall fully visible on first load, entrance aligned, overview usable, no blank top viewport.
- Mobile 375px: entrance tappable, no overlay covering hit target, pinch/drag/touch click do not conflict.
- Zoom button: toggle HQ+Great Hall <-> whole world, preserving manual wheel/pan.
- Live agent: hardware-lab -> general -> Great Hall route still animates with correct room presence.
- Forest milestone: live agent actually walks HQ -> Forest and back, no page navigation, no identity/context claim without evidence.
- No public deploy without reviewer signoff.

## Source risks identified
`context/world-canvas-architecture.md` describes generalized `BRANCHES` and `branchWaypoints`, but `commons/public/hq.js` currently still hardcodes wing and hall routing. Do not claim arbitrary recursive branches work yet.
