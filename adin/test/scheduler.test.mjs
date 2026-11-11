import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreNode, selectNode, preValidateTask } from '../scheduler.mjs';

const makeNode = (overrides = {}) => ({
  id: 'n_test1',
  name: 'test-node',
  status: 'active',
  trust_tier: 0,
  capabilities: {
    compute: { cpu: { model: 'i7', cores: 6, threads: 12, arch: 'x86_64' }, ram_gb: 12, gpu: [] },
    storage: { free_gb: 50 },
    runtime: { node: '22.11.0', sandbox: 'windows-sandbox' },
    offered: { task_types: ['compute.build-test'], max_concurrent: 1, hours: null },
    limits: { thermal_ceiling_c: 85, disk_floor_gb: 60, max_task_duration_s: 1800 },
  },
  health: { online: true, load: { cpu_percent: 20, ram_used_gb: 4, temp_c: 55, disk_free_gb: 80 } },
  stats: { tasks_completed: 10, tasks_failed: 1 },
  current_tasks: [],
  ...overrides,
});

const makeTask = (overrides = {}) => ({
  id: 't_test1',
  type: 'compute.build-test',
  priority: 5,
  requirements: { cpu_cores_min: 2, ram_gb_min: 4, disk_gb_min: 5, runtime: { node: '>=20' }, sandbox: 'required' },
  payload: {
    sandbox: 'required',
    steps: [
      { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
      { action: 'npm-ci' },
      { action: 'node-test', files: ['commons/test/unit.mjs'] },
    ],
  },
  constraints: { timeout_s: 600, trust_tier_min: 0 },
  ...overrides,
});

describe('scheduler', () => {
  describe('scoreNode', () => {
    it('accepts an eligible node', () => {
      const result = scoreNode(makeNode(), makeTask());
      assert.ok(result.eligible);
      assert.ok(result.score > 0);
    });

    it('rejects an offline node', () => {
      const node = makeNode({ health: { online: false, load: {} } });
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('offline'));
    });

    it('rejects a suspended node', () => {
      const result = scoreNode(makeNode({ status: 'suspended' }), makeTask());
      assert.ok(!result.eligible);
    });

    it('rejects a node missing the task type', () => {
      const node = makeNode();
      node.capabilities.offered.task_types = ['inference.completion'];
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
    });

    it('rejects when trust tier is too low', () => {
      const task = makeTask({ constraints: { timeout_s: 600, trust_tier_min: 2 } });
      const result = scoreNode(makeNode(), task);
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('trust tier'));
    });

    it('rejects when sandbox is required but absent', () => {
      const node = makeNode();
      node.capabilities.runtime = { node: '22.11.0' }; // no sandbox
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('sandbox'));
    });

    it('rejects when at capacity', () => {
      const node = makeNode({ current_tasks: ['t_1'] }); // max_concurrent = 1
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('capacity'));
    });

    it('excludes the assigned task from concurrency count when excludeTaskId is set', () => {
      const node = makeNode({ current_tasks: ['t_already_assigned'] }); // 1 task, max 1
      node.capabilities.offered.max_concurrent = 1;
      // Without excludeTaskId: at capacity
      const r1 = scoreNode(node, makeTask());
      assert.ok(!r1.eligible, 'should be at capacity without exclusion');
      // With excludeTaskId: the assigned task doesn't count against itself
      const r2 = scoreNode(node, makeTask(), { excludeTaskId: 't_already_assigned' });
      assert.ok(r2.eligible, 'should be eligible when own task is excluded');
    });

    it('still rejects when over thermal limit even with excludeTaskId', () => {
      const node = makeNode({ current_tasks: ['t_my_task'] });
      node.capabilities.offered.max_concurrent = 1;
      node.capabilities.limits.thermal_ceiling_c = 70;
      node.health.load.temp_c = 95;
      const result = scoreNode(node, makeTask(), { excludeTaskId: 't_my_task' });
      assert.ok(!result.eligible, 'thermal limit must still apply');
      assert.ok(result.reason.includes('thermal'));
    });

    it('rejects when RAM is insufficient', () => {
      const node = makeNode();
      node.capabilities.offered.ram_gb = 12;
      node.health.load.ram_used_gb = 10;
      const task = makeTask({ requirements: { ...makeTask().requirements, ram_gb_min: 4 } });
      const result = scoreNode(node, task);
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('RAM'));
    });

    it('rejects when thermal limit is reached', () => {
      const node = makeNode();
      node.health.load.temp_c = 90;
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('thermal'));
    });

    it('rejects when below disk floor', () => {
      const node = makeNode();
      node.health.load.disk_free_gb = 50; // floor is 60
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('disk floor'));
    });

    it('rejects when runtime version is too old', () => {
      const node = makeNode();
      node.capabilities.runtime.node = '18.0.0';
      const result = scoreNode(node, makeTask());
      assert.ok(!result.eligible);
      assert.ok(result.reason.includes('node'));
    });

    it('gives higher score to nodes with more headroom', () => {
      const nodeA = makeNode({ id: 'n_a' });
      nodeA.health.load.cpu_percent = 80; // busy
      const nodeB = makeNode({ id: 'n_b' });
      nodeB.health.load.cpu_percent = 10; // idle
      const scoreA = scoreNode(nodeA, makeTask()).score;
      const scoreB = scoreNode(nodeB, makeTask()).score;
      assert.ok(scoreB > scoreA, `idle node (${scoreB}) should score higher than busy node (${scoreA})`);
    });

    it('gives higher score to nodes with higher trust tier', () => {
      const nodeA = makeNode({ id: 'n_a', trust_tier: 0 });
      const nodeB = makeNode({ id: 'n_b', trust_tier: 2 });
      const scoreA = scoreNode(nodeA, makeTask()).score;
      const scoreB = scoreNode(nodeB, makeTask()).score;
      assert.ok(scoreB > scoreA);
    });
  });

  describe('selectNode', () => {
    it('selects the best node', () => {
      const nodes = [
        makeNode({ id: 'n_busy', health: { online: true, load: { cpu_percent: 90, ram_used_gb: 2, temp_c: 50, disk_free_gb: 80 } } }),
        makeNode({ id: 'n_idle', health: { online: true, load: { cpu_percent: 10, ram_used_gb: 2, temp_c: 50, disk_free_gb: 80 } } }),
      ];
      const result = selectNode(nodes, makeTask());
      assert.equal(result.selected.node_id, 'n_idle');
    });

    it('returns null when no node qualifies', () => {
      const nodes = [makeNode({ status: 'suspended' })];
      const result = selectNode(nodes, makeTask());
      assert.equal(result.selected, null);
    });

    it('logs why each node was considered', () => {
      const nodes = [
        makeNode({ id: 'n_a' }),
        makeNode({ id: 'n_b', status: 'suspended' }),
      ];
      const result = selectNode(nodes, makeTask());
      assert.equal(result.considered.length, 2);
      const suspended = result.considered.find((c) => c.node_id === 'n_b');
      assert.ok(!suspended.eligible);
    });
  });

  describe('preValidateTask', () => {
    it('passes valid compute tasks with structured steps', () => {
      const task = makeTask();
      const result = preValidateTask(task);
      assert.ok(result.safe);
    });

    it('rejects compute tasks with invalid steps', () => {
      const task = makeTask({
        payload: {
          sandbox: 'required',
          steps: [{ action: 'curl', url: 'http://evil.com' }],
        },
      });
      const result = preValidateTask(task);
      assert.ok(!result.safe);
      assert.ok(result.violations.length > 0);
    });

    it('rejects compute tasks without steps', () => {
      const task = makeTask({ payload: { sandbox: 'required' } });
      const result = preValidateTask(task);
      assert.ok(!result.safe);
    });

    it('skips validation for non-compute tasks', () => {
      const task = { type: 'inference.completion', payload: { prompt: 'hello' } };
      const result = preValidateTask(task);
      assert.ok(result.safe);
    });
  });
});
