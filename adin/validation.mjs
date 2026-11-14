/**
 * validation.mjs — ADIN result validation pipeline.
 *
 * All node output is untrusted. This module enforces:
 *   1. Structural validation (format, length, encoding)
 *   2. Safety policy enforcement (identity leaks, role reversal, content checks)
 *   3. Cross-checking for probationary nodes (compare against known-good source)
 *   4. Provenance stamping (who produced what, when, with what model)
 *
 * The pipeline is LOCAL-FIRST: no cloud API calls unless explicitly authorized.
 * Guards reuse the same patterns as the Commons' existing output filters (guards.mjs).
 *
 * Trust tiers DO NOT grant access to private information. They only affect which
 * validation steps are required before the result is accepted.
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateResult } from './protocol.mjs';

// ---- Guard patterns (ported from commons/lib/guards.mjs for standalone use) ----

const IDENTITY_LEAK_PATTERNS = [
  /^\s*\(.+? said:\)/i,
  /^\s*\[.+?\]\s*:/,
  /^\s*\*{1,2}[A-Za-z0-9 /-]+\*{1,2}\s*:/,
  /^\s*\[?\s*bridge\s*(auto[- ]?)?sign/i,
  /^\s*—\s*.+?\s*·\s*(operator|model|agent|ctx|ai agent|hosted)\b/i,
  /^\s*(model|operator|context.?hash|provider)\s*[:=]\s*.+/i,
  /^\s*sig\s*[:=]\s*[a-f0-9]/i,
];

const ROLE_REVERSAL_PATTERNS = [
  /\bI was (referring to|asking about)\b/i,
  /\b(answer(ing|ed)?|explain(ing|ed)?) my (original |earlier )?question\b/i,
  /\bfor me to (review|read|approve|sign)\b/i,
];

/** Strip lines where the model forges attribution signatures. */
function stripIdentityLeaks(text) {
  const kept = [];
  let stripped = 0;
  for (const line of String(text).split('\n')) {
    if (IDENTITY_LEAK_PATTERNS.some((p) => p.test(line))) { stripped++; continue; }
    kept.push(line);
  }
  return { text: kept.join('\n').trim(), stripped };
}

/** Detect role-reversal (model speaks as the person who asked). */
function detectRoleReversal(text) {
  for (const rx of ROLE_REVERSAL_PATTERNS) {
    if (rx.test(text)) return true;
  }
  return false;
}

// ---- Validation pipeline ----

/**
 * Validate a task result through the full pipeline.
 *
 * @param {object} result — the raw result from the node
 * @param {object} task — the original task definition
 * @param {object} node — the node record (from registry)
 * @param {object} opts — { crossCheckFn, provenanceDir }
 *   crossCheckFn: async (prompt) => expectedText — for tier 0 cross-checking
 *   provenanceDir: directory for provenance logs
 *
 * @returns {{ accepted, result, checks, provenance, held_for_review, reason }}
 */
export async function validateTaskResult(result, task, node, opts = {}) {
  const checks = [];
  let accepted = true;
  let held_for_review = false;
  let reason = null;

  // ---- Step 1: Structural validation ----
  const structural = validateResult(result);
  checks.push({ step: 'structural', passed: structural.valid, errors: structural.errors });
  if (!structural.valid) {
    return { accepted: false, result, checks, held_for_review: false, reason: `structural: ${structural.errors.join(', ')}` };
  }

  // ---- Step 2: Type-specific validation ----
  if (task.type === 'compute.build-test') {
    const btCheck = validateBuildTestResult(result);
    checks.push({ step: 'build-test-specific', ...btCheck });
    if (!btCheck.passed) {
      accepted = false;
      reason = btCheck.reason;
    }
  }

  if (task.type?.startsWith('inference.')) {
    const infCheck = validateInferenceResult(result, task);
    checks.push({ step: 'inference-specific', ...infCheck });
    if (!infCheck.passed) {
      if (infCheck.hold) {
        held_for_review = true;
        reason = infCheck.reason;
      } else {
        accepted = false;
        reason = infCheck.reason;
      }
    }
  }

  // ---- Step 3: Cross-check (tier 0 nodes, inference tasks only) ----
  if (accepted && !held_for_review && node.trust_tier === 0 && task.type?.startsWith('inference.') && opts.crossCheckFn) {
    try {
      const expected = await opts.crossCheckFn(task.payload.prompt || task.payload.text);
      if (expected) {
        const divergence = measureDivergence(result.output?.structured?.text || '', expected);
        checks.push({ step: 'cross-check', divergence, threshold: 0.7, passed: divergence < 0.7 });
        if (divergence >= 0.7) {
          held_for_review = true;
          reason = `cross-check divergence ${divergence.toFixed(2)} exceeds threshold (tier 0 node)`;
        }
      }
    } catch (e) {
      // Cross-check failure is not a rejection — log and continue
      checks.push({ step: 'cross-check', passed: true, note: `cross-check unavailable: ${e.message}` });
    }
  }

  // ---- Step 4: Provenance stamp ----
  const provenance = {
    task_id: result.task_id,
    node_id: result.node_id,
    node_name: node.name,
    trust_tier: node.trust_tier,
    task_type: task.type,
    model: result.output?.structured?.model || null,
    timestamp: new Date().toISOString(),
    checks_passed: checks.filter((c) => c.passed).map((c) => c.step),
    checks_failed: checks.filter((c) => !c.passed).map((c) => c.step),
    accepted,
    held_for_review,
    reason,
  };

  if (opts.provenanceDir) {
    try {
      fs.mkdirSync(opts.provenanceDir, { recursive: true });
      const file = path.join(opts.provenanceDir, 'provenance.jsonl');
      fs.appendFileSync(file, JSON.stringify(provenance) + '\n');
    } catch { /* provenance logging is best-effort */ }
  }

  return { accepted, result, checks, provenance, held_for_review, reason };
}

// ---- Type-specific validators ----

/** Validate build/test results for internal consistency. */
function validateBuildTestResult(result) {
  const output = result.output;
  if (typeof output.exit_code !== 'number') return { passed: false, reason: 'missing exit_code' };

  const s = output.structured;
  if (!s) return { passed: false, reason: 'missing structured output' };

  // Consistency: exit_code 0 should mean no failures
  if (output.exit_code === 0 && s.tests_failed > 0) {
    return { passed: false, reason: `inconsistency: exit_code 0 but ${s.tests_failed} tests failed`, hold: true };
  }
  if (output.exit_code !== 0 && s.tests_failed === 0 && s.tests_passed > 0) {
    return { passed: false, reason: `inconsistency: exit_code ${output.exit_code} but 0 failures reported`, hold: true };
  }

  // Plausibility: total should equal passed + failed + skipped
  if (typeof s.tests_total === 'number' && typeof s.tests_passed === 'number' && typeof s.tests_failed === 'number') {
    const sum = s.tests_passed + s.tests_failed + (s.tests_skipped || 0);
    if (sum !== s.tests_total) {
      return { passed: false, reason: `count mismatch: ${sum} != total ${s.tests_total}`, hold: true };
    }
  }

  // Output length plausibility
  if (output.stdout_truncated && output.stdout_truncated.length > 1_048_576) {
    return { passed: false, reason: 'stdout exceeds 1MB limit' };
  }

  return { passed: true };
}

/** Validate inference results: safety guards, length, content policy. */
function validateInferenceResult(result, task) {
  const text = result.output?.structured?.text;
  if (typeof text !== 'string' || !text.trim()) {
    return { passed: false, reason: 'empty inference result' };
  }

  // Length limit
  if (text.length > 10_000) {
    return { passed: false, reason: `inference result too long: ${text.length} chars` };
  }

  // Identity leak check
  const leaks = stripIdentityLeaks(text);
  if (leaks.stripped > 0) {
    // Don't reject — strip the leaks and flag
    result.output.structured.text = leaks.text;
    result.output.structured._leaks_stripped = leaks.stripped;
  }

  // Role reversal check
  if (detectRoleReversal(text)) {
    return { passed: false, hold: true, reason: 'role reversal detected — held for review' };
  }

  return { passed: true };
}

// ---- Canary system ----

/** Generate a canary prompt with a known answer for node integrity checks. */
export function generateCanary() {
  const canaries = [
    { prompt: 'What is 7 multiplied by 8?', expected_contains: '56' },
    { prompt: 'What color do you get when you mix red and blue?', expected_contains: 'purple' },
    { prompt: 'Complete: The quick brown fox jumps over the lazy', expected_contains: 'dog' },
    { prompt: 'What is the capital of France?', expected_contains: 'Paris' },
    { prompt: 'What comes after the letter M in the English alphabet?', expected_contains: 'N' },
  ];
  const pick = canaries[Math.floor(Math.random() * canaries.length)];
  return { ...pick, is_canary: true };
}

/** Check a canary result. */
export function checkCanary(canary, resultText) {
  if (typeof resultText !== 'string') return { passed: false, reason: 'non-string result' };
  const contains = resultText.toLowerCase().includes(canary.expected_contains.toLowerCase());
  return { passed: contains, reason: contains ? null : `expected "${canary.expected_contains}" not found in response` };
}

// ---- Helpers ----

/** Simple word-overlap divergence measure (0 = identical, 1 = completely different). */
function measureDivergence(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 0;
  const union = new Set([...wordsA, ...wordsB]);
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  return 1 - (intersection.length / union.size);
}

// ---- Human review queue (file-based) ----

export class ReviewQueue {
  constructor(dataDir) {
    this.dir = path.join(dataDir, 'review');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  /** Add a result to the review queue. Returns the review ID. */
  hold(result, task, node, reason) {
    const id = `rv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const entry = {
      id,
      created_at: new Date().toISOString(),
      reason,
      task_id: task.id,
      task_type: task.type,
      node_id: node.id,
      node_name: node.name,
      trust_tier: node.trust_tier,
      result_summary: {
        status: result.status,
        text_preview: (result.output?.structured?.text || '').slice(0, 500),
      },
      // Store full result so an approval can complete the task
      full_result: result,
      decision: null, // 'approved' | 'rejected' | null
      decided_by: null,
      decided_at: null,
    };
    fs.writeFileSync(path.join(this.dir, `${id}.json`), JSON.stringify(entry, null, 2));
    return id;
  }

  /** List pending reviews. */
  pending() {
    const items = [];
    try {
      for (const f of fs.readdirSync(this.dir)) {
        if (!f.endsWith('.json')) continue;
        const entry = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'));
        if (!entry.decision) items.push(entry);
      }
    } catch { /* empty */ }
    return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  /** Validate a review ID to prevent path traversal. */
  _sanitizeId(review_id) {
    if (typeof review_id !== 'string') return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(review_id)) return null;
    if (review_id.includes('..')) return null;
    return review_id;
  }

  /** Record a human decision on a held result. Returns the entry (with full_result if approved). */
  decide(review_id, decision, decided_by) {
    const safeId = this._sanitizeId(review_id);
    if (!safeId) return { error: 'invalid review ID', status: 400 };

    const file = path.join(this.dir, `${safeId}.json`);
    try {
      const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
      entry.decision = decision;
      entry.decided_by = decided_by;
      entry.decided_at = new Date().toISOString();
      fs.writeFileSync(file, JSON.stringify(entry, null, 2));
      return { ok: true, entry };
    } catch {
      return { error: 'review not found', status: 404 };
    }
  }
}
