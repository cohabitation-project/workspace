import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TaskQueue } from '../queue.mjs';

const validTask = {
  type: 'compute.build-test',
  priority: 5,
  requirements: { cpu_cores_min: 2 },
  payload: {
    sandbox: 'required',
    steps: [
      { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
      { action: 'npm-ci' },
      { action: 'node-test', files: ['commons/test/unit.mjs'] },
    ],
  },
  constraints: { timeout_s: 600 },
};

const makeNode = (overrides = {}) => ({
  id: 'n_test1',
  trust_tier: 0,
  capabilities: {
    offered: { task_types: ['compute.build-test'], max_concurrent: 1 },
    runtime: { sandbox: 'windows-sandbox' },
  },
  ...overrides,
});

describe('queue', () => {
  let dir, q;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-queue-test-'));
    q = new TaskQueue(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('submit', () => {
    it('creates a task with a unique ID', () => {
      const { task } = q.submit(validTask);
      assert.ok(task.id.startsWith('t_'));
      assert.equal(task.status, 'queued');
    });

    it('rejects invalid tasks', () => {
      const result = q.submit({ type: 'bogus' });
      assert.ok(result.error);
    });
  });

  describe('assignment', () => {
    it('finds the next task for a capable node', () => {
      q.submit(validTask);
      const task = q.nextFor(makeNode());
      assert.ok(task);
    });

    it('returns null for nodes with wrong type', () => {
      q.submit(validTask);
      const task = q.nextFor(makeNode({ capabilities: { offered: { task_types: ['inference.completion'], max_concurrent: 1 } } }));
      assert.equal(task, null);
    });

    it('assigns a task to a node', () => {
      const { task } = q.submit(validTask);
      const result = q.assign(task.id, 'n_test1');
      assert.ok(result.ok);
      assert.equal(result.task.status, 'assigned');
    });

    it('respects priority ordering', () => {
      q.submit({ ...validTask, priority: 10 });
      const { task: highPri } = q.submit({ ...validTask, priority: 1 });
      const next = q.nextFor(makeNode());
      assert.equal(next.id, highPri.id);
    });

    it('respects trust tier requirements', () => {
      q.submit({ ...validTask, constraints: { ...validTask.constraints, trust_tier_min: 2 } });
      const task = q.nextFor(makeNode({ trust_tier: 0 }));
      assert.equal(task, null);
    });

    it('respects sandbox requirements', () => {
      q.submit({ ...validTask, requirements: { ...validTask.requirements, sandbox: 'required' } });
      const task = q.nextFor(makeNode({ capabilities: { offered: { task_types: ['compute.build-test'], max_concurrent: 1 }, runtime: {} } }));
      assert.equal(task, null);
    });
  });

  describe('completion', () => {
    it('completes a task', () => {
      const { task } = q.submit(validTask);
      q.assign(task.id, 'n_test1');
      const result = q.complete(task.id, 'n_test1', { output: 'ok' });
      assert.ok(result.ok);
      assert.equal(result.task.status, 'completed');
    });

    it('removes completed tasks from active queue', () => {
      const { task } = q.submit(validTask);
      q.assign(task.id, 'n_test1');
      q.complete(task.id, 'n_test1', { output: 'ok' });
      assert.equal(q.activeTasks().length, 0);
    });

    it('rejects completion from wrong node', () => {
      const { task } = q.submit(validTask);
      q.assign(task.id, 'n_test1');
      const result = q.complete(task.id, 'n_other', { output: 'ok' });
      assert.ok(result.error);
    });
  });

  describe('failure and retry', () => {
    it('requeues on failure when retries remain', () => {
      const { task } = q.submit({ ...validTask, max_retries: 2 });
      q.assign(task.id, 'n_test1');
      const result = q.fail(task.id, 'n_test1', 'crashed');
      assert.equal(result.action, 'requeued');
      assert.equal(q.getTask(task.id).status, 'queued');
      assert.equal(q.getTask(task.id).retries, 1);
    });

    it('fails permanently when retries exhausted', () => {
      const { task } = q.submit({ ...validTask, max_retries: 0 });
      q.assign(task.id, 'n_test1');
      const result = q.fail(task.id, 'n_test1', 'crashed');
      assert.equal(result.action, 'failed_permanently');
    });

    it('orchestrator can fail tasks (null node_id)', () => {
      const { task } = q.submit({ ...validTask, max_retries: 0 });
      q.assign(task.id, 'n_test1');
      const result = q.fail(task.id, null, 'node went offline');
      assert.equal(result.action, 'failed_permanently');
    });
  });

  describe('cancellation', () => {
    it('cancels a queued task', () => {
      const { task } = q.submit(validTask);
      const result = q.cancel(task.id);
      assert.ok(result.ok);
      assert.equal(q.activeTasks().length, 0);
    });
  });

  describe('assignedTo', () => {
    it('returns tasks assigned to a specific node', () => {
      const { task: t1 } = q.submit(validTask);
      const { task: t2 } = q.submit(validTask);
      q.assign(t1.id, 'n_node_a');
      q.assign(t2.id, 'n_node_b');
      const assigned = q.assignedTo('n_node_a');
      assert.equal(assigned.length, 1);
      assert.equal(assigned[0].id, t1.id);
      assert.equal(assigned[0].status, 'assigned');
    });

    it('returns empty array when no tasks assigned', () => {
      q.submit(validTask);
      const assigned = q.assignedTo('n_nobody');
      assert.equal(assigned.length, 0);
    });

    it('does not return running tasks', () => {
      const { task } = q.submit(validTask);
      q.assign(task.id, 'n_test1');
      q.markRunning(task.id, 'n_test1');
      const assigned = q.assignedTo('n_test1');
      assert.equal(assigned.length, 0, 'assignedTo should only return status=assigned');
    });
  });

  describe('stale sweep', () => {
    it('detects stale assigned tasks', () => {
      const { task } = q.submit(validTask);
      q.assign(task.id, 'n_test1');
      // Backdate assignment
      q.getTask(task.id).assigned_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const stale = q.sweepStale();
      assert.ok(stale.includes(task.id));
    });
  });

  describe('persistence', () => {
    it('survives restart', () => {
      const { task } = q.submit(validTask);
      q.save();
      const q2 = new TaskQueue(dir);
      assert.ok(q2.getTask(task.id));
    });
  });
});
