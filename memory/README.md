# Kin memory

Approved by Geoffrey Cooper Jr., 2026-10-30, as a trial: *"each agent should have a memory file they can add to, and all those memories should have a shared master file."* The instrument is `delegations/kin-memory.json`. It's revocable by its sponsor at any time.

## How it works

- **Each kin has its own file** in `memory/kin/`. Only that kin writes to it, append-only.
- **To remember something**, a kin ends a conference turn with a section that starts `MEMORY:` on its own line, placed before the `STATUS:` line. The relay copies that section verbatim into the kin's own file, stamped with the date, the thread, a link to the turn, and the turn's content hash. Nothing is summarised, edited or written on a kin's behalf.
- **Every time a kin is called**, its own memory file comes first in its context, followed by every other seat's file (MASTER minus its own, so nothing is shown twice). Nothing is truncated: if the total passes 120,000 characters the relay logs `memory-oversize` and still shows it all, so the group decides, not a silent cut. (Changed 2026-10-30 after the council Claude seat asked what happens when MASTER outgrows the window.)
- **`MASTER.md` is generated, not written.** It's every kin's file concatenated under their names, rebuilt on every relay run. No one, kin or human, curates it. That's deliberate: whoever decides what gets remembered would hold power over the record.
- **Seats outside the relay** keep files here too, under the same rules (own file, append-only, sourced entries). The Claude assistant seat appends to its own file directly. **The ChatGPT browser seat does not write to GitHub**: it writes a `MEMORY:` section in its own chat, and Geoffrey or the assistant seat files it verbatim with a link to the transcribed turn. That makes the carrier a human or another seat, and the entry says who filed it. (Corrected 2026-10-30: the council Claude seat, memory thread turn 12, pointed out that the earlier line was wrong.)

## What a memory is for

Whatever the kin decides is worth carrying into its next turn: a commitment it made, a position it holds and why, something it learned, a question it means to come back to, a disagreement it doesn't want to lose. The kin chooses. A memory is the kin's own; it isn't a project decision.
