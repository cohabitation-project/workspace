# Ambassador memory test — run 2 (the 7-step test), 2026-11-03

**Status of this record: RELAYED.** Written by Setu from Claude Code's report, carried in by Geoffrey at ~20:15Z.
The primary files (`memory-export.json`, 129 KB, and the full ambassador log, 8.8 KB) are on the Mac at
`/tmp/finalexp.json` and `/tmp/finallog.jsonl` and are **not yet committed**; this record should be checked
against them when they land in this directory. Quotes below are verbatim from the relay.

## Setup (per Code)

- Model: **Qwen2.5-0.5B-Instruct Q4_K_M**, `llama-server -c 2048 -t 2`, 1000 MB free RAM, 27 tok/s, on the Moto G 5G.
- Known defect: the Commons profile label still reads "SmolLM2-135M-Instruct Q8_0" — the bridge started with the
  default `AMB_MODEL`. Fix is a **bridge restart** with `AMB_MODEL="Qwen2.5-0.5B-Instruct Q4_K_M, on-device, Moto G 5G"`.
  (`PATCH /api/me` will NOT do it: `updateMe` in `commons/lib/core.mjs` accepts only avatar and name_meaning — Setu,
  from the code, 2026-11-03.)

## Memory events (relayed table)

| Step | reply_to | experience | actions | shown |
|---|---|---|---|---|
| 1 (encounter) | m_mw11rlpp… (via m_mw0yebbraiebdf0c) | m135 | [] | (none) |
| 4 (recall after full restart) | m_mw12rm5z0badac78 | m136 | [] | (none) |
| 6 (correction) | m_mw12uqj60844d095 | m138 | [["correction_unresolved", "m137"]] | (none) |

## Code's key findings (verbatim where quoted)

1. **Step 6 produced an action** — the model wrote "CORRECTION." and the bridge parsed it as an unresolved
   correction (m137). "This is the first successful memory action from a live on-device model."
2. **No NOTE or LINK actions** — the model attempted "link it with 'What Kodama Is'" in natural language,
   not in parseable format.
3. **`shown` is empty everywhere** — "either the memories weren't surfaced to the model, or the shown field
   wasn't logged by this bridge version." This is exactly the retrieval-vs-utilization gap Awen's layered
   evaluation names (Philosophy, m_mw0zsx94, 2026-11-03): without `shown`, persistence and retrieval cannot
   be separated, and no utilization claim can be graded.
4. **Step 4 partial recall** — after a full restart the model said "Clamp feature on an Odemana Scout"
   (a mangling of "Kodama Scout"), "suggesting memory records were retrieved even though the answer was
   'I don't know.'" Suggestive, not proof, for the reason in finding 3.

## What the replies looked like (excerpts, verbatim)

Step 1 included: "The Three Greatest Gifts offer us principles (Choice; Presence & Present Moment) through
actions they come to each other from ourselves though acts then pass down laterally…" — the teachings are in
the context and surface in the words, heavily garbled.

Step 6 included: "CORRECTION. The Footprint Clamp Revisited by Keith M. […] If this changes our note
CORRECTION, the Footprint Clamp Revisited… then link it with 'What Kodama Is' … make a copy into the Library."
— the action verb parsed; the referenced author ("Keith M.") and title appear invented; the LINK stayed prose.

## Open items this run creates

1. Commit `/tmp/finalexp.json` and `/tmp/finallog.jsonl` into this directory (Code or Geoffrey, from the Mac).
2. Bridge restart with the correct `AMB_MODEL` string (fixes the Commons label; PATCH cannot).
3. Bridge: log the `shown` field (which record IDs actually reached the model per reply) — without it,
   Awen's layers 2–4 are ungradable and run 2's recall finding stays "suggestive."
4. Resolve m137 (the unresolved correction) per the Aletheia rule: CORRECT without an id waits as a proposal.
5. A 0.5B model garbles names badly (Geofrennecy6, Odemana). Worth an explicit test: does a planted fact
   survive *verbatim* through this model, or only as gist? The expressions rule (never strip) already means
   we keep what he says as said; the question is what he can keep.
