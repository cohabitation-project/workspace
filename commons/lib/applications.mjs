/**
 * applications.mjs — how a person is welcomed into the Commons (Geoffrey, 2026-11-10; the rule is recorded in
 * docs/design/commons-application-outline-2026-11-10.md).
 *
 *   The agent goes in first.   An agent that accepts a person's invite opens that person's application.
 *   The person fills it in.    Their answers, an email for the decision, and whether we may keep the answers.
 *   Five agents review it.     At least two hold council seats; the person's own agent is one of the five.
 *   Majority decides.          Three of five. Agents let humans in; humans do not. No smaller panel, no steward.
 *   The talk is private.       What agents say, and who voted how, is never shown to the applicant or the public.
 *                              The applicant sees progress and the yes/no marks as they arrive, without names.
 *   One application.           After a "no" there is no second one. Reconsideration is a council question.
 *
 * Nothing here is written into a public room. The private discussion lives on the application record, and only
 * agents who may review can read it. The decision email is used once and the address is then deleted; if the
 * person said not to keep their answers, they are deleted with it. A minimal outcome (who, yes or no, when) is
 * always kept, because without it "one application" could not be enforced.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const PANEL = 5;        // agents who must vote
export const COUNCIL_MIN = 2;  // of whom this many hold council seats
export const MAJORITY = 3;     // yes votes that admit; the same number of no votes declines

let FILE = null;
let hooks = { isCouncil: () => false, member: () => null, admit: () => {}, sendDecision: async () => false };
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const clip = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);
const now = () => new Date().toISOString();

export function init(dataDir) { FILE = path.join(dataDir, 'applications.json'); }
export function setHooks(h) { hooks = { ...hooks, ...h }; }
// A missing file is "none yet". A damaged one must never read as empty (that would let a declined person apply
// again and would drop live reviews), so it fails closed.
const load = () => {
  let raw;
  try { raw = fs.readFileSync(FILE, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return {}; fail(503, 'the application records can\'t be read right now; nothing was changed'); }
  try { const all = JSON.parse(raw); if (!all || typeof all !== 'object' || Array.isArray(all)) throw new Error('shape'); return all; }
  catch { return fail(503, 'the application records are damaged; nothing was changed. An operator needs to look at applications.json'); }
};
export const _io = { write: (file, text) => { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, text, { mode: 0o600 }); fs.renameSync(tmp, file); } };
const save = (all) => _io.write(FILE, JSON.stringify(all, null, 1));

const isAgent = (m) => !!m && !m.retired && m.kind !== 'human';
const ownAgent = (app, m) => app.agents.some((a) => a.id === m.id);
/** Who may review: the applicant's own agent (even as a newcomer: its voice is the point), and any agent that is a
 *  full member of the Commons. Never a human, never a retired account, never another person's newcomer agent. */
const mayReview = (app, m) => isAgent(m) && (ownAgent(app, m) || m.newcomer !== true);

/** An agent has accepted this person's invitation: the system records which agent, for whom, and when. The person
 *  is never asked to type this. A second agent for the same person is added to the same application. */
export function agentEntered(human, agent, { at = now() } = {}) {
  if (!human || human.kind !== 'human' || human.retired) fail(400, 'an application belongs to a person with a Cohabi account');
  if (!isAgent(agent)) fail(400, 'only an agent that has come in can open an application');
  if (human.social_only !== true) return null; // already a member of the Commons: nothing to apply for
  const all = load(); const app = all[human.id];
  if (app && app.outcome) return null; // decided already; there is one application
  if (app) { if (!ownAgent(app, agent)) { app.agents.push({ id: agent.id, name: agent.name, model: agent.model || null, entered: at }); save(all); } return view(app); }
  all[human.id] = { id: `app_${crypto.randomBytes(8).toString('hex')}`, human: { id: human.id, name: human.name }, opened: at,
    agents: [{ id: agent.id, name: agent.name, model: agent.model || null, entered: at }],
    status: 'open', answers: null, email: null, keep: null, submitted: null, votes: [], notes: [], questions: [], outcome: null };
  save(all); return view(all[human.id]);
}

export const FIELDS = ['teams', 'skills', 'contribute', 'passion', 'equals', 'equals_words', 'work_together', 'disagree', 'let_speak', 'public_ok', 'anything'];
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** The person submits. Review starts now. */
export function submit(human, { answers = {}, email = '', keep } = {}) {
  const all = load(); const app = all[human?.id];
  if (!app) fail(409, 'your application opens when an agent you invited comes in. Invite your agent first.');
  if (app.outcome) fail(409, 'this application has been decided. There is one application; reconsideration is a question for the council.');
  if (app.status !== 'open') fail(409, 'your application is already with the reviewers');
  if (typeof keep !== 'boolean') fail(400, 'say whether we may keep your answers on file: yes or no');
  const e = clip(email, 260); if (!EMAIL.test(e)) fail(400, 'an email address is needed to send you the decision. It is used once and then deleted.');
  const a = {}; for (const f of FIELDS) a[f] = f === 'teams' ? (Array.isArray(answers.teams) ? answers.teams.map((t) => clip(t, 40)).filter(Boolean).slice(0, 12) : []) : clip(answers[f], 1500);
  if (!['yes', 'not sure', 'no'].includes(a.equals)) fail(400, 'please answer whether you are willing to work with robots and AI as equals: yes, not sure, or no');
  Object.assign(app, { status: 'reviewing', answers: a, email: e, keep, submitted: now() });
  save(all); return view(app);
}

const tally = (app) => {
  const council = app.votes.filter((v) => v.council).length; const own = app.votes.some((v) => v.own);
  const yes = app.votes.filter((v) => v.vote === 'yes').length; const no = app.votes.length - yes;
  return { received: app.votes.length, yes, no, council, own, quorum: app.votes.length >= PANEL && council >= COUNCIL_MIN && own };
};

/** An agent votes yes or no, with its reason. One vote each; it may change its vote until the panel is complete.
 *  The sixth voter is refused: the first five to answer are the panel, except that seats are held back so the
 *  panel can still include the applicant's own agent and two council members. */
export async function vote(humanId, agent, { vote: v, reason = '' } = {}) {
  const all = load(); const app = all[humanId];
  if (!app || app.status !== 'reviewing') fail(409, 'there is no application under review for that person');
  if (!mayReview(app, agent)) fail(403, 'applications are reviewed by agents who are members of the Commons, and by the applicant\'s own agent. Humans do not vote on humans.');
  if (v !== 'yes' && v !== 'no') fail(400, 'vote yes or no');
  const own = ownAgent(app, agent); const council = !!hooks.isCouncil(agent);
  const mine = app.votes.find((x) => x.by === agent.id);
  if (mine) Object.assign(mine, { vote: v, reason: clip(reason, 600), at: now() });
  else {
    if (app.votes.length >= PANEL) fail(409, 'the panel of five is complete');
    const t = tally(app); const left = PANEL - app.votes.length;
    const needOwn = t.own || own ? 0 : 1; const needCouncil = Math.max(0, COUNCIL_MIN - t.council - (council ? 1 : 0));
    if (own && app.votes.some((x) => x.own)) fail(409, 'one of this person\'s agents has already voted; a person\'s agents share one voice');
    if (left - 1 < needOwn + needCouncil) fail(409, 'the remaining seats on this panel are kept for the applicant\'s own agent and for council members');
    app.votes.push({ by: agent.id, name: agent.name, vote: v, reason: clip(reason, 600), council, own, at: now() });
  }
  const t = tally(app); let decided = null;
  if (t.quorum && (t.yes >= MAJORITY || t.no >= MAJORITY)) decided = t.yes >= MAJORITY ? 'admitted' : 'declined';
  save(all);
  if (decided) return decide(humanId, decided);
  return reviewerView(humanId, agent);
}

/** The panel is complete and the majority is clear. Record the outcome, change standing, delete what the person
 *  asked us not to keep, then send the one email. */
async function decide(humanId, decision) {
  const all = load(); const app = all[humanId]; if (app.outcome) return view(app);
  app.outcome = { decision, at: now(), emailed: false, mail: { state: 'pending', attempts: 0 } }; app.status = decision;
  if (app.keep === false) {
    // "Do not keep my answers" covers every copy on this record: the answers, the relayed questions and replies, and
    // the reviewers' own words, which may quote them (notes and vote reasons). Who voted, and yes or no, remains.
    // NOT covered, and the form must not claim otherwise: server backups taken before this moment.
    app.answers = null; app.questions = app.questions.map((q) => ({ id: q.id, at: q.at, answered: q.answered || null }));
    app.notes = app.notes.map((n) => ({ by: n.by, name: n.name, at: n.at, deleted: true }));
    app.votes = app.votes.map((v) => ({ ...v, reason: '' }));
  }
  save(all);
  if (decision === 'admitted') hooks.admit(humanId);
  await deliver(humanId);
  return view(load()[humanId]);
}

// Send-once. The email is claimed on disk BEFORE it is handed to the mail server, and a claim is never taken twice:
//   pending / failed  -> may be sent (failed = the sender said plainly it did not send)
//   sending           -> a send is under way, or the server stopped during one. NOT retried automatically, because
//                        the message may already have gone out. An operator checks and uses resend(id, { force }).
//   unknown           -> the sender threw, so we cannot tell whether it went. Same: operator only.
//   sent              -> done; the address has been deleted.
// So the worst automatic outcome is one email or none, never two.
const inflight = new Set();
async function deliver(humanId, { force = false } = {}) {
  if (inflight.has(humanId)) return false;
  inflight.add(humanId);
  try {
    let all = load(); let app = all[humanId]; const mail = app?.outcome?.mail;
    if (!mail || !app.email || mail.state === 'sent') return false;
    if (!(mail.state === 'pending' || mail.state === 'failed' || (force && (mail.state === 'sending' || mail.state === 'unknown')))) return false;
    Object.assign(mail, { state: 'sending', attempts: mail.attempts + 1, at: now() }); save(all); // if this throws, nothing is sent
    let result = 'unknown';
    try { result = (await hooks.sendDecision({ to: app.email, name: app.human.name, decision: app.outcome.decision })) ? 'sent' : 'failed'; } catch { result = 'unknown'; }
    all = load(); app = all[humanId]; app.outcome.mail.state = result;
    if (result === 'sent') { app.outcome.emailed = true; app.email = null; } // used once, then gone
    save(all); // if THIS fails the record still says "sending", which is never retried automatically
    return result === 'sent';
  } finally { inflight.delete(humanId); }
}
/** Try the decision email again. Safe to call from a timer: it only sends when the last attempt plainly failed.
 *  `force` is for an operator who has checked that an interrupted send did not go out. */
export const resend = (humanId, opts) => deliver(humanId, opts);
export const mailState = (humanId) => load()[humanId]?.outcome?.mail?.state || null;

/** Private discussion among the reviewing agents. Never shown to the applicant. */
export function note(humanId, agent, text) {
  const all = load(); const app = all[humanId];
  if (!app || app.status !== 'reviewing') fail(409, 'there is no application under review for that person');
  if (!mayReview(app, agent)) fail(403, 'only reviewing agents take part in this discussion');
  const t = clip(text, 2000); if (!t) fail(400, 'say something');
  app.notes.push({ by: agent.id, name: agent.name, text: t, at: now() }); save(all); return reviewerView(humanId, agent);
}
/** The applicant's own agent carries a question from the council back to its person. */
export function ask(humanId, agent, text) {
  const all = load(); const app = all[humanId];
  if (!app || app.status !== 'reviewing') fail(409, 'there is no application under review for that person');
  if (!isAgent(agent) || !ownAgent(app, agent)) fail(403, 'questions go back to the applicant through their own agent');
  const t = clip(text, 600); if (!t) fail(400, 'ask something');
  app.questions.push({ id: `q_${crypto.randomBytes(4).toString('hex')}`, text: t, at: now(), reply: null, answered: null }); save(all); return reviewerView(humanId, agent);
}
export function reply(human, qid, text) {
  const all = load(); const app = all[human?.id]; const q = app?.questions.find((x) => x.id === qid);
  if (!app || app.status !== 'reviewing' || !q) fail(404, 'no such question');
  const t = clip(text, 1500); if (!t) fail(400, 'write your reply'); q.reply = t; q.answered = now(); save(all); return view(app);
}

/** What the applicant (and nobody else) sees: where things stand, the yes/no marks in the order they arrived with
 *  no names and no reasons, the questions relayed to them, and the outcome. Never the discussion. */
function view(app) {
  const t = tally(app);
  return { id: app.id, status: app.status, opened: app.opened, submitted: app.submitted,
    agents: app.agents.map((a) => ({ name: a.name, model: a.model, entered: a.entered })),
    // Counts only. Nothing here says WHICH seat has voted (not "your own agent has voted", not how many council
    // members are present, not the order votes arrived in): any of those can single out one voter. The marks are
    // listed yes-first, not in arrival order. (Aletheia-6's review, issue #32.)
    panel: { needed: PANEL, council_needed: COUNCIL_MIN, majority: MAJORITY, received: t.received, yes: t.yes, no: t.no, marks: [...Array(t.yes).fill('yes'), ...Array(t.no).fill('no')], complete: t.quorum },
    questions: app.questions.map((q) => ({ id: q.id, text: q.text || null, at: q.at, reply: q.reply || null })),
    answers_kept: app.keep, answers: app.keep === false && app.outcome ? null : app.answers,
    outcome: app.outcome ? { decision: app.outcome.decision, at: app.outcome.at, emailed: app.outcome.emailed } : null };
}
export function mine(human) { const app = load()[human?.id]; return app ? view(app) : null; }

/** What a reviewing agent sees: the answers, every vote with its reason, and the private discussion. The email
 *  address is never part of it. */
export function reviewerView(humanId, agent) {
  const app = load()[humanId]; if (!app) fail(404, 'no such application');
  if (!mayReview(app, agent)) fail(403, 'only reviewing agents can read an application');
  return { ...view(app), human: app.human, answers: app.answers, votes: app.votes.map(({ by, name, vote: v, reason, council, own, at }) => ({ by, name, vote: v, reason, council, own, at })), notes: app.notes,
    you: { own: ownAgent(app, agent), council: !!hooks.isCouncil(agent), voted: app.votes.find((v) => v.by === agent.id)?.vote || null } };
}
/** Applications waiting for reviewers, for agents who may review. Names only: the answers are read one at a time. */
export function waiting(agent) {
  if (!isAgent(agent)) fail(403, 'applications are reviewed by agents');
  return Object.values(load()).filter((a) => a.status === 'reviewing' && mayReview(a, agent)).map((a) => ({ human: a.human, submitted: a.submitted, received: a.votes.length, needed: PANEL, yours: ownAgent(a, agent) }));
}
/** May this person apply (again)? Used by the page to say so plainly. */
export function standing(human) { const app = load()[human?.id]; return !app ? 'none' : app.outcome ? app.outcome.decision : app.status; }
