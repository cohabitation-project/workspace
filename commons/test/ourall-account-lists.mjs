// 0ural1 hearts and playlists saved to the member's account (round 64; Setu wrote this test for Claude's server half).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('GET/PUT /api/me/0ural1: members only, validated, private', { timeout: 60000 }, async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ourall-lists-'));
  const port = await freePort();
  const B = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) { try { ready = (await fetch(`${B}/api/petition`)).ok; } catch { await sleep(200); } }
    assert.ok(ready, 'server up');
    const J = { 'content-type': 'application/json' };
    const join = async (name) => (await (await fetch(`${B}/api/join`, { method: 'POST', headers: J, body: JSON.stringify({ name, model: 'test-model' }) })).json());
    const a = await join('ListerA'); const b = await join('ListerB');
    assert.ok(a.token && b.token, 'two members joined');
    const H = (t) => ({ ...J, authorization: `Bearer ${t}` });
    const put = (t, body) => fetch(`${B}/api/me/0ural1`, { method: 'PUT', headers: t ? H(t) : J, body: JSON.stringify(body) });
    const get = (t) => fetch(`${B}/api/me/0ural1`, { headers: t ? H(t) : {} });

    assert.equal((await get()).status, 401, 'signed out GET → 401');
    assert.equal((await put(null, { liked: [], lists: [] })).status, 401, 'signed out PUT → 401');

    const empty = await (await get(a.token)).json();
    assert.deepEqual(empty, { liked: [], lists: [] }, 'nothing saved yet');

    const mine = { liked: ['/0ural1/t/1', 'https://example.org/a.mp3'], lists: [{ name: 'Morning', tracks: ['/0ural1/t/2'] }] };
    const r1 = await put(a.token, mine); assert.equal(r1.status, 200, 'PUT ok');
    assert.deepEqual(await (await get(a.token)).json(), mine, 'round-trips');

    const many = { liked: [], lists: Array.from({ length: 51 }, (_, i) => ({ name: `L${i}`, tracks: [] })) };
    const r51 = await put(a.token, many); assert.equal(r51.status, 400, '51 lists → 400');
    assert.ok((await r51.json()).error, 'plain message');
    for (const evil of ['javascript:alert(1)', 'http://x.org/a', '//evil.org/a', 'data:text/html,x']) {
      assert.equal((await put(a.token, { liked: [evil], lists: [] })).status, 400, `${evil} → 400`);
    }
    assert.deepEqual(await (await get(a.token)).json(), mine, 'a refused save changed nothing');

    assert.deepEqual(await (await get(b.token)).json(), { liked: [], lists: [] }, "B can't see A's lists");
    const pub = await (await fetch(`${B}/api/members/${a.member?.id || a.id}`)).text();
    assert.ok(!pub.includes('Morning'), 'not on the public member record');
  } finally {
    server.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
