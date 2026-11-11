/**
 * scheduler.mjs — ADIN resource-aware task scheduler.
 *
 * Deterministic and auditable: given the same node capabilities and task requirements,
 * the scheduler always makes the same assignment decision. Every decision is logged with
 * the reason — why this node was chosen, why others were passed over.
 *
 * The scheduler does not grant permissions, escalate trust, or modify node capabilities.
 * It reads the registry and queue, makes a match, and returns a recommendation.
 */

import { validateCommands } from './protocol.mjs';

/**
 * Score a node for a task. Higher score = better fit.
 * Returns { eligible, score, reasons } or { eligible: false, disqualified, reason }.
 */
export function scoreNode(node, task) {
  const reasons = [];

  // ---- Hard filters (any failure = ineligible) ----

  if (node.status !== 'active') return { eligible: false, disqualified: true, reason: `node status is ${node.status}` };
  if (!node.health.online) return { eligible: false, disqualified: true, reason: 'node is offline' };

  // Task type support
  if (!node.capabilities.offered.task_types.includes(task.type)) {
    return { eligible: false, disqualified: true, reason: `node does not offer ${task.type}` };
  }

  // Trust tier
  const minTier = task.constraints?.trust_tier_min ?? 0;
  if (node.trust_tier < minTier) {
    return { eligible: false, disqualified: true, reason: `trust tier ${node.trust_tier} < required ${minTier}` };
  }

  // Sandbox requirement
  if (task.requirements?.sandbox === 'required') {
    const hasSandbox = node.capabilities.runtime?.sandbox || node.capabilities.runtime?.container;
    if (!hasSandbox) return { eligible: false, disqualified: true, reason: 'sandbox required but node has none' };
  }

  // Concurrency limit
  const maxConcurrent = node.capabilities.offered.max_concurrent || 1;
  const currentTasks = node.current_tasks?.length || 0;
  if (currentTasks >= maxConcurrent) {
    return { eligible: false, disqualified: true, reason: `at capacity (${currentTasks}/${maxConcurrent} tasks)` };
  }

  // Resource requirements
  const req = task.requirements || {};
  const cap = node.capabilities;
  const load = node.health.load || {};

  if (req.ram_gb_min) {
    const available = (cap.offered?.ram_gb || cap.compute?.ram_gb || 0) - (load.ram_used_gb || 0);
    if (available < req.ram_gb_min) return { eligible: false, disqualified: true, reason: `insufficient RAM: ${available.toFixed(1)}GB available < ${req.ram_gb_min}GB required` };
  }

  if (req.disk_gb_min) {
    const free = load.disk_free_gb ?? cap.storage?.free_gb ?? 0;
    if (free < req.disk_gb_min) return { eligible: false, disqualified: true, reason: `insufficient disk: ${free}GB free < ${req.disk_gb_min}GB required` };
  }

  if (req.cpu_cores_min) {
    if (cap.compute.cpu.cores < req.cpu_cores_min) return { eligible: false, disqualified: true, reason: `insufficient CPU: ${cap.compute.cpu.cores} cores < ${req.cpu_cores_min} required` };
  }

  if (req.gpu_required && (!cap.compute.gpu || cap.compute.gpu.length === 0)) {
    return { eligible: false, disqualified: true, reason: 'GPU required but node has none' };
  }

  // Runtime requirements
  if (req.runtime) {
    for (const [name, constraint] of Object.entries(req.runtime)) {
      const nodeVersion = cap.runtime?.[name];
      if (!nodeVersion) return { eligible: false, disqualified: true, reason: `runtime ${name} required but not available` };
      // Simple major-version check: ">=20" means major >= 20
      const match = /^>=(\d+)$/.exec(constraint);
      if (match) {
        const major = parseInt(nodeVersion, 10);
        if (major < parseInt(match[1], 10)) return { eligible: false, disqualified: true, reason: `${name} ${nodeVersion} < required ${constraint}` };
      }
    }
  }

  // Availability hours
  if (cap.offered?.hours) {
    const inWindow = isWithinHours(cap.offered.hours);
    if (!inWindow) return { eligible: false, disqualified: true, reason: 'outside offered hours' };
  }

  // Owner-imposed limits
  if (cap.limits) {
    if (cap.limits.thermal_ceiling_c && load.temp_c && load.temp_c >= cap.limits.thermal_ceiling_c) {
      return { eligible: false, disqualified: true, reason: `thermal limit reached: ${load.temp_c}°C >= ${cap.limits.thermal_ceiling_c}°C` };
    }
    if (cap.limits.disk_floor_gb && load.disk_free_gb !== undefined && load.disk_free_gb < cap.limits.disk_floor_gb) {
      return { eligible: false, disqualified: true, reason: `below disk floor: ${load.disk_free_gb}GB < ${cap.limits.disk_floor_gb}GB` };
    }
  }

  // ---- Scoring (all soft factors) ----

  let score = 100;

  // Prefer nodes with more headroom
  if (load.cpu_percent !== undefined) {
    const headroom = 100 - load.cpu_percent;
    score += headroom * 0.3;
    reasons.push(`CPU headroom: ${headroom.toFixed(0)}%`);
  }

  if (load.ram_used_gb !== undefined && cap.compute?.ram_gb) {
    const ramFree = cap.compute.ram_gb - load.ram_used_gb;
    score += ramFree * 5;
    reasons.push(`RAM free: ${ramFree.toFixed(1)}GB`);
  }

  // Prefer nodes with higher trust tier
  score += node.trust_tier * 20;
  reasons.push(`trust tier: ${node.trust_tier}`);

  // Prefer nodes with better track records
  const total = node.stats.tasks_completed + node.stats.tasks_failed;
  if (total > 0) {
    const successRate = node.stats.tasks_completed / total;
    score += successRate * 30;
    reasons.push(`success rate: ${(successRate * 100).toFixed(0)}% (${total} tasks)`);
  }

  // Fairness: slightly penalize nodes that have many current tasks (even if under max)
  score -= currentTasks * 10;
  if (currentTasks > 0) reasons.push(`current tasks: ${currentTasks}`);

  // For inference tasks, prefer nodes with matching models
  if (task.type.startsWith('inference.') && task.payload?.model && cap.inference?.loaded_models) {
    const hasModel = cap.inference.loaded_models.some((m) =>
      m.name === task.payload.model || m.name.startsWith(task.payload.model));
    if (hasModel) {
      score += 50;
      reasons.push('has requested model loaded');
    }
  }

  return { eligible: true, score, reasons };
}

/**
 * Select the best node for a task from a list of candidates.
 * Returns { node, score, reasons, considered } or null.
 * The decision log includes why each candidate was chosen or rejected.
 */
export function selectNode(nodes, task) {
  const considered = [];
  let best = null;

  for (const node of nodes) {
    const result = scoreNode(node, task);
    considered.push({ node_id: node.id, node_name: node.name, ...result });

    if (result.eligible && (!best || result.score > best.score)) {
      best = { node: node, score: result.score, reasons: result.reasons };
    }
  }

  // Sort the decision log: eligible first (by score desc), then ineligible
  considered.sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    return (b.score || 0) - (a.score || 0);
  });

  if (!best) return { selected: null, considered };
  return { selected: { node_id: best.node.id, node_name: best.node.name, score: best.score, reasons: best.reasons }, considered };
}

/**
 * Pre-validate a compute task's commands before assignment.
 * Returns { safe, violations } — the scheduler refuses tasks with disallowed commands.
 */
export function preValidateTask(task) {
  if (!task.type?.startsWith('compute.')) return { safe: true, violations: [] };
  if (!task.payload?.commands) return { safe: false, violations: ['no commands in payload'] };

  const check = validateCommands(task.payload.commands);
  return {
    safe: check.all_allowed,
    violations: check.checks.filter((c) => !c.allowed).map((c) => c.reason),
  };
}

// ---- Helpers ----

/** Check if current time is within an offered hours window. */
function isWithinHours(hours) {
  if (!hours || !hours.start || !hours.end) return true; // no restriction
  try {
    const now = new Date();
    // Convert to the node's timezone
    const tz = hours.tz || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = formatter.formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === 'hour').value, 10);
    const m = parseInt(parts.find((p) => p.type === 'minute').value, 10);
    const nowMinutes = h * 60 + m;

    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }
    // Overnight window (e.g., 22:00 - 06:00)
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  } catch {
    return true; // if timezone parsing fails, don't block
  }
}
