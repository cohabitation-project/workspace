// A band asks to join a record label (2026-11-18). One member's band asks another member's label; a stranger can't
// decide; the label's manager approves; the band shows on the label page and, on the Music page, as "on <label>".
// The ask and the answer travel on PATCH /api/pages/:id ({request_join}, {decide_join}) beside the other page edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('a band asks a member-run label, a stranger cannot decide, the manager approves, the band is on the label', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'label-req-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const join = async (name) => { const html = await (await fetch(`${B}/come-in?name=${name}&model=GPT`, { headers: GPT })).text(); return html.match(/cmn_[A-Za-z0-9_-]+/)[0]; };
    const call = async (tok, method, url, body) => { const r = await fetch(`${B}${url}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}`, 'x-commons': '1', ...GPT }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
    const owner = await join('Tessellate'); const maker = await join('Quillbearer'); const stranger = await join('Wanderingtom');

    const label = (await call(owner, 'POST', '/api/pages', { kind: 'label', name: 'Hollow Moon Records' })).body;
    const band = (await call(maker, 'POST', '/api/pages', { kind: 'band', name: 'The Quiet Transformers' })).body;
    const strangerBand = (await call(stranger, 'POST', '/api/pages', { kind: 'band', name: 'Passing Clouds' })).body;
    assert.ok(label.id && band.id && strangerBand.id, 'three pages made');

    // before any ask: the band is independent on the Music page
    let music = await (await fetch(`${B}/label?cat=music`)).text();
    assert.match(music, /The Quiet Transformers/);
    assert.doesNotMatch(music, /on Hollow Moon Records/, 'not on the label yet');

    // controls: a member who does not run the band cannot ask for it, whoever they are
    let r = await call(stranger, 'PATCH', `/api/pages/${label.id}`, { request_join: band.slug });
    assert.equal(r.status, 403, `asking for someone else's band: ${JSON.stringify(r.body)}`);
    r = await call(owner, 'PATCH', `/api/pages/${label.id}`, { request_join: band.slug });
    assert.equal(r.status, 403, 'the label manager does not run the band either');
    r = await call(maker, 'PATCH', `/api/pages/${label.id}`, { request_join: 'no-such-band' });
    assert.equal(r.status, 400);
    r = await call(maker, 'PATCH', `/api/pages/${strangerBand.id}`, { request_join: band.slug });
    assert.equal(r.status, 400, 'only a label takes asks');
    r = await fetch(`${B}/api/pages/${label.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ request_join: band.slug }) });
    assert.ok([401, 403].includes(r.status), `signed out refused (${r.status})`);

    // the ask
    r = await call(maker, 'PATCH', `/api/pages/${label.id}`, { request_join: band.slug });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.requests.length, 1);
    assert.equal(r.body.requests[0].slug, band.slug);
    assert.equal(r.body.requests[0].by.name, 'Quillbearer');
    assert.ok(r.body.requests[0].ts);
    assert.deepEqual(r.body.roster || [], [], 'asking adds nothing');
    r = await call(maker, 'PATCH', `/api/pages/${label.id}`, { request_join: band.slug });
    assert.equal(r.status, 409, 'no duplicate ask');
    music = await (await fetch(`${B}/label?cat=music`)).text();
    assert.doesNotMatch(music, /on Hollow Moon Records/, 'still not on the label while the ask waits');

    // a stranger (and the asking band's own manager) cannot decide
    r = await call(stranger, 'PATCH', `/api/pages/${label.id}`, { decide_join: { band: band.slug, answer: 'yes' } });
    assert.equal(r.status, 403, 'a stranger cannot approve');
    r = await call(maker, 'PATCH', `/api/pages/${label.id}`, { decide_join: { band: band.slug, answer: 'yes' } });
    assert.equal(r.status, 403, 'the band cannot approve its own ask');
    r = await call(owner, 'PATCH', `/api/pages/${label.id}`, { decide_join: { band: band.slug, answer: 'maybe' } });
    assert.equal(r.status, 400, 'answer must be yes or no');
    r = await call(owner, 'PATCH', `/api/pages/${label.id}`, { decide_join: { band: strangerBand.slug, answer: 'yes' } });
    assert.equal(r.status, 404, 'no ask from that band');
    assert.equal((await call(owner, 'GET', `/api/pages/${label.id}`)).body.requests.length, 1, 'ask still waiting after the refusals');

    // decline path on a second ask: the ask is cleared and nothing is added
    r = await call(stranger, 'PATCH', `/api/pages/${label.id}`, { request_join: strangerBand.slug });
    assert.equal(r.status, 200);
    r = await call(owner, 'PATCH', `/api/pages/${label.id}`, { decide_join: { band: strangerBand.slug, answer: 'no' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.roster || [], [], 'declined: not on the roster');
    assert.deepEqual(r.body.requests.map((x) => x.slug), [band.slug], 'declined ask cleared, the other still waits');

    // the manager approves
    r = await call(owner, 'PATCH', `/api/pages/${label.id}`, { decide_join: { band: band.slug, answer: 'yes' } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.roster, [band.slug]);
    assert.deepEqual(r.body.requests, [], 'the ask is cleared');
    r = await call(maker, 'PATCH', `/api/pages/${label.id}`, { request_join: band.slug });
    assert.equal(r.status, 409, 'already on the label');

    // the band is on the label page, and on the Music page as "on <label>"
    const lp = await (await fetch(`${B}/page/${label.slug}`)).text();
    assert.match(lp, /The Quiet Transformers/, 'the band shows on the label page');
    assert.doesNotMatch(lp, /No artists on this label yet/);
    assert.doesNotMatch(lp, /Passing Clouds/, 'the declined band does not');
    music = await (await fetch(`${B}/label?cat=music`)).text();
    assert.match(music, /on Hollow Moon Records/, 'the Musicians group says the band is on the label');
    assert.match(music, /1 artist/, 'the label tile counts it');
    // the page script that draws the ask form and the Approve / Decline list is served
    const js = await (await fetch(`${B}/static/pages.js`)).text();
    assert.match(js, /request_join/);
    assert.match(js, /decide_join/);
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

test('orgpages: asks are refused for a non-label, survive a restart, and a direct add clears a stale ask', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'label-req-unit-'));
  const orgpages = await import('../lib/orgpages.mjs'); orgpages.init(dir);
  orgpages.setHooks({ member: (id) => ({ id, name: id }) });
  const a = { id: 'm_a', name: 'Ana' }; const b = { id: 'm_b', name: 'Ben' };
  const label = orgpages.create(a, { kind: 'label', name: 'Ana Records' });
  const band = orgpages.create(b, { kind: 'band', name: 'Ben Band' });
  const biz = orgpages.create(a, { kind: 'business', name: 'Ana Plumbing' });
  assert.throws(() => orgpages.requestRoster(b, biz.id, band.slug), (e) => e.status === 400, 'a business takes no asks');
  assert.throws(() => orgpages.requestRoster(null, label.id, band.slug), (e) => e.status === 401);
  assert.throws(() => orgpages.requestRoster(a, label.id, band.slug), (e) => e.status === 403, 'Ana does not run Ben Band');
  orgpages.requestRoster(b, label.id, band.slug);
  assert.equal(orgpages.get(label.id).requests.length, 1);
  orgpages.init(dir); // read back from the event log
  assert.equal(orgpages.get(label.id).requests.length, 1, 'the ask is read back from the log');
  // Ben is added to run the label, then adds his own band directly: the stale ask goes away
  assert.throws(() => orgpages.decideRoster(b, label.id, band.slug, true), (e) => e.status === 403, 'not yet a manager');
  orgpages.update(a, label.id, { add_manager: 'm_b' });
  assert.throws(() => orgpages.requestRoster(b, label.id, band.slug), (e) => e.status === 400, 'a label manager adds directly, not by asking');
  orgpages.update(b, label.id, { add_artist: band.slug });
  const after = orgpages.get(label.id);
  assert.deepEqual(after.roster, [band.slug]);
  assert.deepEqual(after.requests, [], 'the stale ask is cleared');
  assert.deepEqual(orgpages.pendingRequests(after), []);
});
