# ADIN Sandbox Threat Model

**Phase:** 4 (Sandbox)
**Last reviewed:** 2026-11-10
**Status:** UNVERIFIED — requires deployment-time verification by a named human

## Architecture

Each compute task runs inside a fresh container that is destroyed after completion.
The sandbox uses Docker or Podman CLI via `child_process.execFile` (never shell).

Two execution phases:
1. **Dependency phase** (git clone + npm ci): network enabled (default bridge).
   Phase 5 should restrict to github.com and registry.npmjs.org only.
2. **Execution phase** (node --test, playwright): network disabled (`--network=none`).

## Protected

### Filesystem access
- **Threat:** Malicious task reads host files (SSH keys, .env, credentials, other tenant data).
- **Mitigation:** Container mounts ONLY the task's work directory at `/work`. No other host paths are accessible. Root filesystem is read-only (`--read-only`). `/tmp` is a size-limited tmpfs.
- **Enforced by:** Container runtime (kernel namespaces), not self-reported.

### Process escape
- **Threat:** Task code spawns processes outside its scope or inspects host processes.
- **Mitigation:** Container PID namespace isolates processes. `--pids-limit` prevents fork bombs (default 256). `--cap-drop ALL` removes all Linux capabilities. `--security-opt no-new-privileges` prevents privilege escalation.
- **Enforced by:** Container runtime (PID namespace + cgroups).

### Network exfiltration during test execution
- **Threat:** Test code sends data to an external server.
- **Mitigation:** `--network=none` during execution phase. No network interfaces available.
- **Enforced by:** Container runtime (network namespace).

### Resource exhaustion
- **Threat:** Task consumes all host RAM, CPU, or disk, affecting other tasks or the host.
- **Mitigation:** `--memory` and `--memory-swap` limit RAM (no swap). `--cpus` limits CPU. `--pids-limit` limits processes. Tmpfs is size-limited.
- **Enforced by:** Container runtime (cgroups v2).

### Fork bombs
- **Threat:** Task spawns processes exponentially to crash the host.
- **Mitigation:** `--pids-limit 256` (configurable per task).
- **Enforced by:** Container runtime (cgroups PID controller).

### Persistent changes
- **Threat:** Task modifies the host or leaves backdoors.
- **Mitigation:** Container is destroyed after task completion (`docker rm -f -v`). Read-only root filesystem. Work directory is task-specific and can be cleaned.
- **Enforced by:** Container lifecycle management + read-only filesystem.

## NOT Protected (requires additional measures)

### Container runtime vulnerabilities
- **Threat:** Kernel exploits or container escape via runtime bugs.
- **Risk level:** Low but non-zero. Known container escapes exist (e.g., CVE-2024-21626).
- **Mitigation (future):** Use rootless mode (reduces attack surface). Pin container runtime versions. Monitor CVE feeds. Consider gVisor or Kata Containers for defense-in-depth.

### Side-channel attacks
- **Threat:** Timing attacks, cache attacks, or other microarchitectural side channels.
- **Risk level:** Low for our use case (not handling cryptographic secrets in adjacent containers).
- **Mitigation (future):** Core pinning, noise injection. Not planned for Phase 4.

### Supply chain attacks in npm dependencies
- **Threat:** Malicious npm package installed during `npm ci` runs arbitrary code.
- **Risk level:** Medium. `--ignore-scripts` blocks install scripts, but the package code itself runs when imported during tests.
- **Mitigation (future):** Dependency allow-lists. Pre-audited lockfiles. Network restriction during install (allow only registry.npmjs.org).

### Data exfiltration during dependency phase (HIGHEST RISK PHASE)
- **Threat:** Malicious code in a git repo or npm package sends data to an external server during the clone/install phase when network is enabled.
- **Risk level:** **HIGH**. The dependency phase is the highest-risk phase because:
  1. Network is enabled (default bridge) — containers can reach arbitrary hosts
  2. `--ignore-scripts` blocks npm install scripts, but git hooks or post-checkout scripts could still reach out
  3. A compromised package's code runs when imported during tests (execution phase is sandboxed, but the code is already present)
- **Phase 4 mitigations:**
  - `--dns 8.8.8.8` during dependency phase prevents DNS poisoning from the host
  - `restrictedDeps: true` in sandbox-executor limits the dependency container to only `git-clone` and `npm-ci` actions, rejecting any other step type
  - SHA-pinned git fetch (init→fetch→checkout→verify) prevents substitution of un-approved commits
- **Phase 5 mitigations (planned):**
  - iptables-based egress filtering to restrict to github.com and registry.npmjs.org only
  - DNS-based filtering with an allowlist
  - Egress proxy with domain allowlist
- **Future optimization:** Pre-fetch dependencies on the server side and copy them into the sandbox, eliminating the need for network access in the dependency phase entirely

### Docker daemon privilege escalation
- **Threat:** Task code exploits Docker socket or daemon to gain host root access.
- **Risk level:** Medium if using rootful Docker; low with rootless.
- **Mitigation:** The sandbox never mounts the Docker socket. Uses `--cap-drop ALL` and `--security-opt no-new-privileges`. Rootless mode is preferred and detected automatically.

### Resource metering accuracy
- **Threat:** Reported resource usage doesn't match actual consumption.
- **Risk level:** Low. cgroups accounting is kernel-level.
- **Mitigation (future):** Read cgroup stats directly from `/sys/fs/cgroup` rather than relying on `docker stats`.

## Verification Requirements

Before deploying the sandbox on contributed hardware, a **named human** must:

1. **Verify container runtime installation** — confirm Docker/Podman is correctly installed, the version is not affected by known CVEs, and rootless mode is active.

2. **Verify the sandbox image** — confirm `adin-sandbox:latest` was built from the expected Dockerfile and matches the expected content. In production, use digest pinning (e.g., `node:22-slim@sha256:...`).

3. **Run the sandbox test suite** — execute `node --test adin/test/sandbox.test.mjs` on the target hardware and confirm all tests pass with real containers.

4. **Verify network isolation** — manually confirm that a container created with `--network=none` cannot reach external hosts.

5. **Verify resource limits** — manually confirm that a container respects `--memory` and `--pids-limit` by running the test suite's resource limit tests.

## Defense-in-Depth Layers

The sandbox is ONE layer of defense, not the sole boundary:

| Layer | What it does | Phase |
|-------|-------------|-------|
| Protocol validation | Rejects unknown actions, flag injection, path traversal | Phase 3 (merged) |
| Step allowlist | Only git-clone, npm-ci, node-test, playwright-test | Phase 3 (merged) |
| Container sandbox | Filesystem, network, resource isolation | Phase 4 (this) |
| Orchestrator policy | Trust tiers, sandbox-required flag, review queue | Phase 1 (merged) |
| Network policy | Restricted egress during dependency phase | Phase 5 (planned) |
| Image pinning | Digest-pinned base images, verified on each run | Phase 4 (this) |
| Rootless runtime | Required for contributed mode; refuses rootful | Phase 4 (this) |
| Owner resource ceilings | Owner limits override task requests; reject if exceeded | Phase 4 (this) |
| SHA-pinned git fetch | init→fetch→checkout→verify prevents commit substitution | Phase 4 (this) |
| Abort propagation | AbortSignal stops containers mid-execution | Phase 4 (this) |
| Dependency phase restriction | Only git-clone and npm-ci allowed in dep container | Phase 4 (this) |
| Network policy | Restricted egress during dependency phase | Phase 5 (planned) |
