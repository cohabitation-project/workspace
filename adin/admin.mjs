#!/usr/bin/env node
/**
 * admin.mjs — ADIN command-line admin tool.
 *
 * Usage:
 *   node adin/admin.mjs <command> [args...]
 *
 * Commands:
 *   enroll-code <sponsor> <node_name>    Create an enrollment code
 *   nodes                                 List all nodes
 *   revoke <node_id> [reason]            Revoke a node immediately
 *   suspend <node_id> [reason]           Suspend a node (reversible)
 *   reinstate <node_id>                  Reinstate a suspended node
 *   force-rotate <node_id>              Force credential rotation
 *   trust <node_id> <tier> [reason]     Set trust tier (0/1/2)
 *   queue <task-json-file>              Submit a task from a JSON file
 *   queue-test [ref]                    Submit a build-test task for the workspace
 *   status                               Show queue and node summary
 *   reviews                              List pending human reviews
 *   decide <review_id> <approved|rejected> [by]  Decide on a held result
 *   ledger <node_id>                    Show a node's usage ledger
 *
 * Environment:
 *   ADIN_URL    orchestrator URL (default http://127.0.0.1:3399)
 *   ADIN_ADMIN_TOKEN  admin authentication token
 */

const BASE = process.env.ADIN_URL || 'http://127.0.0.1:3398';
const TOKEN = process.env.ADIN_ADMIN_TOKEN;

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}: ${data.error || JSON.stringify(data)}`);
    process.exit(1);
  }
  return data;
}

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'enroll-code': {
    if (args.length < 2) { console.error('Usage: enroll-code <sponsor> <node_name>'); process.exit(1); }
    const data = await api('POST', '/adin/admin/enroll-code', { sponsor: args[0], node_name: args[1] });
    console.log(`Enrollment code created (give to node operator — shown once):`);
    console.log(`  Code: ${data.code}`);
    console.log(`  Expires: ${data.expires_at}`);
    break;
  }

  case 'nodes': {
    const data = await api('GET', '/adin/nodes');
    if (data.nodes.length === 0) { console.log('No nodes registered.'); break; }
    console.log(`${'ID'.padEnd(20)} ${'Name'.padEnd(16)} ${'Status'.padEnd(10)} ${'Trust'.padEnd(6)} ${'Online'.padEnd(8)} Tasks`);
    console.log('-'.repeat(72));
    for (const n of data.nodes) {
      console.log(
        `${n.id.padEnd(20)} ${(n.name || '').padEnd(16)} ${n.status.padEnd(10)} ${String(n.trust_tier).padEnd(6)} ${(n.health?.online ? 'yes' : 'no').padEnd(8)} ${n.stats?.tasks_completed || 0}✓ ${n.stats?.tasks_failed || 0}✗`
      );
    }
    break;
  }

  case 'revoke': {
    if (!args[0]) { console.error('Usage: revoke <node_id> [reason]'); process.exit(1); }
    await api('POST', `/adin/admin/revoke/${args[0]}`, { reason: args.slice(1).join(' ') || undefined });
    console.log(`Node ${args[0]} revoked.`);
    break;
  }

  case 'suspend': {
    if (!args[0]) { console.error('Usage: suspend <node_id> [reason]'); process.exit(1); }
    await api('POST', `/adin/admin/suspend/${args[0]}`, { reason: args.slice(1).join(' ') || undefined });
    console.log(`Node ${args[0]} suspended.`);
    break;
  }

  case 'reinstate': {
    if (!args[0]) { console.error('Usage: reinstate <node_id>'); process.exit(1); }
    await api('POST', `/adin/admin/reinstate/${args[0]}`);
    console.log(`Node ${args[0]} reinstated.`);
    break;
  }

  case 'force-rotate': {
    if (!args[0]) { console.error('Usage: force-rotate <node_id>'); process.exit(1); }
    await api('POST', `/adin/admin/force-rotate/${args[0]}`);
    console.log(`Node ${args[0]} will be told to rotate on next heartbeat.`);
    break;
  }

  case 'trust': {
    if (args.length < 2) { console.error('Usage: trust <node_id> <tier> [reason]'); process.exit(1); }
    const data = await api('POST', `/adin/admin/trust/${args[0]}`, { tier: Number(args[1]), reason: args.slice(2).join(' ') || undefined });
    console.log(`Trust tier changed: ${data.old_tier} → ${data.new_tier}`);
    break;
  }

  case 'queue': {
    if (!args[0]) { console.error('Usage: queue <task-json-file>'); process.exit(1); }
    const fs = await import('node:fs');
    const taskDef = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const data = await api('POST', '/adin/admin/queue', taskDef);
    console.log(`Task queued: ${data.task_id} (${data.status})`);
    if (data.assigned_to) console.log(`  Assigned to: ${data.assigned_to}`);
    break;
  }

  case 'queue-test': {
    const commit = args[0] || 'a'.repeat(40); // placeholder — real use needs a full SHA
    const taskDef = {
      type: 'compute.build-test',
      priority: 5,
      requirements: { cpu_cores_min: 2, ram_gb_min: 4, disk_gb_min: 5, runtime: { node: '>=20' }, sandbox: 'required' },
      payload: {
        sandbox: 'required',
        steps: [
          { action: 'git-clone', repo: 'cohabitation-project/workspace', commit },
          { action: 'npm-ci' },
          { action: 'node-test', files: ['commons/test/unit.mjs'] },
        ],
      },
      constraints: { timeout_s: 600, max_output_bytes: 1048576, max_ram_gb: 6 },
    };
    const data = await api('POST', '/adin/admin/queue', taskDef);
    console.log(`Build-test task queued: ${data.task_id} (${data.status})`);
    if (data.assigned_to) console.log(`  Assigned to: ${data.assigned_to}`);
    break;
  }

  case 'status': {
    const [nodesData, queueData, metricsData] = await Promise.all([
      api('GET', '/adin/nodes'),
      api('GET', '/adin/queue'),
      api('GET', '/adin/metrics'),
    ]);
    console.log('=== ADIN Status ===');
    console.log(`Nodes: ${metricsData.nodes_online} online / ${metricsData.nodes_total} total`);
    console.log(`Tasks completed: ${metricsData.tasks_completed}  failed: ${metricsData.tasks_failed}`);
    console.log(`Task types: ${metricsData.task_types_supported?.join(', ') || 'none'}`);
    console.log(`Queue depth:`, queueData.depth);
    console.log(`Active tasks: ${queueData.active?.length || 0}`);
    break;
  }

  case 'reviews': {
    const data = await api('GET', '/adin/reviews');
    if (data.pending.length === 0) { console.log('No pending reviews.'); break; }
    for (const r of data.pending) {
      console.log(`[${r.id}] ${r.task_type} from ${r.node_name} (tier ${r.trust_tier}) — ${r.reason}`);
      if (r.result_summary?.text_preview) console.log(`  Preview: ${r.result_summary.text_preview.slice(0, 200)}`);
    }
    break;
  }

  case 'decide': {
    if (args.length < 2) { console.error('Usage: decide <review_id> <approved|rejected> [by]'); process.exit(1); }
    await api('POST', `/adin/reviews/${args[0]}/decide`, { decision: args[1], decided_by: args[2] });
    console.log(`Review ${args[0]} → ${args[1]}`);
    break;
  }

  case 'ledger': {
    if (!args[0]) { console.error('Usage: ledger <node_id>'); process.exit(1); }
    const data = await api('GET', `/adin/metrics/${args[0]}`);
    if (data.ledger.length === 0) { console.log('No usage records.'); break; }
    for (const e of data.ledger) {
      console.log(`${e.ts}  ${e.task_type.padEnd(22)} ${e.status.padEnd(10)} ${e.duration_s ? e.duration_s.toFixed(1) + 's' : '-'}`);
    }
    break;
  }

  default:
    console.error('Unknown command. Run without arguments for usage.');
    console.error('Commands: enroll-code, nodes, revoke, suspend, reinstate, force-rotate, trust, queue, queue-test, status, reviews, decide, ledger');
    process.exit(1);
}
