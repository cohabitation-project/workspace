/**
 * demo.mjs — ADIN Local Network Demo.
 *
 * Starts an orchestrator and two worker nodes, queues a test task, and shows
 * the full lifecycle: enrollment, authentication, heartbeat, task execution,
 * and result submission.
 *
 * Uses mock execution by default (no network/git needed). Set ADIN_DEMO_LIVE=1
 * for real execution against GitHub.
 *
 * Usage:
 *   node adin/demo.mjs
 *   ADIN_DEMO_LIVE=1 node adin/demo.mjs
 *
 * SANDBOX NOTE:
 *   This demo runs WITHOUT a sandbox. It is for local testing only —
 *   never on contributed or untrusted hardware.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOrchestrator } from './orchestrator.mjs';
import { createWorker } from './worker.mjs';

const LIVE = process.env.ADIN_DEMO_LIVE === '1';
const ADMIN_TOKEN = 'demo-admin-token';

async function main() {
  console.log('=== ADIN Local Network Demo ===');
  console.log(`Mode: ${LIVE ? 'LIVE (real git/npm/node)' : 'MOCK (simulated execution)'}`);
  console.log();

  // 1. Create temp directory structure
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adin-demo-'));
  console.log(`Working directory: ${baseDir}`);

  // 2. Start orchestrator
  console.log('\n--- Starting orchestrator ---');
  const orch = createOrchestrator({
    dataDir: path.join(baseDir, 'orchestrator'),
    host: '127.0.0.1',
    port: 0,
    adminPort: 0,
    adminToken: ADMIN_TOKEN,
    rateLimitMax: 100,
  });
  await orch.start();

  const workerPort = orch.workerServer().address().port;
  const adminPort = orch.adminServer().address().port;
  console.log(`Orchestrator worker API: http://127.0.0.1:${workerPort}`);
  console.log(`Orchestrator admin API: http://127.0.0.1:${adminPort}`);

  // Admin API helper
  async function adminApi(method, urlPath, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_TOKEN}` },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`http://127.0.0.1:${adminPort}${urlPath}`, opts);
    return res.json();
  }

  // 3. Create enrollment codes for two workers
  console.log('\n--- Creating enrollment codes ---');
  const code1 = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: 'demo-worker-1' });
  const code2 = await adminApi('POST', '/adin/admin/enroll-code', { sponsor: 'Geoffrey', node_name: 'demo-worker-2' });
  console.log(`Worker 1 enrollment code: ${code1.code.slice(0, 20)}...`);
  console.log(`Worker 2 enrollment code: ${code2.code.slice(0, 20)}...`);

  // 4. Mock executor (unless LIVE mode)
  function createDemoExecutor(name) {
    if (LIVE) return undefined; // use real executor

    return async function mockExecute(task, opts) {
      const steps = task.payload?.steps || [];
      const start = Date.now();
      const stdout = [];

      for (let i = 0; i < steps.length; i++) {
        if (opts?.abortSignal?.aborted) break;
        if (opts?.onStep) opts.onStep(i, steps[i].action, 'starting');
        await new Promise(r => setTimeout(r, 100)); // simulate work
        stdout.push(`[${name}] step ${i} (${steps[i].action}): ok`);
        if (opts?.onStep) opts.onStep(i, steps[i].action, 'completed');
      }

      return {
        status: 'completed',
        output: {
          exit_code: 0,
          stdout_truncated: stdout.join('\n'),
          stderr_truncated: '',
          structured: { tests_total: 5, tests_passed: 5, tests_failed: 0, tests_skipped: 0 },
        },
        resources_used: { wall_time_ms: Date.now() - start, cpu_seconds: 1, peak_ram_gb: 0.3 },
        steps_completed: steps.length,
      };
    };
  }

  // 5. Start workers
  console.log('\n--- Starting workers ---');
  const workers = [];

  for (let i = 0; i < 2; i++) {
    const code = i === 0 ? code1.code : code2.code;
    const name = `demo-worker-${i + 1}`;
    const workerDir = path.join(baseDir, name);
    fs.mkdirSync(workerDir, { recursive: true });

    const executor = createDemoExecutor(name);
    const workerOpts = {
      configDir: workerDir,
      config: {
        orchestrator_url: `http://127.0.0.1:${workerPort}`,
        enrollment_code: code,
        task_types: ['compute.build-test'],
        max_concurrent: 1,
        max_task_duration_s: 60,
        poll_interval_ms: 200,
        heartbeat_interval_ms: 5000,
        sandbox: 'test-sandbox',
        limits: {},
      },
      log: (msg) => console.log(`  [${name}] ${msg.replace(/^\[worker\] /, '')}`),
    };

    if (executor) workerOpts.executor = executor;

    const worker = createWorker(workerOpts);
    await worker.start();
    workers.push({ name, worker });
    console.log(`${name}: enrolled as ${worker.state.node_id}`);
  }

  // 6. Wait for heartbeats
  console.log('\n--- Waiting for workers to come online ---');
  await new Promise(r => setTimeout(r, 1000));

  const nodesData = await adminApi('GET', '/adin/nodes');
  console.log(`Registered nodes: ${nodesData.nodes.length}`);
  for (const n of nodesData.nodes) {
    console.log(`  ${n.name} (${n.id}): status=${n.status}, online=${n.health.online}`);
  }

  // 7. Queue a test task
  console.log('\n--- Queuing test task ---');
  const taskResult = await adminApi('POST', '/adin/admin/queue', {
    type: 'compute.build-test',
    priority: 5,
    requirements: { cpu_cores_min: 1, sandbox: 'required' },
    payload: {
      sandbox: 'required',
      steps: [
        { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'a'.repeat(40) },
        { action: 'npm-ci' },
        { action: 'node-test', files: ['test/unit.mjs'] },
      ],
    },
    constraints: { timeout_s: 60 },
  });
  console.log(`Task queued: ${taskResult.task_id} (assigned: ${taskResult.assigned_to || 'pending'})`);

  // 8. Wait for completion
  console.log('\n--- Waiting for task completion ---');
  const deadline = Date.now() + 15_000;
  let completed = false;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
    const history = orch.queue.recentHistory(10);
    const entry = history.find(t => t.id === taskResult.task_id);
    if (entry) {
      console.log(`Task ${entry.id}: status=${entry.status}, node=${entry.node_id}`);
      completed = true;
      break;
    }
    // Show active queue
    const active = orch.queue.activeTasks();
    const t = active.find(a => a.id === taskResult.task_id);
    if (t) {
      process.stdout.write(`  Task status: ${t.status} (assigned: ${t.assigned_to})\r`);
    }
  }

  if (!completed) {
    console.log('Task did not complete within deadline');
  }

  // 9. Show results
  console.log('\n--- Final state ---');
  const finalNodes = await adminApi('GET', '/adin/nodes');
  for (const n of finalNodes.nodes) {
    console.log(`  ${n.name}: completed=${n.stats.tasks_completed}, failed=${n.stats.tasks_failed}`);
  }

  const metrics = await adminApi('GET', '/adin/metrics');
  console.log(`\nMetrics: ${JSON.stringify(metrics, null, 2)}`);

  // 10. Queue a second task for the other worker
  console.log('\n--- Queuing second task ---');
  const task2Result = await adminApi('POST', '/adin/admin/queue', {
    type: 'compute.build-test',
    priority: 5,
    requirements: { cpu_cores_min: 1, sandbox: 'required' },
    payload: {
      sandbox: 'required',
      steps: [
        { action: 'git-clone', repo: 'cohabitation-project/workspace', commit: 'b'.repeat(40) },
        { action: 'npm-ci' },
        { action: 'node-test', files: ['test/another.mjs'] },
      ],
    },
    constraints: { timeout_s: 60 },
  });
  console.log(`Task queued: ${task2Result.task_id}`);

  // Wait for second task
  const deadline2 = Date.now() + 10_000;
  while (Date.now() < deadline2) {
    await new Promise(r => setTimeout(r, 500));
    const history = orch.queue.recentHistory(10);
    if (history.find(t => t.id === task2Result.task_id)) break;
  }

  // 11. Final metrics
  console.log('\n--- Final metrics ---');
  const finalMetrics = await adminApi('GET', '/adin/metrics');
  console.log(JSON.stringify(finalMetrics, null, 2));

  // 12. Clean up
  console.log('\n--- Shutting down ---');
  for (const { name, worker } of workers) {
    await worker.stop();
    console.log(`${name}: stopped`);
  }
  orch.stop();
  console.log('Orchestrator: stopped');

  // Clean up temp directory
  fs.rmSync(baseDir, { recursive: true, force: true });
  console.log(`Cleaned up: ${baseDir}`);
  console.log('\n=== Demo complete ===');
}

main().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
