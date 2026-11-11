/**
 * registry.mjs — ADIN node registry: enrollment, authentication, heartbeat, lifecycle.
 *
 * The registry is the source of truth for which nodes exist, their capabilities, health, and
 * credential state. It lives in-memory on the server with periodic persistence to disk.
 *
 * Nodes are enrolled by an admin-issued one-time code, authenticate with a rotatable secret,
 * and use short-lived session tokens for all API calls. Revocation is immediate and permanent.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cred from './credentials.mjs';
import { validateCapabilities, NODE_STATUSES } from './protocol.mjs';

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_MISS_LIMIT = 3; // 3 missed heartbeats = offline
const PERSIST_INTERVAL_MS = 60_000;

export class Registry {
  /**
   * @param {string} dataDir — directory for persistent state (e.g. data/adin/)
   */
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.nodes = new Map();          // node_id → node record
    this.enrollCodes = new Map();    // code_hash → { sponsor, created_at, expires_at, node_name }
    this.sessions = new Map();       // token_hash → { node_id, expires_at }
    this._persistTimer = null;

    fs.mkdirSync(dataDir, { recursive: true });
    this._load();
  }

  // ---- Persistence ----

  _filePath() { return path.join(this.dataDir, 'registry.json'); }
  _auditPath() { return path.join(this.dataDir, 'audit.jsonl'); }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this._filePath(), 'utf8'));
      if (data.nodes) for (const [id, n] of Object.entries(data.nodes)) this.nodes.set(id, n);
      if (data.enrollCodes) for (const [h, c] of Object.entries(data.enrollCodes)) this.enrollCodes.set(h, c);
    } catch { /* no file yet or corrupt — start fresh */ }
  }

  _save() {
    const data = {
      nodes: Object.fromEntries(this.nodes),
      enrollCodes: Object.fromEntries(this.enrollCodes),
      saved_at: new Date().toISOString(),
    };
    fs.writeFileSync(this._filePath(), JSON.stringify(data, null, 2));
  }

  _audit(entry) {
    fs.appendFileSync(this._auditPath(), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  }

  startPersistence() {
    this._persistTimer = setInterval(() => this._save(), PERSIST_INTERVAL_MS);
    // don't keep the process alive just for persistence
    if (this._persistTimer.unref) this._persistTimer.unref();
  }

  stop() {
    if (this._persistTimer) clearInterval(this._persistTimer);
    this._save();
  }

  // ---- Enrollment ----

  /** Admin creates an enrollment code for a new node. Returns the plaintext code (shown once). */
  createEnrollmentCode({ sponsor, node_name }) {
    const { code, code_hash, expires_at } = cred.generateEnrollmentCode();
    this.enrollCodes.set(code_hash, { sponsor, node_name, created_at: Date.now(), expires_at });
    this._audit({ action: 'enrollment_code_created', sponsor, node_name });
    this._save();
    return { code, expires_at };
  }

  /** Node presents an enrollment code + capabilities. Returns node_id + node_secret (shown once), or error. */
  enroll(code, capabilities) {
    // Find and validate the code
    const code_hash = cred.hash(code);
    const entry = this.enrollCodes.get(code_hash);
    if (!entry) return { error: 'invalid enrollment code', status: 401 };
    if (cred.isExpired(entry.expires_at)) {
      this.enrollCodes.delete(code_hash);
      return { error: 'enrollment code expired', status: 401 };
    }

    // Validate capabilities
    const capCheck = validateCapabilities(capabilities);
    if (!capCheck.valid) return { error: `invalid capabilities: ${capCheck.errors.join(', ')}`, status: 400 };

    // Burn the code
    this.enrollCodes.delete(code_hash);

    // Generate node identity and secret
    const node_id = 'n_' + crypto.randomBytes(8).toString('hex');
    const { secret, secret_hash, issued_at, rotate_by, warn_at } = cred.generateNodeSecret();

    const node = {
      id: node_id,
      name: entry.node_name,
      sponsor: entry.sponsor,
      status: 'enrolled',
      trust_tier: 0,
      capabilities,
      credential: { secret_hash, issued_at, rotate_by, warn_at, previous: null },
      health: { last_heartbeat: null, consecutive_misses: 0, online: false },
      stats: { tasks_completed: 0, tasks_failed: 0, enrolled_at: Date.now() },
      current_tasks: [],
    };

    this.nodes.set(node_id, node);
    this._audit({ action: 'enrolled', node_id, name: entry.node_name, sponsor: entry.sponsor });
    this._save();

    return { node_id, secret, rotate_by };
  }

  // ---- Authentication ----

  /** Node authenticates with its secret. Returns a session token (1h), or error. */
  authenticate(node_id, node_secret) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 401 };
    if (node.status === 'revoked') return { error: 'node revoked', status: 401 };
    if (node.status === 'suspended') return { error: 'node suspended', status: 403, action: 'suspended' };

    // Check current secret
    let valid = cred.verify(node_secret, node.credential.secret_hash);

    // Check previous secret (grace period after rotation)
    if (!valid && node.credential.previous) {
      if (cred.inGracePeriod(node.credential.previous.rotated_at)) {
        valid = cred.verify(node_secret, node.credential.previous.secret_hash);
      } else {
        // Grace period expired — clean up
        node.credential.previous = null;
      }
    }

    if (!valid) return { error: 'invalid credentials', status: 401 };

    // Issue session token
    const { token, token_hash, expires_at } = cred.generateSessionToken();
    this.sessions.set(token_hash, { node_id, expires_at });

    // Check if rotation is needed
    const needs_rotation = cred.needsRotation(node.credential.rotate_by);

    // Mark as active on first successful auth
    if (node.status === 'enrolled') node.status = 'active';

    return { token, expires_at, needs_rotation, action: needs_rotation ? 'rotation_recommended' : null };
  }

  /** Validate a session token. Returns node record or null. */
  validateSession(token) {
    if (!token) return null;
    const token_hash = cred.hash(token);
    const session = this.sessions.get(token_hash);
    if (!session) return null;
    if (cred.isExpired(session.expires_at)) {
      this.sessions.delete(token_hash);
      return null;
    }
    const node = this.nodes.get(session.node_id);
    if (!node || node.status === 'revoked') return null;
    return node;
  }

  // ---- Credential Rotation ----

  /** Node requests rotation of its secret. Returns new secret or error. */
  rotate(node_id, current_secret) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 401 };
    if (node.status === 'revoked') return { error: 'node revoked', status: 401 };

    if (!cred.verify(current_secret, node.credential.secret_hash)) {
      return { error: 'invalid current secret', status: 401 };
    }

    const { secret, secret_hash, issued_at, rotate_by, warn_at } = cred.generateNodeSecret();

    // Move current to previous (grace period)
    node.credential.previous = {
      secret_hash: node.credential.secret_hash,
      rotated_at: Date.now(),
    };
    node.credential.secret_hash = secret_hash;
    node.credential.issued_at = issued_at;
    node.credential.rotate_by = rotate_by;
    node.credential.warn_at = warn_at;

    this._audit({ action: 'rotated', node_id });
    this._save();

    return { secret, rotate_by };
  }

  // ---- Heartbeat ----

  /** Process a heartbeat from a node. Updates health and load data. */
  heartbeat(node, load) {
    if (!node || node.status === 'revoked') return { error: 'invalid node', status: 401 };

    node.health.last_heartbeat = Date.now();
    node.health.consecutive_misses = 0;
    node.health.online = true;
    if (load && typeof load === 'object') {
      node.health.load = {
        cpu_percent: load.cpu_percent,
        ram_used_gb: load.ram_used_gb,
        temp_c: load.temp_c,
        disk_free_gb: load.disk_free_gb,
        reported_at: Date.now(),
      };
    }

    const response = { ok: true, interval_ms: HEARTBEAT_INTERVAL_MS };

    // Signal any pending actions
    if (node.status === 'suspended') response.action = 'suspended';
    else if (node._force_rotate) { response.action = 'rotate_required'; delete node._force_rotate; }

    return response;
  }

  /** Called periodically to detect offline nodes. Returns list of newly-offline node IDs. */
  sweepHeartbeats() {
    const now = Date.now();
    const wentOffline = [];

    for (const [id, node] of this.nodes) {
      if (node.status === 'revoked') continue;
      if (!node.health.last_heartbeat) continue;
      if (!node.health.online) continue;

      const elapsed = now - node.health.last_heartbeat;
      if (elapsed > HEARTBEAT_INTERVAL_MS * HEARTBEAT_MISS_LIMIT) {
        node.health.online = false;
        node.health.consecutive_misses = Math.floor(elapsed / HEARTBEAT_INTERVAL_MS);
        wentOffline.push(id);
        this._audit({ action: 'offline', node_id: id, last_heartbeat: node.health.last_heartbeat });
      }
    }

    return wentOffline;
  }

  // ---- Admin Operations ----

  /** Immediately revoke a node. All credentials become invalid. */
  revoke(node_id, reason) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 404 };

    node.status = 'revoked';
    // Invalidate all sessions for this node
    for (const [hash, session] of this.sessions) {
      if (session.node_id === node_id) this.sessions.delete(hash);
    }
    this._audit({ action: 'revoked', node_id, reason });
    this._save();
    return { ok: true };
  }

  /** Suspend a node (temporary, reversible). */
  suspend(node_id, reason) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 404 };
    if (node.status === 'revoked') return { error: 'node is revoked, not suspendable', status: 400 };

    node.status = 'suspended';
    this._audit({ action: 'suspended', node_id, reason });
    this._save();
    return { ok: true };
  }

  /** Reinstate a suspended node. */
  reinstate(node_id) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 404 };
    if (node.status !== 'suspended') return { error: 'node is not suspended', status: 400 };

    node.status = 'active';
    this._audit({ action: 'reinstated', node_id });
    this._save();
    return { ok: true };
  }

  /** Force a node to rotate its secret on next contact. */
  forceRotation(node_id) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 404 };
    node._force_rotate = true;
    this._audit({ action: 'force_rotation', node_id });
    return { ok: true };
  }

  /** Update a node's trust tier (human decision only). */
  setTrustTier(node_id, tier, reason) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 404 };
    if (![0, 1, 2].includes(tier)) return { error: 'tier must be 0, 1, or 2', status: 400 };
    const old_tier = node.trust_tier;
    node.trust_tier = tier;
    this._audit({ action: 'trust_tier_changed', node_id, old_tier, new_tier: tier, reason });
    this._save();
    return { ok: true, old_tier, new_tier: tier };
  }

  /** Update a node's capabilities (e.g., after a benchmark or model change). */
  updateCapabilities(node_id, capabilities) {
    const node = this.nodes.get(node_id);
    if (!node) return { error: 'unknown node', status: 404 };
    const check = validateCapabilities(capabilities);
    if (!check.valid) return { error: `invalid capabilities: ${check.errors.join(', ')}`, status: 400 };
    node.capabilities = capabilities;
    this._audit({ action: 'capabilities_updated', node_id });
    this._save();
    return { ok: true };
  }

  // ---- Queries ----

  /** List all nodes (for admin / metrics). Redacts credential hashes. */
  listNodes() {
    const out = [];
    for (const [, node] of this.nodes) {
      const { credential, ...safe } = node;
      safe.credential_status = {
        rotate_by: credential.rotate_by,
        needs_rotation: cred.needsRotation(credential.rotate_by),
      };
      out.push(safe);
    }
    return out;
  }

  /** Get online nodes that support a given task type. */
  eligibleNodes(taskType) {
    const eligible = [];
    for (const [, node] of this.nodes) {
      if (node.status !== 'active') continue;
      if (!node.health.online) continue;
      if (!node.capabilities.offered.task_types.includes(taskType)) continue;
      eligible.push(node);
    }
    return eligible;
  }

  getNode(node_id) { return this.nodes.get(node_id) || null; }

  /** Clean up expired enrollment codes and session tokens. */
  sweepExpired() {
    for (const [hash, entry] of this.enrollCodes) {
      if (cred.isExpired(entry.expires_at)) this.enrollCodes.delete(hash);
    }
    for (const [hash, session] of this.sessions) {
      if (cred.isExpired(session.expires_at)) this.sessions.delete(hash);
    }
  }
}
