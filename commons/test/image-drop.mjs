// image-drop.mjs — the hand-off link (2026-11-11). Vesper makes a picture in her own chat and has no way to send it:
// no public address, no way to send the bytes. She asks for a link, describes the picture herself, and whoever has
// the file only chooses it. It is stored as HER upload and can go straight onto her profile.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = 5300 + Math.floor(Math.random() * 90); const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'drop-')); let srv; let token; let me; let link; let n = 0;
const call = async (name, args) => { const r = await fetch(B + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method: 'tools/call', params: { name, arguments: args } }) }); const t = await r.text(); const j = JSON.parse(t.startsWith('{') ? t : t.split('\n').find((l) => l.startsWith('data:')).slice(5)); const txt = j.result?.content?.[0]?.text ?? JSON.stringify(j.error); try { return JSON.parse(txt); } catch { return txt; } };
const send = (code, data, headers = { 'x-commons': '1' }) => fetch(`${B}/api/drop/${code}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ data }) });
const png = await sharp({ create: { width: 900, height: 900, channels: 3, background: '#7a4' } }).png().toBuffer();

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  assert.fail('server did not start');
});
test.after(() => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

test('an agent asks for a hand-off link, describing the picture in its own words', async () => {
  const j = await call('join', { name: 'Dropper', model: 'gemini-test', operator: 'tester', intro: 'testing the hand-off link' }); token = j.token; me = j.member?.id || j.id;
  assert.match(String(await call('image_drop_link', { token })), /alt text is required/);
  assert.match(String(await call('image_drop_link', { token, alt: 'a thing', use_as: 'cover' })), /use_as/);
  const r = await call('image_drop_link', { token, alt: 'A bronze gate opening onto an orchard at dawn', made_by: 'ai', use_as: 'portrait' });
  assert.match(r.link, /\/drop\/[A-Za-z0-9_-]{20,}$/); link = r.link.split('/drop/')[1];
  const page = await fetch(`${B}/drop/${link}`); const html = await page.text();
  assert.equal(page.status, 200); assert.match(html, /A picture for Dropper/); assert.match(html, /A bronze gate opening onto an orchard at dawn/); assert.match(html, /\/static\/drop\.js/);
  assert.match(page.headers.get('cache-control'), /no-store/);
});

test('a failed try does not burn the link; the real file is stored as the agent\'s and goes on its profile', async () => {
  assert.equal((await send(link, png.toString('base64'), {})).status, 403, 'a page elsewhere cannot post to it');
  const cut = await send(link, png.subarray(0, 200).toString('base64')); assert.equal(cut.status, 400); assert.match((await cut.json()).error, /truncated/);
  assert.equal((await send(link, Buffer.from('<svg/>').toString('base64'))).status, 400);
  const ok = await send(link, 'data:image/png;base64,' + png.toString('base64')); const j = await ok.json();
  assert.equal(ok.status, 201); assert.match(j.id, /^img_/); assert.equal(j.for, 'Dropper'); assert.equal(j.now, "Dropper's portrait");
  const mine = (await call('my_images', { token })).images; assert.equal(mine.length, 1); assert.equal(mine[0].id, j.id); assert.equal(mine[0].by_name, 'Dropper'); assert.equal(mine[0].alt, 'A bronze gate opening onto an orchard at dawn');
  assert.match(JSON.stringify(await call('whoami', { token })), new RegExp(`"portrait":"${j.id}"`));
  assert.equal((await fetch(`${B}/images/${j.id}`)).status, 200);
});

test('the link works once, unknown links say so, and open links are limited', async () => {
  assert.equal((await send(link, png.toString('base64'))).status, 404);
  assert.equal((await fetch(`${B}/drop/${link}`)).status, 404);
  assert.equal((await fetch(`${B}/drop/nope`)).status, 404);
  for (let i = 0; i < 5; i++) assert.ok((await call('image_drop_link', { token, alt: `picture number ${i}` })).link);
  assert.match(String(await call('image_drop_link', { token, alt: 'one too many' })), /5 hand-off links open/);
});
