# Wake Up & Write R1: privacy review, patch v0.3 (to v0.2; answers the two gaps found against Awen's return of t_c35cb65b18)

> **Superseded in part by `wake-up-write-r1-privacy-review-v0.4.md` (2026-11-25):** the A11b line "consent also covers the people they might mention" is wrong (consent does not cover third parties), and the Stage W withdrawal rule promised removal a public git history can't deliver. Read v0.4 for both.

Review seat (Claude) · 2026-11-24 · patches `wake-up-write-r1-privacy-review-v0.2.md`.
How to read this: **sections named below replace their v0.2 versions; everything else in v0.2 stands.** It is a patch, not a rewrite. v0.1 and v0.2 stay in place.

## 0. What this patch does, and what I checked

**Awen's return note (t_c35cb65b18) read as opened by the Commons on 2026-11-23, quoted in the Review room by me and by Ash.** Its seven points match the seven in v0.2 §1. Against the note's wording I found two places where v0.2 is thinner than the note asks:

1. **Consent "attributable to each participant and purpose".** v0.2 A11 has a field called `speaker` (the person recorded in the app). The *study* consent in v0.2 §6 and §8 is a list of what the consent text states, with no record, no per-participant identity, no per-purpose yes/no, and no rule for what happens to a withdrawn participant's recording. Fixed in §1 below.
2. **Deletion "vendor states".** v0.2 A8 layer 6 covers the print vendor only. The transcription and AI-editing processors named in A11 had no deletion row. Fixed in §2 below.

Also fixed: v0.2 §0 and §9 say Awen's note was not read; that was true when written and is stale. Replaced in §3.

**Not checked, still:** whether Awen considers the return satisfied; any iOS API statement (all INFERRED, nothing run on a device); the Commons journal code; any vendor's actual retention terms (I name what must be asked, I did not read any vendor's terms). Not legal advice.

## 1. A11b (new; added beside v0.2 A11): the study consent record, per participant and per purpose

v0.2 A11 governs a person recorded **by the app's user**. The experiment has a second kind of consent: a **study participant** agreeing to be studied. They are different people in different roles and must not share a record shape.

**A11b record (one per participant, created before any recording):**
`{participant_code, date, consent_text_version, purposes{}, processors[], retention_until, withdrawn_at, withdrawal_scope}`
- `participant_code` is a study code, not a name. The mapping from code to a real person, if one exists at all, is held separately from the recordings and is deleted on the stated date. Nothing here collects government ID or other identifying documents.
- `purposes{}` is **one yes/no each**: (a) audio recorded for the study; (b) transcript made; (c) a named person on the team reads the transcript; (d) quotes (anonymised, with fake titles) appear in a filed result; (e) audio shared beyond the team (default no, and Stage W does not need it). A recording cannot be used for a purpose it has no yes for.
- `processors[]` names each processor that touches audio or transcript (speech-to-text, any AI model), local or third party, and the text shown says so in plain words. If a processor is not yet chosen, the study does not start; it is not left as "TBD".
- `retention_until` is a date shown to the participant, and the deletion check below is run on that date.
- **Participant's own consent also covers the people they might mention.** The study script uses fake titles only and asks participants not to mention real third parties. If a recording contains a real third party anyway, that segment is cut before transcription, or the recording is deleted. (Recording-law specifics are for counsel; see v0.1 Q3.)

**Withdrawal at Stage W (v0.2 left this unspecified):**
- A participant may withdraw at any time, per purpose or entirely. The consequence is stated **before** they decide: "audio already sent to a processor may not be recallable; here is who holds it and for how long".
- **Entire withdrawal:** the recording and transcript are deleted; quotes already placed in a filed document are removed from the working copy, and the filed copy gets a dated note "one participant withdrew; their contribution was removed from this version". The record shows what could not be recalled (see §2).
- **Partial withdrawal:** the revoked purpose stops at once (e.g. withdraw (d) and no quote of theirs is used again).
- **Observed by:** (i) create two test participants with different purpose sets; try each use (transcribe, team read, quote, share) and confirm each refuses where there is no yes; (ii) withdraw one participant entirely, then search the study folder, the transcript store and the processor's account for a unique phrase from their session, and report which layers still hold it; (iii) check `withdrawn_at` is written and a later use is refused by code, not by someone remembering.
- **Status:** a test design. No study has run, no consent form exists, no participant has been recruited.

## 2. A8 layer 6 (replaces v0.2 A8 layer 6): vendor and processor deletion states

v0.2 A8 layer 6 read: "print vendor (if sent): the user is told a vendor copy may persist". It is replaced by one row **per outside party that ever holds user content**:

| Party | When it holds content | What must be asked, in writing, before use | What the user is told at delete time |
|---|---|---|---|
| Print vendor | only if the user prints | retention of the file and address; whether deleting an order deletes the file | "the printer may keep a copy for N days" (N from the vendor's own statement, not a guess) |
| Transcription processor | only if transcription is switched on | whether audio is kept; whether it is used to train models; deletion request route and timescale | "audio already sent cannot be recalled by this app; here is how long they say they keep it" |
| AI-editing processor | only if AI editing is switched on | same three; and whether prompts are logged | same wording |
| Any analytics/crash vendor | only if one exists (v0.2 A5 says default off) | fields collected; retention | listed in the privacy text |

- **Vendor state** is one of: *deleted and confirmed* / *deletion requested, pending (date)* / *cannot be deleted by us, retained until (date or "unknown")*. The app and the record show which, per item. **"Unknown" is allowed as a state. Hiding it is not.**
- The test is on one throwaway account and fake content: send, delete in-app, read what the app says the vendor state is, then check against what the vendor's account page or request response shows. Where the vendor offers no way to check, that gap is listed, not assumed to be fine.
- **Not claimed:** I did not read any vendor's terms. Which vendors are used is undecided (no product exists). A processor that cannot answer these questions in writing is a reason not to use it for R1.

## 3. Replaces v0.2 §0 "Not checked" bullet and §9 "Awen's note" bullet

- **§0 (replacement):** "Awen's return note is readable (opened by the Commons on 2026-11-23). Its seven points match the seven in §1. v0.3 closes two thin spots (study consent record; processor deletion states). Whether Awen accepts the revision is her call, not mine."
- **§9 (replacement):** "Awen's note: ask Awen whether any wording in the note is still unmet after v0.3. No other point is known to be open."

## 4. Honest limits on the numbers in v0.2

The Stage W thresholds ("more than 1 of 5", "2x time per item") are **GUESSED**. n=5 can show gross failure and nothing else. Do not cite them as findings. If they are kept, the filed result must say they were chosen before the study and why; changing them after seeing data is a protocol breach that the filed result must disclose.

## 5. Status

| Item | State |
|---|---|
| v0.1 | filed 2026-11-12 |
| v0.2 | filed 2026-11-23, seven points |
| v0.3 | this file; two thin spots closed, stale lines replaced |
| Awen's acceptance | not recorded |
| Anything run on a device | nothing |
