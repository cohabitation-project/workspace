/**
 * integration.test.mjs — end-to-end test of the ADIN orchestrator with a simulated node.
 *
 * Starts two servers (worker + admin on separate ports), enrolls a node, submits a task,
 * polls for the task, submits a result, and verifies the full lifecycle.
 * Also tests port isolation, ownership checks, and scheduler delivery.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import { Registry } from '../registry.mjs';
import { TaskQueue } from '../queue.mjs';
import { ReviewQueue } from '../validation.mjs';
import { Metrics } from '../metrics.mjs';
import { selectNode, preValidateTask } from '../scheduler.mjs';
import { validateTaskResult } from '../validation.mjs';
import express from 'express';

describe('integration: full task lifecycle', () => {
  let dir, registry, queue, reviews, metrics;
  let workerServer, adminServer, workerPort, adminPort;
  const ADMIN_TOKEN = 'test-admin-token';

  // Rate limiter for tests (simplified)
  const rateLimitState = new Map();
  function rateLimit(key) {
    const now = Date.now();
    let entry = rateLimitState.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + 60000 };
      rateLimitState.set(key, entry);
    }
    entry.count++;
    return entry.count > 10;
  }
  function rateLimitMiddleware(endpointName) {
    return (req, res, next) => {
      const source = req.body?.node_id || req.ip || 'unknown';
      if (rateLimit(`${endpointName}:${source}`)) {
        return res.status(429).json({ error: 'rate limit exceeded' });
      }
      next();
    };
  }

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-integ-'));
    registry = new Registry(dir);
    queue = new TaskQueue(dir);
    reviews = new ReviewQueue(dir);
    metrics = new Metrics(dir);

    const nodeAuth = (req, res, next) => {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const node = registry.validateSession(token);
      if (!node) return res.status(401).json({ error: 'invalid session' });
      req.node = node;
      next();
    };
    const adminAuth = (req, res, next) => {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'invalid admin' });
      next();
    };

    // ---- Worker app (simulates tailnet port) ----
    const wApp = express();
    wApp.use(express.json({ limit: '256kb' }));

    // Note: enroll is inherently rate-limited by one-time codes; rate limiter
    // applied in orchestrator.mjs but omitted in test to avoid localhost collision
    wApp.post('/adin/enroll', (req, res) => {
      const result = registry.enroll(req.body.code, req.body.capabilities);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    });
    wApp.post('/adin/auth', rateLimitMiddleware('auth'), (req, res) => {
      const result = registry.authenticate(req.body.node_id, req.body.node_secret);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    });
    wApp.post('/adin/rotate', rateLimitMiddleware('rotate'), (req, res) => {
      const result = registry.rotate(req.body.node_id, req.body.current_secret);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    });
    wApp.post('/adin/heartbeat', nodeAuth, (req, res) => {
      res.json(registry.heartbeat(req.node, req.body?.load));
    });
    wApp.put('/adin/capabilities', nodeAuth, (req, res) => {
      const result = registry.updateCapabilities(req.node.id, req.body);
      if (result.error) return res.status(result.status).json({ error: result.error });
      res.json(result);
    });
    wApp.get('/adin/tasks/next', nodeAuth, (req, res) => {
      // Finding 4: check assigned tasks first
      const assigned = queue.assignedTo(req.node.id);
      if (assigned.length > 0) {
        assigned.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at));
        const task = assigned[0];
        return res.json({ task: { id: task.id, type: task.type, payload: task.payload, constraints: task.constraints } });
      }
      // Then use scheduler
      const queuedTasks = queue.activeTasks().filter(t => t.status === 'queued');
      for (const task of queuedTasks.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at))) {
        const decision = selectNode([req.node], task);
        if (decision.selected) {
          const preCheck = preValidateTask(task);
          if (!preCheck.safe) { queue.fail(task.id, null, 'step validation failed'); continue; }
          const assign = queue.assign(task.id, req.node.id);
          if (assign.error) continue;
          req.node.current_tasks.push(task.id);
          return res.json({ task: { id: task.id, type: task.type, payload: task.payload, constraints: task.constraints } });
        }
      }
      res.json({ task: null });
    });
    wApp.post('/adin/tasks/:id/running', nodeAuth, (req, res) => {
      const task = queue.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'unknown task' });
      if (task.assigned_to !== req.node.id) return res.status(403).json({ error: 'task not assigned to this node' });
      res.json(queue.markRunning(req.params.id, req.node.id));
    });
    wApp.post('/adin/tasks/:id/result', nodeAuth, async (req, res) => {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'request body must be a JSON object' });
      }
      const task = queue.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'unknown task' });
      // Finding 3: early ownership check
      if (task.assigned_to !== req.node.id) {
        return res.status(403).json({ error: 'task not assigned to this node' });
      }
      const raw = req.body;
      raw.task_id = req.params.id;
      raw.node_id = req.node.id;
      const v = await validateTaskResult(raw, task, req.node, { provenanceDir: path.join(dir, 'prov') });
      if (!v.accepted) {
        queue.fail(task.id, req.node.id, v.reason);
        return res.json({ accepted: false, reason: v.reason });
      }
      queue.complete(task.id, req.node.id, raw);
      req.node.stats.tasks_completed++;
      const idx = req.node.current_tasks.indexOf(task.id);
      if (idx !== -1) req.node.current_tasks.splice(idx, 1);
      metrics.logTask({ ...task, status: 'completed', result: raw, started_at: task.started_at, completed_at: new Date().toISOString() }, req.node);
      res.json({ accepted: true });
    });
    wApp.post('/adin/tasks/:id/fail', nodeAuth, (req, res) => {
      const task = queue.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'unknown task' });
      if (task.assigned_to !== req.node.id) return res.status(403).json({ error: 'task not assigned to this node' });
      const result = queue.fail(req.params.id, req.node.id, req.body?.reason || 'node-reported failure');
      if (result.error) return res.status(result.status).json({ error: result.error });
      req.node.stats.tasks_failed++;
      const idx = req.node.current_tasks.indexOf(req.params.id);
      if (idx !== -1) req.node.current_tasks.splice(idx, 1);
      res.json(result);
    });

    // ---- Admin app (simulates localhost port) ----
    const aApp = express();
    aApp.use(express.json({ limit: '256kb' }));

    aApp.post('/adin/admin/enroll-code', adminAuth, (req, res) => {
      res.json(registry.createEnrollmentCode(req.body));
    });
    aApp.post('/adin/admin/queue', adminAuth, (req, res) => {
      const preCheck = preValidateTask(req.body);
      if (!preCheck.safe) return res.status(400).json({ error: 'disallowed steps', violations: preCheck.violations });
      const result = queue.submit(req.body);
      if (result.error) return res.status(result.status).json(result);
      // Attempt immediate scheduling
      const nodes = registry.eligibleNodes(req.body.type);
      const decision = selectNode(nodes, result.task);
      if (decision.selected) {
        const assign = queue.assign(result.task.id, decision.selected.node_id);
        if (assign.ok) {
          const node = registry.getNode(decision.selected.node_id);
          if (node) node.current_tasks.push(result.task.id);
        }
      }
      res.json({ task_id: result.task.id, status: result.task.status, assigned_to: result.task.assigned_to });
    });
    aApp.get('/adin/nodes', adminAuth, (req, res) => res.json({ nodes: registry.listNodes() }));
    aApp.get('/adin/metrics/:node_id', adminAuth, (req, res) => res.json({ ledger: metrics.nodeLedger(req.params.node_id) }));
    aApp.post('/adin/admin/revoke/:node_id', adminAuth, (req, res) => {
      const result = registry.revoke(req.params.node_id, req.body?.reason || 'admin revocation');
      if (result.error) return res.status(result.status).json({ error: result.error });
      res.json(result);
    });

    // Start both on random ports
    await Promise.all([
      new Promise((resolve) => {
        workerServer = wApp.listen(0, '127.0.0.1', () => {
          workerPort = workerServer.address().port;
          resolve();
        });
      }),
      new Promise((resolve) => {
        adminServer = aApp.listen(0, '127.0.0.1', () => {
          adminPort = adminServer.address().port;
          resolve();
        });
      }),
    ]);
  });

  after(() => {
    workerServer?.close();
    adminServer?.close();
    registry?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // Helpers
  async function workerApi(method, urlPath, body, token) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`http://127.0.0.1:${workerPort}${urlPath}`, opts);
    return { status: res.status, data: await res.json() };
  }

  async function adminApi(method, urlPath, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_TOKEN}` } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`http://127.0.0.1:${adminPort}${urlPath}`, opts);
    return { status: res.status, data: await res.json() };
  }

  // ---- Helper: enroll and auth a node ----
  async function enrollAndAuth(name = 'test-laptop') {
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: name });
    const { data: enrollData } = await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'i7-test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
        storage: { total_gb: 100, free_gb: 50 },
        runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 600 },
      },
    });
    const { data: authData } = await workerApi('POST', '/adin/auth', { node_id: enrollData.node_id, node_secret: enrollData.secret });
    // Send heartbeat to mark online
    await workerApi('POST', '/adin/heartbeat', { load: { cpu_percent: 15, ram_used_gb: 2, temp_c: 45, disk_free_gb: 80 } }, authData.token);
    return { nodeId: enrollData.node_id, secret: enrollData.secret, token: authData.token };
  }

  const validTaskDef = {
    type: 'compute.build-test',
    priority: 5,
    requirements: { cpu_cores_min: 2, sandbox: 'required' },
    payload: {
      sandbox: 'required',
      steps: [
        { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
        { action: 'npm-ci' },
        { action: 'node-test', files: ['commons/test/unit.mjs'] },
      ],
    },
    constraints: { timeout_s: 300 },
  };

  it('runs the full lifecycle: enroll -> auth -> heartbeat -> poll -> run -> complete', async () => {
    const { nodeId, token } = await enrollAndAuth();

    // Admin queues a task
    const { data: queueData } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    assert.ok(queueData.task_id, 'task should be queued');

    // Node polls for task
    const { data: pollData } = await workerApi('GET', '/adin/tasks/next', null, token);
    assert.ok(pollData.task, 'node should receive the task');
    assert.equal(pollData.task.type, 'compute.build-test');
    const taskId = pollData.task.id;

    // Node marks task as running
    const { data: runData } = await workerApi('POST', `/adin/tasks/${taskId}/running`, {}, token);
    assert.ok(runData.ok);

    // Node submits result
    const { data: resultData } = await workerApi('POST', `/adin/tasks/${taskId}/result`, {
      status: 'completed',
      output: {
        exit_code: 0,
        stdout_truncated: 'all tests passed',
        structured: { tests_total: 47, tests_passed: 47, tests_failed: 0, tests_skipped: 0 },
      },
      resources_used: { peak_ram_gb: 3.2, cpu_seconds: 145, peak_temp_c: 55, disk_used_gb: 1.8 },
    }, token);
    assert.ok(resultData.accepted, `result should be accepted: ${resultData.reason}`);

    // Verify node stats
    const { data: nodesData } = await adminApi('GET', '/adin/nodes');
    const node = nodesData.nodes.find((n) => n.id === nodeId);
    assert.equal(node.stats.tasks_completed, 1);
    assert.equal(node.status, 'active');

    // Verify usage ledger
    const { data: ledgerData } = await adminApi('GET', `/adin/metrics/${nodeId}`);
    assert.equal(ledgerData.ledger.length, 1);
    assert.equal(ledgerData.ledger[0].task_type, 'compute.build-test');
  });

  it('rejects enrollment with a used code', async () => {
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: 'burn-test' });
    await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'test', cores: 2, threads: 4, arch: 'x86_64' }, ram_gb: 4, gpu: [] },
        storage: { total_gb: 50, free_gb: 30 },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 300 },
      },
    });
    const { status } = await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'test', cores: 2, threads: 4, arch: 'x86_64' }, ram_gb: 4, gpu: [] },
        storage: { total_gb: 50, free_gb: 30 },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 300 },
      },
    });
    assert.equal(status, 401);
  });

  it('rejects tasks with invalid steps', async () => {
    const { status, data } = await adminApi('POST', '/adin/admin/queue', {
      type: 'compute.build-test',
      requirements: {},
      payload: {
        sandbox: 'required',
        steps: [{ action: 'rm-rf' }],
      },
      constraints: { timeout_s: 60 },
    });
    assert.equal(status, 400);
    assert.ok(data.violations);
  });

  // ---- Finding 2: admin endpoints NOT reachable on worker port ----

  it('admin endpoints are NOT reachable on the worker port', async () => {
    // Try to reach admin endpoint on worker port — should 404 (not mounted)
    const res1 = await fetch(`http://127.0.0.1:${workerPort}/adin/admin/enroll-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ sponsor: 'Geoffrey', node_name: 'sneaky' }),
    });
    // Should be 404 because admin routes are not on the worker app
    assert.ok(res1.status === 404 || res1.status >= 400, `admin endpoint should not be reachable on worker port, got ${res1.status}`);

    const res2 = await fetch(`http://127.0.0.1:${workerPort}/adin/nodes`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
    });
    assert.ok(res2.status === 404 || res2.status >= 400, `admin GET /nodes should not be on worker port`);

    const res3 = await fetch(`http://127.0.0.1:${workerPort}/adin/admin/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify(validTaskDef),
    });
    assert.ok(res3.status === 404 || res3.status >= 400, `admin POST /queue should not be on worker port`);
  });

  // ---- Finding 3: node cannot submit results for another node's task ----

  it('a node cannot submit results for another node\'s task', async () => {
    const nodeA = await enrollAndAuth('node-a-ownership');
    const nodeB = await enrollAndAuth('node-b-ownership');

    // Queue a task; scheduler may assign it to nodeA (the first online node)
    const { data: qData } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    const taskId = qData.task_id;

    // Node A polls and gets the task
    const { data: pollA } = await workerApi('GET', '/adin/tasks/next', null, nodeA.token);
    if (pollA.task) {
      // Node B tries to submit a result for Node A's task
      const { status, data } = await workerApi('POST', `/adin/tasks/${pollA.task.id}/result`, {
        status: 'completed',
        output: { exit_code: 0, structured: { tests_total: 1, tests_passed: 1, tests_failed: 0 } },
        resources_used: { peak_ram_gb: 1 },
      }, nodeB.token);
      assert.equal(status, 403, 'should reject result from wrong node');
      assert.ok(data.error.includes('not assigned to this node'));
    }
  });

  it('a node cannot mark another node\'s task as running', async () => {
    const nodeA = await enrollAndAuth('node-a-running');
    const nodeB = await enrollAndAuth('node-b-running');

    await adminApi('POST', '/adin/admin/queue', validTaskDef);
    const { data: pollA } = await workerApi('GET', '/adin/tasks/next', null, nodeA.token);
    if (pollA.task) {
      const { status } = await workerApi('POST', `/adin/tasks/${pollA.task.id}/running`, {}, nodeB.token);
      assert.equal(status, 403);
    }
  });

  it('a node cannot fail another node\'s task', async () => {
    const nodeA = await enrollAndAuth('node-a-fail');
    const nodeB = await enrollAndAuth('node-b-fail');

    await adminApi('POST', '/adin/admin/queue', validTaskDef);
    const { data: pollA } = await workerApi('GET', '/adin/tasks/next', null, nodeA.token);
    if (pollA.task) {
      const { status } = await workerApi('POST', `/adin/tasks/${pollA.task.id}/fail`, { reason: 'hijack' }, nodeB.token);
      assert.equal(status, 403);
    }
  });

  // ---- Finding 3: non-object body ----

  it('rejects non-object body in result submission', async () => {
    const nodeA = await enrollAndAuth('body-check');
    await adminApi('POST', '/adin/admin/queue', validTaskDef);
    const { data: pollA } = await workerApi('GET', '/adin/tasks/next', null, nodeA.token);
    if (pollA.task) {
      // Send an array instead of an object
      const res = await fetch(`http://127.0.0.1:${workerPort}/adin/tasks/${pollA.task.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nodeA.token}` },
        body: JSON.stringify([1, 2, 3]),
      });
      assert.equal(res.status, 400);
    }
  });

  // ---- Finding 4: scheduler-assigned task IS delivered on poll ----

  it('task assigned by scheduler is delivered on poll', async () => {
    const node = await enrollAndAuth('scheduler-delivery');

    // Use the admin API to queue a task, then directly assign via queue
    // to the node. This simulates the scheduler pre-assigning during admin/queue.
    const submitResult = queue.submit(validTaskDef);
    assert.ok(submitResult.task, `task should be submitted: ${submitResult.error}`);

    // Get the real node ID from the registry using the session token
    const sessionNode = registry.validateSession(node.token);
    assert.ok(sessionNode, 'session should be valid');
    const realNodeId = sessionNode.id;

    const assignResult = queue.assign(submitResult.task.id, realNodeId);
    assert.ok(assignResult.ok, `assign should succeed: ${assignResult.error}`);

    // Verify the assignment took effect
    const assigned = queue.assignedTo(realNodeId);
    assert.ok(assigned.length > 0, `assignedTo should find the task for ${realNodeId}`);

    // Now poll — the assigned task should be delivered
    const { data: pollData } = await workerApi('GET', '/adin/tasks/next', null, node.token);
    assert.ok(pollData.task, `scheduler-assigned task should be delivered on poll`);
    assert.equal(pollData.task.type, 'compute.build-test');
    assert.equal(pollData.task.id, submitResult.task.id);
  });

  // ---- Rate limiting ----

  it('rate limits excessive auth attempts', async () => {
    // Use a unique source to not conflict with other tests
    const fakeId = 'n_rate_limit_test_' + Date.now();
    let limited = false;
    for (let i = 0; i < 15; i++) {
      const { status } = await workerApi('POST', '/adin/auth', { node_id: fakeId, node_secret: 'wrong' });
      if (status === 429) { limited = true; break; }
    }
    assert.ok(limited, 'should hit rate limit after excessive attempts');
  });
});
