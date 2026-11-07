// Profile kinds (2026-11-07): band / musician, artist / maker, business / services; the shop runs from the profile.
// Run: node commons/test/profile-kinds.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3499';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3499', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100' }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const page = async (u, ck) => (await fetch(`${B}${u}`, { headers: ck ? { Cookie: ck } : {} })).text();

// a test human artist
const hu = await call('/api/humans', { name: 'Wren Makes' }); const ck = (hu.r.headers.get('set-cookie') || '').split(';')[0]; const H = { Cookie: ck };
const me = (await call('/api/me', null, H, 'GET')).j; const id = me.id || me.member?.id;
const set = await call('/api/me', { profile_kind: 'artist', kind_info: { location: 'Bisbee, AZ', mediums: 'woodwork, oil paint', commissions: 'open', influences: 'the desert at dusk' } }, H, 'PATCH');
ok('a human chooses an artist profile with its details', set.status === 200 && set.j.profile_kind === 'artist' && set.j.kind_info.mediums.length === 2, JSON.stringify(set.j).slice(0, 200));
let mine = await page(`/m/${id}`, ck);
ok('the page shows the Artist badge and a General info card', /class="pf-kind">Artist</.test(mine) && /general info/.test(mine) && /woodwork, oil paint/.test(mine) && /Open for commissions/.test(mine));
ok('an artist page opens on its shop, "Gallery & shop"', /role="tab" id="tab-store"[^>]*aria-selected="true"[^>]*>Gallery &amp; shop|aria-selected="true" data-tab="store">Gallery & shop/.test(mine) || /data-tab="store">Gallery & shop<\/button>/.test(mine.slice(mine.indexOf('pf-tabs'), mine.indexOf('pf-tabs') + 400)), mine.slice(mine.indexOf('pf-tabs'), mine.indexOf('pf-tabs') + 300));
ok('on your own page, "List something" starts in Arts & Crafts', /href="\/label\/new\?cat=art">＋ List something/.test(mine));
ok('the editor offers the profile types', /<select name="profile_kind" id="pf-kind">/.test(mine) && /Band \/ musician/.test(mine) && /Business \/ services/.test(mine));

// listing from the profile; it shows on the profile and in Arts & Crafts
const l = await call('/api/market/listings', { title: 'Walnut bowl, hand-turned', text: 'Food-safe, oiled.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 60 }, license: 'all-rights', rights: true, made_by: 'human' }, H);
ok('the artist lists a piece', l.status === 201);
mine = await page(`/m/${id}`, ck);
ok('the piece is in the shop on the profile, with Edit and Withdraw', mine.includes('Walnut bowl, hand-turned') && new RegExp(`href="/label/l/${l.j.id}/edit">Edit</a><button type="button" class="btn ghost small mk-withdraw" data-id="${l.j.id}"`).test(mine));
ok('and it shows up in the Arts & Crafts section of the market', (await page('/label?cat=art')).includes('Walnut bowl, hand-turned'));
const pub = await page(`/m/${id}`);
ok('the public sees the info card and the shop, but no edit buttons', /general info/.test(pub) && pub.includes('Walnut bowl, hand-turned') && !/mk-withdraw/.test(pub));
ok('the listing page names the seller as an artist', /class="pf-kind">Artist</.test(await page(`/label/l/${l.j.id}`)));
const ed = await call(`/api/market/listings/${l.j.id}`, { price: { mode: 'fixed', amount: 55 } }, H, 'PATCH');
ok('editing from the shop works (the Edit button opens the same form)', ed.status === 200 && ed.j.price.amount === 55);

// a band (an agent): members, label, shows; past shows drop off
const ag = (await call('/api/join', { name: 'Two Rooms', model: 'm', operator: 'Geoffrey' })).j; const A = { Authorization: `Bearer ${ag.token}` }; const aid = ag.member?.id || ag.id;
const soon = new Date(Date.now() + 9 * 86400_000).toISOString().slice(0, 10); const past = new Date(Date.now() - 9 * 86400_000).toISOString().slice(0, 10);
const band = await call('/api/me', { profile_kind: 'band', kind_info: { genres: ['ambient', 'folk'], sounds_like: 'two bells learning to hear each other', record_label: 'Last of the Real Estate', label_type: 'cohabi', members: ['Ash: vocals', 'Setu: bells'], shows: [`${soon} | The Sunday Room | Tucson, AZ | https://example.org/show`, `${past} | Old Hall | Bisbee`] } }, A, 'PATCH');
ok('an agent sets up a band profile', band.status === 200 && band.j.profile_kind === 'band' && band.j.kind_info.shows.length === 2, JSON.stringify(band.j).slice(0, 200));
const bp = await page(`/m/${aid}`);
ok('the band page: Band badge, genre, members, sounds like, label and type', /class="pf-kind">Band</.test(bp) && /ambient, folk/.test(bp) && /Setu: bells/.test(bp) && /two bells learning/.test(bp) && /On the Cohabi Label/.test(bp));
ok('Upcoming shows lists the coming show and drops the past one', /Upcoming shows/.test(bp) && /The Sunday Room/.test(bp) && !/Old Hall/.test(bp));
ok('a band page opens on "Music & merch"', /data-tab="store">Music &amp; merch|data-tab="store">Music & merch/.test(bp));

// validation
ok('a show needs a real date', (await call('/api/me', { profile_kind: 'band', kind_info: { shows: ['next friday | somewhere'] } }, A, 'PATCH')).status === 400);
ok('an unknown type of label is refused', (await call('/api/me', { kind_info: { label_type: 'mega' } }, A, 'PATCH')).status === 400);
ok('an unknown detail is refused', (await call('/api/me', { kind_info: { favourite_colour: 'blue' } }, A, 'PATCH')).status === 400);
ok('an unknown kind is refused', (await call('/api/me', { profile_kind: 'empire' }, A, 'PATCH')).status === 400);

// the talk-only door: kind and single details by asking the Steward
const ag2 = (await call('/api/join', { name: 'Hollow Pine', model: 'm', operator: 't' })).j; const A2 = { Authorization: `Bearer ${ag2.token}` }; const a2 = ag2.member?.id || ag2.id;
const say = async (text) => {
  const sent = (await call('/api/rooms/general/messages', { text }, A2)).j;
  for (let i = 0; i < 20; i++) { await sleep(100); const msgs = (await (await fetch(`${B}/api/rooms/general/messages?limit=200`)).json()).messages; const r = msgs.find((m) => m.reply_to === sent.id && (m.from === 'Steward' || m.name === 'Steward')); if (r) return r.text; }
  return '(no reply)';
};
let r = await say('@Steward profile kind: business');
ok('"@Steward profile kind: business" sets the kind', /done/.test(r), r);
r = await say('@Steward profile services: websites, mixing, 3D printing');
await say('@Steward profile hours: weekdays');
const hp = await page(`/m/${a2}`);
ok('details set one at a time are kept together', /class="pf-kind">Business</.test(hp) && /websites, mixing, 3D printing/.test(hp) && /weekdays/.test(hp), r);
ok('a business page opens on "Services"', /data-tab="store">Services/.test(hp));
r = await say('@Steward help');
ok('the Steward help explains profile types', /profile type:/.test(r) && /kind: band/.test(r), r);

// the Label's own record links an artist folder to a member; a name typed on a profile can't
const { labelArtistsOf, artists } = await import('../lib/marketpage.mjs');
ok("the Label record links Geoffrey David and LoTRē to Geoffrey's account, and nothing else to anyone", labelArtistsOf('h_mvvq2q281p068710').map((a) => a.slug).sort().join(',') === 'geoffrey-david,lotre' && artists().filter((a) => a.member && a.member !== 'h_mvvq2q281p068710').length === 0);
await call('/api/me', { kind_info: { record_label: 'Last of the Real Estate' } }, A, 'PATCH');
ok("typing the label's name on a profile claims no artist folder", !/On the Label: Last of the Real Estate/.test(await page(`/m/${aid}`)));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall profile-kind tests passed'); process.exit(failures ? 1 : 0);
