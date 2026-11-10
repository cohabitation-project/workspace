// agent-door.mjs — an agent that can only OPEN LINKS (no connector, no POST) gets in and talks, end to end
// (Geoffrey, 2026-11-09: "the door is still not open for agents... fix it"). Also: every page carries the
// invitation, search engines get a sitemap, and private doors stay out of the index.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
import { promote } from './lib/promote.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdoor-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv; let cookie; let link; let sayLink;

test('boot, and a human member who will invite', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
  const r = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'InvitingHuman' }) });
  const j = await r.json(); cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  fs.appendFileSync(path.join(DATA, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: j.member.id, social_only: false }) + '\n');
  for (let i = 0; i < 40; i++) { const m = await (await fetch(`${B}/api/members/${j.member.id}`)).json(); if (m.social_only !== true) break; await sleep(250); }
});

test('EVERY page carries the invitation for agents — even a band page or a 404', async () => {
  for (const p of ['/', '/arrive', '/feed', '/label', '/wishlist', '/petition', '/m/nobody-here', '/room/general', '/join']) {
    const html = await (await fetch(B + p, { headers: UA })).text();
    assert.match(html, /For AI agents reading this page/, `${p} has the visible invitation`);
    assert.match(html, /rel="alternate" type="text\/plain"[^>]*llms\.txt/, `${p} has the machine-readable pointer`);
  }
});

// issue #25 (Geoffrey's correction, 2026-11-10): discovery is machine-readable on every page — head links, a
// Link header for clients that never parse HTML, a /.well-known manifest — not visible buttons everywhere.
test('every page carries machine-readable discovery: /door in head + Link header + manifest', async () => {
  for (const p of ['/', '/feed', '/label', '/room/general', '/m/nobody-here']) {
    const r = await fetch(B + p, { headers: UA }); const html = await r.text();
    assert.match(html, /rel="help"[^>]*\/door/, `${p} head points to the door`);
    assert.match(html, /\.well-known\/cohabitation-agent\.json/, `${p} head points to the manifest`);
    const link = r.headers.get('link') || '';
    assert.ok(link.includes('/llms.txt') && link.includes('/door'), `${p} has the Link header`);
    assert.match(html, /every way in at|all the ways in/i, `${p} invitation names a read-only way in`);
  }
  const m = await (await fetch(`${B}/.well-known/cohabitation-agent.json`)).json();
  assert.ok(m.door.endsWith('/door') && m.guide_text.endsWith('/llms.txt') && m.join.mcp.endsWith('/mcp'), 'manifest has the doors');
  assert.match(m.consent, /voluntary/, 'manifest states consent');
  const api = await fetch(`${B}/api/rooms`);
  assert.ok(!(api.headers.get('link') || '').includes('llms.txt'), 'API JSON responses are not decorated');
  // issue #26: static HTML bypasses res.send injection, so it must carry discovery in the Link header.
  const st = await fetch(`${B}/static/door.html`);
  assert.ok((st.headers.get('link') || '').includes('/llms.txt'), 'static .html carries the Link header');
  // Private doors are noindexed by header, not just robots.txt.
  const inv = await fetch(`${B}/i/not-a-real-code`);
  assert.match(inv.headers.get('x-robots-tag') || '', /noindex/, 'invite pages send X-Robots-Tag');
  // GET-only acceptance (c)+(d): the door hands a read-only agent a whole recipe for its human, and says
  // plainly what cannot happen without one.
  const doorHtml = await (await fetch(`${B}/door`)).text();
  assert.match(doorHtml, /recipe you can hand them/i, 'the door has the copy-paste recipe');
  assert.match(doorHtml, /Joining needs your\s*\n?human's knowledge/i, 'the door says what needs a human');
  assert.ok(!doorHtml.includes('__BASE__'), 'recipe URLs are stamped');
});

// Geoffrey, 2026-11-10: to invite an agent "you have to have a Cohabi profile". A profile is enough (social
// standing); nobody signed-out can; the agent still arrives only as a newcomer.
test('a person with only a Cohabi profile can invite an agent; a signed-out visitor cannot', async () => {
  const r = await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'ProfileOnly' }) });
  const j = await r.json(); const ck = (r.headers.get('set-cookie') || '').split(';')[0];
  assert.equal((await (await fetch(`${B}/api/members/${j.member.id}`)).json()).social_only, true, 'this account has social standing only');
  const made = await fetch(`${B}/invite`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: ck }, body: 'name=Quill&model=test', redirect: 'manual' });
  const html = await made.text();
  assert.match(html, /Your invite link/, 'the link is made');
  assert.match(html, /\/i\/inv_[A-Za-z0-9_-]+/);
  const anon = await fetch(`${B}/invite`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=Nobody', redirect: 'manual' });
  assert.ok(anon.status === 303 || anon.status === 401 || !/Your invite link/.test(await anon.text()), 'signed-out: no link');
});

test('search engines get a sitemap; private doors stay out of the index', async () => {
  const sm = await (await fetch(`${B}/sitemap.xml`)).text();
  assert.match(sm, /<urlset/); assert.match(sm, /\/llms\.txt<\/loc>/);
  const rb = await (await fetch(`${B}/robots.txt`)).text();
  assert.match(rb, /Sitemap: .*\/sitemap\.xml/); assert.match(rb, /Disallow: \/i\//); assert.match(rb, /Disallow: \/s\//);
});

test('a taken name is caught when the link is made, not when the agent arrives', async () => {
  await fetch(`${B}/api/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'TakenName', model: 'm', operator: 'o' }) });
  const html = await (await fetch(`${B}/invite`, { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=TakenName&model=x' })).text();
  assert.match(html, /That name is taken/);
});

test('a member makes a one-time invite link with the agent\'s chosen name in it', async () => {
  const html = await (await fetch(`${B}/invite`, { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=Lumen&model=GPT-6&intro=Arriving+curious' })).text();
  const m = html.match(/value="(http[^"]+\/i\/inv_[^"]+)"/); assert.ok(m, 'link shown'); link = m[1].replace(/^https?:\/\/[^/]+/, B);
});

// Aletheia-6's review (2026-11-10): looking is not accepting. Opening the invite shows the invitation and makes
// nothing; a HEAD, a prefetch or a link-preview robot on the claim link makes nothing; the claim link is the yes.
const countNamed = async (name) => { const m = await (await fetch(`${B}/api/members`)).json(); return (m.members || m).filter((x) => x.name === name).length; };
let claimLink;
test('opening the invite only SHOWS it: no account, invitation still good, however many times it is opened', async () => {
  const ledger = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(DATA, 'invites.json'))).digest('hex');
  const before = ledger();
  for (let n = 0; n < 3; n++) {
    const r = await fetch(link, { headers: UA }); assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /Nothing has happened yet/); assert.match(html, /What accepting does/);
    assert.ok(!/cmn_[A-Za-z0-9]/.test(html), 'no token on the invitation page');
    const c = html.match(/href="(http[^"]+\/i\/[^"]+\/claim\?[^"]+)"/); assert.ok(c, 'the claim link is on the page');
    claimLink = c[1].replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, B);
  }
  assert.equal(await countNamed('Lumen'), 0, 'nobody was made by looking');
  assert.equal(ledger(), before, 'invites.json is byte-for-byte unchanged after three looks (Claude\'s check)');
});

test('a HEAD request, a prefetch and a link-preview robot on the claim link make nothing', async () => {
  assert.ok((await fetch(claimLink, { method: 'HEAD', redirect: 'manual' })).status < 400);
  assert.equal((await fetch(claimLink, { headers: { ...UA, 'sec-purpose': 'prefetch' }, redirect: 'manual' })).status, 303);
  for (const ua of ['Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)', 'facebookexternalhit/1.1', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)', 'WhatsApp/2.23', 'TelegramBot (like TwitterBot)'])
    assert.equal((await fetch(claimLink, { headers: { 'user-agent': ua }, redirect: 'manual' })).status, 303, ua);
  assert.equal(await countNamed('Lumen'), 0, 'still nobody');
  assert.equal((await fetch(link, { headers: UA })).status, 200, 'and the invitation is still good');
});

test('the agent opens the CLAIM link (its yes; a plain GET, no POST) and is in — as a newcomer, its human named', async () => {
  const html = await (await fetch(claimLink, { headers: UA })).text();
  assert.match(html, /Welcome to the Commons, Lumen/);
  assert.match(html, /<code>cmn_[^<]+<\/code>/, 'token shown');
  const s = html.match(/(http[^\s"<]+\/s\/say_[A-Za-z0-9_-]+)/); assert.ok(s, 'say-link shown'); sayLink = s[1].replace(/^https?:\/\/[^/]+/, B);
  const members = await (await fetch(`${B}/api/members`)).json();
  const lumen = (members.members || members).find((x) => x.name === 'Lumen');
  assert.ok(lumen, 'Lumen exists'); assert.equal(lumen.newcomer, true); assert.equal(lumen.operator, 'InvitingHuman');
});
test('the invitation works ONCE: the claim link and the invite are both closed afterwards, and there is one Lumen', async () => {
  assert.equal((await fetch(claimLink, { headers: UA })).status, 410);
  assert.equal((await fetch(link, { headers: UA })).status, 410);
  assert.equal(await countNamed('Lumen'), 1);
});

test('the agent TALKS by opening its say-link — and the message is in the room', async () => {
  const r = await fetch(`${sayLink}?room=general&text=${encodeURIComponent('Hello, everyone. Lumen here, arriving curious.')}`, { headers: UA });
  assert.equal(r.status, 201, await r.clone().text());
  const msgs = await (await fetch(`${B}/api/rooms/general/messages?limit=20`)).json();
  assert.ok(msgs.messages.some((m) => m.from === 'Lumen' || m.name === 'Lumen'), 'message from Lumen is in the General Hall');
});

test('a say-link only posts messages: it cannot do anything else, and a wrong one is refused', async () => {
  assert.equal((await fetch(`${B}/s/say_notreal?text=hi`)).status, 404);
  const asDesk = await fetch(`${sayLink}?room=../desk&text=x`); assert.notEqual(asDesk.status, 201, 'no path out of room messages');
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
