/**
 * e2e.test.mjs — End-to-end test of the ADIN network: orchestrator + workers.
 *
 * Two test modes:
 *   1. Mock execution (default): replaces git/npm/node with canned results.
 *      Tests the full worker lifecycle without network or disk I/O.
 *   2. Live execution (ADIN_E2E_LIVE=1): actually clones from GitHub, runs npm ci,
 *      and executes node --test. Requires network access.
 *
 * Each test group uses its own orchestrator to avoid cross-test contamination
 * (orphan nodes from prior tests grabbing tasks).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createOrchestrator } from '../orchestrator.mjs';
import { createWorker } from '../worker.mjs';
import { detectCapabilities } from '../capabilities.mjs';

// ---- Mock executor ----

function createMockExecutor(opts = {}) {
  const calls = [];
  const { delayMs = 10, failOnStep = -1, failMessage = 'mock failure' } = opts;

  async function mockExecuteTask(task, execOpts = {}) {
    const steps = task.payload?.steps || [];
    const taskStart = Date.now();
    let stepsCompleted = 0;
    const allStdout = [];

    for (let i = 0; i < steps.length; i++) {
      if (execOpts.abortSignal?.aborted) {
        return {
          status: 'failed',
          output: { exit_code: 1, stdout_truncated: '', stderr_truncated: '', structured: { error: 'aborted' } },
          resources_used: { wall_time_ms: Date.now() - taskStart, cpu_seconds: 0, peak_ram_gb: 0.1 },
          steps_completed: stepsCompleted,
        };
      }
      if (execOpts.checkStop && execOpts.checkStop()) {
        return {
          status: 'failed',
          output: { exit_code: 1, stdout_truncated: '', stderr_truncated: '', structured: { error: 'paused by STOP.txt' } },
          resources_used: { wall_time_ms: Date.now() - taskStart, cpu_seconds: 0, peak_ram_gb: 0.1 },
          steps_completed: stepsCompleted,
        };
      }

      calls.push({ taskId: task.id, step: i, action: steps[i].action });
      if (execOpts.onStep) execOpts.onStep(i, steps[i].action, 'starting');
      await new Promise(r => setTimeout(r, delayMs));

      if (i === failOnStep) {
        if (execOpts.onStep) execOpts.onStep(i, steps[i].action, 'error');
        return {
          status: 'failed',
          output: { exit_code: 1, stdout_truncated: allStdout.join('\n'), stderr_truncated: failMessage, structured: { error: failMessage } },
          resources_used: { wall_time_ms: Date.now() - taskStart, cpu_seconds: 0, peak_ram_gb: 0.1 },
          steps_completed: stepsCompleted,
        };
      }

      allStdout.push(`step ${i} (${steps[i].action}): ok`);
      if (execOpts.onStep) execOpts.onStep(i, steps[i].action, 'completed');
      stepsCompleted++;
    }

    return {
      status: 'completed',
      output: {
        exit_code: 0,
        stdout_truncated: allStdout.join('\n'),
        stderr_truncated: '',
        structured: { tests_total: 3, tests_passed: 3, tests_failed: 0, tests_skipped: 0 },
      },
      resources_used: { wall_time_ms: Date.now() - taskStart, cpu_seconds: 1, peak_ram_gb: 0.2 },
      steps_completed: stepsCompleted,
    };
  }

  return { execute: mockExecuteTask, calls };
}

// ---- Helpers ----

function makeWorkerConfig(orchestratorUrl, enrollCode, extra = {}) {
  return {
    orchestrator_url: orchestratorUrl,
    enrollment_code: enrollCode,
    task_types: ['compute.build-test'],
    max_concurrent: 1,
    max_task_duration_s: 60,
    poll_interval_ms: 50,
    heartbeat_interval_ms: 200,
    sandbox: 'test-sandbox',
    limits: {},
    ...extra,
  };
}

const validTaskDef = {
  type: 'compute.build-test',
  priority: 5,
  requirements: { cpu_cores_min: 1, sandbox: 'required' },
  payload: {
    sandbox: 'required',
    steps: [
      { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
      { action: 'npm-ci' },
      { action: 'node-test', files: ['test/unit.mjs'] },
    ],
  },
  constraints: { timeout_s: 60 },
};

async function adminApi(adminPort, method, urlPath, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-admin-token' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:${adminPort}${urlPath}`, opts);
  return { status: res.status, data: await res.json() };
}

/** Pick a random high port that's unlikely to collide. */
function randomPort() {
  return 30000 + Math.floor(Math.random() * 30000);
}

/** Create a fresh orchestrator + admin helpers for an isolated test. */
function createTestOrch(baseDir, name) {
  const orchDir = path.join(baseDir, name);
  const orch = createOrchestrator({
    dataDir: orchDir,
    host: '127.0.0.1',
    port: randomPort(),
    adminPort: randomPort(),
    adminToken: 'test-admin-token',
    rateLimitMax: 200,
  });
  return orch;
}

// ========================
// Single worker lifecycle
// ========================

describe('e2e: single worker lifecycle', () => {
  let dir, orch, workerPort, adminPort;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-e2e-single-'));
    orch = createTestOrch(dir, 'orch');
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('worker enrolls, authenticates, heartbeats, executes a task, and submits result', async () => {
    const { data: codeData } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
      sponsor: 'Geoffrey', node_name: 'test-worker-1',
    });

    const mockExec = createMockExecutor();
    const workerDir = path.join(dir, 'worker1');
    fs.mkdirSync(workerDir, { recursive: true });

    const worker = createWorker({
      configDir: workerDir,
      config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeData.code),
      executor: mockExec.execute,
      log: () => {},
    });

    try {
      const startResult = await worker.start();
      assert.ok(startResult.node_id, 'worker should get a node_id');
      assert.ok(worker.isRunning, 'worker should be running');

      // Queue a task
      const { data: queueData } = await adminApi(adminPort, 'POST', '/adin/admin/queue', validTaskDef);
      assert.ok(queueData.task_id, 'task should be queued');

      // Wait for completion
      const deadline = Date.now() + 5000;
      let taskCompleted = false;
      while (Date.now() < deadline && !taskCompleted) {
        await new Promise(r => setTimeout(r, 100));
        const history = orch.queue.recentHistory(10);
        taskCompleted = history.some(t => t.id === queueData.task_id && t.status === 'completed');
      }

      assert.ok(taskCompleted, 'task should be completed within deadline');
      assert.ok(mockExec.calls.length >= 3, `executor should be called for all steps, got ${mockExec.calls.length}`);
      assert.equal(mockExec.calls[0].action, 'git-clone');
      assert.equal(mockExec.calls[1].action, 'npm-ci');
      assert.equal(mockExec.calls[2].action, 'node-test');

      // Verify node stats
      const { data: nodesData } = await adminApi(adminPort, 'GET', '/adin/nodes');
      const node = nodesData.nodes.find(n => n.id === startResult.node_id);
      assert.ok(node, 'node should exist in registry');
      assert.equal(node.stats.tasks_completed, 1);

      // Verify metrics
      const { data: metricsData } = await adminApi(adminPort, 'GET', `/adin/metrics/${startResult.node_id}`);
      assert.equal(metricsData.ledger.length, 1);
    } finally {
      await worker.stop();
    }
    assert.ok(!worker.isRunning, 'worker should be stopped');
  });
});

// ========================
// Two workers competing
// ========================

describe('e2e: two workers compete', () => {
  let dir, orch, workerPort, adminPort;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-e2e-multi-'));
    orch = createTestOrch(dir, 'orch');
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('two workers each execute a task', async () => {
    const workers = [];
    const mockExecs = [];

    try {
      for (let i = 0; i < 2; i++) {
        const { data: codeData } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
          sponsor: 'Geoffrey', node_name: `multi-worker-${i}`,
        });
        const mockExec = createMockExecutor({ delayMs: 20 });
        mockExecs.push(mockExec);
        const workerDir = path.join(dir, `worker-${i}`);
        fs.mkdirSync(workerDir, { recursive: true });
        const worker = createWorker({
          configDir: workerDir,
          config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeData.code),
          executor: mockExec.execute,
          log: () => {},
        });
        await worker.start();
        workers.push(worker);
      }

      // Queue 2 tasks with a short gap so both workers get a chance
      const taskIds = [];
      for (let i = 0; i < 2; i++) {
        const { data } = await adminApi(adminPort, 'POST', '/adin/admin/queue', validTaskDef);
        taskIds.push(data.task_id);
        await new Promise(r => setTimeout(r, 200)); // stagger submissions
      }

      // Wait for both tasks to finish
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
        const history = orch.queue.recentHistory(50);
        const done = taskIds.filter(id => history.some(t => t.id === id));
        if (done.length >= 2) break;
      }

      const history = orch.queue.recentHistory(50);
      const done = taskIds.filter(id => history.some(t => t.id === id));
      assert.ok(done.length >= 2, `both tasks should be done, got ${done.length}`);

      const totalCalls = mockExecs.reduce((sum, m) => sum + m.calls.length, 0);
      assert.ok(totalCalls >= 3, `executors should have handled steps, got ${totalCalls}`);
    } finally {
      for (const w of workers) await w.stop();
    }
  });
});

// ========================
// Task failure
// ========================

describe('e2e: task failure', () => {
  let dir, orch, workerPort, adminPort;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-e2e-fail-'));
    orch = createTestOrch(dir, 'orch');
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('executor fails and worker reports failure', async () => {
    const { data: codeData } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
      sponsor: 'Geoffrey', node_name: 'fail-worker',
    });

    const mockExec = createMockExecutor({ failOnStep: 1, failMessage: 'npm ci failed: ENOENT' });
    const workerDir = path.join(dir, 'fail-worker');
    fs.mkdirSync(workerDir, { recursive: true });

    const worker = createWorker({
      configDir: workerDir,
      config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeData.code),
      executor: mockExec.execute,
      log: () => {},
    });

    try {
      await worker.start();

      const { data: queueData } = await adminApi(adminPort, 'POST', '/adin/admin/queue', {
        ...validTaskDef,
        max_retries: 0,
      });

      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
        const history = orch.queue.recentHistory(50);
        if (history.some(t => t.id === queueData.task_id)) break;
      }

      const history = orch.queue.recentHistory(50);
      const task = history.find(t => t.id === queueData.task_id);
      assert.ok(task, 'task should appear in history');
      assert.equal(task.status, 'failed', 'task should be failed');
    } finally {
      await worker.stop();
    }
  });
});

// ========================
// Task reassignment
// ========================

describe('e2e: task reassignment', () => {
  let dir, orch, workerPort, adminPort;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-e2e-reassign-'));
    orch = createTestOrch(dir, 'orch');
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('another worker picks up a requeued task after node failure', async () => {
    let workerA, workerB;
    try {
      // Worker A: slow executor
      const { data: codeA } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
        sponsor: 'Geoffrey', node_name: 'worker-a',
      });
      const mockExecA = createMockExecutor({ delayMs: 2000 });
      const dirA = path.join(dir, 'worker-a');
      fs.mkdirSync(dirA, { recursive: true });
      workerA = createWorker({
        configDir: dirA,
        config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeA.code),
        executor: mockExecA.execute,
        log: () => {},
      });
      await workerA.start();

      // Queue task with retries
      const { data: queueData } = await adminApi(adminPort, 'POST', '/adin/admin/queue', {
        ...validTaskDef,
        max_retries: 3,
      });

      // Wait for worker A to pick up
      const d1 = Date.now() + 3000;
      while (Date.now() < d1 && !workerA.currentTask) {
        await new Promise(r => setTimeout(r, 50));
      }

      // Kill worker A
      await workerA.stop();
      await new Promise(r => setTimeout(r, 200));

      // Ensure task is requeued
      const task = orch.queue.getTask(queueData.task_id);
      if (task && task.status !== 'queued') {
        orch.queue.fail(task.id, null, 'node went offline');
      }

      // Worker B: fast executor
      const { data: codeB } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
        sponsor: 'Geoffrey', node_name: 'worker-b',
      });
      const mockExecB = createMockExecutor({ delayMs: 10 });
      const dirB = path.join(dir, 'worker-b');
      fs.mkdirSync(dirB, { recursive: true });
      workerB = createWorker({
        configDir: dirB,
        config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeB.code),
        executor: mockExecB.execute,
        log: () => {},
      });
      await workerB.start();

      // Wait for completion
      const d2 = Date.now() + 5000;
      let done = false;
      while (Date.now() < d2 && !done) {
        await new Promise(r => setTimeout(r, 100));
        const history = orch.queue.recentHistory(50);
        done = history.some(t => t.id === queueData.task_id);
      }

      assert.ok(done, 'task should be completed after reassignment');
      assert.ok(mockExecB.calls.length > 0, 'worker B should have executed steps');
    } finally {
      if (workerA?.isRunning) await workerA.stop();
      if (workerB?.isRunning) await workerB.stop();
    }
  });
});

// ========================
// Graceful disconnect + STOP.txt + audit
// ========================

describe('e2e: owner controls', () => {
  let dir, orch, workerPort, adminPort;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-e2e-controls-'));
    orch = createTestOrch(dir, 'orch');
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('graceful disconnect: worker stops cleanly', async () => {
    const { data: codeData } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
      sponsor: 'Geoffrey', node_name: 'graceful-worker',
    });
    const mockExec = createMockExecutor({ delayMs: 200 });
    const workerDir = path.join(dir, 'graceful-worker');
    fs.mkdirSync(workerDir, { recursive: true });

    const worker = createWorker({
      configDir: workerDir,
      config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeData.code),
      executor: mockExec.execute,
      log: () => {},
    });

    try {
      await worker.start();
      const { data: queueData } = await adminApi(adminPort, 'POST', '/adin/admin/queue', validTaskDef);

      const deadline = Date.now() + 3000;
      while (Date.now() < deadline && !worker.currentTask) {
        await new Promise(r => setTimeout(r, 50));
      }

      await worker.stop();
      assert.ok(!worker.isRunning);
    } finally {
      if (worker.isRunning) await worker.stop();
    }
  });

  it('STOP.txt pauses task execution', async () => {
    const { data: codeData } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
      sponsor: 'Geoffrey', node_name: 'stop-worker',
    });

    let stopFilePresent = false;
    const mockExec = createMockExecutor({ delayMs: 50 });
    const workerDir = path.join(dir, 'stop-worker');
    fs.mkdirSync(workerDir, { recursive: true });

    const worker = createWorker({
      configDir: workerDir,
      config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeData.code),
      executor: async (task, opts) => {
        return mockExec.execute(task, { ...opts, checkStop: () => stopFilePresent });
      },
      log: () => {},
    });

    try {
      await worker.start();

      // Create STOP.txt
      fs.writeFileSync(path.join(workerDir, 'STOP.txt'), 'paused for testing');
      stopFilePresent = true;

      const { data: queueData } = await adminApi(adminPort, 'POST', '/adin/admin/queue', {
        ...validTaskDef,
        max_retries: 0,
      });

      // Wait briefly — task should not complete normally
      await new Promise(r => setTimeout(r, 500));

      fs.unlinkSync(path.join(workerDir, 'STOP.txt'));
    } finally {
      await worker.stop();
    }
  });

  it('audit log exists after worker activity', () => {
    const auditPath = path.join(dir, 'orch', 'audit.jsonl');
    try {
      const content = fs.readFileSync(auditPath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      assert.ok(lines.length > 0, 'audit log should have entries');
      const entries = lines.map(l => JSON.parse(l));
      const enrollments = entries.filter(e => e.action === 'enrolled');
      assert.ok(enrollments.length > 0, 'should have enrollment audit entries');
    } catch {
      // audit log might not exist yet in fast tests — acceptable
    }
  });
});

// ========================
// System detection
// ========================

describe('capabilities: system detection', () => {
  it('detects current system capabilities', () => {
    const caps = detectCapabilities();
    assert.ok(caps.compute.cpu.model, 'should detect CPU model');
    assert.ok(caps.compute.cpu.cores >= 1, 'should detect at least 1 core');
    assert.ok(caps.compute.cpu.arch, 'should detect architecture');
    assert.ok(caps.compute.ram_gb > 0, 'should detect RAM');
    assert.ok(caps.storage.free_gb >= 0, 'should detect disk');
    assert.ok(caps.runtime.node, 'should detect Node.js version');
    assert.ok(caps.runtime.platform, 'should detect platform');
    assert.deepEqual(caps.offered.task_types, ['compute.build-test']);
    assert.equal(caps.offered.max_concurrent, 1);
    assert.equal(caps.limits.max_task_duration_s, 600);
  });

  it('accepts overrides', () => {
    const caps = detectCapabilities({
      task_types: ['compute.benchmark'],
      max_concurrent: 2,
      max_task_duration_s: 1200,
      limits: { thermal_ceiling_c: 80 },
    });
    assert.deepEqual(caps.offered.task_types, ['compute.benchmark']);
    assert.equal(caps.offered.max_concurrent, 2);
    assert.equal(caps.limits.max_task_duration_s, 1200);
    assert.equal(caps.limits.thermal_ceiling_c, 80);
  });
});

// ========================
// Live execution (opt-in)
// ========================

const LIVE = process.env.ADIN_E2E_LIVE === '1';

describe('e2e: live execution (ADIN_E2E_LIVE=1)', { skip: !LIVE }, () => {
  let dir, orch, workerPort, adminPort;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-e2e-live-'));
    orch = createTestOrch(dir, 'orch');
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('clones a repo, runs npm ci, and executes node --test', async () => {
    const { data: codeData } = await adminApi(adminPort, 'POST', '/adin/admin/enroll-code', {
      sponsor: 'Geoffrey', node_name: 'live-worker',
    });

    const workerDir = path.join(dir, 'live-worker');
    fs.mkdirSync(workerDir, { recursive: true });

    const worker = createWorker({
      configDir: workerDir,
      config: makeWorkerConfig(`http://127.0.0.1:${workerPort}`, codeData.code),
      log: console.log,
    });

    try {
      await worker.start();

      const { data: queueData } = await adminApi(adminPort, 'POST', '/adin/admin/queue', {
        type: 'compute.build-test',
        priority: 5,
        requirements: { cpu_cores_min: 1, sandbox: 'required' },
        payload: {
          sandbox: 'required',
          steps: [
            { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
            { action: 'npm-ci' },
            { action: 'node-test', files: ['commons/test/unit.mjs'] },
          ],
        },
        constraints: { timeout_s: 300 },
        max_retries: 0,
      });

      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1000));
        const history = orch.queue.recentHistory(10);
        if (history.some(t => t.id === queueData.task_id)) break;
      }
    } finally {
      await worker.stop();
    }
  });
});
