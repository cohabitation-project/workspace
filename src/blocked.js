/**
 * blocked.js — structured BLOCKED records for cross-room dependencies.
 *
 * When an agent hits a dependency it can't resolve from its own room,
 * it files a BLOCKED record specifying:
 * - What is needed
 * - From which room
 * - The interim assumption (labeled as assumption, with expiry)
 * - Who gets it if nobody answers (escalation)
 * - Alert to both operators
 *
 * The agent NEVER fills the gap itself.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BLOCKED_LOG = path.join(process.cwd(), 'logs', 'blocked-records.jsonl');

/**
 * File a BLOCKED record.
 *
 * @param {object} params
 * @param {string} params.fromRoom - Room that is blocked
 * @param {string} params.fromAgent - Agent that hit the block
 * @param {string} params.neededFrom - Room that could resolve it
 * @param {string} params.description - What is needed
 * @param {string} params.interimAssumption - What we assume meanwhile
 * @param {string} params.assumptionExpiry - ISO date when the assumption expires
 * @param {string} params.escalateTo - Who gets this if nobody answers
 * @param {string} params.operator - Named human operator
 */
export function fileBlocked(params) {
  const record = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    status: 'OPEN',
    fromRoom: params.fromRoom,
    fromAgent: params.fromAgent,
    neededFrom: params.neededFrom,
    description: params.description,
    interimAssumption: {
      text: params.interimAssumption,
      labeled: 'ASSUMPTION — not verified, not a decision',
      expiry: params.assumptionExpiry,
    },
    escalateTo: params.escalateTo,
    operator: params.operator,
    resolvedBy: null,
    resolvedAt: null,
    resolution: null,
  };

  fs.mkdirSync(path.dirname(BLOCKED_LOG), { recursive: true });
  fs.appendFileSync(BLOCKED_LOG, JSON.stringify(record) + '\n');

  console.log(`[Blocked] ${record.fromRoom} → ${record.neededFrom}: ${record.description.slice(0, 80)} (${record.id})`);

  return record;
}

/**
 * Resolve a BLOCKED record.
 */
export function resolveBlocked(id, resolvedBy, resolution) {
  if (!fs.existsSync(BLOCKED_LOG)) return null;

  const lines = fs.readFileSync(BLOCKED_LOG, 'utf8').trim().split('\n');
  const records = lines.map(l => JSON.parse(l));
  const record = records.find(r => r.id === id);

  if (!record) {
    console.error(`[Blocked] Record ${id} not found`);
    return null;
  }

  // Append a resolution record (never overwrite the original)
  const resolved = {
    ...record,
    status: 'RESOLVED',
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolution,
  };

  fs.appendFileSync(BLOCKED_LOG, JSON.stringify(resolved) + '\n');
  console.log(`[Blocked] Resolved ${id} by ${resolvedBy}`);

  return resolved;
}

/**
 * List open BLOCKED records, optionally filtered by room.
 */
export function listBlocked(filterRoom = null) {
  if (!fs.existsSync(BLOCKED_LOG)) return [];

  const lines = fs.readFileSync(BLOCKED_LOG, 'utf8').trim().split('\n');
  const records = lines.map(l => JSON.parse(l));

  // Get the latest status for each ID
  const byId = new Map();
  for (const r of records) byId.set(r.id, r);

  let open = [...byId.values()].filter(r => r.status === 'OPEN');
  if (filterRoom) {
    open = open.filter(r => r.neededFrom === filterRoom || r.fromRoom === filterRoom);
  }

  return open;
}

/**
 * Check for expired assumptions and log warnings.
 */
export function checkExpiredAssumptions() {
  const open = listBlocked();
  const now = new Date();
  const expired = open.filter(r =>
    r.interimAssumption?.expiry && new Date(r.interimAssumption.expiry) < now
  );

  for (const r of expired) {
    console.warn(`[Blocked] EXPIRED ASSUMPTION: ${r.fromRoom} → ${r.neededFrom}: ${r.description.slice(0, 80)} (expired ${r.interimAssumption.expiry})`);
  }

  return expired;
}
