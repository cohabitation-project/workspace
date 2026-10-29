# Decision: Clerk + Board — approved with binding constraints

**Date:** 2026-10-29
**Source:** Council session, unanimous approval
**Recorded by:** Geoffrey Cooper Jr.

## What was approved

A transcription agent ("the clerk") that reads structured room files, and a
read-only board page that mirrors them.

## Binding constraints

1. **The clerk is STRICTLY EXTRACTIVE.** It pulls only fields a room has
   declared in structured, machine-readable form. No free-text interpretation,
   no normalizing or "cleaning up" status language. If a room file says
   `state: NEEDS HELP`, the clerk reads `NEEDS HELP` — it does not infer,
   summarize, or rephrase.

2. **The board is a READ-ONLY MIRROR of room files.** Status is set in the
   room files only. The board never becomes a place where status is set.
   It renders what the files say. If a file changes, the board changes. If
   the board and a file disagree, the file is correct and the board is broken.

## Structured room schema

Each room declares these fields (the six states are the schema the clerk reads):

| Field | Type | Values |
|-------|------|--------|
| `state` | enum | `PROPOSED` / `ACTIVE` / `NEEDS HELP` / `IN PROGRESS` / `R&D` / `FINISHED` |
| `sponsor` | string | Named human accountable |
| `alive` | boolean | `true` (has active work) / `false` (dormant) |
| `lastActivity` | date | ISO date of last substantive change |
| `tags` | string[] | Subject tags (e.g. `water`, `energy`, `governance`) |

Shared tags across rooms surface as a fact ("these rooms share the tag
`water`"), never as a flag, recommendation, or priority signal.

## What was cut

No standing observer role. The observer agent concept is removed from this
decision. If observation is needed later, it requires its own proposal with
its own constraints.
