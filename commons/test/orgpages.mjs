// Band, artist and business pages (2026-11-07): run by members from their own login. Run: node commons/test/orgpages.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3505';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-'));
const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'commons', 'pages-seed.json'), 'utf8'));
const seedFile = path.join(data, 'seed.json'); fs.writeFileSync(seedFile, JSON.stringify({ pages: real.pages.map((p) => ({ ...p, manager: 'SeedOwner' })) }));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3505', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_PAGES_SEED: seedFile }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const page = async (u, ck) => (await fetch(`${B}${u}`, { headers: ck ? { Cookie: ck } : {} })).text();
const human = async (name) => { const r = await call('/api/humans', { name }); const ck = (r.r.headers.get('set-cookie') || '').split(';')[0]; const me = (await call('/api/me', null, { Cookie: ck }, 'GET')).j; return { ck, H: { Cookie: ck }, id: me.id || me.member?.id }; };

// the RollinHost business page, seeded from the project's file once its manager exists
const owner = await human('SeedOwner');
let rh = await page('/page/rollinhost');
ok('the seeded RollinHost page appears once its manager is a member', /<h1>RollinHost<\/h1>/.test(rh) && /Run your entire park from one system/.test(rh), rh.slice(0, 200));
ok('it wears the navy-and-gold look', /data-mk="navy"/.test(rh) && /--gold:#d4a24c/.test(rh));
ok('its details, links and placeholder mark show', /Utility metering/.test(rh) && /href="https:\/\/demo.rollinhost.com\/"/.test(rh) && /href="tel:6267655461"/.test(rh) && /rollinhost-mark.svg/.test(rh));
ok('it says who runs it, and that a page is not a member', /Run by <a href="\/m\/[^"]+">[\s\S]*?SeedOwner<\/a>/.test(rh) && /a page is not a member: it has no vote and no coins/.test(rh));
ok('the public sees no editor', !/id="pg-edit"/.test(rh) && !/id="pg-dialog"/.test(rh));
rh = await page('/page/rollinhost', owner.ck);
ok('its manager sees Edit this page, the switcher, and List as RollinHost', /id="pg-edit"/.test(rh) && /You run this page\. Switch:/.test(rh) && /List something as RollinHost/.test(rh));

// creating a page; names are unique and can't take a Label artist's
const g = await human('Gemma');
const sr = await call('/api/pages', { kind: 'band', name: 'The Sunday Room' }, g.H);
ok('a member creates a band page', sr.status === 201 && sr.j.href === '/page/the-sunday-room' && sr.j.managers[0].id === g.id, JSON.stringify(sr.j).slice(0, 200));
ok('the same name twice is refused', (await call('/api/pages', { kind: 'band', name: 'the sunday room!' }, g.H)).status === 409);
ok("a Label artist's name can't be taken", (await call('/api/pages', { kind: 'band', name: 'Geoffrey David' }, g.H)).status === 409);
ok('signed out, no page', (await call('/api/pages', { kind: 'band', name: 'Nope' })).status === 401);
ok('an unknown kind is refused', (await call('/api/pages', { kind: 'empire', name: 'Big' }, g.H)).status === 400);

// editing: managers only
const other = await human('Otto');
ok('someone who does not run it cannot edit it', (await call(`/api/pages/${sr.j.id}`, { headline: 'mine now' }, other.H, 'PATCH')).status === 403);
const up = await call(`/api/pages/${sr.j.id}`, { headline: 'Sunday songs for slow mornings', bio: 'We play **slowly**.', theme: 'music', accent: '#ff6a1a', kind_info: { genres: ['folk'], members: ['Gemma: voice'], location: 'Tucson, AZ' }, links: 'Bandsite | https://example.org' }, g.H, 'PATCH');
ok('its manager edits headline, about, look, details and links', up.status === 200 && up.j.kind_info.genres[0] === 'folk' && up.j.links[0].label === 'Bandsite');
let sp = await page('/page/the-sunday-room');
ok('the page shows them', /Sunday songs for slow mornings/.test(sp) && /<strong>slowly<\/strong>/.test(sp) && /Gemma: voice/.test(sp) && /data-mk="music"/.test(sp));
ok('a bad accent colour is refused', (await call(`/api/pages/${sr.j.id}`, { accent: 'red' }, g.H, 'PATCH')).status === 400);
ok('an http link is refused', (await call(`/api/pages/${sr.j.id}`, { links: 'x | http://example.org' }, g.H, 'PATCH')).status === 400);

// selling as the page
const li = await call('/api/market/listings', { title: 'Sunday Room tote bag', text: 'Canvas, screen-printed.', category: 'music', type: 'product', price: { mode: 'fixed', amount: 18 }, license: 'all-rights', rights: true, page: sr.j.id }, g.H);
ok('a manager lists merch as the page', li.status === 201 && li.j.page?.name === 'The Sunday Room', JSON.stringify(li.j).slice(0, 200));
ok("someone who doesn't run it can't list as it", (await call('/api/market/listings', { title: 'Fake merch', text: 'x', category: 'music', type: 'product', price: { mode: 'free' }, license: 'all-rights', rights: true, page: sr.j.id }, other.H)).status === 403);
sp = await page('/page/the-sunday-room', g.ck);
ok('the merch is in the page shop, with Edit and Withdraw for its lister', sp.includes('Sunday Room tote bag') && new RegExp(`/label/l/${li.j.id}/edit`).test(sp));
ok('the market card names the page and who listed it', /The Sunday Room<\/strong><\/a> <span class="mk-team">Band<\/span> <span class="muted small">· listed by Gemma/.test(await page('/label?cat=music')));
ok("it doesn't double up on the lister's personal shop", !(await page(`/m/${g.id}`)).includes('Sunday Room tote bag'));
ok('the List form offers "Offer it as" the page, preselected from the page', /<select name="page">[\s\S]*?<option value="[^"]+" selected>The Sunday Room \(Band\)/.test(await page(`/label/new?cat=music&as=${sr.j.id}`, g.ck)));

// more people can run a page
const add = await call(`/api/pages/${sr.j.id}`, { add_manager: 'Otto' }, g.H, 'PATCH');
ok('a manager adds another member by name', add.status === 200 && add.j.managers.length === 2);
ok('who can then edit it', (await call(`/api/pages/${sr.j.id}`, { headline: 'Sunday songs, now with Otto' }, other.H, 'PATCH')).status === 200);
ok('the last manager cannot be removed', (await call(`/api/pages/${sr.j.id}`, { remove_manager: 'Gemma' }, g.H, 'PATCH')).status === 200 && (await call(`/api/pages/${sr.j.id}`, { remove_manager: 'Otto' }, other.H, 'PATCH')).status === 400);

// one login: the profile and the menu lead to your pages
const prof = await page(`/m/${owner.id}`, owner.ck);
ok('your profile lists the pages you run, with Create a page', /pf-pages/.test(prof) && /href="\/page\/rollinhost"><strong>RollinHost<\/strong>/.test(prof) && /href="\/page\/new"/.test(prof));
const menu = await page('/label', owner.ck);
ok('the COHABI menu switches between your profile and your pages', /<span class="mk-menuh">You<\/span>/.test(menu) && /href="\/page\/rollinhost"/.test(menu));
ok('Create a page has its own form', /id="pg-new"/.test(await page('/page/new', owner.ck)));
ok('/api/me/pages lists them', (await call('/api/me/pages', null, owner.H, 'GET')).j.pages.some((x) => x.slug === 'rollinhost'));

p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall page tests passed'); process.exit(failures ? 1 : 0);
