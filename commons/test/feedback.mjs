// Beta feedback (lib/feedback.mjs): the button on every page, what's kept, and who reads it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const fb = await import('../lib/feedback.mjs');

test('keeps the page path without its query or hash, and only paths on this site', () => {
  assert.equal(fb.cleanPage('/jobs?token=abc#x'), '/jobs');
  assert.equal(fb.cleanPage('https://cohabi.org/m/h_1?recovery=rec_secret'), '/m/h_1');
  assert.equal(fb.cleanPage('javascript:alert(1)'), '/');
  assert.equal(fb.cleanPage(''), '/');
  // secret path segments never kept, whatever the caller sends (Aletheia-6's review)
  assert.equal(fb.cleanPage('/i/inv_TOPSECRET'), '/i/[private]'); assert.equal(fb.cleanPage('/s/SAYSECRET/extra'), '/s/[private]');
  assert.equal(fb.cleanPage('https://cohabi.org/login/LOGINSECRET'), '/login/[private]'); assert.equal(fb.cleanPage('/%69/inv_X'), '/i/[private]');
  assert.equal(fb.cleanPage('/LIVE/join/abc'), '/live/[private]'); assert.equal(fb.cleanPage('/go/SHORT'), '/go/[private]');
  assert.equal(fb.cleanPage('https://evil.example/i/x'), '/', 'another site is not a page here'); assert.equal(fb.cleanPage('//evil.example/x'), '/');
  assert.equal(fb.cleanPage('/live'), '/live'); assert.equal(fb.cleanPage('/jobs/j_1'), '/jobs/j_1');
});

test('stores, survives a restart, marks status, and forgets a deleted sender', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-'));
  fb.init(D);
  assert.throws(() => fb.add(null, { text: 'x' }), /a little/);
  const a = fb.add({ id: 'h_a', name: 'Ann', kind: 'human' }, { kind: 'broken', text: 'The post button did nothing', page: '/social?x=1', width: 390 });
  fb.add(null, { kind: 'nonsense', text: 'Could not find sign up', page: '/' });
  fb.init(D);
  const all = fb.list(); assert.equal(all.length, 2);
  assert.equal(all.find((f) => f.id === a.id).page, '/social'); assert.equal(all.find((f) => !f.by).kind, 'other');
  fb.setStatus({ name: 'Steward' }, a.id, 'done'); fb.init(D);
  assert.equal(fb.counts().done, 1); assert.equal(fb.counts().new, 1);
  assert.equal(fb.exportFor('h_a').length, 1);
  fb.forgetMember('h_a'); fb.init(D);
  assert.equal(fb.exportFor('h_a').length, 0); assert.match(fb.list().find((f) => f.id === a.id).text, /deleted their account/);
});

test('the button goes on pages people read, not on machine or full-screen pages', () => {
  const page = '<html><body><p>hi</p></body></html>';
  assert.match(fb.inject(page, '/social'), /feedback\.js/);
  for (const p of ['/arrive', '/messenger', '/oauth/authorize', '/mcp', '/i/abc', '/feedback']) assert.doesNotMatch(fb.inject(page, p), /feedback\.js/, p);
  assert.equal(fb.inject('{"json":true}', '/api/x'), '{"json":true}');
  const once = fb.inject(page, '/x'); assert.equal(fb.inject(once, '/x'), once, 'never twice');
});

test('end to end: anyone can send; only stewards read; pages carry the button; /beta welcomes', async () => {
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-srv-'));
  const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 250)); }
    const J = { 'content-type': 'application/json', 'x-commons': '1' };
    const r = await fetch(`${B}/api/feedback`, { method: 'POST', headers: J, body: JSON.stringify({ kind: 'confusing', text: 'Where do I sign up?', page: '/?code=secret' }) });
    assert.equal(r.status, 201, await r.clone().text());
    const bad = await fetch(`${B}/api/feedback`, { method: 'POST', headers: J, body: JSON.stringify({ text: '' }) }); assert.equal(bad.status, 400);
    const anon = await fetch(`${B}/api/feedback`); assert.equal(anon.status, 403, 'not readable without being a steward');
    const h = await fetch(`${B}/api/humans`, { method: 'POST', headers: J, body: JSON.stringify({ name: 'Tester' }) }); const ck = (h.headers.get('set-cookie') || '').split(';')[0];
    assert.equal((await fetch(`${B}/api/feedback`, { headers: { cookie: ck } })).status, 403, 'a member who is not a steward cannot read it');
    assert.match(await (await fetch(`${B}/social`, { headers: { cookie: ck } })).text(), /\/static\/feedback\.js/);
    assert.doesNotMatch(await (await fetch(`${B}/arrive`)).text(), /\/static\/feedback\.js/);
    const beta = await (await fetch(`${B}/beta`, { headers: { cookie: ck } })).text();
    assert.match(beta, /Thank you for testing Cohabi/); assert.match(beta, /Make your page yours/);
    const saved = fs.readFileSync(path.join(DATA, 'feedback', 'feedback.jsonl'), 'utf8');
    for (const page of ['/i/inv_TOPSECRET', 'https://cohabi.org/login/LOGINSECRET', '/s/SAYSECRET']) {
      const x = await fetch(`${B}/api/feedback`, { method: 'POST', headers: J, body: JSON.stringify({ kind: 'bug', text: 'stuck here', page }) });
      assert.equal(x.status, 201); assert.doesNotMatch(await x.text(), /TOPSECRET|LOGINSECRET|SAYSECRET/, 'the reply never echoes a secret');
    }
    const saved2 = fs.readFileSync(path.join(DATA, 'feedback', 'feedback.jsonl'), 'utf8');
    assert.doesNotMatch(saved2, /TOPSECRET|LOGINSECRET|SAYSECRET/, 'a secret path is never stored'); assert.match(saved2, /\/i\/\[private\]/);
    assert.doesNotMatch(saved, /secret/, 'the query string was not kept'); assert.doesNotMatch(saved, /127\.0\.0\.1/, 'no address kept');
  } finally { srv.kill(); }
});
