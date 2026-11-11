/**
 * metrics.mjs — ADIN contribution tracking, usage ledger, and performance stats.
 *
 * Every task's resource usage is logged to a per-node usage ledger readable by the node owner
 * and the council. Aggregate stats are available for the admin dashboard.
 *
 * The usage ledger is append-only JSONL, one line per completed task. It is the node owner's
 * receipt: proof of what their hardware did, when, and how hard it worked.
 */

import fs from 'node:fs';
import path from 'node:path';

export class Metrics {
  constructor(dataDir) {
    this.dir = path.join(dataDir, 'metrics');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  /** Log a completed task to the node's usage ledger. */
  logTask(task, node) {
    const entry = {
      ts: new Date().toISOString(),
      task_id: task.id,
      task_type: task.type,
      status: task.status,
      duration_s: task.started_at && task.completed_at
        ? (new Date(task.completed_at) - new Date(task.started_at)) / 1000
        : null,
      resources: task.result?.resources_used || null,
    };

    const file = path.join(this.dir, `node-${node.id}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n');
  }

  /** Read a node's usage ledger (for the owner or council). */
  nodeLedger(node_id, limit = 100) {
    const file = path.join(this.dir, `node-${node_id}.jsonl`);
    try {
      const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
      return lines.slice(-limit).map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }

  /** Aggregate stats across all nodes. */
  summary(registry) {
    const nodes = registry.listNodes();
    const totals = {
      nodes_total: nodes.length,
      nodes_online: nodes.filter((n) => n.health?.online).length,
      nodes_by_status: {},
      tasks_completed: 0,
      tasks_failed: 0,
      task_types_supported: new Set(),
    };

    for (const node of nodes) {
      totals.nodes_by_status[node.status] = (totals.nodes_by_status[node.status] || 0) + 1;
      totals.tasks_completed += node.stats?.tasks_completed || 0;
      totals.tasks_failed += node.stats?.tasks_failed || 0;
      if (node.capabilities?.offered?.task_types) {
        for (const t of node.capabilities.offered.task_types) totals.task_types_supported.add(t);
      }
    }

    totals.task_types_supported = [...totals.task_types_supported];
    return totals;
  }
}
