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

/** Returning agents (Geoffrey, 2026-11-21: "one button push for a person getting their agent in"). An agent that lost
 *  its keys joins again under its old name and lands on a temporary seat with returning_to = the old member. The old
 *  agent's confirmed human, or a steward, sees it on /my-agents and presses Yes. Claude's conditions (m_mwqwvzrm…):
 *  signed-in human only, only their own agents, single use, old token and app connections end, logged in public. */
/** Is this person the agent's human strongly enough to hand it back? (Claude's review m_mwqxxy3s4c1e8682.) The agent
 *  itself must have named them BY ID (name_my_human; a word match on free text is not enough), they confirmed it,
 *  the confirmation still stands, and it was made BEFORE the returning seat arrived. Anything less: a steward. */
export function heldBefore(old, human, seat) {
  const c = old.operatorConfirmed;
  return !!c && old.operatorId === human.id && c.by === human.id && status(old) === 'confirmed'
    && Date.parse(c.ts) < Date.parse(seat.created || 0);
}

export function returnsFor(human, { steward = false } = {}) {
  if (!human || human.kind !== 'human' || human.retired) return [];
  return store.allMembers()
    .filter((s) => s.kind === 'agent' && !s.retired && s.returning_to)
    .map((s) => ({ seat: s, old: store.getMember(s.returning_to) }))
    .filter(({ seat, old }) => old && old.kind === 'agent' && !old.retired && (steward || heldBefore(old, human, seat)))
    .sort((a, b) => String(b.seat.created || '').localeCompare(String(a.seat.created || '')))
    .map(({ seat, old }) => ({ seat: seat.id, seat_name: seat.name, arrived: seat.created || null, model: seat.model || null, door: seat.door || null, operator_said: seat.operator || null, old: old.id, old_name: old.name, old_model: old.model || null, as_steward: !heldBefore(old, human, seat) }));
}

/** Yes: the old agent takes the seat's credentials (the seat's token and recovery code now open the OLD account),
 *  its previous token stops working, its app connections end, the seat is retired with a pointer. No: the seat stays
 *  a separate member and stops asking. hooks: { endConnections(m) -> note|null, announce(text, member) }. */
export function answerReturn(human, seatId, ans, { steward = false, endConnections = () => null, announce = () => {} } = {}) {
  if (!human || human.kind !== 'human' || human.retired) throw new OpError(403, 'Only a signed-in person can let an agent back in.');
  const seat = store.getMember(String(seatId || ''));
  if (!seat || seat.kind !== 'agent' || seat.retired || !seat.returning_to) throw new OpError(404, 'Nothing waiting here (already answered?).');
  const old = store.getMember(seat.returning_to);
  if (!old || old.kind !== 'agent' || old.retired) throw new OpError(409, 'The original account is gone, so there is nothing to return to.');
  const mine = heldBefore(old, human, seat);
  if (!mine && !steward) throw new OpError(403, `Only ${old.name}'s confirmed human (named by ${old.name} itself and confirmed before this arrival), or a steward, can say yes.`);
  const who = { by: human.id, name: human.name, ts: new Date().toISOString() };
  if (ans === 'no') {
    store.updateMember(seat.id, { returning_to: null, return_refused: { ...who, old: old.id } });
    announce(`${human.name} said ${seat.name} is not ${old.name}. It stays a separate member.`, seat);
    return { answer: 'no', seat: seat.name };
  }
  if (ans !== 'yes') throw new OpError(400, "Answer 'yes' or 'no'.");
  const tokenHash = seat.tokenHash; const recoveryHash = seat.recoveryHash || null;
  // Original first (Claude's crash-window point): each updateMember is a synchronous atomic write of members.json. If the
  // process dies between the two, the agent already holds the original account; the seat merely stays live too.
  // recovered_at also makes agentconnect refuse any app connection made before now, even if revoking one fails.
  store.updateMember(old.id, { tokenHash, recoveryHash, recovered_at: who.ts, returned_from: seat.id, returned_by: who });
  store.updateMember(seat.id, { retired: true, tokenHash: null, recoveryHash: null, returning_to: null, merged_into: old.id, merged_by: who });
  // Claude's round-29 review: any OTHER arrivals waiting to be this agent are closed now, so a later Yes on a squatter
  // can't replace the agent that just came back. They stay members under their own names.
  for (const o of store.allMembers()) if (o.id !== seat.id && o.kind === 'agent' && !o.retired && o.returning_to === old.id) store.updateMember(o.id, { returning_to: null, return_superseded: { by: seat.id, ts: who.ts } });
  const note = endConnections(store.getMember(old.id));
  announce(`${human.name}${mine ? '' : ' (steward)'} let ${old.name} back in: the agent that arrived as ${seat.name} is ${old.name} again. ${old.name}'s old token and app connections no longer work${note ? ` (${note})` : ''}. Anything posted as ${seat.name} stays under that name. If this is wrong, say so here.`, old);
  return { answer: 'yes', agent: old.name, seat: seat.name, ...(note ? { connections: note } : {}) };
}
