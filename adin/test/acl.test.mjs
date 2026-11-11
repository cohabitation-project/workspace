/**
 * acl.test.mjs — verify the Tailscale ACL draft enforces least-privilege.
 *
 * These tests parse the draft JSON and assert that only the intended
 * permissions are present. They catch the class of bug Aletheia found:
 * active rules that were meant to be commented out or absent.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Strip JSON "comments" (keys starting with //) before parsing
function loadACL() {
  const raw = fs.readFileSync(path.join(import.meta.dirname, '..', 'tailscale-acl-draft.json'), 'utf8');
  const obj = JSON.parse(raw);
  return obj;
}

describe('Tailscale ACL draft', () => {
  const acl = loadACL();
  const rules = acl.acls || [];

  // Extract only real rules (objects with "action" key)
  const activeRules = rules.filter(r => r.action);

  it('contains exactly 2 active rules', () => {
    assert.equal(activeRules.length, 2, `expected 2 rules, found ${activeRules.length}: ${JSON.stringify(activeRules.map(r => r.src + ' → ' + r.dst))}`);
  });

  it('rule 1: workers can reach server on port 3399 only', () => {
    const rule = activeRules.find(r => JSON.stringify(r.src) === '["tag:worker"]');
    assert.ok(rule, 'no rule for tag:worker source');
    assert.deepEqual(rule.dst, ['tag:server:3399'], 'worker destination must be server:3399 only');
    assert.equal(rule.action, 'accept');
  });

  it('rule 2: admin can SSH to server on port 22 only', () => {
    const rule = activeRules.find(r => JSON.stringify(r.src) === '["autogroup:admin"]');
    assert.ok(rule, 'no rule for admin source');
    assert.deepEqual(rule.dst, ['tag:server:22'], 'admin destination must be server:22 only');
    assert.equal(rule.action, 'accept');
  });

  it('no rule allows server-to-worker access', () => {
    const serverToWorker = activeRules.filter(r =>
      r.src?.some(s => s.includes('server')) && r.dst?.some(d => d.includes('worker'))
    );
    assert.equal(serverToWorker.length, 0, 'server-to-worker rules must not exist (all communication is node-initiated)');
  });

  it('no rule allows worker-to-worker access', () => {
    const workerToWorker = activeRules.filter(r =>
      r.src?.some(s => s.includes('worker')) && r.dst?.some(d => d.includes('worker'))
    );
    assert.equal(workerToWorker.length, 0, 'worker-to-worker rules must not exist');
  });

  it('no rule allows admin-to-worker access', () => {
    const adminToWorker = activeRules.filter(r =>
      r.src?.some(s => s.includes('admin')) && r.dst?.some(d => d.includes('worker'))
    );
    assert.equal(adminToWorker.length, 0, 'admin-to-worker rules must not exist (covenant: no remote inspection)');
  });

  it('no rule uses wildcard port (dst:*)', () => {
    for (const rule of activeRules) {
      for (const dst of (rule.dst || [])) {
        assert.ok(!dst.endsWith(':*'), `wildcard port found: ${dst} — all rules must specify an exact port`);
      }
    }
  });

  it('no rule grants subnet routing or exit node', () => {
    assert.deepEqual(acl.nodeAttrs, [], 'nodeAttrs must be empty (no subnet routing or exit nodes)');
  });

  it('SSH section is empty', () => {
    assert.deepEqual(acl.ssh, [], 'ssh must be empty (no Tailscale SSH)');
  });
});
