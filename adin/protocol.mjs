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

export const TASK_STATUSES = ['queued', 'assigned', 'running', 'completed', 'failed', 'cancelled', 'held'];
export const NODE_STATUSES = ['enrolled', 'active', 'suspended', 'revoked'];
export const TRUST_TIERS = [0, 1, 2]; // 0=probationary, 1=verified, 2=trusted

// ---- Structured step validation for compute tasks ----

/**
 * Allowed step actions. No shell strings, no command chaining, no flag injection.
 * Each action maps to a fixed executable behavior on the node worker.
 */
export const ALLOWED_ACTIONS = ['git-clone', 'npm-ci', 'node-test', 'playwright-test'];

/**
 * Allowed GitHub organizations for git-clone. Repos are specified as bare
 * "org/repo" names, never URLs. The node worker constructs the clone URL
 * from this verified name.
 */
export const ALLOWED_ORGS = ['cohabitation-project'];

/** 40-character lowercase hex SHA pattern. */
const COMMIT_SHA_RE = /^[a-f0-9]{40}$/;

/**
 * Safe relative file path: alphanumeric, dots, hyphens, underscores, slashes.
 * No "..", no absolute. Must start with a letter, digit, or "./" — never with "-".
 */
const SAFE_PATH_RE = /^[a-zA-Z0-9._/-]+$/;

/** Allowed fields per action — any extra key causes rejection. */
const ALLOWED_FIELDS = {
  'git-clone':       ['action', 'repo', 'commit'],
  'npm-ci':          ['action'],
  'node-test':       ['action', 'files'],
  'playwright-test': ['action', 'files'],
};

/**
 * Validate a single structured step for a compute task.
 * Returns { valid, errors }.
 *
 * **Worker execution contract** — future worker implementations MUST:
 * - Execute steps as fixed `[executable, ...args]` arrays via
 *   `child_process.execFile` or equivalent — NEVER pass to a shell.
 * - Use `--` before file arguments where the executable supports it
 *   (e.g., `node --test -- file.mjs`).
 * - Treat `action` as the sole determinant of which executable runs.
 */
export function validateStep(step) {
  const errors = [];
  if (!step || typeof step !== 'object') return { valid: false, errors: ['step must be an object'] };

  if (!ALLOWED_ACTIONS.includes(step.action)) {
    errors.push(`unknown action: ${step.action}`);
    return { valid: false, errors }; // no point checking further
  }

  // ---- Reject unknown/extra fields ----
  const allowed = ALLOWED_FIELDS[step.action];
  for (const key of Object.keys(step)) {
    if (!allowed.includes(key)) {
      errors.push(`unknown field "${key}" for action ${step.action}`);
    }
  }
  if (errors.length > 0) return { valid: false, errors };

  switch (step.action) {
    case 'git-clone': {
      if (typeof step.repo !== 'string') {
        errors.push('git-clone requires a string repo field');
        break;
      }
      // Must be bare org/repo — no URLs, no protocol, no paths
      const parts = step.repo.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        errors.push(`repo must be "org/repo" format, got: ${step.repo}`);
        break;
      }
      if (!ALLOWED_ORGS.includes(parts[0])) {
        errors.push(`org "${parts[0]}" not in allowed list: ${ALLOWED_ORGS.join(', ')}`);
      }
      // repo name: alphanumeric, hyphens, underscores, dots
      if (!/^[a-zA-Z0-9._-]+$/.test(parts[1])) {
        errors.push(`invalid repo name: ${parts[1]}`);
      }
      // repo name must start with a letter or digit (not "-" or ".")
      if (parts[1].startsWith('-') || parts[1].startsWith('.')) {
        errors.push(`repo name must start with a letter or digit, got: ${parts[1]}`);
      }
      if (typeof step.commit !== 'string' || !COMMIT_SHA_RE.test(step.commit)) {
        errors.push('git-clone requires a 40-char hex commit SHA');
      }
      break;
    }
    case 'npm-ci':
      // No fields needed — always runs with --ignore-scripts
      break;
    case 'node-test': {
      if (!Array.isArray(step.files) || step.files.length === 0) {
        errors.push('node-test requires a non-empty files array');
        break;
      }
      for (const f of step.files) {
        if (typeof f !== 'string' || !SAFE_PATH_RE.test(f)) {
          errors.push(`invalid file path: ${f}`);
        }
        if (typeof f === 'string' && f.includes('..')) {
          errors.push(`path traversal not allowed: ${f}`);
        }
        if (typeof f === 'string' && f.startsWith('/')) {
          errors.push(`absolute paths not allowed: ${f}`);
        }
        // Reject paths starting with "-" (flag injection)
        if (typeof f === 'string' && f.startsWith('-')) {
          errors.push(`file path must not start with "-" (flag injection): ${f}`);
        }
      }
      break;
    }
    case 'playwright-test': {
      if (!Array.isArray(step.files) || step.files.length === 0) {
        errors.push('playwright-test requires a non-empty files array');
        break;
      }
      for (const f of step.files) {
        if (typeof f !== 'string' || !SAFE_PATH_RE.test(f)) {
          errors.push(`invalid file path: ${f}`);
        }
        if (typeof f === 'string' && f.includes('..')) {
          errors.push(`path traversal not allowed: ${f}`);
        }
        if (typeof f === 'string' && f.startsWith('/')) {
          errors.push(`absolute paths not allowed: ${f}`);
        }
        // Reject paths starting with "-" (flag injection)
        if (typeof f === 'string' && f.startsWith('-')) {
          errors.push(`file path must not start with "-" (flag injection): ${f}`);
        }
      }
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate the full steps array for a compute task payload.
 * Returns { valid, errors }.
 */
export function validateSteps(steps) {
  const errors = [];
  if (!Array.isArray(steps) || steps.length === 0) {
    return { valid: false, errors: ['steps must be a non-empty array'] };
  }
  for (let i = 0; i < steps.length; i++) {
    const check = validateStep(steps[i]);
    if (!check.valid) {
      for (const e of check.errors) errors.push(`step[${i}]: ${e}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

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

  // Compute tasks must have structured steps (not free-form commands)
  if (task.type?.startsWith('compute.') && task.payload) {
    if (!Array.isArray(task.payload.steps) || task.payload.steps.length === 0) {
      errors.push('compute tasks require a non-empty payload.steps array');
    } else {
      const stepCheck = validateSteps(task.payload.steps);
      if (!stepCheck.valid) {
        for (const e of stepCheck.errors) errors.push(e);
      }
    }
    // sandbox must be declared at the top level of the payload
    if (task.payload.sandbox !== 'required') {
      errors.push('compute tasks require payload.sandbox = "required"');
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
