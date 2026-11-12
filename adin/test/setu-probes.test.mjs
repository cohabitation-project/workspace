// Setu's review probes for PR #36. Each test states what SHOULD happen; a failure is a finding.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createOrchestrator } from '../orchestrator.mjs';

const REPO = 'cohabitation-project/workspace'; const COMMIT = 'a'.repeat(40);
const def = () => ({ type: 'compute.build-test', priority: 5, requirements: { cpu_cores_min: 2, sandbox: 'required' },
  payload: { sandbox: 'required', steps: [{ action: 'git-clone', repo: REPO, commit: COMMIT }, { action: 'npm-ci' }, { action: 'node-test', files: ['test/unit.mjs'] }] }, constraints: { timeout_s: 300 } });

describe('Setu probes', () => {
  let dir, orch, wp, ap; const T = 'probe-token';
  before(async () => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-probe-')); orch = createOrchestrator({ dataDir: dir, host: '127.0.0.1', port: 0, adminPort: 0, adminToken: T, rateLimitMax: 500 }); await orch.start(); wp = orch.workerServer().address().port; ap = orch.adminServer().address().port; });
  after(() => { orch?.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
  const call = async (port, method, p, body, tok) => { const r = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
  const admin = (m, p, b) => call(ap, m, p, b, T);
  const enroll = async (name) => { const { data: c } = await admin('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: name });
    const caps = { compute: { cpu: { model: 't', cores: 4, threads: 8, arch: 'x86_64' }, ram_gb: 8, gpu: [] }, storage: { total_gb: 100, free_gb: 50 }, runtime: { node: '22.0.0', sandbox: 'windows-sandbox' }, offered: { task_types: ['compute.build-test'], max_concurrent: 3 }, limits: { max_task_duration_s: 600 } };
    const { data: e } = await call(wp, 'POST', '/adin/enroll', { code: c.code, capabilities: caps }); const { data: a } = await call(wp, 'POST', '/adin/auth', { node_id: e.node_id, node_secret: e.secret });
    await call(wp, 'POST', '/adin/heartbeat', { load: { cpu_percent: 10, ram_used_gb: 1, temp_c: 40, disk_free_gb: 80 } }, a.token); return { id: e.node_id, token: a.token }; };

  it('P1: a commit approval revoked after queueing stops the task from being handed out', async () => {
    orch.approvals.approve(REPO, COMMIT, 'Geoffrey');
    const sub = await admin('POST', '/adin/admin/queue', def());
    assert.ok([200, 201].includes(sub.status), JSON.stringify(sub.data));
    orch.approvals.revokeApproval(REPO, COMMIT, 'found a problem');
    const t = orch.queue.getTask(sub.data.task_id);
    // If the task is still queued or assigned with a revoked commit, a worker can still receive it.
    assert.ok(!t || !['queued', 'assigned'].includes(t.status), `task is still ${t?.status} after its commit approval was revoked`);
  });

  it('P2: suspending a node with a RUNNING task does not leave that task stuck on the suspended node', async () => {
    const n = await enroll('probe-running'); orch.approvals.approve(REPO, COMMIT, 'Geoffrey');
    const t = orch.queue.submit(def()).task; orch.queue.assign(t.id, n.id); orch.queue.markRunning(t.id, n.id);
    await admin('POST', `/adin/admin/suspend/${n.id}`, { reason: 'probe' });
    const after = orch.queue.getTask(t.id);
    assert.ok(!(after && after.assigned_to === n.id && after.status === 'running'), 'running task still belongs to the suspended node, which can no longer report it');
  });

  it('P3: approving a held result through the admin ROUTE completes the task, and says so', async () => {
    const a = await enroll('probe-holder'); const t = orch.queue.submit(def()).task; orch.queue.assign(t.id, a.id);
    const result = { status: 'success', output: { structured: { text: 'ok' } } };
    const rid = orch.reviews.hold(result, t, { id: a.id, name: 'probe-holder', trust_tier: 0 }, 'probe');
    orch.queue.fail(t.id, a.id, `held for review: ${rid}`);
    // meanwhile the requeued task is handed to a different node
    const b = await enroll('probe-other'); orch.queue.assign(t.id, b.id);
    const d = await admin('POST', `/adin/reviews/${rid}/decide`, { decision: 'approved', decided_by: 'Geoffrey' });
    const now = orch.queue.getTask(t.id);
    assert.ok(!(d.status === 200 && now && now.status !== 'completed'), `route answered ${d.status} ok, but the task is still ${now?.status} (assigned to ${now?.assigned_to === b.id ? 'the other node' : now?.assigned_to})`);
  });
});
