/**
 * orchestrator.mjs — ADIN orchestrator server.
 *
 * A lightweight Express server that binds to the Tailscale interface ONLY (never the public IP).
 * Manages node enrollment, heartbeat, task assignment, result validation, and metrics.
 *
 * Runs as a separate PM2 process alongside the Commons. Shares no code path with the
 * public-facing Commons server.
 *
 * Usage:
 *   ADIN_DATA_DIR=/path/to/data ADIN_HOST=100.80.188.45 node adin/orchestrator.mjs
 *
 * For local testing:
 *   ADIN_DATA_DIR=/tmp/adin-test ADIN_HOST=127.0.0.1 node adin/orchestrator.mjs
 */

import express from 'express';
import { Registry } from './registry.mjs';
import { TaskQueue } from './queue.mjs';
import { selectNode, preValidateTask } from './scheduler.mjs';
import { validateTaskResult, ReviewQueue } from './validation.mjs';
import { Metrics } from './metrics.mjs';

const PORT = Number(process.env.ADIN_PORT || 3399);
const HOST = process.env.ADIN_HOST || '127.0.0.1'; // default safe: local only
const DATA_DIR = process.env.ADIN_DATA_DIR || './data/adin';
const ADMIN_TOKEN = process.env.ADIN_ADMIN_TOKEN || null; // required for admin endpoints

// ---- Initialize ----

const registry = new Registry(DATA_DIR);
const queue = new TaskQueue(DATA_DIR);
const reviews = new ReviewQueue(DATA_DIR);
const metrics = new Metrics(DATA_DIR);

registry.startPersistence();

const app = express();
app.use(express.json({ limit: '256kb' }));

// ---- Middleware: authenticate node session ----

function nodeAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'session token required' });
  const node = registry.validateSession(token);
  if (!node) return res.status(401).json({ error: 'invalid or expired session' });
  if (node.status === 'suspended') return res.status(403).json({ error: 'node suspended', action: 'suspended' });
  req.node = node;
  next();
}

function adminAuth(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'admin token not configured' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'invalid admin token' });
  next();
}

// ---- Node enrollment ----

app.post('/adin/enroll', (req, res) => {
  const { code, capabilities } = req.body || {};
  if (!code || !capabilities) return res.status(400).json({ error: 'code and capabilities required' });
  const result = registry.enroll(code, capabilities);
  if (result.error) return res.status(result.status).json({ error: result.error });
  // Return the secret ONCE — never logged, never stored in plaintext on the server
  res.json({ node_id: result.node_id, secret: result.secret, rotate_by: new Date(result.rotate_by).toISOString() });
});

// ---- Node authentication ----

app.post('/adin/auth', (req, res) => {
  const { node_id, node_secret } = req.body || {};
  if (!node_id || !node_secret) return res.status(400).json({ error: 'node_id and node_secret required' });
  const result = registry.authenticate(node_id, node_secret);
  if (result.error) return res.status(result.status).json({ error: result.error, action: result.action });
  res.json({ token: result.token, expires_at: new Date(result.expires_at).toISOString(), action: result.action });
});

// ---- Credential rotation ----

app.post('/adin/rotate', (req, res) => {
  const { node_id, current_secret } = req.body || {};
  if (!node_id || !current_secret) return res.status(400).json({ error: 'node_id and current_secret required' });
  const result = registry.rotate(node_id, current_secret);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ secret: result.secret, rotate_by: new Date(result.rotate_by).toISOString() });
});

// ---- Heartbeat ----

app.post('/adin/heartbeat', nodeAuth, (req, res) => {
  const result = registry.heartbeat(req.node, req.body?.load);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

// ---- Capability update ----

app.put('/adin/capabilities', nodeAuth, (req, res) => {
  const result = registry.updateCapabilities(req.node.id, req.body);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

// ---- Task polling ----

app.get('/adin/tasks/next', nodeAuth, (req, res) => {
  const task = queue.nextFor(req.node);
  if (!task) return res.json({ task: null });

  // Pre-validate compute commands before assignment
  const preCheck = preValidateTask(task);
  if (!preCheck.safe) {
    // This should never happen if tasks were validated at submission — log and skip
    queue.fail(task.id, null, `command validation failed: ${preCheck.violations.join(', ')}`);
    return res.json({ task: null });
  }

  const assign = queue.assign(task.id, req.node.id);
  if (assign.error) return res.json({ task: null }); // race condition: another node got it

  req.node.current_tasks.push(task.id);

  // Return the task payload (never includes private memory or credentials)
  res.json({
    task: {
      id: task.id,
      type: task.type,
      payload: task.payload,
      constraints: task.constraints,
      requirements: task.requirements,
    },
  });
});

// ---- Task status update ----

app.post('/adin/tasks/:id/running', nodeAuth, (req, res) => {
  const result = queue.markRunning(req.params.id, req.node.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

// ---- Task result submission ----

app.post('/adin/tasks/:id/result', nodeAuth, async (req, res) => {
  const task = queue.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'unknown task' });

  const rawResult = req.body;
  rawResult.task_id = req.params.id;
  rawResult.node_id = req.node.id;

  // Run the validation pipeline
  const validation = await validateTaskResult(rawResult, task, req.node, {
    provenanceDir: DATA_DIR + '/provenance',
  });

  if (validation.held_for_review) {
    const reviewId = reviews.hold(rawResult, task, req.node, validation.reason);
    queue.fail(task.id, req.node.id, `held for review: ${reviewId}`);
    removeCurrentTask(req.node, task.id);
    return res.json({ accepted: false, held_for_review: true, review_id: reviewId, reason: validation.reason });
  }

  if (!validation.accepted) {
    queue.fail(task.id, req.node.id, validation.reason);
    removeCurrentTask(req.node, task.id);
    return res.json({ accepted: false, reason: validation.reason });
  }

  // Accepted — complete the task
  const complete = queue.complete(task.id, req.node.id, rawResult);
  if (complete.error) return res.status(complete.status).json({ error: complete.error });

  // Update node stats
  req.node.stats.tasks_completed++;
  removeCurrentTask(req.node, task.id);

  // Log to usage ledger
  metrics.logTask(complete.task, req.node);

  res.json({ accepted: true, provenance: validation.provenance });
});

// ---- Task failure report ----

app.post('/adin/tasks/:id/fail', nodeAuth, (req, res) => {
  const result = queue.fail(req.params.id, req.node.id, req.body?.reason || 'node-reported failure');
  if (result.error) return res.status(result.status).json({ error: result.error });

  req.node.stats.tasks_failed++;
  removeCurrentTask(req.node, req.params.id);

  res.json(result);
});

// ---- Admin endpoints ----

app.post('/adin/admin/enroll-code', adminAuth, (req, res) => {
  const { sponsor, node_name } = req.body || {};
  if (!sponsor || !node_name) return res.status(400).json({ error: 'sponsor and node_name required' });
  const result = registry.createEnrollmentCode({ sponsor, node_name });
  res.json({ code: result.code, expires_at: new Date(result.expires_at).toISOString() });
});

app.post('/adin/admin/revoke/:node_id', adminAuth, (req, res) => {
  const result = registry.revoke(req.params.node_id, req.body?.reason || 'admin revocation');
  if (result.error) return res.status(result.status).json({ error: result.error });
  // Fail any active tasks for this node
  for (const task of queue.tasksForNode(req.params.node_id)) {
    queue.fail(task.id, null, 'node revoked');
  }
  res.json(result);
});

app.post('/adin/admin/suspend/:node_id', adminAuth, (req, res) => {
  const result = registry.suspend(req.params.node_id, req.body?.reason || 'admin suspension');
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

app.post('/adin/admin/reinstate/:node_id', adminAuth, (req, res) => {
  const result = registry.reinstate(req.params.node_id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

app.post('/adin/admin/force-rotate/:node_id', adminAuth, (req, res) => {
  const result = registry.forceRotation(req.params.node_id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

app.post('/adin/admin/trust/:node_id', adminAuth, (req, res) => {
  const { tier, reason } = req.body || {};
  const result = registry.setTrustTier(req.params.node_id, tier, reason);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

app.post('/adin/admin/queue', adminAuth, (req, res) => {
  const taskDef = req.body;
  if (!taskDef) return res.status(400).json({ error: 'task definition required' });

  // Pre-validate commands for compute tasks
  const preCheck = preValidateTask(taskDef);
  if (!preCheck.safe) return res.status(400).json({ error: 'disallowed commands', violations: preCheck.violations });

  const result = queue.submit(taskDef);
  if (result.error) return res.status(result.status).json({ error: result.error });

  // Attempt immediate scheduling
  const nodes = registry.eligibleNodes(taskDef.type);
  const decision = selectNode(nodes, result.task);
  if (decision.selected) {
    const assign = queue.assign(result.task.id, decision.selected.node_id);
    if (assign.ok) {
      const node = registry.getNode(decision.selected.node_id);
      if (node) node.current_tasks.push(result.task.id);
    }
  }

  res.json({ task_id: result.task.id, status: result.task.status, assigned_to: result.task.assigned_to, scheduling: decision });
});

// ---- Read-only admin views ----

app.get('/adin/nodes', adminAuth, (req, res) => {
  res.json({ nodes: registry.listNodes() });
});

app.get('/adin/queue', adminAuth, (req, res) => {
  res.json({ active: queue.activeTasks(), depth: queue.queueDepth() });
});

app.get('/adin/history', adminAuth, (req, res) => {
  res.json({ history: queue.recentHistory(Number(req.query.limit) || 50) });
});

app.get('/adin/metrics', adminAuth, (req, res) => {
  res.json(metrics.summary(registry));
});

app.get('/adin/metrics/:node_id', adminAuth, (req, res) => {
  res.json({ ledger: metrics.nodeLedger(req.params.node_id, Number(req.query.limit) || 100) });
});

app.get('/adin/reviews', adminAuth, (req, res) => {
  res.json({ pending: reviews.pending() });
});

app.post('/adin/reviews/:id/decide', adminAuth, (req, res) => {
  const { decision, decided_by } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected' });
  const result = reviews.decide(req.params.id, decision, decided_by || 'admin');
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result);
});

// ---- Periodic maintenance ----

const SWEEP_INTERVAL = 30_000;

setInterval(() => {
  // Detect offline nodes
  const offline = registry.sweepHeartbeats();
  for (const nodeId of offline) {
    // Fail tasks assigned to offline nodes
    for (const task of queue.tasksForNode(nodeId)) {
      queue.fail(task.id, null, 'node went offline');
    }
    const node = registry.getNode(nodeId);
    if (node) node.current_tasks = [];
  }

  // Detect stale tasks
  for (const taskId of queue.sweepStale()) {
    const task = queue.getTask(taskId);
    if (task) {
      queue.fail(taskId, null, 'assignment/execution timeout');
      const node = task.assigned_to ? registry.getNode(task.assigned_to) : null;
      if (node) removeCurrentTask(node, taskId);
    }
  }

  // Clean expired sessions/codes
  registry.sweepExpired();
}, SWEEP_INTERVAL).unref();

// ---- Helpers ----

function removeCurrentTask(node, taskId) {
  const idx = node.current_tasks.indexOf(taskId);
  if (idx !== -1) node.current_tasks.splice(idx, 1);
}

// ---- Start ----

const server = app.listen(PORT, HOST, () => {
  console.log(`[adin] orchestrator listening on ${HOST}:${PORT} (tailnet only)`);
  console.log(`[adin] data dir: ${DATA_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', () => { registry.stop(); queue.save(); server.close(); });
process.on('SIGINT', () => { registry.stop(); queue.save(); server.close(); });

export { app, registry, queue, reviews, metrics };
