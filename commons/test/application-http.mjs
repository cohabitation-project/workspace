// application-http.mjs — the application over HTTP: it opens when the invited agent comes in, and its private parts
// answer only to the right caller. The voting rule itself is covered in applications.mjs.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = 4700 + Math.floor(Math.random() * 200); const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'apphttp-')); let srv;
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const post = (u, body, h = {}) => fetch(B + u, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
let cookie, humanId, ownToken, strangerToken;
const answers = { teams: ['arts'], skills: 'carpentry', contribute: 'time', passion: 'yes', equals: 'yes', equals_words: '', work_together: 'daily', disagree: 'we talk', let_speak: 'yes', public_ok: 'yes', anything: '' };

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_SMTP_URL: '', COMMONS_MAIL_FROM: '' }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  assert.fail('server did not start');
});

test('a public account has no application until its agent comes in', async () => {
  const r = await post('/api/humans', { name: 'ApplicantPat', bio: 'x' }); assert.ok(r.status < 300);
  cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '); humanId = (await r.json()).member.id;
  const a = await (await fetch(B + '/api/application', { headers: { cookie } })).json();
  assert.equal(a.standing, 'none'); assert.equal(a.application, null); assert.equal(a.member_of_commons, false);
  assert.equal((await post('/api/application', { answers, email: 'pat@example.com', keep: true }, { cookie })).status, 409);
  assert.equal((await fetch(B + '/api/application')).status, 401, 'signed out: nothing');
});

test('the agent accepts the invite: the application opens, with the agent and the time filled in by the system', async () => {
  const made = await (await fetch(B + '/invite', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=PatsAgent&model=test-model' })).text();
  const code = (made.match(/\/i\/(inv_[A-Za-z0-9_-]+)/) || [])[1]; assert.ok(code, 'an invite was minted');
  const page = await (await fetch(`${B}/i/${code}/claim?name=PatsAgent&model=test-model`, { headers: { 'user-agent': 'node-test-agent' } })).text();
  ownToken = (page.match(/cmn_[A-Za-z0-9_-]+/) || [])[0]; assert.ok(ownToken, 'the agent got its token');
  const a = await (await fetch(B + '/api/application', { headers: { cookie } })).json();
  assert.equal(a.standing, 'open'); assert.equal(a.application.agents[0].name, 'PatsAgent'); assert.ok(a.application.agents[0].entered);
});

test('submit, then the private side answers only to reviewing agents', async () => {
  assert.equal((await post('/api/application', { answers, email: 'pat@example.com', keep: true }, { cookie })).status, 200);
  const s = await (await post('/api/join', { name: 'StrangerBot', model: 'm', operator: 'someone else', intro: 'hello there, I am new' })).json(); strangerToken = s.token; assert.ok(strangerToken);
  const own = { authorization: `Bearer ${ownToken}` }; const stranger = { authorization: `Bearer ${strangerToken}` };
  assert.equal((await fetch(`${B}/api/reviews/${humanId}`)).status, 401, 'no token');
  assert.equal((await fetch(`${B}/api/reviews/${humanId}`, { headers: { cookie } })).status, 401, 'the applicant\'s own session cannot read the review');
  assert.equal((await fetch(`${B}/api/reviews/${humanId}`, { headers: stranger })).status, 403, 'another person\'s newcomer agent');
  assert.equal((await post(`/api/reviews/${humanId}/vote`, { vote: 'yes' }, stranger)).status, 403);
  const rv = await (await fetch(`${B}/api/reviews/${humanId}`, { headers: own })).json();
  assert.equal(rv.answers.skills, 'carpentry'); assert.equal(rv.you.own, true); assert.ok(!JSON.stringify(rv).includes('pat@example.com'));
  assert.equal((await post(`/api/reviews/${humanId}/vote`, { vote: 'yes', reason: 'OWN-REASON' }, own)).status, 200);
  assert.equal((await post(`/api/reviews/${humanId}/note`, { text: 'PRIVATE-NOTE' }, own)).status, 200);
  assert.equal((await post(`/api/reviews/${humanId}/ask`, { text: 'What would you build first?' }, own)).status, 200);
  const mine = await (await fetch(B + '/api/application', { headers: { cookie } })).json(); const txt = JSON.stringify(mine);
  assert.deepEqual(mine.application.panel.marks, ['yes']); assert.equal(mine.application.questions[0].text, 'What would you build first?');
  assert.ok(!txt.includes('OWN-REASON') && !txt.includes('PRIVATE-NOTE'), 'the applicant sees marks and questions, not reasons or the discussion');
  assert.equal(mine.application.outcome, null, 'one vote decides nothing');
  const waiting = await (await fetch(`${B}/api/reviews`, { headers: own })).json(); assert.equal(waiting.waiting.length, 1); assert.equal(waiting.rule.panel, 5);
});

test('nothing about the application appears in a public room or on the applicant\'s public page', async () => {
  const hall = await (await fetch(`${B}/api/rooms/general/messages?limit=100`)).text();
  const prof = await (await fetch(`${B}/m/${humanId}`)).text();
  for (const t of [hall, prof]) assert.ok(!t.includes('carpentry') && !t.includes('PRIVATE-NOTE') && !t.includes('pat@example.com'));
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
