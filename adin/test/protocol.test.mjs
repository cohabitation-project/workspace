import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCapabilities, validateTask, validateResult, commandAllowed, validateCommands } from '../protocol.mjs';

describe('protocol', () => {
  const validCapabilities = {
    compute: { cpu: { model: 'Intel i7', cores: 6, threads: 12, arch: 'x86_64' }, ram_gb: 12, gpu: [] },
    storage: { total_gb: 120, free_gb: 55 },
    inference: { runtime: 'ollama', loaded_models: [] },
    runtime: { node: '22.11.0', sandbox: 'windows-sandbox' },
    offered: { task_types: ['compute.build-test'], max_concurrent: 1, cpu_percent: 80, ram_gb: 8 },
    limits: { thermal_ceiling_c: 85, disk_floor_gb: 60, max_task_duration_s: 1800 },
  };

  describe('validateCapabilities', () => {
    it('accepts valid capabilities', () => {
      const { valid, errors } = validateCapabilities(validCapabilities);
      assert.ok(valid, `unexpected errors: ${errors.join(', ')}`);
    });

    it('rejects missing compute section', () => {
      const { valid } = validateCapabilities({ storage: {}, offered: {}, limits: {} });
      assert.ok(!valid);
    });

    it('rejects unknown task types', () => {
      const cap = { ...validCapabilities, offered: { ...validCapabilities.offered, task_types: ['unknown.type'] } };
      const { valid, errors } = validateCapabilities(cap);
      assert.ok(!valid);
      assert.ok(errors.some((e) => e.includes('unknown task type')));
    });

    it('rejects zero cores', () => {
      const cap = JSON.parse(JSON.stringify(validCapabilities));
      cap.compute.cpu.cores = 0;
      const { valid } = validateCapabilities(cap);
      assert.ok(!valid);
    });

    it('rejects non-array GPU field', () => {
      const cap = JSON.parse(JSON.stringify(validCapabilities));
      cap.compute.gpu = 'nvidia';
      const { valid } = validateCapabilities(cap);
      assert.ok(!valid);
    });
  });

  describe('validateTask', () => {
    const validTask = {
      type: 'compute.build-test',
      requirements: { cpu_cores_min: 2, ram_gb_min: 4 },
      payload: { repo: 'https://github.com/cohabitation-project/workspace.git', commands: ['npm ci --ignore-scripts'] },
      constraints: { timeout_s: 600 },
    };

    it('accepts a valid compute task', () => {
      const { valid } = validateTask(validTask);
      assert.ok(valid);
    });

    it('rejects missing type', () => {
      const { valid } = validateTask({ ...validTask, type: undefined });
      assert.ok(!valid);
    });

    it('rejects compute task without commands', () => {
      const { valid } = validateTask({ ...validTask, payload: { repo: 'test' } });
      assert.ok(!valid);
    });

    it('rejects inference task without prompt', () => {
      const task = { type: 'inference.completion', requirements: {}, payload: { model: 'test' }, constraints: { timeout_s: 60 } };
      const { valid } = validateTask(task);
      assert.ok(!valid);
    });

    it('accepts inference task with prompt', () => {
      const task = { type: 'inference.completion', requirements: {}, payload: { prompt: 'hello' }, constraints: { timeout_s: 60 } };
      const { valid } = validateTask(task);
      assert.ok(valid);
    });
  });

  describe('validateResult', () => {
    it('accepts a valid result', () => {
      const { valid } = validateResult({
        task_id: 't_123', node_id: 'n_456', status: 'completed',
        output: { exit_code: 0 }, resources_used: { peak_ram_gb: 1 },
      });
      assert.ok(valid);
    });

    it('rejects missing task_id', () => {
      const { valid } = validateResult({ node_id: 'n_456', status: 'completed', output: {}, resources_used: {} });
      assert.ok(!valid);
    });

    it('rejects invalid status', () => {
      const { valid } = validateResult({ task_id: 't_1', node_id: 'n_1', status: 'running', output: {}, resources_used: {} });
      assert.ok(!valid);
    });
  });

  describe('commandAllowed', () => {
    it('allows git clone from cohabitation-project', () => {
      const { allowed } = commandAllowed('git clone https://github.com/cohabitation-project/workspace.git --depth 1 --branch main work');
      assert.ok(allowed);
    });

    it('rejects git clone from other orgs', () => {
      const { allowed } = commandAllowed('git clone https://github.com/evil/repo.git --depth 1 --branch main work');
      assert.ok(!allowed);
    });

    it('allows npm ci --ignore-scripts', () => {
      assert.ok(commandAllowed('npm ci --ignore-scripts').allowed);
    });

    it('rejects npm ci without --ignore-scripts', () => {
      assert.ok(!commandAllowed('npm ci').allowed);
    });

    it('rejects npm install', () => {
      assert.ok(!commandAllowed('npm install').allowed);
    });

    it('allows node --test with a path', () => {
      assert.ok(commandAllowed('node --test commons/test/unit.mjs').allowed);
    });

    it('rejects arbitrary commands', () => {
      assert.ok(!commandAllowed('rm -rf /').allowed);
      assert.ok(!commandAllowed('curl http://evil.com').allowed);
      assert.ok(!commandAllowed('powershell -c "Get-Process"').allowed);
    });

    it('rejects empty and null commands', () => {
      assert.ok(!commandAllowed('').allowed);
      assert.ok(!commandAllowed(null).allowed);
    });
  });

  describe('validateCommands', () => {
    it('reports all commands checked', () => {
      const result = validateCommands([
        'git clone https://github.com/cohabitation-project/workspace.git --depth 1 --branch main work',
        'npm ci --ignore-scripts',
        'node --test commons/test/unit.mjs',
      ]);
      assert.ok(result.all_allowed);
      assert.equal(result.checks.length, 3);
    });

    it('rejects if any command is disallowed', () => {
      const result = validateCommands(['npm ci --ignore-scripts', 'curl http://evil.com']);
      assert.ok(!result.all_allowed);
      assert.equal(result.checks.filter((c) => !c.allowed).length, 1);
    });
  });
});
