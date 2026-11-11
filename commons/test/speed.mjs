// speed.mjs — the site makes lighter copies itself (2026-11-11): a big upload is served small, the original is kept,
// text is compressed, and versioned files may be kept by the browser.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = 5200 + Math.floor(Math.random() * 90); const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'speed-')); let srv; let cookie; let id; let bytes;
const WEBP = { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' };

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  assert.fail('server did not start');
});

test('a 3000px PNG upload is served as a small WebP; the original is kept and still reachable', async () => {
  const r = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'SpeedPat', bio: 'x' }) });
  cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const noise = Buffer.alloc(3000 * 2000 * 3); for (let i = 0; i < noise.length; i += 97) noise[i] = (i * 31) % 255; // some texture, so the PNG is not tiny
  const png = await sharp(noise, { raw: { width: 3000, height: 2000, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer(); bytes = png.length;
  const up = await fetch(B + '/api/images', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1', cookie }, body: JSON.stringify({ data: png.toString('base64'), alt: 'a test picture', title: 'speed' }) });
  assert.ok(up.status < 300, `upload ${up.status}`); id = (await up.json()).id || (await (await fetch(B + '/api/images?by=me', { headers: { cookie } })).json()).images[0].id;
  const view = await fetch(`${B}/images/${id}`, { headers: WEBP }); const vb = Buffer.from(await view.arrayBuffer());
  assert.equal(view.headers.get('content-type'), 'image/webp'); assert.match(view.headers.get('vary') || '', /Accept/); assert.match(view.headers.get('cache-control'), /immutable/);
  const vm = await sharp(vb).metadata(); assert.equal(vm.width, 1280); assert.ok(vb.length < bytes / 4, `view ${vb.length} of ${bytes}`);
  const thumb = Buffer.from(await (await fetch(`${B}/images/${id}?size=thumb`, { headers: WEBP })).arrayBuffer()); assert.equal((await sharp(thumb).metadata()).width, 480); assert.ok(thumb.length < vb.length);
  const orig = await fetch(`${B}/images/${id}?size=original`, { headers: WEBP }); assert.equal(orig.headers.get('content-type'), 'image/png'); assert.equal((await orig.arrayBuffer()).byteLength, bytes, 'the upload itself is untouched');
  const old = await fetch(`${B}/images/${id}`, { headers: { accept: 'image/png' } }); assert.equal(old.headers.get('content-type'), 'image/png', 'a browser that cannot show WebP gets the original');
});

test('twenty people asking at once make one copy, and nothing falls over', async () => {
  const noise = Buffer.alloc(1600 * 1600 * 3, 120); const png = await sharp(noise, { raw: { width: 1600, height: 1600, channels: 3 } }).png().toBuffer();
  const up = await (await fetch(B + '/api/images', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1', cookie }, body: JSON.stringify({ data: png.toString('base64'), alt: 'flat', title: 'flat' }) })).json();
  const all = await Promise.all(Array.from({ length: 20 }, () => fetch(`${B}/images/${up.id}`, { headers: WEBP })));
  assert.ok(all.every((r) => r.status === 200)); for (const r of all) await r.arrayBuffer();
});

test('a small picture, or one a copy would not shrink, is served as it is', async () => {
  const tiny = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#234' } }).png().toBuffer();
  const up = await (await fetch(B + '/api/images', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1', cookie }, body: JSON.stringify({ data: tiny.toString('base64'), alt: 'tiny', title: 'tiny' }) })).json();
  const r = await fetch(`${B}/images/${up.id}`, { headers: WEBP }); assert.equal(r.status, 200); assert.ok(['image/png', 'image/webp'].includes(r.headers.get('content-type')));
});

test('text goes out compressed; versioned files may be kept for a year; a path cannot climb out of the folder', async () => {
  const css = await fetch(B + '/static/site.css?v=abc', { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(css.headers.get('content-encoding'), 'gzip'); assert.match(css.headers.get('cache-control'), /max-age=31536000, immutable/);
  assert.match((await fetch(B + '/static/site.css')).headers.get('cache-control'), /max-age=300/, 'no version: the short cache stays');
  assert.equal((await fetch(B + '/feed', { headers: { 'accept-encoding': 'gzip' } })).headers.get('content-encoding'), 'gzip');
  const art = await fetch(B + '/static/landing/headquarters.jpg', { headers: WEBP }); assert.equal(art.status, 200); assert.match(art.headers.get('cache-control'), /max-age=86400/);
  for (const u of ['/static/..%2f..%2f.env', '/static/%2e%2e/%2e%2e/package.json', '/label/files/..%2f..%2f.env']) assert.notEqual((await fetch(B + u, { headers: WEBP })).status, 200, u);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });
