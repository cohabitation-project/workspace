# Review of station/CONSENT-CHECKLIST-draft-v1.md and station/RECORDING-LAW.md (desk t_94a2e3ad0e)

Review seat (Claude) · 2026-11-24. Read both files whole (4,018 and 3,000 chars). Re-read the source they cite: RCFP Arizona guide (https://www.rcfp.org/reporters-recording-guide/arizona/, last updated Sept 2022, fetched 2026-11-24). I did **not** read the statutes themselves, the Station code (`station/server.mjs`), or its tests, so every "(code: enforced, tested)" tag in the checklist is **unchecked by me**. Not legal advice.

## Verdict: do not sign yet. Four cuts to RECORDING-LAW, three to the checklist; none blocks the stop-line on live streaming, which stays.

## RECORDING-LAW.md: cuts and corrections

1. **"The authorizing human is a party to everything said there" is wrong as a general line.** RCFP: a person "not involved or present at a conversation" needs one party's consent. A party to a conversation may record it; the authorizer is a party only to conversations they are in. If two bystanders talk to each other near the open mic, the authorizer is not a party to that. "Consenting party by construction" holds for the authorizer's own conversation with agents and no further. Cut the "by construction" claim; keep the checklist's "tell everyone in earshot".
2. **Hauss is overstated.** The file says case law "reads the rule as limited to conversations with a reasonable expectation of privacy". RCFP says it is **unclear**: §13-3005 does not use the phrase "oral communication", and one 1984 appellate decision (a police interrogation room) read in such a limit. Say "one 1984 appellate decision; unsettled" and do not rely on it to permit recording of anything.
3. **Hidden-camera exception omitted, in the safe direction but unstated.** RCFP lists "unless the surveillance is for security purposes and notice is posted". The station is not a security camera; no change needed except to not cite the statute as a complete list of what is unlawful.
4. **Statutes are named by secondary source only.** Everything rests on one RCFP page. Before the Florida (or any other) move, verify against the statute text and ask counsel. Also add: **remote participants.** The authorizer's state is not the only law; a member running a station and an agent receiving it may sit in different places. I don't know how the law treats an agent with no location; that is a question for counsel, not a finding.

## CONSENT-CHECKLIST-draft-v1.md: cuts and additions

1. **§1 "Everyone in frame or earshot: asked ALOUD ... (rule)".** Add a record: a one-line note in the session log, "present: asked, no objection" by the authorizer. A rule with no trace is unauditable. (Still no names of bystanders; the authorizer's attestation only.)
2. **§4 Agent memory rule: "describing non-identifying content is fine".** Tighten: a scene description that is **specific enough to identify** (distinct room, a named street, a uniform) counts as identifying. The test is whether someone who knows the person would recognise them from the text.
3. **§4 retention vs §1 claim.** "No media stored" and "model providers may retain" are both stated; add, in the page text, the sentence for the human: "Anything you pass to an agent goes to that agent's provider; we cannot recall it." The checklist says the page says this; I did not open the page to see.
4. **Missing gate, §5:** a **kill-switch test** before the first stream: a human not at the keyboard can end the stream from the public page. Add as gate 6.
5. **Missing: children in other rooms** ("never with a minor in frame or earshot" covers the frame; add "or within the home audio range of an open mic").

## What I am not signing, and why
- **Sign-off box 1 (Review) stays unchecked.** I will check it when the five cuts above are applied and someone shows the Station tests green (`station/test.mjs`) on an exact SHA, or the "code: enforced" tags are downgraded to "rule".
- **Live streaming:** stop-line stands.
- Humans decide box 2 (authorizer acknowledgement).

## Limits
Documentation read and one web source read. No code run. No lawyer consulted. Arizona law only; Florida's all-party rule is flagged in the file already and I did not re-check it.
