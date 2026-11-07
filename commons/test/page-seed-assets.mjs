// Seeded pages fetch their pictures once from their own site, and list their services (2026-11-07).
// Run: node commons/test/page-seed-assets.mjs
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import zlib from 'node:zlib';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const B = 'http://127.0.0.1:3507';
let failures = 0; const ok = (n, c, x = '') => { console.log(`${c ? '✓' : '✗'} ${n}${x && !c ? ' — ' + x : ''}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a tiny PNG, made here (no files needed)
const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const png = (r, g, b) => { const w = 32, h = 20; const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); };
let hits = 0;
const site = http.createServer((req, res) => { hits++; if (req.url === '/logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(png(27, 42, 58)); } if (req.url === '/shot.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(png(212, 162, 76)); } res.writeHead(404); res.end(); }).listen(3508);
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'psa-'));
const seedFile = path.join(data, 'seed.json');
fs.writeFileSync(seedFile, JSON.stringify({ pages: [{ slug: 'testbiz', kind: 'business', name: 'TestBiz', manager: 'SeedOwner', theme: 'midnight', project_service: true, headline: 'We test things.', asset_hosts: ['127.0.0.1'],
  assets: [{ url: 'http://127.0.0.1:3508/logo.png', role: 'portrait', alt: 'The TestBiz logo', credit: 'From testbiz.example' }, { url: 'http://127.0.0.1:3508/shot.png', role: 'gallery', alt: 'A screenshot of TestBiz', caption: 'The dashboard', credit: 'Screenshot from testbiz.example' }, { url: 'http://127.0.0.2:3508/evil.png', role: 'gallery', alt: 'Not allowed', credit: 'x' }],
  listings: [{ title: 'TestBiz consulting', text: 'We help.', category: 'services', type: 'service', price: { mode: 'quote' }, license: 'service', made_by: 'human' }] }] }));
const env = { ...process.env, COMMONS_PORT: '3507', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_PAGES_SEED: seedFile, COMMONS_TEST_ASSETS: '1' };
const boot = async () => { const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env, stdio: 'ignore' }); for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch { /* booting */ } } return p; };
let p = await boot();
await fetch(`${B}/api/humans`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: 'SeedOwner' }) });
p.kill(); await sleep(500);
p = await boot(); await sleep(2500); // the manager now exists at boot: pictures and listings are seeded
const pg = await (await fetch(`${B}/api/pages/testbiz`)).json();
ok('the seeded page fetched its logo as its picture', /^img_/.test(pg.portrait || ''), JSON.stringify(pg).slice(0, 300));
ok('and its screenshot into the gallery', (pg.gallery || []).length === 1);
ok('a picture from a host the seed does not name is never fetched', !Object.keys(pg.assets_got || {}).some((u) => u.includes('127.0.0.2')) && pg.assets_done === false);
const html = await (await fetch(`${B}/page/testbiz`)).text();
ok('the page shows the picture, the gallery with its caption, and "our own services"', new RegExp(`/images/${pg.portrait}`).test(html) && /The dashboard/.test(html) && /Part of the Cohabitation Project's own services/.test(html));
const img = await (await fetch(`${B}/api/images`)).json().catch(() => ({}));
ok('the stored picture is credited to the site it came from', JSON.stringify(img).includes('From testbiz.example') || /From testbiz\.example/.test(await (await fetch(`${B}/images`)).text()));
ok('the business lists its own service, as the page', /TestBiz consulting/.test(html) && /listed by SeedOwner/.test(await (await fetch(`${B}/label?cat=services`)).text()));
const before = hits; p.kill(); await sleep(500); p = await boot(); await sleep(2500);
const pg2 = await (await fetch(`${B}/api/pages/testbiz`)).json();
ok('pictures already fetched are not fetched again, and listings are not doubled', pg2.portrait === pg.portrait && (await (await fetch(`${B}/api/market/listings?q=TestBiz`)).json()).listings.length === 1 && hits - before <= 1, `hits ${hits - before}`);
p.kill(); site.close(); await sleep(300);
console.log(failures ? `\n${failures} FAILED` : '\nall page-seed tests passed'); process.exit(failures ? 1 : 0);
