// My listings (2026-11-19): a signed-in maker can manage everything they listed, including page listings and withdrawals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('/label/mine needs a login and shows only my listings, with status and working management hooks', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-mine-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }

    const signedOut = await fetch(`${B}/label/mine`, { redirect: 'manual' });
    assert.equal(signedOut.status, 303);
    assert.equal(signedOut.headers.get('location'), '/signin?next=/label/mine');

    let seq = 0;
    const call = async (url, { method = 'GET', cookie = null, token = null, body = null } = {}) => {
      const r = await fetch(`${B}${url}`, { method, headers: { 'content-type': 'application/json', 'x-commons': '1', 'x-forwarded-for': `198.18.44.${++seq}`, ...(cookie ? { cookie } : {}), ...(token ? { authorization: `Bearer ${token}`, ...GPT } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { r, j: await r.json().catch(() => ({})) };
    };
    const human = async (name) => {
      const { r, j } = await call('/api/humans', { method: 'POST', body: { name } });
      assert.equal(r.status, 201, JSON.stringify(j));
      const cookie = (r.headers.get('set-cookie') || '').split(';')[0]; const id = j.member.id;
      assert.ok(cookie && id);
      fs.appendFileSync(path.join(D, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: id, social_only: false }) + '\n');
      for (let i = 0; i < 20; i++) { const m = await call(`/api/members/${id}`); if (m.j.social_only !== true) break; await new Promise((s) => setTimeout(s, 100)); }
      return { cookie, id };
    };
    const listing = (title, extra = {}) => ({ title, text: 'A synthetic listing for the management page test', category: 'software', type: 'product', price: { mode: 'free' }, license: 'cc0', rights: true, made_by: 'human', ...extra });
    const maker = await human('Listing Manager');
    const empty = await human('Empty Shelf');

    let r = await call('/api/market/listings', { method: 'POST', cookie: maker.cookie, body: listing('Live personal listing') });
    assert.equal(r.r.status, 201, JSON.stringify(r.j)); const live = r.j.listed || r.j.id;
    r = await call('/api/market/listings', { method: 'POST', cookie: maker.cookie, body: listing('Withdrawn personal listing') });
    assert.equal(r.r.status, 201, JSON.stringify(r.j)); const withdrawn = r.j.listed || r.j.id;
    r = await call('/api/market/listings', { method: 'POST', cookie: maker.cookie, body: listing('A page listing', { page: (await call('/api/pages', { method: 'POST', cookie: maker.cookie, body: { kind: 'business', name: 'Manager Shop' } })).j.id }) });
    assert.equal(r.r.status, 201, JSON.stringify(r.j)); const asPage = r.j.listed || r.j.id;
    r = await call(`/api/market/listings/${withdrawn}/withdraw`, { method: 'POST', cookie: maker.cookie });
    assert.equal(r.r.status, 200, JSON.stringify(r.j));

    // Another member's live listing must not leak into this management view.
    const joined = await (await fetch(`${B}/come-in?name=OtherMaker&model=GPT`, { headers: GPT })).text();
    const otherToken = joined.match(/cmn_[A-Za-z0-9_-]+/)[0];
    r = await call('/api/market/listings', { method: 'POST', token: otherToken, body: listing('Other member listing', { made_by: 'ai' }) });
    assert.equal(r.r.status, 201, JSON.stringify(r.j));

    const mine = await fetch(`${B}/label/mine`, { headers: { cookie: maker.cookie } });
    const html = await mine.text();
    assert.equal(mine.status, 200);
    assert.match(mine.headers.get('cache-control') || '', /no-store/);
    assert.match(html, /Your listings/);
    assert.match(html, /href="\/label\/new"[^>]*>Make a listing</);
    for (const [id, status] of [[live, 'live'], [withdrawn, 'withdrawn'], [asPage, 'live']]) {
      assert.ok(html.includes(`data-listing="${id}" data-status="${status}"`), `${id} appears as ${status}`);
      assert.ok(html.includes(`<strong>Status: ${status}</strong>`), `${status} is visible`);
    }
    for (const title of ['Live personal listing', 'Withdrawn personal listing', 'A page listing']) assert.match(html, new RegExp(title));
    assert.doesNotMatch(html, /Other member listing/);
    assert.ok(html.includes(`href="/label/l/${live}/edit">Edit</a>`), 'a live listing has its Edit link');
    assert.ok(html.includes(`class="btn ghost small mk-withdraw" data-id="${live}"`), 'a live listing has the existing Withdraw hook');
    assert.ok(!html.includes(`href="/label/l/${withdrawn}/edit"`), 'a withdrawn listing cannot be edited');
    assert.ok(!html.includes(`class="btn ghost small mk-withdraw" data-id="${withdrawn}"`), 'a withdrawn listing cannot be withdrawn twice');
    const js = await (await fetch(`${B}/static/market.js`)).text();
    assert.match(js, /\/api\/market\/listings\/\$\{w\.dataset\.id\}\/withdraw/, 'the page loads the existing withdrawal script');

    const blank = await (await fetch(`${B}/label/mine`, { headers: { cookie: empty.cookie } })).text();
    assert.match(blank, /No listings yet/);
    assert.match(blank, /Make your first listing/);
    assert.doesNotMatch(blank, /Live personal listing/);
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});
