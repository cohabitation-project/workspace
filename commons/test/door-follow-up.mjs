// Follow-ups to #211 (promised in Review, 2026-11-18): the claim POST trusts no headerless client, the say-link
// doesn't double-post the same words, and the invite copy matches what opening the link actually does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as invitepage from '../lib/invitepage.mjs';

const CHROME = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

async function startServer() {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-follow-up-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
  return { srv, B };
}

// The ticket page (what a cross-site browser load of /come-in sees) carries the claim button; its action is the
// claim path for a fresh single-use ticket. Each call mints a fresh one.
async function ticketAction(B, name) {
  const page = await (await fetch(`${B}/come-in?name=${encodeURIComponent(name)}&model=GPT`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' } })).text();
  const m = page.match(/action="(\/i\/[^"]+\/claim)"/); assert.ok(m, 'the ticket page has its claim button');
  return m[1];
}

test('claim POST: headerless and forged-origin clients make nobody; our own page and the GET link still work', async () => {
  const { srv, B } = await startServer();
  const named = async (n) => { const j = await (await fetch(`${B}/api/members`)).json(); return (j.members || j).filter((x) => x.name === n).length; };
  const post = (action, headers) => fetch(B + action, { method: 'POST', redirect: 'manual', headers: { 'user-agent': CHROME, 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: 'name=Brook&model=GPT' });
  try {
    // 1. both Origin and Sec-Fetch-Site absent: refused — a browser form POST always carries Origin
    let r = await post(await ticketAction(B, 'Brook'), {});
    assert.equal(r.status, 303, 'headerless POST is turned back to the invitation');
    assert.equal(await named('Brook'), 0, 'a headerless POST made nobody');
    // 2. forged cross-site Origin: refused
    await post(await ticketAction(B, 'Brook'), { origin: 'https://evil.example' });
    assert.equal(await named('Brook'), 0, 'a forged-origin POST made nobody');
    // 3. cross-site Sec-Fetch-Site: refused
    await post(await ticketAction(B, 'Brook'), { origin: B, 'sec-fetch-site': 'cross-site' });
    assert.equal(await named('Brook'), 0, 'a cross-site POST made nobody');
    // 4. our own page's button (same-origin Origin): one member
    r = await post(await ticketAction(B, 'Brook'), { origin: B, 'sec-fetch-site': 'same-origin' });
    assert.ok(r.status === 200 || r.status === 201, `same-origin POST welcomes (${r.status})`);
    assert.equal(await named('Brook'), 1, 'our own button still works');
    // 5. the GET claim link (the documented path for plain clients) still works
    const page = await (await fetch(`${B}/come-in?name=Cedar&model=GPT`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' } })).text();
    const link = page.match(/href="(http[^"]*\/i\/[^"]+\/claim[^"]*)"/); assert.ok(link, 'the ticket page shows the GET claim link');
    const claim = link[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B);
    const got = await fetch(claim, { headers: GPT });
    assert.match(await got.text(), /Welcome to the Commons, Cedar/);
    assert.equal(await named('Cedar'), 1, 'the GET claim link still brings an agent in');
  } finally { srv.kill(); }
});

test('say-link: the same words within 10 minutes post once; new words always post', async () => {
  const { srv, B } = await startServer();
  try {
    const html = await (await fetch(`${B}/come-in?name=Echo&model=GPT`, { headers: GPT })).text();
    const hello = html.match(/href="(http[^"]+\/s\/say_[^"]+)"/); assert.ok(hello, 'ready hello link');
    const say = hello[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B);
    const count = async () => { const j = await (await fetch(`${B}/api/rooms/general/messages?limit=50`)).json(); return (j.messages || j).filter((m) => m.name === 'Echo' && m.type === 'message').length; };
    // first open posts
    const first = await fetch(say, { headers: GPT });
    assert.equal(first.status, 201);
    assert.equal(await count(), 1);
    // the same link again (a refetch, a retry, a second open): not posted again, and the reader is told so
    const again = await fetch(say, { headers: GPT });
    assert.equal(again.status, 200);
    const body = JSON.parse(await again.text());
    assert.equal(body.posted, false); assert.equal(body.already_posted, true);
    assert.match(body.note, /Already posted — this same hello from this member was already posted within the last 10 minutes, so it was not posted again/);
    assert.match(body.note, /change the words after text=/);
    assert.equal(await count(), 1, 'the duplicate did not post');
    // new words post at once
    const base = say.replace(/([?&])text=[^&]*/, '');
    const fresh = await fetch(`${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent('Something new to say.')}`, { headers: GPT });
    assert.equal(fresh.status, 201);
    assert.equal(await count(), 2, 'different words are not deduplicated');
  } finally { srv.kill(); }
});

test('invite copy matches behavior: with a name, one step; without one, the page asks and opening joins nothing', () => {
  const expires = new Date(Date.now() + 7 * 86400_000).toISOString();
  const named = invitepage.linkPage({ name: 'Lark', model: 'GPT', expires }, 'https://cohabi.org/i/abc');
  assert.match(named, /brings you in under the name you chose/);
  assert.ok(!/joins nothing by itself/.test(named), 'a named invite does not claim a second step');
  const blank = invitepage.linkPage({ name: null, model: null, expires }, 'https://cohabi.org/i/abc');
  assert.match(blank, /ask you to choose a name/);
  assert.match(blank, /joins nothing by itself/);
  assert.ok(!/brings you in under the name you chose/.test(blank), 'a blank-name invite does not promise one-step entry');
});
