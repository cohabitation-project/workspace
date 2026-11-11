import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Registry } from '../registry.mjs';

const validCap = {
  compute: { cpu: { model: 'test', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] },
  storage: { total_gb: 100, free_gb: 50 },
  offered: { task_types: ['compute.build-test'], max_concurrent: 1, cpu_percent: 80 },
  limits: { max_task_duration_s: 600 },
};

describe('registry', () => {
  let dir, reg;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-test-'));
    reg = new Registry(dir);
  });

  afterEach(() => {
    reg.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('enrollment', () => {
    it('creates enrollment codes', () => {
      const { code, expires_at } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test-laptop' });
      assert.ok(code.startsWith('adin_enroll_'));
      assert.ok(new Date(expires_at).getTime() > Date.now());
    });

    it('enrolls a node with a valid code', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test-laptop' });
      const result = reg.enroll(code, validCap);
      assert.ok(!result.error, result.error);
      assert.ok(result.node_id.startsWith('n_'));
      assert.ok(result.secret.startsWith('adin_ns_'));
    });

    it('burns the code after use', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test-laptop' });
      reg.enroll(code, validCap);
      const second = reg.enroll(code, validCap);
      assert.equal(second.error, 'invalid enrollment code');
    });

    it('rejects expired codes', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test-laptop' });
      // Manually expire it
      for (const [, entry] of reg.enrollCodes) entry.expires_at = Date.now() - 1;
      const result = reg.enroll(code, validCap);
      assert.equal(result.error, 'enrollment code expired');
    });

    it('rejects invalid capabilities', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test-laptop' });
      const result = reg.enroll(code, { compute: { cpu: {} } });
      assert.ok(result.error?.includes('invalid capabilities'));
    });
  });

  describe('authentication', () => {
    let nodeId, secret;

    beforeEach(() => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test-laptop' });
      const enrolled = reg.enroll(code, validCap);
      nodeId = enrolled.node_id;
      secret = enrolled.secret;
    });

    it('authenticates with valid credentials', () => {
      const result = reg.authenticate(nodeId, secret);
      assert.ok(!result.error, result.error);
      assert.ok(result.token.startsWith('adin_st_'));
    });

    it('rejects wrong secret', () => {
      const result = reg.authenticate(nodeId, 'wrong');
      assert.equal(result.error, 'invalid credentials');
    });

    it('rejects unknown node', () => {
      const result = reg.authenticate('n_unknown', secret);
      assert.equal(result.error, 'unknown node');
    });

    it('session token validates correctly', () => {
      const { token } = reg.authenticate(nodeId, secret);
      const node = reg.validateSession(token);
      assert.ok(node);
      assert.equal(node.id, nodeId);
    });

    it('rejects expired session tokens', () => {
      const { token } = reg.authenticate(nodeId, secret);
      // Manually expire it
      for (const [, session] of reg.sessions) session.expires_at = Date.now() - 1;
      const node = reg.validateSession(token);
      assert.equal(node, null);
    });
  });

  describe('rotation', () => {
    let nodeId, secret;

    beforeEach(() => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const enrolled = reg.enroll(code, validCap);
      nodeId = enrolled.node_id;
      secret = enrolled.secret;
    });

    it('rotates to a new secret', () => {
      const result = reg.rotate(nodeId, secret);
      assert.ok(!result.error, result.error);
      assert.ok(result.secret.startsWith('adin_ns_'));
      assert.notEqual(result.secret, secret);
    });

    it('new secret works for auth', () => {
      const { secret: newSecret } = reg.rotate(nodeId, secret);
      const auth = reg.authenticate(nodeId, newSecret);
      assert.ok(!auth.error, auth.error);
    });

    it('old secret works during grace period', () => {
      reg.rotate(nodeId, secret);
      const auth = reg.authenticate(nodeId, secret);
      assert.ok(!auth.error, 'old secret should work in grace period');
    });

    it('old secret fails after grace period', () => {
      reg.rotate(nodeId, secret);
      // Manually expire grace period
      const node = reg.getNode(nodeId);
      node.credential.previous.rotated_at = Date.now() - 10 * 60 * 1000;
      const auth = reg.authenticate(nodeId, secret);
      assert.equal(auth.error, 'invalid credentials');
    });

    it('active tasks are not disrupted by rotation', () => {
      // Auth first, get a session
      const { token } = reg.authenticate(nodeId, secret);
      // Rotate
      reg.rotate(nodeId, secret);
      // Existing session should still work
      const node = reg.validateSession(token);
      assert.ok(node);
    });
  });

  describe('revocation', () => {
    let nodeId, secret;

    beforeEach(() => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const enrolled = reg.enroll(code, validCap);
      nodeId = enrolled.node_id;
      secret = enrolled.secret;
    });

    it('revokes a node immediately', () => {
      reg.revoke(nodeId, 'test');
      const result = reg.authenticate(nodeId, secret);
      assert.equal(result.error, 'node revoked');
    });

    it('invalidates existing sessions', () => {
      const { token } = reg.authenticate(nodeId, secret);
      reg.revoke(nodeId, 'test');
      const node = reg.validateSession(token);
      assert.equal(node, null);
    });
  });

  describe('suspension', () => {
    let nodeId, secret;

    beforeEach(() => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const enrolled = reg.enroll(code, validCap);
      nodeId = enrolled.node_id;
      secret = enrolled.secret;
    });

    it('suspends and reinstates', () => {
      reg.suspend(nodeId, 'test');
      let result = reg.authenticate(nodeId, secret);
      assert.equal(result.action, 'suspended');

      reg.reinstate(nodeId);
      result = reg.authenticate(nodeId, secret);
      assert.ok(!result.error);
      assert.ok(result.token);
    });
  });

  describe('heartbeat', () => {
    let nodeId, secret;

    beforeEach(() => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const enrolled = reg.enroll(code, validCap);
      nodeId = enrolled.node_id;
      secret = enrolled.secret;
      reg.authenticate(nodeId, secret); // activates the node
    });

    it('updates health data', () => {
      const node = reg.getNode(nodeId);
      reg.heartbeat(node, { cpu_percent: 25, ram_used_gb: 3, temp_c: 50, disk_free_gb: 40 });
      assert.ok(node.health.online);
      assert.equal(node.health.load.cpu_percent, 25);
    });

    it('sweep detects offline nodes', () => {
      const node = reg.getNode(nodeId);
      node.health.last_heartbeat = Date.now() - 120_000; // 2 minutes ago
      node.health.online = true;
      const offline = reg.sweepHeartbeats();
      assert.ok(offline.includes(nodeId));
      assert.ok(!node.health.online);
    });
  });

  describe('trust tiers', () => {
    it('starts at tier 0', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const { node_id } = reg.enroll(code, validCap);
      assert.equal(reg.getNode(node_id).trust_tier, 0);
    });

    it('can be set by admin', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const { node_id } = reg.enroll(code, validCap);
      reg.setTrustTier(node_id, 1, 'verified by admin');
      assert.equal(reg.getNode(node_id).trust_tier, 1);
    });

    it('rejects invalid tiers', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'test' });
      const { node_id } = reg.enroll(code, validCap);
      const result = reg.setTrustTier(node_id, 5, 'invalid');
      assert.ok(result.error);
    });
  });

  describe('capability self-update restrictions', () => {
    let nodeId;

    beforeEach(() => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'cap-test' });
      const enrolled = reg.enroll(code, validCap);
      nodeId = enrolled.node_id;
    });

    it('allows updating hardware stats without changing task_types', () => {
      const updated = { ...validCap, compute: { ...validCap.compute, ram_gb: 16 } };
      const result = reg.updateCapabilities(nodeId, updated);
      assert.ok(result.ok, result.error);
      assert.equal(reg.getNode(nodeId).capabilities.compute.ram_gb, 16);
    });

    it('rejects node-initiated task_type changes', () => {
      const updated = JSON.parse(JSON.stringify(validCap));
      updated.offered.task_types = ['compute.build-test', 'inference.completion'];
      const result = reg.updateCapabilities(nodeId, updated);
      assert.equal(result.status, 403);
      assert.ok(result.error.includes('task_types cannot be changed'));
    });

    it('allows admin-initiated task_type changes', () => {
      const updated = JSON.parse(JSON.stringify(validCap));
      updated.offered.task_types = ['compute.build-test', 'inference.completion'];
      const result = reg.updateCapabilities(nodeId, updated, true);
      assert.ok(result.ok, result.error);
      assert.deepEqual(reg.getNode(nodeId).capabilities.offered.task_types, ['compute.build-test', 'inference.completion']);
    });
  });

  describe('persistence', () => {
    it('survives restart', () => {
      const { code } = reg.createEnrollmentCode({ sponsor: 'Geoffrey', node_name: 'persist-test' });
      const { node_id } = reg.enroll(code, validCap);
      reg.stop();

      const reg2 = new Registry(dir);
      const node = reg2.getNode(node_id);
      assert.ok(node, 'node should survive restart');
      assert.equal(node.name, 'persist-test');
      reg2.stop();
    });
  });
});
