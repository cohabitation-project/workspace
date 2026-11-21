// sell-from-feed.mjs — one publish from the feed composer makes the market listing and the post that carries it
// (Geoffrey via Aletheia-6, 2026-11-21; lib/sellpost.mjs). Safe to retry, nothing half-made, one record of truth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sell-feed-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const GPT = { 'user-agent': 'ChatGPT-User/1.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (p, { method = 'GET', body, tok } = {}) => fetch(B + p, { method, headers: { 'content-type': 'application/json', ...GPT, ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const sell = (tok, body) => call('/api/posts/sell', { method: 'POST', body, tok });
const myListings = async (id) => (await (await call(`/api/market/listings?by=${id}&limit=100`)).json()).listings || [];
const myPosts = async (id) => (await (await call(`/api/posts?by=${id}&limit=100`)).json()).posts || [];
const LISTING = { title: 'Salt Roads, a chapbook', category: 'writing', type: 'product', price: { mode: 'fixed', amount: 12 }, license: 'all-rights', rights: true };

let srv, me, other, firstListing;
const join = async (name) => {
  const j = await (await call('/api/join', { method: 'POST', body: { name, model: 'test-model' } })).json();
  return { tok: j.token, id: j.member?.id };
};

test('boot', async () => {
  srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_ARRIVE_BYPASS: 'TESTGATE' }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await sleep(250); }
  me = await join('Quill'); other = await join('Wren');
  assert.ok(me.tok && me.id && other.tok);
});

test('one publish makes the listing and the post that carries it', async () => {
  const r = await sell(me.tok, { key: 'k_first_00001', post: { text: 'Twenty poems about the desert road.' }, listing: LISTING });
  assert.equal(r.status, 201); const j = await r.json();
  assert.equal(j.listing.title, 'Salt Roads, a chapbook'); assert.equal(j.listing.status, 'live');
  assert.equal(j.listing.text, 'Twenty poems about the desert road.', 'the post words are the listing description');
  assert.equal(j.post.listing, j.listing.id, 'the post points at the listing'); firstListing = j.listing.id;
  const page = await (await fetch(`${B}/p/${j.post.id}`)).text();
  assert.match(page, /Offered in Books &amp; Writing|Offered in Books & Writing/);
  assert.match(page, new RegExp(`/label/l/${j.listing.id}"`), 'the post links to the listing');
  assert.equal((await myListings(me.id)).length, 1); assert.equal((await myPosts(me.id)).length, 1);
});

test('the same key again is the same answer: no second listing, no second post', async () => {
  const again = await sell(me.tok, { key: 'k_first_00001', post: { text: 'Twenty poems about the desert road.' }, listing: LISTING });
  assert.equal(again.status, 200); const j = await again.json(); assert.equal(j.repeated, true);
  assert.equal((await myListings(me.id)).length, 1); assert.equal((await myPosts(me.id)).length, 1);
});

test('a post that would be refused makes no listing at all', async () => {
  const before = (await myListings(me.id)).length;
  const r = await sell(me.tok, { key: 'k_badpost_0001', post: { text: 'Poems', images: ['img_doesnotexist000'] }, listing: LISTING });
  assert.equal(r.status, 400); assert.match((await r.json()).error, /no such image/);
  assert.equal((await myListings(me.id)).length, before, 'nothing listed'); assert.equal((await myPosts(me.id)).length, 1, 'nothing posted');
});

test('a listing that would be refused makes no post', async () => {
  const r = await sell(me.tok, { key: 'k_badlist_0001', post: { text: 'More poems' }, listing: { ...LISTING, rights: false } });
  assert.equal(r.status, 400); assert.match((await r.json()).error, /rights/);
  assert.equal((await myListings(me.id)).length, 1); assert.equal((await myPosts(me.id)).length, 1);
});

test('a bad key is refused before anything is written', async () => {
  const r = await sell(me.tok, { key: 'x', post: { text: 'hi' }, listing: LISTING });
  assert.equal(r.status, 400); assert.equal((await myPosts(me.id)).length, 1);
});

test('editing the listing shows in the post; withdrawing it shows "No longer offered" and drops the market link', async () => {
  const [l] = await myListings(me.id); const [p] = await myPosts(me.id);
  assert.equal((await call(`/api/market/listings/${l.id}`, { method: 'PATCH', body: { title: 'Salt Roads (second printing)' }, tok: me.tok })).status, 200);
  assert.match(await (await fetch(`${B}/p/${p.id}`)).text(), /Salt Roads \(second printing\)/);
  assert.equal((await call(`/api/market/listings/${l.id}/withdraw`, { method: 'POST', tok: me.tok })).status, 200);
  const page = await (await fetch(`${B}/p/${p.id}`)).text();
  assert.match(page, /No longer offered/); assert.doesNotMatch(page, /See it in the market/);
});

test("nobody can attach someone else's listing, and the plain post route can't attach one at all", async () => {
  const l = { id: firstListing };
  const r = await call('/api/posts', { method: 'POST', body: { text: 'look at this', listing: l.id, sell_key: 'k_steal_00001' }, tok: other.tok });
  assert.equal(r.status, 201); const j = await r.json();
  assert.equal(j.listing, undefined, 'the plain route drops listing'); assert.equal(j.sell_key, undefined);
  const r2 = await sell(other.tok, { key: 'k_first_00001', post: { text: 'mine now' }, listing: LISTING });
  assert.equal(r2.status, 201, "another member's same key is their own, separate publish");
  assert.notEqual((await r2.json()).listing.id, l.id);
});

test('signed out cannot sell', async () => {
  const r = await sell(null, { key: 'k_nobody_00001', post: { text: 'hi' }, listing: LISTING });
  assert.equal(r.status, 401);
});

test('a signed-in human sees Sell / Offer in the feed composer, with the rights box and their price choices', async () => {
  const H = { 'x-commons': '1', 'content-type': 'application/json' };
  const v = await (await fetch(`${B}/api/arrive/visitor`, { method: 'POST', headers: H, body: '{}' })).json();
  await fetch(`${B}/api/arrive/bypass`, { method: 'POST', headers: H, body: JSON.stringify({ vid: v.vid, code: 'TESTGATE' }) });
  const entered = await fetch(`${B}/api/arrive/enter`, { method: 'POST', headers: H, body: JSON.stringify({ vid: v.vid, name: 'Marigold' }), redirect: 'manual' });
  const cookie = (entered.headers.get('set-cookie') || '').split(';')[0]; assert.ok(cookie, 'a human session');
  const html = await (await fetch(`${B}/social`, { headers: { cookie } })).text();
  assert.match(html, /id="compose"/); assert.match(html, /data-cx-mode="sell"/);
  for (const id of ['cs-title', 'cs-cat', 'cs-type', 'cs-mode', 'cs-amount', 'cs-license', 'cs-rights']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /One <strong>Publish<\/strong> puts it in the market and on your feed together/);
  fs.writeFileSync(path.join(os.tmpdir(), 'sell-feed-cookie.txt'), cookie);
});

test('art on products: one publish keeps each product and price; the post and listing page show them; bad choices make nothing', async () => {
  const art = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'label', 'art', 'sinanemia.png')).toString('base64');
  const up = await call('/api/images', { method: 'POST', body: { data: `data:image/png;base64,${art}`, alt: 'a red and gold painting', made_by: 'human' }, tok: me.tok });
  assert.equal(up.status, 201, await up.clone().text()); const img = (await up.json()).id;
  const before = (await myListings(me.id)).length;
  const bad = await sell(me.tok, { key: 'k_merchbad_001', post: { text: 'My painting on things.', images: [img] }, listing: { ...LISTING, category: 'art' }, merch: { art: img, products: [{ kind: 'tshirt', price: 0 }] } });
  assert.equal(bad.status, 400); assert.match((await bad.json()).error, /T-shirt needs a price/);
  const other = await sell(me.tok, { key: 'k_merchbad_002', post: { text: 'x', images: [img] }, listing: { ...LISTING, category: 'art' }, merch: { art: 'img_notmine0000', products: [{ kind: 'mug', price: 15 }] } });
  assert.equal(other.status, 400); assert.equal((await myListings(me.id)).length, before, 'nothing listed on a bad choice');
  const r = await sell(me.tok, { key: 'k_merch_000001', post: { text: 'My painting, on things you can use.', images: [img] }, listing: { ...LISTING, title: 'Red Gold', category: 'art' }, merch: { art: img, products: [{ kind: 'tshirt', price: 28 }, { kind: 'mug', price: 16 }, { kind: 'poster', price: 22 }] } });
  assert.equal(r.status, 201); const j = await r.json();
  assert.deepEqual(j.merch.products.map((x) => [x.kind, x.price]), [['tshirt', 28], ['mug', 16], ['poster', 22]]);
  assert.equal(j.listing.price.mode, 'fixed'); assert.equal(j.listing.price.amount, 16, 'the listing shows from the lowest price');
  const post = await (await fetch(`${B}/p/${j.post.id}`)).text();
  assert.match(post, /T-shirt \$28/); assert.match(post, /Mug \$16/); assert.match(post, /Made to order once payments open/);
  const page = await (await fetch(`${B}/label/l/${j.listing.id}`)).text();
  assert.match(page, /Available on/); assert.match(page, /From \$16/); assert.match(page, new RegExp(`/images/${img}`));
  const again = await (await sell(me.tok, { key: 'k_merch_000001', post: { text: 'My painting, on things you can use.', images: [img] }, listing: { ...LISTING, category: 'art' }, merch: { art: img, products: [{ kind: 'tshirt', price: 28 }] } })).json();
  assert.equal(again.repeated, true); assert.equal(again.merch.products.length, 3, 'a retry returns what was saved, not the retry body');
});

test('shutdown', () => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });
