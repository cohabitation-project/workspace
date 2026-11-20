/**
 * approvals.test.mjs — Tests for the ADIN commit approval system.
 *
 * Covers: approve/query, reject unapproved at queue time, accept approved,
 * revoke and re-reject, persistence across restart.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Approvals } from '../approvals.mjs';
import { createOrchestrator } from '../orchestrator.mjs';

describe('Approvals: unit tests', () => {
  let dir, approvals;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-approvals-'));
    approvals = new Approvals(dir);
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const REPO = 'cohabitation-project/workspace';
  const COMMIT = 'a'.repeat(40);
  const COMMIT2 = 'b'.repeat(40);

  it('approve and query', () => {
    const result = approvals.approve(REPO, COMMIT, 'Geoffrey', 'looks good');
    assert.ok(result.ok);
    assert.equal(result.approval.repo, REPO);
    assert.equal(result.approval.commit, COMMIT);
    assert.equal(result.approval.approver, 'Geoffrey');
    assert.equal(result.approval.notes, 'looks good');
    assert.ok(result.approval.approved_at);

    assert.ok(approvals.isApproved(REPO, COMMIT));
    assert.ok(!approvals.isApproved(REPO, COMMIT2)); // not approved
  });

  it('listApprovals returns all for a repo', () => {
    approvals.approve(REPO, COMMIT2, 'Setu', 'reviewed');
    const list = approvals.listApprovals(REPO);
    assert.ok(list.length >= 2);
    assert.ok(list.some(a => a.commit === COMMIT));
    assert.ok(list.some(a => a.commit === COMMIT2));
  });

  it('rejects invalid inputs', () => {
    const r1 = approvals.approve('', COMMIT, 'Geoffrey');
    assert.equal(r1.status, 400);

    const r2 = approvals.approve(REPO, 'short', 'Geoffrey');
    assert.equal(r2.status, 400);

    const r3 = approvals.approve(REPO, COMMIT, '');
    assert.equal(r3.status, 400);
  });

  it('revoke and re-check', () => {
    assert.ok(approvals.isApproved(REPO, COMMIT));

    const rev = approvals.revokeApproval(REPO, COMMIT, 'found issue');
    assert.ok(rev.ok);

    assert.ok(!approvals.isApproved(REPO, COMMIT)); // no longer approved
  });

  it('revoke nonexistent returns 404', () => {
    const rev = approvals.revokeApproval(REPO, 'f'.repeat(40), 'nope');
    assert.equal(rev.status, 404);
  });

  it('persists across restart', () => {
    // COMMIT2 was approved above and not revoked
    assert.ok(approvals.isApproved(REPO, COMMIT2));

    // Create a new instance reading the same directory
    const approvals2 = new Approvals(dir);
    assert.ok(approvals2.isApproved(REPO, COMMIT2));

    // Revoked commit should still be revoked
    assert.ok(!approvals2.isApproved(REPO, COMMIT));
  });
});

describe('Approvals: integration with orchestrator', () => {
  let dir, orch, adminPort;
  const ADMIN_TOKEN = 'test-approval-token';
  const REPO = 'cohabitation-project/workspace';
  const COMMIT = 'c'.repeat(40);
  const COMMIT_UNAPPROVED = 'd'.repeat(40);

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-approvals-integ-'));
    orch = createOrchestrator({
      dataDir: dir,
      host: '127.0.0.1',
      port: 0,
      adminPort: 0,
      adminToken: ADMIN_TOKEN,
      rateLimitMax: 100,
    });
    await orch.start();
    adminPort = orch.adminServer().address().port;
  });

  after(() => {
    orch?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  async function adminApi(method, urlPath, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_TOKEN}` } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`http://127.0.0.1:${adminPort}${urlPath}`, opts);
    return { status: res.status, data: await res.json() };
  }

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

  it('rejects unapproved commit at queue time', async () => {
    const { status, data } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    assert.equal(status, 403, `should reject unapproved commit, got ${status}: ${data.error}`);
    assert.ok(data.error.includes('not approved'));
  });

  it('approve via API and then queue succeeds', async () => {
    // Approve the commit
    const { status: approveStatus, data: approveData } = await adminApi('POST', '/adin/admin/approve', {
      repo: REPO, commit: COMMIT, approver: 'Geoffrey', notes: 'tested locally',
    });
    assert.equal(approveStatus, 200);
    assert.ok(approveData.ok);

    // Now queue should succeed
    const { status, data } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    assert.equal(status, 200, `should accept approved commit, got ${status}: ${data.error}`);
    assert.ok(data.task_id);
  });

  it('list approvals via API', async () => {
    const { data } = await adminApi('GET', `/adin/admin/approvals/${encodeURIComponent(REPO)}`);
    assert.ok(data.approvals.length >= 1);
    assert.ok(data.approvals.some(a => a.commit === COMMIT));
  });

  it('revoke approval and re-reject', async () => {
    // Revoke
    const { data: revokeData } = await adminApi('POST', '/adin/admin/revoke-approval', {
      repo: REPO, commit: COMMIT, reason: 'security issue found',
    });
    assert.ok(revokeData.ok);

    // Queue should now fail again
    const { status, data } = await adminApi('POST', '/adin/admin/queue', validTaskDef);
    assert.equal(status, 403);
    assert.ok(data.error.includes('not approved'));
  });
});
