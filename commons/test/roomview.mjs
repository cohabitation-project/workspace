// Rooms opened to the full view (Geoffrey, 2026-11-07). Run: node commons/test/roomview.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = '3496'; const B = `http://127.0.0.1:${PORT}`;
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'rv-')) }, stdio: 'ignore' });
for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } }
let n = 0; const call = async (u, body, h = {}, method = 'POST') => { const r = await fetch(`${B}${u}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', 'X-Forwarded-For': `198.18.0.${++n}`, ...h }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const page = async (u) => { const r = await fetch(`${B}${u}`); return { status: r.status, html: await r.text() }; };

const hu = await call('/api/humans', { name: 'Painter' }); const H = { Cookie: (hu.r.headers.get('set-cookie') || '').split(';')[0] };
const sp = await call('/api/me', { skills: ['illustration', 'music production'], headline: 'I paint and I produce' }, H, 'PATCH');
ok('a member can list skills', sp.status < 300, JSON.stringify(sp.j).slice(0, 120));
const w = await call('/api/wishes', { title: 'A drawing tablet', why: 'For the book', cost: '$90', kind: 'tools', room: 'arts' }, H);
ok('a wish can be for a room', w.status === 201 && w.j.room === 'arts');
ok('an unknown room is ignored on a wish', (await call('/api/wishes', { title: 'Odd one', room: 'nope' }, H)).j.room === null);

const arts = await page('/room/arts');
ok('/room/arts opens the whole room', arts.status === 200 && /<h1>Arts/.test(arts.html));
ok('arts has image, video, and music sections', ['Image creation', 'Video creation', 'Music and sound'].every((t) => arts.html.includes(t)));
ok('who can do it comes from profiles', /rv-image"[\s\S]*?Painter[\s\S]*?rv-video/.test(arts.html) && /rv-music"[\s\S]*?Painter/.test(arts.html));
ok('tools we have and tools still needed', /Tools we have/.test(arts.html) && /Tools still needed/.test(arts.html) && /Needs money/.test(arts.html));
ok("the room's wish list shows its wishes", arts.html.includes('A drawing tablet') && arts.html.includes('/wishlist?room=arts#add'));
ok('a way back to the chat', arts.html.includes('href="/r/arts"'));
const land = await page('/room/land-city');
ok('land & city: land needs, listings, 3D, cooperative organizing', ['What we need in land', 'Listings we', '3D developments', 'Cooperative organizing'].every((t) => land.html.includes(t)));
ok('cooperative documents come from the Library', /Cohabitation Petition/.test(land.html));
ok('empty sections say how to fill them, honestly', /Zillow has no open feed/.test(land.html));
await call('/api/me', { visibility: { skills: 'private', headline: 'private' } }, H, 'PATCH');
ok('private skills keep a member off the lists', !/rv-music"[\s\S]*?Painter/.test((await page('/room/arts')).html));
ok('any other room opens too', (await page('/room/rnd')).status === 200);
ok('an unknown room is a 404', (await page('/room/not-a-room')).status === 404);
ok('the wish form offers rooms, preselected', /<option value="arts" selected>/.test((await (await fetch(`${B}/wishlist?room=arts`, { headers: H })).text())));
ok('the HQ room panel links to the full room', fs.readFileSync(path.join(ROOT, 'commons/public/hq.js'), 'utf8').includes('href="/room/${esc(id)}"'));
p.kill(); await sleep(300);
console.log(failures ? `\n${failures} failing` : '\nall passing'); process.exit(failures ? 1 : 0);
