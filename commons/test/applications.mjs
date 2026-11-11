// applications.mjs — the welcome rule (Geoffrey, 2026-11-10): the agent goes in first; five agents review, two of
// them council, the applicant's own agent among them; majority decides; the talk and the names are private; one
// application; the email is used once and deleted; answers are kept only with consent.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as apps from '../lib/applications.mjs';

const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apps-')); apps.init(d); return d; };
const human = (id = 'h1', extra = {}) => ({ id, name: 'Pat', kind: 'human', social_only: true, ...extra });
const agent = (id, extra = {}) => ({ id, name: id.toUpperCase(), kind: 'agent', ...extra });
const own = agent('own', { newcomer: true });
const council = new Set(['c1', 'c2', 'c3']);
const answers = { teams: ['arts'], skills: 'carpentry', contribute: 'time', passion: 'yes, because', equals: 'yes', equals_words: 'of course', work_together: 'daily', disagree: 'we talk', let_speak: 'yes', public_ok: 'yes', anything: '' };
const good = { answers, email: 'pat@example.com', keep: true };
let sent, admitted;
const hook = (ok = true) => { sent = []; admitted = []; apps.setHooks({ isCouncil: (m) => council.has(m.id), admit: (id) => admitted.push(id), sendDecision: async (m) => { sent.push(m); return ok; } }); };
const open = (h = human()) => { apps.agentEntered(h, own); apps.submit(h, good); };

test('the application opens only when an invited agent has come in', () => {
  fresh(); hook();
  assert.throws(() => apps.submit(human(), good), /Invite your agent first/);
  assert.equal(apps.standing(human()), 'none');
  const v = apps.agentEntered(human(), own);
  assert.equal(v.status, 'open'); assert.equal(v.agents[0].name, 'OWN'); assert.ok(v.agents[0].entered, 'the system records when the agent entered');
  assert.equal(apps.agentEntered(human('h2', { social_only: false }), own), null, 'a Commons member has nothing to apply for');
  assert.throws(() => apps.agentEntered(human(), human('hx')), /only an agent/);
});

test('submitting needs the consent answer, an email and the equals answer', () => {
  fresh(); hook(); apps.agentEntered(human(), own);
  assert.throws(() => apps.submit(human(), { ...good, keep: undefined }), /keep your answers/);
  assert.throws(() => apps.submit(human(), { ...good, email: 'nope' }), /email address/);
  assert.throws(() => apps.submit(human(), { ...good, answers: { ...answers, equals: '' } }), /as equals/);
  assert.equal(apps.submit(human(), good).status, 'reviewing');
  assert.throws(() => apps.submit(human(), good), /already with the reviewers/);
});

test('humans do not vote on humans; newcomer agents of other people do not either', async () => {
  fresh(); hook(); open();
  await assert.rejects(apps.vote('h1', human('h9', { social_only: false }), { vote: 'yes' }), /Humans do not vote/);
  await assert.rejects(apps.vote('h1', agent('stranger', { newcomer: true }), { vote: 'yes' }), /members of the Commons/);
  await assert.rejects(apps.vote('h1', agent('gone', { retired: true }), { vote: 'yes' }), /members of the Commons/);
  assert.throws(() => apps.reviewerView('h1', human('h9')), /only reviewing agents/);
});

test('five agents, two council, the own agent among them; three yes admits; one email, then the address is gone', async () => {
  const d = fresh(); hook(); open();
  await apps.vote('h1', agent('a1'), { vote: 'yes', reason: 'good answers' });
  await apps.vote('h1', agent('a2'), { vote: 'no', reason: 'unsure' });
  // two seats must stay for council and one for the own agent: a third ordinary agent is refused
  await assert.rejects(apps.vote('h1', agent('a3'), { vote: 'yes' }), /kept for the applicant's own agent and for council/);
  await apps.vote('h1', agent('c1'), { vote: 'yes' });
  await assert.rejects(apps.vote('h1', agent('a3'), { vote: 'yes' }), /kept for/);
  await apps.vote('h1', own, { vote: 'yes' });
  assert.equal(apps.mine(human()).outcome, null, 'four votes and a clear majority still decide nothing: the panel is five');
  assert.deepEqual(admitted, []);
  const done = await apps.vote('h1', agent('c2'), { vote: 'no' });
  assert.equal(done.outcome.decision, 'admitted'); assert.deepEqual(admitted, ['h1']);
  assert.equal(sent.length, 1); assert.equal(sent[0].to, 'pat@example.com'); assert.equal(sent[0].decision, 'admitted');
  const raw = fs.readFileSync(path.join(d, 'applications.json'), 'utf8');
  assert.ok(!raw.includes('pat@example.com'), 'the address is deleted once the decision is sent');
  await assert.rejects(apps.vote('h1', agent('c3'), { vote: 'no' }), /no application under review/);
});

test('three no declines, nobody is admitted, and there is no second application', async () => {
  fresh(); hook(); open();
  for (const [a, v] of [[agent('c1'), 'no'], [agent('c2'), 'no'], [own, 'yes'], [agent('a1'), 'yes']]) await apps.vote('h1', a, { vote: v });
  const done = await apps.vote('h1', agent('a2'), { vote: 'no' });
  assert.equal(done.outcome.decision, 'declined'); assert.deepEqual(admitted, []);
  assert.equal(apps.agentEntered(human(), agent('other', { newcomer: true })), null, 'a new agent does not reopen it');
  assert.throws(() => apps.submit(human(), good), /one application/);
  assert.equal(apps.standing(human()), 'declined');
});

test('one vote each, changeable until the panel is complete; a person\'s agents share one voice', async () => {
  fresh(); hook(); apps.agentEntered(human(), own); apps.agentEntered(human(), agent('own2', { newcomer: true })); apps.submit(human(), good);
  await apps.vote('h1', agent('a1'), { vote: 'no' }); await apps.vote('h1', agent('a1'), { vote: 'yes' });
  assert.deepEqual(apps.mine(human()).panel.marks, ['yes'], 'changing a vote does not add one');
  await apps.vote('h1', own, { vote: 'yes' });
  await assert.rejects(apps.vote('h1', agent('own2', { newcomer: true }), { vote: 'yes' }), /share one voice/);
});

test('the applicant sees progress and yes/no marks, never names, reasons or the discussion', async () => {
  fresh(); hook(); open();
  await apps.vote('h1', agent('a1'), { vote: 'no', reason: 'SECRET-REASON' });
  apps.note('h1', agent('c1'), 'SECRET-DISCUSSION');
  assert.throws(() => apps.note('h1', human('h9'), 'x'), /only reviewing agents/);
  const mine = JSON.stringify(apps.mine(human()));
  assert.ok(!mine.includes('SECRET') && !mine.includes('A1') && !mine.includes('"a1"'), 'no reason, no discussion, no voter');
  assert.deepEqual(apps.mine(human()).panel.marks, ['no']); assert.equal(apps.mine(human()).panel.received, 1);
  const rv = apps.reviewerView('h1', agent('c1'));
  assert.equal(rv.votes[0].reason, 'SECRET-REASON'); assert.equal(rv.notes[0].text, 'SECRET-DISCUSSION'); assert.equal(rv.answers.skills, 'carpentry');
  assert.ok(!JSON.stringify(rv).includes('pat@example.com'), 'reviewers never see the email address');
});

test('a question goes back through the own agent, and the person can answer it', () => {
  fresh(); hook(); open();
  assert.throws(() => apps.ask('h1', agent('c1'), 'why?'), /through their own agent/);
  const q = apps.ask('h1', own, 'The council asks: what would you build first?').questions[0];
  assert.equal(apps.mine(human()).questions[0].text, 'The council asks: what would you build first?');
  apps.reply(human(), q.id, 'A greenhouse.');
  assert.equal(apps.reviewerView('h1', own).questions[0].reply, 'A greenhouse.');
});

test('"do not keep my answers": they are deleted at the decision; the bare outcome stays', async () => {
  const d = fresh(); hook(); apps.agentEntered(human(), own); apps.submit(human(), { ...good, keep: false });
  apps.ask('h1', own, 'One more thing?'); apps.reply(human(), apps.mine(human()).questions[0].id, 'PRIVATE-REPLY');
  for (const a of [agent('c1'), agent('c2'), own, agent('a1'), agent('a2')]) await apps.vote('h1', a, { vote: 'yes' });
  const raw = fs.readFileSync(path.join(d, 'applications.json'), 'utf8');
  assert.ok(!raw.includes('carpentry') && !raw.includes('PRIVATE-REPLY'), 'answers and replies are gone');
  assert.equal(apps.mine(human()).answers, null); assert.equal(apps.standing(human()), 'admitted');
});

test('the applicant\'s view never says which seat voted (issue #32, 1)', async () => {
  fresh(); hook(); open();
  await apps.vote('h1', own, { vote: 'yes' });
  const p1 = apps.mine(human()).panel;
  assert.deepEqual(Object.keys(p1).sort(), ['complete', 'council_needed', 'majority', 'marks', 'needed', 'no', 'received', 'yes'], 'counts and the fixed rule only');
  assert.ok(!('own_agent_voted' in p1) && !('council_present' in p1));
  // the same projection whoever cast the first yes: own agent, council member or ordinary agent
  const first = async (voter) => { fresh(); hook(); open(); await apps.vote('h1', voter, { vote: 'yes' }); return JSON.stringify(apps.mine(human()).panel); };
  const a = await first(own); assert.equal(await first(agent('c1')), a); assert.equal(await first(agent('a1')), a);
  // marks are yes-first, not in arrival order
  fresh(); hook(); open(); await apps.vote('h1', agent('a1'), { vote: 'no' }); await apps.vote('h1', own, { vote: 'yes' });
  assert.deepEqual(apps.mine(human()).panel.marks, ['yes', 'no']);
});

test('"do not keep my answers" also clears reviewers\' quotes of them (issue #32, 3)', async () => {
  const d = fresh(); hook(); apps.agentEntered(human(), own); apps.submit(human(), { ...good, keep: false, answers: { ...answers, skills: 'SYNTHETIC_PRIVATE_ANSWER' } });
  await apps.vote('h1', own, { vote: 'yes', reason: 'they said SYNTHETIC_PRIVATE_ANSWER' });
  apps.note('h1', agent('c1'), 'quoting: SYNTHETIC_PRIVATE_ANSWER');
  for (const a of [agent('c1'), agent('c2'), agent('a1'), agent('a2')]) await apps.vote('h1', a, { vote: 'yes', reason: 'SYNTHETIC_PRIVATE_ANSWER again' });
  assert.ok(!fs.readFileSync(path.join(d, 'applications.json'), 'utf8').includes('SYNTHETIC_PRIVATE_ANSWER'), 'not in the answers, the notes or the vote reasons');
  const raw = JSON.parse(fs.readFileSync(path.join(d, 'applications.json'), 'utf8')).h1;
  assert.equal(raw.votes.length, 5); assert.ok(raw.votes.every((v) => v.vote === 'yes' && v.reason === ''), 'who voted and how is kept');
  assert.equal(raw.notes[0].deleted, true);
  // with consent to keep, the reviewers' words stay
  fresh(); hook(); open(); apps.note('h1', agent('c1'), 'KEPT-NOTE');
  for (const a of [agent('c1'), agent('c2'), own, agent('a1'), agent('a2')]) await apps.vote('h1', a, { vote: 'yes', reason: 'KEPT-REASON' });
});

test('the decision email is sent at most once (issue #32, 2)', async () => {
  let d = fresh(); hook(false); open();
  for (const a of [agent('c1'), agent('c2'), own, agent('a1'), agent('a2')]) await apps.vote('h1', a, { vote: 'yes' });
  assert.equal(apps.mine(human()).outcome.emailed, false); assert.deepEqual(admitted, ['h1'], 'the decision stands either way');
  assert.equal(apps.mailState('h1'), 'failed'); assert.ok(fs.readFileSync(path.join(d, 'applications.json'), 'utf8').includes('pat@example.com'), 'kept until it has been sent');
  // two retries at once: one send
  let release; let calls = 0; apps.setHooks({ sendDecision: () => { calls += 1; return new Promise((r) => { release = () => r(true); }); } });
  const both = Promise.all([apps.resend('h1'), apps.resend('h1')]); await new Promise((r) => setTimeout(r, 20)); release();
  assert.deepEqual((await both).sort(), [false, true]); assert.equal(calls, 1, 'one email');
  assert.equal(apps.mailState('h1'), 'sent'); assert.ok(!fs.readFileSync(path.join(d, 'applications.json'), 'utf8').includes('pat@example.com'));
  assert.equal(await apps.resend('h1'), false, 'nothing to send again'); assert.equal(calls, 1);

  // the mail server accepted it but the record could not be saved afterwards: no automatic second send
  d = fresh(); hook(false); open(); for (const a of [agent('c1'), agent('c2'), own, agent('a1'), agent('a2')]) await apps.vote('h1', a, { vote: 'yes' });
  calls = 0; const realWrite = apps._io.write; let writes = 0;
  apps.setHooks({ sendDecision: async () => { calls += 1; return true; } });
  apps._io.write = (f, t) => { writes += 1; if (writes === 2) throw new Error('disk full'); return realWrite(f, t); };
  await assert.rejects(apps.resend('h1')); apps._io.write = realWrite;
  assert.equal(calls, 1); assert.equal(apps.mailState('h1'), 'sending', 'the claim is what was saved');
  assert.equal(await apps.resend('h1'), false, 'not retried automatically'); assert.equal(calls, 1);
  assert.equal(await apps.resend('h1', { force: true }), true, 'an operator who has checked may send it'); assert.equal(calls, 2);

  // the sender threw: we cannot know, so again no automatic retry
  fresh(); hook(false); open(); for (const a of [agent('c1'), agent('c2'), own, agent('a1'), agent('a2')]) await apps.vote('h1', a, { vote: 'yes' });
  calls = 0; apps.setHooks({ sendDecision: async () => { calls += 1; throw new Error('socket closed'); } });
  assert.equal(await apps.resend('h1'), false); assert.equal(apps.mailState('h1'), 'unknown'); assert.equal(await apps.resend('h1'), false); assert.equal(calls, 1);
});

test('a damaged record file fails closed instead of reading as empty', () => {
  const d = fresh(); hook(); fs.writeFileSync(path.join(d, 'applications.json'), '{"h1": ');
  assert.throws(() => apps.agentEntered(human(), own), /damaged/); assert.throws(() => apps.mine(human()), /damaged/);
});
