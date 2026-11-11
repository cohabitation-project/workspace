/**
 * credentials.mjs — ADIN credential lifecycle: enrollment codes, node secrets, session tokens.
 *
 * Three-credential model:
 *   1. Enrollment code (one-time, 24h expiry) — issued by admin, burned on use
 *   2. Node secret (90-day lifetime, rotatable) — stored hashed server-side, plaintext on node only
 *   3. Session token (1-hour lifetime, in-memory only) — used for all API calls
 *
 * All secrets are generated with crypto.randomBytes and stored as sha256 hashes.
 * Plaintext is shown/returned exactly once, never logged, never stored on the server.
 */

import crypto from 'node:crypto';

const ENROLL_CODE_PREFIX  = 'adin_enroll_';
const NODE_SECRET_PREFIX  = 'adin_ns_';
const SESSION_TOKEN_PREFIX = 'adin_st_';

const ENROLL_EXPIRY_MS       = 24 * 60 * 60 * 1000;       // 24 hours
const NODE_SECRET_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const ROTATION_WARN_MS       = 7 * 24 * 60 * 60 * 1000;   // warn 7 days before expiry
const ROTATION_GRACE_MS      = 5 * 60 * 1000;              // old secret valid 5 min after rotation
const SESSION_EXPIRY_MS      = 60 * 60 * 1000;             // 1 hour

export { ENROLL_EXPIRY_MS, NODE_SECRET_LIFETIME_MS, ROTATION_WARN_MS, ROTATION_GRACE_MS, SESSION_EXPIRY_MS };

// ---- Generation ----

function generate(prefix, bytes) {
  const raw = crypto.randomBytes(bytes).toString('base64url');
  return `${prefix}${raw}`;
}

export const hash = (secret) => crypto.createHash('sha256').update(secret).digest('hex');

export function generateEnrollmentCode() {
  const code = generate(ENROLL_CODE_PREFIX, 48);
  return {
    code,              // give to the node operator (shown once)
    code_hash: hash(code),
    expires_at: Date.now() + ENROLL_EXPIRY_MS,
  };
}

export function generateNodeSecret() {
  const secret = generate(NODE_SECRET_PREFIX, 48);
  const now = Date.now();
  return {
    secret,            // returned to the node (shown once)
    secret_hash: hash(secret),
    issued_at: now,
    rotate_by: now + NODE_SECRET_LIFETIME_MS,
    warn_at: now + NODE_SECRET_LIFETIME_MS - ROTATION_WARN_MS,
  };
}

export function generateSessionToken() {
  const token = generate(SESSION_TOKEN_PREFIX, 32);
  return {
    token,             // returned to the node (in-memory only, never written to disk)
    token_hash: hash(token),
    expires_at: Date.now() + SESSION_EXPIRY_MS,
  };
}

// ---- Validation ----

/** Verify a secret against its stored hash. Constant-time comparison. */
export function verify(secret, stored_hash) {
  if (typeof secret !== 'string' || typeof stored_hash !== 'string') return false;
  const computed = hash(secret);
  if (computed.length !== stored_hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(stored_hash, 'hex'));
}

/** Check if a credential has expired. */
export function isExpired(expires_at) {
  return Date.now() > expires_at;
}

/** Check if a node secret is within its rotation warning period. */
export function needsRotation(rotate_by) {
  return Date.now() > (rotate_by - ROTATION_WARN_MS);
}

/** Check if an old secret is still within the grace period after rotation. */
export function inGracePeriod(rotated_at) {
  return Date.now() < (rotated_at + ROTATION_GRACE_MS);
}
