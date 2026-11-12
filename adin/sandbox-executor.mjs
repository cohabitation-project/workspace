/**
 * sandbox-executor.mjs — Sandboxed task executor for ADIN.
 *
 * Contributed-node workers MUST use executeSandboxed(). The bare executor
 * from executor.mjs is for controlled local testing only.
 *
 * SAFETY INVARIANT: If no container runtime is available, this module
 * refuses to run. It does NOT fall back to bare execution.
 *
 * Execution modes:
 *   - 'sandboxed' (default for contributed nodes): executeSandboxed() is the
 *     only execution path. SandboxUnavailableError if no runtime is found.
 *   - 'development' (local testing only): allows bare execution via executor.mjs.
 *     Never used on contributed hardware.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectRuntime, ensureImage, createSandbox, translateStep, verifyImage } from './sandbox.mjs';
import { validateSteps } from './protocol.mjs';

/** Default resource limits when task specifies none (Issue 3). */
const DEFAULT_LIMITS = {
  max_ram_gb: 2,
  max_cpus: 2,
  max_pids: 256,
};

/**
 * Execution mode constants (Issue 1).
 * 'sandboxed' = contributed-node mode (default), sandbox is mandatory.
 * 'development' = local testing only, bare execution allowed.
 */
export const EXECUTION_MODES = {
  SANDBOXED: 'sandboxed',
  DEVELOPMENT: 'development',
};

/**
 * Execute a task inside a container sandbox.
 *
 * @param {object} task - The task definition from the orchestrator
 * @param {object} [opts]
 * @param {string} [opts.workRoot] - Root directory for task work dirs (default: /tmp/adin-work)
 * @param {string} [opts.image] - Override sandbox image
 * @param {string} [opts.executionMode] - 'sandboxed' (default) or 'development' (Issue 1)
 * @param {object} [opts.ownerLimits] - Owner resource ceilings (Issue 3)
 * @param {number} [opts.ownerLimits.max_ram_gb] - Max RAM in GB
 * @param {number} [opts.ownerLimits.max_cpus] - Max CPUs
 * @param {number} [opts.ownerLimits.max_pids] - Max PIDs
 * @param {AbortSignal} [opts.abortSignal] - Signal to abort execution (Issue 4)
 * @param {boolean} [opts.requireRootless] - Require rootless runtime (Issue 6, default true in sandboxed mode)
 * @param {string} [opts.dataDir] - Data directory for image digest storage (Issue 6)
 * @param {boolean} [opts.restrictedDeps] - Only allow git-clone and npm-ci in dep phase (Issue 7)
 * @param {boolean} [opts._testMode] - Enable test-only features (Issue 5)
 * @param {object} [opts.runtimeOverride] - Skip detection (only in _testMode, Issue 5)
 * @returns {Promise<object>} { status, output, steps_completed, resources_used }
 */
export async function executeSandboxed(task, opts = {}) {
  const workRoot = opts.workRoot || '/tmp/adin-work';
  const startTime = Date.now();
  const executionMode = opts.executionMode || EXECUTION_MODES.SANDBOXED;
  const abortSignal = opts.abortSignal;

  // Issue 4: Check abort before starting
  if (abortSignal?.aborted) {
    throw new Error('execution aborted before start');
  }

  // Issue 1: In sandboxed mode, this is the ONLY execution path
  if (executionMode === EXECUTION_MODES.SANDBOXED) {
    // No fallback to bare execution is possible in this mode
  }

  // Issue 5: runtimeOverride only works in _testMode
  let rt;
  if (opts._testMode && opts.runtimeOverride) {
    rt = opts.runtimeOverride;
  } else {
    // In production mode (no _testMode), always call detectRuntime() fresh
    rt = await detectRuntime();
  }

  if (!rt.available) {
    // SAFETY: refuse to run without sandbox. Never fall back to bare execution.
    throw new SandboxUnavailableError(
      'No container runtime (Docker or Podman) available. ' +
      'ADIN refuses to execute tasks without a sandbox on contributed hardware.'
    );
  }

  // Issue 6: Require rootless for contributed mode (default true in sandboxed mode)
  const requireRootless = opts.requireRootless ?? (executionMode === EXECUTION_MODES.SANDBOXED);
  if (requireRootless && !rt.rootless) {
    throw new SandboxUnavailableError(
      'Container runtime is not running in rootless mode. ' +
      'Contributed-node workers require rootless Docker/Podman for security. ' +
      'See https://docs.docker.com/engine/security/rootless/ for setup instructions.'
    );
  }

  // 2. Ensure sandbox image exists
  const image = opts.image || await ensureImage(rt.runtime);

  // Issue 6: Verify image digest if dataDir is provided
  if (opts.dataDir) {
    const digestCheck = await verifyImage(rt.runtime, opts.dataDir);
    if (!digestCheck.verified) {
      throw new SandboxUnavailableError(digestCheck.error);
    }
  }

  // Issue 4: Check abort after image setup
  if (abortSignal?.aborted) {
    throw new Error('execution aborted during setup');
  }

  // 3. Validate task steps
  if (!task.payload?.steps || !Array.isArray(task.payload.steps)) {
    return {
      status: 'failed',
      output: { error: 'task has no steps' },
      steps_completed: [],
      resources_used: { wall_time_ms: Date.now() - startTime },
    };
  }

  const validation = validateSteps(task.payload.steps);
  if (!validation.valid) {
    return {
      status: 'failed',
      output: { error: `step validation failed: ${validation.errors.join(', ')}` },
      steps_completed: [],
      resources_used: { wall_time_ms: Date.now() - startTime },
    };
  }

  // 4. Create task work directory
  const taskWorkDir = join(workRoot, task.id || `task-${Date.now()}`);
  mkdirSync(taskWorkDir, { recursive: true });

  // 5. Separate steps into dependency (network) and execution (no network) phases
  const depActions = new Set(['git-clone', 'npm-ci']);
  const depSteps = task.payload.steps.filter(s => depActions.has(s.action));
  const execSteps = task.payload.steps.filter(s => !depActions.has(s.action));

  // Issue 7: In restrictedDeps mode, verify only dep actions appear in dep steps
  // (This is already enforced by the filter, but also reject if non-dep steps exist
  //  and restrictedDeps is set — future-proofing for mixed phase logic)
  const restrictedDeps = opts.restrictedDeps ?? true; // default on

  // Issue 3: Derive effective resource limits from task constraints AND owner ceilings
  const ownerLimits = opts.ownerLimits || {};
  const taskRamGb = task.constraints?.max_ram_gb || task.requirements?.ram_gb_min || null;
  const taskCpus = task.constraints?.max_cpus || null;
  const taskPids = task.constraints?.max_pids || null;

  // Use defaults when task doesn't specify (Issue 3: never unlimited)
  const requestedRam = taskRamGb || DEFAULT_LIMITS.max_ram_gb;
  const requestedCpus = taskCpus || DEFAULT_LIMITS.max_cpus;
  const requestedPids = taskPids || DEFAULT_LIMITS.max_pids;

  const ownerRam = ownerLimits.max_ram_gb || Infinity;
  const ownerCpus = ownerLimits.max_cpus || Infinity;
  const ownerPids = ownerLimits.max_pids || Infinity;

  // Issue 3: If the task requests MORE than the owner allows, reject (not silently clamp)
  if (taskRamGb && ownerLimits.max_ram_gb && taskRamGb > ownerLimits.max_ram_gb) {
    return {
      status: 'failed',
      output: {
        error: `task requests ${taskRamGb}GB RAM but owner ceiling is ${ownerLimits.max_ram_gb}GB`,
        code: 'OWNER_LIMIT_EXCEEDED',
      },
      steps_completed: [],
      resources_used: { wall_time_ms: Date.now() - startTime },
    };
  }
  if (taskCpus && ownerLimits.max_cpus && taskCpus > ownerLimits.max_cpus) {
    return {
      status: 'failed',
      output: {
        error: `task requests ${taskCpus} CPUs but owner ceiling is ${ownerLimits.max_cpus}`,
        code: 'OWNER_LIMIT_EXCEEDED',
      },
      steps_completed: [],
      resources_used: { wall_time_ms: Date.now() - startTime },
    };
  }
  if (taskPids && ownerLimits.max_pids && taskPids > ownerLimits.max_pids) {
    return {
      status: 'failed',
      output: {
        error: `task requests ${taskPids} PIDs but owner ceiling is ${ownerLimits.max_pids}`,
        code: 'OWNER_LIMIT_EXCEEDED',
      },
      steps_completed: [],
      resources_used: { wall_time_ms: Date.now() - startTime },
    };
  }

  // Effective limits = minimum of task request and owner ceiling
  const effectiveRam = Math.min(requestedRam, ownerRam);
  const effectiveCpus = Math.min(requestedCpus, ownerCpus);
  const effectivePids = Math.min(requestedPids, ownerPids);

  const limits = {
    memory: `${effectiveRam}g`,
    cpus: effectiveCpus,
    pidsLimit: effectivePids,
  };

  const timeoutMs = (task.constraints?.timeout_s || 600) * 1000;
  const stepTimeout = Math.floor(timeoutMs / task.payload.steps.length);

  const stepsCompleted = [];
  let finalStatus = 'completed';
  let finalOutput = {};

  // 6. Dependency phase — network enabled
  let depSandbox = null;
  if (depSteps.length > 0) {
    depSandbox = createSandbox({
      runtime: rt.runtime,
      image,
      workDir: taskWorkDir,
      limits,
      networkPhase: 'dependency',
      abortSignal, // Issue 4
    });

    try {
      await depSandbox.init();

      for (const step of depSteps) {
        // Issue 4: Check abort before each step
        if (abortSignal?.aborted) {
          finalStatus = 'failed';
          finalOutput = { error: 'execution aborted' };
          break;
        }

        // Issue 7: In restrictedDeps mode, only allow git-clone and npm-ci
        if (restrictedDeps && !depActions.has(step.action)) {
          finalStatus = 'failed';
          finalOutput = {
            error: `step action '${step.action}' is not allowed in dependency phase (restrictedDeps)`,
            code: 'RESTRICTED_DEPS_VIOLATION',
          };
          break;
        }

        // Issue 2: Handle git-clone as a multi-step SHA-pinned sequence
        if (step.action === 'git-clone') {
          const repoDir = step.repo.split('/')[1];
          const url = `https://github.com/${step.repo}.git`;
          const sha = step.commit;

          // Step 1: git init
          const initResult = await depSandbox.execStep(
            { action: '_raw', _internal: true, executable: 'git', args: ['init', repoDir] },
            '',
            30_000,
          );
          stepsCompleted.push({ action: 'git-init', exitCode: initResult.exitCode, timedOut: initResult.timedOut });
          if (initResult.exitCode !== 0) {
            finalStatus = 'failed';
            finalOutput = { error: `git init failed`, stderr: (initResult.stderr || '').slice(-2000) };
            break;
          }

          // Step 2: git fetch --depth 1 <url> <sha>
          const fetchResult = await depSandbox.execStep(
            { action: '_raw', _internal: true, executable: 'git', args: ['fetch', '--depth', '1', url, sha] },
            repoDir,
            stepTimeout,
          );
          stepsCompleted.push({ action: 'git-fetch', exitCode: fetchResult.exitCode, timedOut: fetchResult.timedOut });
          if (fetchResult.exitCode !== 0) {
            finalStatus = 'failed';
            finalOutput = { error: `git fetch failed for ${sha}`, stderr: (fetchResult.stderr || '').slice(-2000) };
            break;
          }

          // Step 3: git checkout --detach FETCH_HEAD
          const checkoutResult = await depSandbox.execStep(
            { action: '_raw', _internal: true, executable: 'git', args: ['checkout', '--detach', 'FETCH_HEAD'] },
            repoDir,
            30_000,
          );
          stepsCompleted.push({ action: 'git-checkout', exitCode: checkoutResult.exitCode, timedOut: checkoutResult.timedOut });
          if (checkoutResult.exitCode !== 0) {
            finalStatus = 'failed';
            finalOutput = { error: `git checkout FETCH_HEAD failed`, stderr: (checkoutResult.stderr || '').slice(-2000) };
            break;
          }

          // Step 4: Verify HEAD matches the approved SHA
          const verifyResult = await depSandbox.execStep(
            { action: '_raw', _internal: true, executable: 'git', args: ['rev-parse', 'HEAD'] },
            repoDir,
            10_000,
          );
          stepsCompleted.push({ action: 'git-verify-sha', exitCode: verifyResult.exitCode, timedOut: verifyResult.timedOut });
          if (verifyResult.exitCode !== 0) {
            finalStatus = 'failed';
            finalOutput = { error: 'git rev-parse HEAD failed', stderr: (verifyResult.stderr || '').slice(-2000) };
            break;
          }

          const actualSha = (verifyResult.stdout || '').trim();
          if (actualSha !== sha) {
            finalStatus = 'failed';
            finalOutput = {
              error: `SHA verification failed: expected ${sha}, got ${actualSha}`,
              code: 'SHA_MISMATCH',
            };
            break;
          }

          stepsCompleted.push({ action: 'git-clone', exitCode: 0, timedOut: false, sha_verified: true });
          continue; // skip the generic step handling below
        }

        // For npm-ci, cwd is the cloned repo
        let cwd = '';
        if (step.action === 'npm-ci') {
          const cloneStep = depSteps.find(s => s.action === 'git-clone');
          if (cloneStep) cwd = cloneStep.repo.split('/')[1];
        }

        const result = await depSandbox.execStep(step, cwd, stepTimeout);
        stepsCompleted.push({
          action: step.action,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          stdout_tail: (result.stdout || '').slice(-2000),
          stderr_tail: (result.stderr || '').slice(-2000),
        });

        if (result.exitCode !== 0) {
          finalStatus = 'failed';
          finalOutput = {
            error: `step ${step.action} failed with exit code ${result.exitCode}`,
            stderr: (result.stderr || '').slice(-2000),
          };
          break;
        }
      }
    } finally {
      await depSandbox.cleanup();
    }
  }

  // 7. Execution phase — network disabled
  if (finalStatus === 'completed' && execSteps.length > 0) {
    // Issue 4: Check abort before execution phase
    if (abortSignal?.aborted) {
      return {
        status: 'failed',
        output: { error: 'execution aborted before test phase' },
        steps_completed: stepsCompleted,
        resources_used: { wall_time_ms: Date.now() - startTime, sandbox: true, runtime: rt.runtime, image },
      };
    }

    const execSandbox = createSandbox({
      runtime: rt.runtime,
      image,
      workDir: taskWorkDir,
      limits,
      networkPhase: 'execution',
      abortSignal, // Issue 4
    });

    try {
      await execSandbox.init();

      // Determine the repo directory for execution
      const cloneStep = task.payload.steps.find(s => s.action === 'git-clone');
      const repoCwd = cloneStep ? cloneStep.repo.split('/')[1] : '';

      for (const step of execSteps) {
        // Issue 4: Check abort before each step
        if (abortSignal?.aborted) {
          finalStatus = 'failed';
          finalOutput = { error: 'execution aborted' };
          break;
        }

        // Issue 7: exec steps should not be dep actions
        if (restrictedDeps && depActions.has(step.action)) {
          finalStatus = 'failed';
          finalOutput = {
            error: `step action '${step.action}' belongs in dependency phase, not execution phase`,
            code: 'RESTRICTED_DEPS_VIOLATION',
          };
          break;
        }

        const result = await execSandbox.execStep(step, repoCwd, stepTimeout);
        stepsCompleted.push({
          action: step.action,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          stdout_tail: (result.stdout || '').slice(-2000),
          stderr_tail: (result.stderr || '').slice(-2000),
        });

        if (result.exitCode !== 0) {
          finalStatus = 'failed';
          finalOutput = {
            error: `step ${step.action} failed with exit code ${result.exitCode}`,
            stderr: (result.stderr || '').slice(-2000),
            stdout: (result.stdout || '').slice(-2000),
          };
          break;
        }
      }

      if (finalStatus === 'completed') {
        // Grab last step output as the task result
        const lastStep = stepsCompleted[stepsCompleted.length - 1];
        finalOutput = {
          summary: `All ${stepsCompleted.length} steps completed successfully`,
          last_step_stdout: lastStep?.stdout_tail || '',
        };
      }
    } finally {
      await execSandbox.cleanup();
    }
  }

  return {
    status: finalStatus,
    output: finalOutput,
    steps_completed: stepsCompleted,
    resources_used: {
      wall_time_ms: Date.now() - startTime,
      sandbox: true,
      runtime: rt.runtime,
      image,
      effective_limits: {
        ram_gb: effectiveRam,
        cpus: effectiveCpus,
        pids: effectivePids,
      },
    },
  };
}

/**
 * Custom error for missing container runtime or security violations.
 * Workers should check for this and report clearly — never fall back.
 */
export class SandboxUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SandboxUnavailableError';
    this.code = 'SANDBOX_UNAVAILABLE';
  }
}
