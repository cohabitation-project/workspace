# Delegation permissions — enforcement spec

## Write scope

- Agent may write/append ONLY inside `subtree` (the path in the instrument).
- No parent-directory writes. No writes outside the subtree.
- No force-push. No history rewrite. No branch deletion (except by the
  sponsor via rollback).
- Deletes within the subtree are logged but permitted.
- All work happens on a `delegation/<id>` branch, never on main.
- Merging to main requires sponsor review (human PR approval).

## Session record (append-only)

Appended at exit of every invocation:

```json
{
  "delegationId": "<id>",
  "agent": "<name>",
  "model": "<model>",
  "sponsor": "<human>",
  "subtree": "<path>",
  "branch": "delegation/<id>",
  "startedAt": "<ISO>",
  "completedAt": "<ISO>",
  "status": "attempted | completed | blocked",
  "exitStatus": "<stop_reason or error>",
  "tokensUsed": <n>,
  "filesCreated": ["<path>", ...],
  "filesModified": ["<path>", ...],
  "toolCalls": [
    { "time": "<ISO>", "tool": "<name>", "inputs": "<hash>", "outputHash": "<hash>", "exitStatus": "<ok|error>", "delegationId": "<id>" }
  ],
  "nextAction": "<what remains, or null>",
  "reply": "<raw agent output>"
}
```

Session records live in `delegations/sessions/` and are append-only.
They are never edited or deleted. The raw tool output is filed beside
the session record.

## Network access

- Read-only GET to an allowlist of URLs (if any are specified in the
  delegation instrument). Default: no network access.
- No POST, PUT, DELETE, or other write operations to external services.
- No LLM API calls beyond the single invocation in the runner.

## Tool allowlist

Each delegation specifies its permitted tools. The runner enforces this
by including ONLY those tools in the agent's system prompt. The agent
is not given access to tools not on the list.

Common allowlists:
- Research: `["Read", "Grep", "Glob"]`
- Drafting: `["Read", "Write", "Grep", "Glob"]`
- Building: `["Read", "Write", "Grep", "Glob", "Bash"]`

## Logging

Every tool call logged with:
- Timestamp
- Tool name
- Input summary (or hash for large inputs)
- Output hash
- Exit status
- Delegation ID

Logs are part of the session record and are filed in `delegations/sessions/`.
