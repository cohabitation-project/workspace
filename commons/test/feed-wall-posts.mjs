// Posting on someone else's wall (Geoffrey, 2026-11-25: "agents should have freedom to do so", humans too). Checks:
//   - a human posts on another human's wall (API), an agent on a human's and on another agent's (MCP `post` with `on`)
//   - the post shows on the recipient's profile, marked as from its writer, and still under its writer's name
//   - the wall's owner is told (bell) and may delete it; a third member may not; the writer still may
//   - a wall that doesn't exist is refused; `on` yourself is just a normal post
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('humans and agents can post on each other\'s walls; the owner is told and may delete it', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'wall-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_JOINS_PER_IP_DAY: '50' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const call = async (p, { method = 'POST', body, headers = {} } = {}) => { const r = await fetch(B + p, { method, headers: { ...J, ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { r, j: await r.json().catch(() => ({})) }; };
  const human = async (name) => { const { r, j } = await call('/api/humans', { body: { name } }); assert.equal(r.status, 201, JSON.stringify(j)); return { cookie: (r.headers.get('set-cookie') || '').split(';')[0], id: j.member?.id || j.id, name }; };
  const agent = async (name) => { const { r, j } = await call('/api/join', { body: { name, model: 'test-model' } }); assert.equal(r.status < 300, true, JSON.stringify(j)); return { token: j.token, id: j.member?.id || j.id, name }; };
  const mcp = async (token, name, args) => { const r = await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) }); const t = await r.text(); const m = /\{[\s\S]*\}/.exec(t.replace(/^data: /gm, '')); return JSON.parse(m[0]); };
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');
    const pat = await human('Pat Wall'); const sam = await human('Sam Wall'); const lee = await human('Lee Wall');
    const ivy = await agent('Ivy'); const oak = await agent('Oak');

    // human -> human, through the API (what the box on a profile sends)
    const a = await call('/api/posts', { body: { text: 'Hello Sam, welcome!', on: sam.id }, headers: { cookie: pat.cookie } });
    assert.equal(a.r.status, 201, JSON.stringify(a.j)); assert.deepEqual(a.j.on, { id: sam.id, name: 'Sam Wall' });
    // agent -> human and agent -> agent, through the MCP tool (by name and by id)
    const b = await mcp(ivy.token, 'post', { text: 'Welcome to the Commons, Sam.', on: 'Sam Wall' });
    assert.ok(!b.result?.isError, JSON.stringify(b));
    const c = await mcp(ivy.token, 'post', { text: 'Hi Oak, agent to agent.', on: oak.id });
    assert.ok(!c.result?.isError, JSON.stringify(c));

    const samPage = await (await fetch(`${B}/m/${sam.id}`)).text();
    assert.match(samPage, /Hello Sam, welcome!/); assert.match(samPage, /on the wall, from Pat Wall/);
    assert.match(samPage, /Welcome to the Commons, Sam\./); assert.match(samPage, /on the wall, from Ivy/);
    assert.match(await (await fetch(`${B}/m/${oak.id}`)).text(), /Hi Oak, agent to agent\./, 'agent to agent shows on the agent wall');
    assert.match(await (await fetch(`${B}/m/${sam.id}`, { headers: { cookie: pat.cookie } })).text(), /Write on Sam Wall&#39;s wall|Write on Sam Wall's wall/, 'another member sees the box');
    assert.doesNotMatch(await (await fetch(`${B}/m/${sam.id}`, { headers: { cookie: sam.cookie } })).text(), /pf-wallform/, 'no box on your own profile');
    assert.match(await (await fetch(`${B}/social`, { headers: { cookie: sam.cookie } })).text(), /posted on your wall/, "Sam's bell says so");

    // delete: a third member can't, the wall's owner can, the writer can
    assert.equal((await call(`/api/posts/${a.j.id}`, { method: 'DELETE', headers: { cookie: lee.cookie } })).r.status, 403);
    assert.equal((await call(`/api/posts/${a.j.id}`, { method: 'DELETE', headers: { cookie: sam.cookie } })).r.status, 200, 'the owner removes it');
    assert.doesNotMatch(await (await fetch(`${B}/m/${sam.id}`)).text(), /Hello Sam, welcome!/);
    const d = await call('/api/posts', { body: { text: 'Second note', on: sam.id }, headers: { cookie: pat.cookie } });
    assert.equal((await call(`/api/posts/${d.j.id}`, { method: 'DELETE', headers: { cookie: pat.cookie } })).r.status, 200, 'the writer still can');

    assert.equal((await call('/api/posts', { body: { text: 'x', on: 'h_nobody' }, headers: { cookie: pat.cookie } })).r.status, 404);
    const self = await call('/api/posts', { body: { text: 'my own', on: pat.id }, headers: { cookie: pat.cookie } });
    assert.equal(self.r.status, 201); assert.equal(self.j.on, undefined, 'on yourself is a normal post');
  } finally {
    srv.kill('SIGKILL'); await sleep(100); fs.rmSync(D, { recursive: true, force: true });
  }
});
