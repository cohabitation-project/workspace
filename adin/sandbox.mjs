/**
 * sandbox.mjs — Container-based sandbox for ADIN task execution.
 *
 * Wraps task step execution inside a Docker/Podman container. Each task gets a fresh,
 * isolated container that is destroyed after completion.
 *
 * Security layers enforced by the container runtime (not self-reported):
 *   - Filesystem isolation: only the task work directory is mounted
 *   - Network isolation: disabled during test execution (--network=none)
 *   - Resource limits: memory, CPU, PIDs enforced by cgroups
 *   - Read-only root filesystem
 *   - No privileged mode, no added capabilities
 *
 * Uses Docker/Podman CLI via child_process.execFile — never shell.
 */

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';

const execFile = promisify(execFileCb);

/** Default sandbox image — node:22-slim with git pre-installed. */
const DEFAULT_IMAGE = 'node:22-slim';

/** Dockerfile content to build the sandbox image with git. */
const SANDBOX_DOCKERFILE = `FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /work && chown node:node /work
WORKDIR /work
`;

/** The tag we use for our custom sandbox image. */
const SANDBOX_IMAGE_TAG = 'adin-sandbox:latest';

// ---- Runtime detection ----

/**
 * Detect available container runtime.
 * Returns { available, runtime, version, rootless }.
 */
export async function detectRuntime() {
  for (const candidate of ['docker', 'podman']) {
    try {
      const { stdout } = await execFile(candidate, ['version', '--format', '{{.Client.Version}}'], {
        timeout: 10_000,
      });
      const version = stdout.trim();
      if (!version) continue;

      // Check if rootless
      let rootless = false;
      try {
        const { stdout: infoOut } = await execFile(candidate, ['info', '--format', '{{.SecurityOptions}}'], {
          timeout: 10_000,
        });
        rootless = infoOut.includes('rootless');
      } catch {
        // info format may differ; not critical
      }

      return { available: true, runtime: candidate, version, rootless };
    } catch {
      continue;
    }
  }

  return { available: false, runtime: null, version: null, rootless: false };
}

// ---- Image management ----

/**
 * Ensure the sandbox image exists locally. Build it if not present.
 * @param {string} runtime - 'docker' or 'podman'
 * @returns {Promise<string>} The image tag to use
 */
export async function ensureImage(runtime) {
  // Check if our custom image already exists
  try {
    await execFile(runtime, ['image', 'inspect', SANDBOX_IMAGE_TAG], { timeout: 15_000 });
    return SANDBOX_IMAGE_TAG;
  } catch {
    // Image doesn't exist — build it
  }

  // Pull base image first
  try {
    await execFile(runtime, ['pull', DEFAULT_IMAGE], { timeout: 120_000 });
  } catch (err) {
    // If pull fails, check if image is already available locally
    try {
      await execFile(runtime, ['image', 'inspect', DEFAULT_IMAGE], { timeout: 15_000 });
    } catch {
      throw new Error(`Failed to pull base image ${DEFAULT_IMAGE}: ${err.message}`);
    }
  }

  // Build the sandbox image using stdin Dockerfile
  const buildArgs = ['build', '-t', SANDBOX_IMAGE_TAG, '-f', '-', '.'];
  await new Promise((resolve, reject) => {
    const proc = execFileCb(runtime, buildArgs, {
      timeout: 120_000,
      cwd: '/tmp',
    }, (err, stdout, stderr) => {
      if (err) reject(new Error(`Failed to build sandbox image: ${err.message}\n${stderr}`));
      else resolve(stdout);
    });
    proc.stdin.write(SANDBOX_DOCKERFILE);
    proc.stdin.end();
  });

  return SANDBOX_IMAGE_TAG;
}

// ---- Image digest pinning (Issue 6) ----

const DIGEST_FILENAME = 'sandbox-image-digest.json';

/**
 * Get the image digest (ID) for the current sandbox image.
 * @param {string} runtime - 'docker' or 'podman'
 * @returns {Promise<string>} The image digest (sha256:...)
 */
export async function getImageDigest(runtime) {
  const { stdout } = await execFile(runtime, [
    'image', 'inspect', '--format', '{{.Id}}', SANDBOX_IMAGE_TAG,
  ], { timeout: 15_000 });
  return stdout.trim();
}

/**
 * Store the expected image digest to a file.
 * @param {string} dataDir - Directory to store the digest file
 * @param {string} digest - The image digest to store
 */
export function storeImageDigest(dataDir, digest) {
  mkdirSync(dataDir, { recursive: true });
  const filePath = join(dataDir, DIGEST_FILENAME);
  writeFileSync(filePath, JSON.stringify({ digest, stored_at: new Date().toISOString() }));
}

/**
 * Load the expected image digest from file.
 * @param {string} dataDir - Directory where the digest file is stored
 * @returns {string|null} The stored digest, or null if not found
 */
export function loadImageDigest(dataDir) {
  const filePath = join(dataDir, DIGEST_FILENAME);
  if (!existsSync(filePath)) return null;
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    return data.digest || null;
  } catch {
    return null;
  }
}

/**
 * Verify the sandbox image digest matches the expected digest.
 * If no expected digest is stored yet, store the current one.
 * If the digest doesn't match, refuse to run (image was replaced).
 *
 * @param {string} runtime - 'docker' or 'podman'
 * @param {string} dataDir - Directory for digest storage
 * @returns {Promise<{ verified: boolean, digest: string, error?: string }>}
 */
export async function verifyImage(runtime, dataDir) {
  const currentDigest = await getImageDigest(runtime);
  const storedDigest = loadImageDigest(dataDir);

  if (!storedDigest) {
    // First run — store the digest
    storeImageDigest(dataDir, currentDigest);
    return { verified: true, digest: currentDigest };
  }

  if (currentDigest !== storedDigest) {
    return {
      verified: false,
      digest: currentDigest,
      error: `Image digest mismatch: expected ${storedDigest}, got ${currentDigest}. ` +
        'The sandbox image may have been tampered with. Remove the digest file to re-pin.',
    };
  }

  return { verified: true, digest: currentDigest };
}

// ---- Sandbox creation ----

/**
 * Create a container-based sandbox for task execution.
 *
 * @param {object} opts
 * @param {string} opts.runtime - 'docker' or 'podman'
 * @param {string} [opts.image] - Container image to use (default: adin-sandbox:latest)
 * @param {string} opts.workDir - Host path to mount as /work (read-write)
 * @param {object} [opts.limits] - Resource limits
 * @param {string} [opts.limits.memory] - Memory limit (e.g., '512m', '2g')
 * @param {number} [opts.limits.cpus] - CPU limit (e.g., 1.0, 2.0)
 * @param {number} [opts.limits.pidsLimit] - Max PIDs (default: 256)
 * @param {string} [opts.networkPhase] - 'dependency' (network on) or 'execution' (network off)
 * @param {AbortSignal} [opts.abortSignal] - Signal to abort sandbox operations (Issue 4)
 * @returns {{ execStep, cleanup, id, containerId }}
 */
export function createSandbox(opts) {
  const {
    runtime,
    image = SANDBOX_IMAGE_TAG,
    workDir,
    limits = {},
    networkPhase = 'execution',
    abortSignal,
  } = opts;

  if (!runtime) throw new Error('runtime is required');
  if (!workDir) throw new Error('workDir is required');

  const id = `adin-sandbox-${crypto.randomBytes(6).toString('hex')}`;
  let containerId = null;
  let started = false;
  let cleaned = false;

  // Issue 4: Check abort signal helper
  function checkAbort() {
    if (abortSignal?.aborted) {
      throw new Error('sandbox operation aborted');
    }
  }

  // Issue 4: Set up abort listener
  if (abortSignal) {
    const onAbort = () => {
      cleanup().catch(() => {});
    };
    if (abortSignal.aborted) {
      // Already aborted
    } else {
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }
  }

  // ---- Build container create args ----

  function buildCreateArgs() {
    const args = ['create'];

    // Name for easy identification
    args.push('--name', id);

    // Resource limits
    if (limits.memory) {
      args.push('--memory', limits.memory);
      // Also set memory-swap equal to memory to prevent swap usage
      args.push('--memory-swap', limits.memory);
    }
    if (limits.cpus) {
      args.push('--cpus', String(limits.cpus));
    }
    args.push('--pids-limit', String(limits.pidsLimit || 256));

    // Read-only root filesystem
    args.push('--read-only');

    // Mount the work directory (read-write)
    args.push('-v', `${workDir}:/work:rw`);

    // Writable tmpfs for /tmp inside the container (some tools need it)
    args.push('--tmpfs', '/tmp:rw,noexec,nosuid,size=256m');

    // Network isolation
    if (networkPhase === 'execution') {
      args.push('--network', 'none');
    }
    // For 'dependency' phase, use default (bridge) network with explicit DNS.
    // Issue 7: Add --dns to prevent DNS poisoning from the host during dep phase.
    // Phase 5 should add iptables-based egress filtering to restrict to
    // github.com and registry.npmjs.org only.
    if (networkPhase === 'dependency') {
      args.push('--dns', '8.8.8.8');
    }

    // Security: no privileged mode, drop all capabilities, add only what's needed
    args.push('--security-opt', 'no-new-privileges');
    args.push('--cap-drop', 'ALL');

    // Working directory
    args.push('-w', '/work');

    // Use the image with a long-running idle process to keep container alive
    args.push(image, 'sleep', '86400');

    return args;
  }

  // ---- Create and start the container ----

  async function init() {
    if (started) return;
    checkAbort(); // Issue 4

    const createArgs = buildCreateArgs();
    const { stdout } = await execFile(runtime, createArgs, { timeout: 30_000 });
    containerId = stdout.trim();
    if (!containerId) throw new Error('container creation returned empty ID');

    checkAbort(); // Issue 4: check after container create, before start

    // Start the container
    await execFile(runtime, ['start', containerId], { timeout: 30_000 });
    started = true;
  }

  // ---- Execute a step inside the container ----

  /**
   * Execute a step inside the sandbox container.
   * Drop-in replacement for executor's execStepFn.
   *
   * @param {object} step - The step definition (from protocol.mjs)
   * @param {string} cwd - Working directory relative to /work (e.g., 'repo-name')
   * @param {number} timeoutMs - Maximum execution time in ms
   * @param {number} [maxOutput=1048576] - Maximum output bytes
   * @returns {{ exitCode, stdout, stderr, timedOut }}
   */
  async function execStep(step, cwd, timeoutMs, maxOutput = 1_048_576) {
    if (!started) await init();
    if (cleaned) throw new Error('sandbox has been cleaned up');
    checkAbort(); // Issue 4: check before each step

    // Translate step to executable + args
    const { executable, args: stepArgs } = translateStep(step);

    // Build docker exec command
    const execArgs = ['exec'];

    // Set working directory inside container
    const containerCwd = cwd ? `/work/${cwd}` : '/work';
    execArgs.push('-w', containerCwd);

    // Add the container and command
    execArgs.push(containerId, executable, ...stepArgs);

    const startTime = Date.now();
    let timedOut = false;

    try {
      const { stdout: out, stderr: err } = await execFile(runtime, execArgs, {
        timeout: timeoutMs,
        maxBuffer: maxOutput,
        env: { ...process.env }, // execFile needs env for the docker CLI itself
      });

      checkAbort(); // Issue 4: check after each step
      return {
        exitCode: 0,
        stdout: out,
        stderr: err,
        timedOut: false,
      };
    } catch (err) {
      timedOut = err.killed || (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER');

      // If timeout, try to get partial output
      return {
        exitCode: err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? -1 : (err.status ?? err.code ?? 1),
        stdout: err.stdout || '',
        stderr: err.stderr || '',
        timedOut,
      };
    }
  }

  // ---- Cleanup: stop and remove container ----

  async function cleanup() {
    if (cleaned) return;
    cleaned = true;

    if (!containerId && !started) return;

    const name = containerId || id;

    try {
      // Issue 4: Fast kill (2 second grace) when aborting mid-execution
      const stopTimeout = abortSignal?.aborted ? '2' : '5';
      await execFile(runtime, ['stop', '-t', stopTimeout, name], { timeout: 15_000 });
    } catch {
      // Container may already be stopped
    }

    try {
      // Remove the container and its volumes
      await execFile(runtime, ['rm', '-f', '-v', name], { timeout: 15_000 });
    } catch {
      // Best effort
    }
  }

  return {
    id,
    get containerId() { return containerId; },
    get started() { return started; },
    init,
    execStep,
    cleanup,
  };
}

// ---- Step translation ----

/**
 * Translate a protocol step to a container-executable command.
 * Returns { executable, args }.
 *
 * NOTE: git-clone is NOT handled here. It requires a multi-step sequence
 * (init, fetch, checkout, verify) for SHA pinning security (Issue 2).
 * The sandbox-executor handles git-clone directly.
 *
 * The special '_raw' action passes executable+args directly and is only
 * callable from sandbox-executor internals, not from external callers.
 */
export function translateStep(step) {
  switch (step.action) {
    case '_raw': {
      // Internal action for sandbox-executor multi-step sequences.
      // Passes executable+args directly. Only sandbox-executor should use this.
      if (!step._internal) {
        throw new Error('_raw action is internal-only; set _internal:true from sandbox-executor');
      }
      return {
        executable: step.executable,
        args: step.args || [],
      };
    }
    case 'git-checkout': {
      // Separate step for checking out the pinned commit after clone
      return {
        executable: 'git',
        args: ['checkout', step.commit],
      };
    }
    case 'npm-ci': {
      return {
        executable: 'npm',
        args: ['ci', '--ignore-scripts'],
      };
    }
    case 'node-test': {
      return {
        executable: 'node',
        args: ['--test', '--', ...step.files],
      };
    }
    case 'playwright-test': {
      return {
        executable: 'npx',
        args: ['playwright', 'test', '--', ...step.files],
      };
    }
    default:
      throw new Error(`unknown step action: ${step.action}`);
  }
}

/**
 * Create a two-phase sandbox: one for dependency installation (network on),
 * one for execution (network off), sharing the same work directory.
 *
 * @param {object} opts - Same as createSandbox but without networkPhase
 * @returns {{ depSandbox, execSandbox, cleanup }}
 */
export function createTwoPhase(opts) {
  const depSandbox = createSandbox({ ...opts, networkPhase: 'dependency' });
  const execSandbox = createSandbox({ ...opts, networkPhase: 'execution' });

  async function cleanup() {
    await depSandbox.cleanup();
    await execSandbox.cleanup();
  }

  return { depSandbox, execSandbox, cleanup };
}
