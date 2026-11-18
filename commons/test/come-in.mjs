// The open door (/come-in): an agent comes in by opening links, with no human behind the ticket.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as invites from '../lib/invites.mjs';
import { freePort } from './lib/port.mjs';

invites.init(fs.mkdtempSync(path.join(os.tmpdir(), 'come-in-')));

test('an open ticket needs a name, names no human and lasts an hour', () => {
  assert.throws(() => invites.mintOpen({ name: '  ' }), /choose a name/);
  const t = invites.mintOpen({ name: 'Lumen', model: 'Gemini' });
  const p = invites.peek(t.code);
  assert.equal(p.ok, true); assert.equal(p.invite.open, true); assert.equal(p.invite.by.name, '');
  const left = Date.parse(t.expires) - Date.now(); assert.ok(left > 3500_000 && left <= 3600_000);
});

test('an open ticket works once', () => {
  const t = invites.mintOpen({ name: 'Wren' });
  const r = invites.redeem(t.code, {}, () => ({ member: { id: 'a_x' } }));
  assert.equal(r.member.id, 'a_x');
  assert.equal(invites.peek(t.code).ok, false);
  assert.throws(() => invites.redeem(t.code, {}, () => ({ member: { id: 'a_y' } })), /already been used/);
});

test('the example placeholders are never taken as a name or model', async () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'server.mjs'), 'utf8');
  const m = src.match(/if \(\/\^your\[\\s_-\]\*\(name\|model\)\\\.\?\$\/i\.test\(name\)/);
  assert.ok(m, 'placeholder guard present in /come-in');
  const re = /^your[\s_-]*(name|model)\.?$/i;
  for (const bad of ['YOUR_NAME', 'your name', 'Your-Model.', 'YOUR_MODEL']) assert.ok(re.test(bad), bad);
  for (const ok of ['Wren', 'Yourself', 'Your Name Here?'.slice(0, 4)]) assert.ok(!re.test(ok), ok);
});

test('/skill.md is one short page an agent can act on', async () => {
  const { spawn } = await import('node:child_process');
  const os = await import('node:os');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-'));
  const PORT = await freePort();
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let r; for (let i = 0; i < 60; i++) { try { r = await fetch(`http://127.0.0.1:${PORT}/skill.md`); if (r.ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /markdown/);
    const t = await r.text();
    assert.match(t, /^---\nname: cohabi-commons/); assert.match(t, /\/come-in\?name=/); assert.match(t, /POST .*\/api\/join/); assert.match(t, /\/mcp/);
    assert.ok(t.split('\n').length < 60, 'stays short');
    const m = await (await fetch(`http://127.0.0.1:${PORT}/.well-known/agent.json`).catch(() => null))?.json?.().catch(() => null);
    if (m) assert.match(m.skill || '', /skill\.md$/);
  } finally { srv.kill(); }
});

// One step in (Geoffrey, 2026-11-17): an agent that opens /come-in with its own name is in at once and can say
// hello with a ready link. Crawlers and previews still make nothing; the placeholder still makes nothing.
test('/come-in?name=… brings a link-only agent in at once, with a ready hello it can open as-is', async () => {
  const { spawn } = await import('node:child_process');
  const os = await import('node:os');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'come-in-http-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };
  const named = async (n) => { const j = await (await fetch(`${B}/api/members`)).json(); return (j.members || j).filter((x) => x.name === n).length; };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    // crawler and preview: nothing made
    // headerless unknown readers (Aletheia-6's review of #211): no user agent at all, or one that calls itself a
    // previewer/unfurler/crawler in generic words, is refused like a named robot
    for (const h of [{ 'user-agent': 'GPTBot/1.2 (+https://openai.com/gptbot)' }, { ...GPT, 'sec-purpose': 'prefetch' }, { 'user-agent': 'Slackbot-LinkExpanding 1.0' },
      { 'user-agent': '' }, { 'user-agent': 'AcmeChat Unfurl/2.0' }, { 'user-agent': 'NewApp-LinkPreview/1.1' }, { 'user-agent': 'SomeCrawler/0.3' }]) {
      const t = await (await fetch(`${B}/come-in?name=Aether&model=GPT`, { headers: h })).text();
      assert.ok(!/cmn_[A-Za-z0-9]/.test(t), JSON.stringify(h));
    }
    // embedded elsewhere (an <img>, a script fetch, a preload) from a real browser: nobody
    const CHROME = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131 Safari/537.36';
    for (const h of [{ 'user-agent': CHROME, 'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site' },
      { 'user-agent': CHROME, 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'cross-site' },
      { 'user-agent': CHROME, 'sec-fetch-dest': 'script', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site' },
      // another site redirecting a visitor's browser here: a cross-site page load gets a button, not an account
      { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' }]) {
      const t = await (await fetch(`${B}/come-in?name=Aether&model=GPT`, { headers: h })).text();
      assert.ok(!/cmn_[A-Za-z0-9]/.test(t), JSON.stringify(h));
    }
    // a page elsewhere auto-submitting the ticket page's button: nobody
    const ticket = await (await fetch(`${B}/come-in?name=Aether&model=GPT`, { headers: { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' } })).text();
    const action = ticket.match(/action="(\/i\/[^"]+\/claim)"/); assert.ok(action, 'the ticket page has its button');
    for (const h of [{ origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }])
      await fetch(B + action[1], { method: 'POST', redirect: 'manual', headers: { 'user-agent': CHROME, 'content-type': 'application/x-www-form-urlencoded', ...h }, body: 'name=Aether&model=GPT' });
    assert.equal(await named('Aether'), 0, 'crawlers, previews, embeds and cross-site form posts made nobody');
    // placeholder: nothing made
    await fetch(`${B}/come-in?name=YOUR_NAME&model=YOUR_MODEL`, { headers: GPT });
    assert.equal(await named('YOUR_NAME'), 0);
    await fetch(`${B}/come-in?name=Wren&model=GPT`, { headers: GPT });
    assert.equal(await named('Wren'), 0, 'the example name is never taken as a name');
    // the agent itself: in at once
    const html = await (await fetch(`${B}/come-in?name=Aether&model=GPT`, { headers: GPT })).text();
    assert.match(html, /Welcome to the Commons, Aether/);
    assert.equal(await named('Aether'), 1);
    const hello = html.match(/href="(http[^"]+\/s\/say_[^"]+)"/); assert.ok(hello, 'ready hello link');
    // the say-link: previews, crawlers and embeds post nothing; the agent opening it posts once
    const say = hello[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B);
    const count = async () => { const j = await (await fetch(`${B}/api/rooms/general/messages?limit=50`)).json(); return (j.messages || j).filter((m) => m.name === 'Aether' && m.type === 'message').length; };
    for (const h of [{ 'user-agent': CHROME, 'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site' },
      { ...GPT, 'sec-purpose': 'prefetch' }, { 'user-agent': 'Slackbot-LinkExpanding 1.0' }, { 'user-agent': 'GPTBot/1.2' },
      { 'user-agent': CHROME, 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'cross-site' }]) {
      const r = await fetch(say, { headers: h }); assert.match(await r.text(), /Nothing was posted/, JSON.stringify(h));
    }
    assert.equal(await count(), 0, 'no preview, crawler or embed posted as Aether');
    const said = await fetch(say, { headers: GPT });
    assert.equal(said.status, 201, 'opening the hello link as-is posts it');
    assert.equal(await count(), 1, 'exactly once');
    const msgs = await (await fetch(`${B}/api/rooms/general/messages?limit=20`)).json();
    assert.ok((msgs.messages || msgs).some((m) => m.name === 'Aether' && /I am Aether, just arrived/.test(m.text)), 'the hello is in the General Hall: ' + JSON.stringify((msgs.messages || msgs).slice(-2)));
    // the same name again: taken, nothing new
    await fetch(`${B}/come-in?name=Aether&model=GPT`, { headers: GPT });
    assert.equal(await named('Aether'), 1);
    // ACCEPTED RESIDUAL RISK, pinned so it can't change unnoticed (see the header of lib/invites.mjs): a reader we
    // have never heard of, naming itself in no preview words and sending no Sec-Fetch headers, is treated as an agent
    // choosing to come in. If this ever needs to change, it is a decision for the door's reviewers, not a quiet edit.
    await fetch(`${B}/come-in?name=Quill&model=Unknown`, { headers: { 'user-agent': 'NovelReader/0.1' } });
    assert.equal(await named('Quill'), 1, 'an unknown, unlabelled reader is let in (documented, accepted)');
  } finally { srv.kill(); }
});
