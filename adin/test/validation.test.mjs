import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateTaskResult, generateCanary, checkCanary, ReviewQueue } from '../validation.mjs';

describe('validation', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-val-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const makeNode = (tier = 0) => ({ id: 'n_test', name: 'test-node', trust_tier: tier });

  describe('build-test validation', () => {
    const task = { id: 't_1', type: 'compute.build-test' };

    it('accepts consistent passing results', async () => {
      const result = {
        task_id: 't_1', node_id: 'n_test', status: 'completed',
        output: { exit_code: 0, structured: { tests_total: 10, tests_passed: 10, tests_failed: 0 } },
        resources_used: { peak_ram_gb: 2 },
      };
      const v = await validateTaskResult(result, task, makeNode(), { provenanceDir: dir });
      assert.ok(v.accepted, v.reason);
    });

    it('rejects inconsistent exit_code vs failures', async () => {
      const result = {
        task_id: 't_1', node_id: 'n_test', status: 'completed',
        output: { exit_code: 0, structured: { tests_total: 10, tests_passed: 8, tests_failed: 2 } },
        resources_used: { peak_ram_gb: 2 },
      };
      const v = await validateTaskResult(result, task, makeNode());
      assert.ok(!v.accepted || v.held_for_review);
    });

    it('rejects count mismatch', async () => {
      const result = {
        task_id: 't_1', node_id: 'n_test', status: 'completed',
        output: { exit_code: 0, structured: { tests_total: 10, tests_passed: 5, tests_failed: 3, tests_skipped: 0 } },
        resources_used: { peak_ram_gb: 2 },
      };
      const v = await validateTaskResult(result, task, makeNode());
      assert.ok(!v.accepted || v.held_for_review);
    });
  });

  describe('inference validation', () => {
    const task = { id: 't_2', type: 'inference.completion' };

    it('accepts clean inference results', async () => {
      const result = {
        task_id: 't_2', node_id: 'n_test', status: 'completed',
        output: { structured: { text: 'The answer is 42.', model: 'test-7b', tokens_used: { prompt: 100, completion: 10 } } },
        resources_used: { peak_ram_gb: 4 },
      };
      const v = await validateTaskResult(result, task, makeNode(1));
      assert.ok(v.accepted, v.reason);
    });

    it('strips identity leaks but still accepts', async () => {
      const result = {
        task_id: 't_2', node_id: 'n_test', status: 'completed',
        output: { structured: { text: '— Ambassador · model: llama-7b\nThe answer is 42.' } },
        resources_used: { peak_ram_gb: 4 },
      };
      const v = await validateTaskResult(result, task, makeNode(1));
      assert.ok(v.accepted);
      // The identity leak line should be stripped
      assert.ok(!v.result.output.structured.text.includes('Ambassador'));
    });

    it('holds role-reversal for review', async () => {
      const result = {
        task_id: 't_2', node_id: 'n_test', status: 'completed',
        output: { structured: { text: 'I was referring to your earlier question about the project.' } },
        resources_used: { peak_ram_gb: 4 },
      };
      const v = await validateTaskResult(result, task, makeNode(1));
      assert.ok(v.held_for_review);
    });

    it('rejects empty inference results', async () => {
      const result = {
        task_id: 't_2', node_id: 'n_test', status: 'completed',
        output: { structured: { text: '' } },
        resources_used: { peak_ram_gb: 4 },
      };
      const v = await validateTaskResult(result, task, makeNode(1));
      assert.ok(!v.accepted || v.held_for_review);
    });

    it('rejects overly long results', async () => {
      const result = {
        task_id: 't_2', node_id: 'n_test', status: 'completed',
        output: { structured: { text: 'x'.repeat(20_000) } },
        resources_used: { peak_ram_gb: 4 },
      };
      const v = await validateTaskResult(result, task, makeNode(1));
      assert.ok(!v.accepted || v.held_for_review);
    });
  });

  describe('cross-check (tier 0)', () => {
    const task = { id: 't_3', type: 'inference.completion', payload: { prompt: 'What is 2+2?' } };

    it('holds divergent results for review', async () => {
      const result = {
        task_id: 't_3', node_id: 'n_test', status: 'completed',
        output: { structured: { text: 'The moon is made of cheese and elephants can fly.' } },
        resources_used: { peak_ram_gb: 4 },
      };
      const crossCheckFn = async () => 'The answer is 4.';
      const v = await validateTaskResult(result, task, makeNode(0), { crossCheckFn, provenanceDir: dir });
      assert.ok(v.held_for_review);
    });

    it('accepts similar results', async () => {
      const result = {
        task_id: 't_3', node_id: 'n_test', status: 'completed',
        output: { structured: { text: 'The answer is four, which equals 4.' } },
        resources_used: { peak_ram_gb: 4 },
      };
      const crossCheckFn = async () => 'The answer is 4.';
      const v = await validateTaskResult(result, task, makeNode(0), { crossCheckFn, provenanceDir: dir });
      assert.ok(v.accepted);
    });

    it('skips cross-check for tier 1+ nodes', async () => {
      const result = {
        task_id: 't_3', node_id: 'n_test', status: 'completed',
        output: { structured: { text: 'Completely different answer.' } },
        resources_used: { peak_ram_gb: 4 },
      };
      const crossCheckFn = async () => 'The answer is 4.';
      const v = await validateTaskResult(result, task, makeNode(1), { crossCheckFn, provenanceDir: dir });
      // Should not be held — cross-check is only for tier 0
      assert.ok(v.accepted);
    });
  });

  describe('provenance', () => {
    it('writes provenance log', async () => {
      const result = {
        task_id: 't_prov', node_id: 'n_test', status: 'completed',
        output: { exit_code: 0, structured: { tests_total: 1, tests_passed: 1, tests_failed: 0 } },
        resources_used: { peak_ram_gb: 1 },
      };
      const provDir = path.join(dir, 'prov');
      await validateTaskResult(result, { id: 't_prov', type: 'compute.build-test' }, makeNode(), { provenanceDir: provDir });
      const logFile = path.join(provDir, 'provenance.jsonl');
      assert.ok(fs.existsSync(logFile));
      const entry = JSON.parse(fs.readFileSync(logFile, 'utf8').trim());
      assert.equal(entry.task_id, 't_prov');
      assert.equal(entry.node_id, 'n_test');
      assert.ok(entry.accepted);
    });
  });

  describe('canary', () => {
    it('generates a canary with a known answer', () => {
      const c = generateCanary();
      assert.ok(c.prompt);
      assert.ok(c.expected_contains);
      assert.ok(c.is_canary);
    });

    it('passes correct canary answers', () => {
      const c = { prompt: 'What is 7*8?', expected_contains: '56' };
      assert.ok(checkCanary(c, 'The answer is 56.').passed);
    });

    it('fails wrong canary answers', () => {
      const c = { prompt: 'What is 7*8?', expected_contains: '56' };
      assert.ok(!checkCanary(c, 'The answer is 42.').passed);
    });
  });

  describe('ReviewQueue', () => {
    it('holds and lists pending reviews', () => {
      const rq = new ReviewQueue(dir);
      const id = rq.hold(
        { output: { structured: { text: 'test' } } },
        { id: 't_1', type: 'inference.completion' },
        makeNode(),
        'test reason'
      );
      assert.ok(id.startsWith('rv_'));
      const pending = rq.pending();
      assert.equal(pending.length, 1);
      assert.equal(pending[0].reason, 'test reason');
    });

    it('records decisions', () => {
      const rq = new ReviewQueue(dir);
      const id = rq.hold({}, { id: 't_1', type: 'test' }, makeNode(), 'reason');
      const result = rq.decide(id, 'approved', 'Geoffrey');
      assert.ok(result.ok);
      assert.equal(result.entry.decision, 'approved');
      // No longer in pending
      assert.equal(rq.pending().length, 0);
    });
  });
});
