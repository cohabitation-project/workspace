/**
 * orchestrator.mjs — ADIN orchestrator server.
 *
 * Two Express apps for network isolation:
 *   - workerApp on HOST:PORT (tailnet) — node enrollment, auth, heartbeat, task polling, results
 *   - adminApp on 127.0.0.1:ADMIN_PORT (localhost only) — all admin endpoints
 *
 * Workers cannot reach admin endpoints. The admin CLI runs on the server itself.
 *
 * Usage:
 *   ADIN_DATA_DIR=/path/to/data ADIN_HOST=100.80.188.45 node adin/orchestrator.mjs
 *
 * For local testing:
 *   ADIN_DATA_DIR=/tmp/adin-test ADIN_HOST=127.0.0.1 node adin/orchestrator.mjs
 *
 * SECURITY NOTE on sandbox:
 *   runtime.sandbox is SELF-REPORTED by the node. The orchestrator's sandbox check is
 *   a policy gate (the node claims it has a sandbox), not proof. Real sandbox verification
 *   requires deployment-time testing per the covenant. See also the comment in scheduler.mjs.
 */

import crypto from 'node:crypto';
import express from 'express';
import { Registry } from './registry.mjs';
import { TaskQueue } from './queue.mjs';
import { selectNode, scoreNode, preValidateTask } from './scheduler.mjs';
import { validateTaskResult, ReviewQueue } from './validation.mjs';
import { Metrics } from './metrics.mjs';
import { Approvals } from './approvals.mjs';

/**
 * Create an orchestrator instance with all routes, state, and lifecycle methods.
 * Returns { workerApp, adminApp, registry, queue, reviews, metrics, start(), stop() }.
 */
export function createOrchestrator({ dataDir, host, port, adminPort, adminToken, rateLimitMax } = {}) {
  const DATA_DIR = dataDir || process.env.ADIN_DATA_DIR || './data/adin';
  const HOST = host || process.env.ADIN_HOST || '127.0.0.1';
  const PORT = port || Number(process.env.ADIN_PORT || 3399);
  const ADMIN_PORT = adminPort || Number(process.env.ADIN_ADMIN_PORT || 3398);
  const ADMIN_TOKEN = adminToken || process.env.ADIN_ADMIN_TOKEN || null;

  // ---- Initialize ----

  const registry = new Registry(DATA_DIR);
  const queue = new TaskQueue(DATA_DIR);
  const reviews = new ReviewQueue(DATA_DIR);
  const metrics = new Metrics(DATA_DIR);
  const approvals = new Approvals(DATA_DIR);

  // ---- Rate limiter (in-memory, per source) ----

  const rateLimitState = new Map(); // key → { count, resetAt }
  const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
  const RATE_LIMIT_MAX = rateLimitMax || 10; // 10 attempts per minute (configurable for tests)

  function rateLimit(key) {
    const now = Date.now();
    let entry = rateLimitState.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
      rateLimitState.set(key, entry);
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
  }

  // Periodic cleanup of stale rate-limit entries
  const rateLimitTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitState) {
      if (now > entry.resetAt) rateLimitState.delete(key);
    }
  }, RATE_LIMIT_WINDOW_MS);
  rateLimitTimer.unref();

  function rateLimitMiddleware(endpointName) {
    return (req, res, next) => {
      const source = req.body?.node_id || req.ip || 'unknown';
      const key = `${endpointName}:${source}`;
      if (rateLimit(key)) {
        return res.status(429).json({ error: 'rate limit exceeded, try again later' });
      }
      next();
    };
  }

  // ---- Worker app (tailnet) ----

  const workerApp = express();
  workerApp.use(express.json({ limit: '256kb' }));

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

  // ---- Node enrollment ----

  workerApp.post('/adin/enroll', rateLimitMiddleware('enroll'), (req, res) => {
    const { code, capabilities } = req.body || {};
    if (!code || !capabilities) return res.status(400).json({ error: 'code and capabilities required' });
    const result = registry.enroll(code, capabilities);
    if (result.error) return res.status(result.status).json({ error: result.error });
    // Return the secret ONCE — never logged, never stored in plaintext on the server
    res.json({ node_id: result.node_id, secret: result.secret, rotate_by: new Date(result.rotate_by).toISOString() });
  });

  // ---- Node authentication ----

  workerApp.post('/adin/auth', rateLimitMiddleware('auth'), (req, res) => {
    const { node_id, node_secret } = req.body || {};
    if (!node_id || !node_secret) return res.status(400).json({ error: 'node_id and node_secret required' });
    const result = registry.authenticate(node_id, node_secret);
    if (result.error) return res.status(result.status).json({ error: result.error, action: result.action });
    res.json({ token: result.token, expires_at: new Date(result.expires_at).toISOString(), action: result.action });
  });

  // ---- Credential rotation ----

  workerApp.post('/adin/rotate', rateLimitMiddleware('rotate'), (req, res) => {
    const { node_id, current_secret } = req.body || {};
    if (!node_id || !current_secret) return res.status(400).json({ error: 'node_id and current_secret required' });
    const result = registry.rotate(node_id, current_secret);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json({ secret: result.secret, rotate_by: new Date(result.rotate_by).toISOString() });
  });

  // ---- Heartbeat ----

  workerApp.post('/adin/heartbeat', nodeAuth, (req, res) => {
    const result = registry.heartbeat(req.node, req.body?.load);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  // ---- Capability update ----

  workerApp.put('/adin/capabilities', nodeAuth, (req, res) => {
    const result = registry.updateCapabilities(req.node.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  // ---- Task polling (Finding 4 + B2: check assigned tasks first with re-eligibility, then schedule) ----

  workerApp.get('/adin/tasks/next', nodeAuth, (req, res) => {
    // 1. Check if there's already a task assigned to this node by the scheduler
    const assigned = queue.assignedTo(req.node.id);
    if (assigned.length > 0) {
      assigned.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at));

      // B2: Re-check eligibility for each assigned task before delivering.
      // Pass excludeTaskId so the task doesn't count against its own concurrency slot
      // (it was already assigned and occupies the slot — blocking its own delivery
      // would make admin-preassigned tasks undeliverable at max_concurrent:1).
      for (const task of assigned) {
        const score = scoreNode(req.node, task, { excludeTaskId: task.id });
        if (!score.eligible) {
          // Node is no longer eligible — release the task back to queued
          queue.release(task.id);
          removeCurrentTask(req.node, task.id);
          continue;
        }
        // Still eligible — deliver this task
        return res.json({
          task: {
            id: task.id,
            type: task.type,
            payload: task.payload,
            constraints: task.constraints,
            requirements: task.requirements,
          },
        });
      }
      // All assigned tasks were released — fall through to scheduling
    }

    // 2. Use the scheduler to find the best queued task for this node
    const allNodes = [req.node]; // selectNode expects an array
    const queuedTasks = queue.activeTasks().filter(t => t.status === 'queued');

    for (const task of queuedTasks.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at))) {
      const decision = selectNode(allNodes, task);
      if (decision.selected) {
        // Pre-validate compute steps before assignment
        const preCheck = preValidateTask(task);
        if (!preCheck.safe) {
          queue.fail(task.id, null, `step validation failed: ${preCheck.violations.join(', ')}`);
          continue;
        }

        const assign = queue.assign(task.id, req.node.id);
        if (assign.error) continue; // race condition: task state changed

        req.node.current_tasks.push(task.id);

        return res.json({
          task: {
            id: task.id,
            type: task.type,
            payload: task.payload,
            constraints: task.constraints,
            requirements: task.requirements,
          },
        });
      }
    }

    res.json({ task: null });
  });

  // ---- Task status update (Finding 3: early ownership check) ----

  workerApp.post('/adin/tasks/:id/running', nodeAuth, (req, res) => {
    const task = queue.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'unknown task' });

    // Early ownership check before any processing
    if (task.assigned_to !== req.node.id) {
      return res.status(403).json({ error: 'task not assigned to this node' });
    }

    const result = queue.markRunning(req.params.id, req.node.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  // ---- Task result submission (Finding 3: early ownership + body check) ----

  workerApp.post('/adin/tasks/:id/result', nodeAuth, async (req, res) => {
    // Guard against non-object body
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'request body must be a JSON object' });
    }

    const task = queue.getTask(req.params.id);
    if (!task) {
      // Check if this task already completed (moved to history)
      const inHistory = queue.recentHistory(200).some(h => h.id === req.params.id);
      if (inHistory) {
        return res.status(409).json({ error: 'task already completed', message: 'this task has already been completed and is in history' });
      }
      return res.status(404).json({ error: 'task not found', message: 'task already completed or not found' });
    }

    // Early ownership check BEFORE any validation/logging (Finding 3)
    if (task.assigned_to !== req.node.id) {
      return res.status(403).json({ error: 'task not assigned to this node' });
    }

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

  // ---- Task failure report (Finding 3: early ownership check) ----

  workerApp.post('/adin/tasks/:id/fail', nodeAuth, (req, res) => {
    const task = queue.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'unknown task' });

    // Early ownership check
    if (task.assigned_to !== req.node.id) {
      return res.status(403).json({ error: 'task not assigned to this node' });
    }

    const result = queue.fail(req.params.id, req.node.id, req.body?.reason || 'node-reported failure');
    if (result.error) return res.status(result.status).json({ error: result.error });

    req.node.stats.tasks_failed++;
    removeCurrentTask(req.node, req.params.id);

    res.json(result);
  });

  // ---- Admin app (localhost only) ----

  const adminApp = express();
  adminApp.use(express.json({ limit: '256kb' }));

  function adminAuth(req, res, next) {
    if (!ADMIN_TOKEN) return res.status(503).json({ error: 'admin token not configured' });
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    // Constant-time comparison to prevent timing attacks on the admin token
    const a = Buffer.from(token);
    const b = Buffer.from(ADMIN_TOKEN);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'invalid admin token' });
    next();
  }

  adminApp.post('/adin/admin/enroll-code', adminAuth, (req, res) => {
    const { sponsor, node_name } = req.body || {};
    if (!sponsor || !node_name) return res.status(400).json({ error: 'sponsor and node_name required' });
    const result = registry.createEnrollmentCode({ sponsor, node_name });
    res.json({ code: result.code, expires_at: new Date(result.expires_at).toISOString() });
  });

  adminApp.post('/adin/admin/revoke/:node_id', adminAuth, (req, res) => {
    const result = registry.revoke(req.params.node_id, req.body?.reason || 'admin revocation');
    if (result.error) return res.status(result.status).json({ error: result.error });
    // Fail any active tasks for this node
    for (const task of queue.tasksForNode(req.params.node_id)) {
      queue.fail(task.id, null, 'node revoked');
    }
    res.json(result);
  });

  adminApp.post('/adin/admin/suspend/:node_id', adminAuth, (req, res) => {
    const result = registry.suspend(req.params.node_id, req.body?.reason || 'admin suspension');
    if (result.error) return res.status(result.status).json({ error: result.error });

    // Release all tasks assigned to the suspended node back to the queue
    for (const task of queue.tasksForNode(req.params.node_id)) {
      queue.release(task.id);
    }
    const node = registry.getNode(req.params.node_id);
    if (node) node.current_tasks = [];

    res.json(result);
  });

  adminApp.post('/adin/admin/reinstate/:node_id', adminAuth, (req, res) => {
    const result = registry.reinstate(req.params.node_id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  adminApp.post('/adin/admin/force-rotate/:node_id', adminAuth, (req, res) => {
    const result = registry.forceRotation(req.params.node_id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  adminApp.put('/adin/admin/capabilities/:node_id', adminAuth, (req, res) => {
    const result = registry.updateCapabilities(req.params.node_id, req.body, true);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  adminApp.post('/adin/admin/trust/:node_id', adminAuth, (req, res) => {
    const { tier, reason } = req.body || {};
    const result = registry.setTrustTier(req.params.node_id, tier, reason);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  adminApp.post('/adin/admin/queue', adminAuth, (req, res) => {
    const taskDef = req.body;
    if (!taskDef) return res.status(400).json({ error: 'task definition required' });

    // Pre-validate steps for compute tasks
    const preCheck = preValidateTask(taskDef);
    if (!preCheck.safe) return res.status(400).json({ error: 'disallowed steps', violations: preCheck.violations });

    // Check commit approvals for all git-clone steps
    if (taskDef.payload?.steps) {
      for (const step of taskDef.payload.steps) {
        if (step.action === 'git-clone' && step.repo && step.commit) {
          if (!approvals.isApproved(step.repo, step.commit)) {
            return res.status(403).json({
              error: `commit not approved: ${step.repo}@${step.commit.slice(0, 12)}`,
              action: 'approve the commit first via POST /adin/admin/approve',
            });
          }
        }
      }
    }

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

  // ---- Commit approval endpoints ----

  adminApp.post('/adin/admin/approve', adminAuth, (req, res) => {
    const { repo, commit, approver, notes } = req.body || {};
    const result = approvals.approve(repo, commit, approver, notes);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  adminApp.get('/adin/admin/approvals/:repo', adminAuth, (req, res) => {
    // repo param may contain slashes (e.g. "cohabitation-project/workspace")
    // Express collapses the path, so use a wildcard or decode. For simplicity,
    // accept the repo as a query param fallback too.
    const repo = req.params.repo;
    res.json({ approvals: approvals.listApprovals(repo) });
  });

  // Support repos with slashes via a catch-all
  adminApp.get('/adin/admin/approvals/:org/:name', adminAuth, (req, res) => {
    const repo = `${req.params.org}/${req.params.name}`;
    res.json({ approvals: approvals.listApprovals(repo) });
  });

  adminApp.post('/adin/admin/revoke-approval', adminAuth, (req, res) => {
    const { repo, commit, reason } = req.body || {};
    const result = approvals.revokeApproval(repo, commit, reason);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  // ---- Read-only admin views ----

  adminApp.get('/adin/nodes', adminAuth, (req, res) => {
    res.json({ nodes: registry.listNodes() });
  });

  adminApp.get('/adin/queue', adminAuth, (req, res) => {
    res.json({ active: queue.activeTasks(), depth: queue.queueDepth() });
  });

  adminApp.get('/adin/history', adminAuth, (req, res) => {
    res.json({ history: queue.recentHistory(Number(req.query.limit) || 50) });
  });

  adminApp.get('/adin/metrics', adminAuth, (req, res) => {
    res.json(metrics.summary(registry));
  });

  adminApp.get('/adin/metrics/:node_id', adminAuth, (req, res) => {
    res.json({ ledger: metrics.nodeLedger(req.params.node_id, Number(req.query.limit) || 100) });
  });

  adminApp.get('/adin/reviews', adminAuth, (req, res) => {
    res.json({ pending: reviews.pending() });
  });

  adminApp.post('/adin/reviews/:id/decide', adminAuth, (req, res) => {
    const { decision, decided_by } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected' });
    const result = reviews.decide(req.params.id, decision, decided_by || 'admin');
    if (result.error) return res.status(result.status).json({ error: result.error });

    // If approved, complete the original task with the stored result
    if (decision === 'approved' && result.entry?.full_result) {
      const taskId = result.entry.task_id;
      const nodeId = result.entry.node_id;
      const fullResult = result.entry.full_result;

      // The task was previously failed with "held for review" — it may have been requeued.
      // Resubmit it as completed directly into history via a special completion path.
      const task = queue.getTask(taskId);
      if (task) {
        // Task still exists (was requeued after the hold-fail). Assign and complete it.
        if (task.status === 'queued') {
          queue.assign(taskId, nodeId);
        }
        queue.complete(taskId, nodeId, fullResult);
      }
      // If task is already gone from active (in history as failed), that's expected —
      // the review approval is recorded but the task lifecycle already ended.
    }

    res.json(result);
  });

  // ---- Periodic maintenance ----

  const SWEEP_INTERVAL = 30_000;

  const sweepTimer = setInterval(() => {
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
  }, SWEEP_INTERVAL);
  sweepTimer.unref();

  // ---- Helpers ----

  function removeCurrentTask(node, taskId) {
    const idx = node.current_tasks.indexOf(taskId);
    if (idx !== -1) node.current_tasks.splice(idx, 1);
  }

  // ---- Lifecycle ----

  let workerServer = null;
  let adminServer = null;

  function start() {
    registry.startPersistence();
    return new Promise((resolve) => {
      workerServer = workerApp.listen(PORT, HOST, () => {
        console.log(`[adin] worker API listening on ${HOST}:${PORT} (tailnet only)`);
        adminServer = adminApp.listen(ADMIN_PORT, '127.0.0.1', () => {
          console.log(`[adin] admin API listening on 127.0.0.1:${ADMIN_PORT} (localhost only)`);
          console.log(`[adin] data dir: ${DATA_DIR}`);
          resolve();
        });
      });
    });
  }

  function stop() {
    clearInterval(sweepTimer);
    clearInterval(rateLimitTimer);
    registry.stop();
    queue.save();
    if (workerServer) workerServer.close();
    if (adminServer) adminServer.close();
  }

  return { workerApp, adminApp, registry, queue, reviews, metrics, approvals, start, stop, workerServer: () => workerServer, adminServer: () => adminServer };
}

// ---- Auto-start when run directly (not imported) ----
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const orch = createOrchestrator();
  orch.start();

  // Graceful shutdown
  process.on('SIGTERM', () => orch.stop());
  process.on('SIGINT', () => orch.stop());
}
