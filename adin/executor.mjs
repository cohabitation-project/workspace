/**
 * executor.mjs — ADIN task step execution engine.
 *
 * Executes structured task steps by mapping each action to a fixed
 * [executable, ...args] array via child_process.execFile. NEVER uses
 * exec() or shell interpretation.
 *
 * SANDBOX NOTE:
 *   This executor runs tasks DIRECTLY on the host — no container, no sandbox.
 *   This is intentional for Phase 3 (controlled testing on our own hardware).
 *   Before running on contributed hardware, the executor MUST be wrapped in a
 *   sandbox envelope (container, VM, or OS-level sandbox). The architecture
 *   makes this straightforward: replace the execStep() function with one that
 *   runs the same [executable, ...args] array inside a container.
 *
 *   DO NOT use this executor on untrusted hardware without a sandbox.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576; // 1 MB

/**
 * Execute a full task (all steps sequentially).
 *
 * @param {object} task — the task definition (from orchestrator polling)
 * @param {object} opts
 * @param {string}   opts.workDir — temp directory for this task's execution
 * @param {function} [opts.onStep] — callback(stepIndex, action, status) for progress
 * @param {function} [opts.onProgress] — callback(stepIndex, { stdout, stderr }) for streaming
 * @param {object}   [opts.limits] — owner-imposed limits (thermal_ceiling_c, disk_floor_gb, etc.)
 * @param {AbortSignal} [opts.abortSignal] — signal to abort execution
 * @param {function} [opts.checkStop] — function returning true if STOP.txt exists
 * @param {function} [opts.execStepFn] — override for testing (dependency injection)
 * @returns {Promise<{ status, output, resources_used, steps_completed }>}
 */
export async function executeTask(task, opts = {}) {
  const {
    workDir,
    onStep,
    onProgress,
    limits = {},
    abortSignal,
    checkStop,
    execStepFn,
  } = opts;

  const steps = task.payload?.steps || [];
  if (steps.length === 0) {
    return { status: 'failed', output: { error: 'no steps in payload' }, resources_used: {}, steps_completed: 0 };
  }

  const timeoutMs = (task.constraints?.timeout_s || 600) * 1000;
  const maxOutput = task.constraints?.max_output_bytes || DEFAULT_MAX_OUTPUT_BYTES;
  const taskStart = Date.now();
  const allStdout = [];
  const allStderr = [];
  let peakMemory = 0;
  let stepsCompleted = 0;

  // The workDir is the clone target for git-clone, then the cwd for subsequent steps
  let stepCwd = workDir;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Check abort signal
    if (abortSignal?.aborted) {
      return buildResult('failed', 'aborted by signal', allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted);
    }

    // Check STOP.txt
    if (checkStop && checkStop()) {
      return buildResult('failed', 'paused by STOP.txt', allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted);
    }

    // Check elapsed time
    if (Date.now() - taskStart > timeoutMs) {
      return buildResult('failed', 'task timeout exceeded', allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted);
    }

    if (onStep) onStep(i, step.action, 'starting');

    const stepTimeout = Math.min(timeoutMs - (Date.now() - taskStart), timeoutMs);

    try {
      const execFn = execStepFn || execStep;
      const result = await execFn(step, stepCwd, stepTimeout, maxOutput);

      if (result.stdout) allStdout.push(`--- step ${i}: ${step.action} ---\n${result.stdout}`);
      if (result.stderr) allStderr.push(`--- step ${i}: ${step.action} ---\n${result.stderr}`);
      if (result.peakMemory > peakMemory) peakMemory = result.peakMemory;

      // git-clone creates a subdirectory; subsequent steps run inside it
      if (step.action === 'git-clone' && result.cloneDir) {
        stepCwd = result.cloneDir;
      }

      if (onStep) onStep(i, step.action, 'completed');
      stepsCompleted++;

      if (result.exitCode !== 0) {
        return buildResult('failed', `step ${i} (${step.action}) failed with exit code ${result.exitCode}`,
          allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted);
      }
    } catch (err) {
      allStderr.push(`--- step ${i}: ${step.action} ERROR ---\n${err.message}`);
      if (onStep) onStep(i, step.action, 'error');
      return buildResult('failed', `step ${i} (${step.action}) error: ${err.message}`,
        allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted);
    }
  }

  return buildResult('completed', null, allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted);
}

// ---- Step execution ----

/**
 * Execute a single task step. Maps action to [executable, ...args] and runs via execFile.
 *
 * @param {object} step — the step definition ({ action, repo?, commit?, files? })
 * @param {string} cwd — working directory
 * @param {number} timeoutMs — step timeout in milliseconds
 * @param {number} maxOutput — maximum output bytes to capture
 * @returns {Promise<{ exitCode, stdout, stderr, peakMemory, cloneDir? }>}
 */
export function execStep(step, cwd, timeoutMs, maxOutput) {
  switch (step.action) {
    case 'git-clone':
      return execGitClone(step, cwd, timeoutMs, maxOutput);
    case 'npm-ci':
      return execNpmCi(cwd, timeoutMs, maxOutput);
    case 'node-test':
      return execNodeTest(step, cwd, timeoutMs, maxOutput);
    case 'playwright-test':
      return execPlaywrightTest(step, cwd, timeoutMs, maxOutput);
    default:
      return Promise.reject(new Error(`unknown action: ${step.action}`));
  }
}

async function execGitClone(step, workDir, timeoutMs, maxOutput) {
  const repoUrl = `https://github.com/${step.repo}.git`;
  const cloneDir = path.join(workDir, step.repo.split('/')[1] || 'repo');

  // SHA-based clone (B4 fix): --branch doesn't accept SHAs.
  // Instead: git init → git fetch --depth 1 <url> <sha> → git checkout --detach FETCH_HEAD
  // Then verify HEAD matches the approved SHA.

  // Step 1: git init
  fs.mkdirSync(cloneDir, { recursive: true });
  const initResult = await runExecFile('git', ['init'], cloneDir, timeoutMs, maxOutput);
  if (initResult.exitCode !== 0) return { ...initResult, cloneDir };

  // Step 2: git fetch --depth 1 <url> <sha>
  const fetchResult = await runExecFile(
    'git', ['fetch', '--depth', '1', repoUrl, step.commit],
    cloneDir, timeoutMs, maxOutput
  );
  if (fetchResult.exitCode !== 0) return { ...fetchResult, cloneDir };

  // Step 3: git checkout --detach FETCH_HEAD
  const checkoutResult = await runExecFile(
    'git', ['checkout', '--detach', 'FETCH_HEAD'],
    cloneDir, timeoutMs, maxOutput
  );
  if (checkoutResult.exitCode !== 0) return { ...checkoutResult, cloneDir };

  // Step 4: verify HEAD matches the approved SHA
  const verifyResult = await runExecFile(
    'git', ['rev-parse', 'HEAD'],
    cloneDir, timeoutMs, maxOutput
  );
  const actualSha = verifyResult.stdout.trim();
  if (actualSha !== step.commit) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `SHA verification failed: HEAD is ${actualSha}, expected ${step.commit}`,
      peakMemory: 0,
      cloneDir,
    };
  }

  return {
    exitCode: 0,
    stdout: [initResult.stdout, fetchResult.stdout, checkoutResult.stdout].join('\n'),
    stderr: [initResult.stderr, fetchResult.stderr, checkoutResult.stderr].join('\n'),
    peakMemory: Math.max(initResult.peakMemory, fetchResult.peakMemory, checkoutResult.peakMemory),
    cloneDir,
  };
}

async function execNpmCi(cwd, timeoutMs, maxOutput) {
  return runExecFile('npm', ['ci', '--ignore-scripts'], cwd, timeoutMs, maxOutput);
}

async function execNodeTest(step, cwd, timeoutMs, maxOutput) {
  // Use '--' before file arguments to prevent flag injection
  return runExecFile('node', ['--test', '--', ...step.files], cwd, timeoutMs, maxOutput);
}

async function execPlaywrightTest(step, cwd, timeoutMs, maxOutput) {
  return runExecFile('npx', ['playwright', 'test', '--', ...step.files], cwd, timeoutMs, maxOutput);
}

// ---- Low-level exec wrapper ----

/**
 * Run a command via execFile (no shell). Captures stdout/stderr, enforces timeout and output limits.
 *
 * @returns {Promise<{ exitCode, stdout, stderr, peakMemory }>}
 */
function runExecFile(cmd, args, cwd, timeoutMs, maxOutput) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: maxOutput,
      // No shell: true — execFile does not use a shell by default
      env: { ...process.env, NODE_ENV: 'test' },
    }, (error, stdout, stderr) => {
      const exitCode = error ? (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? 1 : (error.code || 1)) : 0;
      resolve({
        exitCode: typeof exitCode === 'number' ? exitCode : 1,
        stdout: truncate(stdout || '', maxOutput),
        stderr: truncate(stderr || '', maxOutput),
        peakMemory: process.memoryUsage().heapUsed, // approximation — real tracking needs cgroups
      });
    });

    // If the child process is killed (timeout), we still resolve via the callback
    child.on('error', () => {
      // Already handled by the execFile callback
    });
  });
}

// ---- Helpers ----

function truncate(str, maxBytes) {
  if (Buffer.byteLength(str) <= maxBytes) return str;
  // Truncate by bytes, not characters (safe for UTF-8)
  const buf = Buffer.from(str);
  return buf.subarray(0, maxBytes).toString('utf8') + '\n... [truncated]';
}

function buildResult(status, error, allStdout, allStderr, taskStart, peakMemory, maxOutput, stepsCompleted) {
  const wallTimeMs = Date.now() - taskStart;
  const stdout = truncate(allStdout.join('\n'), maxOutput);
  const stderr = truncate(allStderr.join('\n'), maxOutput);

  return {
    status,
    output: {
      exit_code: status === 'completed' ? 0 : 1,
      stdout_truncated: stdout,
      stderr_truncated: stderr,
      structured: error ? { error } : { tests_total: 0, tests_passed: 0, tests_failed: 0, tests_skipped: 0 },
    },
    resources_used: {
      wall_time_ms: wallTimeMs,
      cpu_seconds: Math.round(wallTimeMs / 1000),
      peak_ram_bytes: peakMemory,
      peak_ram_gb: Math.round((peakMemory / (1024 ** 3)) * 1000) / 1000,
    },
    steps_completed: stepsCompleted,
  };
}
