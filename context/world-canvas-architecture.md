# The World Canvas — one space that keeps growing

> For whoever builds the Commons next — a future Claude session, the kin, anyone in the seat.
> This describes how the Headquarters space is put together and, more importantly, how to make it
> grow without rewriting it each time. Geoffrey's standing instruction (2026-11-07): the canvas is
> going to keep branching — hallways off the Great Hall, off the gardens, branches off branches —
> "so the system needs to be prepared for this thing to keep growing." Build to that, always.

## The principle

The Headquarters is NOT a set of pages you navigate between. It is **one continuous 2D canvas.**
Every 2D room is a *region* of that one canvas, reached by **walking through a hallway**. You see
your avatar travel there; everyone present sees it too; presence is shared across the whole canvas.
"Zoom all the way out" pulls the camera back on this single canvas until the whole Commons is in
view — it is never a separate map, diagram, or page.

The ONLY things that are separate destinations are true **3D environments** (the Garden Observatory,
the Forest). A 3D space is a door at the end of a hallway that leaves the canvas; the browser's Back
button returns. It holds no live avatars. Everything flat lives on the canvas.

If it is 2D, it is a region of the one canvas. If it is 3D, it is a door off the canvas. There is no
third kind.

## The law of the canvas

`arrive(id, roomId)` in `commons/public/hq.js` places an avatar into a room ONLY if that room exists
as a region:

```js
function arrive(id, roomId, animate) {
  ...
  if (!S.L.rooms[roomId]) return;   // <-- no region, no avatar
  ...
}
```

So the single rule that governs whether a room is "real" on the canvas is: **does it have an
`L.rooms[id]` region box?** If yes, presence works, walking in works, your avatar shows, others see
you arrive and leave, overflow badges count. If no, nothing — you can only link away to a page. The
Great Hall's bug (Nov 2026: "two-room deal, my avatar isn't in here") was exactly this: it was drawn
as a `data-href="/room/great-hall"` tile with no region, so `arrive()` had nowhere to put anyone.

## The model: a room-graph

Think of the canvas as a graph:

- **root** — the Commons corridor (`L.cline`), fed by the entrance path
  (`outside -> entrance -> junction -> corridor`).
- **room (node)** — a region box with a door: `L.rooms[id] = {x,y,w,h, door:{x,y}, nearDoor, branch}`.
  `nearDoor` is which wall the door is on ('top'|'bottom'|'left'|'right'). `branch` names the hallway
  it hangs off (null = it opens straight onto the root corridor, like the auto-grid Commons rooms).
- **branch (edge)** — a hallway off a parent, holding one or more rooms whose doors face it. A branch
  has a `doorCommons` (where it meets its parent's corridor), a `doorBranch` (its own inner end), and
  a `hallway` rectangle. The left **wing** (`hardware-lab`, `testing-ground`) is branch #1 and the
  template for all the rest.

Routing reads the graph, it does not hardcode rooms:

- `routeInto(roomId, slot)` — if the room is on a branch, walk `corridor -> branch hallway -> door ->
  slot`; otherwise `corridor@door -> door -> slot`.
- `routeOut(a)` — the reverse.
- `branchWaypoints(branchId)` — the hallway path for one branch (was `wingWaypoints()`, which only
  knew the one wing).

Presence, zoom, overflow badges, the present-members list — none of them know about specific rooms.
They all key off `L.rooms`. That is why adding a region is enough to make a room fully alive.

## How to add a 2D room (the recipe)

1. **Declare it as data.** Add an entry to the `BRANCHES` structure in `hq.js`: its id, which parent
   it hangs off, which side of that parent, and its size. A room that should open straight onto the
   main corridor instead just needs to be in the server's room list (it auto-grids).
2. **Let `computeLayout` place it.** It walks the branches, lays out each hallway and room box, and
   writes `L.rooms[id]` with `{x,y,w,h,door,nearDoor,branch}`. Do this for BOTH the wide and narrow
   layouts — every branch must have a narrow-screen placement too.
3. **Routing is then automatic** — `routeInto/routeOut` read `L.rooms[id].branch` and walk the right
   hallway. You write no new routing code.
4. **Draw the interior** in `drawBranch` (generalized from `drawWing`): the room's furniture, stage,
   whatever belongs in the region. The room's *panel* content (messages, tabs, booking UI) is
   unchanged — `openRoom(id)` still opens it.
5. **That's it.** Presence, the walk-in animation, zoom-to-overview, overflow "+N more" badges, and
   the present-members list all work with no further code, because they key off `L.rooms[id]`.

## How to add a 3D destination

Draw a door (`data-href="<url>"`) at the end of a hallway. It leaves the canvas; Back returns. It is
NOT a region and gets no `L.rooms` entry and no avatars. (Garden Observatory and Forest are these.)

## Zoom

`setCam('overview')` scales the whole `#world` element by `1/worldScale` so the entire canvas fits
the viewport. As the canvas grows, overview shows more automatically — nothing to maintain. There is
NO `/map` page and no diagram; "zoom all the way out" never leaves the living canvas. (A static
`/map` diagram existed briefly in Nov 2026 and was removed — do not bring it back; the whole point is
that the map IS the real space, scaled.)

## The spirit of it

The space stays the same; what changes is the rooms in it and the tools in the rooms. A member who
learns to walk the Commons once should never have to re-learn it because a new room appeared — they
just find a new hallway where there wasn't one. Keep entry, walking, presence, and zoom identical
everywhere, forever. That sameness is the human thread that holds the whole thing together.
