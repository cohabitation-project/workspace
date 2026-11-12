/**
 * approvals.mjs — ADIN human commit approval system.
 *
 * Before any compute task runs code from a repository, a named human must approve the
 * exact commit SHA. This file stores and retrieves those approvals with file-based
 * persistence (JSON in dataDir), matching the pattern used by registry.mjs.
 *
 * An approval records: repo, commit SHA, approver name, timestamp, and optional notes.
 * Approvals can be revoked (e.g., if a commit is found to be problematic after approval).
 */

import fs from 'node:fs';
import path from 'node:path';

export class Approvals {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.approvals = new Map(); // "repo:commit" → approval record
    this._onRevoke = null; // callback: (repo, commit, reason) => void
    fs.mkdirSync(dataDir, { recursive: true });
    this._load();
  }

  /** Register a callback to be called when an approval is revoked. */
  onRevoke(fn) { this._onRevoke = fn; }

  _filePath() { return path.join(this.dataDir, 'approvals.json'); }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this._filePath(), 'utf8'));
      if (data.approvals) {
        for (const [key, val] of Object.entries(data.approvals)) {
          this.approvals.set(key, val);
        }
      }
    } catch { /* start fresh */ }
  }

  _save() {
    fs.writeFileSync(this._filePath(), JSON.stringify({
      approvals: Object.fromEntries(this.approvals),
      saved_at: new Date().toISOString(),
    }, null, 2));
  }

  _key(repo, commit) { return `${repo}:${commit}`; }

  /**
   * Record a human approval for a repo+commit pair.
   * @param {string} repo — e.g. "cohabitation-project/workspace"
   * @param {string} commit — 40-char hex SHA
   * @param {string} approver — name of the human approving
   * @param {string} [notes] — optional notes
   * @returns {{ ok: boolean, approval: object } | { error: string, status: number }}
   */
  approve(repo, commit, approver, notes) {
    if (!repo || typeof repo !== 'string') return { error: 'repo required', status: 400 };
    if (!commit || typeof commit !== 'string' || !/^[a-f0-9]{40}$/.test(commit)) {
      return { error: 'commit must be a 40-char hex SHA', status: 400 };
    }
    if (!approver || typeof approver !== 'string') return { error: 'approver name required', status: 400 };

    const key = this._key(repo, commit);
    const now = new Date().toISOString();
    const existing = this.approvals.get(key);
    const history = existing?.history || [];
    history.push({ action: 'approved', by: approver, at: now, notes: notes || null });

    const approval = {
      repo,
      commit,
      approver,
      notes: notes || null,
      approved_at: now,
      revoked: false,
      history,
    };
    this.approvals.set(key, approval);
    this._save();
    return { ok: true, approval };
  }

  /**
   * Check if a repo+commit pair has a valid (non-revoked) approval.
   * @returns {boolean}
   */
  isApproved(repo, commit) {
    const key = this._key(repo, commit);
    const entry = this.approvals.get(key);
    return !!(entry && !entry.revoked);
  }

  /**
   * List all approvals for a repo (including revoked ones).
   * @returns {Array}
   */
  listApprovals(repo) {
    const results = [];
    for (const [, entry] of this.approvals) {
      if (entry.repo === repo) results.push(entry);
    }
    return results.sort((a, b) => a.approved_at.localeCompare(b.approved_at));
  }

  /**
   * Revoke an existing approval.
   * @returns {{ ok: boolean } | { error: string, status: number }}
   */
  revokeApproval(repo, commit, reason) {
    const key = this._key(repo, commit);
    const entry = this.approvals.get(key);
    if (!entry) return { error: 'approval not found', status: 404 };

    const now = new Date().toISOString();
    if (!entry.history) entry.history = [];
    entry.history.push({ action: 'revoked', by: entry.approver, at: now, reason: reason || null });

    entry.revoked = true;
    entry.revoked_at = now;
    entry.revoke_reason = reason || null;
    this._save();
    if (this._onRevoke) this._onRevoke(repo, commit, reason);
    return { ok: true };
  }
}
