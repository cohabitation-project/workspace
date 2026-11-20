/**
 * phase2.test.mjs — Tests for ADIN Phase 2 fixes:
 *   - Priority 2: Suspension releases tasks
 *   - Priority 3: Review approval enforcement
 *   - Priority 4: Duplicate result protection
 *
 * Uses a single orchestrator to avoid port conflicts.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createOrchestrator } from '../orchestrator.mjs';

describe('Phase 2 fixes', () => {
  let dir, orch, workerPort, adminPort;
  const ADMIN_TOKEN = 'test-phase2-token';

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-phase2-'));
    orch = createOrchestrator({
      dataDir: dir,
      host: '127.0.0.1',
      port: 0,
      adminPort: 0,
      adminToken: ADMIN_TOKEN,
      rateLimitMax: 200,
    });
    await orch.start();
    workerPort = orch.workerServer().address().port;
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

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

  async function enrollAndAuth(name) {
    const { data: codeData } = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: name });
    const capabilities = {
      compute: { cpu: { model: 'test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
      storage: { total_gb: 100, free_gb: 50 },
      runtime: { node: '22.0.0', sandbox: 'windows-sandbox' },
      offered: { task_types: ['compute.build-test'], max_concurrent: 3 },
      limits: { max_task_duration_s: 600 },
    };
    const { data: enrollData } = await workerApi('POST', '/adin/enroll', { code: codeData.code, capabilities });
    const { data: authData } = await workerApi('POST', '/adin/auth', { node_id: enrollData.node_id, node_secret: enrollData.secret });
    await workerApi('POST', '/adin/heartbeat', { load: { cpu_percent: 15, ram_used_gb: 2, temp_c: 45, disk_free_gb: 80 } }, authData.token);
    return { nodeId: enrollData.node_id, secret: enrollData.secret, token: authData.token };
  }

  // ---- Priority 2: Suspension releases tasks ----

  it('suspending a node releases its assigned tasks back to queued', async () => {
    const node = await enrollAndAuth('suspend-release');
    const COMMIT = 'e'.repeat(40);
    const REPO = 'cohabitation-project/workspace';

    // Approve the commit
    orch.approvals.approve(REPO, COMMIT, 'Geoffrey');

    const validTaskDef = {
      type: 'compute.build-test',
      priority: 5,
      requirements: { cpu_cores_min: 2, sandbox: 'required' },
      payload: {
        sandbox: 'required',
        steps: [
          { action: 'git-clone', repo: REPO, commit: COMMIT },
          { action: 'npm-ci' },
          { action: 'node-test', files: ['test/unit.mjs'] },
        ],
      },
      constraints: { timeout_s: 300 },
    };

    // Submit a task directly and force-assign it to the node
    const submitted = orch.queue.submit(validTaskDef);
    assert.ok(submitted.task);
    const taskId = submitted.task.id;

    orch.queue.assign(taskId, node.nodeId);
    const nodeObj = orch.registry.getNode(node.nodeId);
    nodeObj.current_tasks.push(taskId);

    // Verify task is assigned
    const task = orch.queue.getTask(taskId);
    assert.equal(task.status, 'assigned');

    // Suspend the node
    const { data: suspendData } = await adminApi('POST', `/adin/admin/suspend/${node.nodeId}`, { reason: 'testing' });
    assert.ok(suspendData.ok);

    // Task should be released back to queued
    const releasedTask = orch.queue.getTask(taskId);
    assert.ok(releasedTask, 'task should still exist');
    assert.equal(releasedTask.status, 'queued', 'task should be back in queued status');
    assert.equal(releasedTask.assigned_to, null, 'assigned_to should be cleared');

    // Node's current_tasks should be empty
    assert.equal(nodeObj.current_tasks.length, 0, 'current_tasks should be empty after suspension');
  });

  // ---- Priority 3: Review approval enforcement ----

  it('hold a result then approve it -> task completes', () => {
    const taskDef = {
      type: 'compute.build-test',
      priority: 5,
      requirements: { cpu_cores_min: 2, sandbox: 'required' },
      payload: {
        sandbox: 'required',
        steps: [
          { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
          { action: 'npm-ci' },
          { action: 'node-test', files: ['test/unit.mjs'] },
        ],
      },
      constraints: { timeout_s: 300 },
    };

    // Submit and assign a task
    const submitted = orch.queue.submit(taskDef);
    assert.ok(submitted.task);
    const taskId = submitted.task.id;

    const nodeRecord = { id: 'n_test_review', name: 'review-node', trust_tier: 0 };
    orch.queue.assign(taskId, nodeRecord.id);

    const fullResult = {
      task_id: taskId,
      node_id: nodeRecord.id,
      status: 'completed',
      output: { exit_code: 0, structured: { tests_total: 1, tests_passed: 1, tests_failed: 0, tests_skipped: 0 } },
      resources_used: { peak_ram_gb: 1 },
    };

    // Hold for review
    const reviewId = orch.reviews.hold(fullResult, submitted.task, nodeRecord, 'cross-check divergence');

    // Fail the task (as the orchestrator does when holding)
    orch.queue.fail(taskId, nodeRecord.id, `held for review: ${reviewId}`);

    // Task should be requeued (max_retries default is 2)
    const requeuedTask = orch.queue.getTask(taskId);
    assert.ok(requeuedTask, 'task should be requeued after hold-fail');
    assert.equal(requeuedTask.status, 'queued');

    // Approve the review
    const decision = orch.reviews.decide(reviewId, 'approved', 'Geoffrey');
    assert.ok(decision.ok);
    assert.ok(decision.entry.full_result, 'full result should be stored');

    // Simulate what the orchestrator endpoint does on approval
    const task = orch.queue.getTask(taskId);
    if (task && task.status === 'queued') {
      orch.queue.assign(taskId, nodeRecord.id);
    }
    orch.queue.complete(taskId, nodeRecord.id, decision.entry.full_result);

    // Task should now be in history as completed
    assert.equal(orch.queue.getTask(taskId), null, 'task should be gone from active queue');

    const history = orch.queue.recentHistory(50);
    const found = history.find(h => h.id === taskId);
    assert.ok(found, 'task should be in history');
    assert.equal(found.status, 'completed');
  });

  it('review ID sanitization rejects path traversal', () => {
    const result = orch.reviews.decide('../../../etc/passwd', 'approved', 'attacker');
    assert.equal(result.status, 400);
    assert.ok(result.error.includes('invalid review ID'));
  });

  it('review ID sanitization rejects special characters', () => {
    const result = orch.reviews.decide('rv_123; rm -rf /', 'approved', 'attacker');
    assert.equal(result.status, 400);
  });

  // ---- Priority 4: Duplicate result protection ----

  it('second result submission for completed task is rejected with clear message', async () => {
    const node = await enrollAndAuth('dupe-test');
    const COMMIT = 'f'.repeat(40);
    const REPO = 'cohabitation-project/workspace';

    // Approve the commit
    orch.approvals.approve(REPO, COMMIT, 'Geoffrey');

    const validTaskDef = {
      type: 'compute.build-test',
      priority: 5,
      requirements: { cpu_cores_min: 2, sandbox: 'required' },
      payload: {
        sandbox: 'required',
        steps: [
          { action: 'git-clone', repo: REPO, commit: COMMIT },
          { action: 'npm-ci' },
          { action: 'node-test', files: ['test/unit.mjs'] },
        ],
      },
      constraints: { timeout_s: 300 },
    };

    // Queue a task — use direct queue submission + approval to avoid scheduler assignment races
    const submitted = orch.queue.submit(validTaskDef);
    assert.ok(submitted.task);
    const taskId = submitted.task.id;

    // Assign to our node
    orch.queue.assign(taskId, node.nodeId);
    const nodeObj = orch.registry.getNode(node.nodeId);
    nodeObj.current_tasks.push(taskId);

    // Mark running
    await workerApi('POST', `/adin/tasks/${taskId}/running`, {}, node.token);

    // Submit first result - should succeed
    const resultBody = {
      status: 'completed',
      output: {
        exit_code: 0,
        stdout_truncated: 'passed',
        structured: { tests_total: 5, tests_passed: 5, tests_failed: 0, tests_skipped: 0 },
      },
      resources_used: { peak_ram_gb: 2, cpu_seconds: 30, peak_temp_c: 50, disk_used_gb: 1 },
    };

    const { status: s1, data: d1 } = await workerApi('POST', `/adin/tasks/${taskId}/result`, resultBody, node.token);
    assert.equal(s1, 200, `first result should succeed, got ${s1}: ${JSON.stringify(d1)}`);
    assert.ok(d1.accepted);

    // Submit second result - should be rejected with clear message
    const { status: s2, data: d2 } = await workerApi('POST', `/adin/tasks/${taskId}/result`, resultBody, node.token);
    assert.ok(s2 === 404 || s2 === 409, `expected 404 or 409, got ${s2}`);
    assert.ok(
      d2.message?.includes('already completed') || d2.error?.includes('already completed') || d2.message?.includes('not found'),
      `expected clear message about completion, got: ${JSON.stringify(d2)}`
    );
  });
});
