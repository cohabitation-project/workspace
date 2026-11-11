# ADIN — Adaptive Distributed Intelligence Network

Phase 1 implementation of the Cohabitation Node protocol and orchestrator.

## What this is

A general-purpose distributed computing framework for the Cohabitation Project.
Devices volunteer resources (CPU, GPU, RAM, storage, inference) through a node
application. The orchestrator assigns workloads to eligible nodes based on
capabilities, availability, and owner-imposed limits.

Phase 1 supports `compute.build-test` tasks. The protocol schema is extensible
to `inference.completion`, `inference.embedding`, `storage.index`, and future
task types without changing the orchestrator or scheduler.

## Architecture

```
                 ┌─────────────────────┐
                 │  Orchestrator       │  tailnet only (100.x.x.x:3399)
                 │  ├ registry.mjs     │  node enrollment, auth, heartbeat
                 │  ├ queue.mjs        │  task lifecycle
                 │  ├ scheduler.mjs    │  capability matching
                 │  ├ validation.mjs   │  untrusted result pipeline
                 │  └ metrics.mjs      │  usage ledger
                 └──────────┬──────────┘
                            │ tailscale
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────┴────┐  ┌────┴────┐  ┌─────┴────┐
         │ Node A  │  │ Node B  │  │ Node ... │
         │ (phone) │  │ (laptop)│  │          │
         └─────────┘  └─────────┘  └──────────┘
```

## Security model

- **Three-credential auth:** one-time enrollment code → rotatable node secret
  (90-day lifetime) → short-lived session token (1 hour).
- **Command allowlist:** compute tasks may only execute pre-approved commands.
  `npm ci --ignore-scripts` — no lifecycle scripts. `node --test <file>` — not
  `npm test`.
- **Sandbox required:** untrusted repository code runs in Windows Sandbox, a
  container, or equivalent. Process-only isolation is reported but not accepted
  for arbitrary code execution.
- **Untrusted output:** all node results pass through validation (structural
  checks, identity-leak stripping, role-reversal detection, consistency checks).
  Tier 0 nodes get cross-checked. Flagged results go to human review.
- **No permission escalation:** the scheduler reads capabilities and limits. It
  never grants new permissions, modifies node configs, or executes code.
- **Tailscale ACLs:** workers reach port 3399 on the server only. No
  node-to-node traffic. No exit nodes. No subnet routing.

## Running locally (development)

```bash
# Start orchestrator on localhost
ADIN_DATA_DIR=/tmp/adin-test ADIN_ADMIN_TOKEN=dev-token node adin/orchestrator.mjs

# Admin: create enrollment code
ADIN_ADMIN_TOKEN=dev-token node adin/admin.mjs enroll-code Geoffrey test-node

# Admin: queue a build-test
ADIN_ADMIN_TOKEN=dev-token node adin/admin.mjs queue-test main

# Admin: check status
ADIN_ADMIN_TOKEN=dev-token node adin/admin.mjs status
```

## Tests

```bash
node --test adin/test/*.test.mjs
```

## Files

| File | Purpose |
|------|---------|
| `protocol.mjs` | Schema definitions, validators, command allowlist |
| `credentials.mjs` | Token generation, hashing, rotation, verification |
| `registry.mjs` | Node enrollment, auth, heartbeat, revocation |
| `queue.mjs` | Task submission, assignment, completion, retry |
| `scheduler.mjs` | Deterministic capability matching and scoring |
| `validation.mjs` | Untrusted result pipeline, canary system, review queue |
| `metrics.mjs` | Usage ledger, contribution tracking |
| `orchestrator.mjs` | Express server wiring (tailnet-only) |
| `admin.mjs` | CLI admin tool |
| `tailscale-acl-draft.json` | Least-privilege ACL policy (for human review) |

## Status

- [x] Protocol schema (general-purpose, extensible)
- [x] Credential lifecycle (enrollment, auth, rotation, revocation)
- [x] Node registry with heartbeat and offline detection
- [x] Task queue with priority, retry, and cancellation
- [x] Deterministic scheduler with auditable decision logs
- [x] Untrusted result validation (structural + safety + cross-check)
- [x] Human review queue for flagged results
- [x] Provenance logging
- [x] Usage ledger (per-node, council-readable)
- [x] Admin CLI
- [x] Tailscale ACL draft
- [x] 119 automated tests (all passing)
- [ ] Node worker application (Phase 1 next step, after sandbox confirmation)
- [ ] Production deployment (requires separate authorization)
