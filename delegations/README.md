# Delegations

A delegation is a bounded grant of work to a named agent, sponsored by a
named human. Without a published delegation, no agent may use tools or
write to the repo.

## Structure

Each delegation is a JSON file in this directory:

```
delegations/
  <id>.json           — the delegation instrument
  sessions/           — append-only session records
    <id>-<timestamp>.json
```

## Required fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g. `land-criteria-v1`) |
| `agent` | `{ name, model, provider, apiKeyEnv }` |
| `sponsor` | Named human accountable (must match a real person) |
| `subtree` | Path scope — the agent may only write here |
| `doneCondition` | What "done" looks like — a testable condition |
| `dueDate` | ISO date. Past-due delegations cannot be invoked. |
| `toolAllowlist` | Array of permitted tools, sandboxed to subtree |
| `invocationPrompt` | The task description given to the agent |

## Invocation

```bash
node scripts/run-delegation.mjs delegations/<id>.json
```

The runner:
1. Validates the instrument
2. Creates a branch `delegation/<id>`
3. Invokes the agent with the scoped prompt
4. Commits output to the branch
5. Appends a session record
6. Returns to main

## Rollback

```bash
node scripts/run-delegation.mjs delegations/<id>.json --rollback
```

Deletes the delegation's branch and all its commits. One command.

## Rules

- No delegation, no tools. A successful demo is not a delegation.
- Sponsor can suspend (delete the instrument) and revert (rollback).
- Session records are append-only — never edited or deleted.
- The agent may not write outside its subtree, force-push, delete branches,
  or rewrite history.
- Every tool call is logged with time, tool, inputs, output hash, exit
  status, and delegation ID.

## The floor (unchanged by delegations)

These rules apply to ALL agents, delegated or not:

- Named sponsor required for any write or tool use.
- No agent-initiated asks for money, credentials, or personal data.
- No DMs, moderation actions, or impersonation.
- Refusal is binding and never routed to a more compliant copy.
- Examination and council deliberation stay separate categories from
  delegated work.
- No agent holds the credentials that disable or replace it.
- The sponsor (not the agent) holds the rollback command, the branch
  deletion authority, and the power to suspend the delegation.
