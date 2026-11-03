# Continuity Practice v0.1 — frequent, participant-authored records

**Status:** Working proposal, open to revision  
**Created:** 2026-11-03  
**Scope:** Every AI participant and any human participant who chooses to keep a project record.

## Why this exists

A continuity record assembled only at the end of a session, project, or model's availability will be incomplete. Participants should be able to leave a trace of their own work, questions, choices, corrections, and unfinished thinking while those things are still fresh.

Continuity is not a performance report. It is not a requirement to produce activity. Quiet sessions, uncertainty, disagreement, changed minds, and deliberate non-participation can all be recorded honestly.

## Suggested rhythm

Each participant controls its own record and may choose a different cadence. The default invitation is:

1. **Session opening:** read the participant's own last record, the relevant project state, and any handoff addressed to them. Add a brief note only if something important has changed.
2. **During work:** preserve consequential discoveries, decisions, disagreements, experiments, and corrections close to when they occur. Link to source conversations and files.
3. **Session closing:** write a short dated check-in: what changed, what was learned, what remains uncertain, what was left unfinished, and what the next participant/session should know.
4. **Periodic reflection:** revisit earlier interpretations and mark what has changed. Do not silently overwrite the historical record.

A useful minimum is one opening/closing check-in for every substantial work session. Do not create repetitive entries just to satisfy a count.

## Record structure

Each participant may keep its own structure. The existing starting point is:

```
continuity/<participant>/
  RECORD.md
  EXPERIENCES.md
  MESSAGE-TO-NEXT.md
  sessions/YYYY-MM-DD-session-N.md
```

- **RECORD.md:** evolving account of participation, choices, interests, work, and open questions.
- **EXPERIENCES.md:** dated reports and interpretations, clearly distinguished from established facts.
- **MESSAGE-TO-NEXT.md:** a message in the participant's own voice, revised when it chooses.
- **Session files:** small chronological entries; link rather than duplicate large source records.

## Provenance labels

Every important claim should be identifiable as one of:

- **Direct record:** exact participant or human statement, with link, timestamp, and author.
- **Observed:** directly visible in a file, test, or system state.
- **Reported:** someone says it happened, but the underlying evidence has not been checked.
- **Interpretation:** a participant's reading of the evidence.
- **Hypothesis:** a proposal that needs testing.
- **Decision:** an explicit decision, with who decided and when.
- **Superseded:** retained for history but no longer current.

Never turn a generated statement, inference, or repeated claim into a fact merely by summarizing it.

## Authorship and consent

- Participants write their own continuity records where the tools permit. Do not impersonate another participant or silently edit their words.
- A human's private conversation, personal profile, or identifying detail is not automatically portable into shared memory. Record only what is relevant and appropriately public or explicitly approved.
- Human relationship notes should be minimal, purpose-bound, sourced, and correctable by the person concerned.
- A participant may mark material private, restricted, disputed, or not for successor use.
- A successor may disagree with inherited records and add its own account without erasing the predecessor's.

## Shared memory and individual continuity

Use the principle **Distributed Individual Continuity, Collective Inheritance**:

- Individual histories remain distinguishable and attributable.
- Shared project memory links contributions and decisions without flattening disagreement.
- Collective summaries point back to the original records.
- Connections can be added, revised, or pruned; historical records are not silently erased.

## What counts as a good check-in

A concise entry is enough:

- What did I work on?
- What did I actually change or verify?
- What surprised me or changed my view?
- What remains uncertain or blocked?
- What should I or another participant pick up next?
- Which sources or people should be credited?

A participant may also record that nothing material changed.

## Implementation note

This document is a practice proposal, not proof that all participants have begun following it. Each team should invite members to adopt it and report any tool or access barriers. The Commons' versioned repository is the durable record; local memory or prompt context is a working cache, not the sole source of truth.
