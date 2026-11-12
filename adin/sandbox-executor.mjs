/**
 * sandbox-executor.mjs — Sandboxed task executor for ADIN.
 *
 * Wraps the task execution pipeline inside a container sandbox.
 * This is the function workers use when running on contributed hardware.
 *
 * SAFETY INVARIANT: If no container runtime is available, this module
 * refuses to run. It does NOT fall back to bare execution.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { detectRuntime, ensureImage, createSandbox, translateStep } from './sandbox.mjs';
import { validateSteps } from './protocol.mjs';

/**
 * Execute a task inside a container sandbox.
 *
 * @param {object} task - The task definition from the orchestrator
 * @param {object} [opts]
 * @param {string} [opts.workRoot] - Root directory for task work dirs (default: /tmp/adin-work)
 * @param {object} [opts.runtimeOverride] - Skip detection, use this runtime info
 * @param {string} [opts.image] - Override sandbox image
 * @returns {Promise<object>} Same shape as executeTask(): { status, output, steps_completed, resources_used }
 */
export async function executeSandboxed(task, opts = {}) {
  const workRoot = opts.workRoot || '/tmp/adin-work';
  const startTime = Date.now();

  // 1. Detect container runtime
  const rt = opts.runtimeOverride || await detectRuntime();
  if (!rt.available) {
    // SAFETY: refuse to run without sandbox. Never fall back to bare execution.
    throw new SandboxUnavailableError(
      'No container runtime (Docker or Podman) available. ' +
      'ADIN refuses to execute tasks without a sandbox on contributed hardware.'
    );
  }

  // 2. Ensure sandbox image exists
  const image = opts.image || await ensureImage(rt.runtime);

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

  // Derive resource limits from task constraints and requirements
  const limits = {
    memory: task.constraints?.max_ram || task.requirements?.ram_gb_min
      ? `${task.requirements?.ram_gb_min || 2}g`
      : '2g',
    cpus: task.constraints?.max_cpus || 2,
    pidsLimit: task.constraints?.max_pids || 256,
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
    });

    try {
      await depSandbox.init();

      for (const step of depSteps) {
        // For git-clone, cwd is /work; for npm-ci, cwd is the cloned repo
        let cwd = '';
        if (step.action === 'npm-ci') {
          // Find the repo name from a preceding git-clone step
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

        // After git-clone, checkout the pinned commit
        if (step.action === 'git-clone' && step.commit) {
          const checkoutResult = await depSandbox.execStep(
            { action: 'git-checkout', commit: step.commit },
            step.repo.split('/')[1],
            30_000,
          );
          stepsCompleted.push({
            action: 'git-checkout',
            exitCode: checkoutResult.exitCode,
            timedOut: checkoutResult.timedOut,
          });
          if (checkoutResult.exitCode !== 0) {
            finalStatus = 'failed';
            finalOutput = {
              error: `git checkout ${step.commit} failed`,
              stderr: (checkoutResult.stderr || '').slice(-2000),
            };
            break;
          }
        }
      }
    } finally {
      await depSandbox.cleanup();
    }
  }

  // 7. Execution phase — network disabled
  if (finalStatus === 'completed' && execSteps.length > 0) {
    const execSandbox = createSandbox({
      runtime: rt.runtime,
      image,
      workDir: taskWorkDir,
      limits,
      networkPhase: 'execution',
    });

    try {
      await execSandbox.init();

      // Determine the repo directory for execution
      const cloneStep = task.payload.steps.find(s => s.action === 'git-clone');
      const repoCwd = cloneStep ? cloneStep.repo.split('/')[1] : '';

      for (const step of execSteps) {
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
    },
  };
}

/**
 * Custom error for missing container runtime.
 * Workers should check for this and report clearly — never fall back.
 */
export class SandboxUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SandboxUnavailableError';
    this.code = 'SANDBOX_UNAVAILABLE';
  }
}
