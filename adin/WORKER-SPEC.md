# ADIN Node Worker — Design Specification

**Status:** Design document — NOT implementation.
**Date:** 2026-11-10
**Author:** ADIN architecture team

---

## 1. Execution Model

Each task's `payload.steps` array is executed sequentially. Every step maps
to a **fixed `[executable, ...args]` array** dispatched via
`child_process.execFile` (or the platform equivalent). No shell is ever
invoked. No string interpolation. No command chaining.

### Step → Command Mapping

| Step action       | Executable array                                                                 |
|-------------------|----------------------------------------------------------------------------------|
| `git-clone`       | `['git', 'clone', '--depth', '1', url, '--branch', commit, dir]`               |
| `npm-ci`          | `['npm', 'ci', '--ignore-scripts']` (cwd = work dir)                           |
| `node-test`       | `['node', '--test', '--', ...files]` (cwd = work dir)                           |
| `playwright-test` | `['npx', 'playwright', 'test', '--', ...files]` (cwd = work dir)               |

**Notes on `git-clone`:**

- The `url` is constructed by the worker from the validated `repo` field:
  `https://github.com/${repo}.git`. The repo name is never passed to a shell.
- The `commit` field is a full 40-character SHA. Using `--branch` with a SHA
  checks out the exact commit (with `--depth 1` this fetches only that commit).
- `--` separates options from positional arguments wherever the executable
  supports it, preventing file names from being interpreted as flags.

### Why `execFile`, never `exec`

`child_process.exec` passes its argument to `/bin/sh` (or `cmd.exe`),
enabling injection via shell metacharacters. `execFile` bypasses the shell
entirely: the first element is the executable, the rest are arguments passed
as an argv array. This is the only acceptable execution method.

---

## 2. Sandbox

Every task runs inside a **disposable isolated environment** with no access
to the host filesystem, credentials, environment variables, or network
(except the specific clone URL for the git step).

### Platform-specific sandboxes

| Platform | Sandbox method                         | Isolation level                      |
|----------|----------------------------------------|--------------------------------------|
| Windows  | Windows Sandbox (disposable VM)        | Full VM — destroyed after each task  |
| Windows  | Hyper-V (alternative)                  | Full VM — destroyed after each task  |
| Linux    | Rootless Podman (`podman run --rm`)    | Container — no root, no host mounts  |

### What the sandbox blocks

- **Filesystem:** No host mounts. The only files visible are the cloned repo
  and installed dependencies inside the sandbox.
- **Network:** All network access is blocked except the HTTPS connection to
  clone the approved repository. DNS is restricted to the GitHub domain.
- **Credentials:** No environment variables, SSH keys, API tokens, or browser
  profiles from the host are available inside the sandbox.
- **Processes:** The sandbox cannot see or signal host processes.

### Sandbox verification

**Self-reporting sandbox type is NOT sufficient.** The worker reports its
sandbox type to the orchestrator (e.g., `runtime.sandbox = 'windows-sandbox'`),
and the orchestrator records this as a policy gate. However:

- The orchestrator **cannot verify** that the claimed sandbox actually exists
  or is correctly configured.
- **Real verification requires:** A named human physically or remotely inspects
  the worker machine's sandbox configuration before the worker is approved for
  first use. This inspection is recorded in the audit log.
- Periodic re-verification should be scheduled (e.g., quarterly or after any
  OS update that might affect sandbox configuration).

---

## 3. Owner Controls

The hardware owner retains full control over their machine at all times.
The worker enforces the following limits, configured in the node's
`capabilities.limits` section:

### Resource limits

| Control                | Mechanism (Linux)                  | Mechanism (Windows)               |
|------------------------|------------------------------------|-----------------------------------|
| **CPU limit**          | cgroups v2 `cpu.max`               | Job Objects with CPU rate limit   |
| **RAM limit**          | cgroups v2 `memory.max`            | Job Objects with memory limit     |
| **Disk limit**         | Pre-task check of `df` output      | Pre-task check of free space      |

If RAM is exceeded, the sandbox process is killed and the task fails with a
resource-exceeded error. If disk is below the configured floor, the worker
refuses the task before starting.

### Environmental monitors

| Monitor              | Action                                                     |
|----------------------|------------------------------------------------------------|
| **Temperature**      | Pause task execution if CPU temp exceeds `thermal_ceiling_c`. Resume when cooled. |
| **Battery**          | Pause if battery drops below `battery_floor_pct` (phones/laptops only). Resume when charging or above threshold. |
| **Operating hours**  | Refuse tasks outside the configured `hours.start`–`hours.end` window (with timezone). |

### Manual controls

| Control              | How it works                                               |
|----------------------|------------------------------------------------------------|
| **Pause file**       | Create `STOP.txt` in the worker directory. Worker checks before each step and pauses if present. Remove the file to resume. |
| **Emergency stop**   | Close the terminal window or press Ctrl+C. The worker catches SIGINT/SIGTERM, kills sandbox processes, reports task failure, and exits cleanly. |

---

## 4. Prerequisites

These are **mandatory human-verified conditions** before any task executes.
They are NOT optional and NOT satisfied by code alone.

### 4.1 Commit approval

A **named human** must approve the exact commit SHA before any task referencing
that commit can execute. The approval is recorded in the orchestrator's
approval system with the approver's name, timestamp, and optional notes.

- The orchestrator rejects any task submission where the `git-clone` step
  references an unapproved commit.
- Approvals can be revoked if a commit is later found to be problematic.
- The worker does not execute any code that has not been approved.

### 4.2 Sandbox verification

The sandbox must be **independently verified** by a named human before the
worker runs any untrusted code. "Independently" means the person inspecting
the sandbox is not relying solely on the worker's self-report.

- The inspector checks that the sandbox type matches what was reported.
- The inspector verifies network isolation, filesystem isolation, and
  credential isolation are correctly configured.
- The inspection result and inspector's name are recorded in the audit log.

### 4.3 Hardware owner consent

**Mr. Roland's explicit informed consent** is required before any hardware
testing occurs on his machines. This means:

- He understands what code will run and why.
- He understands the resource limits that will be enforced.
- He has approved the sandbox configuration on his hardware.
- He can revoke consent at any time by suspending his node.

These three prerequisites form a chain: no code runs without an approved
commit, no commit runs without a verified sandbox, and no sandbox runs
without the hardware owner's consent.

---

## 5. Task Deduplication

The worker must track task IDs it has started executing in the current session.
Before beginning execution of a polled task:

1. Check if the task ID exists in the local `running_tasks` set.
2. If yes, **skip it** — the task is already being executed (this can happen
   if the orchestrator re-delivers a task due to a missed heartbeat).
3. If no, add the task ID to the set and proceed with execution.

When a task completes (success or failure), remove it from the `running_tasks`
set after reporting the result to the orchestrator.

This prevents the same task from being executed twice on the same node, which
would waste resources and could produce conflicting results.

---

## Summary

The worker is a thin execution shell: it polls the orchestrator for tasks,
runs them in a sandbox, and reports results. Every security-critical decision
(which code to run, which nodes to trust, whether results are valid) is made
by the orchestrator or by named humans — never by the worker alone.
