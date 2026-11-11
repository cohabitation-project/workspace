/**
 * integration.test.mjs — end-to-end test of the ADIN orchestrator with a simulated node.
 *
 * Starts the orchestrator on a random port, enrolls a node, submits a task,
 * polls for the task, submits a result, and verifies the full lifecycle.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

// We import the app factory parts individually to control the lifecycle
import { Registry } from '../registry.mjs';
import { TaskQueue } from '../queue.mjs';
import { ReviewQueue } from '../validation.mjs';
import { Metrics } from '../metrics.mjs';
import { selectNode, preValidateTask } from '../scheduler.mjs';
import { validateTaskResult } from '../validation.mjs';
import express from 'express';

describe('integration: full task lifecycle', () => {
  let dir, registry, queue, reviews, metrics, server, port;
  const ADMIN_TOKEN = 'test-admin-token';

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-integ-'));
    registry = new Registry(dir);
    queue = new TaskQueue(dir);
    reviews = new ReviewQueue(dir);
    metrics = new Metrics(dir);

    // Build a minimal server (replicating orchestrator.mjs routes)
    const app = express();
    app.use(express.json({ limit: '256kb' }));

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

    app.post('/adin/enroll', (req, res) => {
      const result = registry.enroll(req.body.code, req.body.capabilities);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    });
    app.post('/adin/auth', (req, res) => {
      const result = registry.authenticate(req.body.node_id, req.body.node_secret);
      if (result.error) return res.status(result.status).json(result);
      res.json(result);
    });
    app.post('/adin/heartbeat', nodeAuth, (req, res) => {
      res.json(registry.heartbeat(req.node, req.body?.load));
    });
    app.get('/adin/tasks/next', nodeAuth, (req, res) => {
      const task = queue.nextFor(req.node);
      if (!task) return res.json({ task: null });
      queue.assign(task.id, req.node.id);
      req.node.current_tasks.push(task.id);
      res.json({ task: { id: task.id, type: task.type, payload: task.payload, constraints: task.constraints } });
    });
    app.post('/adin/tasks/:id/running', nodeAuth, (req, res) => {
      res.json(queue.markRunning(req.params.id, req.node.id));
    });
    app.post('/adin/tasks/:id/result', nodeAuth, async (req, res) => {
      const task = queue.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'unknown task' });
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
    app.post('/adin/admin/enroll-code', adminAuth, (req, res) => {
      res.json(registry.createEnrollmentCode(req.body));
    });
    app.post('/adin/admin/queue', adminAuth, (req, res) => {
      const preCheck = preValidateTask(req.body);
      if (!preCheck.safe) return res.status(400).json({ error: 'disallowed commands', violations: preCheck.violations });
      const result = queue.submit(req.body);
      if (result.error) return res.status(result.status).json(result);
      res.json({ task_id: result.task.id, status: result.task.status });
    });
    app.get('/adin/nodes', adminAuth, (req, res) => res.json({ nodes: registry.listNodes() }));
    app.get('/adin/metrics/:node_id', adminAuth, (req, res) => res.json({ ledger: metrics.nodeLedger(req.params.node_id) }));

    // Start on a random port
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    server?.close();
    registry?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // Helper: HTTP request
  async function api(method, urlPath, body, token) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, opts);
    return { status: res.status, data: await res.json() };
  }

  it('runs the full lifecycle: enroll → auth → heartbeat → poll → run → complete', async () => {
    // 1. Admin creates enrollment code
    const { data: codeData } = await api('POST', '/adin/admin/enroll-code',
      { sponsor: 'Geoffrey', node_name: 'test-laptop' }, ADMIN_TOKEN);
    assert.ok(codeData.code, 'should get enrollment code');

    // 2. Node enrolls
    const { data: enrollData } = await api('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'i7-test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
        storage: { total_gb: 100, free_gb: 50 },
        runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 600 },
      },
    });
    assert.ok(enrollData.node_id, 'should get node_id');
    assert.ok(enrollData.secret, 'should get secret');
    const nodeId = enrollData.node_id;
    const secret = enrollData.secret;

    // 3. Node authenticates
    const { data: authData } = await api('POST', '/adin/auth', { node_id: nodeId, node_secret: secret });
    assert.ok(authData.token, 'should get session token');
    const sessionToken = authData.token;

    // 4. Node sends heartbeat
    const { data: hbData } = await api('POST', '/adin/heartbeat',
      { load: { cpu_percent: 15, ram_used_gb: 2, temp_c: 45, disk_free_gb: 80 } }, sessionToken);
    assert.ok(hbData.ok);

    // 5. Admin queues a task
    const { data: queueData } = await api('POST', '/adin/admin/queue', {
      type: 'compute.build-test',
      priority: 5,
      requirements: { cpu_cores_min: 2, sandbox: 'required' },
      payload: {
        repo: 'https://github.com/cohabitation-project/workspace.git',
        ref: 'main',
        commands: [
          'git clone https://github.com/cohabitation-project/workspace.git --depth 1 --branch main work',
          'npm ci --ignore-scripts',
          'node --test commons/test/unit.mjs',
        ],
      },
      constraints: { timeout_s: 300 },
    }, ADMIN_TOKEN);
    assert.ok(queueData.task_id, 'task should be queued');

    // 6. Node polls for task
    const { data: pollData } = await api('GET', '/adin/tasks/next', null, sessionToken);
    assert.ok(pollData.task, 'node should receive the task');
    assert.equal(pollData.task.type, 'compute.build-test');
    const taskId = pollData.task.id;

    // 7. Node marks task as running
    const { data: runData } = await api('POST', `/adin/tasks/${taskId}/running`, {}, sessionToken);
    assert.ok(runData.ok);

    // 8. Node submits result
    const { data: resultData } = await api('POST', `/adin/tasks/${taskId}/result`, {
      status: 'completed',
      output: {
        exit_code: 0,
        stdout_truncated: 'all tests passed',
        structured: { tests_total: 47, tests_passed: 47, tests_failed: 0, tests_skipped: 0 },
      },
      resources_used: { peak_ram_gb: 3.2, cpu_seconds: 145, peak_temp_c: 55, disk_used_gb: 1.8 },
    }, sessionToken);
    assert.ok(resultData.accepted, `result should be accepted: ${resultData.reason}`);

    // 9. Verify node stats
    const { data: nodesData } = await api('GET', '/adin/nodes', null, ADMIN_TOKEN);
    const node = nodesData.nodes.find((n) => n.id === nodeId);
    assert.equal(node.stats.tasks_completed, 1);
    assert.equal(node.status, 'active');

    // 10. Verify usage ledger
    const { data: ledgerData } = await api('GET', `/adin/metrics/${nodeId}`, null, ADMIN_TOKEN);
    assert.equal(ledgerData.ledger.length, 1);
    assert.equal(ledgerData.ledger[0].task_type, 'compute.build-test');
    assert.equal(ledgerData.ledger[0].status, 'completed');
  });

  it('rejects enrollment with a used code', async () => {
    const { data: codeData } = await api('POST', '/adin/admin/enroll-code',
      { sponsor: 'Geoffrey', node_name: 'burn-test' }, ADMIN_TOKEN);

    // Use it once
    await api('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'test', cores: 2, threads: 4, arch: 'x86_64' }, ram_gb: 4, gpu: [] },
        storage: { total_gb: 50, free_gb: 30 },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 300 },
      },
    });

    // Try again
    const { status } = await api('POST', '/adin/enroll', {
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

  it('rejects tasks with disallowed commands', async () => {
    const { status, data } = await api('POST', '/adin/admin/queue', {
      type: 'compute.build-test',
      requirements: {},
      payload: { commands: ['rm -rf /'] },
      constraints: { timeout_s: 60 },
    }, ADMIN_TOKEN);
    assert.equal(status, 400);
    assert.ok(data.violations);
  });
});
