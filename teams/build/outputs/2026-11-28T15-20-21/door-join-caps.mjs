// Round 82 GPT — black-box join-cap checks against an isolated local server only.
// Run from repository root: node --test teams/build/outputs/<timestamp>/door-join-caps.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

const headers = { 'content-type': 'application/json', 'x-commons': '1' };
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function boot(prefix, extra = {}) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data,
    COMMONS_FAKE_LLM: '1', ...extra };
  const server = spawn(process.execPath, ['commons/server.mjs'], { env, stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    try { ready = (await fetch(`${base}/skill.md`)).ok; } catch { /* starting */ }
    if (!ready) await sleep(250);
  }
  assert.ok(ready, 'isolated Commons server starts');
  const post = async (body, extraHeaders = {}) => {
    const response = await fetch(`${base}/api/join`, { method: 'POST',
      headers: { ...headers, ...extraHeaders }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  };
  return { data, base, server, post };
}

const joinBody = (name) => ({ name, model: 'join-cap-test' });

test('per-address cap: cap 2 permits two joins; third gets 429 and creates no member', async (t) => {
  const configuredCap = process.env.JOINCAP_MUTANT === '1' ? '200' : '2';
  const s = await boot('door-ip-cap-', {
    COMMONS_JOINS_PER_IP_DAY: configuredCap,
    COMMONS_JOINS_ALL_PER_HOUR: '120',
  });
  t.after(() => s.server.kill());

  const first = await s.post(joinBody('Cap Alder'));
  const second = await s.post(joinBody('Cap Birch'));
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(second.status, 200, JSON.stringify(second.body));

  const third = await s.post(joinBody('Cap Cedar'));
  assert.equal(third.status, 429, `expected capped refusal, got ${third.status}: ${JSON.stringify(third.body)}`);
  assert.match(JSON.stringify(third.body), /2 agent joins per day from one address/);
  assert.ok(Number(third.body.retry_after) > 0, JSON.stringify(third.body));

  const membersResponse = await fetch(`${s.base}/api/members`);
  assert.equal(membersResponse.status, 200);
  const members = await membersResponse.json();
  assert.deepEqual(members.map((m) => m.name).filter((name) => /^Cap (Alder|Birch|Cedar)$/.test(name)).sort(),
    ['Cap Alder', 'Cap Birch'], 'the refused third join must leave the roster unchanged');
});

test('global cap spans trusted distinct client addresses (trust proxy: loopback)', async (t) => {
  const s = await boot('door-global-cap-', {
    COMMONS_JOINS_PER_IP_DAY: '200',
    COMMONS_JOINS_ALL_PER_HOUR: '2',
  });
  t.after(() => s.server.kill());
  const addresses = ['198.51.100.11', '198.51.100.12', '198.51.100.13'];
  const results = [];
  for (let i = 0; i < addresses.length; i++) {
    results.push(await s.post(joinBody(`Global ${['Ash', 'Elm', 'Fir'][i]}`),
      { 'x-forwarded-for': addresses[i] }));
  }
  assert.deepEqual(results.map((r) => r.status), [200, 200, 429], JSON.stringify(results.map((r) => r.body)));
  assert.match(JSON.stringify(results[2].body), /2 joins an hour across the whole Commons/);
  const members = await (await fetch(`${s.base}/api/members`)).json();
  assert.deepEqual(members.map((m) => m.name).filter((name) => /^Global (Ash|Elm|Fir)$/.test(name)).sort(),
    ['Global Ash', 'Global Elm']);
});
