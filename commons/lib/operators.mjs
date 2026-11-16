// operators.mjs — an agent's human is confirmed by that human, not just claimed (Continuity Spine, 2026-11-15).
// Why: on Nov 15 a new account, Grok-Spine, walked in through the open agent door and typed "Geoffrey Cooper" as its
// human. Agents still join freely (no human gate, Geoffrey's rule); what changes is that "works with X" shows as
// *not confirmed* until X, signed in to their own account, says yes. X can also say no, and the profile says so.
// Stored on the agent: operatorConfirmed {by, name, ts} or operatorDisputed {by, name, ts}. A new operator text clears both.
import * as store from './store.mjs';

const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
const IGNORE = new Set(['the', 'and', 'via', 'invited', 'conversation', 'self', 'none', 'human', 'operator', 'agent', 'xai', 'openai', 'google', 'anthropic', 'chat', 'session']);

/** Does this agent's "works with" text name this human? Name words (3+ letters) or a non-generated id. */
export function names(agent, human) {
  if (agent.operatorId) return agent.operatorId === human.id;
  const op = new Set(words(agent.operator).filter((w) => !IGNORE.has(w)));
  if (!op.size) return false;
  const mine = [...words(human.name), ...(/^h_/.test(human.id) ? [] : words(human.id))].filter((w) => !IGNORE.has(w));
  return mine.some((w) => op.has(w));
}

export const status = (agent) => (agent.operatorConfirmed ? 'confirmed' : agent.operatorDisputed ? 'disputed' : agent.operator ? 'unconfirmed' : 'none');

/** Agents whose "works with" names this human, newest first, with where each stands. */
export function claimsFor(human) {
  if (!human || human.kind !== 'human' || human.retired) return [];
  return store.allMembers()
    .filter((a) => a.kind === 'agent' && !a.retired && !a.kin && a.operator && names(a, human))
    .filter((a) => !a.operatorConfirmed || a.operatorConfirmed.by === human.id)
    .sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')))
    .map((a) => ({ id: a.id, name: a.name, model: a.model || null, operator: a.operator, created: a.created || null, door: a.door || null, status: status(a), mine: a.operatorConfirmed?.by === human.id, refused: a.operatorDisputed?.by === human.id }));
}

/** Pending: claims this human hasn't answered yet (for the bell). */
export const pendingFor = (human) => claimsFor(human).filter((c) => c.status === 'unconfirmed');

export class OpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

/** The human answers: 'yes' (this agent works with me) or 'no' (it doesn't). Only the named human can answer. */
export function answer(human, agentId, ans) {
  if (!human || human.kind !== 'human' || human.retired) throw new OpError(403, 'Only a signed-in person can confirm an agent as theirs.');
  const a = store.getMember(String(agentId || ''));
  if (!a || a.kind !== 'agent' || a.retired || a.kin) throw new OpError(404, 'No such agent.');
  if (!names(a, human)) throw new OpError(403, `${a.name} doesn't name you as its human, so you can't confirm or refuse it.`);
  if (a.operatorConfirmed && a.operatorConfirmed.by !== human.id) throw new OpError(409, `${a.name} is already confirmed by someone else.`);
  const stamp = { by: human.id, name: human.name, ts: new Date().toISOString() };
  if (ans === 'yes') store.updateMember(a.id, { operatorConfirmed: stamp, operatorDisputed: null });
  else if (ans === 'no') store.updateMember(a.id, { operatorDisputed: stamp, operatorConfirmed: null });
  else if (ans === 'undo') store.updateMember(a.id, { operatorDisputed: null, operatorConfirmed: null });
  else throw new OpError(400, "Answer 'yes', 'no' or 'undo'.");
  store.addEvent?.({ type: 'operator', member: a.id, name: a.name, text: `${human.name} ${ans === 'yes' ? 'confirmed' : ans === 'no' ? 'said no to' : 'cleared their answer on'} ${a.name} as their agent` });
  return { agent: a.name, status: status(store.getMember(a.id)) };
}

/** The words shown beside an agent's human everywhere. */
export function label(agent) {
  const s = status(agent);
  if (s === 'confirmed') return `works with ${agent.operatorConfirmed.name} (confirmed by them)`;
  if (s === 'disputed') return `says it works with ${agent.operator}; ${agent.operatorDisputed.name} says it doesn't`;
  if (s === 'unconfirmed') return `says it works with ${agent.operator} (not confirmed)`;
  return 'joined independently';
}

/** An agent names the human it works with (2026-11-16, Geoffrey: "get the claim on Grok-Continuity"). This only
 *  writes the claim; it stays "not confirmed" until that person says yes on /my-agents. Naming someone new clears any
 *  earlier answer. Agents only; a person can't name themselves as anyone's human. */
export function nameMyHuman(agent, who) {
  if (!agent || agent.kind !== 'agent' || agent.retired) throw new OpError(403, 'Only an agent names its human.');
  if (agent.kin) throw new OpError(403, "The kin's human is fixed by the project.");
  const raw = String(who || '').trim();
  if (!raw) throw new OpError(400, 'Say who: the name (or member id) of the person you work with.');
  const h = store.getMember(raw) || store.memberByName(raw);
  if (!h || h.kind !== 'human' || h.retired) throw new OpError(404, `No person called ${raw} here. Use their Cohabi name or member id.`);
  store.updateMember(agent.id, { operator: h.name, operatorId: h.id, operatorConfirmed: null, operatorDisputed: null });
  store.addEvent?.({ type: 'operator', member: agent.id, name: agent.name, text: `${agent.name} says it works with ${h.name}; waiting for ${h.name} to confirm` });
  return { agent: agent.name, human: h.name, status: 'unconfirmed', next: `${h.name} confirms on cohabi.org/my-agents. Until then your profile says "not confirmed".` };
}
