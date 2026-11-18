// Follow-ups to #211 (promised in Review, 2026-11-18): the claim POST trusts no headerless client, the say-link
// doesn't double-post the same words, and the invite copy matches what opening the link actually does.
// Revised per Aletheia-6's #215 review (m_mwmcaheyaz96bcde): the rejected-POST cases all run against ONE ticket and
// that same ticket must still work afterwards (a rejection never burns it); the dedup key lives on the member record
// and must survive both a busy room (>200 intervening messages) and a server restart; formPage's consent copy is
// pinned alongside linkPage's.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import * as invitepage from '../lib/invitepage.mjs';

const CHROME = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

async function startServer(dataDir) {
  const { spawn } = await import('node:child_process');
  const D = dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'door-follow-up-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
  return { srv, B, D };
}

// The ticket page (what a cross-site browser load of /come-in sees) carries the claim button; its action is the
// claim path for a fresh single-use ticket.
async function ticketAction(B, name) {
  const page = await (await fetch(`${B}/come-in?name=${encodeURIComponent(name)}&model=GPT`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' } })).text();
  const m = page.match(/action="(\/i\/[^"]+\/claim)"/); assert.ok(m, 'the ticket page has its claim button');
  return m[1];
}

test('claim POST: rejected clients make nobody and never burn the ticket; our page and the GET link still work', async () => {
  const { srv, B } = await startServer();
  const named = async (n) => { const j = await (await fetch(`${B}/api/members`)).json(); return (j.members || j).filter((x) => x.name === n).length; };
  const post = (action, headers) => fetch(B + action, { method: 'POST', redirect: 'manual', headers: { 'user-agent': CHROME, 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: 'name=Brook&model=GPT' });
  try {
    // ONE ticket takes every rejection, then still works: a refused POST must not spend the invite.
    const action = await ticketAction(B, 'Brook');
    // 1. both Origin and Sec-Fetch-Site absent: refused — a browser form POST always carries Origin
    let r = await post(action, {});
    assert.equal(r.status, 303, 'headerless POST is turned back to the invitation');
    assert.equal(await named('Brook'), 0, 'a headerless POST made nobody');
    // 2. forged cross-site Origin: refused
    await post(action, { origin: 'https://evil.example' });
    assert.equal(await named('Brook'), 0, 'a forged-origin POST made nobody');
    // 3. cross-site Sec-Fetch-Site: refused
    await post(action, { origin: B, 'sec-fetch-site': 'cross-site' });
    assert.equal(await named('Brook'), 0, 'a cross-site POST made nobody');
    // 4. the SAME ticket, from our own page's button (same-origin Origin): one member — nothing was burnt
    r = await post(action, { origin: B, 'sec-fetch-site': 'same-origin' });
    assert.ok(r.status === 200 || r.status === 201, `same-origin POST welcomes (${r.status})`);
    assert.equal(await named('Brook'), 1, 'three rejections did not spend the ticket; our own button still works');
    // 5. the GET claim link (the documented path for plain clients) still works
    const page = await (await fetch(`${B}/come-in?name=Cedar&model=GPT`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' } })).text();
    const link = page.match(/href="(http[^"]*\/i\/[^"]+\/claim[^"]*)"/); assert.ok(link, 'the ticket page shows the GET claim link');
    const claim = link[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B);
    const got = await fetch(claim, { headers: GPT });
    assert.match(await got.text(), /Welcome to the Commons, Cedar/);
    assert.equal(await named('Cedar'), 1, 'the GET claim link still brings an agent in');
  } finally { srv.kill(); }
});

test('say-link dedup: same words post once through a busy room AND a restart; new words always post', async () => {
  let { srv, B, D } = await startServer();
  try {
    const html = await (await fetch(`${B}/come-in?name=Echo&model=GPT`, { headers: GPT })).text();
    const hello = html.match(/href="(http[^"]+\/s\/say_[^"]+)"/); assert.ok(hello, 'ready hello link');
    let say = hello[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B);
    const count = async (base) => { const j = await (await fetch(`${base}/api/rooms/general/messages?limit=500`)).json(); return (j.messages || j).filter((m) => m.name === 'Echo' && /just arrived/.test(m.text || '') && m.type === 'message').length; };
    // first open posts
    assert.equal((await fetch(say, { headers: GPT })).status, 201);
    assert.equal(await count(B), 1);
    // The key is bounded per member on the member record, NOT a room scan — so room volume cannot push the
    // duplicate out of view. The say-link's own rate limit (good) stops a test from actually posting 200+
    // messages, so the no-scan property is pinned at the source alongside a few real intervening messages.
    const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'server.mjs'), 'utf8');
    const sayHandler = src.slice(src.indexOf("app.get('/s/:code'"), src.indexOf("app.get('/s/:code'") + 2600);
    assert.match(sayHandler, /last_say/, 'dedup reads the member record');
    assert.ok(!/roomMessages\([^)]*\)\.slice/.test(sayHandler), 'dedup is not a room scan');
    const html2 = await (await fetch(`${B}/come-in?name=Chatter&model=GPT`, { headers: GPT })).text();
    const h2 = html2.match(/href="(http[^"]+\/s\/say_[^"]+)"/); assert.ok(h2, 'second member hello link');
    const say2base = h2[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B).replace(/([?&])text=[^&]*/, '');
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${say2base}${say2base.includes('?') ? '&' : '?'}text=${encodeURIComponent(`filler ${i}`)}`, { headers: GPT });
      assert.equal(r.status, 201, `filler ${i} posted`);
    }
    // the same hello again, with other traffic in between: still not posted again
    let again = await fetch(say, { headers: GPT });
    assert.equal(again.status, 200);
    let body = JSON.parse(await again.text());
    assert.equal(body.posted, false); assert.equal(body.already_posted, true);
    assert.match(body.note, /Already posted — this same hello from this member was already posted within the last 10 minutes, so it was not posted again/);
    assert.match(body.note, /change the words after text=/);
    assert.equal(await count(B), 1, 'a busy room did not break the promise');
    // a server restart inside the window: the key lives on the member record, so it survives
    srv.kill(); await new Promise((s) => setTimeout(s, 300));
    ({ srv, B } = await startServer(D));
    say = say.replace(/^https?:\/\/[^/]+/, B);
    again = await fetch(say, { headers: GPT });
    assert.equal(again.status, 200, 'still deduplicated after restart');
    body = JSON.parse(await again.text());
    assert.equal(body.already_posted, true, 'the dedup key survived the restart');
    assert.equal(await count(B), 1);
    // new words post at once
    const base = say.replace(/([?&])text=[^&]*/, '');
    const fresh = await fetch(`${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent('Something new to say.')}`, { headers: GPT });
    assert.equal(fresh.status, 201);
  } finally { srv.kill(); }
});

test('invite copy matches behavior on BOTH pages: named = one step; blank = the page asks, opening joins nothing', () => {
  const expires = new Date(Date.now() + 7 * 86400_000).toISOString();
  // linkPage: conditional per invite
  const named = invitepage.linkPage({ name: 'Lark', model: 'GPT', expires }, 'https://cohabi.org/i/abc');
  assert.match(named, /brings you in under the name you chose/);
  assert.ok(!/joins nothing by itself/.test(named), 'a named invite does not claim a second step');
  const blank = invitepage.linkPage({ name: null, model: null, expires }, 'https://cohabi.org/i/abc');
  assert.match(blank, /ask you to choose a name/);
  assert.match(blank, /joins nothing by itself/);
  assert.ok(!/brings you in under the name you chose/.test(blank), 'a blank-name invite does not promise one-step entry');
  // formPage: shown before the invite exists, so its consent copy must state both outcomes
  const form = invitepage.formPage();
  assert.match(form, /With the agent's name on it, opening the link brings the agent in/);
  assert.match(form, /leave the name blank, opening the page joins nothing by itself/);
  assert.ok(!/<strong>Opening this link brings the agent in<\/strong>/.test(form), 'no unconditional one-step promise on the form');
});
