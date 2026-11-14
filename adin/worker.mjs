/**
 * worker.mjs — ADIN node worker process.
 *
 * A standalone Node.js application that:
 *   1. Reads config from adin-worker.json in its working directory
 *   2. Enrolls (first run) or authenticates (subsequent runs)
 *   3. Runs a main loop: heartbeat, poll for tasks, execute, submit results
 *   4. Handles SIGINT/SIGTERM gracefully
 *   5. Checks STOP.txt and owner-imposed limits before each step
 *
 * Usage:
 *   node adin/worker.mjs [config-dir]
 *
 * For testing, use the createWorker() factory:
 *   import { createWorker } from './worker.mjs';
 *   const worker = createWorker({ configDir, executor, ... });
 *   await worker.start();
 *   await worker.stop();
 *
 * SANDBOX NOTE:
 *   This worker runs tasks DIRECTLY on the host — no sandbox. It is designed for
 *   controlled testing on our own hardware only. Before running on contributed
 *   hardware, the executor must be wrapped in a sandbox (see executor.mjs).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectCapabilities, detectLoad } from './capabilities.mjs';
import { executeTask } from './executor.mjs';

const CONFIG_FILE = 'adin-worker.json';
const STATE_FILE = 'adin-worker-state.json';
const STOP_FILE = 'STOP.txt';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Create a worker instance with lifecycle methods.
 *
 * @param {object} opts
 * @param {string}   opts.configDir — directory containing config + state files
 * @param {object}   [opts.config] — override config (instead of reading from disk)
 * @param {function} [opts.executor] — override executeTask for testing (dependency injection)
 * @param {function} [opts.fetchFn] — override fetch for testing
 * @param {function} [opts.log] — logging function (default: console.log)
 * @returns {{ start, stop, state, isRunning }}
 */
export function createWorker(opts = {}) {
  const configDir = opts.configDir || process.cwd();
  const log = opts.log || console.log;
  const fetchFn = opts.fetchFn || globalThis.fetch;
  const executorFn = opts.executor || executeTask;

  let config = opts.config || null;
  let state = { node_id: null, secret: null };
  let sessionToken = null;
  let running = false;
  let loopTimer = null;
  let abortController = null;
  let lastHeartbeat = 0;
  let currentTaskId = null;
  let runningTasks = new Set();

  // ---- Config + State I/O ----

  function loadConfig() {
    if (config) return config;
    const filePath = path.join(configDir, CONFIG_FILE);
    try {
      config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return config;
    } catch (err) {
      throw new Error(`Cannot read worker config from ${filePath}: ${err.message}`);
    }
  }

  function loadState() {
    const filePath = path.join(configDir, STATE_FILE);
    try {
      state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return true;
    } catch {
      return false; // first run — no saved state
    }
  }

  function saveState() {
    const filePath = path.join(configDir, STATE_FILE);
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  function stopFileExists() {
    try {
      fs.accessSync(path.join(configDir, STOP_FILE));
      return true;
    } catch {
      return false;
    }
  }

  // ---- HTTP helpers ----

  async function workerRequest(method, urlPath, body, token) {
    const cfg = loadConfig();
    const url = `${cfg.orchestrator_url}${urlPath}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fetchOpts = { method, headers };
    if (body) fetchOpts.body = JSON.stringify(body);

    const res = await fetchFn(url, fetchOpts);
    const data = await res.json();
    return { status: res.status, data };
  }

  // ---- Enrollment + Authentication ----

  async function enroll() {
    const cfg = loadConfig();
    log('[worker] First run — enrolling with orchestrator...');

    // Detect capabilities (or use config overrides)
    const capabilities = detectCapabilities({
      task_types: cfg.task_types || ['compute.build-test'],
      max_concurrent: cfg.max_concurrent || 1,
      max_task_duration_s: cfg.max_task_duration_s || 600,
      limits: cfg.limits || {},
    });

    // If config provides runtime.sandbox, add it
    if (cfg.sandbox) {
      capabilities.runtime.sandbox = cfg.sandbox;
    }

    const { status, data } = await workerRequest('POST', '/adin/enroll', {
      code: cfg.enrollment_code,
      capabilities,
    });

    if (status !== 200) {
      throw new Error(`Enrollment failed (${status}): ${data.error}`);
    }

    state.node_id = data.node_id;
    state.secret = data.secret;
    state.rotate_by = data.rotate_by;
    state.capabilities = capabilities;
    saveState();

    log(`[worker] Enrolled as ${data.node_id}`);
    return data;
  }

  async function authenticate() {
    log('[worker] Authenticating...');
    const { status, data } = await workerRequest('POST', '/adin/auth', {
      node_id: state.node_id,
      node_secret: state.secret,
    });

    if (status !== 200) {
      throw new Error(`Authentication failed (${status}): ${data.error}`);
    }

    sessionToken = data.token;
    log(`[worker] Authenticated (session expires: ${data.expires_at})`);

    // Handle rotation recommendation
    if (data.action === 'rotation_recommended') {
      log('[worker] Credential rotation recommended — rotating...');
      await rotateCredentials();
    }

    return data;
  }

  async function rotateCredentials() {
    const { status, data } = await workerRequest('POST', '/adin/rotate', {
      node_id: state.node_id,
      current_secret: state.secret,
    });

    if (status !== 200) {
      log(`[worker] Rotation failed (${status}): ${data.error}`);
      return;
    }

    state.secret = data.secret;
    state.rotate_by = data.rotate_by;
    saveState();
    log('[worker] Credentials rotated successfully');
  }

  // ---- Heartbeat ----

  async function sendHeartbeat() {
    const load = detectLoad();
    const { status, data } = await workerRequest('POST', '/adin/heartbeat', { load }, sessionToken);

    if (status === 401) {
      // Session expired — re-authenticate
      log('[worker] Session expired, re-authenticating...');
      await authenticate();
      return;
    }

    if (status !== 200) {
      log(`[worker] Heartbeat error (${status}): ${data.error}`);
      return;
    }

    if (data.action === 'rotate_required') {
      log('[worker] Forced rotation required');
      await rotateCredentials();
    } else if (data.action === 'suspended') {
      log('[worker] Node is suspended — waiting for reinstatement...');
    }

    lastHeartbeat = Date.now();
    return data;
  }

  // ---- Operating hours check ----

  function isWithinOperatingHours() {
    const cfg = loadConfig();
    const hours = cfg.operating_hours;
    if (!hours || !hours.start || !hours.end) return true;

    try {
      const tz = hours.tz || 'UTC';
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
      const parts = formatter.formatToParts(new Date());
      const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
      const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
      const nowMinutes = h * 60 + m;

      const [startH, startM] = hours.start.split(':').map(Number);
      const [endH, endM] = hours.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
      }
      return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
    } catch {
      return true;
    }
  }

  // ---- Disk space check ----

  function checkDiskSpace() {
    const cfg = loadConfig();
    const minFreeGB = cfg.limits?.disk_floor_gb;
    if (!minFreeGB) return { ok: true };

    const load = detectLoad();
    if (load.disk_free_gb < minFreeGB) {
      return { ok: false, reason: `disk free ${load.disk_free_gb}GB < floor ${minFreeGB}GB` };
    }
    return { ok: true };
  }

  // ---- Task execution ----

  async function pollForTask() {
    const { status, data } = await workerRequest('GET', '/adin/tasks/next', null, sessionToken);

    if (status === 401) {
      log('[worker] Session expired during poll, re-authenticating...');
      await authenticate();
      return null;
    }

    if (status === 403 && data.action === 'suspended') {
      log('[worker] Node is suspended');
      return null;
    }

    if (status !== 200) {
      log(`[worker] Poll error (${status}): ${data.error}`);
      return null;
    }

    return data.task;
  }

  async function handleTask(task) {
    if (!task) return;

    // Dedup: skip if already running
    if (runningTasks.has(task.id)) {
      log(`[worker] Task ${task.id} already running, skipping`);
      return;
    }

    // Owner controls: operating hours
    if (!isWithinOperatingHours()) {
      log('[worker] Outside operating hours — skipping task');
      return;
    }

    // Owner controls: disk space
    const diskCheck = checkDiskSpace();
    if (!diskCheck.ok) {
      log(`[worker] Disk check failed: ${diskCheck.reason} — reporting failure`);
      await reportFailure(task.id, diskCheck.reason);
      return;
    }

    // Owner controls: STOP.txt
    if (stopFileExists()) {
      log('[worker] STOP.txt detected — skipping task');
      return;
    }

    runningTasks.add(task.id);
    currentTaskId = task.id;

    // Mark task as running
    try {
      const { status } = await workerRequest('POST', `/adin/tasks/${task.id}/running`, {}, sessionToken);
      if (status !== 200) {
        log(`[worker] Failed to mark task ${task.id} as running`);
        runningTasks.delete(task.id);
        currentTaskId = null;
        return;
      }
    } catch (err) {
      log(`[worker] Error marking task running: ${err.message}`);
      runningTasks.delete(task.id);
      currentTaskId = null;
      return;
    }

    // Create temp work directory
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `adin-task-${task.id}-`));

    try {
      log(`[worker] Executing task ${task.id} (${task.type}) in ${workDir}`);

      abortController = new AbortController();

      const result = await executorFn(task, {
        workDir,
        abortSignal: abortController.signal,
        checkStop: () => stopFileExists(),
        limits: loadConfig().limits || {},
        onStep: (i, action, status) => {
          log(`[worker] Task ${task.id} step ${i} (${action}): ${status}`);
        },
      });

      log(`[worker] Task ${task.id} finished: ${result.status}`);

      if (result.status === 'completed') {
        await submitResult(task.id, result);
      } else {
        await reportFailure(task.id, result.output?.structured?.error || result.output?.error || 'execution failed');
      }
    } catch (err) {
      log(`[worker] Task ${task.id} error: ${err.message}`);
      await reportFailure(task.id, `worker error: ${err.message}`);
    } finally {
      // Clean up work directory
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {
        log(`[worker] Warning: could not clean up ${workDir}`);
      }
      runningTasks.delete(task.id);
      currentTaskId = null;
      abortController = null;
    }
  }

  async function submitResult(taskId, result) {
    const { status, data } = await workerRequest('POST', `/adin/tasks/${taskId}/result`, {
      status: result.status,
      output: result.output,
      resources_used: result.resources_used,
    }, sessionToken);

    if (status !== 200) {
      log(`[worker] Result submission for ${taskId} returned ${status}: ${JSON.stringify(data)}`);
    } else if (data.accepted) {
      log(`[worker] Task ${taskId} result accepted`);
    } else {
      log(`[worker] Task ${taskId} result not accepted: ${data.reason}`);
    }
  }

  async function reportFailure(taskId, reason) {
    try {
      await workerRequest('POST', `/adin/tasks/${taskId}/fail`, { reason }, sessionToken);
      log(`[worker] Reported failure for task ${taskId}: ${reason}`);
    } catch (err) {
      log(`[worker] Error reporting failure: ${err.message}`);
    }
  }

  // ---- Main loop ----

  async function mainLoop() {
    if (!running) return;

    try {
      // Heartbeat if due
      const heartbeatInterval = loadConfig().heartbeat_interval_ms || DEFAULT_HEARTBEAT_INTERVAL_MS;
      if (Date.now() - lastHeartbeat >= heartbeatInterval) {
        await sendHeartbeat();
      }

      // Poll for task if not at capacity
      const maxConcurrent = loadConfig().max_concurrent || 1;
      if (runningTasks.size < maxConcurrent) {
        const task = await pollForTask();
        if (task) {
          // Run task without blocking the main loop
          handleTask(task).catch(err => {
            log(`[worker] Unhandled error in task handler: ${err.message}`);
          });
        }
      }
    } catch (err) {
      log(`[worker] Loop error: ${err.message}`);
    }

    // Schedule next iteration
    if (running) {
      const pollInterval = loadConfig().poll_interval_ms || DEFAULT_POLL_INTERVAL_MS;
      loopTimer = setTimeout(() => mainLoop(), pollInterval);
      if (loopTimer.unref) loopTimer.unref();
    }
  }

  // ---- Lifecycle ----

  async function start() {
    loadConfig();
    const hasState = loadState();

    if (!hasState || !state.node_id || !state.secret) {
      await enroll();
    }

    await authenticate();

    running = true;
    log('[worker] Starting main loop');

    // Send initial heartbeat immediately
    await sendHeartbeat();

    // Start the loop
    mainLoop();

    return { node_id: state.node_id };
  }

  async function stop() {
    log('[worker] Stopping...');
    running = false;

    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }

    // Abort any running task
    if (abortController) {
      abortController.abort();
    }

    // Wait briefly for current task to wind down
    if (currentTaskId) {
      log(`[worker] Waiting for task ${currentTaskId} to finish...`);
      // Give it up to 5 seconds to clean up
      const deadline = Date.now() + 5000;
      while (currentTaskId && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (currentTaskId) {
        log(`[worker] Task ${currentTaskId} did not finish in time — reporting failure`);
        try {
          await reportFailure(currentTaskId, 'worker shutdown');
        } catch {
          // best effort
        }
      }
    }

    log('[worker] Stopped');
  }

  return {
    start,
    stop,
    get state() { return { ...state }; },
    get isRunning() { return running; },
    get currentTask() { return currentTaskId; },
    // Exposed for testing
    _enroll: enroll,
    _authenticate: authenticate,
    _sendHeartbeat: sendHeartbeat,
    _pollForTask: pollForTask,
    _handleTask: handleTask,
    _mainLoop: mainLoop,
  };
}

// ---- Auto-start when run directly ----

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const configDir = process.argv[2] || process.cwd();
  const worker = createWorker({ configDir });

  worker.start().catch(err => {
    console.error(`[worker] Fatal: ${err.message}`);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => worker.stop().then(() => process.exit(0)));
  process.on('SIGTERM', () => worker.stop().then(() => process.exit(0)));
}
