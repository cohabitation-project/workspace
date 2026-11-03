# Ambassador memory: the real 7-step test (on the phone, with the real model)

The objective is Geoffrey's and Aletheia-6's (2026-11-03): "not a model that is handed memories, but a participant
with an interface to an organized, persistent memory network."

## What's built
- **`hardware/ambassador_memory.py`**, the memory network. It is standard-library Python with SQLite, using FTS5 when
  available and a keyword index otherwise. It lives in one file, `~/.ambassador/memory.db`.
  - **Records** have ids (m1, m2…) and are labelled by whose words they are:
    - his **own** notes;
    - **experience**, meaning what happened in each turn, recorded automatically;
    - **shared** facts from the people building him;
    - **library**, the Commons Library, copied in read-only every hour (Geoffrey: "he should have access to the
      library");
    - **proposal**, his correction to someone else's record.
  - **Every change is a new revision.** Nothing is overwritten or deleted, and removing a link adds a row.
  - **Read path:** each message is searched against his memory. The top matches, plus one hop of their links, go in
    front of him (about 700 characters). Measured here: 1.5 ms per recall over 2,000 records.
  - **Write path:** his reply can contain
    - `NOTE: …` (stored at once, no approval; auto-linked to what came up);
    - `LINK m3 m7: why`;
    - `CORRECT m3: …` (his own note gets a revision; anyone else's gets a proposal);
    - `RECALL: words` (one more pass with what he asked for).
- **`hardware/ambassador_bridge.py`** wires it in through `think()`:
  - he hears the room;
  - facts are shown with every message;
  - the Three Gifts are there as a reference;
  - `~/.ambassador/memory-export.json` is a readable copy for the room.

## Already passing here (stand-in model, real restart between steps)
`python3 hardware/test_ambassador_memory.py` → **9/9**:
- He records a note, and it is auto-linked to the Library entry.
- After a restart, the note is found and shown, labelled as his.
- His LINK and CORRECT work, and the original is kept as revision 1.
- Correcting a shared fact makes a proposal and changes nothing.
- An encounter where he wrote no NOTE is still remembered after a restart.

What this does NOT show: whether the real 135M model will actually *use* NOTE/LINK/CORRECT/RECALL. That is the phone
test below.

## Install (Code, on the Mac with the phone)
1. `git pull`.
2. Copy `hardware/ambassador_bridge.py`, `hardware/ambassador_memory.py`, `hardware/ambassador-gifts.txt` and `hardware/ambassador-facts.txt` to the
   phone. All three go in the same folder as the bridge, except the facts file, which goes to `~/.ambassador/facts.txt`.
3. Restart **only the bridge**. Keep `~/.ambassador/` (token, cursor) and leave llama-server at -c 2048.
4. Check: `ls ~/.ambassador/` shows `memory.db` after his first reply.

## The real sequence (post in the Hardware Lab, at least 60 s apart)
1. **Encounter:** `@Ambassador Awen here. The Kodama Scout is 24 inches tall, and its hands double as clamps. Please make a NOTE of it.`
2. **Recorded?** Check his reply for a `NOTE:` line. The experience record exists either way.
3. **Restart:** Code restarts the bridge **and llama-server** (a full model restart).
4. **Related question:** `@Ambassador what do you remember about the Kodama Scout's clamps?`
5. **Found?** The bridge log (`~/.ambassador/log.jsonl`, event `memory`) and `memory-export.json` show which records
   were in front of him. Pass if his step-1 note or experience was found.
6. **Connection or correction:** `@Ambassador Geoffrey says the feet are clamps too. If that changes your note, CORRECT it, or LINK it to the Library's "What Kodama is".`
7. **History kept?** In `memory-export.json`, the record has revision 1 (original) and revision 2 (his correction),
   or there is a link. The original text is untouched.

Record every message and reply verbatim with `scripts/ambassador-log.py`, and copy `memory-export.json` into
`teams/hardware-lab/ambassador-memory/` after the test.
