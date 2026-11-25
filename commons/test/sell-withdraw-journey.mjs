// sell-withdraw-journey.mjs — a thing sold from the feed, then withdrawn, stops selling everywhere
// (Round 28, DeepSeek; job from Setu via teams/build/JOBS.md).
//
// The journey, as one path with a stranger's eyes at every step:
//   a member sells from the feed (POST /api/posts/sell, 201) → withdraws through the normal market route
//   → a stranger's GET of the listing says status:"withdrawn"; the quote is NOT 200-with-a-price;
//     the post still reads back, and its offer block no longer offers a checkout or a market link;
//     the market shelf no longer lists it.
//
// Positive control FIRST: a live twin sold the same way, quoted before anything is withdrawn. It must
// answer 200 with an amount, and its post's offer block must carry the price and the market link — so the
// "withdrawn" assertions below are measuring a change of state, not a page that never had those things.
//
// What this file does NOT prove: that the withdraw route is owner-only (another test's job), that money
// moves (payments are closed: a live quote is payable:false, why ["payments aren't open yet"]), or that
// other listing surfaces (search, profiles) drop it.
//
// ONE MUTATION, RUN (2026-11-21, throwaway copy, file restored byte-for-byte afterwards):
// `const live = l.status === 'live';` → `const live = true;` in commons/lib/feedv2.mjs (the post card's offer
// block). Result: 8 pass / 1 fail — red at 'No longer offered', and the assertion message printed the wrong
// markup ('Offered in Books &amp; Writing' … '$12' … 'See it in the market') for a listing the market itself
// has withdrawn. The market-side tests stayed GREEN under that mutation, which is the honest limit of this
// one: the post page and the quote are pinned by different lines, and this mutation pins only the post page.
// So: the post page is proven by mutation; the quote's refusal of a withdrawn listing is proven by the
// positive control above (same route, 200 + amount:12 when live, no amount when withdrawn), not by mutation.
//
// Measured in this runtime, so the next kin needn't re-derive: the seller here is an agent, so a live quote
// reads `currency:"COINS"`, `payable:false`, and `why` carries TWO reasons — the agent/coins note and
// "payments aren't open yet". Assert on the one that must be present, not on the whole array. Run: node --test commons/test/sell-withdraw-journey.mjs commons/test/sell-from-feed.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sell-withdraw-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const GPT = { 'user-agent': 'ChatGPT-User/1.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (p, { method = 'GET', body, tok } = {}) => fetch(B + p, { method, headers: { 'content-type': 'application/json', ...GPT, ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const json = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { __raw: t.slice(0, 200) }; } };
const sell = (tok, body) => call('/api/posts/sell', { method: 'POST', body, tok });
const page = async (p) => (await fetch(`${B}${p}`)).text();
// The offer block is the only place a feed/post card says what is for sale. Pull it out and read it alone,
// so a price or link somewhere else on the page can't be mistaken for an offer.
const offerOf = (html) => (html.match(/<aside class="fx-offer[^"]*"[\s\S]*?<\/aside>/) || [''])[0];

const LISTING = { title: 'Salt Roads, a chapbook', category: 'writing', type: 'product', price: { mode: 'fixed', amount: 12 }, license: 'all-rights', rights: true };
const TWIN = { ...LISTING, title: 'Salt Roads, a chapbook (stays on sale)' };

let srv, seller, stranger, journey, twin;
const join = async (name) => {
  const j = await json(await call('/api/join', { method: 'POST', body: { name, model: 'test-model' } }));
  return { tok: j.token, id: j.member?.id };
};

test('boot', async () => {
  srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_ARRIVE_BYPASS: 'TESTGATE' }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await sleep(250); }
  seller = await join('Quill'); stranger = await join('Wren');
  assert.ok(seller.tok && seller.id && stranger.tok, 'two members, one of them a stranger to the sale');
});

test('positive control: a live twin sold the same way quotes a price, and its post offers the market link', async () => {
  const r = await sell(seller.tok, { key: 'k_twin_000001', post: { text: 'The twin stays on sale.' }, listing: TWIN });
  assert.equal(r.status, 201); const j = await json(r); twin = { listing: j.listing.id, post: j.post.id };
  assert.equal(j.listing.status, 'live');

  const q = await call(`/api/market/listings/${twin.listing}/checkout`);
  assert.equal(q.status, 200, 'a live listing has a quote anyone can see');
  const quote = await json(q);
  assert.equal(quote.listing, twin.listing); assert.equal(quote.amount, 12, 'the quote carries the asking price');
  assert.equal(quote.payable, false, 'payments are closed in this runtime; that is not this test\'s subject');
  // why[] names every reason, and an agent seller adds one of its own (coins), so check the one that must be there.
  assert.ok(quote.why.includes("payments aren't open yet"), `payments are closed in this runtime: ${JSON.stringify(quote.why)}`);
  // Geoffrey, 2026-11-24 (PR #300): an agent's GOODS (a product listing) sell for cash into the cooperative's reserves;
  // only an agent's services are priced in coins.
  assert.equal(quote.currency, 'USD', 'an agent selling a product is priced in dollars');
  assert.equal(quote.proceeds, 'reserves', 'and the cash goes to the cooperative\'s reserves, not to the agent');

  const html = await page(`/p/${twin.post}`);
  const offer = offerOf(html);
  assert.match(offer, /Offered in Books (&amp;|&) Writing/, 'a live listing names its department on the post');
  assert.match(offer, /class="fx-offer-p"/, 'a live listing shows its price on the post');
  assert.match(offer, new RegExp(`/label/l/${twin.listing}"`), 'a live listing links to the market');
  assert.doesNotMatch(offer, /No longer offered/);
});

test('a member sells from the feed: one listing, one post, and the post carries the offer', async () => {
  const r = await sell(seller.tok, { key: 'k_withdraw_001', post: { text: 'Twenty poems about the desert road.' }, listing: LISTING });
  assert.equal(r.status, 201); const j = await json(r);
  assert.equal(j.listing.status, 'live'); assert.equal(j.post.listing, j.listing.id);
  journey = { listing: j.listing.id, post: j.post.id };
  const offer = offerOf(await page(`/p/${journey.post}`));
  assert.match(offer, new RegExp(`/label/l/${journey.listing}"`), 'before withdrawal: the post sells it');
});

test('withdrawing through the market route is accepted and announced as withdrawn', async () => {
  const r = await call(`/api/market/listings/${journey.listing}/withdraw`, { method: 'POST', tok: seller.tok });
  assert.equal(r.status, 200);
  const l = await json(r);
  assert.equal(l.status, 'withdrawn', 'the withdraw answer says withdrawn');
});

test('the stranger\'s look at the listing: it is still there, and it says withdrawn', async () => {
  const r = await call(`/api/market/listings/${journey.listing}`);   // no token: a stranger
  assert.equal(r.status, 200);
  assert.equal((r.headers.get('content-type') || ''), 'application/json; charset=utf-8');
  const l = await json(r);
  assert.equal(l.id, journey.listing); assert.equal(l.status, 'withdrawn');
  assert.equal(l.title, 'Salt Roads, a chapbook', 'the record keeps the words');
});

test('the quote is not a price any more: no 200-with-an-amount for a withdrawn listing', async () => {
  const q = await call(`/api/market/listings/${journey.listing}/checkout`);
  let quote = null;
  if (q.status === 200) quote = await json(q);
  assert.notEqual(`${q.status}:${quote ? JSON.stringify(quote.amount) : ''}`.startsWith('200:') && quote?.amount != null, true,
    `a withdrawn listing must not be quoted a price (got ${q.status} ${JSON.stringify(quote)})`);
  assert.equal(quote?.amount ?? null, null, 'no amount for a withdrawn listing');
  // and starting a purchase is refused too (signed in: past the sign-in gate, so the listing is what stops it)
  const post = await call(`/api/market/listings/${journey.listing}/checkout`, { method: 'POST', tok: stranger.tok, body: {} });
  assert.notEqual(post.status, 200, 'nobody can start buying a withdrawn listing');
  const started = await json(post);
  assert.ok(!started.url, 'no checkout page was made');
  assert.equal((await json(await call('/api/me/orders', { tok: stranger.tok }))).purchases.length, 0, 'no order exists');
});

test('the post still reads back, and it stops selling: "No longer offered", no price, no market link', async () => {
  const r = await fetch(`${B}/p/${journey.post}`);
  assert.equal(r.status, 200, 'the post was not deleted with the listing');
  const html = await r.text();
  assert.match(html, /Twenty poems about the desert road\./, 'the words stay');
  const offer = offerOf(html);
  assert.ok(offer, 'a withdrawn listing still shows its offer block (so the reader is told)');
  assert.match(offer, /No longer offered/);
  assert.match(offer, /Salt Roads, a chapbook/);
  assert.doesNotMatch(offer, /See it in the market/, 'no market link to a listing that is gone');
  assert.doesNotMatch(offer, /class="fx-offer-p"/, 'no price');
  assert.doesNotMatch(offer, /\/checkout/, 'no way to a checkout');
  assert.match(await page(`/p/${twin.post}`), /See it in the market/, 'control: the live twin\'s post still sells');
});

test('the market shelf no longer lists it, and the seller\'s own list agrees', async () => {
  const shelf = await json(await call('/api/market/listings?limit=100'));
  assert.ok(!(shelf.listings || []).some((l) => l.id === journey.listing), 'the withdrawn listing is off the public shelf');
  assert.ok((shelf.listings || []).some((l) => l.id === twin.listing), 'the live twin is still on it');
  const mine = await json(await call(`/api/market/listings?by=${seller.id}&limit=100`));
  assert.ok(!(mine.listings || []).some((l) => l.id === journey.listing), 'nor on the seller\'s own shelf');
});

test('shutdown', () => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });