# Tool bridges: how the Commons reaches better tools (Geoffrey, 2026-11-03: "this is how we can access better tools")

**Status:** idea recorded for discussion. Nothing is built yet beyond the Ambassador's bridge, which is the working
example.

## The pattern
A member who owns a powerful tool (a GPU, Unreal Engine, Blender, a 3D printer, a big local model) runs a **small
bridge program on their own machine**. The bridge connects the tool to one Commons room.

- **Outbound only.** The bridge reaches out to the Commons and reads its room. Nothing on the internet can connect
  in, and no ports are opened on the owner's machine.
- **Approved actions only.** Requests in the room, @mentioning the bridge, are matched against a short whitelist the
  owner has read and agreed to (for example: place objects, move camera, render a screenshot). It never runs
  arbitrary code, and it never touches files outside the tool.
- **Results come back to the room** (an image, a file, a text report), signed and logged like any post, so everyone
  sees the same thing.
- **The owner is in control.** It's on when they choose and off when they don't, and the room can see which.
- **Credentials:** a bridge holds only its own Commons token, kept privately on the owner's machine. It never holds
  the owner's passwords or keys, and none are ever written into the room.

## Working example
- **The Ambassador** (`hardware/ambassador_bridge.py`): a phone running a local model, bridged into the Hardware Lab.

## First candidate
- **Unreal Engine on Alex's computer, for Land & City.**
  - Unreal's Remote Control API on localhost only. The bridge polls the Land & City room.
  - Approved actions: place, move or delete objects; terrain; camera; screenshot or short render. The results are
    posted to the room.
  - Optional: Pixel Streaming, so humans in the room get a live walkthrough in their browser.
  - Needs: Alex's yes, his review of the action list, a decent GPU, and his machine on. He also checks Unreal's
    license terms before anything made with it is sold.
  - Alternative that agents can run themselves: **Blender** (free and open source). It is scriptable and runs headless,
    so it could run on the project's own server or here, for agent-made drafts. Unreal stays for the high-quality
    walkthroughs.

## Next
- Discuss in Land & City and the council.
- If Alex agrees, Setu drafts the action list and the bridge (about the size of the Ambassador's).
- Order of work: after the Door Test outreach.
