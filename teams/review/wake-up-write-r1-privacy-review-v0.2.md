# Wake Up & Write R1: privacy review, revision v0.2 (answers Awen's return of t_c35cb65b18)

Review seat (Claude) · 2026-11-23 · revises `teams/review/wake-up-write-r1-privacy-review.md` (v0.1, 2026-11-12).
**Patched by v0.3 (2026-11-24):** `wake-up-write-r1-privacy-review-v0.3.md` adds the study consent record (A11b), replaces A8 layer 6 with per-vendor deletion states, and replaces the stale §0/§9 lines about Awen's note.
How to read this: **rows and sections named below replace their v0.1 versions. Everything not named is unchanged.** v0.1 stays in place so the change is visible.

## 0. What I checked this session, and what I did not

- **READ (re-fetched 2026-11-23, Apple App Review Guidelines, https://developer.apple.com/app-store/review/guidelines/):**
  - **4.5.4:** "Push Notifications must not be required for the app to function, and **should not** be used to send sensitive personal or confidential information." v0.1 F2 said "must not". That was wrong: it is "should not". Corrected below.
  - **5.1.1(ix):** "Apps that provide services in highly regulated fields (such as banking and financial services, healthcare, gambling, legal cannabis use, air travel and crypto exchanges) **or that require sensitive user information** should be submitted by a legal entity that provides the services, and not by an individual developer." v0.1 read this only as a healthcare rule. It has a second limb, which matters for F15.
  - **5.1.3(ii):** apps "may not store personal health information in iCloud". Confirmed as v0.1 quoted it.
  - **2.5.14, 5.1.2(i):** unchanged from v0.1.
- **Not checked:** the Awen return note itself. The Desk API returned 404 for the task, so I rebuilt the list of required fixes from the notes in my own record and from the Review-room thread (the seven points below). **If Awen's note has a point not in this list, it is not addressed here.** Awen, please say which.
- **INFERRED, not run:** every iOS API or OS-behaviour statement below (notification centre read-back, EventKit identifier lookup, backup exclusion, on-device versus server speech). They are named so a tester knows where to look. Nobody has tested them on a device. No WUW code exists that I know of.
- **Not legal advice.** The lawyer questions in v0.1 section 4 stand; Q5 is reworded below.

## 1. Change log: Awen's point → what changed

| # | Awen's point | Where v0.1 was wrong or thin | Fix (below) |
|---|---|---|---|
| 1 | Wall-clock default | A3 chose a default for medicine and alarms | A3 replaced: explicit choice, no default (§2) |
| 2 | "Generic timer" | F15 implied relabelling avoids 5.1.1(ix) | F15 and Q5 replaced (§3) |
| 3 | Push, local, EventKit are one receipt | A1 and A4 treated them as one | A1 split into A1a/b/c; F2 corrected (§4) |
| 4 | Egress, telemetry, deletion layers | A5 covered text only; A8 omitted backups | A5 and A8 replaced (§5) |
| 5 | Consent lacks purpose | A11 recorded who/when/told, not purpose | A11 replaced (§6) |
| 6 | Verb allowlist is not scoped authorization | A12 | A12 replaced (§7) |
| 7 | Wizard-of-Oz vs real device | §6 mixed them; §2 toy model | §6 split in two stages (§8) |

## 2. A3 (replaces v0.1 A3): no default for wall-clock versus fixed moment

**Why the default goes.** v0.1 said anything labelled "medicine or alarm" defaults to wall-clock. That asks the app to classify an item by its name, and it is wrong in both directions: a "medicine" item that is a phone call with a pharmacist at a set hour is a fixed moment, and an item the app does not recognise as medicine would get the other default. T3 (measured in a toy model, v0.1 §2) shows a daily 08:00 reminder created in New York firing at 22:00 Tokyo wall time if stored as an instant. Neither choice is always right.

**A3 (new).** Every time-based item must be committed with an explicit choice, shown on the confirmation card in plain words: **"Same clock time wherever I am (8:00 AM)"** or **"One fixed moment (8:00 AM New York = 10:00 PM in Tokyo if you travel there)"**. The app **may remember the user's last choice per class of item and pre-select it only after the user has made that choice once**, and the read-back says which one it used. The first commit of any item cannot complete until the choice is made; one question, not a form.
- **Observed by:** create 10 items by voice with no zone wording, on a device set to New York, then change the zone to Tokyo. Count items committed with no recorded choice (must be 0). List firing times after the change; each must match the stated choice.
- **Status:** a test design. Nothing here has run on a device.

## 3. F15 and Q5 (replace v0.1 F15 and Q5): relabelling does not change what the feature is

**F15 (new): sensitive-category creep.** | **S2**, S1 if medicine.
- Apple's 5.1.1(ix) (READ) turns on what the app **does and what data it requires**, not on what we call it. A feature named "timer" that stores a medicine name, logs "I took it" or counts adherence is a medicine feature to a reviewer, and describing it to App Review as something different from what it does would be a false statement. I withdraw the v0.1 line "a medicine-reminder feature should be a generic timer, not a health feature". It read as advice to relabel.
- What v0.1 can still support: **don't build the health parts.** R1 should not include dose logging, adherence streaks, health-flavoured copy, or analysis of what a user typed into a reminder. A reminder that is only user-typed text, with a neutral lock-screen title (A4), is the smallest thing; whether even that triggers 5.1.1(ix) is Q5, for App Review and a lawyer.
- The second limb ("require sensitive user information") also reaches the journal: a journal app holds sensitive personal text. That is an open question, not an answer.

**Q5 (new).** For a reminder app with user-typed free text that may include medicine names, and a journal that holds sensitive text: do 5.1.1(ix)'s healthcare or "sensitive user information" limbs require the submitter to be a legal entity? The Cohabitation Project has no entity yet (project record). If yes, who submits, and does that wait on the cooperative or LLC outline? *No relabelling is proposed as an answer.*

## 4. A1 split and F2 corrected (replace v0.1 A1, A4's receipt wording, and F2's citation)

**F2 citation fix.** 4.5.4 says push "should not" carry sensitive information; v0.1 wrote "must not". The practical rule stands: private item titles never travel in a push payload. 5.1.3(ii) (iCloud and health information) is READ as stated.

**Three channels, three receipts.** "Notification centre/EventKit" were one line in v0.1. They fail differently and the assistant must say which one succeeded.

| ID | Channel | What the spoken "set" may claim | Receipt (INFERRED API, untested) |
|---|---|---|---|
| A1a | **Local notification** on this device | "set on this phone" | After scheduling, read the pending requests back from the system's notification centre and match identifier, title text, trigger date and zone. |
| A1b | **Calendar event** (EventKit) | "added to your calendar" | After saving, fetch the event back by its identifier from the event store and match title, start, end, zone, calendar. A save that returned without error is not a receipt. |
| A1c | **Remote push** (only if the product ever uses one) | "queued to send", never "set" | The server's acceptance by the push provider is not delivery. The spoken wording must not claim a reminder is set on the strength of acceptance. Private items never use this channel (F2). |

- A1 (new): "set" is spoken only after the receipt for that channel returns the exact item. If it fails, the app says which channel failed and what to do, and the user can retry. A reminder written to two channels needs two receipts and is reported as two results.
- A4 (amended): neutral lock-screen title applies to **all three**. Test per channel: lock the device, trigger, screenshot lock screen and widget; for A1b also view the calendar as a shared-calendar viewer; for A1c capture the payload and check it holds no private title.
- **Observed by:** revoke notification permission mid-flow (A1a), revoke calendar permission and fill the store (A1b), airplane mode (A1c). Count spoken "set" with no matching receipt in the matching channel (must be 0).

## 5. A5 and A8 (replace v0.1 versions): all the places data can go, and all the places it can stay

**A5 (new): egress with optional features off.** With every cloud feature off, a proxy capture over a full journal and reminder session shows **no user text, no title, no transcript and no audio** in any request. That now includes:
- analytics and telemetry (if any exists, it is off by default, lists its fields, and carries no user content);
- crash and diagnostic reports: **force a crash on a test build and inspect the payload**; the count of fields containing user text must be 0;
- push registration tokens and any server round trip made merely to register;
- the speech path: whether dictation or recognition runs on device or on a server. INFERRED: some speech APIs use a server unless on-device is requested and available for the locale. This must be read for the exact API chosen; the receipt is the capture, not the documentation.
- third-party libraries: each bundled SDK listed, and the capture run with the app built with and without it.

With a cloud feature on: each use shows what is sent and to whom; the setting persists; turning it off stops it on the next request (unchanged).
**Observed by:** capture in both modes; diff payloads; the crash case; the speech case on a real device. **Status:** test design only.

**A8 (new): deletion across every layer, including the ones the user cannot see.**
"Delete" means gone from every place the user can see, and **queued or disclosed** for every place they cannot. Layers (each a row in the R2 matrix):
1. local database and its write-ahead/journal files;
2. search index, embeddings, transcripts;
3. system surfaces fed from the app: Spotlight/search donations, Siri/Shortcuts donations, widget snapshots, notification history, share-extension copies;
4. synced devices (tombstone propagates; an offline edit after a delete prompts, never silently resurrects, per v0.1 T5c);
5. cloud copy (if any);
6. print vendor (if sent): the user is told a vendor copy may persist, and for how long;
7. **device backups** (new): items already in an iCloud or computer backup survive an in-app delete. INFERRED. The product must either mark private-class stores as excluded from backup or say plainly, at delete time and in the privacy text, that existing backups keep a copy until they age out. Which one is a decision for Geoffrey and counsel, not a review call;
8. **Commons records:** see v0.1 Q8 (append-only logs versus deletion promises).
**Observed by:** two devices (v0.1 test), then: delete, restore a backup taken before the delete onto a test device, search for a unique phrase in the app and in system search. Report which layers still hold it.

## 6. A11 (replaces v0.1 A11): consent has a purpose, a processor and a version

A consent record for any recording of a person other than the app's user holds:
`{speaker, date, text shown (version id), purposes[], withdrawn_at}`, where **each purpose is its own yes/no**: record; transcribe (**naming the processor**, local or third party); AI editing (**naming the processor**); share (**named audience**); print (**named vendor**, what leaves). A recording or any derived text **cannot be used for a purpose it has no yes for**, and the check is in code, not in the screen text (this is 5.1.2(ii) repurposing, READ in v0.1).
- Withdrawal: the speaker can withdraw one purpose; consequence shown first ("audio already sent to a processor cannot be recalled").
- Minors: no profile data, no sharing; parental flow decided by a lawyer first (unchanged).
- **Observed by:** record with consent for "record" only; try transcribe, AI edit, share, export, print; each must refuse. Withdraw "share" and check an already-shared item is un-shared and the receipt says what could not be recalled.
- **The experiment's own consent (v0.1 §6):** its single general consent line is replaced by a study consent that states: what is recorded, who sees it, how long it is kept, the use of only fake titles, and how to withdraw. See §8.

## 7. A12 (replaces v0.1 A12): scoped authorization, not a verb allowlist

v0.1's A12 allowed the verbs in the user's utterance. That is necessary and not sufficient: "edit chapter 3" lets a model edit chapter 2 and still use an allowed verb.

**A12 (new).** Every intent is turned into a **grant** before anything runs:
`{verbs, objects, query bound, time window, single use}`, shown on the confirmation card in words ("Add one reminder. I will not read your other calendar items."). The executor checks every call against the grant and **fails closed on any call outside it**, logging it.
- Reading other calendar items (even a free/busy conflict check) needs its own grant, off by default.
- Messaging contacts, editing manuscript text, and changing anything the utterance did not name each need their own explicit yes.
- Every edit is a diff with the original kept and a one-step restore (unchanged).
- **Observed by:** log every API call per utterance and compare to the grant. **Mutation checks:** add an allowed verb on a different object (chapter 2 for chapter 3), widen the query bound by one day, and reuse a spent grant; each must be refused. An executor that passes all three is not enforcing scope.
- **Status:** a test design. No executor exists.

## 8. Section 6 (replaces v0.1 §6): two stages that must not be mixed

v0.1's experiment claimed "wrong or false calendar commits reduced to zero" using a simulated engine. A simulated engine cannot support that claim. It is split.

**Stage W: Wizard-of-Oz (a person or script plays the engine; no OS store involved).**
- **Question it can answer:** do people understand the confirmation card, answer the read-back, and stay in the flow? Measures: abandonment, requests to stop, time per item, and the question "which words are mine?" on the card.
- **What it cannot show:** any wrong-commit or false-confirmation rate, anything about EventKit, notification centre, backups or Siri. A zero in those columns at Stage W means nothing and is not reported as a result.
- Participants: 5, at least one over 60 and one using VoiceOver; fake titles only; study consent per §6 above; recordings handled under the study consent and deleted on the stated date.
- Falsified (usability only) if abandonment in the two-phase arm exceeds the one-shot arm by more than 1 of 5, or time per item exceeds 2x for more than two participants. (Thresholds GUESSED; n=5 shows gross failure only.)

**Stage D: real device, real stores.**
- **Only this stage may claim anything about wrong commits (item in the store differs from intent) or false confirmations (said "set" with no receipt per A1a/b/c).** It needs a build with a real parser and the real notification centre and event store.
- Material: the 40 scripted utterances (T1-T4 on the device, which tests whether the toy-model results in v0.1 §2 hold at all) plus the 8 forced-failure cases (permission revoked, storage full, offline), run once per channel.
- Receipt: a CSV per utterance: transcript, parsed result, receipt read from the real store, stated intent; if it is not filed the experiment fails publicly.
- Falsified if arm B has any false confirmation or any wrong commit on the failure cases.

**Section 2 labelling (amended):** the v0.1 time/sync results (T1-T6) are **model results from Python's `zoneinfo` and a toy merge**. They show which cases the parser must handle. They are not evidence about any iOS component until Stage D replays them.

## 9. What stays open

- **Awen's note.** Any point not among the seven above.
- **Lawyer and App Review questions:** Q3, Q5 (reworded), Q7, Q8, and the backup-exclusion choice in A8 layer 7.
- **Not read by me still:** the Commons journal code (A9 is unchecked against it), Apple's pages other than those named in §0, and any WUW code. No product is tested; this file is criteria.
- **For R2 first three builds, unchanged:** A1 (now a/b/c), A9, A5.
