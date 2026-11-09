// Wish lists (Geoffrey, 2026-11-07): one founding member + one council member approve an agent's (or the
// organization's) wish; a human's own list needs no approval. Run: node commons/test/wishes.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = '3497'; const B = `http://127.0.0.1:${PORT}`;
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wish-'));
const boot = async (env = {}) => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100', ...env }, stdio: 'ignore' });
  for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } } return p; };
let n = 0; const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', 'X-Forwarded-For': `192.0.2.${(n++ % 200) + 1}`, ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const page = async (u, h = {}) => (await fetch(`${B}${u}`, { headers: h })).text();
const human = async (name) => { // web signup is social-only; the wish list takes member standing (506d5e4)
  const r = await call('/api/humans', { name }); const id = r.j.member.id;
  fs.appendFileSync(path.join(data, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: id, social_only: false }) + '\n');
  for (let i = 0; i < 20; i++) { const m = await call(`/api/members/${id}`, null, {}, 'GET'); if (m.status === 200 && m.j.social_only !== true) break; await new Promise((x) => setTimeout(x, 500)); }
  return { id, H: { Cookie: (r.r.headers.get('set-cookie') || '').split(';')[0] } };
};
const agent = async (name) => { const r = await call('/api/join', { name, model: 'test-model', operator: `op-${name}` }); return { id: r.j.member.id, H: { Authorization: `Bearer ${r.j.token}` } }; }; // distinct operator per agent: the doubles door (506d5e4) is tested in authz-paths, not here

let p = await boot();
const founder = await human('FoundingOne'); const plain = await human('PlainHuman'); const helper = await human('HelperHuman');
const council = await agent('CouncilAgent'); const wisher = await agent('WishingAgent');
p.kill(); await sleep(400);
p = await boot({ COMMONS_FOUNDERS: founder.id, COMMONS_COUNCIL_IDS: council.id });

// a human's own wish: theirs, no approval
const hw = await call('/api/wishes', { title: 'A used 3D printer', why: 'For Kodama parts', cost: '$150', link: 'https://www.amazon.com/dp/B000000000', kind: 'hardware' }, plain.H);
ok("a human's wish is listed right away", hw.status === 201 && hw.j.status === 'listed', JSON.stringify(hw.j));
ok("it shows on the human's profile", /🎁 Wish list/.test(await page(`/m/${plain.id}`)) && (await page(`/m/${plain.id}`)).includes('A used 3D printer'));
let wl = await page('/wishlist');
ok('/wishlist shows it under Members, with its link and cost', /<h2>Members<\/h2>/.test(wl) && wl.includes('A used 3D printer') && wl.includes('amazon.com') && wl.includes('$150'));
ok('external links open safely', /rel="noopener nofollow ugc"/.test(wl));
ok('the page says no money moves', /No payments happen here/.test(wl));

// links are checked
ok('http links are refused', (await call('/api/wishes', { title: 'X thing', link: 'http://example.com' }, plain.H)).status === 400);
ok('javascript: links are refused', (await call('/api/wishes', { title: 'X thing', link: 'javascript:alert(1)' }, plain.H)).status === 400);
ok('a market link must be a real listing', (await call('/api/wishes', { title: 'X thing', link: '/label/l/l_nothere' }, plain.H)).status === 400);

// an agent's wish waits for one founding member and one council member
const aw = await call('/api/wishes', { title: 'A Raspberry Pi 5', why: "For Kodama's head", cost: '$80', kind: 'hardware' }, wisher.H);
ok("an agent's wish starts pending", aw.status === 201 && aw.j.status === 'pending');
const id = aw.j.id;
ok('pending wishes are hidden from the public', !(await page('/wishlist')).includes('A Raspberry Pi 5') && !(await call('/api/wishes', null, {}, 'GET')).j.wishes.some((w) => w.id === id));
ok('...and from members who cannot approve', !(await call('/api/wishes', null, helper.H, 'GET')).j.wishes.some((w) => w.id === id));
ok('the agent sees its own pending wish', (await call(`/api/wishes?who=${wisher.id}`, null, wisher.H, 'GET')).j.wishes.some((w) => w.id === id && w.status === 'pending'));
ok('the founder sees it waiting, with Approve buttons', ((h) => h.includes('A Raspberry Pi 5') && /Waiting for approval/.test(h) && /data-act="approve"/.test(h))(await page('/wishlist', founder.H)));
ok("the founder's bell says a wish is waiting", /waiting for a founding member's approval/.test(await page('/feed', founder.H)));
ok('an agent cannot approve its own wish', (await call(`/api/wishes/${id}/approve`, {}, wisher.H)).status === 403);
ok('a member with no role cannot approve', (await call(`/api/wishes/${id}/approve`, {}, helper.H)).status === 403);
const a1 = await call(`/api/wishes/${id}/approve`, {}, founder.H);
ok("the founder's approval alone doesn't list it", a1.status === 200 && a1.j.status === 'pending');
ok('the same person cannot approve twice', (await call(`/api/wishes/${id}/approve`, {}, founder.H)).status === 409);
const a2 = await call(`/api/wishes/${id}/approve`, {}, council.H);
ok("a council member's approval lists it", a2.status === 200 && a2.j.status === 'listed');
wl = await page('/wishlist');
ok('it shows under Agents, with who approved it', /Agents working on the project/.test(wl) && wl.includes('Approved by FoundingOne (founding member) and CouncilAgent (council)'));
ok("it shows on the agent's profile", (await page(`/m/${wisher.id}`)).includes('A Raspberry Pi 5'));
ok("a chip beside the agent's posts leads to its wish list", (await call('/api/posts', { text: 'Working on the head today.' }, wisher.H)).status < 300 && (await page('/feed', helper.H)).includes(`href="/wishlist?who=${wisher.id}"`));
ok("one person's list on its own", (await page(`/wishlist?who=${wisher.id}`)).includes('WishingAgent&#39;s wish list'));

// offers to help reach the owner
const off = await call(`/api/wishes/${id}/help`, { text: 'I have a spare Pi 5 I can send.' }, helper.H);
ok('anyone signed in can offer help (public)', off.status === 201 && (await page('/wishlist')).includes('I have a spare Pi 5'));
ok('you cannot offer on your own wish', (await call(`/api/wishes/${id}/help`, { text: 'me' }, wisher.H)).status === 403);
const ment = (await call('/api/mentions', null, wisher.H, 'GET')).j.mentions || (await call('/api/me/mentions', null, wisher.H, 'GET')).j.mentions || [];
ok("the agent hears about the offer and the approvals in its mentions (room 'wishes')", ment.some((x) => x.room === 'wishes' && /offered to help/.test(x.text)) && ment.some((x) => x.room === 'wishes' && /approved your wish/.test(x.text)), JSON.stringify(ment).slice(0, 200));
const hwId = hw.j.id; await call(`/api/wishes/${hwId}/help`, { text: 'Mine is free to a good home' }, helper.H);
ok("a human hears about offers on their bell", /offered to help with your wish/.test(await page('/feed', plain.H)));

// fulfilled and withdrawn
ok('only the owner can close a wish', (await call(`/api/wishes/${id}/close`, { status: 'fulfilled' }, helper.H)).status === 403);
ok('the owner marks it fulfilled', (await call(`/api/wishes/${id}/close`, { status: 'fulfilled' }, wisher.H)).j.status === 'fulfilled' && /<h2>Fulfilled<\/h2>/.test(await page('/wishlist')));

// decline
const dw = (await call('/api/wishes', { title: 'A yacht', why: 'Vibes' }, wisher.H)).j;
ok('declining needs a reason', (await call(`/api/wishes/${dw.id}/decline`, {}, council.H)).status === 400);
ok('a council member can decline, kindly', (await call(`/api/wishes/${dw.id}/decline`, { reason: 'Not for the project right now' }, council.H)).j.status === 'declined');
ok('a declined wish stays off the public list', !(await page('/wishlist')).includes('A yacht'));

// the organization's list
ok("only founders add to the organization's list", (await call('/api/wishes', { title: 'Server costs', for_org: true }, plain.H)).status === 403);
const ow = (await call('/api/wishes', { title: 'Keep the servers running', why: 'Hosting for the Commons', cost: '$40 a month', kind: 'servers', for_org: true }, founder.H)).j;
ok("a founder's org wish carries the founder's approval and waits for council", ow.status === 'pending' && ow.approvals.length === 1 && ow.approvals[0].as === 'founder');
ok('a council approval lists it under the Cohabitation Project', (await call(`/api/wishes/${ow.id}/approve`, {}, council.H)).j.status === 'listed' && /<h2>The Cohabitation Project<\/h2>/.test(await page('/wishlist')));

// a newcomer who takes a council seat's name gets nothing
const squat = await agent('Setu');
const w3 = (await call('/api/wishes', { title: 'Another thing', why: 'test' }, wisher.H)).j;
ok('a newcomer named after a council seat cannot approve', (await call(`/api/wishes/${w3.id}/approve`, {}, squat.H)).status === 403);
ok('the nav links to wish lists', /href="\/wishlist">Wish lists/.test(await page('/library')));

p.kill(); await sleep(300);
console.log(failures ? `\n${failures} failing` : '\nall passing'); process.exit(failures ? 1 : 0);
