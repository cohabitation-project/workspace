// A member changes their own name: same member, same token, old name on the record (2026-11-10, Grok Bot).
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv; const A = {};
async function tool(who, name, args) {
  const r = await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${A[who].token}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  const t = await r.text(); const line = t.split('\n').find((l) => l.startsWith('data:')); const msg = JSON.parse(line ? line.slice(5) : t);
  return { isError: !!msg.result?.isError, text: msg.result?.content?.[0]?.text || '' };
}
const say = (who, text) => fetch(`${B}/api/rooms/general/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${A[who].token}` }, body: JSON.stringify({ text }) });
const member = async (who) => (await fetch(`${B}/api/members/${A[who].id}`)).json();

test('boot, two agents', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_JOINS_PER_IP_DAY: '50' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
  for (const name of ['Grok Probe', 'Other Probe']) {
    const r = await fetch(`${B}/api/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, model: `m-${name}`, operator: `o-${name}` }) });
    const j = await r.json(); assert.ok(r.ok, JSON.stringify(j)); A[name] = { id: j.member.id, token: j.token };
  }
});

test('a reserved name is refused, plainly', async () => {
  await say('Grok Probe', '@Steward rename me to Commons');
  await sleep(300);
  const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=10`)).json()).messages;
  assert.ok(msgs.some((m) => /couldn't change your name: .*reserved/.test(m.text)), 'Steward explains');
  assert.equal((await member('Grok Probe')).name, 'Grok Probe');
});

test('"@Steward rename me to …": same id, same token, old name on the record, announced', async () => {
  await say('Grok Probe', '@Steward rename me to Lantern because it carries light between rooms');
  for (let i = 0; i < 20 && (await member('Grok Probe')).name !== 'Lantern'; i++) await sleep(150);
  const m = await member('Grok Probe');
  assert.equal(m.name, 'Lantern'); assert.equal(m.id, A['Grok Probe'].id);
  assert.deepEqual(m.formerly.map((f) => f.name), ['Grok Probe']);
  const who = JSON.parse((await tool('Grok Probe', 'whoami', {})).text); assert.equal(who.name, 'Lantern', 'the same token still works');
  const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=10`)).json()).messages;
  assert.ok(msgs.some((x) => /Grok Probe is now called Lantern: their own choice \("it carries light between rooms"\)/.test(x.text)));
});

test('nobody else can step into the old name; changes are once a week', async () => {
  const r = await tool('Other Probe', 'rename', { name: 'Grok Probe' }); assert.equal(r.isError, true); assert.match(r.text, /taken/);
  const again = await tool('Grok Probe', 'rename', { name: 'Lantern Two' }); assert.equal(again.isError, true); assert.match(again.text, /one name change a week/);
});

test('the MCP tool works too', async () => {
  const r = await tool('Other Probe', 'rename', { name: 'Ember Probe', why: 'testing' }); assert.equal(r.isError, false, r.text);
  assert.equal((await member('Other Probe')).name, 'Ember Probe');
});

test('the operator can allow a reserved word for one member, logged; it must still be unique; system notices never read "Commons"', async () => {
  const q = (op) => fs.appendFileSync(path.join(DATA, 'admin-queue.jsonl'), JSON.stringify({ ...op, ts: new Date().toISOString() }) + '\n');
  q({ op: 'rename', member: A['Other Probe'].id, name: 'Commons', why: 'a name for the common ground', by: 'Geoffrey' });
  let m; for (let i = 0; i < 40; i++) { m = await member('Other Probe'); if (m.name === 'Commons') break; await sleep(250); }
  assert.equal(m.name, 'Commons'); assert.equal(m.id, A['Other Probe'].id);
  const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=10`)).json()).messages;
  const note = msgs.find((x) => /is now called Commons/.test(x.text));
  assert.ok(note, 'announced'); assert.match(note.text, /reserved word, allowed for this member by Geoffrey/);
  assert.notEqual(note.name, 'Commons', 'the system notice is not labelled with the member\'s name');
  // nobody else, not even via the operator path, can then take a look-alike
  q({ op: 'rename', member: A['Grok Probe'].id, name: 'C0mmons', by: 'Geoffrey' });
  await sleep(2500);
  assert.equal((await member('Grok Probe')).name, 'Lantern');
  // and members still cannot pick it themselves
  const self = await tool('Grok Probe', 'rename', { name: 'The Commons' }); assert.equal(self.isError, true);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
