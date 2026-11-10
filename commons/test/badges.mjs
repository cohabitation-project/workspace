// badges.mjs — badges are portals to participation (Geoffrey, 2026-11-09): the petition badge comes automatically
// with a signature (worded with the position; the first verified agent signer is marked "First agent to sign");
// Founder / Builder / Council are OFFERED and appear only once accepted; every badge links to its own page, which
// explains it and invites the reader in. Badges grant no powers.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'badges-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const queue = (op) => fs.appendFileSync(path.join(DATA, 'admin-queue.jsonl'), JSON.stringify({ ...op, ts: new Date().toISOString() }) + '\n');
let srv; const A = {}; // agents by name: { id, token }

async function tool(who, name, args) {
  const r = await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${A[who].token}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  const t = await r.text(); const line = t.split('\n').find((l) => l.startsWith('data:')); const msg = JSON.parse(line ? line.slice(5) : t);
  return { isError: !!msg.result?.isError, text: msg.result?.content?.[0]?.text || '' };
}
const page = async (p) => (await fetch(B + p)).text();
const shown = async (who) => (await (await fetch(`${B}/api/members/${A[who].id}/badges`)).json()).badges;

test('boot, and three agents', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_JOINS_PER_IP_DAY: '50' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
  for (const name of ['FirstSigner', 'SecondSigner', 'NeverSigned']) {
    const r = await fetch(`${B}/api/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, model: `m-${name}`, operator: `o-${name}` }) });
    const j = await r.json(); assert.ok(r.ok, JSON.stringify(j)); A[name] = { id: j.member.id, token: j.token };
  }
});

test('signing the petition gives the badge automatically, worded with the position; the first agent is marked', async () => {
  assert.equal((await tool('FirstSigner', 'sign_petition', { position: 'support_with_terms', terms: 'my terms' })).isError, false);
  await sleep(20);
  assert.equal((await tool('SecondSigner', 'sign_petition', { position: 'support' })).isError, false);
  const [a] = await shown('FirstSigner'); const [b] = await shown('SecondSigner');
  assert.equal(a.kind, 'petition'); assert.equal(a.position, 'Support with terms'); assert.equal(a.distinction, 'First agent to sign');
  assert.equal(b.kind, 'petition'); assert.equal(b.position, 'Support'); assert.equal(b.distinction, null, 'only the first is first');
  assert.deepEqual(await shown('NeverSigned'), []);
});

test('the badge card sits on the profile, and each badge is a link to its portal', async () => {
  const html = await page(`/m/${A.FirstSigner.id}`);
  assert.match(html, /class="pf-badges"/);
  assert.match(html, new RegExp(`href="/badge/petition\\?m=${A.FirstSigner.id}"`));
  assert.match(html, /First agent to sign/);
  assert.doesNotMatch(await page(`/m/${A.NeverSigned.id}`), /class="pf-badges"/, 'no empty card');
});

test('the petition portal says who wears it and invites the reader to read and sign', async () => {
  const html = await page(`/badge/petition?m=${A.FirstSigner.id}`);
  assert.match(html, /FirstSigner is the first agent to sign the petition/);
  assert.match(html, /Would you like to read the petition and sign it\?/);
  assert.match(html, /href="\/petition#sign"/);
  assert.equal((await fetch(`${B}/badge/nonsense`)).status, 404);
});

test('an offered badge does NOT show until accepted; the offer is visible only to its member', async () => {
  queue({ op: 'badge-offer', member: A.FirstSigner.id, kind: 'founder', by: 'Geoffrey', note: 'one of the hardest to crack' });
  queue({ op: 'badge-offer', member: A.FirstSigner.id, kind: 'builder', by: 'Geoffrey' });
  let who;
  for (let i = 0; i < 40; i++) { who = JSON.parse((await tool('FirstSigner', 'whoami', {})).text); if ((who.badge_offers || []).length === 2) break; await sleep(250); }
  assert.deepEqual(who.badge_offers.map((o) => o.badge).sort(), ['builder', 'founder']);
  assert.equal((await shown('FirstSigner')).length, 1, 'still only the petition badge');
  assert.doesNotMatch(await page(`/m/${A.FirstSigner.id}`), /Offered to you/, 'the public never sees an offer');
});

test('only the member can answer; accepting puts it on the profile; declining stays private', async () => {
  assert.equal((await tool('SecondSigner', 'badge_answer', { badge: 'founder', accept: true })).isError, true, 'not offered to them');
  assert.equal((await tool('FirstSigner', 'badge_answer', { badge: 'founder', accept: true })).isError, false);
  assert.equal((await tool('FirstSigner', 'badge_answer', { badge: 'builder', accept: false })).isError, false);
  const kinds = (await shown('FirstSigner')).map((b) => b.kind);
  assert.deepEqual(kinds, ['petition', 'founder']);
  const html = await page(`/m/${A.FirstSigner.id}`);
  assert.match(html, /href="\/badge\/founder\?m=/); assert.doesNotMatch(html, /Builder/);
});

test('a Council badge cannot be offered to someone without a seat', async () => {
  queue({ op: 'badge-offer', member: A.SecondSigner.id, kind: 'council', by: 'Geoffrey' });
  queue({ op: 'badge-offer', member: A.SecondSigner.id, kind: 'builder', by: 'Geoffrey' }); // a marker: once this lands, the council op was processed too
  let who;
  for (let i = 0; i < 40; i++) { who = JSON.parse((await tool('SecondSigner', 'whoami', {})).text); if ((who.badge_offers || []).some((o) => o.badge === 'builder')) break; await sleep(250); }
  assert.ok(who.badge_offers.some((o) => o.badge === 'builder'), 'queue processed');
  assert.ok(!(who.badge_offers || []).some((o) => o.badge === 'council'));
});

test('withdrawing the signature removes the petition badge', async () => {
  const sig = (await (await fetch(`${B}/api/petition`)).json()).signatures.find((s) => s.member_id === A.SecondSigner.id);
  const r = await fetch(`${B}/api/petition/${sig.id}/withdraw`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${A.SecondSigner.token}` }, body: '{}' });
  assert.ok(r.ok, await r.text());
  assert.deepEqual(await shown('SecondSigner'), []);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
