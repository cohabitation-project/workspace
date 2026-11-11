/**
 * queue.mjs — ADIN task queue: submit, poll, complete, fail, retry.
 *
 * Tasks are held in memory with periodic persistence to disk. The queue is ordered by priority
 * (lower number = higher priority) then by submission time (FIFO within the same priority).
 *
 * Task lifecycle: queued → assigned → running → completed | failed
 * Failed tasks may be retried up to their max_retries count.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateTask, TASK_STATUSES } from './protocol.mjs';

const DEFAULT_MAX_RETRIES = 2;
const TASK_ASSIGNMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 min: if a node doesn't start running within this, reassign

export class TaskQueue {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.tasks = new Map();    // task_id → task record
    this.history = [];         // completed/failed tasks (last 200)

    fs.mkdirSync(dataDir, { recursive: true });
    this._load();
  }

  _filePath() { return path.join(this.dataDir, 'queue.json'); }
  _historyPath() { return path.join(this.dataDir, 'task-history.jsonl'); }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this._filePath(), 'utf8'));
      if (data.tasks) for (const [id, t] of Object.entries(data.tasks)) this.tasks.set(id, t);
    } catch { /* start fresh */ }
  }

  save() {
    fs.writeFileSync(this._filePath(), JSON.stringify({ tasks: Object.fromEntries(this.tasks) }, null, 2));
  }

  _appendHistory(task) {
    this.history.push(task);
    if (this.history.length > 200) this.history.shift();
    fs.appendFileSync(this._historyPath(), JSON.stringify({
      id: task.id, type: task.type, status: task.status, node_id: task.assigned_to,
      created_at: task.created_at, completed_at: task.completed_at || task.failed_at,
      retries: task.retries,
    }) + '\n');
  }

  // ---- Submit ----

  /** Queue a new task. Returns the task record or error. */
  submit(taskDef) {
    const check = validateTask(taskDef);
    if (!check.valid) return { error: `invalid task: ${check.errors.join(', ')}`, status: 400 };

    const task = {
      id: 't_' + crypto.randomBytes(8).toString('hex'),
      type: taskDef.type,
      priority: taskDef.priority || 5,
      status: 'queued',
      requirements: taskDef.requirements,
      payload: taskDef.payload,
      constraints: taskDef.constraints,
      validation: taskDef.validation || {},
      created_at: new Date().toISOString(),
      assigned_to: null,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      failed_at: null,
      result: null,
      retries: 0,
      max_retries: taskDef.max_retries ?? DEFAULT_MAX_RETRIES,
      submitted_by: taskDef.submitted_by || 'admin',
    };

    this.tasks.set(task.id, task);
    this.save();
    return { task };
  }

  // ---- Assignment ----

  /** Find the next queued task that a given node can handle (by type). Returns task or null. */
  nextFor(node) {
    const eligible = [];
    for (const [, task] of this.tasks) {
      if (task.status !== 'queued') continue;
      if (!node.capabilities.offered.task_types.includes(task.type)) continue;
      // Check trust tier
      const minTier = task.constraints?.trust_tier_min ?? 0;
      if (node.trust_tier < minTier) continue;
      // Check sandbox requirement
      if (task.requirements?.sandbox === 'required' && !node.capabilities.runtime?.sandbox && !node.capabilities.runtime?.container) continue;
      eligible.push(task);
    }

    if (eligible.length === 0) return null;

    // Sort by priority (asc) then created_at (asc = FIFO)
    eligible.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at));
    return eligible[0];
  }

  /** Assign a task to a node. */
  assign(task_id, node_id) {
    const task = this.tasks.get(task_id);
    if (!task) return { error: 'unknown task', status: 404 };
    if (task.status !== 'queued') return { error: `task is ${task.status}, not queued`, status: 409 };

    task.status = 'assigned';
    task.assigned_to = node_id;
    task.assigned_at = new Date().toISOString();
    this.save();
    return { ok: true, task };
  }

  /** Release an assigned task back to queued status (e.g., node became ineligible). */
  release(task_id) {
    const task = this.tasks.get(task_id);
    if (!task) return { error: 'unknown task', status: 404 };
    if (task.status !== 'assigned') return { error: `task is ${task.status}, not assigned`, status: 409 };

    task.status = 'queued';
    task.assigned_to = null;
    task.assigned_at = null;
    this.save();
    return { ok: true, task };
  }

  /** Node reports that it has started executing the task. */
  markRunning(task_id, node_id) {
    const task = this.tasks.get(task_id);
    if (!task) return { error: 'unknown task', status: 404 };
    if (task.assigned_to !== node_id) return { error: 'task not assigned to this node', status: 403 };
    if (task.status !== 'assigned') return { error: `task is ${task.status}`, status: 409 };

    task.status = 'running';
    task.started_at = new Date().toISOString();
    this.save();
    return { ok: true };
  }

  // ---- Completion ----

  /** Node reports task completion with results. */
  complete(task_id, node_id, result) {
    const task = this.tasks.get(task_id);
    if (!task) return { error: 'unknown task', status: 404 };
    if (task.assigned_to !== node_id) return { error: 'task not assigned to this node', status: 403 };
    if (!['assigned', 'running'].includes(task.status)) return { error: `task is ${task.status}`, status: 409 };

    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    task.result = result;
    this.tasks.delete(task_id);
    this._appendHistory(task);
    this.save();
    return { ok: true, task };
  }

  /** Mark a task as failed (node report or orchestrator detection). */
  fail(task_id, node_id, reason) {
    const task = this.tasks.get(task_id);
    if (!task) return { error: 'unknown task', status: 404 };

    // Allow the orchestrator (node_id=null) or the assigned node to fail a task
    if (node_id && task.assigned_to !== node_id) return { error: 'task not assigned to this node', status: 403 };

    if (task.retries < task.max_retries) {
      // Requeue for retry
      task.status = 'queued';
      task.assigned_to = null;
      task.assigned_at = null;
      task.started_at = null;
      task.retries++;
      task.last_failure = { reason, at: new Date().toISOString(), node_id };
      this.save();
      return { ok: true, action: 'requeued', retries: task.retries };
    }

    // Max retries exceeded — permanent failure
    task.status = 'failed';
    task.failed_at = new Date().toISOString();
    task.last_failure = { reason, at: new Date().toISOString(), node_id };
    this.tasks.delete(task_id);
    this._appendHistory(task);
    this.save();
    return { ok: true, action: 'failed_permanently', retries: task.retries };
  }

  // ---- Maintenance ----

  /** Find assigned tasks that have timed out (node accepted but never started running). */
  sweepStale() {
    const now = Date.now();
    const stale = [];

    for (const [id, task] of this.tasks) {
      if (task.status === 'assigned' && task.assigned_at) {
        if (now - new Date(task.assigned_at).getTime() > TASK_ASSIGNMENT_TIMEOUT_MS) {
          stale.push(id);
        }
      }
      if (task.status === 'running' && task.started_at && task.constraints?.timeout_s) {
        const elapsed = now - new Date(task.started_at).getTime();
        if (elapsed > task.constraints.timeout_s * 1000 * 1.5) { // 1.5x timeout as server-side backstop
          stale.push(id);
        }
      }
    }

    return stale;
  }

  /** Cancel a queued or assigned task. */
  cancel(task_id) {
    const task = this.tasks.get(task_id);
    if (!task) return { error: 'unknown task', status: 404 };
    if (['completed', 'failed', 'cancelled'].includes(task.status)) return { error: `task already ${task.status}`, status: 409 };

    task.status = 'cancelled';
    this.tasks.delete(task_id);
    this._appendHistory(task);
    this.save();
    return { ok: true };
  }

  // ---- Queries ----

  /** List active tasks (not yet completed/failed). */
  activeTasks() { return [...this.tasks.values()]; }

  /** Tasks assigned to a specific node. */
  tasksForNode(node_id) { return [...this.tasks.values()].filter((t) => t.assigned_to === node_id); }

  /** Recent history (completed + failed). */
  recentHistory(limit = 50) { return this.history.slice(-limit); }

  getTask(task_id) { return this.tasks.get(task_id) || null; }

  /** Tasks already assigned to a specific node (status=assigned). */
  assignedTo(node_id) {
    return [...this.tasks.values()].filter(
      (t) => t.status === 'assigned' && t.assigned_to === node_id
    );
  }

  /** Queue depth by type. */
  queueDepth() {
    const depth = {};
    for (const [, task] of this.tasks) {
      if (task.status === 'queued') depth[task.type] = (depth[task.type] || 0) + 1;
    }
    return depth;
  }
}
