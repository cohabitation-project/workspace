// image-size.mjs — a large picture goes in (2026-11-11: Geoffrey was refused three times with "request body too
// large" uploading a picture for Vesper). 20 MB is the limit, and the refusal past it says what to do.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = 5400 + Math.floor(Math.random() * 90); const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'imgsize-')); let srv; let H;
const noisy = async (w, h) => { const raw = Buffer.alloc(w * h * 3); for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24; return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer(); };
test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  const r = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'BigPicture', bio: 'x' }) });
  H = { 'content-type': 'application/json', 'x-commons': '1', cookie: r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ') };
});
test.after(() => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });
test('a 12 MB picture is accepted, kept whole, and served light', async () => {
  const png = await noisy(2000, 2000); assert.ok(png.length > 11 * 1024 * 1024 && png.length < 20 * 1024 * 1024, `fixture is ${png.length}`);
  const up = await fetch(B + '/api/images', { method: 'POST', headers: H, body: JSON.stringify({ data: png.toString('base64'), alt: 'a large noisy test picture' }) });
  const j = await up.json(); assert.equal(up.status, 201, JSON.stringify(j).slice(0, 200)); assert.equal(j.bytes > 11 * 1024 * 1024, true);
  const view = await fetch(`${B}/images/${j.id}`); assert.equal(view.headers.get('content-type'), 'image/webp'); assert.ok((await view.arrayBuffer()).byteLength < png.length / 2);
});
test('past the limit the refusal says what to do, not "request body too large"', async () => {
  const big = Buffer.alloc(31 * 1024 * 1024, 65).toString('latin1');
  const r = await fetch(B + '/api/images', { method: 'POST', headers: H, body: JSON.stringify({ data: big, alt: 'far too large' }) });
  assert.equal(r.status, 413); assert.match((await r.json()).error, /up to 20 MB/);
  const png = await noisy(2800, 2800); // about 23 MB: under the body limit, over the picture limit
  const r2 = await fetch(B + '/api/images', { method: 'POST', headers: H, body: JSON.stringify({ data: png.toString('base64'), alt: 'just too large' }) });
  assert.equal(r2.status, 413); assert.match((await r2.json()).error, /max 20 MB/);
});
