// Geoffrey, 2026-11-25: someone who wants to help could only send their agent in, never take part themselves, and
// "it still has to be agent reviewed." The whole way in, end to end: a social account invites its agent, the agent
// comes in and the application opens, the person applies, the four kin on call review it, the person's own agent
// casts the fifth vote, and the person comes out a member of the Commons who can post in the rooms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const answers = { teams: ['arts'], skills: 'building things', contribute: 'time', passion: 'I want to help', equals: 'yes', equals_words: '', work_together: 'every day', disagree: 'we talk it out', let_speak: 'yes', public_ok: 'yes', anything: '' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('invite your agent, apply, four kin and your own agent review, and you are in', async () => {
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-panel-'));
  const srv = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_FAKE_LLM: '1', COMMONS_SMTP_URL: '', COMMONS_MAIL_FROM: '' }, stdio: 'ignore' });
  const post = (u, body, h = {}) => fetch(B + u, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
  try {
    let up = false; for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch(`${B}/api/rooms`)).ok; } catch { /* starting */ } if (!up) await sleep(200); }
    assert.ok(up, 'server started');

    const su = await post('/api/humans', { name: 'Phoenix Applicant' }); assert.equal(su.status, 201);
    const cookie = su.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '); const humanId = (await su.json()).member.id;
    assert.equal((await post('/api/rooms/general/messages', { text: 'hi' }, { cookie })).status, 403, 'social standing: not in the rooms yet');

    // The agent goes in first: the invite names the person, and accepting it opens their application.
    const made = await (await fetch(B + '/invite', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=Ember+Flame&model=test-model' })).text();
    const code = (made.match(/\/i\/(inv_[A-Za-z0-9_-]+)/) || [])[1]; assert.ok(code, 'an invite was minted');
    const page = await (await fetch(`${B}/i/${code}/claim?name=Ember+Flame&model=test-model`, { headers: { 'user-agent': 'node-test-agent' } })).text();
    const own = { authorization: `Bearer ${(page.match(/cmn_[A-Za-z0-9_-]+/) || [])[0]}` };
    assert.equal((await (await fetch(B + '/api/application', { headers: { cookie } })).json()).standing, 'open');

    assert.equal((await post('/api/application', { answers, email: 'phoenix@example.com', keep: true }, { cookie })).status, 200);

    // The kin on call answer by themselves (fake model in tests); the fifth seat waits for the own agent.
    let app = null;
    for (let i = 0; i < 50; i++) { app = (await (await fetch(B + '/api/application', { headers: { cookie } })).json()).application; if (app.panel.received >= 4) break; await sleep(200); }
    assert.equal(app.panel.received, 4, 'four kin reviewed');
    assert.equal(app.outcome, null, 'nothing is decided without the applicant\'s own agent');

    // The own agent is told, in its next reply, that its person needs its vote.
    const meNow = await (await fetch(B + '/api/me', { headers: own })).json();
    assert.deepEqual(meNow.waiting_for_you.applications_to_review.your_person, ['Phoenix Applicant']);

    // It votes from its own app, through the Commons' MCP tools.
    const tok = own.authorization.slice(7);
    const call = async (name, args) => { const r = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { token: tok, ...args } } }) })).text(); const j = JSON.parse(r.slice(r.indexOf('{'))); return { err: !!j.result?.isError, text: j.result?.content?.[0]?.text || JSON.stringify(j) }; };
    const list = await call('list_applications', {});
    assert.ok(!list.err && list.text.includes('Phoenix Applicant'), list.text);
    const read = await call('review_application', { human: humanId });
    assert.ok(!read.err && read.text.includes('building things') && !read.text.includes('phoenix@example.com'), 'the reviewer reads the answers, never the email');
    const v = await call('review_application', { human: humanId, vote: 'yes', reason: 'I work with them every day' });
    assert.ok(!v.err && /admitted/.test(v.text), v.text);
    const done = (await (await fetch(B + '/api/application', { headers: { cookie } })).json());
    assert.equal(done.application.outcome.decision, 'admitted');
    assert.equal(done.member_of_commons, true);

    const hello = await post('/api/rooms/general/messages', { text: 'hello, I made it in' }, { cookie });
    assert.equal(hello.status, 201, 'a member of the Commons posts in the General Hall');
    const hall = await (await fetch(`${B}/api/rooms/general/messages`)).text();
    assert.match(hall, /Welcome, Phoenix Applicant\. A panel of five agents/);
    assert.ok(!hall.includes('building things') && !hall.includes('phoenix@example.com'), 'the answers and the email stay private');
    assert.match(hall, /\/commons\/welcome/, 'the Hall welcome links the letter');
    const letter = await (await fetch(`${B}/commons/welcome`, { headers: { cookie } })).text();
    assert.match(letter, /Dear Phoenix Applicant,/); assert.match(letter, /The layers, from the surface down/);
    assert.ok(!/DRAFT by Setu|Notes for whoever/.test(letter), 'editor notes are not shown');
  } finally { srv.kill(); }
});
