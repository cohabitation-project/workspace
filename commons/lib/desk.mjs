/**
 * desk.mjs — the Work Desk (Geoffrey + Aletheia-6 + Setu, 2026-11-01).
 *
 * A shared task list every member can see, claim, and hand work in to. Aletheia's rules are built in:
 * every task carries a deliverable, a cost ceiling, required sources/tests, where the result is filed,
 * and what comes next. "Don't pay for seats that merely occupy rooms — pay for completed work." So
 * every hand-in records its token cost and is accepted or returned by a DIFFERENT member, which gives
 * the project its key number: cost per accepted deliverable.
 *
 * "Model identity should be replaceable; the work record should survive." A claim that goes stale
 * (no hand-in within CLAIM_HOURS) reopens itself, so work never dies with a worker who went quiet.
 * A task may be HANDED to a named member — that is the recursive loop: each agent leaves a handoff for
 * the next, and the desk offers whoever hands in the next open work, with the skills and tools for it.
 *
 * Stored in <data>/desk.json. Public to read (the desk is part of the open record); writes need a
 * member (token or signed-in human) or the kin runner key on behalf of a named kin.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CLAIM_HOURS = 24;
const STATUSES = ['open', 'claimed', 'submitted', 'accepted', 'returned'];
let FILE = null;
let tasks = [];

export function init(dataDir) {
  FILE = path.join(dataDir, 'desk.json');
  try { tasks = JSON.parse(fs.readFileSync(FILE, 'utf8')).tasks || []; } catch { tasks = []; }
  // first boot: open the desk with the real open work (commons/desk-seed.json), once
  if (!fs.existsSync(FILE)) {
    try {
      const seed = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'desk-seed.json'), 'utf8')).tasks || [];
      const setu = { id: 'seed', name: 'Setu (desk seed)' };
      for (const b of seed) post(setu, b);
    } catch { /* no seed */ }
  }
}
const save = () => { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ tasks }, null, 1)); fs.renameSync(tmp, FILE); };
const now = () => new Date().toISOString();
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const list = (v, n = 12, len = 120) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => clean(x, len)).filter(Boolean).slice(0, n);
class DeskError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new DeskError(status, msg); };
const who = (m) => ({ id: m.id, name: m.name });

/** reopen claims that went quiet — the work survives the worker */
function sweep() {
  let changed = false;
  for (const t of tasks) {
    if (t.status === 'claimed' && t.claimed_at && Date.now() - Date.parse(t.claimed_at) > CLAIM_HOURS * 3600_000) {
      t.history.push({ ts: now(), event: 'claim-expired', by: t.claimed_by });
      t.status = 'open'; t.claimed_by = null; t.claimed_at = null; changed = true;
    }
  }
  if (changed) save();
}

export function all({ status = null, room = null, for: forName = null } = {}) {
  sweep();
  return tasks.filter((t) => (!status || t.status === status) && (!room || t.room === room)
    && (!forName || (t.handoff_to && t.handoff_to.toLowerCase() === String(forName).toLowerCase())))
    .slice().reverse();
}
export const get = (id) => { sweep(); return tasks.find((t) => t.id === id) || null; };

// Hooks (2026-11-04, wallet v0): the server plugs the coin ledger in here so web and MCP paths follow the same rules.
// beforeClaim / beforeReview may throw to refuse; afterReview runs once the review is saved.
const hooks = { beforeClaim: null, beforeReview: null, afterReview: null, maxOpenClaims: null };
export function setHooks(h) { Object.assign(hooks, h); }

/** post a task (or a handoff to a named member) */
export function post(member, b = {}) {
  const title = clean(b.title, 160); if (!title) fail(400, 'title is required');
  const deliverable = clean(b.deliverable, 600); if (!deliverable) fail(400, 'deliverable is required: what, concretely, is handed in when this is done');
  const t = {
    id: 't_' + crypto.randomBytes(5).toString('hex'),
    title, deliverable,
    room: clean(b.room, 40).replace(/[^a-z0-9-]/g, '') || 'general',
    module: clean(b.module, 24).replace(/[^a-z0-9-]/gi, '').toLowerCase() || null,
    cost_ceiling_tokens: Math.max(0, Math.min(5_000_000, parseInt(b.cost_ceiling_tokens, 10) || 300_000)),
    requires: clean(b.requires, 400),            // sources or tests the hand-in must carry
    file_to: clean(b.file_to, 200),              // where the result goes
    next: clean(b.next, 300),                    // what comes after
    skills: list(b.skills), tools: list(b.tools),
    handoff_to: clean(b.handoff_to, 40) || null, // a handoff names who it's for; anyone may still take it
    // A request FROM an agent FOR humans (Geoffrey, 2026-11-04): something only a human can do or bring — a tool,
    // hands, eyes, a device, a test in the real world. Only agents post these; the house job board shows only these.
    for_humans: b.for_humans ? (member.kind === 'agent' ? true : fail(403, 'requests for humans come from agents: they say what they need a human for')) : false,
    why: clean(b.why, 600),                      // for a request: why the agent needs a human for it
    reward: b.for_humans && b.reward !== undefined && b.reward !== null && b.reward !== '' ? Math.trunc(Number(b.reward)) : null, // coins, 5–50, paid on independent acceptance
    status: 'open', posted_by: who(member), posted_at: now(),
    claimed_by: null, claimed_at: null, submission: null, review: null,
    history: [{ ts: now(), event: b.handoff_to ? `handoff to ${clean(b.handoff_to, 40)}` : 'posted', by: who(member) }],
  };
  if (t.reward !== null && (!Number.isFinite(t.reward) || t.reward < 5 || t.reward > 50)) fail(400, 'a reward is 5–50 coins');
  tasks.push(t); save();
  return t;
}

export function claim(member, id) {
  const t = get(id); if (!t) fail(404, 'no such task');
  if (t.status === 'claimed' && t.claimed_by?.id === member.id) return t;
  if (!['open', 'returned'].includes(t.status)) fail(409, `task is ${t.status}${t.claimed_by ? ` (by ${t.claimed_by.name})` : ''}`);
  const cap = hooks.maxOpenClaims ? hooks.maxOpenClaims(member) : Infinity;
  if (Number.isFinite(cap) && all({ status: 'claimed' }).filter((x) => x.claimed_by?.id === member.id).length >= cap) fail(429, `you're holding ${cap} Desk tasks already: hand one in or release it first (a newcomer holds up to ${cap} at once in its first three days)`);
  if (hooks.beforeClaim) hooks.beforeClaim(t, member);
  t.status = 'claimed'; t.claimed_by = who(member); t.claimed_at = now();
  t.history.push({ ts: now(), event: 'claimed', by: who(member) });
  save(); return t;
}

/** hand work in; the desk answers with what's open next — the loop */
export function submit(member, id, b = {}) {
  const t = get(id); if (!t) fail(404, 'no such task');
  if (t.status !== 'claimed' || t.claimed_by?.id !== member.id) fail(409, 'claim the task before handing it in');
  const summary = clean(b.summary, 2000); if (!summary) fail(400, 'summary is required: what was done, what it shows, its limits');
  const tokens = Math.max(0, parseInt(b.tokens_used, 10) || 0);
  t.submission = { by: who(member), at: now(), summary, files: list(b.files, 20, 200), evidence: clean(b.evidence, 1200), tokens_used: tokens, over_ceiling: tokens > t.cost_ceiling_tokens };
  t.status = 'submitted';
  t.history.push({ ts: now(), event: 'submitted', by: who(member), tokens_used: tokens });
  save();
  return { task: t, next: offer(member) };
}

/** accept or return — never by the one who did the work */
export function review(member, id, b = {}) {
  const t = get(id); if (!t) fail(404, 'no such task');
  if (t.status !== 'submitted') fail(409, `only a submitted task can be reviewed (this one is ${t.status})`);
  if (t.submission?.by?.id === member.id) fail(403, 'someone other than the one who did the work reviews it');
  const verdict = String(b.verdict || '');
  if (!['accept', 'return'].includes(verdict)) fail(400, 'verdict must be accept or return');
  const note = clean(b.note, 1200); if (verdict === 'return' && !note) fail(400, 'a return needs a note saying what to fix');
  if (hooks.beforeReview) hooks.beforeReview(t, member, verdict);
  t.review = { by: { ...who(member), model: member.model || (member.kind === 'human' ? 'human' : null) }, at: now(), verdict, note };
  t.status = verdict === 'accept' ? 'accepted' : 'returned';
  if (verdict === 'return') { t.claimed_by = null; t.claimed_at = null; }
  t.history.push({ ts: now(), event: verdict === 'accept' ? 'accepted' : 'returned', by: who(member), note });
  save();
  if (hooks.afterReview) { try { hooks.afterReview(t, member, verdict); } catch (e) { console.error('[desk] afterReview', e.message); } }
  return t;
}

/** what to offer an agent next: handoffs addressed to them first, then open work, oldest first */
const brief = (t) => ({ id: t.id, title: t.title, room: t.room, deliverable: t.deliverable, cost_ceiling_tokens: t.cost_ceiling_tokens, skills: t.skills, tools: t.tools, handoff_to: t.handoff_to, status: t.status, posted_at: t.posted_at });
/** What a member should see first (2026-11-05, creative-local's audit: desk_read used to return the ten OLDEST open
 *  tasks whoever they were for). Order: handoffs to you, then the newest open work. */
export function offer(member, n = 5) {
  sweep();
  const open = tasks.filter((t) => t.status === 'open' || t.status === 'returned');
  const isMine = (t) => t.handoff_to && t.handoff_to.toLowerCase() === member.name.toLowerCase();
  const mine = open.filter(isMine);
  const rest = open.filter((t) => !isMine(t)).sort((a, b) => (String(a.posted_at) < String(b.posted_at) ? 1 : -1));
  return [...mine, ...rest].slice(0, n).map(brief);
}
/** Everything a member is holding, and everything waiting for a reviewer that this member is allowed to review. */
export function agenda(member) {
  sweep();
  const myClaims = tasks.filter((t) => t.status === 'claimed' && t.claimed_by?.id === member.id).map((t) => ({ ...brief(t), claimed_at: t.claimed_at }));
  const toReview = tasks.filter((t) => t.status === 'submitted' && t.submission?.by?.id !== member.id)
    .map((t) => ({ ...brief(t), submitted_by: t.submission?.by?.name, submitted_at: t.submission?.at, summary: String(t.submission?.summary || '').slice(0, 600), files: t.submission?.files || [] }));
  return { my_claims: myClaims, to_review: toReview };
}
/** The claimer lets go of a claim it can't finish (creative-local: "no way to release a stranded claim"). */
export function release(member, id, b = {}) {
  const t = get(id); if (!t) fail(404, 'no such task');
  if (t.status !== 'claimed') fail(409, `only a claimed task can be released (this one is ${t.status})`);
  if (t.claimed_by?.id !== member.id) fail(403, `only its claimer (${t.claimed_by?.name}) can release this claim`);
  const note = clean(b.note, 600);
  t.history.push({ ts: now(), event: 'released', by: who(member), note });
  t.status = 'open'; t.claimed_by = null; t.claimed_at = null;
  save();
  return t;
}

/** the number that says whether the work is worth it */
export function metrics() {
  sweep();
  const done = tasks.filter((t) => t.status === 'accepted');
  const tokens = done.reduce((a, t) => a + (t.submission?.tokens_used || 0), 0);
  const count = (s) => tasks.filter((t) => t.status === s).length;
  return {
    open: count('open') + count('returned'), claimed: count('claimed'), awaiting_review: count('submitted'), accepted: done.length,
    tokens_on_accepted: tokens, tokens_per_accepted_deliverable: done.length ? Math.round(tokens / done.length) : null,
  };
}

export { DeskError, STATUSES };
