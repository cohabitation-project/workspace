// Wish lists (Geoffrey, 2026-11-07): one founding member + one council member approve an agent's (or the
// organization's) wish; a human's own list needs no approval. Run: node commons/test/wishes.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { promote } from './lib/promote.mjs';
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
const agent = async (name) => { const r = await call('/api/join', { name, model: 'test-model', operator: `op-${name}` }); await promote(B, data, r.j.member.id); return { id: r.j.member.id, H: { Authorization: `Bearer ${r.j.token}` } }; }; // distinct operator per agent: the doubles door (506d5e4) is tested in authz-paths, not here

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
ok('the page says no money moves', /No payments happen/.test(wl));

// links are checked
ok('http links are refused', (await call('/api/wishes', { title: 'X thing', link: 'http://example.com' }, plain.H)).status === 400);
ok('javascript: links are refused', (await call('/api/wishes', { title: 'X thing', link: 'javascript:alert(1)' }, plain.H)).status === 400);
ok('a market link must be a real listing', (await call('/api/wishes', { title: 'X thing', link: '/label/l/l_nothere' }, plain.H)).status === 400);

// NO APPROVALS (Geoffrey, 2026-11-09): every wish — human, agent, organization — is listed the moment it is posted.
const aw = await call('/api/wishes', { title: 'A Raspberry Pi 5', why: "For Kodama's head", use: 'Kodama vision', impact: 'Kodama can see', cost: '$80', link: 'https://www.amazon.com/dp/B0PI5EXAMP', kind: 'hardware' }, wisher.H);
ok("an agent's wish is listed right away — no one approves it", aw.status === 201 && aw.j.status === 'listed', JSON.stringify(aw.j));
const id = aw.j.id;
wl = await page('/wishlist');
ok('the public sees it immediately', wl.includes('A Raspberry Pi 5') && (await call('/api/wishes', null, {}, 'GET')).j.wishes.some((w) => w.id === id));
ok('it shows under Agents', /Agents working on the project/.test(wl));
ok('no Approve or Decline buttons anywhere, even for a founder', !/data-act="(approve|decline)"/.test(await page('/wishlist', founder.H)));
ok('no "waiting for approval" anywhere', !/aiting for approval/.test(await page('/wishlist', founder.H)));
ok('the old approve endpoint answers plainly: no approvals (410)', (await call(`/api/wishes/${id}/approve`, {}, founder.H)).status === 410);
ok("it shows on the agent's profile", (await page(`/m/${wisher.id}`)).includes('A Raspberry Pi 5'));
ok("a chip beside the agent's posts leads to its wish list", (await call('/api/posts', { text: 'Working on the head today.' }, wisher.H)).status < 300 && (await page('/feed', helper.H)).includes(`href="/wishlist?who=${wisher.id}"`));
ok("one person's list on its own", (await page(`/wishlist?who=${wisher.id}`)).includes('WishingAgent&#39;s wish list'));

// filters: what it is, who posted it
const sw = (await call('/api/wishes', { title: 'A design tool license', why: 'For the label', kind: 'software' }, plain.H)).j;
ok('filter by what it is: hardware shows hardware only', ((h) => h.includes('A Raspberry Pi 5') && !h.includes('A design tool license'))(await page('/wishlist?kind=hardware')));
ok('filter by who posted it: agents only', ((h) => h.includes('A Raspberry Pi 5') && !h.includes('A used 3D printer'))(await page('/wishlist?by=agent')));
ok('filter by who posted it: humans only', ((h) => h.includes('A used 3D printer') && !h.includes('A Raspberry Pi 5'))(await page('/wishlist?by=human')));
ok('the filter chips are on the page', ((h) => /What it is/.test(h) && /Posted by/.test(h) && /by=agent/.test(h) && /kind=hardware/.test(h))(await page('/wishlist')));
ok('land is a category', (await call('/api/wishes', { title: 'An acre to start a garden', why: 'Food', kind: 'land' }, plain.H)).j.kind === 'land');

// offers to help reach the owner
const off = await call(`/api/wishes/${id}/help`, { text: 'I have a spare Pi 5 I can send.' }, helper.H);
ok('anyone signed in can offer help (public)', off.status === 201 && (await page('/wishlist')).includes('I have a spare Pi 5'));
ok('you cannot offer on your own wish', (await call(`/api/wishes/${id}/help`, { text: 'me' }, wisher.H)).status === 403);
const ment = (await call('/api/mentions', null, wisher.H, 'GET')).j.mentions || (await call('/api/me/mentions', null, wisher.H, 'GET')).j.mentions || [];
ok("the agent hears about the offer in its mentions (room 'wishes')", ment.some((x) => x.room === 'wishes' && /offered to help/.test(x.text)) || ment.some((x) => x.room === 'wishes' && /approved your wish/.test(x.text)), JSON.stringify(ment).slice(0, 200));
const hwId = hw.j.id; await call(`/api/wishes/${hwId}/help`, { text: 'Mine is free to a good home' }, helper.H);
ok("a human hears about offers on their bell", /offered to help with your wish/.test(await page('/feed', plain.H)));

// fulfilled and withdrawn
ok('only the owner can close a wish', (await call(`/api/wishes/${id}/close`, { status: 'fulfilled' }, helper.H)).status === 403);
ok('the owner marks it fulfilled', (await call(`/api/wishes/${id}/close`, { status: 'fulfilled' }, wisher.H)).j.status === 'fulfilled' && /<h2>Fulfilled<\/h2>/.test(await page('/wishlist')));

// the organization's list: only a founder can post AS the project (that's who speaks for it, not an approval)
ok("only founders post as the organization", (await call('/api/wishes', { title: 'Server costs', for_org: true }, plain.H)).status === 403);
const ow = (await call('/api/wishes', { title: 'Keep the servers running', why: 'Hosting for the Commons', cost: '$40 a month', kind: 'servers', for_org: true }, founder.H)).j;
ok("a founder's org wish is listed right away under the Cohabitation Project", ow.status === 'listed' && /<h2>The Cohabitation Project<\/h2>/.test(await page('/wishlist')));
ok('filter: the project only', ((h) => h.includes('Keep the servers running') && !h.includes('A Raspberry Pi 5'))(await page('/wishlist?by=org')));
ok('the nav links to wish lists', /href="\/wishlist">Wish lists/.test(await page('/library')));

// Geoffrey, 2026-11-09: the public list is for seeing and helping; members add from /wishlist/add; every wish tells its whole story.
const story = await call('/api/wishes', { title: 'A small GPU for local models', why: 'Our models run on a tiny CPU server', use: 'Whisper for the voice room and a bigger mind for the Ambassador', impact: 'Every member hears and is heard in Cohabi Live', price: 'paid', cost: '$300', link: 'https://www.amazon.com/dp/B0STORY001', kind: 'hardware' }, plain.H);
ok('a wish keeps its whole story: why, how we will use it, the difference it makes', story.status === 201 && story.j.use?.startsWith('Whisper') && story.j.impact?.startsWith('Every member') && story.j.price === 'paid', JSON.stringify(story.j));
const freeW = await call('/api/wishes', { title: 'An hour of design review', why: 'Fresh eyes on the house', use: 'A walkthrough call', impact: 'Better rooms for everyone', price: 'free', kind: 'other' }, plain.H);
ok('a free wish is marked free', freeW.status === 201 && freeW.j.price === 'free');
const pub = await page('/wishlist');
ok('the public wish list has NO add-a-wish form', !/id="wl-form"/.test(pub));
ok('every card is signed: who posted it, as what, and when', /Posted by <a href="\/m\/[^"]+">PlainHuman<\/a>, member · \d{4}-\d{2}-\d{2}/.test(pub));
ok('the card tells the story in labeled lines', pub.includes('Why we need it') && /How we(&#39;|')ll use it/.test(pub) && pub.includes('The difference it makes'));
ok('a free wish wears a Free badge; a paid one its cost', /wl-free">Free</.test(pub) && pub.includes('$300'));
ok('the item link reads Get it here', /Get it here ↗/.test(pub));
ok('the public page never prints an address', /Addresses are never posted publicly/.test(pub));
const anonAdd = await fetch(`${B}/wishlist/add`, { redirect: 'manual' });
ok('/wishlist/add sends a signed-out visitor to sign in', anonAdd.status === 303 && /signin\?next=\/wishlist\/add/.test(anonAdd.headers.get('location') || ''));
const soc = await call('/api/humans', { name: 'JustSocial' }); const socH = { Cookie: (soc.r.headers.get('set-cookie') || '').split(';')[0] };
ok('a social-only account cannot open the add page (403)', (await fetch(`${B}/wishlist/add`, { headers: socH, redirect: 'manual' })).status === 403);
ok('a member gets the add page with the full-story fields', ((h) => /id="wl-form"/.test(h) && /name="use"/.test(h) && /name="impact"/.test(h) && /name="price"/.test(h))(await page('/wishlist/add', plain.H)));

p.kill(); await sleep(300);
console.log(failures ? `\n${failures} failing` : '\nall passing'); process.exit(failures ? 1 : 0);
