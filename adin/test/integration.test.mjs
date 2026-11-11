/**
 * integration.test.mjs — end-to-end test of the ADIN orchestrator with a simulated node.
 *
 * Uses the real createOrchestrator() factory so all routes match production.
 * Starts two servers (worker + admin on separate ports), enrolls a node, submits a task,
 * polls for the task, submits a result, and verifies the full lifecycle.
 * Also tests port isolation, ownership checks, scheduler delivery, rate limits,
 * and B2 eligibility re-checks (thermal ceiling, disk floor).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createOrchestrator } from '../orchestrator.mjs';

describe('integration: full task lifecycle', () => {
  let dir, orch, workerPort, adminPort;
  const ADMIN_TOKEN = 'test-admin-token';

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-integ-'));

    orch = createOrchestrator({
      dataDir: dir,
      host: '127.0.0.1',
      port: 0,         // random port
      adminPort: 0,    // random port
      adminToken: ADMIN_TOKEN,
      rateLimitMax: 100, // high limit for integration tests (many enrollments per minute)
    });

    await orch.start();
    // Retrieve the actual bound ports
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
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
  async function enrollAndAuth(name = 'test-laptop', overrideLimits = {}) {
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: name });
    const capabilities = {
      compute: { cpu: { model: 'i7-test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
      storage: { total_gb: 100, free_gb: 50 },
      runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
      offered: { task_types: ['compute.build-test'], max_concurrent: 3 },
      limits: { max_task_duration_s: 600, ...overrideLimits },
    };
    const { data: enrollData } = await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities,
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

    // Queue a task
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

    // Submit a task directly to the queue and assign it to the node
    const submitResult = orch.queue.submit(validTaskDef);
    assert.ok(submitResult.task, `task should be submitted: ${submitResult.error}`);

    // Get the node ID from the enrollment response
    const realNodeId = node.nodeId;

    const assignResult = orch.queue.assign(submitResult.task.id, realNodeId);
    assert.ok(assignResult.ok, `assign should succeed: ${assignResult.error}`);

    // Verify the assignment took effect
    const assigned = orch.queue.assignedTo(realNodeId);
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
    // rateLimitMax is set to 100 for integration tests, so we need > 100 attempts
    const fakeId = 'n_rate_limit_test_' + Date.now();
    let limited = false;
    for (let i = 0; i < 110; i++) {
      const { status } = await workerApi('POST', '/adin/auth', { node_id: fakeId, node_secret: 'wrong' });
      if (status === 429) { limited = true; break; }
    }
    assert.ok(limited, 'should hit rate limit after excessive attempts');
  });

  // ---- B2: Re-check eligibility at delivery ----

  it('B2: releases assigned task when node exceeds thermal ceiling', async () => {
    // Enroll a node with thermal_ceiling_c: 70
    const node = await enrollAndAuth('thermal-node', { thermal_ceiling_c: 70 });

    // Heartbeat with 95°C (over the 70°C ceiling)
    await workerApi('POST', '/adin/heartbeat', {
      load: { cpu_percent: 90, ram_used_gb: 6, temp_c: 95, disk_free_gb: 80 },
    }, node.token);

    // Submit a task and simulate admin-queue assignment (push to current_tasks)
    const submitResult = orch.queue.submit(validTaskDef);
    assert.ok(submitResult.task);
    orch.queue.assign(submitResult.task.id, node.nodeId);
    const nodeObj = orch.registry.getNode(node.nodeId);
    nodeObj.current_tasks.push(submitResult.task.id);

    // Node polls — task should NOT be delivered (node over thermal limit)
    const { data: pollData } = await workerApi('GET', '/adin/tasks/next', null, node.token);
    assert.equal(pollData.task, null, 'task should NOT be delivered when node exceeds thermal ceiling');

    // Verify the task was released back to queued
    const releasedTask = orch.queue.getTask(submitResult.task.id);
    assert.ok(releasedTask, 'task should still exist in queue');
    assert.equal(releasedTask.status, 'queued', 'task should be back in queued status');
    assert.equal(releasedTask.assigned_to, null, 'assigned_to should be cleared');
  });

  it('B2: releases assigned task when node violates disk floor', async () => {
    // Enroll a node with disk_floor_gb: 50
    const node = await enrollAndAuth('disk-node', { disk_floor_gb: 50 });

    // Heartbeat with low disk (20 GB < 50 GB floor)
    await workerApi('POST', '/adin/heartbeat', {
      load: { cpu_percent: 15, ram_used_gb: 2, temp_c: 40, disk_free_gb: 20 },
    }, node.token);

    // Submit a task and simulate admin-queue assignment (push to current_tasks)
    const submitResult = orch.queue.submit(validTaskDef);
    assert.ok(submitResult.task);
    orch.queue.assign(submitResult.task.id, node.nodeId);
    const nodeObj = orch.registry.getNode(node.nodeId);
    nodeObj.current_tasks.push(submitResult.task.id);

    // Poll — should NOT get the task
    const { data: pollData } = await workerApi('GET', '/adin/tasks/next', null, node.token);
    assert.equal(pollData.task, null, 'task should NOT be delivered when disk below floor');

    // Verify task released back to queued
    const task = orch.queue.getTask(submitResult.task.id);
    assert.ok(task);
    assert.equal(task.status, 'queued', 'task should be released to queued after disk floor violation');
  });

  // ---- Concurrency: assigned task does not self-block (Aletheia's finding) ----

  it('delivers admin-assigned task to max_concurrent:1 node (no self-blocking)', async () => {
    // Enroll a node with max_concurrent: 1
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: 'conc-node' });
    const { data: enrollData } = await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
        storage: { total_gb: 100, free_gb: 80 },
        runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 600 },
      },
    });
    const { data: authData } = await workerApi('POST', '/adin/auth', { node_id: enrollData.node_id, node_secret: enrollData.secret });
    await workerApi('POST', '/adin/heartbeat', {
      load: { cpu_percent: 10, ram_used_gb: 2, temp_c: 40, disk_free_gb: 80 },
    }, authData.token);

    // Admin queues a task — should be assigned immediately to this node
    const { data: queueData } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    assert.ok(queueData.assigned_to, 'task should be assigned to the node');

    // Verify node.current_tasks has the task
    const nodeObj = orch.registry.getNode(enrollData.node_id);
    assert.equal(nodeObj.current_tasks.length, 1, 'node should have 1 current task');
    assert.equal(nodeObj.capabilities.offered.max_concurrent, 1, 'max_concurrent should be 1');

    // Node polls — the assigned task MUST be delivered despite max_concurrent:1
    const { data: pollData } = await workerApi('GET', '/adin/tasks/next', null, authData.token);
    assert.ok(pollData.task, 'assigned task MUST be delivered — it should not self-block');
    assert.equal(pollData.task.id, queueData.task_id, 'delivered task should be the admin-assigned one');
  });

  it('rejects a second task when max_concurrent:1 is reached', async () => {
    // Enroll a node with max_concurrent: 1
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: 'conc-limit-node' });
    const { data: enrollData } = await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
        storage: { total_gb: 100, free_gb: 80 },
        runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 600 },
      },
    });
    const { data: authData } = await workerApi('POST', '/adin/auth', { node_id: enrollData.node_id, node_secret: enrollData.secret });
    await workerApi('POST', '/adin/heartbeat', {
      load: { cpu_percent: 10, ram_used_gb: 2, temp_c: 40, disk_free_gb: 80 },
    }, authData.token);

    // Queue first task — gets assigned and picked up
    const { data: q1 } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    const { data: poll1 } = await workerApi('GET', '/adin/tasks/next', null, authData.token);
    assert.ok(poll1.task, 'first task should be delivered');
    // Mark it running so it occupies the slot
    await workerApi('POST', `/adin/tasks/${poll1.task.id}/running`, {}, authData.token);

    // Queue second task
    await adminApi('POST', '/adin/admin/queue', validTaskDef);

    // Poll again — should get nothing (at capacity)
    const { data: poll2 } = await workerApi('GET', '/adin/tasks/next', null, authData.token);
    assert.equal(poll2.task, null, 'second task should NOT be delivered — node is at capacity');
  });

  it('thermal ceiling still blocks delivery even with excludeTaskId', async () => {
    // A node with max_concurrent:1 that is over thermal limit should NOT get its assigned task
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: 'hot-conc-node' });
    const { data: enrollData } = await workerApi('POST', '/adin/enroll', {
      code: codeData.code,
      capabilities: {
        compute: { cpu: { model: 'test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
        storage: { total_gb: 100, free_gb: 80 },
        runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
        offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
        limits: { max_task_duration_s: 600, thermal_ceiling_c: 70 },
      },
    });
    const { data: authData } = await workerApi('POST', '/adin/auth', { node_id: enrollData.node_id, node_secret: enrollData.secret });
    // Heartbeat at healthy temp first
    await workerApi('POST', '/adin/heartbeat', {
      load: { cpu_percent: 10, ram_used_gb: 2, temp_c: 40, disk_free_gb: 80 },
    }, authData.token);

    // Queue task — gets assigned
    const { data: qData } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    assert.ok(qData.assigned_to, 'task should be assigned');

    // Now heartbeat at 95°C (over limit)
    await workerApi('POST', '/adin/heartbeat', {
      load: { cpu_percent: 10, ram_used_gb: 2, temp_c: 95, disk_free_gb: 80 },
    }, authData.token);

    // Poll — task should NOT be delivered despite excludeTaskId fixing the concurrency check
    const { data: pollData } = await workerApi('GET', '/adin/tasks/next', null, authData.token);
    assert.equal(pollData.task, null, 'over-temperature node must NOT receive task even with concurrency exclusion');
  });

  // NOTE: Availability window re-check is difficult to test with real time in a fast test.
  // The scheduler's isWithinHours() uses the real clock. To test this properly, either the
  // scheduler would need injectable time, or the test would need to run during a specific
  // minute. This is documented as needing deployment testing.
});
