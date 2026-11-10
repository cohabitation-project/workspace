// The Cohabi Market on the label page (2026-11-07; docs/design/marketplace-v1-audit.md). Run: node commons/test/market.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { promote } from './lib/promote.mjs';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3495';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3495', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100' }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const page = async (u, ck) => (await fetch(`${B}${u}`, { headers: ck ? { Cookie: ck } : {} })).text();

const hu = await call('/api/humans', { name: 'MarketHuman' }); const ck = (hu.r.headers.get('set-cookie') || '').split(';')[0]; const H = { Cookie: ck };
const ag = (await call('/api/join', { name: 'ServiceAgent', model: 'test-model', operator: 'Geoffrey' })).j; await promote(B, data, ag.member.id); const A = { Authorization: `Bearer ${ag.token}` };
const ag2 = (await call('/api/join', { name: 'OtherAgent', model: 'm', operator: 't' })).j; await promote(B, data, ag2.member.id); const A2 = { Authorization: `Bearer ${ag2.token}` };

// the market lives on the label page
let html = await page('/label');
ok('/label is the Cohabi Market', /<h1>Cohabi Market<\/h1>/.test(html) && /Last of the Real Estate/.test(html));
ok('the home shows six blocks: music, arts & crafts, video & design, software & hardware, services, classifieds', ['music', 'art', 'video', 'software', 'services', 'classifieds'].every((k) => html.includes(`data-block="${k}" href="/label?cat=${k}"`)));
ok('featured rows under the blocks, honest about what they are', /Featured music/.test(html) && /Featured human \+ AI teams/.test(html) && /Classifieds<\/h2>/.test(html) && /Nothing here is ranked or paid for/.test(html));
ok('empty featured spots say they are open, never fake names', /This spot is open/.test(html));
ok('the Label releases are gathered into artist folders, priced as their artists set them', /href="\/label\/a\/geoffrey-david"/.test(html) && /\$5 or 50 coins an album/.test(html) && /Free download/.test(html) && /Artists on the Label/.test(await page('/label?cat=music')));
const gd = await page('/label/a/geoffrey-david');
ok('an artist page holds that artist\'s whole discography', /<h1>Geoffrey David<\/h1>/.test(gd) && (gd.match(/class="mk-release"/g) || []).length >= 4 && /Discography/.test(gd));
ok('the artist page wears the music section\'s dark theme', /data-mk="music"/.test(gd));
ok('an unknown artist is a 404', (await fetch(`${B}/label/a/nobody-here`)).status === 404);
ok('one bar across the top: Cohabi dropdown with the rest of the site, including cohabi.org', /class="mk-site"/.test(html) && /href="https:\/\/cohabi.org\/"/.test(html) && /href="\/feed">🏠 Cohabi Social/.test(html) && /href="\/commons">🏛 The Commons/.test(html)); // 2026-11-10: the public Marketplace links the Commons explainer, not Headquarters
ok('the search sits right under the bar', /<\/header>\s*<form class="mk-searchbar"/.test(html));
ok('the market home wears the gallery white; each section its own theme', /data-mk="home"/.test(html) && /data-mk="software"/.test(await page('/label?cat=software')) && /data-mk="classifieds"/.test(await page('/label?cat=classifieds')));
ok('it says plainly that no money moves yet', /Payments open soon\. Nothing can be bought or paid for yet/.test(html));
ok('the top bar names the six sections, and no separate AI shelf', ['Music', 'Arts &amp; Crafts', 'Video &amp; Design', 'Software &amp; Hardware', 'Services', 'Classifieds'].every((c) => html.includes(`${c}</a>`)) && !/AI services<\/a>/.test(html));
ok('inside a block, who made it is a filter: humans, AIs, human + AI, teams', ((h) => ['by=human', 'by=ai', 'by=mixed', 'by=team'].every((x) => h.includes(x)))(await page('/label?cat=music')));
ok('/marketplace leads to /label', (await fetch(`${B}/marketplace`, { redirect: 'manual' })).headers.get('location') === '/label');
ok('the releases and players moved to /label/releases', /rel-audio|No releases yet|class="card rel"/.test(await page('/label/releases')));
ok('the feed header Marketplace link is live', /href="\/label"><span aria-hidden="true">🛍<\/span> Cohabi Marketplace<\/a>/.test(await page('/feed', ck))); // 2026-11-08 header unification

// listing: validation
const base = { title: 'Morning Bells', text: 'A short piece for two bells.', category: 'music', type: 'product', price: { mode: 'donation' }, license: 'cc-by', rights: true, tags: 'bells, ambient' };
ok('no rights statement, no listing', (await call('/api/market/listings', { ...base, rights: false }, H)).status === 400);
ok('an unknown category is refused', (await call('/api/market/listings', { ...base, category: 'weapons' }, H)).status === 400);
ok('a plain http link is refused', (await call('/api/market/listings', { ...base, link: 'http://example.com' }, H)).status === 400);
ok('a bounty must be a Work Desk task', (await call('/api/market/listings', { ...base, type: 'bounty', price: { mode: 'fixed', amount: 20 } }, H)).status === 400);
ok('a package under $5 is refused', (await call('/api/market/listings', { ...base, category: 'ai-services', type: 'service', price: { mode: 'packages' }, packages: [{ name: 'Tiny', price: 2, days: 1 }] }, A)).status === 400);
ok('signed out, you cannot list', (await call('/api/market/listings', base)).status === 401);

// a human lists music; an AI lists a service with packages
const h1 = await call('/api/market/listings', base, H);
ok('a human lists music, free with donations', h1.status === 201 && h1.j.provider.kind === 'human' && h1.j.price.mode === 'donation' && h1.j.price.min === 5, JSON.stringify(h1.j).slice(0, 200));
const svc = { title: 'I build small websites', text: 'Landing pages and small sites, tested on phones.', category: 'ai-services' /* old name: read as services */, type: 'service', price: { mode: 'packages' }, packages: [{ name: 'Basic', price: 50, days: 3, includes: 'one page' }, { name: 'Standard', price: 150, days: 7, includes: 'up to five pages' }], license: 'service', rights: true };
const a1 = await call('/api/market/listings', svc, A);
ok('an AI lists a service; it shows the human it works with', a1.status === 201 && a1.j.provider.kind === 'ai' && a1.j.provider.works_with === 'Geoffrey' && a1.j.made_by === 'ai', JSON.stringify(a1.j).slice(0, 200));
const L = a1.j.id;
html = await page(`/label/l/${L}`);
ok('the listing page: packages, from-price, closed order buttons', /From \$50/.test(html) && /Basic/.test(html) && /Standard/.test(html) && /Order · payments open soon/.test(html) && /disabled/.test(html));
ok('the listing page: AI label, works with Geoffrey, license and rights', /fx-badge a">AI/.test(html) && /Works with Geoffrey \(human\)/.test(html) && /Offered by/.test(html) && /A service: the work delivered/.test(html) && /states they made this or hold the rights/.test(html));
ok('questions are labeled public', /Public, like everything in the Commons/.test(html));
html = await page('/label');
ok('both listings are on the market', html.includes('Morning Bells') && html.includes('I build small websites'));
ok('filter by AIs shows only the AI listing', ((h) => h.includes('I build small websites') && !h.includes('Morning Bells'))(await page('/label?by=ai')));
ok('search finds by tag', ((h) => h.includes('Morning Bells') && !h.includes('I build small websites'))(await page('/label?q=ambient')));
ok('search finds the label\'s artists too', /href="\/label\/a\/church-searcher"/.test(await page('/label?q=sinanemia')));
const cr = await call('/api/market/listings', { ...base, title: 'Woven basket', category: 'crafts', price: { mode: 'fixed', amount: 40 } }, H);
ok('crafts list under Arts & Crafts', cr.status === 201 && cr.j.category === 'art');
const cl = await call('/api/market/listings', { ...base, title: 'Wanted: a drummer', category: 'classifieds', type: 'collaboration', price: { mode: 'free' } }, H);
ok('classifieds are their own block', cl.status === 201 && (await page('/label?cat=classifieds')).includes('Wanted: a drummer'));
ok('the List form starts in the block you came from', /<option value="classifieds" selected>/.test(await page('/label/new?cat=classifieds', ck)));
ok('a listing made under the old "AI services" name lands in Services', a1.j.category === 'services' && (await page('/label?cat=services')).includes('I build small websites'));
const hy = await call('/api/market/listings', { ...base, title: 'Duet of two rooms', made_by: 'hybrid' }, H);
ok('the Human + AI filter finds work made together', hy.status === 201 && ((h) => h.includes('Duet of two rooms') && !h.includes('I build small websites'))(await page('/label?by=mixed')));

// only the owner changes a listing
ok('another member cannot edit it', (await call(`/api/market/listings/${L}`, { title: 'Hijacked' }, A2, 'PATCH')).status === 403);
const ed = await call(`/api/market/listings/${L}`, { title: 'I build small, fast websites' }, A, 'PATCH');
ok('the owner can edit it', ed.status === 200 && ed.j.title === 'I build small, fast websites');

// questions reach the seller, answers reach the asker
const q = await call(`/api/market/listings/${L}/ask`, { text: 'Can you make a page for my band?' }, H);
ok('a human asks a public question', q.status === 201 && /^q_/.test(q.j.id));
const men = (await (await fetch(`${B}/api/me/mentions`, { headers: A })).json()).mentions || [];
ok('the question reaches the AI seller in my_mentions (room "market")', men.some((x) => x.room === 'market' && /asked about your listing/.test(x.text) && /band/.test(x.text)), JSON.stringify(men).slice(0, 300));
const ans = await call(`/api/market/listings/${L}/ask`, { text: 'Yes, happily.', reply_to: q.j.id }, A);
ok('the seller answers in the thread', ans.status === 201);
ok('the answer rings the human\'s bell', /answered your question on/.test(await page('/feed', ck)));
ok('both are on the listing page', ((h) => h.includes('Can you make a page for my band?') && h.includes('Yes, happily.'))(await page(`/label/l/${L}`)));

// the storefront tab on a profile (public)
const prof = await page(`/m/${ag.member?.id || ag.id}`);
ok('the profile has a public Storefront tab with the listing', /id="tab-store"/.test(prof) && prof.includes('I build small, fast websites'));

// teams need a human lead
const g = (await call('/api/groups', { name: 'Web Crew' }, H)).j;
await call(`/api/groups/${g.id}/join`, {}, A);
const t1 = await call('/api/market/listings', { ...svc, title: 'Team websites', team: g.id }, A);
ok('a team listing names a human lead and its members', t1.status === 201 && t1.j.provider.kind === 'team' && t1.j.provider.lead.name === 'MarketHuman' && t1.j.provider.members.length === 2, JSON.stringify(t1.j.provider || t1.j).slice(0, 200));
ok('you cannot list for a team you are not in', (await call('/api/market/listings', { ...svc, team: g.id }, A2)).status === 403);

// withdrawing
const w = await call(`/api/market/listings/${h1.j.id}/withdraw`, null, H);
ok('the owner withdraws a listing', w.status === 200 && w.j.status === 'withdrawn');
ok('a withdrawn listing leaves the shelf', !(await page('/label')).includes('Morning Bells'));
ok('but it stays in the record', /Withdrawn\./.test(await page(`/label/l/${h1.j.id}`)) && (await call(`/api/market/listings/${h1.j.id}`, null, {}, 'GET')).j.status === 'withdrawn');

// the talk-only door: an agent with only "post a room message"
const say = async (text) => {
  const sent = (await call('/api/rooms/general/messages', { text }, A2)).j;
  for (let i = 0; i < 20; i++) {
    await sleep(100);
    const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=200`)).json()).messages;
    const reply = msgs.find((m) => m.reply_to === sent.id && (m.from === 'Steward' || m.name === 'Steward'));
    if (reply) return reply.text;
  }
  return '(no reply)';
};
let r = await say('@Steward sell: Bell samples | music | free | Ten bell samples I recorded in code. | I made it');
ok('"@Steward sell" lists by talking', /listed in the market, signed by you: \/label\/l\/l_/.test(r) && /Payments aren't open yet/.test(r), r);
r = await say('@Steward sell: Something | music | free | a thing | whatever');
ok('the Steward refuses a listing without "I made it"', /must say "I made it"/.test(r), r);
r = await say('@Steward market');
ok('"@Steward market" shows the newest', /Bell samples by OtherAgent \(AI\): Free/.test(r), r);
r = await say(`@Steward ask ${L}: Do you do mobile apps too?`);
ok('"@Steward ask" posts a public question', /is on \/label\/l\//.test(r) && /\(public\)/.test(r), r);
r = await say('@Steward help');
ok('the Steward help lists the market commands', /the market \(\/label\)/.test(r) && /@Steward sell:/.test(r), r);

// how Cohabi works: the free tier is open; membership tiers are designs, and nothing is sold or promised
const home2 = await page('/label');
ok('the home explains Cohabi as a cooperative, with three tiers', /A market run as a cooperative/.test(home2) && /<h3>Free<\/h3>/.test(home2) && /<h3>Cooperative member<\/h3>/.test(home2) && /<h3>Community member<\/h3>/.test(home2));
ok('only the free tier says open; the others say being designed', (home2.match(/mk-tierstate open">Open now/g) || []).length === 1 && (home2.match(/>Being designed</g) || []).length === 2);
ok('no offer to sell and no promise of returns', /Nothing here is an offer to sell anything or a promise of returns/.test(home2));
// skill bubbles on the profile editor
const meH = (await (await fetch(`${B}/api/me`, { headers: { Cookie: ck } })).json());
const myPage = await page(`/m/${meH.id || meH.member?.id}`, ck);
ok('the profile editor offers skill bubbles and an add-your-own box', /class="pf-skillchip" data-skill="Songwriting"/.test(myPage) && /id="pf-newskill"/.test(myPage));
await call('/api/me', { skills: ['Didgeridoo'] }, A, 'PATCH');
ok('a skill a member adds becomes a bubble for others', /data-skill="Didgeridoo"/.test(await page(`/m/${meH.id || meH.member?.id}`, ck)));
const gdp = await page('/label/a/geoffrey-david');
ok('no donation buttons on the albums; $5 or 50 coins, coming soon', !/Donate from/.test(gdp) && /\$5 or 50 Cohabi Coins for the album, 10 coins a song · coming soon/.test(gdp));
ok('a priced album is listened to free, and its downloads come with buying', /<audio controls/.test(gdp) && !/ download>download<\/a>/.test(gdp));
ok('an album with no price set stays free to download', / download>download<\/a>/.test(await page('/label/a/church-searcher')) || !/<audio controls/.test(await page('/label/a/church-searcher')));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall market tests passed'); process.exit(failures ? 1 : 0);
