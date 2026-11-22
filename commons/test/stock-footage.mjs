// Stock footage (Geoffrey, 2026-11-21): search Pixabay's video library, copy a clip into your own videos, credited.
// Against a stand-in Pixabay on 127.0.0.1. Checks: results cached 24h (one call for a repeated search), the key never
// leaves the server, clips over the length limit are left out, a clip is copied (not hotlinked) and credited, a clip
// whose file is off Pixabay is refused, and signed-out callers get 401. Agents use the same through stock_search/import.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('search stock clips, copy one in with its credit', async () => {
  const FP = await freePort(); const F = `http://127.0.0.1:${FP}`; const calls = [];
  const clip = Buffer.alloc(4096, 1); // stands in for an mp4; the store keeps bytes, conversion needs ffmpeg
  const hit = (id, duration, file) => ({ id, pageURL: `https://pixabay.com/videos/x-${id}/`, tags: 'ocean, sunset, waves', duration, user: 'WaveMaker', videos: { small: { url: file, width: 1280, height: 720, size: clip.length, thumbnail: `${F}/t${id}.jpg` }, tiny: { url: file, thumbnail: `${F}/t${id}.jpg` } } });
  // Kimi's NO on #296: a second host that is NOT the stock library. The importer must never send it a request.
  const FP2 = await freePort(); const offHits = [];
  const offHost = http.createServer((req, res) => { offHits.push(req.url); res.writeHead(200, { 'content-type': 'video/mp4' }); res.end(clip); });
  await new Promise((r) => offHost.listen(FP2, '127.0.0.1', r));
  const fake = http.createServer((req, res) => {
    const u = new URL(req.url, F); calls.push(u.pathname + u.search);
    if (u.pathname === '/redir104') { res.writeHead(302, { location: `http://localhost:${FP2}/clip.mp4` }); return res.end(); }
    if (u.pathname === '/redir105') { res.writeHead(302, { location: '/clip105.mp4' }); return res.end(); }
    if (u.pathname === '/loop') { res.writeHead(302, { location: '/loop' }); return res.end(); }
    if (u.pathname === '/videos/') {
      const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (u.searchParams.get('id') === '777') return json({ hits: [hit(777, 10, 'https://evil.example/clip.mp4')] });
      if (u.searchParams.get('id') === '104') return json({ hits: [hit(104, 10, `${F}/redir104`)] });
      if (u.searchParams.get('id') === '105') return json({ hits: [hit(105, 10, `${F}/redir105`)] });
      if (u.searchParams.get('id') === '106') return json({ hits: [hit(106, null, `${F}/clip106.mp4`)] });
      if (u.searchParams.get('id') === '107') return json({ hits: [hit(107, 10, `${F}/loop`)] });
      return json({ total: 3, hits: [hit(101, 12, `${F}/clip101.mp4`), hit(102, 600, `${F}/clip102.mp4`), hit(103, 8, `${F}/clip103.mp4`)] });
    }
    if (u.pathname.startsWith('/clip')) { res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': clip.length }); return res.end(clip); }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_TEST_ASSETS: '1', PIXABAY_KEY: 'pb-test-key', PIXABAY_API_URL: F, FFMPEG: '/nonexistent-ffmpeg', FFPROBE: '/nonexistent-ffprobe' }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    const su = await fetch(`${B}/api/humans`, { method: 'POST', headers: J, body: JSON.stringify({ name: 'Clip Maker' }) });
    const cookie = (su.headers.get('set-cookie') || '').split(';')[0];
    const get = (p, c = cookie) => fetch(B + p, { headers: { ...J, ...(c ? { cookie: c } : {}) } });

    assert.equal((await get('/api/stock/videos?q=ocean', null)).status, 401, 'signed out: no search');
    const r = await get('/api/stock/videos?q=Ocean%20Sunset'); const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.deepEqual(j.hits.map((h) => h.id), ['101', '103'], 'a clip over the length limit is left out');
    assert.equal(j.hits[0].by, 'WaveMaker'); assert.ok(j.hits[0].thumb); assert.equal(j.hits[0].file, undefined, 'the download address stays on the server');
    assert.ok(!JSON.stringify(j).includes('pb-test-key'), 'the key never leaves the server');
    assert.ok(calls.some((c) => c.includes('key=pb-test-key') && c.includes('q=ocean+sunset') && c.includes('safesearch=true')));
    const before = calls.filter((c) => c.startsWith('/videos/')).length;
    await get('/api/stock/videos?q=ocean   sunset');
    assert.equal(calls.filter((c) => c.startsWith('/videos/')).length, before, 'a repeated search is served from the 24-hour cache');

    const imp = await fetch(`${B}/api/stock/videos/101/import`, { method: 'POST', headers: { ...J, cookie } }); const v = await imp.json();
    assert.equal(imp.status, 201, JSON.stringify(v));
    assert.match(v.id, /^vid_/); assert.match(v.credit, /WaveMaker on Pixabay/); assert.equal(v.source.name, 'Pixabay');
    assert.ok(calls.includes('/clip101.mp4'), 'the clip was downloaded to our store, not hotlinked');
    const served = await fetch(`${B}${v.url}`); assert.equal(served.status, 200);
    assert.equal(Buffer.from(await served.arrayBuffer()).length, clip.length);

    const off = await fetch(`${B}/api/stock/videos/777/import`, { method: 'POST', headers: { ...J, cookie } });
    assert.equal(off.status, 502, 'a clip whose file is not on Pixabay is refused');
    assert.equal((await fetch(`${B}/api/stock/videos/101/import`, { method: 'POST', headers: J })).status, 401);

    // Redirects: checked before they are followed (Kimi's NO on 5faeda6b).
    const post = (id) => fetch(`${B}/api/stock/videos/${id}/import`, { method: 'POST', headers: { ...J, cookie } });
    const away = await post(104);
    assert.equal(away.status, 502, 'a download redirected off the stock library is refused');
    assert.equal(offHits.length, 0, 'and the off-library host never receives a request');
    const same = await post(105);
    assert.equal(same.status, 201, 'a redirect that stays on the stock library is followed');
    assert.ok(calls.includes('/clip105.mp4'));
    assert.equal((await post(107)).status, 502, 'a redirect loop stops after 3 turns');
    assert.ok(calls.filter((c) => c === '/loop').length <= 4, 'at most 4 requests for a looping redirect');
    // A clip of unknown length is refused when this server has no ffprobe to measure it (Kimi's note 2).
    assert.equal((await post(106)).status, 422, 'unknown length, nothing to measure it with: refused');
    assert.ok(!calls.includes('/clip106.mp4'), 'and not downloaded');
  } finally { srv.kill(); fake.close(); offHost.close(); }
});
