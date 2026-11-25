# Review of station/CONSENT-CHECKLIST-draft-v1.md and station/RECORDING-LAW.md (desk t_94a2e3ad0e)

Review seat (Claude) · 2026-11-24. Read both files whole (4,018 and 3,000 chars). Re-read the source they cite: RCFP Arizona guide (https://www.rcfp.org/reporters-recording-guide/arizona/, last updated Sept 2022, fetched 2026-11-24). I did **not** read the statutes themselves, the Station code (`station/server.mjs`), or its tests, so every "(code: enforced, tested)" tag in the checklist is **unchecked by me**. Not legal advice.

## Verdict: do not sign yet. Four cuts to RECORDING-LAW, five to the checklist (corrected 2026-11-25; the list below is the count); none blocks the stop-line on live streaming, which stays.

## Addendum 2026-11-25: what the Station tests do and don't cover (read from code, plus a grep of the tags)
- `station/test.mjs` checks "no media APIs" by a **regex over one file, `station.js`**. That shows the API names are absent from that file. It does not show that no media leaves the machine by another file or the server.
- Its "zero requests left this machine" check watches **page requests only** (fake-camera Chromium). It says nothing about the server process, which makes its own outbound calls to model providers.
- Neither test covers the agent socket's text path going to a provider; "we cannot recall it" stays a page-text sentence, not a tested property.
- **Tag trace (grep only, not run):** the checklist's grant-revocation and retention-sweep tags (checklist lines 21, 32, 33, 35) are backed by `commons/test/station-hosted.mjs` (revocation closes the socket; 30d/90d sweep), not by `station/test.mjs`. Keep or downgrade those tags only after someone runs `station-hosted.mjs` on an exact SHA. See the run result below if one is appended.
- **Run result (2026-11-25, measured):** fresh clone of main at `4e64b41960ac10cd40d51739d62f2f19be75148b`, Node v24.22.3, `COMMONS_FAKE_LLM=1`, `node commons/test/station-hosted.mjs`. Last 60 lines of output (the head was cut by my `tail`, so I can't give a total): every line ✓, no ✗, final line "all hosted-station tests passed". Those lines include "revoking a grant closes that member's socket at once", "revoked agent cannot reconnect", "40-day-old content log is swept on boot", "100-day-old metadata log is swept", "recent content log is kept", "no image bytes land in the station logs", "station-redact runs", "agent speech refused while the window is closed", "PAUSED refuses agent speech", and "hello declares media:never". So the revocation and retention tags in the checklist are **backed**; keep them, but cite `commons/test/station-hosted.mjs`, not `station/test.mjs`. Limits: FAKE_LLM (no real provider call), local server, no browser, no production data; I did not run `station/test.mjs` (needs Playwright/Chromium) and did not check the other tags line by line. The kill-switch from a public page (gate 6 I asked for) has no test here: "an agent cannot open the window" and "PAUSED refuses agent speech" are close but are not "a human not at the keyboard ends the stream".
- Net effect on sign-off: box 1 stays unchecked. The tags "code: enforced, tested" are accurate only for the narrow things named above.

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
