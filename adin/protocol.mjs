/**
 * protocol.mjs — ADIN schema definitions and validators.
 *
 * Defines the general-purpose Cohabitation Node protocol: capabilities, tasks, and results.
 * Every task category (compute, inference, storage) uses the same envelope; new types plug in
 * by adding entries here without changing the scheduler or queue.
 *
 * Nothing in this file talks to the network or touches the filesystem.
 */

// ---- Task categories and types ----

export const TASK_CATEGORIES = ['compute', 'inference', 'storage'];

export const TASK_TYPES = {
  'compute.build-test':  { category: 'compute',   description: 'Clone repo, install deps, run tests' },
  'compute.benchmark':   { category: 'compute',   description: 'Run a standard benchmark, report scores' },
  'inference.completion': { category: 'inference', description: 'Run a prompt through a local model, return text' },
  'inference.embedding':  { category: 'inference', description: 'Generate vector embeddings for text' },
  'storage.index':       { category: 'storage',   description: 'Index documents for retrieval' },
  'storage.cache':       { category: 'storage',   description: 'Cache frequently-accessed data locally' },
};

export const TASK_STATUSES = ['queued', 'assigned', 'running', 'completed', 'failed', 'cancelled'];
export const NODE_STATUSES = ['enrolled', 'active', 'suspended', 'revoked'];
export const TRUST_TIERS = [0, 1, 2]; // 0=probationary, 1=verified, 2=trusted

// ---- Capability schema validation ----

/** Validate a node's capability report. Returns { valid, errors }. */
export function validateCapabilities(cap) {
  const errors = [];
  if (!cap || typeof cap !== 'object') return { valid: false, errors: ['capabilities must be an object'] };

  // compute (required)
  if (!cap.compute || typeof cap.compute !== 'object') {
    errors.push('compute section required');
  } else {
    if (!cap.compute.cpu || typeof cap.compute.cpu !== 'object') errors.push('compute.cpu required');
    else {
      if (typeof cap.compute.cpu.cores !== 'number' || cap.compute.cpu.cores < 1) errors.push('compute.cpu.cores must be >= 1');
      if (typeof cap.compute.cpu.arch !== 'string') errors.push('compute.cpu.arch required');
    }
    if (typeof cap.compute.ram_gb !== 'number' || cap.compute.ram_gb <= 0) errors.push('compute.ram_gb must be > 0');
    // gpu is optional — an empty array means no GPU
    if (cap.compute.gpu !== undefined && !Array.isArray(cap.compute.gpu)) errors.push('compute.gpu must be an array');
  }

  // storage (required)
  if (!cap.storage || typeof cap.storage !== 'object') {
    errors.push('storage section required');
  } else {
    if (typeof cap.storage.free_gb !== 'number') errors.push('storage.free_gb required');
  }

  // offered (required)
  if (!cap.offered || typeof cap.offered !== 'object') {
    errors.push('offered section required');
  } else {
    if (!Array.isArray(cap.offered.task_types) || cap.offered.task_types.length === 0) {
      errors.push('offered.task_types must be a non-empty array');
    } else {
      for (const t of cap.offered.task_types) {
        if (!TASK_TYPES[t]) errors.push(`unknown task type: ${t}`);
      }
    }
    if (typeof cap.offered.max_concurrent !== 'number' || cap.offered.max_concurrent < 1) {
      errors.push('offered.max_concurrent must be >= 1');
    }
  }

  // limits (required)
  if (!cap.limits || typeof cap.limits !== 'object') {
    errors.push('limits section required');
  } else {
    if (typeof cap.limits.max_task_duration_s !== 'number') errors.push('limits.max_task_duration_s required');
  }

  // inference, runtime are optional sections — validated only if present
  if (cap.inference) {
    if (typeof cap.inference !== 'object') errors.push('inference must be an object');
    else if (cap.inference.loaded_models && !Array.isArray(cap.inference.loaded_models)) errors.push('inference.loaded_models must be an array');
  }

  return { valid: errors.length === 0, errors };
}

// ---- Task validation ----

/** Validate a task definition before it enters the queue. Returns { valid, errors }. */
export function validateTask(task) {
  const errors = [];
  if (!task || typeof task !== 'object') return { valid: false, errors: ['task must be an object'] };

  if (typeof task.type !== 'string' || !TASK_TYPES[task.type]) errors.push(`invalid task type: ${task.type}`);
  if (!task.requirements || typeof task.requirements !== 'object') errors.push('requirements required');
  if (!task.payload || typeof task.payload !== 'object') errors.push('payload required');
  if (!task.constraints || typeof task.constraints !== 'object') {
    errors.push('constraints required');
  } else {
    if (typeof task.constraints.timeout_s !== 'number' || task.constraints.timeout_s <= 0) errors.push('constraints.timeout_s must be > 0');
  }

  // Compute tasks must have an explicit command allowlist
  if (task.type?.startsWith('compute.') && task.payload) {
    if (!Array.isArray(task.payload.commands) || task.payload.commands.length === 0) {
      errors.push('compute tasks require a non-empty payload.commands array');
    }
  }

  // Inference tasks must have a prompt
  if (task.type?.startsWith('inference.') && task.payload) {
    if (typeof task.payload.prompt !== 'string' && typeof task.payload.text !== 'string') {
      errors.push('inference tasks require payload.prompt or payload.text');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---- Result validation ----

/** Validate the structural envelope of a task result. Content validation is in validation.mjs. */
export function validateResult(result) {
  const errors = [];
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result must be an object'] };

  if (typeof result.task_id !== 'string') errors.push('task_id required');
  if (typeof result.node_id !== 'string') errors.push('node_id required');
  if (!['completed', 'failed'].includes(result.status)) errors.push('status must be completed or failed');
  if (!result.output || typeof result.output !== 'object') errors.push('output required');

  // Resource usage reporting is required for auditing
  if (!result.resources_used || typeof result.resources_used !== 'object') {
    errors.push('resources_used required');
  }

  return { valid: errors.length === 0, errors };
}

// ---- Command allowlist for compute tasks ----

const ALLOWED_COMMAND_PATTERNS = [
  /^git clone https:\/\/github\.com\/cohabitation-project\/\S+\s/,
  /^npm ci --ignore-scripts$/,
  /^node --test\s+\S/,
  /^npx playwright test\s+\S/,
];

/** Check whether a command is on the allowlist. Returns { allowed, reason }. */
export function commandAllowed(cmd) {
  if (typeof cmd !== 'string') return { allowed: false, reason: 'command must be a string' };
  const trimmed = cmd.trim();
  if (!trimmed) return { allowed: false, reason: 'empty command' };
  for (const pattern of ALLOWED_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) return { allowed: true, reason: null };
  }
  return { allowed: false, reason: `command does not match any allowed pattern: ${trimmed.slice(0, 80)}` };
}

/** Validate all commands in a compute task payload. */
export function validateCommands(commands) {
  const results = [];
  for (const cmd of commands) {
    const check = commandAllowed(cmd);
    results.push({ command: cmd, ...check });
  }
  return {
    all_allowed: results.every((r) => r.allowed),
    checks: results,
  };
}
