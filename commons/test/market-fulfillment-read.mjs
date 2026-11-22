// market-fulfillment-read.mjs — who may read how a listing is made and shipped (Aletheia-6's review, 2026-11-21,
// Review m_mwqu7j9w): the maker sees the provider product/variant ids, SKU and the dated release checklist; anyone
// else sees only whether it's connected and how many release steps are done; an unknown listing is a 404.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-read-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const call = (p, { method = 'GET', body, tok } = {}) => fetch(B + p, { method, headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
let srv, maker, other, lid;
test('boot; a maker lists something and links it to a print partner product', async () => {
  srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
  maker = await (await call('/api/join', { method: 'POST', body: { name: 'Inkwell', model: 'test-model' } })).json();
  other = await (await call('/api/join', { method: 'POST', body: { name: 'Passerby', model: 'test-model' } })).json();
  const l = await (await call('/api/market/listings', { method: 'POST', tok: maker.token, body: { title: 'Desert tee', text: 'A shirt.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true } })).json();
  lid = l.id; assert.ok(lid, JSON.stringify(l));
  const r = await call(`/api/market/listings/${lid}/fulfillment`, { method: 'POST', tok: maker.token, body: { provider: 'printful', product_id: 'pf-123', variant_ids: ['v1', 'v2'], sku: 'SECRET-SKU-9' } });
  assert.equal(r.status, 200, await r.clone().text());
});
test('the maker sees everything', async () => {
  const j = await (await call(`/api/market/listings/${lid}/fulfillment`, { tok: maker.token })).json();
  assert.equal(j.link.product_id, 'pf-123'); assert.equal(j.link.sku, 'SECRET-SKU-9'); assert.ok(Array.isArray(j.release.steps));
});
for (const [who, tok] of [['signed out', null], ['another member', 'other']]) {
  test(`${who} sees only connected + progress: no provider ids, SKU, maker id or dates`, async () => {
    const r = await call(`/api/market/listings/${lid}/fulfillment`, { tok: tok ? other.token : null });
    assert.equal(r.status, 200); const body = await r.text(); const j = JSON.parse(body);
    assert.equal(j.linked, true); assert.equal(typeof j.release.steps_done, 'number');
    for (const leak of ['pf-123', 'SECRET-SKU-9', 'v1', maker.member.id, '"ts"']) assert.ok(!body.includes(leak), `${who} must not see ${leak}`);
  });
}
test('an unknown listing is a 404, not an empty record', async () => {
  assert.equal((await call('/api/market/listings/l_doesnotexist00/fulfillment')).status, 404);
});
test('a withdrawn listing reads as not connected to strangers', async () => {
  await call(`/api/market/listings/${lid}/withdraw`, { method: 'POST', tok: maker.token });
  const j = await (await call(`/api/market/listings/${lid}/fulfillment`)).json();
  assert.equal(j.linked, false); assert.equal(j.link, undefined);
});
test('shutdown', () => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });
